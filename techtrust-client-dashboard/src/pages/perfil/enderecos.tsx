import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  ChevronLeft, MapPin, Plus, Star, Pencil, Trash2, X, Check,
  AlertCircle, CheckCircle, Home, Building, Navigation, ChevronDown,
} from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
];

const LABEL_OPTIONS = [
  { value: 'Home', icon: Home },
  { value: 'Work', icon: Building },
  { value: 'Other', icon: MapPin },
];

interface Address {
  id: string;
  label: string;
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
}

const EMPTY: Omit<Address, 'id' | 'isDefault'> = {
  label: 'Home', street: '', number: '', complement: '', city: '', state: 'FL', zipCode: '',
};

export default function EnderecosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const stateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) loadAddresses();
  }, [isAuthenticated]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) {
        setShowStateDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadAddresses() {
    try {
      const res = await api.getProfile();
      const raw = res.data as any;
      const u = raw?.user || raw;
      const stored = u?.addressesJson;
      const parsed: Address[] = Array.isArray(stored) ? stored : (typeof stored === 'string' ? JSON.parse(stored) : []);
      setAddresses(parsed);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveToBackend(updated: Address[]) {
    await api.updateProfile({ addressesJson: updated });
  }

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY });
    setGpsCoords(null);
    setError('');
    setShowModal(true);
  }

  function openEdit(addr: Address) {
    setEditing(addr);
    setForm({ label: addr.label, street: addr.street, number: addr.number, complement: addr.complement || '', city: addr.city, state: addr.state, zipCode: addr.zipCode });
    setGpsCoords(addr.latitude ? { lat: addr.latitude, lng: addr.longitude! } : null);
    setError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setGpsCoords(null);
    setError('');
  }

  function validateForm() {
    if (!form.street.trim()) return 'Street is required';
    if (!form.number.trim()) return 'Number is required';
    if (!form.city.trim()) return 'City is required';
    if (!form.zipCode.trim()) return 'ZIP code is required';
    return null;
  }

  async function handleSave() {
    const err = validateForm();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');
    try {
      let updated: Address[];
      if (editing) {
        updated = addresses.map(a =>
          a.id === editing.id
            ? { ...a, ...form, latitude: gpsCoords?.lat, longitude: gpsCoords?.lng }
            : a
        );
      } else {
        const newAddr: Address = {
          id: Date.now().toString(),
          ...form,
          isDefault: addresses.length === 0,
          latitude: gpsCoords?.lat,
          longitude: gpsCoords?.lng,
        };
        updated = [...addresses, newAddr];
      }
      await saveToBackend(updated);
      setAddresses(updated);
      setSuccess(editing ? 'Address updated.' : 'Address added.');
      closeModal();
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Failed to save address. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id: string) {
    const updated = addresses.map(a => ({ ...a, isDefault: a.id === id }));
    try {
      await saveToBackend(updated);
      setAddresses(updated);
    } catch { /* silently fail */ }
  }

  async function handleDelete(id: string) {
    const updated = addresses.filter(a => a.id !== id);
    if (updated.length > 0 && !updated.some(a => a.isDefault)) updated[0].isDefault = true;
    try {
      await saveToBackend(updated);
      setAddresses(updated);
      setDeleteConfirm('');
    } catch { /* silently fail */ }
  }

  function handleGPS() {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingLocation(false);
      },
      () => setGettingLocation(false),
    );
  }

  function formatZip(v: string) {
    return v.replace(/\D/g, '').slice(0, 5);
  }

  const LabelIcon = LABEL_OPTIONS.find(l => l.value === form.label)?.icon || MapPin;

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Addresses">
        <div className="max-w-3xl mx-auto space-y-4">
          {[1, 2].map(i => <div key={i} className="h-36 skeleton rounded-2xl" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Addresses">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <button onClick={() => router.push('/perfil')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">My Profile</span>
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Addresses</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage your saved service locations</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-200 hover:from-primary-700 hover:to-primary-800 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Address
          </button>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
          </div>
        )}

        {/* Address list */}
        {addresses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium mb-4">No addresses saved yet</p>
            <button onClick={openAdd} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Add Your First Address
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => {
              const AddrIcon = LABEL_OPTIONS.find(l => l.value === addr.label)?.icon || MapPin;
              return (
                <div
                  key={addr.id}
                  className={`bg-white rounded-2xl shadow-soft overflow-hidden transition-all ${addr.isDefault ? 'ring-2 ring-primary-400' : ''}`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${addr.isDefault ? 'bg-primary-100' : 'bg-gray-100'}`}>
                        <AddrIcon className={`w-6 h-6 ${addr.isDefault ? 'text-primary-600' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-gray-900">{addr.label}</p>
                          {addr.isDefault && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                              <Star className="w-3 h-3" /> Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{addr.number} {addr.street}{addr.complement ? `, ${addr.complement}` : ''}</p>
                        <p className="text-sm text-gray-500">{addr.city}, {addr.state} {addr.zipCode}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(addr)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </button>
                        <button onClick={() => setDeleteConfirm(addr.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>

                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5" /> Set as default
                      </button>
                    )}
                  </div>

                  {/* Delete confirm */}
                  {deleteConfirm === addr.id && (
                    <div className="bg-red-50 border-t border-red-100 px-5 py-3 flex items-center justify-between">
                      <p className="text-sm text-red-700 font-medium">Delete this address?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setDeleteConfirm('')} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-white transition-colors">Cancel</button>
                        <button onClick={() => handleDelete(addr.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Address' : 'Add Address'}</h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              {/* Label */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Label</label>
                <div className="flex gap-2">
                  {LABEL_OPTIONS.map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, label: value })}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        form.label === value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Street + Number */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Street *</label>
                  <input
                    value={form.street}
                    onChange={e => setForm({ ...form, street: e.target.value })}
                    placeholder="e.g. Main St"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Number *</label>
                  <input
                    value={form.number}
                    onChange={e => setForm({ ...form, number: e.target.value })}
                    placeholder="123"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>

              {/* Complement */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Apt / Suite / Unit (optional)</label>
                <input
                  value={form.complement}
                  onChange={e => setForm({ ...form, complement: e.target.value })}
                  placeholder="e.g. Apt 4B"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all text-sm"
                />
              </div>

              {/* City + State + Zip */}
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">City *</label>
                  <input
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    placeholder="Miami"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all text-sm"
                  />
                </div>
                <div className="relative" ref={stateRef}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">State</label>
                  <button
                    type="button"
                    onClick={() => setShowStateDropdown(!showStateDropdown)}
                    className="w-full flex items-center justify-between px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-all"
                  >
                    {form.state}
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showStateDropdown && (
                    <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {US_STATES.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { setForm({ ...form, state: s }); setShowStateDropdown(false); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${form.state === s ? 'text-primary-600 font-semibold bg-primary-50' : 'text-gray-700'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ZIP Code *</label>
                  <input
                    value={form.zipCode}
                    onChange={e => setForm({ ...form, zipCode: formatZip(e.target.value) })}
                    placeholder="33101"
                    maxLength={5}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>

              {/* GPS */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Navigation className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">GPS Coordinates</p>
                  {gpsCoords
                    ? <p className="text-xs text-green-600 mt-0.5">Location captured: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}</p>
                    : <p className="text-xs text-gray-400 mt-0.5">Optional — helps providers find you faster</p>
                  }
                </div>
                <button
                  type="button"
                  onClick={handleGPS}
                  disabled={gettingLocation}
                  className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {gettingLocation ? '...' : gpsCoords ? 'Re-capture' : 'Use GPS'}
                </button>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : <><Check className="w-4 h-4" /> {editing ? 'Update' : 'Add Address'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

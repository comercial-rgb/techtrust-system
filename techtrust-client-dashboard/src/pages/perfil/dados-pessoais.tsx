import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  ChevronLeft, User, Mail, Phone, Calendar, Edit2, Check, X,
  CheckCircle, Shield, Camera, AlertCircle, Trash2,
} from 'lucide-react';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export default function DadosPessoaisPage() {
  const { user, isAuthenticated, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    ssn: '',
    birthDate: '',
    gender: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) loadProfile();
  }, [isAuthenticated]);

  async function loadProfile() {
    try {
      const res = await api.getProfile();
      const raw = res.data as any;
      const u = raw?.user || raw;
      setForm({
        fullName: u?.fullName || user?.fullName || '',
        email: u?.email || user?.email || '',
        phone: u?.phone || user?.phone || '',
        ssn: u?.cpf || u?.ssn || '',
        birthDate: u?.dateOfBirth || u?.birthDate || '',
        gender: u?.gender || '',
      });
    } catch {
      setForm({
        fullName: user?.fullName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        ssn: '', birthDate: '', gender: '',
      });
    }
  }

  function formatSSN(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }

  function maskSSN(ssn: string) {
    const digits = ssn.replace(/\D/g, '');
    return digits.length >= 4 ? `***-**-${digits.slice(-4)}` : 'Not provided';
  }

  async function handleSave() {
    if (!form.fullName.trim()) { setError('Full name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = { fullName: form.fullName.trim() };
      if (form.birthDate) payload.dateOfBirth = form.birthDate;
      if (form.gender) payload.gender = form.gender;
      if (form.ssn) payload.cpf = form.ssn.replace(/\D/g, '');
      await api.updateProfile(payload);
      updateUser({ fullName: form.fullName.trim() });
      setSuccess('Your information has been saved.');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: any) {
      setError(e.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return null;

  return (
    <DashboardLayout title="Personal Information">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <button onClick={() => router.push('/perfil')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">My Profile</span>
        </button>

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 h-20" />
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10">
              <div className="relative">
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-3xl font-bold text-primary-600">
                    {form.fullName.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 rounded-full flex items-center justify-center border-2 border-white hover:bg-gray-700 transition-colors">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl font-bold text-gray-900">{form.fullName || 'Your Name'}</h2>
                <p className="text-sm text-gray-500">{form.email}</p>
              </div>
              <button
                onClick={() => { setIsEditing(!isEditing); setError(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  isEditing
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                }`}
              >
                {isEditing ? <><X className="w-4 h-4" /> Cancel</> : <><Edit2 className="w-4 h-4" /> Edit</>}
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-5">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-6">
          <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" /> Personal Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
                />
              ) : (
                <p className="text-gray-900 font-semibold py-2">{form.fullName || '—'}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 text-sm truncate">{form.email || '—'}</span>
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-lg whitespace-nowrap">
                  <CheckCircle className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
              {isEditing && <p className="text-xs text-gray-400 mt-1">Contact support to change your email</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone Number</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">{form.phone || '—'}</span>
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-lg whitespace-nowrap">
                  <CheckCircle className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
              {isEditing && <p className="text-xs text-gray-400 mt-1">Contact support to change your phone</p>}
            </div>

            {/* SSN */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Social Security Number
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={form.ssn}
                    onChange={e => setForm({ ...form, ssn: formatSSN(e.target.value) })}
                    placeholder="000-00-0000"
                    maxLength={11}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
                  />
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Encrypted and stored securely
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 font-mono font-semibold py-2">
                    {form.ssn ? maskSSN(form.ssn) : <span className="font-sans font-normal text-gray-400">Not provided</span>}
                  </p>
                  {form.ssn && <p className="text-xs text-gray-400">Only last 4 digits shown for security</p>}
                </div>
              )}
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Birth Date</label>
              {isEditing ? (
                <input
                  type="date"
                  value={form.birthDate ? form.birthDate.split('T')[0] : ''}
                  onChange={e => setForm({ ...form, birthDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
                />
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className={form.birthDate ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
                    {form.birthDate
                      ? new Date(form.birthDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'Not provided'}
                  </span>
                </div>
              )}
            </div>

            {/* Gender */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gender</label>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm({ ...form, gender: g })}
                      className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                        form.gender === g
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {form.gender === g && <Check className="w-3.5 h-3.5 inline mr-1" />}
                      {g}
                    </button>
                  ))}
                </div>
              ) : (
                <p className={`py-2 font-semibold ${form.gender ? 'text-gray-900' : 'text-gray-400'}`}>
                  {form.gender || 'Not provided'}
                </p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
              <button
                onClick={() => { setIsEditing(false); setError(''); loadProfile(); }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 shadow-md shadow-primary-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Check className="w-4 h-4" /> Save Changes</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h3 className="text-base font-bold text-red-600 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Danger Zone
          </h3>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Delete Account</p>
              <p className="text-xs text-gray-500 mt-0.5">Permanently delete your account and all data. This cannot be undone.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 text-red-600 font-semibold text-sm hover:bg-red-200 transition-colors">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

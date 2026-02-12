import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import {
  Globe,
  Shield,
  MapPin,
  FileText,
  ChevronRight,
  Plus,
  Check,
  X,
  AlertTriangle,
  Settings,
  Loader2,
} from 'lucide-react';

interface StateProfile {
  id: string;
  stateCode: string;
  stateName: string;
  isActive: boolean;
  stateRepairShopRegRequired: boolean;
  stateRepairShopRegDisplayName?: string;
  stateRepairShopRegAuthority?: string;
  defaultLocalLicenseModel: string;
  towingRegulationLevel: string;
  notesInternal?: string;
  _count?: { jurisdictionPolicies: number };
}

interface ComplianceRequirement {
  id: string;
  requirementKey: string;
  scope: string;
  displayName: string;
  description?: string;
  appliesToServices: string[];
  verificationMode: string;
  renewalRule?: string;
  priority: number;
  isActive: boolean;
}

interface JurisdictionPolicy {
  id: string;
  stateCode: string;
  countyName?: string;
  cityName?: string;
  isActive: boolean;
  notesInternal?: string;
  requirements: Array<{
    id: string;
    requirementKey: string;
    displayNameOverride?: string;
    issuingAuthorityOverride?: string;
    isMandatory: boolean;
    requirement: ComplianceRequirement;
  }>;
}

export default function CompliancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<StateProfile[]>([]);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [selectedState, setSelectedState] = useState<StateProfile | null>(null);
  const [policies, setPolicies] = useState<JurisdictionPolicy[]>([]);
  const [showAddState, setShowAddState] = useState(false);
  const [saving, setSaving] = useState(false);

  // New state form
  const [newState, setNewState] = useState({
    stateCode: '',
    stateName: '',
    stateRepairShopRegRequired: false,
    stateRepairShopRegDisplayName: '',
    stateRepairShopRegAuthority: '',
    defaultLocalLicenseModel: 'COUNTY_ONLY',
    towingRegulationLevel: 'MEDIUM',
    isActive: false,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statesRes, reqsRes] = await Promise.all([
        api.get('/multi-state/states/all'),
        api.get('/multi-state/compliance-requirements'),
      ]);
      setStates((statesRes.data as any)?.states || []);
      setRequirements((reqsRes.data as any)?.requirements || []);
    } catch (err) {
      console.error('Error fetching compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicies = async (stateCode: string) => {
    try {
      const res = await api.get(`/multi-state/jurisdiction-policies/${stateCode}`);
      setPolicies((res.data as any)?.policies || []);
    } catch (err) {
      console.error('Error fetching policies:', err);
    }
  };

  const selectState = async (state: StateProfile) => {
    setSelectedState(state);
    await fetchPolicies(state.stateCode);
  };

  const toggleStateActive = async (state: StateProfile) => {
    try {
      setSaving(true);
      await api.post('/multi-state/state-profiles', {
        stateCode: state.stateCode,
        stateName: state.stateName,
        isActive: !state.isActive,
      });
      await fetchData();
      if (selectedState?.stateCode === state.stateCode) {
        setSelectedState({ ...selectedState!, isActive: !state.isActive });
      }
    } catch (err) {
      console.error('Error toggling state:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddState = async () => {
    if (!newState.stateCode || !newState.stateName) return;
    try {
      setSaving(true);
      await api.post('/multi-state/state-profiles', newState);
      setShowAddState(false);
      setNewState({
        stateCode: '',
        stateName: '',
        stateRepairShopRegRequired: false,
        stateRepairShopRegDisplayName: '',
        stateRepairShopRegAuthority: '',
        defaultLocalLicenseModel: 'COUNTY_ONLY',
        towingRegulationLevel: 'MEDIUM',
        isActive: false,
      });
      await fetchData();
    } catch (err) {
      console.error('Error adding state:', err);
    } finally {
      setSaving(false);
    }
  };

  const scopeColor = (scope: string) => {
    switch (scope) {
      case 'FEDERAL': return 'bg-purple-100 text-purple-700';
      case 'STATE': return 'bg-blue-100 text-blue-700';
      case 'COUNTY': return 'bg-green-100 text-green-700';
      case 'CITY': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const towingColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-red-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Multi-State Compliance">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-admin-600" />
        </div>
      </AdminLayout>
    );
  }

  const activeCount = states.filter((s) => s.isActive).length;
  const inactiveCount = states.filter((s) => !s.isActive).length;

  return (
    <AdminLayout title="Multi-State Compliance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Multi-State Compliance Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage state profiles, jurisdiction policies, and compliance requirements
            </p>
          </div>
          <button
            onClick={() => setShowAddState(true)}
            className="flex items-center gap-2 px-4 py-2 bg-admin-600 text-white rounded-lg hover:bg-admin-700"
          >
            <Plus className="w-4 h-4" />
            Add State
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
                <p className="text-xs text-gray-500">Active States</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{inactiveCount}</p>
                <p className="text-xs text-gray-500">Pre-seeded (Inactive)</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{requirements.length}</p>
                <p className="text-xs text-gray-500">Requirements in Catalog</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{states.length}</p>
                <p className="text-xs text-gray-500">Total States</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* State List */}
          <div className="lg:col-span-1 bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">State Profiles</h2>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {states.map((state) => (
                <div
                  key={state.id}
                  onClick={() => selectState(state)}
                  className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                    selectedState?.stateCode === state.stateCode ? 'bg-admin-50 border-l-4 border-admin-600' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        state.isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{state.stateCode}</p>
                      <p className="text-xs text-gray-500">{state.stateName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {state.stateRepairShopRegRequired && (
                      <Shield className="w-3.5 h-3.5 text-blue-500" title="State registration required" />
                    )}
                    <span className="text-xs text-gray-400">
                      {state._count?.jurisdictionPolicies || 0}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* State Detail */}
          <div className="lg:col-span-2 space-y-4">
            {selectedState ? (
              <>
                {/* State Info Card */}
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedState.stateName} ({selectedState.stateCode})
                      </h2>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                          selectedState.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {selectedState.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleStateActive(selectedState)}
                      disabled={saving}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        selectedState.isActive
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : selectedState.isActive ? (
                        'Deactivate'
                      ) : (
                        'Activate'
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Shop Registration</p>
                      <p className="font-medium">
                        {selectedState.stateRepairShopRegRequired ? (
                          <span className="text-blue-600">
                            Required — {selectedState.stateRepairShopRegDisplayName}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not required</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Authority</p>
                      <p className="font-medium">
                        {selectedState.stateRepairShopRegAuthority || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Local License Model</p>
                      <p className="font-medium">
                        {selectedState.defaultLocalLicenseModel?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Towing Regulation</p>
                      <p className={`font-medium ${towingColor(selectedState.towingRegulationLevel)}`}>
                        {selectedState.towingRegulationLevel}
                      </p>
                    </div>
                  </div>
                  {selectedState.notesInternal && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                      <p className="text-xs text-yellow-700">{selectedState.notesInternal}</p>
                    </div>
                  )}
                </div>

                {/* Jurisdiction Policies */}
                <div className="bg-white rounded-lg border">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Jurisdiction Policies</h3>
                    <span className="text-sm text-gray-500">{policies.length} policies</span>
                  </div>
                  {policies.length === 0 ? (
                    <div className="p-8 text-center">
                      <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">
                        No jurisdiction policies configured for this state.
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Providers in this state will only have basic requirements.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {policies.map((policy) => (
                        <div key={policy.id} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">
                              {policy.countyName
                                ? `${policy.countyName} County`
                                : policy.cityName
                                ? `City of ${policy.cityName}`
                                : 'State-Wide'}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                policy.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {policy.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {policy.requirements.map((jr) => (
                              <div
                                key={jr.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${scopeColor(
                                    jr.requirement.scope
                                  )}`}
                                >
                                  {jr.requirement.scope}
                                </span>
                                <span className="text-gray-700">
                                  {jr.displayNameOverride ||
                                    jr.requirement.displayName}
                                </span>
                                {jr.isMandatory ? (
                                  <span className="text-xs text-red-500">mandatory</span>
                                ) : (
                                  <span className="text-xs text-gray-400">recommended</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg border p-8 text-center">
                <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select a state to view details</p>
              </div>
            )}

            {/* Requirements Catalog */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">
                  Compliance Requirements Catalog
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Universal requirements that can be assigned to any jurisdiction
                </p>
              </div>
              <div className="divide-y">
                {requirements.map((req) => (
                  <div key={req.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${scopeColor(
                          req.scope
                        )}`}
                      >
                        {req.scope}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {req.displayName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {req.requirementKey} · {req.verificationMode?.replace(/_/g, ' ')}
                          {req.renewalRule ? ` · ${req.renewalRule}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {(req.appliesToServices as string[])?.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Add State Modal */}
        {showAddState && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add State Profile</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">State Code</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={newState.stateCode}
                      onChange={(e) =>
                        setNewState({ ...newState, stateCode: e.target.value.toUpperCase() })
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="TX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">State Name</label>
                    <input
                      type="text"
                      value={newState.stateName}
                      onChange={(e) => setNewState({ ...newState, stateName: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Texas"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newState.stateRepairShopRegRequired}
                      onChange={(e) =>
                        setNewState({
                          ...newState,
                          stateRepairShopRegRequired: e.target.checked,
                        })
                      }
                    />
                    State Repair Shop Registration Required
                  </label>
                </div>
                {newState.stateRepairShopRegRequired && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Display Name</label>
                      <input
                        type="text"
                        value={newState.stateRepairShopRegDisplayName}
                        onChange={(e) =>
                          setNewState({
                            ...newState,
                            stateRepairShopRegDisplayName: e.target.value,
                          })
                        }
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="BAR Auto Repair License"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Authority</label>
                      <input
                        type="text"
                        value={newState.stateRepairShopRegAuthority}
                        onChange={(e) =>
                          setNewState({
                            ...newState,
                            stateRepairShopRegAuthority: e.target.value,
                          })
                        }
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="Bureau of Automotive Repair"
                      />
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">License Model</label>
                    <select
                      value={newState.defaultLocalLicenseModel}
                      onChange={(e) =>
                        setNewState({ ...newState, defaultLocalLicenseModel: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="COUNTY_ONLY">County Only</option>
                      <option value="CITY_AND_COUNTY">City & County</option>
                      <option value="VARIES">Varies</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Towing Regulation</label>
                    <select
                      value={newState.towingRegulationLevel}
                      onChange={(e) =>
                        setNewState({ ...newState, towingRegulationLevel: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddState(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddState}
                  disabled={saving || !newState.stateCode || !newState.stateName}
                  className="px-4 py-2 text-sm bg-admin-600 text-white rounded-lg hover:bg-admin-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add State'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

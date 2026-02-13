'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import { useI18n } from '@/i18n'
import {
  Shield,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Loader2,
  RefreshCw,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Calendar,
  Building2,
  Users,
  ShieldCheck,
} from 'lucide-react'

// ─── Types ───
interface ComplianceItem {
  id: string
  type: string
  status: string
  documentNumber?: string
  expirationDate?: string
  documentUploads?: string[]
  notes?: string
  lastVerifiedAt?: string
  createdAt: string
  updatedAt: string
}

interface InsurancePolicy {
  id: string
  type: string
  hasCoverage: boolean
  providerName?: string
  policyNumber?: string
  expirationDate?: string
  coverageAmount?: number
  coiUploads?: string[]
  status: string
  createdAt: string
  updatedAt: string
}

interface ComplianceSummary {
  complianceItems: ComplianceItem[]
  insurancePolicies: InsurancePolicy[]
  overallStatus: string
  jurisdiction?: string
}

// ─── Constants ───
const COMPLIANCE_TYPE_LABELS: Record<string, string> = {
  FDACS_MOTOR_VEHICLE_REPAIR: 'FDACS Motor Vehicle Repair License',
  STATE_SHOP_REGISTRATION: 'State Shop Registration',
  CITY_BTR: 'City Business Tax Receipt',
  LOCAL_BTR_CITY: 'Local BTR (City)',
  COUNTY_BTR: 'County Business Tax Receipt',
  LOCAL_BTR_COUNTY: 'Local BTR (County)',
  EPA_609_TECHNICIAN: 'EPA Section 609 Technician Certification',
}

const INSURANCE_TYPE_LABELS: Record<string, string> = {
  GENERAL_LIABILITY: 'General Liability',
  GARAGE_LIABILITY: 'Garage Liability',
  GARAGE_KEEPERS: 'Garage Keepers',
  COMMERCIAL_AUTO: 'Commercial Auto',
  ON_HOOK: 'On-Hook / Towing',
  WORKERS_COMP: 'Workers\' Compensation',
  PROFESSIONAL_LIABILITY: 'Professional Liability',
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  VERIFIED: { color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle, label: 'Verified' },
  PROVIDED_UNVERIFIED: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Clock, label: 'Under Review' },
  COMPLIANCE_PENDING: { color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: AlertTriangle, label: 'Pending' },
  NOT_APPLICABLE: { color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', icon: XCircle, label: 'N/A' },
  EXPIRED: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle, label: 'Expired' },
}

export default function CompliancePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const { translate } = useI18n()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ComplianceSummary | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>('compliance')
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<{
    type: 'compliance' | 'insurance'
    itemType: string
    itemId?: string
  } | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadComplianceData()
    }
  }, [isAuthenticated])

  // ─── Load Data ───
  const loadComplianceData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Auto-create compliance items if needed
      try {
        await api.post('/compliance/auto-create')
      } catch {}

      const res = await api.get('/compliance/summary')
      setSummary(res.data?.data || res.data)
    } catch (err: any) {
      console.error('Error loading compliance data:', err)
      setError(err.response?.data?.message || 'Failed to load compliance data')
    } finally {
      setLoading(false)
    }
  }

  // ─── Upload ───
  const triggerUpload = (type: 'compliance' | 'insurance', itemType: string, itemId?: string) => {
    setUploadTarget({ type, itemType, itemId })
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget) return

    setUploading(uploadTarget.itemType)
    try {
      // Upload file
      const formData = new FormData()
      formData.append('image', file)

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const url = uploadRes.data?.imageUrl || uploadRes.data?.url
      if (!url) throw new Error('Upload failed - no URL returned')

      // Save to appropriate API
      if (uploadTarget.type === 'compliance') {
        const existing = summary?.complianceItems?.find(c => c.type === uploadTarget.itemType)
        const existingUploads = existing?.documentUploads || []
        await api.post('/compliance', {
          type: uploadTarget.itemType,
          documentUploads: [...existingUploads, url],
          status: 'PROVIDED_UNVERIFIED',
        })
      } else {
        const existing = summary?.insurancePolicies?.find(i => i.type === uploadTarget.itemType)
        const existingUploads = existing?.coiUploads || []
        await api.post('/insurance', {
          type: uploadTarget.itemType,
          hasCoverage: true,
          coiUploads: [...existingUploads, url],
        })
      }

      // Reload data
      await loadComplianceData()
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(null)
      setUploadTarget(null)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── Status Badge ───
  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.COMPLIANCE_PENDING
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    )
  }

  // ─── Overall Status ───
  const getOverallStatusInfo = () => {
    if (!summary) return { label: 'Loading...', color: 'text-gray-500', bg: 'bg-gray-100' }
    switch (summary.overallStatus) {
      case 'FULLY_COMPLIANT':
        return { label: 'Fully Compliant', color: 'text-green-700', bg: 'bg-green-100' }
      case 'PARTIALLY_COMPLIANT':
        return { label: 'Partially Compliant', color: 'text-yellow-700', bg: 'bg-yellow-100' }
      case 'NON_COMPLIANT':
        return { label: 'Non-Compliant', color: 'text-red-700', bg: 'bg-red-100' }
      default:
        return { label: 'Pending Review', color: 'text-blue-700', bg: 'bg-blue-100' }
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title={translate('provider.nav.compliance') || 'Compliance'}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </DashboardLayout>
    )
  }

  const overallInfo = getOverallStatusInfo()
  const complianceItems = summary?.complianceItems || []
  const insurancePolicies = summary?.insurancePolicies || []

  return (
    <DashboardLayout title={translate('provider.nav.compliance') || 'Compliance & Documents'}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Overall Status Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${overallInfo.bg} flex items-center justify-center`}>
              <Shield className={`w-6 h-6 ${overallInfo.color}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {translate('provider.compliance.title') || 'Compliance Status'}
              </h2>
              <p className={`text-sm font-medium ${overallInfo.color}`}>
                {overallInfo.label}
              </p>
              {summary?.jurisdiction && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Jurisdiction: {summary.jurisdiction}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={loadComplianceData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">{complianceItems.length}</p>
            <p className="text-xs text-gray-500">Licenses & Permits</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">{insurancePolicies.length}</p>
            <p className="text-xs text-gray-500">Insurance Policies</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">
              {complianceItems.filter(c => c.status === 'VERIFIED').length + 
               insurancePolicies.filter(i => i.status === 'VERIFIED').length}
            </p>
            <p className="text-xs text-gray-500">Verified</p>
          </div>
        </div>
      </div>

      {/* Compliance Items Section */}
      <div className="bg-white rounded-2xl border border-gray-100 mb-6 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'compliance' ? null : 'compliance')}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900">
                {translate('provider.compliance.licenses') || 'Licenses & Permits'}
              </h3>
              <p className="text-sm text-gray-500">
                {complianceItems.length} items • {complianceItems.filter(c => c.status === 'VERIFIED').length} verified
              </p>
            </div>
          </div>
          {expandedSection === 'compliance' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'compliance' && (
          <div className="border-t border-gray-100">
            {complianceItems.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  No compliance items yet. They will be auto-created based on your jurisdiction.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {complianceItems.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {COMPLIANCE_TYPE_LABELS[item.type] || item.type}
                        </h4>
                        {item.documentNumber && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            #{item.documentNumber}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    {/* Expiration */}
                    {item.expirationDate && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Expires: {new Date(item.expirationDate).toLocaleDateString()}
                      </div>
                    )}

                    {/* Uploaded documents */}
                    {item.documentUploads && item.documentUploads.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {item.documentUploads.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Document {idx + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Upload button */}
                    <button
                      onClick={() => triggerUpload('compliance', item.type, item.id)}
                      disabled={uploading === item.type}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {uploading === item.type ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      {item.documentUploads?.length ? 'Upload Another' : 'Upload Document'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Insurance Section */}
      <div className="bg-white rounded-2xl border border-gray-100 mb-6 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'insurance' ? null : 'insurance')}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900">
                {translate('provider.compliance.insurance') || 'Insurance Policies'}
              </h3>
              <p className="text-sm text-gray-500">
                {insurancePolicies.length} policies • {insurancePolicies.filter(i => i.status === 'VERIFIED').length} verified
              </p>
            </div>
          </div>
          {expandedSection === 'insurance' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'insurance' && (
          <div className="border-t border-gray-100">
            {insurancePolicies.length === 0 ? (
              <div className="p-8 text-center">
                <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-3">
                  No insurance policies on file. Add your coverage information.
                </p>
                <AddInsuranceButton onAdd={loadComplianceData} />
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {insurancePolicies.map((policy) => (
                  <div key={policy.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {INSURANCE_TYPE_LABELS[policy.type] || policy.type}
                        </h4>
                        {policy.providerName && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Provider: {policy.providerName}
                          </p>
                        )}
                        {policy.policyNumber && (
                          <p className="text-xs text-gray-500">
                            Policy #: {policy.policyNumber}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={policy.status} />
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                      {policy.coverageAmount && (
                        <span className="text-xs text-gray-500">
                          Coverage: ${policy.coverageAmount.toLocaleString()}
                        </span>
                      )}
                      {policy.expirationDate && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          Expires: {new Date(policy.expirationDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* COI uploads */}
                    {policy.coiUploads && policy.coiUploads.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {policy.coiUploads.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            COI {idx + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Upload COI button */}
                    <button
                      onClick={() => triggerUpload('insurance', policy.type, policy.id)}
                      disabled={uploading === policy.type}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {uploading === policy.type ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      {policy.coiUploads?.length ? 'Upload Another COI' : 'Upload COI'}
                    </button>
                  </div>
                ))}

                <div className="p-4">
                  <AddInsuranceButton onAdd={loadComplianceData} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              {translate('provider.compliance.infoTitle') || 'Important Information'}
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Uploaded documents are reviewed within 1-2 business days</li>
              <li>• Keep your licenses and insurance policies up to date</li>
              <li>• Expired documents may limit your ability to receive service requests</li>
              <li>• Accepted formats: JPEG, PNG, PDF (max 10MB)</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

// ─── Add Insurance Sub-Component ───
function AddInsuranceButton({ onAdd }: { onAdd: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    type: 'GENERAL_LIABILITY',
    providerName: '',
    policyNumber: '',
    coverageAmount: '',
    expirationDate: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await api.post('/insurance', {
        type: formData.type,
        hasCoverage: true,
        providerName: formData.providerName || undefined,
        policyNumber: formData.policyNumber || undefined,
        coverageAmount: formData.coverageAmount ? parseFloat(formData.coverageAmount) : undefined,
        expirationDate: formData.expirationDate || undefined,
      })
      setShowForm(false)
      setFormData({ type: 'GENERAL_LIABILITY', providerName: '', policyNumber: '', coverageAmount: '', expirationDate: '' })
      onAdd()
    } catch (err) {
      console.error('Error adding insurance:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Insurance Policy
      </button>
    )
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-900">Add Insurance Policy</h4>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          {Object.entries(INSURANCE_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Insurance Provider</label>
          <input
            type="text"
            value={formData.providerName}
            onChange={(e) => setFormData(prev => ({ ...prev, providerName: e.target.value }))}
            placeholder="e.g. State Farm"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Policy Number</label>
          <input
            type="text"
            value={formData.policyNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, policyNumber: e.target.value }))}
            placeholder="POL-123456"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Coverage Amount ($)</label>
          <input
            type="number"
            value={formData.coverageAmount}
            onChange={(e) => setFormData(prev => ({ ...prev, coverageAmount: e.target.value }))}
            placeholder="1000000"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Expiration Date</label>
          <input
            type="date"
            value={formData.expirationDate}
            onChange={(e) => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save Policy'}
        </button>
        <button
          onClick={() => setShowForm(false)}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

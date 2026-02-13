'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { useI18n } from '@/i18n'
import {
  Wrench,
  Upload,
  CheckCircle,
  Shield,
  FileText,
  Loader2,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  X,
} from 'lucide-react'

interface OnboardingStep {
  id: string
  type: 'info' | 'upload' | 'complete'
  title: string
  description: string
  uploadCategory?: string
  apiEndpoint?: string
  required: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { translate } = useI18n()
  const tr = translate

  const [currentStep, setCurrentStep] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string[]>>({})
  const [error, setError] = useState('')
  const [finishing, setFinishing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      type: 'info',
      title: tr('onboarding.welcomeTitle'),
      description: tr('onboarding.welcomeDesc'),
      required: false,
    },
    {
      id: 'business_license',
      type: 'upload',
      title: tr('onboarding.licenseTitle'),
      description: tr('onboarding.licenseDesc'),
      uploadCategory: 'STATE_SHOP_REGISTRATION',
      apiEndpoint: '/compliance',
      required: true,
    },
    {
      id: 'insurance',
      type: 'upload',
      title: tr('onboarding.insuranceTitle'),
      description: tr('onboarding.insuranceDesc'),
      uploadCategory: 'GENERAL_LIABILITY',
      apiEndpoint: '/insurance',
      required: true,
    },
    {
      id: 'complete',
      type: 'complete',
      title: tr('onboarding.completeTitle'),
      description: tr('onboarding.completeDesc'),
      required: false,
    },
  ]

  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  // ─── File Upload ───
  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !step.uploadCategory) return

    setUploading(true)
    setError('')

    try {
      // Upload file to server
      const formData = new FormData()
      formData.append('image', file)

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const url = uploadRes.data?.imageUrl || uploadRes.data?.url
      if (!url) throw new Error('Upload failed')

      // Save to compliance/insurance
      if (step.apiEndpoint === '/compliance') {
        await api.post('/compliance', {
          type: step.uploadCategory,
          documentUploads: [url],
          status: 'PROVIDED_UNVERIFIED',
        })
      } else if (step.apiEndpoint === '/insurance') {
        await api.post('/insurance', {
          type: step.uploadCategory,
          hasCoverage: true,
          coiUploads: [url],
        })
      }

      // Track uploaded files
      setUploadedFiles((prev) => ({
        ...prev,
        [step.id]: [...(prev[step.id] || []), url],
      }))
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.response?.data?.message || err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── Navigation ───
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      setError('')
    }
  }

  const handleSkip = () => {
    if (step.required && !uploadedFiles[step.id]?.length) {
      // Allow skip but warn
    }
    handleNext()
  }

  const handleFinish = async () => {
    setFinishing(true)
    try {
      // Auto-create remaining compliance items
      try {
        await api.post('/compliance/auto-create')
      } catch {}

      // Mark onboarding as complete
      localStorage.setItem('tt_provider_onboarding_done', 'true')

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Finish error:', err)
      setError(err.message || 'Error completing onboarding')
    } finally {
      setFinishing(false)
    }
  }

  const handleSkipAll = () => {
    localStorage.setItem('tt_provider_onboarding_done', 'true')
    router.push('/dashboard')
  }

  const stepFiles = uploadedFiles[step.id] || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Progress Bar */}
          <div className="h-2 bg-gray-100">
            <div
              className="h-full bg-primary-500 transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Header */}
          <div className="px-8 pt-8 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">TechTrust</h1>
                <p className="text-xs text-gray-500">
                  {tr('onboarding.step')} {currentStep + 1} / {steps.length}
                </p>
              </div>
            </div>
            {!isLast && (
              <button
                onClick={handleSkipAll}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                {tr('onboarding.skipAll')}
              </button>
            )}
          </div>

          {/* Content */}
          <div className="px-8 py-6">
            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-600 text-sm flex-1">{error}</p>
                <button onClick={() => setError('')}>
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            )}

            {/* ─── Welcome Step ─── */}
            {step.type === 'info' && step.id === 'welcome' && (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wrench className="w-10 h-10 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {tr('onboarding.welcomeTitle')}
                </h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  {tr('onboarding.welcomeDesc')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-900">{tr('onboarding.step1Label')}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl">
                    <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-900">{tr('onboarding.step2Label')}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-purple-900">{tr('onboarding.step3Label')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Upload Step ─── */}
            {step.type === 'upload' && (
              <div className="py-4">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    {step.id === 'business_license' ? (
                      <Shield className="w-6 h-6 text-primary-600" />
                    ) : (
                      <FileText className="w-6 h-6 text-primary-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{step.title}</h2>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                </div>

                {/* Upload Area */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                />

                <div
                  onClick={!uploading ? handleFileSelect : undefined}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    uploading
                      ? 'border-gray-200 bg-gray-50 cursor-wait'
                      : stepFiles.length > 0
                      ? 'border-green-300 bg-green-50 hover:border-green-400'
                      : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50'
                  }`}
                >
                  {uploading ? (
                    <div>
                      <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-3" />
                      <p className="text-gray-600">{tr('onboarding.uploading')}</p>
                    </div>
                  ) : stepFiles.length > 0 ? (
                    <div>
                      <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                      <p className="text-green-700 font-medium">{tr('onboarding.uploadedSuccess')}</p>
                      <p className="text-green-600 text-sm mt-1">
                        {stepFiles.length} {tr('onboarding.filesUploaded')}
                      </p>
                      <p className="text-gray-400 text-xs mt-2">{tr('onboarding.clickToAddMore')}</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-700 font-medium mb-1">{tr('onboarding.clickToUpload')}</p>
                      <p className="text-gray-400 text-sm">{tr('onboarding.acceptedFormats')}</p>
                    </div>
                  )}
                </div>

                {step.required && stepFiles.length === 0 && (
                  <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {tr('onboarding.requiredDoc')}
                  </p>
                )}
              </div>
            )}

            {/* ─── Complete Step ─── */}
            {step.type === 'complete' && (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {tr('onboarding.completeTitle')}
                </h2>
                <p className="text-gray-600 mb-6">{tr('onboarding.completeDesc')}</p>

                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">{tr('onboarding.summary')}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {uploadedFiles['business_license']?.length ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-sm text-gray-600">{tr('onboarding.licenseTitle')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {uploadedFiles['insurance']?.length ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-sm text-gray-600">{tr('onboarding.insuranceTitle')}</span>
                    </div>
                  </div>
                  {(!uploadedFiles['business_license']?.length || !uploadedFiles['insurance']?.length) && (
                    <p className="text-xs text-amber-600 mt-3">
                      {tr('onboarding.missingDocsNote')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer / Actions */}
          <div className="px-8 pb-8 flex items-center justify-between gap-4">
            {step.type === 'upload' && stepFiles.length === 0 ? (
              <>
                <button
                  onClick={handleSkip}
                  className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  {tr('onboarding.skipStep')}
                </button>
                <button
                  onClick={handleFileSelect}
                  disabled={uploading}
                  className="btn btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {tr('onboarding.uploadDoc')}
                  </span>
                </button>
              </>
            ) : step.type === 'complete' ? (
              <>
                <div />
                <button
                  onClick={handleFinish}
                  disabled={finishing}
                  className="btn btn-primary px-8 py-3 text-base disabled:opacity-50"
                >
                  {finishing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {tr('common.loading')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {tr('onboarding.goToDashboard')}
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                <div />
                <button
                  onClick={handleNext}
                  className="btn btn-primary px-6 py-2.5 text-sm"
                >
                  <span className="flex items-center gap-2">
                    {tr('common.next') || 'Next'}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

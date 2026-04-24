'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Cookies from 'js-cookie'
import {
  Car,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Globe2,
  User,
  Phone,
  ArrowLeft,
  CheckCircle,
  ArrowRight,
  Shield,
  Clock,
  Star,
  Building2,
  Zap,
  Crown,
  CreditCard,
} from 'lucide-react'
import { useI18n, languages, Language } from '../i18n'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

const DIAL_COUNTRIES = [
  { code: 'US', flag: '🇺🇸', name: 'United States', dial: '+1' },
  { code: 'BR', flag: '🇧🇷', name: 'Brasil',         dial: '+55' },
  { code: 'MX', flag: '🇲🇽', name: 'México',         dial: '+52' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada',         dial: '+1' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dial: '+44' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal',       dial: '+351' },
  { code: 'ES', flag: '🇪🇸', name: 'España',         dial: '+34' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina',      dial: '+54' },
  { code: 'CO', flag: '🇨🇴', name: 'Colombia',       dial: '+57' },
  { code: 'FR', flag: '🇫🇷', name: 'France',         dial: '+33' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany',        dial: '+49' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy',          dial: '+39' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia',      dial: '+61' },
]

type Step = 'plan' | 'info' | 'otp' | 'success'
type AccountType = 'INDIVIDUAL' | 'BUSINESS'

interface PlanOption {
  id: string
  name: string
  price: number
  yearlyPrice: number
  vehicleLimit: number
  features: string[]
  isFeatured?: boolean
}

const DEFAULT_PLANS: PlanOption[] = [
  { id: 'free', name: 'Free', price: 0, yearlyPrice: 0, vehicleLimit: 2, features: ['2 vehicles', '4 service requests/month', 'VIN decode & NHTSA recalls', 'PDF receipts', 'Mobile app access'] },
  { id: 'starter', name: 'Starter', price: 9.99, yearlyPrice: 99.99, vehicleLimit: 3, features: ['3 vehicles (+$5.99/extra)', '10 service requests/month', 'Multi-language support', 'Mileage tracker', 'Scheduled maintenance'] },
  { id: 'pro', name: 'Pro', price: 19.99, yearlyPrice: 199.99, vehicleLimit: 5, isFeatured: true, features: ['5 vehicles (+$3.99/extra)', 'Unlimited service requests', 'OBD2 diagnostics', 'Expense reports & wallet', 'Priority support 24/7'] },
  { id: 'enterprise', name: 'Enterprise', price: 49.99, yearlyPrice: 499.99, vehicleLimit: 14, features: ['14 vehicles included', 'All Pro features', 'Vehicle dashboard & analytics', 'Dedicated account manager', '24/7 priority support'] },
]

const planIcons: Record<string, any> = { free: Shield, starter: Zap, pro: Star, enterprise: Crown }

export default function CadastroPage() {
  const router = useRouter()
  const { translate, language, setLanguage } = useI18n()
  const tr = translate

  const [step, setStep] = useState<Step>('plan')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 0: Plan selection
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [plans, setPlans] = useState<PlanOption[]>(DEFAULT_PLANS)

  // Step 1: Personal info
  const [accountType, setAccountType] = useState<AccountType>('INDIVIDUAL')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedDialCountry, setSelectedDialCountry] = useState(DIAL_COUNTRIES[0])
  const [showDialDropdown, setShowDialDropdown] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Step 2: OTP
  const [userId, setUserId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const [showLoginLink, setShowLoginLink] = useState(false)

  // Load plans from API and check URL params
  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch(`${API_BASE_URL}/subscriptions/plans`)
        if (res.ok) {
          const data = await res.json()
          const apiPlans = (data.data || data).map((p: any) => ({
            id: p.planKey,
            name: p.name,
            price: Number(p.monthlyPrice),
            yearlyPrice: Number(p.yearlyPrice),
            vehicleLimit: p.vehicleLimit,
            features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
            isFeatured: p.isFeatured,
          }))
          if (apiPlans.length > 0) setPlans(apiPlans)
        }
      } catch {}
    }
    loadPlans()

    // Check for plan in URL params
    const urlPlan = router.query.plan as string
    if (urlPlan) setSelectedPlan(urlPlan)
  }, [router.query.plan])

  // ─── Phone formatting ───
  function formatPhoneDisplay(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  function phoneToE164(value: string) {
    const digits = value.replace(/\D/g, '')
    if (!digits) return ''
    return `${selectedDialCountry.dial}${digits}`
  }

  // ─── Validate Step ───
  function validateInfo(): boolean {
    if (accountType === 'BUSINESS' && !businessName.trim()) {
      setError(tr('signup.businessNameRequired') || 'Please enter your business name')
      return false
    }
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      setError(tr('signup.fullNameRequired'))
      return false
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError(tr('signup.emailRequired'))
      return false
    }
    const e164 = phoneToE164(phone)
    if (!e164 || e164.replace(/\D/g, '').length < 7) {
      setError(tr('signup.phoneRequired'))
      return false
    }
    if (password.length < 8) {
      setError(tr('signup.passwordMin'))
      return false
    }
    if (password !== confirmPassword) {
      setError(tr('signup.passwordMismatch'))
      return false
    }
    return true
  }

  // ─── Submit Registration ───
  async function handleRegister() {
    if (!validateInfo()) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phoneToE164(phone),
          password,
          role: 'CLIENT',
          accountType,
          businessName: accountType === 'BUSINESS' ? businessName.trim() : undefined,
          selectedPlan: selectedPlan || 'free',
          language: language.toUpperCase(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorCode = data.code
        if (errorCode === 'EMAIL_ALREADY_EXISTS' || errorCode === 'PHONE_ALREADY_EXISTS') {
          setError(data.message || 'Account already exists. Please log in.')
          setShowLoginLink(true)
          return
        }
        throw new Error(data.message || data.error || 'Registration failed')
      }

      setUserId(data.data.userId)
      setStep('otp')
      // If OTP was not sent, auto-trigger resend
      if (data.data.otpSent === false) {
        try {
          await fetch(`${API_BASE_URL}/auth/resend-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.data.userId, method: 'sms' }),
          })
        } catch {}
      }
    } catch (err: any) {
      setError(err.message || 'Error creating account')
    } finally {
      setLoading(false)
    }
  }

  // ─── Verify OTP ───
  async function handleVerifyOTP() {
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError(tr('signup.otpRequired'))
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          otpCode: otpCode.trim(),
          method: 'sms',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Verification failed')
      }

      const responseData = data.data || data
      const token = responseData.token
      const userData = responseData.user

      if (token && userData) {
        Cookies.set('tt_client_token', token, { expires: 7 })
        Cookies.set('tt_client_user', JSON.stringify(userData), { expires: 7 })
      }

      if (selectedPlan && selectedPlan !== 'free' && token) {
        const checkoutRes = await fetch(`${API_BASE_URL}/subscriptions/checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            planKey: selectedPlan,
            billingPeriod: 'monthly',
            successUrl: `${window.location.origin}/planos?stripe=success`,
            cancelUrl: `${window.location.origin}/planos?stripe=cancelled`,
          }),
        })

        const checkoutData = await checkoutRes.json()
        if (!checkoutRes.ok) {
          throw new Error(checkoutData.message || checkoutData.error || 'Could not start checkout')
        }

        const checkoutUrl = checkoutData.data?.checkoutUrl
        if (checkoutUrl) {
          window.location.href = checkoutUrl
          return
        }
      }

      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Error verifying code')
    } finally {
      setLoading(false)
    }
  }

  // ─── Resend OTP ───
  async function handleResendOTP() {
    if (resendCooldown > 0) return
    setResending(true)

    try {
      await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          method: 'sms',
        }),
      })

      setResendCooldown(30)
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      console.error('Resend error:', err)
    } finally {
      setResending(false)
    }
  }

  // ─── Step indicators ───
  const steps: { key: Step; label: string }[] = [
    { key: 'plan', label: tr('signup.stepPlan') || 'Choose Plan' },
    { key: 'info', label: tr('signup.stepInfo') },
    { key: 'otp', label: tr('signup.stepVerify') },
  ]

  const currentIdx = steps.findIndex((s) => s.key === step)

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
                <Car className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tr('brand.name')}</h1>
                <p className="text-sm text-gray-500">{tr('client.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe2 className="w-4 h-4" />
              <label className="sr-only" htmlFor="lang-select">{tr('common.language')}</label>
              <select
                id="lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Step Progress (only for info/otp) */}
          {step !== 'success' && (
            <div className="flex items-center gap-2 mb-8">
              {steps.map((s, idx) => (
                <React.Fragment key={s.key}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        idx < currentIdx
                          ? 'bg-green-500 text-white'
                          : idx === currentIdx
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {idx < currentIdx ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                    </div>
                    <span
                      className={`text-sm ${
                        idx === currentIdx ? 'text-primary-600 font-medium' : 'text-gray-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 ${idx < currentIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 text-lg">!</span>
              </div>
              <div>
                <p className="text-red-600 text-sm">{error}</p>
                {showLoginLink && (
                  <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold text-sm underline mt-1 inline-block">
                    {tr('auth.signIn')} →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ─── Step 0: Plan Selection ─── */}
          {step === 'plan' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{tr('signup.choosePlan') || 'Choose Your Plan'}</h2>
              <p className="text-gray-600 mb-6">{tr('signup.choosePlanDesc') || 'Free plan forever. Paid plans include a 7-day free trial.'}</p>

              <div className="space-y-3">
                {plans.map((plan) => {
                  const Icon = planIcons[plan.id] || Shield
                  const isSelected = selectedPlan === plan.id
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${plan.isFeatured ? 'relative' : ''}`}
                    >
                      {plan.isFeatured && (
                        <span className="absolute -top-2.5 right-4 bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                          {tr('plans.popular') || 'MOST POPULAR'}
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                            <span className="font-bold text-gray-900">
                              {plan.price === 0 ? (tr('plans.free') || 'Free') : `$${plan.price}/mo`}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {tr('plans.upToVehicles') || 'Up to'} {plan.vehicleLimit} {tr('plans.vehicles') || 'vehicles'}
                            {plan.price > 0 && ` • 7-day free trial`}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary-600 bg-primary-600' : 'border-gray-300'}`}>
                          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => {
                  if (!selectedPlan) { setError(tr('signup.selectPlan') || 'Please select a plan'); return }
                  setError('')
                  setStep('info')
                }}
                className="btn btn-primary w-full py-3 text-base mt-6"
              >
                <span className="flex items-center justify-center gap-2">
                  {tr('common.continue') || 'Continue'}
                  <ArrowRight className="w-5 h-5" />
                </span>
              </button>

              <p className="mt-6 text-center text-gray-600">
                {tr('signup.alreadyHaveAccount')}{' '}
                <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  {tr('auth.signIn')}
                </Link>
              </p>
            </div>
          )}

          {/* ─── Step 1: Personal Info ─── */}
          {step === 'info' && (
            <div>
              <button
                onClick={() => setStep('plan')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                {tr('signup.stepPlan') || 'Choose Plan'}
              </button>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">{tr('signup.personalInfo')}</h2>
              <p className="text-gray-600 mb-6">{tr('signup.personalInfoDesc')}</p>

              <div className="space-y-4">
                {/* Account Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tr('signup.accountType') || 'Account Type'}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountType('INDIVIDUAL')}
                      className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        accountType === 'INDIVIDUAL'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      {tr('signup.individual') || 'Individual'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('BUSINESS')}
                      className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        accountType === 'BUSINESS'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      {tr('signup.business') || 'Business'}
                    </button>
                  </div>
                </div>
                {/* Business Name (only for BUSINESS) */}
                {accountType === 'BUSINESS' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{tr('signup.businessName') || 'Business Name'}</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => { setBusinessName(e.target.value); setError('') }}
                        placeholder="TechTrust Auto LLC"
                        className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tr('signup.fullName')}</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); setError('') }}
                      placeholder="John Smith"
                      className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tr('auth.email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError('') }}
                      placeholder="your@email.com"
                      className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tr('signup.phone')}</label>
                  <div className="flex gap-2">
                    {/* Country flag / dial-code picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDialDropdown(!showDialDropdown)}
                        className="flex items-center gap-1.5 px-3 py-3 rounded-lg border border-gray-300 hover:border-gray-400 bg-white text-sm font-medium text-gray-700 whitespace-nowrap"
                      >
                        <span className="text-lg leading-none">{selectedDialCountry.flag}</span>
                        <span className="text-gray-600">{selectedDialCountry.dial}</span>
                        <span className="text-gray-400 text-xs">▾</span>
                      </button>
                      {showDialDropdown && (
                        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-56 max-h-64 overflow-y-auto">
                          {DIAL_COUNTRIES.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => { setSelectedDialCountry(c); setShowDialDropdown(false) }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 ${selectedDialCountry.code === c.code ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
                            >
                              <span className="text-lg">{c.flag}</span>
                              <span className="flex-1 text-left">{c.name}</span>
                              <span className="text-gray-400">{c.dial}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Phone number input */}
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(formatPhoneDisplay(e.target.value)); setError('') }}
                        placeholder="(555) 123-4567"
                        className="w-full pl-9 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tr('auth.password')}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{tr('signup.passwordHint')}</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tr('signup.confirmPassword')}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {tr('signup.creating')}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {tr('signup.createAccount')}
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </button>
              </div>

              <p className="mt-6 text-center text-gray-600">
                {tr('signup.alreadyHaveAccount')}{' '}
                <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  {tr('auth.signIn')}
                </Link>
              </p>
            </div>
          )}

          {/* ─── Step 2: OTP Verification ─── */}
          {step === 'otp' && (
            <div>
              <button
                onClick={() => setStep('info')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                {tr('signup.stepInfo')}
              </button>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">{tr('signup.verifyTitle')}</h2>
              <p className="text-gray-600 mb-8">{tr('signup.verifyDesc')}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tr('signup.enterCode')}</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                    placeholder="000000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {tr('signup.verifying')}
                    </span>
                  ) : (
                    tr('signup.verify')
                  )}
                </button>

                <div className="text-center">
                  {resendCooldown > 0 ? (
                    <p className="text-sm text-gray-500">
                      {tr('signup.codeSent')} ({resendCooldown}s)
                    </p>
                  ) : (
                    <button
                      onClick={handleResendOTP}
                      disabled={resending}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {resending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : tr('signup.resendCode')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 3: Success ─── */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-3">{tr('signup.successTitle')}</h2>
              <p className="text-gray-600 mb-2">{tr('signup.successDesc')}</p>
              {selectedPlan && selectedPlan !== 'free' && (
                <p className="text-sm text-primary-600 font-medium mb-2">
                  {tr('signup.selectedPlan') || 'Selected plan'}: {plans.find(p => p.id === selectedPlan)?.name || selectedPlan}
                  {' — '}{tr('signup.trialInfo') || 'You will have 7 days free to try before being charged.'}
                </p>
              )}
              <p className="text-sm text-gray-500 mb-8">{tr('signup.successMobile')}</p>

              <button
                onClick={() => router.push('/login')}
                className="btn btn-primary w-full py-3 text-base"
              >
                <span className="flex items-center justify-center gap-2">
                  {tr('signup.goToLogin')}
                  <ArrowRight className="w-5 h-5" />
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 to-primary-800 p-12 items-center justify-center">
        <div className="max-w-md text-white">
          <h2 className="text-3xl font-bold mb-6">{tr('signup.heroTitle')}</h2>
          <p className="text-primary-100 mb-10 text-lg">{tr('signup.heroDesc')}</p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{tr('signup.benefit1Title')}</h3>
                <p className="text-primary-100">{tr('signup.benefit1Desc')}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{tr('signup.benefit2Title')}</h3>
                <p className="text-primary-100">{tr('signup.benefit2Desc')}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{tr('signup.benefit3Title')}</h3>
                <p className="text-primary-100">{tr('signup.benefit3Desc')}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 pt-8 border-t border-white/20 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">50K+</div>
              <div className="text-primary-200 text-sm">{tr('client.stats.customers')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">500+</div>
              <div className="text-primary-200 text-sm">{tr('client.stats.providers')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">4.9</div>
              <div className="text-primary-200 text-sm">{tr('client.stats.rating')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  Wrench,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Globe2,
  User,
  Phone,
  Building2,
  MapPin,
  ArrowLeft,
  CheckCircle,
  Package,
} from 'lucide-react'
import { useI18n, languages, Language } from '@/i18n'
import api from '@/services/api'

// ─── Service & Vehicle Options (match mobile) ───
const SERVICES = [
  { key: 'OIL_CHANGE', label: 'Oil Change' },
  { key: 'BRAKES', label: 'Brakes' },
  { key: 'TIRES', label: 'Tires' },
  { key: 'ENGINE', label: 'Engine' },
  { key: 'TRANSMISSION', label: 'Transmission' },
  { key: 'ELECTRICAL_BASIC', label: 'Electrical' },
  { key: 'AC_SERVICE', label: 'A/C' },
  { key: 'SUSPENSION', label: 'Suspension' },
  { key: 'BATTERY', label: 'Battery' },
  { key: 'INSPECTION', label: 'Inspection' },
  { key: 'DIAGNOSTICS', label: 'Diagnostics' },
  { key: 'DETAILING', label: 'Detailing' },
  { key: 'TOWING', label: 'Towing' },
  { key: 'ROADSIDE_ASSIST', label: 'Roadside' },
  { key: 'LOCKOUT', label: 'Lockout' },
  { key: 'MAINTENANCE_LIGHT', label: 'Warning Light' },
  { key: 'GENERAL_REPAIR', label: 'General Repair' },
]

const VEHICLE_TYPES = [
  { key: 'CAR', label: 'Car / Sedan' },
  { key: 'SUV', label: 'SUV' },
  { key: 'TRUCK', label: 'Pickup Truck' },
  { key: 'VAN', label: 'Van / Minivan' },
  { key: 'HEAVY_TRUCK', label: 'Heavy Truck' },
  { key: 'BUS', label: 'Bus / RV' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

type Step = 'info' | 'business' | 'services' | 'otp' | 'success'

export default function CadastroPage() {
  const router = useRouter()
  const { translate, language, setLanguage } = useI18n()
  const tr = translate

  const [step, setStep] = useState<Step>('info')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Personal info
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Step 2: Business info
  const [businessName, setBusinessName] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [businessState, setBusinessState] = useState('FL')
  const [businessZipCode, setBusinessZipCode] = useState('')

  // Step 3: Services
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set())
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(
    new Set(['CAR', 'SUV', 'TRUCK', 'VAN'])
  )
  const [sellsParts, setSellsParts] = useState(false)

  // Step 4: OTP
  const [userId, setUserId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [resending, setResending] = useState(false)

  // ─── Validation ───
  const validateStep1 = () => {
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      setError(tr('signup.fullNameRequired') || 'Please enter your full name (first and last)')
      return false
    }
    if (!email.trim() || !email.includes('@')) {
      setError(tr('signup.emailRequired') || 'Please enter a valid email')
      return false
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError(tr('signup.phoneRequired') || 'Please enter a valid US phone number')
      return false
    }
    if (password.length < 8) {
      setError(tr('signup.passwordMin') || 'Password must be at least 8 characters')
      return false
    }
    if (password !== confirmPassword) {
      setError(tr('signup.passwordMismatch') || 'Passwords do not match')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!businessName.trim()) {
      setError(tr('signup.businessNameRequired') || 'Please enter your business name')
      return false
    }
    if (!businessAddress.trim()) {
      setError(tr('signup.addressRequired') || 'Please enter your business address')
      return false
    }
    if (!businessZipCode.trim() || businessZipCode.length < 5) {
      setError(tr('signup.zipRequired') || 'Please enter a valid ZIP code')
      return false
    }
    return true
  }

  const validateStep3 = () => {
    if (selectedServices.size === 0) {
      setError(tr('signup.servicesRequired') || 'Please select at least one service')
      return false
    }
    return true
  }

  // ─── Phone formatting ───
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // ─── Step handlers ───
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (validateStep1()) setStep('business')
  }

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (validateStep2()) setStep('services')
  }

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validateStep3()) return

    setLoading(true)
    try {
      // Normalize phone to E.164
      const digits = phone.replace(/\D/g, '')
      const normalizedPhone = `+1${digits}`

      const response = await api.post('/auth/signup', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
        password,
        language: language.toUpperCase(),
        role: 'PROVIDER',
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        businessCity: businessCity.trim() || undefined,
        businessState: businessState,
        businessZipCode: businessZipCode.trim(),
        servicesOffered: Array.from(selectedServices),
        vehicleTypesServed: Array.from(selectedVehicles),
        sellsParts,
      })

      const data = response.data?.data
      if (data?.userId) {
        setUserId(data.userId)
        setStep('otp')
      } else {
        throw new Error('Unexpected response')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (otpCode.trim().length < 4) {
      setError(tr('signup.otpRequired') || 'Please enter the verification code')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/verify-otp', {
        userId,
        otpCode: otpCode.trim(),
        method: 'sms',
      })
      setStep('success')
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setResending(true)
    try {
      await api.post('/auth/resend-otp', { userId, method: 'sms' })
    } catch {}
    setTimeout(() => setResending(false), 30000)
  }

  // ─── Chip toggle ───
  const toggleChip = (set: Set<string>, setFn: (s: Set<string>) => void, key: string) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setFn(next)
  }

  // ─── Step indicators ───
  const steps = [
    { id: 'info', label: tr('signup.stepInfo') || 'Your Info' },
    { id: 'business', label: tr('signup.stepBusiness') || 'Business' },
    { id: 'services', label: tr('signup.stepServices') || 'Services' },
    { id: 'otp', label: tr('signup.stepVerify') || 'Verify' },
  ]
  const stepIndex = steps.findIndex(s => s.id === step)

  return (
    <div className="min-h-screen flex">
      {/* Left: Form */}
      <div className="flex-1 flex items-start justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-lg py-8">
          {/* Logo + language */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{tr('brand.name')}</h1>
                <p className="text-sm text-gray-500">{tr('signup.title') || 'Provider Registration'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe2 className="w-4 h-4 text-gray-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Step Progress (hide for success) */}
          {step !== 'success' && (
            <div className="flex items-center gap-2 mb-8">
              {steps.map((s, i) => (
                <React.Fragment key={s.id}>
                  <div className="flex items-center gap-1.5">
                    <div className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                      ${i < stepIndex ? 'bg-green-500 text-white' : 
                        i === stepIndex ? 'bg-primary-500 text-white' : 
                        'bg-gray-200 text-gray-500'}
                    `}>
                      {i < stepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${
                      i === stepIndex ? 'text-primary-600' : 'text-gray-400'
                    }`}>{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 ${i < stepIndex ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* ═══════ STEP 1: Personal Info ═══════ */}
          {step === 'info' && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {tr('signup.personalInfo') || 'Your Information'}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  {tr('signup.personalInfoDesc') || 'Create your account to get started'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {tr('signup.fullName') || 'Full Name'} *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="input pl-11"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {tr('auth.email')} *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="input pl-11"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {tr('signup.phone') || 'Phone Number'} *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm rounded-l-xl">
                      +1
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(305) 555-0123"
                      className="input rounded-l-none pl-3"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {tr('auth.password')} *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-11 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {tr('signup.passwordHint') || 'Minimum 8 characters'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {tr('signup.confirmPassword') || 'Confirm Password'} *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-11"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full py-3 text-base mt-2">
                {tr('common.next') || 'Next'}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                {tr('signup.alreadyHaveAccount') || 'Already have an account?'}{' '}
                <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                  {tr('auth.signIn')}
                </Link>
              </p>
            </form>
          )}

          {/* ═══════ STEP 2: Business Info ═══════ */}
          {step === 'business' && (
            <form onSubmit={handleStep2} className="space-y-4">
              <button
                type="button"
                onClick={() => { setError(''); setStep('info') }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> {tr('common.back')}
              </button>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {tr('signup.businessInfo') || 'Business Information'}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  {tr('signup.businessInfoDesc') || 'Tell us about your auto repair shop'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {tr('signup.businessName') || 'Business Name'} *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Joe's Auto Repair"
                    className="input pl-11"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {tr('signup.businessAddress') || 'Business Address'} *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="123 Main Street"
                    className="input pl-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {tr('signup.city') || 'City'}
                  </label>
                  <input
                    type="text"
                    value={businessCity}
                    onChange={(e) => setBusinessCity(e.target.value)}
                    placeholder="Miami"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {tr('signup.state') || 'State'}
                  </label>
                  <select
                    value={businessState}
                    onChange={(e) => setBusinessState(e.target.value)}
                    className="input"
                  >
                    {US_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {tr('signup.zipCode') || 'ZIP Code'} *
                  </label>
                  <input
                    type="text"
                    value={businessZipCode}
                    onChange={(e) => setBusinessZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="33101"
                    className="input"
                    maxLength={5}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full py-3 text-base mt-2">
                {tr('common.next') || 'Next'}
              </button>
            </form>
          )}

          {/* ═══════ STEP 3: Services ═══════ */}
          {step === 'services' && (
            <form onSubmit={handleStep3} className="space-y-5">
              <button
                type="button"
                onClick={() => { setError(''); setStep('business') }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> {tr('common.back')}
              </button>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {tr('signup.servicesTitle') || 'Your Services'}
                </h2>
                <p className="text-sm text-gray-500 mb-1">
                  {tr('signup.servicesDesc') || 'Select the services you offer. You can change these later.'}
                </p>
              </div>

              {/* Services chips */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tr('signup.servicesOffered') || 'Services You Offer'} *
                </label>
                <div className="flex flex-wrap gap-2">
                  {SERVICES.map(s => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleChip(selectedServices, setSelectedServices, s.key)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        selectedServices.has(s.key)
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {selectedServices.size > 0 && (
                  <p className="text-xs text-primary-500 mt-1.5 font-medium">
                    {selectedServices.size} selected
                  </p>
                )}
              </div>

              {/* Vehicle types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tr('signup.vehicleTypes') || 'Vehicle Types You Serve'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_TYPES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => toggleChip(selectedVehicles, setSelectedVehicles, v.key)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        selectedVehicles.has(v.key)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sells parts toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {tr('signup.sellsParts') || 'I also sell auto parts'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tr('signup.sellsPartsHint') || 'Customers can request parts from you'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSellsParts(!sellsParts)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    sellsParts ? 'bg-primary-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-1 transition-transform ${
                    sellsParts ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3 text-base mt-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {tr('signup.creating') || 'Creating account...'}
                  </span>
                ) : (
                  tr('signup.createAccount') || 'Create Account'
                )}
              </button>
            </form>
          )}

          {/* ═══════ STEP 4: OTP Verification ═══════ */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {tr('signup.verifyTitle') || 'Verify Your Phone'}
                </h2>
                <p className="text-sm text-gray-500">
                  {tr('signup.verifyDesc') || 'We sent a verification code to your phone number'}
                </p>
                <p className="text-sm font-semibold text-gray-700 mt-1">
                  +1 {phone}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 text-center">
                  {tr('signup.enterCode') || 'Enter verification code'}
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="input text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3 text-base disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {tr('signup.verifying') || 'Verifying...'}
                  </span>
                ) : (
                  tr('signup.verify') || 'Verify & Continue'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400"
                >
                  {resending
                    ? (tr('signup.codeSent') || 'Code sent! Wait 30s to resend')
                    : (tr('signup.resendCode') || "Didn't receive the code? Resend")}
                </button>
              </div>
            </form>
          )}

          {/* ═══════ STEP 5: Success ═══════ */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {tr('signup.successTitle') || 'Welcome to TechTrust!'}
              </h2>
              <p className="text-gray-500 mb-2 max-w-sm mx-auto">
                {tr('signup.successDesc') || 'Your account has been created successfully. You can now access your dashboard and start managing your services.'}
              </p>
              <p className="text-sm text-gray-400 mb-8">
                {tr('signup.successMobile') || 'You can also download the TechTrust app to manage your business on the go.'}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/login')}
                  className="btn btn-primary w-full py-3 text-base"
                >
                  {tr('signup.goToLogin') || 'Go to Login'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-500 to-primary-700 p-12 items-center justify-center">
        <div className="max-w-md text-white">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6">
              <Wrench className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold mb-4">
              {tr('signup.heroTitle') || 'Join Our Network of Trusted Providers'}
            </h2>
            <p className="text-lg text-primary-100 leading-relaxed">
              {tr('signup.heroDesc') || 'Register your shop, receive service requests from customers in your area, and grow your business with TechTrust.'}
            </p>
          </div>

          <div className="space-y-4 mt-12">
            <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-5">
              <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{tr('signup.benefit1Title') || 'Free to Register'}</p>
                <p className="text-sm text-primary-100">{tr('signup.benefit1Desc') || 'No monthly fees. Pay only when you earn.'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-5">
              <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{tr('signup.benefit2Title') || 'Receive Local Requests'}</p>
                <p className="text-sm text-primary-100">{tr('signup.benefit2Desc') || 'Get matched with customers in your service area.'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-5">
              <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{tr('signup.benefit3Title') || 'Web + Mobile Access'}</p>
                <p className="text-sm text-primary-100">{tr('signup.benefit3Desc') || 'Manage everything from your computer or phone.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

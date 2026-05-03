'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
  Wrench,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  User,
  Phone,
  Building2,
  MapPin,
  ArrowLeft,
  CheckCircle,
  Package,
  CreditCard,
  FileText,
  ChevronDown,
  AlertCircle,
  X,
} from 'lucide-react'
import { useI18n } from '@/i18n'
import LangSelector from '@/components/LangSelector'
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

const flagSrc = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`

type Step = 'info' | 'business' | 'services' | 'otp' | 'success'

export default function CadastroPage() {
  const router = useRouter()
  const { translate, language, setLanguage } = useI18n()
  const tr = translate

  const [step, setStep] = useState<Step>('info')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Step 1: Personal info ──
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedDialCountry, setSelectedDialCountry] = useState(DIAL_COUNTRIES[0])
  const [showDialDropdown, setShowDialDropdown] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // ── Step 2: Business info ──
  const [businessName, setBusinessName] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [businessState, setBusinessState] = useState('FL')
  const [businessZipCode, setBusinessZipCode] = useState('')
  // Legal / compliance fields
  const [legalName, setLegalName] = useState('')
  const [ein, setEin] = useState('')
  const [sunbizDocumentNumber, setSunbizDocumentNumber] = useState('')
  const [cityBtr, setCityBtr] = useState('')
  const [countyBtr, setCountyBtr] = useState('')
  const [btrNotApplicable, setBtrNotApplicable] = useState(false)

  // Address autocomplete
  const [addrQuery, setAddrQuery] = useState('')
  const [addrResults, setAddrResults] = useState<Array<{ id: string; display: string; street: string; city: string; state: string; zip: string }>>([])
  const [addrSearching, setAddrSearching] = useState(false)
  const addrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function searchAddress(query: string) {
    if (query.length < 3) { setAddrResults([]); return }
    setAddrSearching(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=us`
      const resp = await fetch(url, { headers: { 'User-Agent': 'TechTrust-Web/1.0' } })
      const data = await resp.json()
      const STATE_ABBR: Record<string, string> = { Alabama:'AL',Alaska:'AK',Arizona:'AZ',Arkansas:'AR',California:'CA',Colorado:'CO',Connecticut:'CT',Delaware:'DE',Florida:'FL',Georgia:'GA',Hawaii:'HI',Idaho:'ID',Illinois:'IL',Indiana:'IN',Iowa:'IA',Kansas:'KS',Kentucky:'KY',Louisiana:'LA',Maine:'ME',Maryland:'MD',Massachusetts:'MA',Michigan:'MI',Minnesota:'MN',Mississippi:'MS',Missouri:'MO',Montana:'MT',Nebraska:'NE',Nevada:'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND',Ohio:'OH',Oklahoma:'OK',Oregon:'OR',Pennsylvania:'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',Tennessee:'TN',Texas:'TX',Utah:'UT',Vermont:'VT',Virginia:'VA',Washington:'WA','West Virginia':'WV',Wisconsin:'WI',Wyoming:'WY','District of Columbia':'DC' }
      setAddrResults(data.map((item: any) => {
        const a = item.address || {}
        const stateFull = a.state || ''
        const number = a.house_number || ''
        const road = a.road || ''
        return {
          id: item.place_id?.toString() || Math.random().toString(),
          display: item.display_name || '',
          street: number ? `${number} ${road}` : road,
          city: a.city || a.town || a.village || a.hamlet || '',
          state: STATE_ABBR[stateFull] || stateFull,
          zip: a.postcode || '',
        }
      }))
    } catch { setAddrResults([]) }
    finally { setAddrSearching(false) }
  }

  function handleAddrQueryChange(value: string) {
    setAddrQuery(value)
    if (addrTimeoutRef.current) clearTimeout(addrTimeoutRef.current)
    addrTimeoutRef.current = setTimeout(() => searchAddress(value), 400)
  }

  function selectAddrResult(r: typeof addrResults[0]) {
    setBusinessAddress(r.street || r.display.split(',')[0])
    setAddrQuery(r.street || r.display.split(',')[0])
    if (r.city) setBusinessCity(r.city)
    if (r.state) setBusinessState(r.state)
    if (r.zip) setBusinessZipCode(r.zip)
    setAddrResults([])
  }

  // ── Step 3: Services + Payout + Insurance ──
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set())
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(
    new Set(['CAR', 'SUV', 'TRUCK', 'VAN'])
  )
  const [sellsParts, setSellsParts] = useState(false)
  // Payout method
  const [payoutMethod, setPayoutMethod] = useState<'MANUAL' | 'ZELLE' | 'BANK_TRANSFER'>('MANUAL')
  const [zelleContact, setZelleContact] = useState('')          // email or phone
  const [bankAccountType, setBankAccountType] = useState<'CHECKING' | 'SAVINGS'>('CHECKING')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankRoutingNumber, setBankRoutingNumber] = useState('')
  // Insurance disclosure
  const [insuranceDisclosureAccepted, setInsuranceDisclosureAccepted] = useState(false)
  const [showInsuranceModal, setShowInsuranceModal] = useState(false)

  // ── Step 4: OTP ──
  const [userId, setUserId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [resending, setResending] = useState(false)
  const [showLoginLink, setShowLoginLink] = useState(false)
  const [otpMethod, setOtpMethod] = useState<'sms' | 'email'>('sms')
  const [activeOtpMethod, setActiveOtpMethod] = useState<'sms' | 'email'>('sms')

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
    if (!phone.trim() || phone.replace(/\D/g, '').length < 5) {
      setError(tr('signup.phoneRequired') || 'Please enter a valid phone number')
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
    if (payoutMethod === 'ZELLE' && !zelleContact.trim()) {
      setError('Please enter your Zelle email or phone number')
      return false
    }
    if (payoutMethod === 'BANK_TRANSFER') {
      if (!bankAccountNumber.trim() || !bankRoutingNumber.trim()) {
        setError('Please enter your bank account and routing numbers')
        return false
      }
    }
    if (!insuranceDisclosureAccepted) {
      setError('You must acknowledge the insurance disclosure to continue')
      return false
    }
    return true
  }

  // ─── Phone E.164 normalization ───
  function phoneToE164(): string {
    const digits = phone.replace(/\D/g, '')
    return `${selectedDialCountry.dial}${digits}`
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
      const normalizedPhone = phoneToE164()

      const response = await api.post('/auth/signup', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
        password,
        language: language.toUpperCase(),
        role: 'PROVIDER',
        // Business
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        businessCity: businessCity.trim() || undefined,
        businessState: businessState,
        businessZipCode: businessZipCode.trim(),
        // Services
        servicesOffered: Array.from(selectedServices),
        vehicleTypesServed: Array.from(selectedVehicles),
        sellsParts,
        // Legal / compliance
        legalName: legalName.trim() || undefined,
        ein: ein.trim().replace(/\D/g, '') || undefined,
        sunbizDocumentNumber: sunbizDocumentNumber.trim() || undefined,
        cityBusinessTaxReceiptNumber: !btrNotApplicable ? cityBtr.trim() || undefined : undefined,
        countyBusinessTaxReceiptNumber: !btrNotApplicable ? countyBtr.trim() || undefined : undefined,
        // Payout
        payoutMethod,
        zelleEmail: payoutMethod === 'ZELLE' && zelleContact.includes('@') ? zelleContact.trim() : undefined,
        zellePhone: payoutMethod === 'ZELLE' && !zelleContact.includes('@') ? zelleContact.trim() : undefined,
        bankAccountType: payoutMethod === 'BANK_TRANSFER' ? bankAccountType : undefined,
        bankAccountNumber: payoutMethod === 'BANK_TRANSFER' ? bankAccountNumber.trim() || undefined : undefined,
        bankRoutingNumber: payoutMethod === 'BANK_TRANSFER' ? bankRoutingNumber.trim() || undefined : undefined,
        // Disclosures
        insuranceDisclosureAccepted,
        marketplaceFacilitatorTaxAcknowledged: true,
        // OTP preference
        preferredOtpMethod: otpMethod,
      })

      const data = response.data?.data
      if (data?.userId) {
        setUserId(data.userId)
        setActiveOtpMethod(data.otpMethod || otpMethod)
        setStep('otp')
        if (data.otpSent === false) {
          try {
            await api.post('/auth/resend-otp', { userId: data.userId, method: otpMethod })
          } catch {}
        }
      } else {
        throw new Error('Unexpected response')
      }
    } catch (err: any) {
      const errorCode = err.response?.data?.code
      if (errorCode === 'EMAIL_ALREADY_EXISTS' || errorCode === 'PHONE_ALREADY_EXISTS') {
        setError(err.response?.data?.message + ' ')
        setShowLoginLink(true)
      } else {
        setError(err.response?.data?.message || err.message || 'Registration failed')
      }
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
        method: activeOtpMethod,
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
      await api.post('/auth/resend-otp', { userId, method: activeOtpMethod })
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
    { id: 'info',     label: tr('signup.stepInfo')     || 'Your Info' },
    { id: 'business', label: tr('signup.stepBusiness') || 'Business' },
    { id: 'services', label: tr('signup.stepServices') || 'Services' },
    { id: 'otp',      label: tr('signup.stepVerify')   || 'Verify' },
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
            <LangSelector language={language} setLanguage={setLanguage} />
          </div>

          {/* Step Progress */}
          {step !== 'success' && (
            <div className="flex items-center gap-2 mb-8">
              {steps.map((s, i) => (
                <React.Fragment key={s.id}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                      ${i < stepIndex ? 'bg-green-500 text-white' : i === stepIndex ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {i < stepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${i === stepIndex ? 'text-primary-600' : 'text-gray-400'}`}>{s.label}</span>
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
              {showLoginLink && (
                <Link href="/login" className="block mt-2 text-primary-600 hover:text-primary-700 font-semibold underline">
                  {tr('auth.signIn') || 'Sign in'} →
                </Link>
              )}
            </div>
          )}

          {/* ═══════ STEP 1: Personal Info ═══════ */}
          {step === 'info' && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{tr('signup.personalInfo') || 'Your Information'}</h2>
                <p className="text-sm text-gray-500 mb-4">{tr('signup.personalInfoDesc') || 'Create your provider account'}</p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr('signup.fullName') || 'Full Name'} *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" className="input !pl-11" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr('auth.email')} *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="input !pl-11" />
                </div>
              </div>

              {/* Phone with country picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr('signup.phone') || 'Phone Number'} *</label>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDialDropdown(!showDialDropdown)}
                      className="flex items-center gap-1.5 px-3 py-3 rounded-xl border border-gray-200 hover:border-gray-300 bg-white text-sm font-medium text-gray-700 whitespace-nowrap"
                    >
                      <img src={flagSrc(selectedDialCountry.code)} alt={selectedDialCountry.code} className="h-4 w-6 rounded-[2px] object-cover" />
                      <span className="text-gray-600">{selectedDialCountry.dial}</span>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>
                    {showDialDropdown && (
                      <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-56 max-h-64 overflow-y-auto">
                        {DIAL_COUNTRIES.map(c => (
                          <button key={c.code} type="button"
                            onClick={() => { setSelectedDialCountry(c); setShowDialDropdown(false) }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 ${selectedDialCountry.code === c.code ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}>
                            <img src={flagSrc(c.code)} alt={c.code} className="h-4 w-6 rounded-[2px] object-cover" />
                            <span className="flex-1 text-left">{c.name}</span>
                            <span className="text-gray-400">{c.dial}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d\s\-()]/g, ''))}
                      placeholder="(305) 555-0123" className="input !pl-11 w-full" />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr('auth.password')} *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input !pl-11 !pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">{tr('signup.passwordHint') || 'Minimum 8 characters'}</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr('signup.confirmPassword') || 'Confirm Password'} *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input !pl-11" />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full py-3 text-base mt-2">{tr('common.next') || 'Next'}</button>
              <p className="text-center text-sm text-gray-500 mt-4">
                {tr('signup.alreadyHaveAccount') || 'Already have an account?'}{' '}
                <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">{tr('auth.signIn')}</Link>
              </p>
            </form>
          )}

          {/* ═══════ STEP 2: Business + Legal Info ═══════ */}
          {step === 'business' && (
            <form onSubmit={handleStep2} className="space-y-4">
              <button type="button" onClick={() => { setError(''); setStep('info') }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
                <ArrowLeft className="w-4 h-4" /> {tr('common.back')}
              </button>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{tr('signup.businessInfo') || 'Business Information'}</h2>
                <p className="text-sm text-gray-500 mb-4">{tr('signup.businessInfoDesc') || 'Tell us about your auto repair shop'}</p>
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr('signup.businessName') || 'Business Name'} *</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Joe's Auto Repair" className="input !pl-11" />
                </div>
              </div>

              {/* Address autocomplete */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr('signup.businessAddress') || 'Business Address'} *</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={addrQuery} onChange={e => handleAddrQueryChange(e.target.value)}
                    placeholder="Search address..." className="input !pl-11 !pr-8" autoComplete="off" />
                  {addrSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                  {addrResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                      {addrResults.map(r => (
                        <button key={r.id} type="button" onClick={() => selectAddrResult(r)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                          {r.display}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {businessAddress && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 inline" /> {businessAddress}
                  </p>
                )}
              </div>

              {/* City / State / ZIP */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr('signup.city') || 'City'}</label>
                  <input type="text" value={businessCity} onChange={e => setBusinessCity(e.target.value)} placeholder="Miami" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr('signup.state') || 'State'}</label>
                  <select value={businessState} onChange={e => setBusinessState(e.target.value)} className="input">
                    {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr('signup.zipCode') || 'ZIP'} *</label>
                  <input type="text" value={businessZipCode} onChange={e => setBusinessZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="33101" className="input" maxLength={5} />
                </div>
              </div>

              {/* ── Legal / Compliance (optional) ── */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700">Legal & Compliance <span className="text-gray-400 font-normal">(optional — can be added later)</span></p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Legal / DBA Name</label>
                    <input type="text" value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Full legal business name" className="input text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">EIN (Federal Tax ID)</label>
                      <input type="text" value={ein} onChange={e => setEin(e.target.value.replace(/[^\d-]/g, '').slice(0, 10))} placeholder="XX-XXXXXXX" className="input text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Sunbiz Doc. Number</label>
                      <input type="text" value={sunbizDocumentNumber} onChange={e => setSunbizDocumentNumber(e.target.value)} placeholder="FL registration #" className="input text-sm" />
                    </div>
                  </div>

                  {/* BTR */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-600">Business Tax Receipt (BTR)</label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={btrNotApplicable} onChange={e => setBtrNotApplicable(e.target.checked)} className="rounded text-primary-500" />
                        <span className="text-xs text-gray-500">Not applicable</span>
                      </label>
                    </div>
                    {!btrNotApplicable && (
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" value={cityBtr} onChange={e => setCityBtr(e.target.value)} placeholder="City BTR #" className="input text-sm" />
                        <input type="text" value={countyBtr} onChange={e => setCountyBtr(e.target.value)} placeholder="County BTR #" className="input text-sm" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full py-3 text-base mt-2">{tr('common.next') || 'Next'}</button>
            </form>
          )}

          {/* ═══════ STEP 3: Services + Payout + Insurance ═══════ */}
          {step === 'services' && (
            <form onSubmit={handleStep3} className="space-y-5">
              <button type="button" onClick={() => { setError(''); setStep('business') }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
                <ArrowLeft className="w-4 h-4" /> {tr('common.back')}
              </button>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{tr('signup.servicesTitle') || 'Services & Setup'}</h2>
                <p className="text-sm text-gray-500">{tr('signup.servicesDesc') || 'Select services, payout method and confirm compliance.'}</p>
              </div>

              {/* Services */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{tr('signup.servicesOffered') || 'Services You Offer'} *</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICES.map(s => (
                    <button key={s.key} type="button" onClick={() => toggleChip(selectedServices, setSelectedServices, s.key)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selectedServices.has(s.key) ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {selectedServices.size > 0 && <p className="text-xs text-primary-500 mt-1.5 font-medium">{selectedServices.size} selected</p>}
              </div>

              {/* Vehicle types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{tr('signup.vehicleTypes') || 'Vehicle Types You Serve'}</label>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_TYPES.map(v => (
                    <button key={v.key} type="button" onClick={() => toggleChip(selectedVehicles, setSelectedVehicles, v.key)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selectedVehicles.has(v.key) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
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
                    <p className="text-sm font-medium text-gray-900">{tr('signup.sellsParts') || 'I also sell auto parts'}</p>
                    <p className="text-xs text-gray-400">{tr('signup.sellsPartsHint') || 'Customers can request parts from you'}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSellsParts(!sellsParts)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${sellsParts ? 'bg-primary-500' : 'bg-gray-300'}`}>
                  <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-1 transition-transform ${sellsParts ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* ── Payout Method ── */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700">Payout Method</p>
                  <span className="text-xs text-gray-400">(how you'll receive payments)</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(['MANUAL', 'ZELLE', 'BANK_TRANSFER'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setPayoutMethod(m)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold text-center transition-all ${payoutMethod === m ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {m === 'MANUAL' ? 'Manual / Check' : m === 'ZELLE' ? 'Zelle' : 'Bank Transfer'}
                    </button>
                  ))}
                </div>

                {payoutMethod === 'ZELLE' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Zelle email or phone number *</label>
                    <input type="text" value={zelleContact} onChange={e => setZelleContact(e.target.value)}
                      placeholder="your@email.com or +1305..." className="input text-sm" />
                  </div>
                )}

                {payoutMethod === 'BANK_TRANSFER' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setBankAccountType('CHECKING')}
                        className={`py-2 rounded-lg border text-sm font-medium transition-all ${bankAccountType === 'CHECKING' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500'}`}>
                        Checking
                      </button>
                      <button type="button" onClick={() => setBankAccountType('SAVINGS')}
                        className={`py-2 rounded-lg border text-sm font-medium transition-all ${bankAccountType === 'SAVINGS' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500'}`}>
                        Savings
                      </button>
                    </div>
                    <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Account number *" className="input text-sm" />
                    <input type="text" value={bankRoutingNumber} onChange={e => setBankRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      placeholder="Routing number (9 digits) *" className="input text-sm" maxLength={9} />
                  </div>
                )}

                {payoutMethod === 'MANUAL' && (
                  <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
                    TechTrust will contact you to arrange manual payouts. You can update this in your dashboard settings.
                  </p>
                )}
              </div>

              {/* ── Insurance Disclosure ── */}
              <div className="border-t border-gray-100 pt-4">
                <div className={`p-4 rounded-xl border-2 transition-all ${insuranceDisclosureAccepted ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="insurance-disclosure"
                      checked={insuranceDisclosureAccepted}
                      onChange={e => setInsuranceDisclosureAccepted(e.target.checked)}
                      className="mt-0.5 rounded text-primary-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="insurance-disclosure" className="text-sm text-gray-700 cursor-pointer">
                      I acknowledge that I am responsible for maintaining appropriate insurance coverage for my business operations.{' '}
                      <button type="button" onClick={() => setShowInsuranceModal(true)} className="text-primary-600 underline hover:text-primary-700 font-medium">
                        Read full disclosure
                      </button>
                    </label>
                  </div>
                </div>
              </div>

              {/* ── OTP Method ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tr('signup.otpMethodLabel') || 'Verification method'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['sms', 'email'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setOtpMethod(m)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${otpMethod === m ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      {m === 'sms' ? <Phone className={`w-5 h-5 ${otpMethod === m ? 'text-primary-600' : 'text-gray-400'}`} /> : <Mail className={`w-5 h-5 ${otpMethod === m ? 'text-primary-600' : 'text-gray-400'}`} />}
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${otpMethod === m ? 'text-primary-700' : 'text-gray-700'}`}>{m === 'sms' ? 'SMS' : 'Email'}</p>
                        <p className="text-xs text-gray-400">{m === 'sms' ? 'Code via text' : 'Code via email'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base mt-2 disabled:opacity-50">
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
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${activeOtpMethod === 'email' ? 'bg-blue-100' : 'bg-primary-100'}`}>
                  {activeOtpMethod === 'email' ? <Mail className="w-8 h-8 text-blue-600" /> : <Phone className="w-8 h-8 text-primary-600" />}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {activeOtpMethod === 'email' ? (tr('signup.verifyTitleEmail') || 'Verify Your Email') : (tr('signup.verifyTitle') || 'Verify Your Phone')}
                </h2>
                <p className="text-sm text-gray-500">
                  {activeOtpMethod === 'email' ? 'We sent a verification code to your email' : 'We sent a verification code to your phone'}
                </p>
              </div>

              {/* Switch method */}
              <div className="flex justify-center">
                <button type="button"
                  onClick={() => {
                    const newMethod = activeOtpMethod === 'sms' ? 'email' : 'sms'
                    setActiveOtpMethod(newMethod)
                    setOtpCode('')
                    setError('')
                    setResending(true)
                    api.post('/auth/resend-otp', { userId, method: newMethod }).catch(() => {})
                    setTimeout(() => setResending(false), 30000)
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium bg-primary-50 px-3 py-1.5 rounded-lg">
                  {activeOtpMethod === 'sms' ? '📧 Switch to Email verification' : '📱 Switch to SMS verification'}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 text-center">{tr('signup.enterCode') || 'Enter verification code'}</label>
                <input type="text" value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" className="input text-center text-2xl tracking-[0.5em] font-mono" maxLength={6} autoFocus />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base disabled:opacity-50">
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
                <button type="button" onClick={handleResendOtp} disabled={resending}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400">
                  {resending ? (tr('signup.codeSent') || 'Code sent! Wait 30s') : (tr('signup.resendCode') || "Didn't receive it? Resend")}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{tr('signup.successTitle') || 'Welcome to TechTrust!'}</h2>
              <p className="text-gray-500 mb-2 max-w-sm mx-auto">{tr('signup.successDesc') || 'Your provider account has been created. Our team will review your information shortly.'}</p>
              <p className="text-sm text-gray-400 mb-8">{tr('signup.successMobile') || 'Download the TechTrust app to manage your business on the go.'}</p>
              <button onClick={() => router.push('/login')} className="btn btn-primary w-full py-3 text-base">
                {tr('signup.goToLogin') || 'Go to Login'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Insurance Disclosure Modal */}
      {showInsuranceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-gray-900">Insurance Disclosure</h3>
              </div>
              <button onClick={() => setShowInsuranceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm text-gray-600">
              <p>As a service provider on TechTrust AutoSolutions, you acknowledge and agree to the following:</p>
              <ul className="space-y-3 list-none">
                {[
                  'You are an independent contractor and not an employee of TechTrust AutoSolutions.',
                  'You are solely responsible for maintaining adequate general liability insurance coverage for your business operations.',
                  'TechTrust AutoSolutions does not provide insurance coverage for your business, employees, or operations.',
                  'You must maintain all licenses, certifications, and permits required by applicable federal, state, and local laws.',
                  'Any damage, injury, or loss that occurs during service delivery is your responsibility as the service provider.',
                  'TechTrust AutoSolutions acts as a marketplace facilitator and collects and remits applicable sales tax on your behalf.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mt-4">
                By checking the box, you confirm that you have read and understood this disclosure and agree to comply with all applicable requirements.
              </p>
            </div>
            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => { setInsuranceDisclosureAccepted(true); setShowInsuranceModal(false) }}
                className="btn btn-primary w-full py-3">
                I Understand & Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right: Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-500 to-primary-700 p-12 items-center justify-center">
        <div className="max-w-md text-white">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6">
              <Wrench className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold mb-4">{tr('signup.heroTitle') || 'Join Our Network of Trusted Providers'}</h2>
            <p className="text-lg text-primary-100 leading-relaxed">{tr('signup.heroDesc') || 'Register your shop, receive service requests from customers in your area, and grow your business with TechTrust.'}</p>
          </div>
          <div className="space-y-4 mt-12">
            {[
              { title: tr('signup.benefit1Title') || 'Free to Register',       desc: tr('signup.benefit1Desc') || 'No monthly fees. Pay only when you earn.' },
              { title: tr('signup.benefit2Title') || 'Receive Local Requests',  desc: tr('signup.benefit2Desc') || 'Get matched with customers in your service area.' },
              { title: tr('signup.benefit3Title') || 'Web + Mobile Access',     desc: tr('signup.benefit3Desc') || 'Manage everything from your computer or phone.' },
            ].map((b, i) => (
              <div key={i} className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-5">
                <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{b.title}</p>
                  <p className="text-sm text-primary-100">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
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
  ArrowRight,
  CheckCircle,
  Package,
  Shield,
  Star,
  Users,
  DollarSign,
  Clock,
  Smartphone,
  ChevronDown,
} from 'lucide-react'
import { useI18n } from '@/i18n'
import LangSelector from '@/components/LangSelector'
import api from '@/services/api'
import { US_STATES, CITIES_BY_STATE } from '@/constants/location'

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

const flagSrc = (countryCode: string) => `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`

// ─── Service & Vehicle Options ───
const SERVICES = [
  // Maintenance
  { key: 'OIL_CHANGE',           label: 'Oil Change',              emoji: '🛢️' },
  { key: 'AIR_FILTER',           label: 'Air Filter Service',      emoji: '💨' },
  { key: 'FUEL_SYSTEM',          label: 'Fuel System',             emoji: '⛽' },
  { key: 'BRAKES',               label: 'Brakes',                  emoji: '🔧' },
  { key: 'COOLING_SYSTEM',       label: 'Cooling System',          emoji: '🌡️' },
  { key: 'TIRES',                label: 'Tires & Wheels',          emoji: '🔩' },
  { key: 'BELTS_HOSES',          label: 'Belts & Hoses',           emoji: '🔗' },
  // Repairs
  { key: 'AC_SERVICE',           label: 'A/C & Heating',           emoji: '❄️' },
  { key: 'STEERING',             label: 'Steering & Suspension',   emoji: '🚗' },
  { key: 'ELECTRICAL_BASIC',     label: 'Electrical System',       emoji: '⚡' },
  { key: 'EXHAUST',              label: 'Exhaust System',          emoji: '💨' },
  { key: 'DRIVETRAIN',           label: 'Drivetrain',              emoji: '⚙️' },
  { key: 'ENGINE',               label: 'Engine',                  emoji: '🔩' },
  { key: 'TRANSMISSION',         label: 'Transmission',            emoji: '🔄' },
  { key: 'BATTERY',              label: 'Battery',                 emoji: '🔋' },
  { key: 'GENERAL_REPAIR',       label: 'General Repair',          emoji: '🛠️' },
  // Packages & Fluids
  { key: 'FLUID_SERVICES',       label: 'Fluid Services',          emoji: '🧴' },
  { key: 'PREVENTIVE_PACKAGES',  label: 'Preventive Maintenance',  emoji: '📦' },
  // Inspection & Diagnostics
  { key: 'INSPECTION',           label: 'Inspection',              emoji: '🔍' },
  { key: 'DIAGNOSTICS',          label: 'Diagnostics',             emoji: '📊' },
  // Detailing & SOS
  { key: 'DETAILING',            label: 'Detailing',               emoji: '✨' },
  { key: 'TOWING',               label: 'Towing',                  emoji: '🚛' },
  { key: 'ROADSIDE_ASSIST',      label: 'Roadside Assist',         emoji: '🆘' },
  { key: 'LOCKOUT',              label: 'Lockout',                 emoji: '🔑' },
]

const VEHICLE_TYPES = [
  { key: 'CAR', label: 'Car / Sedan', emoji: '🚗' },
  { key: 'SUV', label: 'SUV', emoji: '🚙' },
  { key: 'TRUCK', label: 'Pickup Truck', emoji: '🛻' },
  { key: 'VAN', label: 'Van / Minivan', emoji: '🚐' },
  { key: 'HEAVY_TRUCK', label: 'Heavy Truck', emoji: '🚚' },
  { key: 'BUS', label: 'Bus / RV', emoji: '🚌' },
]

type Step = 'landing' | 'info' | 'business' | 'services' | 'otp' | 'success'

export default function RegisterPage() {
  const router = useRouter()
  const { translate, language, setLanguage } = useI18n()
  const tr = translate

  const [step, setStep] = useState<Step>('landing')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Personal info
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedDialCountry, setSelectedDialCountry] = useState(DIAL_COUNTRIES[0])
  const [showDialDropdown, setShowDialDropdown] = useState(false)
  const [zipLookupLoading, setZipLookupLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Step 2: Business info — address autocomplete
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

  const [businessName, setBusinessName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [ein, setEin] = useState('')
  const [sunbizDocumentNumber, setSunbizDocumentNumber] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [businessState, setBusinessState] = useState('FL')
  const [businessZipCode, setBusinessZipCode] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('MANUAL')
  const [zelleContact, setZelleContact] = useState('')
  const [bankTransferLabel, setBankTransferLabel] = useState('')
  const [bankAccountType, setBankAccountType] = useState<'CHECKING' | 'SAVINGS'>('CHECKING')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankRoutingNumber, setBankRoutingNumber] = useState('')
  const [cityBusinessTaxReceiptNumber, setCityBusinessTaxReceiptNumber] = useState('')
  const [countyBusinessTaxReceiptNumber, setCountyBusinessTaxReceiptNumber] = useState('')
  const [insuranceDisclosureAccepted, setInsuranceDisclosureAccepted] = useState(false)
  const [showInsuranceModal, setShowInsuranceModal] = useState(false)
  const [marketplaceFacilitatorTaxAcknowledged, setMarketplaceFacilitatorTaxAcknowledged] = useState(true)

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
  const [showLoginLink, setShowLoginLink] = useState(false)
  const [otpMethod, setOtpMethod] = useState<'sms' | 'email'>('sms') // User chooses SMS or Email
  const [activeOtpMethod, setActiveOtpMethod] = useState<'sms' | 'email'>('sms') // Actual method used

  // ZIP → city/state auto-fill
  useEffect(() => {
    if (businessZipCode.length !== 5) return
    let cancelled = false
    setZipLookupLoading(true)
    fetch(`https://api.zippopotam.us/us/${businessZipCode}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.places?.[0]) return
        const place = data.places[0]
        if (!businessCity) setBusinessCity(place['place name'] || '')
        if (businessState === 'FL') setBusinessState(place['state abbreviation'] || 'FL')
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setZipLookupLoading(false) })
    return () => { cancelled = true }
  }, [businessZipCode])

  // ─── Site URL for OG ───
  const siteUrl = 'https://provider.techtrustautosolutions.com'

  // ─── Validation ───
  const validateStep1 = () => {
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      setError(tr('register.fullNameRequired') || 'Please enter your full name (first and last)')
      return false
    }
    if (!email.trim() || !email.includes('@')) {
      setError(tr('register.emailRequired') || 'Please enter a valid email')
      return false
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 6) {
      setError(tr('register.phoneRequired') || 'Please enter a valid phone number')
      return false
    }
    if (password.length < 8) {
      setError(tr('register.passwordMin') || 'Password must be at least 8 characters')
      return false
    }
    if (password !== confirmPassword) {
      setError(tr('register.passwordMismatch') || 'Passwords do not match')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!businessName.trim()) {
      setError(tr('register.businessNameRequired') || 'Please enter your business name')
      return false
    }
    if (!businessAddress.trim()) {
      setError(tr('register.addressRequired') || 'Please enter your business address')
      return false
    }
    if (!businessCity.trim()) {
      setError('Please enter your city')
      return false
    }
    if (!businessZipCode.trim() || businessZipCode.length < 5) {
      setError(tr('register.zipRequired') || 'Please enter a valid ZIP code')
      return false
    }
    return true
  }

  const validateStep3 = () => {
    if (selectedServices.size === 0) {
      setError(tr('register.servicesRequired') || 'Please select at least one service')
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
      const digits = phone.replace(/\D/g, '')
      const normalizedPhone = `${selectedDialCountry.dial}${digits}`

      const response = await api.post('/auth/signup', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
        password,
        language: language.toUpperCase(),
        role: 'PROVIDER',
        businessName: businessName.trim(),
        legalName: legalName.trim() || undefined,
        ein: ein.trim() || undefined,
        sunbizDocumentNumber: sunbizDocumentNumber.trim() || undefined,
        businessAddress: businessAddress.trim(),
        businessCity: businessCity.trim() || undefined,
        businessState: businessState,
        businessZipCode: businessZipCode.trim(),
        servicesOffered: Array.from(selectedServices),
        vehicleTypesServed: Array.from(selectedVehicles),
        sellsParts,
        payoutMethod,
        zelleEmail: zelleContact.includes('@') ? zelleContact.trim() : undefined,
        zellePhone: zelleContact && !zelleContact.includes('@') ? zelleContact.trim() : undefined,
        bankTransferLabel: bankTransferLabel.trim() || undefined,
        bankAccountType: payoutMethod === 'BANK_TRANSFER' ? bankAccountType : undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankRoutingNumber: bankRoutingNumber.trim() || undefined,
        cityBusinessTaxReceiptNumber: cityBusinessTaxReceiptNumber.trim() || undefined,
        countyBusinessTaxReceiptNumber: countyBusinessTaxReceiptNumber.trim() || undefined,
        insuranceDisclosureAccepted,
        marketplaceFacilitatorTaxAcknowledged,
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
      setError(tr('register.otpRequired') || 'Please enter the verification code')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/verify-otp', { userId, otpCode: otpCode.trim(), method: activeOtpMethod })
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

  const toggleChip = (set: Set<string>, setFn: (s: Set<string>) => void, key: string) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setFn(next)
  }

  // ─── Step indicators ───
  const formSteps = [
    { id: 'info', label: tr('register.stepInfo') || 'Your Info' },
    { id: 'business', label: tr('register.stepBusiness') || 'Business' },
    { id: 'services', label: tr('register.stepServices') || 'Services' },
    { id: 'otp', label: tr('register.stepVerify') || 'Verify' },
  ]
  const stepIndex = formSteps.findIndex(s => s.id === step)

  // ─── SEO Meta ───
  const pageTitle = tr('register.metaTitle') || 'Register Your Shop | TechTrust Auto Solutions'
  const pageDescription = tr('register.metaDescription') || 'Join the TechTrust network of trusted auto repair providers. Free registration, receive local service requests, and grow your business. Sign up in minutes!'

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${siteUrl}/register`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={`${siteUrl}/og-register.png`} />
        <meta property="og:site_name" content="TechTrust Auto Solutions" />
        <meta property="og:locale" content={language === 'pt' ? 'pt_BR' : language === 'es' ? 'es_US' : 'en_US'} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={`${siteUrl}/register`} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={`${siteUrl}/og-register.png`} />

        {/* Extra SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${siteUrl}/register`} />
        <meta name="theme-color" content="#2B5EA7" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ═══════════════════════════════════════════════════════ */}
        {/* LANDING SECTION — shown before form starts            */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 'landing' && (
          <div className="min-h-screen">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <Wrench className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-gray-900">TechTrust</span>
                    <span className="text-xs text-gray-400 block -mt-0.5">Auto Solutions</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                    <LangSelector language={language} setLanguage={setLanguage} />
                  <Link href="/login" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                    {tr('auth.signIn') || 'Sign In'}
                  </Link>
                </div>
              </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
              
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className="text-white">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-sm font-medium">
                        {tr('register.heroTag') || 'Free Registration — No Monthly Fees'}
                      </span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-tight mb-6">
                      {tr('register.heroTitle') || 'Grow Your Auto Repair Business with TechTrust'}
                    </h1>
                    <p className="text-lg lg:text-xl text-primary-100 leading-relaxed mb-8 max-w-xl">
                      {tr('register.heroSubtitle') || 'Join our network of trusted providers, receive service requests from local customers, send competitive quotes, and get paid — all from one platform.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => setStep('info')}
                        className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 font-bold px-8 py-4 rounded-xl text-lg hover:bg-gray-50 transition-all shadow-xl shadow-black/10 hover:shadow-2xl hover:-translate-y-0.5"
                      >
                        {tr('register.ctaButton') || 'Register Your Shop Now'}
                        <ArrowRight className="w-5 h-5" />
                      </button>
                      <a
                        href="#how-it-works"
                        className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white font-medium px-6 py-4 rounded-xl text-lg hover:bg-white/20 transition-all border border-white/20"
                      >
                        {tr('register.learnMore') || 'Learn How It Works'}
                        <ChevronDown className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                  
                  {/* Stats Cards */}
                  <div className="hidden lg:grid grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                      <DollarSign className="w-8 h-8 text-green-300 mb-3" />
                      <p className="text-3xl font-bold text-white">$0</p>
                      <p className="text-sm text-primary-200">
                        {tr('register.statCost') || 'Registration Cost'}
                      </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                      <Users className="w-8 h-8 text-blue-300 mb-3" />
                      <p className="text-3xl font-bold text-white">500+</p>
                      <p className="text-sm text-primary-200">
                        {tr('register.statProviders') || 'Active Providers'}
                      </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                      <Star className="w-8 h-8 text-yellow-300 mb-3" />
                      <p className="text-3xl font-bold text-white">4.8</p>
                      <p className="text-sm text-primary-200">
                        {tr('register.statRating') || 'Average Rating'}
                      </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                      <Clock className="w-8 h-8 text-purple-300 mb-3" />
                      <p className="text-3xl font-bold text-white">3 min</p>
                      <p className="text-sm text-primary-200">
                        {tr('register.statTime') || 'To Register'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-20 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                    {tr('register.howItWorksTitle') || 'How It Works'}
                  </h2>
                  <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                    {tr('register.howItWorksDesc') || 'Get started in 3 simple steps and begin receiving service requests today'}
                  </p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="text-center group">
                    <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-100 transition-colors group-hover:scale-110 transform duration-300">
                      <User className="w-10 h-10 text-primary-500" />
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-primary-500 bg-primary-50 rounded-full px-3 py-1 mb-3">
                      {tr('register.step') || 'STEP'} 1
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {tr('register.step1Title') || 'Create Your Account'}
                    </h3>
                    <p className="text-gray-500">
                      {tr('register.step1Desc') || 'Fill in your personal and business information. It takes less than 3 minutes.'}
                    </p>
                  </div>
                  <div className="text-center group">
                    <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-6 group-hover:bg-green-100 transition-colors group-hover:scale-110 transform duration-300">
                      <Wrench className="w-10 h-10 text-green-500" />
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 rounded-full px-3 py-1 mb-3">
                      {tr('register.step') || 'STEP'} 2
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {tr('register.step2Title') || 'Set Up Your Services'}
                    </h3>
                    <p className="text-gray-500">
                      {tr('register.step2Desc') || 'Choose which services you offer and the vehicle types you work with.'}
                    </p>
                  </div>
                  <div className="text-center group">
                    <div className="w-20 h-20 rounded-2xl bg-yellow-50 flex items-center justify-center mx-auto mb-6 group-hover:bg-yellow-100 transition-colors group-hover:scale-110 transform duration-300">
                      <DollarSign className="w-10 h-10 text-yellow-500" />
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-yellow-600 bg-yellow-50 rounded-full px-3 py-1 mb-3">
                      {tr('register.step') || 'STEP'} 3
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {tr('register.step3Title') || 'Start Earning'}
                    </h3>
                    <p className="text-gray-500">
                      {tr('register.step3Desc') || 'Receive requests, send quotes, and grow your customer base.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Benefits */}
            <section className="py-20 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                    {tr('register.benefitsTitle') || 'Why Providers Love TechTrust'}
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { icon: DollarSign, color: 'green', title: tr('register.benefit1Title') || 'No Monthly Fees', desc: tr('register.benefit1Desc') || 'Registration is completely free. You only pay a small commission when you earn.' },
                    { icon: MapPin, color: 'blue', title: tr('register.benefit2Title') || 'Local Customers', desc: tr('register.benefit2Desc') || 'Get matched with customers in your area looking for your exact services.' },
                    { icon: Smartphone, color: 'purple', title: tr('register.benefit3Title') || 'Web + Mobile App', desc: tr('register.benefit3Desc') || 'Manage your business from anywhere — computer, tablet, or phone.' },
                    { icon: Shield, color: 'yellow', title: tr('register.benefit4Title') || 'Verified Platform', desc: tr('register.benefit4Desc') || 'All customers are verified. Secure payments and dispute resolution included.' },
                    { icon: Star, color: 'orange', title: tr('register.benefit5Title') || 'Build Your Reputation', desc: tr('register.benefit5Desc') || 'Earn reviews and ratings that help you attract more customers over time.' },
                    { icon: Clock, color: 'teal', title: tr('register.benefit6Title') || 'Quick Setup', desc: tr('register.benefit6Desc') || 'Registration takes less than 3 minutes. Start receiving requests the same day.' },
                  ].map((b, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all hover:-translate-y-1 duration-300">
                      <div className={`w-12 h-12 rounded-xl bg-${b.color === 'green' ? 'green' : b.color === 'blue' ? 'blue' : b.color === 'purple' ? 'purple' : b.color === 'yellow' ? 'yellow' : b.color === 'orange' ? 'orange' : 'teal'}-50 flex items-center justify-center mb-4`}>
                        <b.icon className={`w-6 h-6 text-${b.color === 'green' ? 'green' : b.color === 'blue' ? 'blue' : b.color === 'purple' ? 'purple' : b.color === 'yellow' ? 'yellow' : b.color === 'orange' ? 'orange' : 'teal'}-500`} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{b.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
              <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                  {tr('register.ctaTitle') || 'Ready to Grow Your Business?'}
                </h2>
                <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
                  {tr('register.ctaDesc') || 'Join hundreds of auto repair shops already growing with TechTrust. Free registration, no commitment.'}
                </p>
                <button
                  onClick={() => { setStep('info'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 font-bold px-10 py-5 rounded-xl text-lg hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                >
                  {tr('register.ctaButton') || 'Register Your Shop Now'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-lg font-bold text-white">TechTrust</span>
                      <span className="text-xs text-gray-400 block">Auto Solutions LLC</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-400">
                    <a href="mailto:support@techtrustautosolutions.com" className="hover:text-white transition-colors">
                      support@techtrustautosolutions.com
                    </a>
                  </div>
                  <p className="text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} TechTrust Auto Solutions LLC. All rights reserved.
                  </p>
                </div>
              </div>
            </footer>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* REGISTRATION FORM — multi-step wizard                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step !== 'landing' && (
          <div className="min-h-screen flex">
            {/* Left: Form */}
            <div className="flex-1 flex items-start justify-center p-6 sm:p-8 overflow-y-auto">
              <div className="w-full max-w-lg py-8">
                {/* Logo + language */}
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                      <Wrench className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">{tr('brand.name')}</h1>
                      <p className="text-sm text-gray-500">{tr('register.formTitle') || 'Provider Registration'}</p>
                    </div>
                  </div>
                  <LangSelector language={language} setLanguage={setLanguage} />
                </div>

                {/* Step Progress (hide for success) */}
                {step !== 'success' && (
                  <div className="flex items-center gap-2 mb-8">
                    {formSteps.map((s, i) => (
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
                        {i < formSteps.length - 1 && (
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
                      <button
                        type="button"
                        onClick={() => { setError(''); setStep('landing') }}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
                      >
                        <ArrowLeft className="w-4 h-4" /> {tr('common.back') || 'Back'}
                      </button>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">
                        {tr('register.personalInfo') || 'Your Information'}
                      </h2>
                      <p className="text-sm text-gray-500 mb-4">
                        {tr('register.personalInfoDesc') || 'Create your account to get started'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {tr('register.fullName') || 'Full Name'} *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="input !pl-11" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {tr('auth.email')} *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="input !pl-11" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {tr('register.phone') || 'Phone Number'} *
                      </label>
                      <div className="flex gap-2">
                        {/* Country flag / dial-code picker */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowDialDropdown(!showDialDropdown)}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 text-sm font-medium text-gray-700 whitespace-nowrap"
                          >
                            <img src={flagSrc(selectedDialCountry.code)} alt={selectedDialCountry.code} className="h-4 w-6 rounded-[2px] object-cover" />
                            <span className="text-gray-600">{selectedDialCountry.dial}</span>
                            <ChevronDown className="w-3 h-3 text-gray-400" />
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
                                  <img src={flagSrc(c.code)} alt={c.code} className="h-4 w-6 rounded-[2px] object-cover" />
                                  <span className="flex-1 text-left">{c.name}</span>
                                  <span className="text-gray-400">{c.dial}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(305) 555-0123" className="input !pl-9" />
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
                          className="input !pl-11 !pr-12"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{tr('register.passwordHint') || 'Minimum 8 characters'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {tr('register.confirmPassword') || 'Confirm Password'} *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input !pl-11" />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-full py-3 text-base mt-2">
                      {tr('common.next') || 'Next'} <ArrowRight className="w-4 h-4 ml-1" />
                    </button>

                    <p className="text-center text-sm text-gray-500 mt-4">
                      {tr('register.alreadyHaveAccount') || 'Already have an account?'}{' '}
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
                        {tr('register.businessInfo') || 'Business Information'}
                      </h2>
                      <p className="text-sm text-gray-500 mb-4">
                        {tr('register.businessInfoDesc') || 'Tell us about your auto repair shop'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {tr('register.businessName') || 'Business Name'} *
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Joe's Auto Repair" className="input !pl-11" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {tr('register.businessAddress') || 'Business Address'} *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={addrQuery}
                          onChange={(e) => handleAddrQueryChange(e.target.value)}
                          placeholder="Search address..."
                          className="input !pl-11 !pr-8"
                          autoComplete="off"
                        />
                        {addrSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                        )}
                        {addrResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                            {addrResults.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => selectAddrResult(r)}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                              >
                                {r.display}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {businessAddress && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {businessAddress}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {tr('register.city') || 'City'}
                        </label>
                        {CITIES_BY_STATE[businessState]?.length ? (
                          <select
                            value={businessCity}
                            onChange={(e) => setBusinessCity(e.target.value)}
                            className="input"
                          >
                            <option value="">Select city</option>
                            {CITIES_BY_STATE[businessState].map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        ) : (
                          <input type="text" value={businessCity} onChange={(e) => setBusinessCity(e.target.value)} placeholder="Enter city" className="input" />
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {tr('register.state') || 'State'}
                        </label>
                        <select
                          value={businessState}
                          onChange={(e) => { setBusinessState(e.target.value); setBusinessCity('') }}
                          className="input"
                        >
                          {US_STATES.map(st => (
                            <option key={st.code} value={st.code}>{st.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {tr('register.zipCode') || 'ZIP Code'} *
                        </label>
                        <div className="relative">
                          <input type="text" value={businessZipCode} onChange={(e) => setBusinessZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="33101" className="input !pr-8" maxLength={5} />
                          {zipLookupLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Payout and Florida tax setup</p>
                          <p className="text-xs text-gray-500">Optional now. You can finish or change this after signup.</p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-white/70 bg-white/70 p-3 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">Business identity verification</p>
                          <p className="text-[11px] text-gray-500">
                            Optional now. We manually verify against official Sunbiz, FDACS, and local tax records.
                          </p>
                        </div>
                        <input
                          type="text"
                          value={legalName}
                          onChange={(e) => setLegalName(e.target.value)}
                          placeholder="Legal business name"
                          className="input"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={ein}
                            onChange={(e) => setEin(e.target.value)}
                            placeholder="EIN / FEI"
                            className="input"
                          />
                          <input
                            type="text"
                            value={sunbizDocumentNumber}
                            onChange={(e) => setSunbizDocumentNumber(e.target.value)}
                            placeholder="Sunbiz document #"
                            className="input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Preferred payout</label>
                        <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} className="input">
                          <option value="MANUAL">Set up later / manual payout</option>
                          <option value="ZELLE">Zelle</option>
                          <option value="BANK_TRANSFER">Bank transfer</option>
                          <option value="CHECK">Check</option>
                        </select>
                      </div>

                      {payoutMethod === 'MANUAL' && (
                        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <span className="text-yellow-600 text-sm flex-shrink-0">⏱</span>
                          <p className="text-xs text-yellow-800">You'll need to add a payout method later in Settings to receive payments. Without it, earnings will be held until a method is configured.</p>
                        </div>
                      )}

                      {payoutMethod === 'ZELLE' && (
                        <input
                          type="text"
                          value={zelleContact}
                          onChange={(e) => setZelleContact(e.target.value)}
                          placeholder="Zelle email or phone"
                          className="input"
                        />
                      )}

                      {payoutMethod === 'BANK_TRANSFER' && (
                        <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <input
                            type="text"
                            value={bankTransferLabel}
                            onChange={(e) => setBankTransferLabel(e.target.value)}
                            placeholder="Bank name (e.g. Chase, Bank of America)"
                            className="input"
                          />
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Account type</label>
                            <div className="flex gap-2">
                              {(['CHECKING', 'SAVINGS'] as const).map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setBankAccountType(t)}
                                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                    bankAccountType === t
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                  }`}
                                >
                                  {t.charAt(0) + t.slice(1).toLowerCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={bankAccountNumber}
                            onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="Account number"
                            className="input"
                            maxLength={17}
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={bankRoutingNumber}
                            onChange={(e) => setBankRoutingNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="Routing number (9 digits)"
                            className="input"
                            maxLength={9}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={cityBusinessTaxReceiptNumber}
                          onChange={(e) => setCityBusinessTaxReceiptNumber(e.target.value)}
                          placeholder="City business tax receipt #"
                          className="input"
                        />
                        <input
                          type="text"
                          value={countyBusinessTaxReceiptNumber}
                          onChange={(e) => setCountyBusinessTaxReceiptNumber(e.target.value)}
                          placeholder="County business tax receipt #"
                          className="input"
                        />
                      </div>

                      <label className="flex items-start gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={marketplaceFacilitatorTaxAcknowledged}
                          onChange={(e) => setMarketplaceFacilitatorTaxAcknowledged(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>TechTrust may collect and record applicable Florida marketplace sales tax and prepare tax reports for remittance.</span>
                      </label>
                    </div>

                    {/* Insurance disclosure toggle */}
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50">
                      <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">🛡 Insurance disclosure</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {insuranceDisclosureAccepted
                            ? 'Disclosure accepted. Customers will see you operate without TechTrust insurance coverage.'
                            : 'Toggle if you do not carry insurance. Leave off if you have coverage (upload certificate later in Settings → Compliance).'}
                        </p>
                        {insuranceDisclosureAccepted && (
                          <div className="mt-2 flex items-start gap-2 bg-amber-100 border border-amber-200 rounded-lg p-2.5">
                            <span className="text-amber-600 text-sm flex-shrink-0">⚠</span>
                            <p className="text-xs text-amber-800">You have accepted the no-insurance disclosure. Customers will see a notice before booking your services. You can add your insurance certificate anytime in Settings → Compliance to remove this notice.</p>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!insuranceDisclosureAccepted) setShowInsuranceModal(true)
                          else setInsuranceDisclosureAccepted(false)
                        }}
                        className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${insuranceDisclosureAccepted ? 'bg-amber-500' : 'bg-gray-300'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-1 transition-transform ${insuranceDisclosureAccepted ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <button type="submit" className="btn btn-primary w-full py-3 text-base mt-2">
                      {tr('common.next') || 'Next'} <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </form>
                )}

                {/* Insurance Disclosure Modal */}
                {showInsuranceModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                      <div className="flex flex-col items-center mb-5">
                        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                          <Shield className="w-7 h-7 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 text-center">Insurance Disclosure</h3>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">By accepting this disclosure, you confirm that:</p>
                      <div className="space-y-3 mb-5">
                        {[
                          'You do not carry general liability insurance for the services you offer through TechTrust.',
                          'Customers will be clearly notified before booking that TechTrust does not provide insurance coverage for your work.',
                          'You accept full responsibility for any damages or liability arising from your services.',
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <span className="text-amber-500 mt-0.5 text-sm flex-shrink-0">⚠</span>
                            <p className="text-sm text-gray-600">{item}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 italic mb-5">Providers with valid insurance can upload their certificate later in Settings → Compliance section.</p>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setShowInsuranceModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button type="button" onClick={() => { setInsuranceDisclosureAccepted(true); setShowInsuranceModal(false) }} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600">I Understand</button>
                      </div>
                    </div>
                  </div>
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
                        {tr('register.servicesTitle') || 'Your Services'}
                      </h2>
                      <p className="text-sm text-gray-500 mb-1">
                        {tr('register.servicesDesc') || 'Select the services you offer. You can change these later.'}
                      </p>
                    </div>

                    {/* Services chips */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                      <label className="block text-sm font-semibold text-blue-800">
                        🔧 {tr('register.servicesOffered') || 'Services You Offer'} *
                      </label>
                      <div className="flex items-start gap-2 bg-white border border-blue-200 rounded-lg p-3">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        <p className="text-xs text-blue-800">Customers can only find you for the services you select here. You will only receive requests for these services.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {SERVICES.map(s => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => toggleChip(selectedServices, setSelectedServices, s.key)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              selectedServices.has(s.key)
                                ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/20'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                            }`}
                          >
                            <span className="mr-1">{s.emoji}</span> {s.label}
                          </button>
                        ))}
                      </div>
                      {selectedServices.size > 0 && (
                        <p className="text-xs text-primary-600 font-medium">
                          {selectedServices.size} {tr('register.selected') || 'selected'}
                        </p>
                      )}
                    </div>

                    {/* Vehicle types */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                      <label className="block text-sm font-semibold text-blue-800">
                        🚗 {tr('register.vehicleTypes') || 'Vehicle Types You Serve'}
                      </label>
                      <div className="flex items-start gap-2 bg-white border border-blue-200 rounded-lg p-3">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        <p className="text-xs text-blue-800">Customer requests are matched by vehicle type AND service. You will only receive requests that match both your selections here.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {VEHICLE_TYPES.map(v => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => toggleChip(selectedVehicles, setSelectedVehicles, v.key)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              selectedVehicles.has(v.key)
                                ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <span className="mr-1">{v.emoji}</span> {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sells parts toggle */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              📦 {tr('register.sellsParts') || 'I also sell auto parts'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {tr('register.sellsPartsHint') || 'Enable if you sell parts directly to customers'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSellsParts(!sellsParts)}
                          className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${
                            sellsParts ? 'bg-primary-500' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-1 transition-transform ${
                            sellsParts ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                      {sellsParts && (
                        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                          <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          <p className="text-xs text-green-800">Parts selling enabled. TechTrust collects Florida sales tax on parts transactions and remits directly to the Florida Department of Revenue on your behalf — no extra steps needed. Add your City and County Business Tax Receipt (BTR) numbers in the tax section below to complete your profile.</p>
                        </div>
                      )}
                    </div>

                    {/* OTP Method Choice */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {tr('register.otpMethodLabel') || 'How would you like to verify your account?'}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setOtpMethod('sms')}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                            otpMethod === 'sms'
                              ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-500/10'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            otpMethod === 'sms' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <Phone className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-semibold ${
                              otpMethod === 'sms' ? 'text-primary-700' : 'text-gray-700'
                            }`}>SMS</p>
                            <p className="text-xs text-gray-400">
                              {tr('register.otpViaSms') || 'Code via text message'}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpMethod('email')}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                            otpMethod === 'email'
                              ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-500/10'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            otpMethod === 'email' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <Mail className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-semibold ${
                              otpMethod === 'email' ? 'text-primary-700' : 'text-gray-700'
                            }`}>Email</p>
                            <p className="text-xs text-gray-400">
                              {tr('register.otpViaEmail') || 'Code via email'}
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary w-full py-3 text-base mt-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {tr('register.creating') || 'Creating account...'}
                        </span>
                      ) : (
                        tr('register.createAccount') || 'Create Account'
                      )}
                    </button>
                  </form>
                )}

                {/* ═══════ STEP 4: OTP Verification ═══════ */}
                {step === 'otp' && (
                  <form onSubmit={handleVerifyOtp} className="space-y-5">
                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        activeOtpMethod === 'email' ? 'bg-blue-100' : 'bg-primary-100'
                      }`}>
                        {activeOtpMethod === 'email'
                          ? <Mail className="w-8 h-8 text-blue-600" />
                          : <Phone className="w-8 h-8 text-primary-600" />
                        }
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {activeOtpMethod === 'email'
                          ? (tr('register.verifyTitleEmail') || 'Verify Your Email')
                          : (tr('register.verifyTitle') || 'Verify Your Phone')
                        }
                      </h2>
                      <p className="text-sm text-gray-500">
                        {activeOtpMethod === 'email'
                          ? (tr('register.verifyDescEmail') || 'We sent a verification code to your email address')
                          : (tr('register.verifyDesc') || 'We sent a verification code to your phone number')
                        }
                      </p>
                      <p className="text-sm font-semibold text-gray-700 mt-1">
                        {activeOtpMethod === 'email' ? email : `+1 ${phone}`}
                      </p>
                    </div>

                    {/* Switch OTP method */}
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newMethod = activeOtpMethod === 'sms' ? 'email' : 'sms'
                          setActiveOtpMethod(newMethod)
                          setOtpCode('')
                          setError('')
                          // Resend OTP via new method
                          setResending(true)
                          api.post('/auth/resend-otp', { userId, method: newMethod }).catch(() => {})
                          setTimeout(() => setResending(false), 30000)
                        }}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium bg-primary-50 px-3 py-1.5 rounded-lg"
                      >
                        {activeOtpMethod === 'sms'
                          ? (tr('register.switchToEmail') || '📧 Switch to Email verification')
                          : (tr('register.switchToSms') || '📱 Switch to SMS verification')
                        }
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 text-center">
                        {tr('register.enterCode') || 'Enter verification code'}
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

                    <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base disabled:opacity-50">
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {tr('register.verifying') || 'Verifying...'}
                        </span>
                      ) : (tr('register.verify') || 'Verify & Continue')}
                    </button>

                    <div className="text-center">
                      <button type="button" onClick={handleResendOtp} disabled={resending} className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400">
                        {resending
                          ? (tr('register.codeSent') || 'Code sent! Wait 30s to resend')
                          : (tr('register.resendCode') || "Didn't receive the code? Resend")}
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
                      {tr('register.successTitle') || 'Welcome to TechTrust!'}
                    </h2>
                    <p className="text-gray-500 mb-2 max-w-sm mx-auto">
                      {tr('register.successDesc') || 'Your account has been created successfully. You can now access your dashboard and start managing your services.'}
                    </p>
                    <p className="text-sm text-gray-400 mb-8">
                      {tr('register.successMobile') || 'You can also download the TechTrust app to manage your business on the go.'}
                    </p>
                    <div className="space-y-3">
                      <button onClick={() => router.push('/login')} className="btn btn-primary w-full py-3 text-base">
                        {tr('register.goToLogin') || 'Go to Login'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Branding panel (desktop) */}
            <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-500 to-primary-700 p-12 items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
              <div className="relative max-w-md text-white">
                <div className="mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6">
                    <Wrench className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">
                    {tr('register.sideTitle') || 'Join Our Network of Trusted Providers'}
                  </h2>
                  <p className="text-lg text-primary-100 leading-relaxed">
                    {tr('register.sideDesc') || 'Register your shop, receive service requests from customers in your area, and grow your business with TechTrust.'}
                  </p>
                </div>
                <div className="space-y-4 mt-12">
                  <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-5">
                    <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{tr('register.sideBenefit1') || 'Free to Register'}</p>
                      <p className="text-sm text-primary-100">{tr('register.sideBenefit1Desc') || 'No monthly fees. Pay only when you earn.'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-5">
                    <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{tr('register.sideBenefit2') || 'Receive Local Requests'}</p>
                      <p className="text-sm text-primary-100">{tr('register.sideBenefit2Desc') || 'Get matched with customers in your service area.'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-5">
                    <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{tr('register.sideBenefit3') || 'Web + Mobile Access'}</p>
                      <p className="text-sm text-primary-100">{tr('register.sideBenefit3Desc') || 'Manage everything from your computer or phone.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

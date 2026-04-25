'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import {
  Package,
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
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Truck,
  ShieldCheck,
} from 'lucide-react'
import { useI18n, languages, Language } from '@/i18n'
import api from '@/services/api'
import { US_STATES, CITIES_BY_STATE } from '@/constants/location'

const PARTS_CATEGORIES = [
  { key: 'ENGINE_PARTS', label: 'Engine Parts', emoji: '⚙️' },
  { key: 'BRAKES', label: 'Brakes', emoji: '🔧' },
  { key: 'SUSPENSION', label: 'Suspension', emoji: '🔗' },
  { key: 'ELECTRICAL', label: 'Electrical', emoji: '⚡' },
  { key: 'FILTERS', label: 'Filters', emoji: '🔩' },
  { key: 'BELTS_HOSES', label: 'Belts & Hoses', emoji: '🔄' },
  { key: 'COOLING', label: 'Cooling System', emoji: '❄️' },
  { key: 'EXHAUST', label: 'Exhaust', emoji: '💨' },
  { key: 'BODY_PARTS', label: 'Body Parts', emoji: '🚗' },
  { key: 'LIGHTING', label: 'Lighting', emoji: '💡' },
  { key: 'OILS_FLUIDS', label: 'Oils & Fluids', emoji: '🛢️' },
  { key: 'TIRES_WHEELS', label: 'Tires & Wheels', emoji: '🔘' },
  { key: 'BATTERIES', label: 'Batteries', emoji: '🔋' },
  { key: 'ACCESSORIES', label: 'Accessories', emoji: '🎨' },
  { key: 'TOOLS', label: 'Tools & Equipment', emoji: '🔨' },
]

const BRAND_TYPES = [
  { key: 'OEM', label: 'OEM (Original)', desc: 'Factory manufacturer parts' },
  { key: 'AFTERMARKET', label: 'Aftermarket', desc: 'Third-party replacements' },
  { key: 'REMANUFACTURED', label: 'Remanufactured', desc: 'Rebuilt to OEM specs' },
  { key: 'USED', label: 'Used / Salvage', desc: 'Pre-owned parts' },
]

type Step = 'landing' | 'info' | 'business' | 'catalog' | 'plan' | 'otp' | 'success'

export default function RegisterAutoPartsPage() {
  const router = useRouter()
  const { translate, language, setLanguage } = useI18n()

  const [step, setStep] = useState<Step>('landing')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Personal info
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Business info
  const [businessName, setBusinessName] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [businessState, setBusinessState] = useState('FL')
  const [businessZipCode, setBusinessZipCode] = useState('')
  const [hasPhysicalStore, setHasPhysicalStore] = useState(true)
  const [offersDelivery, setOffersDelivery] = useState(false)

  // Catalog
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedBrandTypes, setSelectedBrandTypes] = useState<Set<string>>(new Set())

  // Plan
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | 'pro_plus'>('basic')

  // OTP
  const [userId, setUserId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpMethod, setOtpMethod] = useState<'sms' | 'email'>('sms')
  const [resending, setResending] = useState(false)

  function formatPhone(val: string) {
    const d = val.replace(/\D/g, '').slice(0, 10)
    if (d.length <= 3) return d
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }

  function phoneToE164(val: string) {
    const d = val.replace(/\D/g, '')
    return d.length === 10 ? `+1${d}` : ''
  }

  function toggleCategory(key: string) {
    setSelectedCategories(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  function toggleBrandType(key: string) {
    setSelectedBrandTypes(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  async function handleSubmitRegistration() {
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/signup', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phoneToE164(phone),
        password,
        role: 'PROVIDER',
        accountType: 'BUSINESS',
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        businessCity: businessCity.trim(),
        businessState,
        businessZipCode: businessZipCode.trim(),
        sellsParts: true,
        marketplaceType: 'AUTO_PARTS',
        partsCategories: Array.from(selectedCategories),
        brandTypes: Array.from(selectedBrandTypes),
        hasPhysicalStore,
        offersDelivery,
        selectedListingPlan: selectedPlan,
        preferredOtpMethod: otpMethod,
        language: language.toUpperCase(),
      })

      const data = res.data?.data || res.data
      setUserId(data.userId)
      setStep('otp')
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP() {
    if (!otpCode.trim() || otpCode.length < 4) { setError('Enter the verification code'); return }
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/verify-otp', { userId, otpCode: otpCode.trim(), method: otpMethod })
      setStep('success')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOTP() {
    setResending(true)
    try { await api.post('/auth/resend-otp', { userId, method: otpMethod }) } catch {}
    setTimeout(() => setResending(false), 30000)
  }

  const stepLabels: { key: Step; label: string }[] = [
    { key: 'info', label: 'Personal' },
    { key: 'business', label: 'Business' },
    { key: 'catalog', label: 'Catalog' },
    { key: 'plan', label: 'Plan' },
    { key: 'otp', label: 'Verify' },
  ]
  const currentIdx = stepLabels.findIndex(s => s.key === step)

  return (
    <>
      <Head>
        <title>Register Auto Parts Store - TechTrust</title>
        <meta name="description" content="Register your auto parts store on TechTrust and sell to repair shops and vehicle owners." />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src="/favicon.png" alt="TechTrust" className="w-10 h-10 rounded-xl" />
              <div>
                <span className="font-bold text-gray-900">TechTrust</span>
                <span className="text-sm text-orange-600 ml-2">Auto Parts</span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Globe2 className="w-4 h-4 text-gray-400" />
              <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm">
                {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <Link href="/login" className="text-sm text-primary-600 font-medium hover:text-primary-700">Sign In</Link>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-10">
          {/* Step Progress */}
          {step !== 'landing' && step !== 'success' && (
            <div className="flex items-center gap-2 mb-8">
              {stepLabels.map((s, idx) => (
                <React.Fragment key={s.key}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                      idx < currentIdx ? 'bg-green-500 text-white' : idx === currentIdx ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {idx < currentIdx ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-xs ${idx === currentIdx ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>{s.label}</span>
                  </div>
                  {idx < stepLabels.length - 1 && <div className={`flex-1 h-0.5 ${idx < currentIdx ? 'bg-green-500' : 'bg-gray-200'}`} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

          {/* Landing */}
          {step === 'landing' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-orange-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Register Your Auto Parts Store</h1>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Join TechTrust&apos;s marketplace. Sell parts to repair shops and vehicle owners directly through the platform.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <span className="text-2xl mb-2 block">🏪</span>
                  <h3 className="font-semibold text-gray-900 mb-1">Online Storefront</h3>
                  <p className="text-gray-500 text-sm">Get a dedicated storefront with your catalog, hours, and contact info.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <span className="text-2xl mb-2 block">🔗</span>
                  <h3 className="font-semibold text-gray-900 mb-1">PartsConnect Integration</h3>
                  <p className="text-gray-500 text-sm">Connect with repair shops that need parts for their customers&apos; vehicles.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <span className="text-2xl mb-2 block">💰</span>
                  <h3 className="font-semibold text-gray-900 mb-1">Simple Pricing</h3>
                  <p className="text-gray-500 text-sm">Listing plan + 8-11% per transaction. No hidden fees.</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <span className="text-2xl mb-2 block">🚚</span>
                  <h3 className="font-semibold text-gray-900 mb-1">Delivery Management</h3>
                  <p className="text-gray-500 text-sm">Manage deliveries or pick-up orders with tracking.</p>
                </div>
              </div>

              <button onClick={() => setStep('info')} className="btn btn-primary py-3 px-8 text-base bg-orange-600 hover:bg-orange-700">
                Start Registration <ArrowRight className="w-5 h-5 ml-2" />
              </button>
              <p className="mt-4 text-sm text-gray-500">
                Already registered? <Link href="/login" className="text-primary-600 font-medium">Sign in</Link>
              </p>
            </div>
          )}

          {/* Step 1: Personal Info */}
          {step === 'info' && (
            <div>
              <button onClick={() => setStep('landing')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Contact Person</h2>
              <p className="text-sm text-gray-500 mb-4">Who manages this parts store?</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" className="input !pl-11" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="input !pl-11" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <div className="flex">
                    <span className="inline-flex items-center gap-1.5 px-3 border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm rounded-l-xl">
                      <Phone className="w-4 h-4" /> +1
                    </span>
                    <input type="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(305) 555-0123" className="input rounded-l-none !pl-3" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input !pl-11 !pr-12" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input !pl-11" />
                  </div>
                </div>
                <button onClick={() => {
                  if (!fullName.trim() || fullName.trim().split(' ').length < 2) { setError('Enter your full name'); return }
                  if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email'); return }
                  if (!phoneToE164(phone)) { setError('Enter a valid US phone number'); return }
                  if (password.length < 8) { setError('Password must be at least 8 characters'); return }
                  if (password !== confirmPassword) { setError('Passwords do not match'); return }
                  setError(''); setStep('business')
                }} className="btn btn-primary w-full py-3">
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Business Info */}
          {step === 'business' && (
            <div>
              <button onClick={() => setStep('info')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Store Information</h2>
              <p className="text-sm text-gray-500 mb-4">Tell us about your auto parts store</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Quick Auto Parts LLC" className="input !pl-11" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="456 Parts Ave" className="input !pl-11" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                    <select value={businessState} onChange={e => { setBusinessState(e.target.value); setBusinessCity('') }} className="input">
                      {US_STATES.map(st => <option key={st.code} value={st.code}>{st.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP *</label>
                    <input type="text" value={businessZipCode} onChange={e => setBusinessZipCode(e.target.value)} placeholder="33101" className="input" maxLength={5} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  {CITIES_BY_STATE[businessState]?.length ? (
                    <select value={businessCity} onChange={e => setBusinessCity(e.target.value)} className="input">
                      <option value="">Select city</option>
                      {CITIES_BY_STATE[businessState].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={businessCity} onChange={e => setBusinessCity(e.target.value)} placeholder="Enter city" className="input" />
                  )}
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={hasPhysicalStore} onChange={e => setHasPhysicalStore(e.target.checked)} className="rounded border-gray-300 text-orange-600" />
                    <span className="text-sm text-gray-700">Physical store</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={offersDelivery} onChange={e => setOffersDelivery(e.target.checked)} className="rounded border-gray-300 text-orange-600" />
                    <span className="text-sm text-gray-700">Offers delivery</span>
                  </label>
                </div>

                <button onClick={() => {
                  if (!businessName.trim()) { setError('Enter store name'); return }
                  if (!businessAddress.trim()) { setError('Enter address'); return }
                  if (!businessCity.trim()) { setError('Enter city'); return }
                  if (!businessZipCode.trim()) { setError('Enter ZIP code'); return }
                  setError(''); setStep('catalog')
                }} className="btn btn-primary w-full py-3">
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Catalog */}
          {step === 'catalog' && (
            <div>
              <button onClick={() => setStep('business')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Parts Catalog</h2>
              <p className="text-sm text-gray-500 mb-4">What types of parts do you sell?</p>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Categories</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PARTS_CATEGORIES.map(c => (
                    <button key={c.key} onClick={() => toggleCategory(c.key)}
                      className={`px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                        selectedCategories.has(c.key) ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Part Types</h3>
                <div className="grid grid-cols-2 gap-2">
                  {BRAND_TYPES.map(b => (
                    <button key={b.key} onClick={() => toggleBrandType(b.key)}
                      className={`px-3 py-2.5 rounded-lg border text-left transition-all ${
                        selectedBrandTypes.has(b.key) ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">{b.label}</div>
                      <div className="text-xs text-gray-500">{b.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => {
                if (selectedCategories.size === 0) { setError('Select at least one category'); return }
                if (selectedBrandTypes.size === 0) { setError('Select at least one part type'); return }
                setError(''); setStep('plan')
              }} className="btn btn-primary w-full py-3">
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}

          {/* Step 4: Plan Selection */}
          {step === 'plan' && (
            <div>
              <button onClick={() => setStep('catalog')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Choose Your Auto Parts Plan</h2>
              <p className="text-sm text-gray-500 mb-4">Get your store discovered by repair shops and vehicle owners</p>

              <div className="space-y-3 mb-4">
                {/* Basic Plan */}
                <button onClick={() => setSelectedPlan('basic')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedPlan === 'basic' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Basic</h3>
                    <span className="font-bold text-gray-900">$29.99/mo</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Store profile with logo & description</li>
                    <li>• Up to 50 product listings</li>
                    <li>• 5 photos per product</li>
                    <li>• 10-mile search radius</li>
                    <li>• Basic analytics (views & clicks)</li>
                    <li>• Store reviews</li>
                    <li>• 8% transaction fee</li>
                  </ul>
                </button>

                {/* Pro Plan */}
                <button onClick={() => setSelectedPlan('pro')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
                    selectedPlan === 'pro' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="absolute -top-2.5 right-4 bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">POPULAR</span>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Pro</h3>
                    <span className="font-bold text-gray-900">$49.99/mo</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Everything in Basic</li>
                    <li>• Up to 200 product listings</li>
                    <li>• 15 photos per product</li>
                    <li>• <strong>20-mile search radius</strong></li>
                    <li>• Priority search ranking (2x boost)</li>
                    <li>• Delivery zone management</li>
                    <li>• Warranty tracking</li>
                    <li>• 1 promotion/ad per month</li>
                    <li>• Verified badge ✓</li>
                    <li>• <strong>6% transaction fee</strong></li>
                  </ul>
                </button>

                {/* Pro+ Plan */}
                <button onClick={() => setSelectedPlan('pro_plus')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
                    selectedPlan === 'pro_plus' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="absolute -top-2.5 right-4 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">BEST VALUE</span>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Pro+ ⭐</h3>
                    <span className="font-bold text-gray-900">$89.99/mo</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Everything in Pro</li>
                    <li>• Unlimited product listings & photos</li>
                    <li>• <strong>50-mile search radius</strong></li>
                    <li>• Featured listing (top of search)</li>
                    <li>• 5 promotions/ads per month</li>
                    <li>• Featured + Verified badges ⭐✓</li>
                    <li>• Custom storefront branding</li>
                    <li>• Priority customer support</li>
                    <li>• Cross-sell with repair shops</li>
                    <li>• Bulk product import</li>
                    <li>• Advanced market analytics</li>
                    <li>• <strong>4% transaction fee</strong></li>
                  </ul>
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-700">
                <strong>Transaction fee:</strong> Varies by plan (4-8%). The higher the plan, the lower the fee per sale.
              </div>

              {/* OTP Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Verify account via:</label>
                <div className="flex gap-2">
                  <button onClick={() => setOtpMethod('sms')} className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium ${otpMethod === 'sms' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                    📱 SMS
                  </button>
                  <button onClick={() => setOtpMethod('email')} className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium ${otpMethod === 'email' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                    ✉️ Email
                  </button>
                </div>
              </div>

              <button onClick={handleSubmitRegistration} disabled={loading} className="btn btn-primary w-full py-3">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <>Submit Registration <ArrowRight className="w-4 h-4 ml-1" /></>}
              </button>
              <p className="text-xs text-gray-400 mt-3 text-center">
                7-day free trial. Cancel anytime. We accept credit/debit cards, Apple Pay, Google Pay, and bank transfers.
              </p>
            </div>
          )}

          {/* Step 5: OTP Verification */}
          {step === 'otp' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Verify Your Account</h2>
              <p className="text-sm text-gray-500 mb-6">
                We sent a 6-digit code to your {otpMethod === 'sms' ? 'phone' : 'email'}
              </p>
              <div className="space-y-4">
                <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6} autoFocus className="input text-center text-2xl tracking-[0.5em] font-mono" />
                <button onClick={handleVerifyOTP} disabled={loading} className="btn btn-primary w-full py-3">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify'}
                </button>
                <div className="text-center">
                  <button onClick={handleResendOTP} disabled={resending} className="text-sm text-primary-600 font-medium disabled:text-gray-400">
                    {resending ? 'Code sent!' : 'Resend code'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Registration Submitted!</h2>
              <p className="text-gray-600 mb-2">Your auto parts store has been registered.</p>
              <p className="text-sm text-gray-500 mb-8">Our team will review your application and verify your store. You&apos;ll receive approval via email within 1-3 business days.</p>
              <button onClick={() => router.push('/login')} className="btn btn-primary py-3 px-8">
                Go to Login <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

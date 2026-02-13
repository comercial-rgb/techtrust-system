'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
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
} from 'lucide-react'
import { useI18n, languages, Language } from '../i18n'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

type Step = 'info' | 'otp' | 'success'

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

  // Step 2: OTP
  const [userId, setUserId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const [showLoginLink, setShowLoginLink] = useState(false)

  // ─── Phone formatting ───
  function formatPhoneDisplay(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  function phoneToE164(value: string) {
    const digits = value.replace(/\D/g, '')
    return digits.length === 10 ? `+1${digits}` : ''
  }

  // ─── Validate Step ───
  function validateInfo(): boolean {
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      setError(tr('signup.fullNameRequired'))
      return false
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError(tr('signup.emailRequired'))
      return false
    }
    const e164 = phoneToE164(phone)
    if (!e164) {
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
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
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

          {/* ─── Step 1: Personal Info ─── */}
          {step === 'info' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{tr('signup.personalInfo')}</h2>
              <p className="text-gray-600 mb-6">{tr('signup.personalInfoDesc')}</p>

              <div className="space-y-4">
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
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <span className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">+1</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(formatPhoneDisplay(e.target.value)); setError('') }}
                      placeholder="(555) 123-4567"
                      className="w-full pl-20 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    />
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
              <p className="text-gray-600 mb-4">{tr('signup.successDesc')}</p>
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

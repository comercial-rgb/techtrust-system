'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { Wrench, Mail, Lock, Eye, EyeOff, Loader2, Globe2, ArrowLeft, Droplets, Package, Store, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useI18n, languages, Language } from '@/i18n'

export default function LoginPage() {
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const { translate, language, setLanguage } = useI18n()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // OTP verification state (for unverified accounts)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [verifyUserId, setVerifyUserId] = useState('')
  const [verifyPhone, setVerifyPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [resending, setResending] = useState(false)

  // Login mode: provider (repair shops) vs marketplace (car wash / auto parts)
  const [loginMode, setLoginMode] = useState<'provider' | 'marketplace'>('provider')

  const tr = translate

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, authLoading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError(tr('auth.missingFields'))
      return
    }

    setLoading(true)
    try {
      // AuthContext handles API call, cookies, state, and redirect
      await login(email, password)
    } catch (err: any) {
      const data = err.response?.data
      const errorCode = data?.code || data?.error

      if (errorCode === 'PHONE_NOT_VERIFIED') {
        // Backend returns userId in data.data (new) or we need to extract it
        const userId = data?.data?.userId
        const phone = data?.data?.phone || data?.data?.otpSentTo || ''

        if (userId) {
          setNeedsVerification(true)
          setVerifyUserId(userId)
          setVerifyPhone(phone)
          setError('')
        } else {
          // Old backend format without userId — re-call login to trigger OTP send
          try {
            await api.post('/auth/login', { email, password })
          } catch (retryErr: any) {
            const retryData = retryErr.response?.data
            const retryUserId = retryData?.data?.userId
            if (retryUserId) {
              setNeedsVerification(true)
              setVerifyUserId(retryUserId)
              setVerifyPhone(retryData.data.phone || retryData.data.otpSentTo || '')
              setError('')
              return
            }
          }
          // If still no userId, show a helpful message
          setError(tr('auth.phoneNotVerifiedRetry') || 'Your phone is not verified. Please try again in a moment.')
        }
        return
      }
      setError(data?.message || err.message || tr('auth.loginError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault()
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError(tr('signup.otpRequired') || 'Enter the verification code')
      return
    }
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/verify-otp', {
        userId: verifyUserId,
        otpCode: otpCode.trim(),
        method: 'sms',
      })
      // After verification, login through AuthContext (handles cookies/redirect)
      await login(email, password)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOTP() {
    setResending(true)
    try {
      if (verifyUserId) {
        await api.post('/auth/resend-otp', { userId: verifyUserId, method: 'sms' })
      } else {
        // Trigger login again which generates new OTP
        try {
          await api.post('/auth/login', { email, password })
        } catch (err: any) {
          const data = err.response?.data
          if (data?.data?.userId) {
            setVerifyUserId(data.data.userId)
            setVerifyPhone(data.data.phone || data.data.otpSentTo || '')
          }
        }
      }
    } catch {}
    setTimeout(() => setResending(false), 30000)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <img src="/favicon.png" alt="TechTrust" className="w-12 h-12 rounded-2xl shadow-lg shadow-primary-500/30" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{tr('brand.name')}</h1>
                <p className="text-sm text-gray-500">{tr('provider.subtitle')}</p>
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
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Login Mode Toggle */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {tr('login.accessType') || 'Access Type'}
            </label>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setLoginMode('provider')}
                className={`flex-1 py-2.5 px-3 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  loginMode === 'provider'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Wrench className="w-4 h-4" />
                {tr('login.providerMode') || 'Repair Shop'}
              </button>
              <button
                onClick={() => setLoginMode('marketplace')}
                className={`flex-1 py-2.5 px-3 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  loginMode === 'marketplace'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Store className="w-4 h-4" />
                {tr('login.marketplaceMode') || 'Marketplace'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {loginMode === 'provider'
                ? (tr('login.providerHint') || 'For auto repair shops and service providers.')
                : (tr('login.marketplaceHint') || 'For car wash and auto parts store owners.')
              }
            </p>
          </div>

          {/* Welcome text */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {tr('auth.welcomeBack')}
            </h2>
            <p className="text-gray-600">
              {loginMode === 'provider'
                ? tr('auth.providerIntro')
                : (tr('auth.marketplaceIntro') || 'Sign in to manage your car wash or auto parts store.')
              }
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-fade-in">
              {error}
            </div>
          )}

          {needsVerification ? (
            /* OTP Verification Form */
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
                {tr('signup.otpSent') || 'A verification code was sent to your phone'}
                {verifyPhone && <span className="font-medium"> ({verifyPhone.replace(/(\d{2})\d+(\d{2})/, '$1****$2')})</span>}
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tr('signup.otpCode') || 'Verification Code'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="input text-center text-2xl tracking-[0.5em] font-mono"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 4}
                  className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {tr('common.loading') || 'Verifying...'}
                    </span>
                  ) : (
                    tr('signup.verify') || 'Verify'
                  )}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resending}
                    className="text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400"
                  >
                    {resending ? (tr('signup.otpResent') || 'Code sent!') : (tr('signup.resendOtp') || 'Resend code')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNeedsVerification(false); setOtpCode(''); setError(''); }}
                    className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {tr('auth.signIn') || 'Back to login'}
                  </button>
                </div>
              </form>
            </>
          ) : (
          /* Login Form */
          <>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tr('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="input !pl-12"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tr('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input !pl-12 !pr-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                <span className="text-sm text-gray-600">{tr('auth.rememberMe')}</span>
              </label>
              <Link href="/esqueci-senha" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                {tr('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {tr('auth.signingIn')}
                </span>
              ) : (
                tr('auth.signIn')
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                {loginMode === 'provider'
                  ? (tr('provider.notPartner') || 'Not a partner yet?')
                  : (tr('marketplace.notRegistered') || 'New to marketplace?')
                }
              </span>
            </div>
          </div>

          {/* Register links */}
          {loginMode === 'provider' ? (
            <Link
              href="/register"
              className="btn btn-outline w-full py-3 text-base"
            >
              {tr('provider.registerCta')}
            </Link>
          ) : (
            <div className="space-y-2">
              <Link
                href="/register-car-wash"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-cyan-200 text-cyan-700 hover:bg-cyan-50 font-medium transition-all"
              >
                <Droplets className="w-5 h-5" />
                {tr('marketplace.registerCarWash') || 'Register Car Wash'}
              </Link>
              <Link
                href="/register-auto-parts"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-orange-200 text-orange-700 hover:bg-orange-50 font-medium transition-all"
              >
                <Package className="w-5 h-5" />
                {tr('marketplace.registerAutoParts') || 'Register Auto Parts Store'}
              </Link>
            </div>
          )}
          </>
          )}

          {/* Help */}
          <p className="mt-8 text-center text-sm text-gray-500">
            {tr('common.help')}{' '}
            <a href="mailto:suporte@techtrust.com" className="text-primary-600 hover:text-primary-700 font-medium">
              {tr('common.contactUs')}
            </a>
          </p>
        </div>
      </div>

      {/* Right side - Image/Branding */}
      <div className={`hidden lg:flex lg:flex-1 p-12 items-center justify-center overflow-y-auto transition-all duration-500 ${
        loginMode === 'provider'
          ? 'bg-gradient-to-br from-primary-500 to-primary-700'
          : 'bg-gradient-to-br from-cyan-500 to-blue-700'
      }`}>
        <div className="max-w-md text-white">
          <div className="mb-8">
            <img src="/logo-white.png" alt="TechTrust" className="w-16 h-16 mb-6 drop-shadow-lg" />
            {loginMode === 'provider' ? (
              <>
                <h2 className="text-3xl font-bold mb-4">
                  {tr('provider.heroTitle')}
                </h2>
                <p className="text-lg text-primary-100 leading-relaxed">
                  {tr('provider.heroDescription')}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-4">
                  {tr('marketplace.heroTitle') || 'Grow Your Business on TechTrust Marketplace'}
                </h2>
                <p className="text-lg text-white/80 leading-relaxed">
                  {tr('marketplace.heroDesc') || 'List your car wash or auto parts store. Reach thousands of vehicle owners in Florida.'}
                </p>
              </>
            )}
          </div>

          {loginMode === 'provider' ? (
            <>
              {/* Provider Benefits */}
              <div className="space-y-3 mb-8">
                <div className="bg-white/10 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-2xl">🆓</span>
                  <div>
                    <div className="font-semibold text-sm">{tr('provider.benefit.freeRegistration') || 'Free Registration'}</div>
                    <div className="text-primary-200 text-xs">{tr('provider.benefit.freeRegistrationDesc') || 'No monthly fees. Pay only when you earn.'}</div>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-2xl">📲</span>
                  <div>
                    <div className="font-semibold text-sm">{tr('provider.benefit.receiveRequests') || 'Receive Service Requests'}</div>
                    <div className="text-primary-200 text-xs">{tr('provider.benefit.receiveRequestsDesc') || 'Get connected to vehicle owners looking for your services.'}</div>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <div className="font-semibold text-sm">{tr('provider.benefit.growBusiness') || 'Grow Your Business'}</div>
                    <div className="text-primary-200 text-xs">{tr('provider.benefit.growBusinessDesc') || 'Build reputation with reviews, get featured, earn more.'}</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Marketplace Plans Preview */}
              <div className="space-y-3 mb-8">
                <div className="bg-white/10 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-2xl">🚿</span>
                  <div>
                    <div className="font-semibold text-sm">{tr('marketplace.benefit.carWash') || 'Car Wash Owners'}</div>
                    <div className="text-white/70 text-xs">{tr('marketplace.benefit.carWashDesc') || 'List your services, packages, memberships. Get booked online.'}</div>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-2xl">🏪</span>
                  <div>
                    <div className="font-semibold text-sm">{tr('marketplace.benefit.autoParts') || 'Auto Parts Stores'}</div>
                    <div className="text-white/70 text-xs">{tr('marketplace.benefit.autoPartsDesc') || 'Catalog your products, manage inventory, reach repair shops.'}</div>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <div className="font-semibold text-sm">{tr('marketplace.benefit.analytics') || 'Analytics & Promotions'}</div>
                    <div className="text-white/70 text-xs">{tr('marketplace.benefit.analyticsDesc') || 'Track views, clicks, and create targeted promotions.'}</div>
                  </div>
                </div>
              </div>

              {/* Marketplace Plans */}
              <div className="pt-6 border-t border-white/20 mb-8">
                <h3 className="font-semibold text-lg mb-3">
                  {tr('marketplace.plans') || 'Marketplace Plans'}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/10 rounded-lg p-2.5 text-center">
                    <div className="font-bold text-sm">Basic</div>
                    <div className="text-white/70 text-xs">$29.99/mo</div>
                    <div className="text-white/60 text-xs mt-1">10 mi</div>
                  </div>
                  <div className="bg-white/15 rounded-lg p-2.5 text-center ring-1 ring-white/30">
                    <div className="font-bold text-sm">Pro</div>
                    <div className="text-white/70 text-xs">$49.99/mo</div>
                    <div className="text-white/60 text-xs mt-1">20 mi</div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-2.5 text-center ring-2 ring-yellow-400/50">
                    <div className="font-bold text-sm">Pro+ ⭐</div>
                    <div className="text-white/70 text-xs">$89.99/mo</div>
                    <div className="text-white/60 text-xs mt-1">50 mi</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-2xl font-bold">500+</p>
              <p className="text-white/70 text-sm">{tr('provider.stats.suppliers')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-2xl font-bold">10k+</p>
              <p className="text-white/70 text-sm">{tr('provider.stats.services')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-2xl font-bold">4.8</p>
              <p className="text-white/70 text-sm">{tr('provider.stats.rating')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-2xl font-bold">$2M+</p>
              <p className="text-white/70 text-sm">{tr('provider.stats.paid')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

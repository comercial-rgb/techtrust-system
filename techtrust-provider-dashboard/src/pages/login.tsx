'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useGoogleLogin } from '@react-oauth/google'
import api from '@/services/api'
import { Wrench, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, Droplets, Package, Store } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/i18n'
import LangSelector from '@/components/LangSelector'

export default function LoginPage() {
  const { login, socialLogin, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const { translate, language, setLanguage } = useI18n()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null)
  const [error, setError] = useState('')

  const handleGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setSocialLoading('google')
      setError('')
      try {
        await socialLogin('google', tokenResponse.access_token)
      } catch (err: any) {
        setError(err.message || 'Google sign-in failed')
      } finally {
        setSocialLoading(null)
      }
    },
    onError: () => setError('Google sign-in was cancelled or failed'),
  })

  const handleAppleLogin = async () => {
    const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID
    if (!clientId) { setError('Apple Sign-In is not configured'); return }
    setSocialLoading('apple')
    setError('')
    try {
      if (!(window as any).AppleID) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Apple SDK'))
          document.head.appendChild(script)
        })
      }
      ;(window as any).AppleID.auth.init({
        clientId,
        scope: 'name email',
        redirectURI: window.location.origin + window.location.pathname,
        usePopup: true,
      })
      const data = await (window as any).AppleID.auth.signIn()
      const idToken = data.authorization.id_token
      const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      const appleUserId = payload.sub
      const name = data.user ? `${data.user.name?.firstName || ''} ${data.user.name?.lastName || ''}`.trim() : undefined
      await socialLogin('apple', idToken, { appleUserId, fullName: name })
    } catch (err: any) {
      if (err?.error === 'popup_closed_by_user') return // User cancelled
      setError(err.message || 'Apple sign-in failed')
    } finally {
      setSocialLoading(null)
    }
  }

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
            <LangSelector language={language} setLanguage={setLanguage} />
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

          {needsVerification ? (
            /* OTP Verification Form */
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-fade-in">
                  {error}
                </div>
              )}
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
          {/* Social Sign-In */}
          <div className="mb-6">
            <div className="flex gap-3">
              {/* Google */}
              <button
                type="button"
                onClick={() => handleGoogleLogin()}
                disabled={socialLoading !== null || loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-700 text-sm shadow-sm"
              >
                {socialLoading === 'google' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Google
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={handleAppleLogin}
                disabled={socialLoading !== null || loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-black hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-white text-sm shadow-sm"
              >
                {socialLoading === 'apple' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white/70" />
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                  </svg>
                )}
                Apple
              </button>
            </div>
          </div>

          {/* Error message — shown below social buttons */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">or sign in with email</span>
            </div>
          </div>

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

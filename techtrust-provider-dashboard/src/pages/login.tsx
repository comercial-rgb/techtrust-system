'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { Wrench, Mail, Lock, Eye, EyeOff, Loader2, Globe2, ArrowLeft } from 'lucide-react'
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
      await login(email, password)
    } catch (err: any) {
      // Check if it's a phone verification error
      const responseData = err.response?.data
      if (responseData?.code === 'PHONE_NOT_VERIFIED' && responseData?.data?.userId) {
        setNeedsVerification(true)
        setVerifyUserId(responseData.data.userId)
        setVerifyPhone(responseData.data.phone || '')
        setError('')
        return
      }
      setError(err.response?.data?.message || err.message || tr('auth.loginError'))
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
      // After verification, login again
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
      await api.post('/auth/resend-otp', { userId: verifyUserId, method: 'sms' })
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
              <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <Wrench className="w-6 h-6 text-white" />
              </div>
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

          {/* Welcome text */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {tr('auth.welcomeBack')}
            </h2>
            <p className="text-gray-600">
              {tr('auth.providerIntro')}
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
                  className="input pl-12"
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
                  className="input pl-12 pr-12"
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
              <span className="px-4 bg-white text-gray-500">{tr('provider.notPartner')}</span>
            </div>
          </div>

          {/* Register link */}
          <Link
            href="/cadastro"
            className="btn btn-outline w-full py-3 text-base"
          >
            {tr('provider.registerCta')}
          </Link>
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
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-500 to-primary-700 p-12 items-center justify-center">
        <div className="max-w-md text-white">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6">
              <Wrench className="w-8 h-8" />
            </div>
              <h2 className="text-3xl font-bold mb-4">
              {tr('provider.heroTitle')}
            </h2>
            <p className="text-lg text-primary-100 leading-relaxed">
              {tr('provider.heroDescription')}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 mt-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
              <p className="text-3xl font-bold">500+</p>
              <p className="text-primary-100 text-sm">{tr('provider.stats.suppliers')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
              <p className="text-3xl font-bold">10k+</p>
              <p className="text-primary-100 text-sm">{tr('provider.stats.services')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
              <p className="text-3xl font-bold">4.8</p>
              <p className="text-primary-100 text-sm">{tr('provider.stats.rating')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
              <p className="text-3xl font-bold">$2M+</p>
              <p className="text-primary-100 text-sm">{tr('provider.stats.paid')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

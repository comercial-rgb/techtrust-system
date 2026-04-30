import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import { useGoogleLogin } from "@react-oauth/google";
import api from "../services/api";
import {
  Car,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  ArrowRight,
  ArrowLeft,
  Shield,
  Clock,
  Star,
  Globe2,
  Loader2,
} from "lucide-react";
import { useI18n } from "../i18n";
import LangSelector from "../components/LangSelector";

type SocialStep = 'idle' | 'needs_password' | 'needs_otp'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://techtrust-api.onrender.com/api/v1'

export default function LoginPage() {
  const { login, socialLogin, completeSocialSignup, verifySocialPhone } = useAuth();
  const { translate, language, setLanguage } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState("");

  // Social completion flow state
  const [socialStep, setSocialStep] = useState<SocialStep>('idle')
  const [socialUserId, setSocialUserId] = useState('')
  const [socialEmail, setSocialEmail] = useState('')
  const [socialPhone, setSocialPhone] = useState('')
  const [socialPassword, setSocialPassword] = useState('')
  const [socialConfirmPassword, setSocialConfirmPassword] = useState('')
  const [socialOtp, setSocialOtp] = useState('')
  const [showSocialPassword, setShowSocialPassword] = useState(false)
  const [resending, setResending] = useState(false)

  // OTP verification state (email login)
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyUserId, setVerifyUserId] = useState("");
  const [verifyPhone, setVerifyPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [emailResending, setEmailResending] = useState(false);

  const tr = translate;

  // ─── Apple Sign-In helper ───
  const signInWithApple = async () => {
    const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID
    if (!clientId) {
      setError('Apple Sign-In is not configured')
      return undefined
    }

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
    return { idToken, appleUserId, name }
  }

  // ─── Google handler ───
  const handleGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setSocialLoading(true)
      setError('')
      try {
        const result = await socialLogin('google', tokenResponse.access_token)
        if (result.status === 'NEEDS_PASSWORD') {
          setSocialUserId(result.userId)
          setSocialEmail(result.email)
          setSocialStep('needs_password')
        }
        // AUTHENTICATED is handled inside socialLogin (redirects)
      } catch (err: any) {
        setError(err.message || 'Google sign-in failed')
      } finally {
        setSocialLoading(false)
      }
    },
    onError: () => setError('Google sign-in was cancelled or failed'),
  })

  // ─── Apple handler ───
  const handleAppleLogin = async () => {
    setSocialLoading(true)
    setError('')
    try {
      const appleData = await signInWithApple()
      if (!appleData) return
      const result = await socialLogin('apple', appleData.idToken, {
        appleUserId: appleData.appleUserId,
        fullName: appleData.name,
      })
      if (result.status === 'NEEDS_PASSWORD') {
        setSocialUserId(result.userId)
        setSocialEmail(result.email)
        setSocialStep('needs_password')
      }
    } catch (err: any) {
      if (err?.error === 'popup_closed_by_user') {
        setError('Apple sign-in was cancelled')
      } else {
        setError(err.message || 'Apple sign-in failed')
      }
    } finally {
      setSocialLoading(false)
    }
  }

  // ─── Complete social signup (needs_password step) ───
  async function handleCompleteSocialSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const trimmedPhone = socialPhone.trim()
    if (!trimmedPhone) {
      setError('Please enter your phone number')
      return
    }
    if (socialPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (socialPassword !== socialConfirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const result = await completeSocialSignup(socialUserId, trimmedPhone, socialPassword)
      if (result.status === 'NEEDS_PHONE_VERIFICATION') {
        setSocialPhone(result.phone || trimmedPhone)
        setSocialStep('needs_otp')
      }
      // AUTHENTICATED is handled inside completeSocialSignup (redirects)
    } catch (err: any) {
      setError(err.message || 'Could not complete sign-up. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Verify social phone OTP ───
  async function handleVerifySocialOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!socialOtp.trim() || socialOtp.trim().length < 4) {
      setError('Enter the verification code')
      return
    }
    setError('')
    setLoading(true)
    try {
      await verifySocialPhone(socialUserId, socialOtp.trim())
    } catch (err: any) {
      setError(err.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendSocialOtp() {
    setResending(true)
    try {
      await fetch(`${API_BASE}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: socialUserId, method: 'sms' }),
      })
    } catch {}
    setTimeout(() => setResending(false), 30000)
  }

  // ─── Email login ───
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.login(email, password);

      if (response.error) {
        const errorCode = response.code;

        if (errorCode === "PHONE_NOT_VERIFIED") {
          const userId = response.responseData?.userId;
          const phone = response.responseData?.phone || response.responseData?.otpSentTo || "";

          if (userId) {
            setNeedsVerification(true);
            setVerifyUserId(userId);
            setVerifyPhone(phone);
            setError("");
          } else {
            const retry = await api.login(email, password);
            if (retry.responseData?.userId) {
              setNeedsVerification(true);
              setVerifyUserId(retry.responseData.userId);
              setVerifyPhone(retry.responseData.phone || retry.responseData.otpSentTo || "");
              setError("");
            } else {
              setError(
                tr("auth.phoneNotVerifiedRetry") ||
                  "Your phone is not verified. Please try again in a moment."
              );
            }
          }
          return;
        }

        setError(response.error);
        return;
      }

      await login(email, password);
    } catch (err: any) {
      setError(err.message || tr("auth.loginError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError(tr("signup.otpRequired") || "Enter the verification code");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await api.verifyOTP(verifyUserId, otpCode.trim());
      if (res.error) {
        setError(res.error);
        return;
      }
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    setEmailResending(true);
    try {
      if (verifyUserId) {
        await api.resendOTP(verifyUserId);
      } else {
        const retry = await api.login(email, password);
        if (retry.responseData?.userId) {
          setVerifyUserId(retry.responseData.userId);
          setVerifyPhone(retry.responseData.phone || retry.responseData.otpSentTo || "");
        }
      }
    } catch {}
    setTimeout(() => setEmailResending(false), 30000);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <img src="/favicon.png" alt="TechTrust" className="w-12 h-12 rounded-xl" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {tr("brand.name")}
                </h1>
                <p className="text-sm text-gray-500">{tr("client.subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe2 className="w-4 h-4" />
              <span className="sr-only">{tr("common.language")}</span>
              <LangSelector language={language} setLanguage={setLanguage} />
            </div>
          </div>

          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {tr("auth.welcomeBack")}
            </h2>
            <p className="text-gray-600">{tr("auth.clientIntro")}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 text-lg">!</span>
              </div>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* ─── Email OTP Verification (email login flow) ─── */}
          {needsVerification ? (
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                {tr("signup.otpSent") || "A verification code was sent to your phone"}
                {verifyPhone && (
                  <span className="font-medium">
                    {" "}({verifyPhone.replace(/(\d{2})\d+(\d{2})/, "$1****$2")})
                  </span>
                )}
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tr("signup.otpCode") || "Verification Code"}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono"
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
                      {tr("common.loading") || "Verifying..."}
                    </span>
                  ) : (
                    tr("signup.verify") || "Verify"
                  )}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={emailResending}
                    className="text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400"
                  >
                    {emailResending
                      ? tr("signup.otpResent") || "Code sent!"
                      : tr("signup.resendOtp") || "Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNeedsVerification(false);
                      setOtpCode("");
                      setError("");
                    }}
                    className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {tr("auth.signIn") || "Back to login"}
                  </button>
                </div>
              </form>
            </>

          ) : socialStep === 'needs_password' ? (
            /* ─── Social: Complete Account (set phone + password) ─── */
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Almost there!</h3>
                <p className="text-gray-600 text-sm">
                  Complete your account for <span className="font-medium text-gray-800">{socialEmail}</span> to continue.
                </p>
              </div>

              <form onSubmit={handleCompleteSocialSignup} className="space-y-5">
                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <div className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none select-none">
                      +1
                    </div>
                    <input
                      type="tel"
                      value={socialPhone}
                      onChange={(e) => setSocialPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full pl-20 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tr("auth.password")}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type={showSocialPassword ? 'text' : 'password'}
                      value={socialPassword}
                      onChange={(e) => setSocialPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSocialPassword(!showSocialPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSocialPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">At least 8 characters</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type={showSocialPassword ? 'text' : 'password'}
                      value={socialConfirmPassword}
                      onChange={(e) => setSocialConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Setting up...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Complete Account
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSocialStep('idle')
                    setSocialUserId('')
                    setSocialEmail('')
                    setSocialPhone('')
                    setSocialPassword('')
                    setSocialConfirmPassword('')
                    setError('')
                  }}
                  className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </form>
            </>

          ) : socialStep === 'needs_otp' ? (
            /* ─── Social: Phone OTP verification ─── */
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                Enter the verification code sent to{' '}
                <span className="font-medium">{socialPhone}</span>
              </div>

              <form onSubmit={handleVerifySocialOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={socialOtp}
                    onChange={(e) => setSocialOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || socialOtp.length < 4}
                  className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    tr("signup.verify") || "Verify"
                  )}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={handleResendSocialOtp}
                    disabled={resending}
                    className="text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400"
                  >
                    {resending ? "Code sent!" : tr("signup.resendOtp") || "Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSocialStep('needs_password')
                      setSocialOtp('')
                      setError('')
                    }}
                    className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
              </form>
            </>

          ) : (
          /* ─── Default: Social buttons + email/password form ─── */
          <>
          {/* Social Sign-In */}
          <div className="mb-6 space-y-3">
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              disabled={socialLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-700 text-sm shadow-sm"
            >
              {socialLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={socialLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-lg bg-black hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-white text-sm shadow-sm"
            >
              {socialLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              )}
              Continue with Apple
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">or sign in with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tr("auth.email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tr("auth.password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-primary-600"
                />
                <span className="text-sm text-gray-600">
                  {tr("auth.rememberMe")}
                </span>
              </label>
              <Link
                href="/esqueci-senha"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {tr("auth.forgotPassword")}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {tr("auth.signingIn")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {tr("auth.signIn")}
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-gray-600">
            {tr("client.signUpPrompt")}{" "}
            <Link
              href="/cadastro"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              {tr("client.signUpCta")}
            </Link>
          </p>
          </>
          )}
        </div>
      </div>

      {/* Right Side - Features & Plans */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 to-primary-800 p-12 items-center justify-center overflow-y-auto">
        <div className="max-w-md text-white">
          <img src="/logo-white.png" alt="TechTrust" className="w-16 h-16 mb-6 drop-shadow-lg" />
          <h2 className="text-3xl font-bold mb-6">{tr("client.heroTitle")}</h2>
          <p className="text-primary-100 mb-8 text-lg">
            {tr("client.heroDescription")}
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-0.5">{tr("client.features.verified")}</h3>
                <p className="text-primary-200 text-sm">{tr("client.features.verified")}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-0.5">{tr("client.features.quotes")}</h3>
                <p className="text-primary-200 text-sm">{tr("client.features.quotes")}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-0.5">{tr("client.features.quality")}</h3>
                <p className="text-primary-200 text-sm">{tr("client.features.quality")}</p>
              </div>
            </div>
          </div>

          {/* Plans Overview */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <h3 className="font-semibold text-lg mb-3">
              {tr("plans.ourPlans") || "Our Plans"}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="font-semibold text-sm">Free</div>
                <div className="text-primary-200 text-xs">2 vehicles • $0/mo</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="font-semibold text-sm">Starter</div>
                <div className="text-primary-200 text-xs">3 vehicles • $9.99/mo</div>
              </div>
              <div className="bg-white/15 rounded-lg p-3 ring-1 ring-white/30">
                <div className="font-semibold text-sm">Pro ⭐</div>
                <div className="text-primary-200 text-xs">5 vehicles • $19.99/mo</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="font-semibold text-sm">Enterprise</div>
                <div className="text-primary-200 text-xs">14 vehicles • $49.99/mo</div>
              </div>
            </div>
            <p className="text-primary-200 text-xs mt-2">
              {tr("plans.trialNote") || "7-day free trial on paid plans. Free plan forever."}
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-2xl font-bold">50k+</p>
                <p className="text-primary-200 text-sm">{tr("client.stats.customers")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold">500+</p>
                <p className="text-primary-200 text-sm">{tr("client.stats.providers")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold">4.9</p>
                <p className="text-primary-200 text-sm">{tr("client.stats.rating")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

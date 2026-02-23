import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import {
  Car,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Shield,
  Clock,
  Star,
  Globe2,
  Loader2,
} from "lucide-react";
import { useI18n, languages, Language } from "../i18n";

export default function LoginPage() {
  const { login } = useAuth();
  const { translate, language, setLanguage } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP verification state
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyUserId, setVerifyUserId] = useState("");
  const [verifyPhone, setVerifyPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resending, setResending] = useState(false);

  const tr = translate;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Call API directly to get full response data (AuthContext strips details)
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
            // Old format without userId — retry to trigger OTP
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

      // Login succeeded — use AuthContext to set state/cookies/redirect
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
      // Phone verified — now login through AuthContext
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    setResending(true);
    try {
      if (verifyUserId) {
        await api.resendOTP(verifyUserId);
      } else {
        // Trigger login again to generate new OTP
        const retry = await api.login(email, password);
        if (retry.responseData?.userId) {
          setVerifyUserId(retry.responseData.userId);
          setVerifyPhone(retry.responseData.phone || retry.responseData.otpSentTo || "");
        }
      }
    } catch {}
    setTimeout(() => setResending(false), 30000);
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
              <label className="sr-only" htmlFor="lang-select">
                {tr("common.language")}
              </label>
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

          {needsVerification ? (
            /* OTP Verification Form */
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
                    disabled={resending}
                    className="text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400"
                  >
                    {resending
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
          ) : (
          <>
          {/* Form */}
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

      {/* Right Side - Features */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 to-primary-800 p-12 items-center justify-center">
        <div className="max-w-md text-white">
          <img src="/logo-white.png" alt="TechTrust" className="w-16 h-16 mb-6 drop-shadow-lg" />
          <h2 className="text-3xl font-bold mb-6">{tr("client.heroTitle")}</h2>
          <p className="text-primary-100 mb-10 text-lg">
            {tr("client.heroDescription")}
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  {tr("client.features.verified")}
                </h3>
                <p className="text-primary-100">
                  {tr("client.features.verified")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  {tr("client.features.quotes")}
                </h3>
                <p className="text-primary-100">
                  {tr("client.features.quotes")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  {tr("client.features.quality")}
                </h3>
                <p className="text-primary-100">
                  {tr("client.features.quality")}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-3xl font-bold">50k+</p>
                <p className="text-primary-200 text-sm">
                  {tr("client.stats.customers")}
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold">500+</p>
                <p className="text-primary-200 text-sm">
                  {tr("client.stats.providers")}
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold">4.9</p>
                <p className="text-primary-200 text-sm">
                  {tr("client.stats.rating")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Car, Mail, Lock, Key, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { useI18n } from '../i18n';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

type Step = 'email' | 'code' | 'password' | 'success';

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const { translate } = useI18n();
  const tr = translate;

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiPost = async (endpoint: string, body: any) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw { response: { data } };
    return data;
  };

  // Step 1
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/auth/forgot-password', { email: email.trim().toLowerCase() });
    } catch { /* proceed anyway */ }
    setStep('code');
    setLoading(false);
  };

  // Step 2
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.trim().length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setStep('password');
  };

  // Step 3
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) { setError('Password must contain at least 1 letter and 1 number'); return; }

    setLoading(true);
    try {
      await apiPost('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        token: code.trim(),
        newPassword,
      });
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['email', 'code', 'password'] as const;
  const currentStepIndex = steps.indexOf(step as any);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
            <Car className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tr('brand.name')}</h1>
            <p className="text-sm text-gray-500">{tr('client.subtitle')}</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Step Indicator */}
          {step !== 'success' && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {steps.map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    currentStepIndex > i ? 'bg-green-500 text-white' :
                    currentStepIndex === i ? 'bg-primary-600 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStepIndex > i ? '✓' : i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-12 h-0.5 ${currentStepIndex > i ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* STEP 1: Email */}
          {step === 'email' && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{tr('auth.forgotPassword')}</h2>
                <p className="text-gray-600">Enter your email and we'll send a 6-digit code to reset your password.</p>
              </div>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
                      className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none" disabled={loading} required />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Send Code'}
                </button>
              </form>
            </>
          )}

          {/* STEP 2: Code */}
          {step === 'code' && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Code</h2>
                <p className="text-gray-600">We sent a 6-digit code to <strong>{email}</strong></p>
              </div>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6}
                  className="w-full text-center text-2xl tracking-[0.5em] font-bold py-4 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none" />
                <button type="submit" disabled={code.length !== 6} className="btn btn-primary w-full py-3 disabled:opacity-50">Verify Code</button>
                <button type="button" onClick={(e) => handleSendCode(e as any)} className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2">Resend Code</button>
              </form>
            </>
          )}

          {/* STEP 3: Password */}
          {step === 'password' && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">New Password</h2>
                <p className="text-gray-600">Create a strong new password for your account.</p>
              </div>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none" disabled={loading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Min. 8 characters, 1 letter, 1 number</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none" disabled={loading} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h2>
              <p className="text-gray-600 mb-6">Your password has been reset successfully. You can now log in with your new password.</p>
              <button onClick={() => router.push('/login')} className="btn btn-primary w-full py-3">Go to Login</button>
            </div>
          )}

          {/* Back */}
          {step !== 'success' && (
            <div className="mt-6 text-center">
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

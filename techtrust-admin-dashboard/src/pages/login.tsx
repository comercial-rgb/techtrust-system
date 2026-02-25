import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle, Globe2 } from 'lucide-react';
import { useI18n, languages, Language } from '../i18n';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const { translate, language, setLanguage } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tr = translate;

  // Redirect if already authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-admin-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    router.replace('/dashboard');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || tr('auth.loginError'));
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 flex flex-col items-center gap-3">
            <img src="/logo-vertical.png" alt="TechTrust" className="h-20 w-auto mx-auto" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tr('brand.adminPortal')}</h1>
              <p className="text-gray-500 mt-1">{tr('brand.subtitleAdmin')}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe2 className="w-4 h-4" />
              <label className="sr-only" htmlFor="lang-select">{tr('common.language')}</label>
              <select
                id="lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-admin-200"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tr('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="admin@techtrust.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tr('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input !pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {tr('auth.signingIn')}
                </span>
              ) : (
                tr('auth.signIn')
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              {tr('auth.restricted')}
            </p>
          </div>

          {/* Dev credentials hint */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              <strong>{tr('auth.devCredentials')}:</strong><br />
              {tr('auth.devEmail')}: admin@techtrust.com<br />
              {tr('auth.devPassword')}: admin123
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-admin-600 to-admin-800 items-center justify-center p-12">
        <div className="max-w-lg text-center text-white">
          <img src="/logo-white.png" alt="TechTrust" className="w-16 h-16 mx-auto mb-6 drop-shadow-lg" />
          <h2 className="text-3xl font-bold mb-4">{tr('admin.heroTitle')}</h2>
          <p className="text-admin-200 text-lg">
            {tr('admin.heroDescription')}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-3xl font-bold">100%</p>
              <p className="text-sm text-admin-200">{tr('admin.stats.control')}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-3xl font-bold">24/7</p>
              <p className="text-sm text-admin-200">{tr('admin.stats.monitoring')}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-3xl font-bold">Real-time</p>
              <p className="text-sm text-admin-200">{tr('admin.stats.realtime')}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-3xl font-bold">{tr('admin.stats.secure')}</p>
              <p className="text-sm text-admin-200">Auditoria</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

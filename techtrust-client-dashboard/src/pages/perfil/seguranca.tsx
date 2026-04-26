import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  ChevronLeft, Lock, Shield, Bell, Eye, EyeOff, ChevronRight,
  CheckCircle, AlertCircle, Laptop, Smartphone, Tablet, LogOut, AlertTriangle,
} from 'lucide-react';

interface Session {
  id: string;
  deviceName: string;
  deviceType: string;
  ipAddress?: string;
  lastActiveAt: string;
  isCurrentSession: boolean;
}

export default function SegurancaPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [loginNotifications, setLoginNotifications] = useState(true);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokeLoading, setRevokeLoading] = useState('');
  const [revokeAllConfirm, setRevokeAllConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) loadSessions();
  }, [isAuthenticated]);

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const res = await api.getSessions();
      setSessions((res.data as any) || []);
    } catch {
      setSessions([{ id: 'current', deviceName: 'This Device', deviceType: 'desktop', lastActiveAt: new Date().toISOString(), isCurrentSession: true }]);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function handleChangePassword() {
    setPwdError('');
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdError('All fields are required'); return; }
    if (newPwd !== confirmPwd) { setPwdError('New passwords do not match'); return; }
    if (newPwd.length < 8) { setPwdError('Password must be at least 8 characters'); return; }
    setSavingPwd(true);
    try {
      const res = await api.changePassword(currentPwd, newPwd);
      if (res.error) { setPwdError(res.error); return; }
      setPwdSuccess('Password changed successfully!');
      setShowPasswordForm(false);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setTimeout(() => setPwdSuccess(''), 5000);
    } catch {
      setPwdError('Failed to change password. Please try again.');
    } finally {
      setSavingPwd(false);
    }
  }

  async function revokeSession(sessionId?: string) {
    setRevokeLoading(sessionId || 'all');
    try {
      await api.revokeSession(sessionId);
      if (sessionId) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        setSessions(prev => prev.filter(s => s.isCurrentSession));
        setRevokeAllConfirm(false);
      }
    } catch { /* silently fail */ }
    setRevokeLoading('');
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Active now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function deviceIcon(type: string) {
    if (type === 'mobile') return Smartphone;
    if (type === 'tablet') return Tablet;
    return Laptop;
  }

  function passwordStrength(pwd: string) {
    if (pwd.length === 0) return null;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return { label: 'Weak', color: 'bg-red-400', width: '33%' };
    if (score <= 3) return { label: 'Fair', color: 'bg-yellow-400', width: '60%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  }

  const strength = passwordStrength(newPwd);
  const otherSessions = sessions.filter(s => !s.isCurrentSession);

  return (
    <DashboardLayout title="Security">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <button onClick={() => router.push('/perfil')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">My Profile</span>
        </button>

        {/* Password success */}
        {pwdSuccess && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-5">
            <CheckCircle className="w-5 h-5 flex-shrink-0" /> {pwdSuccess}
          </div>
        )}

        {/* Password Section */}
        <div className="bg-white rounded-2xl shadow-soft mb-5">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary-600" /> Password
            </h3>
          </div>

          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Change Password</p>
                  <p className="text-sm text-gray-500">Last changed 3 months ago</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ) : (
            <div className="px-6 py-5">
              <div className="space-y-4">
                {pwdError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {pwdError}
                  </div>
                )}

                {/* Current password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPwd}
                      onChange={e => setCurrentPwd(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPwd}
                      onChange={e => setNewPwd(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {strength && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Strength</span>
                        <span className={`text-xs font-semibold ${strength.label === 'Weak' ? 'text-red-500' : strength.label === 'Fair' ? 'text-yellow-600' : 'text-green-600'}`}>{strength.label}</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="Repeat new password"
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all ${
                      confirmPwd && newPwd !== confirmPwd ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  {confirmPwd && newPwd !== confirmPwd && (
                    <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => { setShowPasswordForm(false); setPwdError(''); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); }} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all">Cancel</button>
                <button
                  onClick={handleChangePassword}
                  disabled={savingPwd}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingPwd ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : 'Change Password'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl shadow-soft mb-5">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" /> Security Settings
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              {
                icon: Shield, iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
                label: 'Two-Factor Authentication',
                desc: '2FA enabled via SMS to your phone',
                value: twoFactorEnabled,
                onChange: setTwoFactorEnabled,
              },
              {
                icon: Bell, iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
                label: 'Login Notifications',
                desc: 'Email alert when a new device signs in',
                value: loginNotifications,
                onChange: setLoginNotifications,
              },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.iconBg}`}>
                      <Icon className={`w-5 h-5 ${item.iconColor}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={item.value} onChange={e => item.onChange(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-white rounded-2xl shadow-soft mb-5">
          <div className="px-6 py-5 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Laptop className="w-5 h-5 text-gray-600" /> Active Sessions
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">Devices currently signed in to your account</p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {sessionsLoading ? (
              <div className="px-6 py-8 text-center">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : sessions.map(session => {
              const DeviceIcon = deviceIcon(session.deviceType);
              return (
                <div
                  key={session.id}
                  className={`flex items-center gap-4 px-6 py-4 ${session.isCurrentSession ? 'bg-emerald-50/50' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${session.isCurrentSession ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                    <DeviceIcon className={`w-5 h-5 ${session.isCurrentSession ? 'text-emerald-600' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">
                        {session.isCurrentSession ? 'This Device' : session.deviceName}
                      </p>
                      {session.isCurrentSession && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">CURRENT</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {session.deviceName}
                      {session.ipAddress ? ` · ${session.ipAddress.replace(/\d+$/, 'xxx')}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">{session.isCurrentSession ? 'Active now' : `Last active ${timeAgo(session.lastActiveAt)}`}</p>
                  </div>
                  {!session.isCurrentSession && (
                    <button
                      onClick={() => revokeSession(session.id)}
                      disabled={revokeLoading === session.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign out
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {otherSessions.length > 0 && (
            <div className="px-6 pb-5">
              {!revokeAllConfirm ? (
                <button
                  onClick={() => setRevokeAllConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out All Other Devices
                </button>
              ) : (
                <div className="bg-red-50 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">This will sign out <strong>{otherSessions.length} other device(s)</strong>. They'll need to log in again.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setRevokeAllConfirm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium bg-white hover:bg-gray-50 transition-colors">Cancel</button>
                    <button onClick={() => revokeSession()} disabled={revokeLoading === 'all'} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                      {revokeLoading === 'all' ? 'Signing out...' : 'Confirm Sign Out'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

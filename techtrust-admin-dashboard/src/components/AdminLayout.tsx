import { ReactNode, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useI18n, languages, Language } from '../i18n';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Wrench,
  CreditCard,
  Star,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  BarChart3,
  MessageSquare,
  Tag,
  History,
  Megaphone,
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

const menuItems = [
  { href: '/dashboard', key: 'admin.nav.dashboard', icon: LayoutDashboard },
  { href: '/usuarios', key: 'admin.nav.users', icon: Users },
  { href: '/fornecedores', key: 'admin.nav.providers', icon: Building2 },
  { href: '/solicitacoes', key: 'admin.nav.requests', icon: FileText },
  { href: '/servicos', key: 'admin.nav.services', icon: Wrench },
  { href: '/pagamentos', key: 'admin.nav.payments', icon: CreditCard },
  { href: '/avaliacoes', key: 'admin.nav.reviews', icon: Star },
  { href: '/assinaturas', key: 'admin.nav.subscriptions', icon: Tag },
  { href: '/conteudo', key: 'admin.nav.content', icon: Megaphone },
  { href: '/relatorios', key: 'admin.nav.reports', icon: BarChart3 },
  { href: '/suporte', key: 'admin.nav.support', icon: MessageSquare },
  { href: '/notificacoes', key: 'admin.nav.notifications', icon: Bell },
  { href: '/logs', key: 'admin.nav.logs', icon: History },
  { href: '/configuracoes', key: 'admin.nav.settings', icon: Settings },
];

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { translate, language, setLanguage } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const tr = translate;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-admin-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">TechTrust</span>
            <span className="text-xs bg-admin-100 text-admin-700 px-2 py-0.5 rounded-full font-medium">
              {tr('brand.adminPortal')}
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-5 h-5" />
                {tr(item.key)}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-6 h-6" />
            </button>
            {title && <h1 className="text-xl font-bold text-gray-900">{title}</h1>}
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
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
            <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg" aria-label={tr('common.notifications')}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 hover:bg-gray-100 rounded-lg p-2"
              >
                <div className="w-8 h-8 bg-admin-100 rounded-full flex items-center justify-center">
                  <span className="text-admin-700 font-semibold text-sm">
                    {user?.fullName?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                  <p className="text-xs text-gray-500">{tr('admin.layout.role')}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <Link
                      href="/perfil"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      <Users className="w-4 h-4" />
                      {tr('admin.layout.profile')}
                    </Link>
                    <Link
                      href="/configuracoes"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4" />
                      {tr('admin.layout.settings')}
                    </Link>
                    <hr className="my-2" />
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      {tr('admin.layout.logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

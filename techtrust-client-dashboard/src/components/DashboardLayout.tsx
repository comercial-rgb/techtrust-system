import React, { useState, ReactNode, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";
import LangSelector from "./LangSelector";
import {
  Home,
  Car,
  FileText,
  Briefcase,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  CreditCard,
  Receipt,
  Crown,
  CheckCheck,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

const menuItems = [
  { href: "/dashboard", labelKey: "client.nav.home", icon: Home },
  { href: "/veiculos", labelKey: "client.nav.vehicles", icon: Car },
  { href: "/solicitacoes", labelKey: "client.nav.requests", icon: FileText },
  { href: "/orcamentos", labelKey: "client.nav.estimates", icon: FileText },
  { href: "/faturas", labelKey: "client.nav.invoices", icon: Receipt },
  { href: "/servicos", labelKey: "client.nav.services", icon: Briefcase },
  { href: "/pagamentos", labelKey: "client.nav.payments", icon: CreditCard },
  { href: "/recibos", labelKey: "client.nav.receipts", icon: Receipt },
  { href: "/planos", labelKey: "client.nav.plans", icon: Crown },
  { href: "/perfil", labelKey: "client.nav.profile", icon: User },
];

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
}

export default function DashboardLayout({
  children,
  title,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { translate, language, setLanguage } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const tr = translate;

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
        {
          headers: {
            Authorization: `Bearer ${document.cookie
              .split("; ")
              .find((r) => r.startsWith("tt_client_token="))
              ?.split("=")[1] || ""}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const list = data?.data || data || [];
        setNotifications(Array.isArray(list) ? list : []);
      }
    } catch {
      setNotifications([]);
    }
  }

  async function markAllRead() {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read-all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${document.cookie
            .split("; ")
            .find((r) => r.startsWith("tt_client_token="))
            ?.split("=")[1] || ""}`,
        },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return router.pathname === "/dashboard";
    }
    return router.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/favicon.png" alt="TechTrust" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-bold text-gray-900">
              {tr("brand.name")}
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-semibold">
                {user?.fullName?.charAt(0) || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.fullName || tr("client.layout.profile")}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active
                    ? "bg-primary-50 text-primary-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${active ? "text-primary-600" : "text-gray-400"}`}
                />
                <span className="font-medium">{tr(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">{tr("client.nav.logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <span className="sr-only">{tr("common.language")}</span>
                <LangSelector language={language} setLanguage={setLanguage} />
              </div>

              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 hover:bg-gray-100 rounded-lg"
                  aria-label={tr("common.notifications.title") || "Notifications"}
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {tr("common.notifications.title") || "Notifications"}
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                        >
                          <CheckCheck className="w-3 h-3" />
                          {tr("common.notifications.markAllRead") || "Mark all read"}
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-500">
                            {tr("common.notifications.empty") || "No notifications"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {tr("common.notifications.emptyDesc") || "You're all caught up!"}
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.read ? "bg-primary-50/40" : ""}`}
                          >
                            {!n.read && (
                              <span className="inline-block w-2 h-2 bg-primary-500 rounded-full mr-2 align-middle" />
                            )}
                            <p className="text-sm font-medium text-gray-900 inline">{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-sm">
                      {user?.fullName?.charAt(0) || "U"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <Link
                        href="/perfil"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {tr("client.layout.profile")}
                      </Link>
                      <hr className="my-1" />
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        {tr("client.layout.logout")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

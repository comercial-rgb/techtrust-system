"use client";

import React, { useState, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, languages, Language } from "@/i18n";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Briefcase,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  User,
  Star,
  Wrench,
  Shield,
  Receipt,
  Droplets,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

const menuItems = [
  { href: "/dashboard", icon: LayoutDashboard, key: "provider.nav.dashboard" },
  { href: "/pedidos", icon: ClipboardList, key: "provider.nav.requests" },
  { href: "/orcamentos", icon: FileText, key: "provider.nav.quotes" },
  { href: "/faturas", icon: Receipt, key: "provider.nav.invoices" },
  { href: "/servicos", icon: Briefcase, key: "provider.nav.services" },
  { href: "/car-wash", icon: Droplets, key: "provider.nav.carWash" },
  { href: "/compliance", icon: Shield, key: "provider.nav.compliance" },
  { href: "/configuracoes", icon: Settings, key: "provider.nav.settings" },
];

export default function DashboardLayout({
  children,
  title,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { translate, language, setLanguage } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (href: string) =>
    router.pathname === href || router.pathname.startsWith(href + "/");
  const tr = translate;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-100 
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              {tr("brand.name")}
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Provider info */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.providerProfile?.businessName || user?.fullName}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>
                  {user?.providerProfile?.averageRating?.toFixed(1) || "0.0"}
                </span>
                <span className="text-gray-300">•</span>
                <span>
                  {user?.providerProfile?.totalReviews || 0}{" "}
                  {tr("provider.layout.rating")}
                </span>
              </div>
            </div>
          </div>
          {user?.providerProfile?.isVerified && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {tr("provider.layout.verified")}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${
                    active
                      ? "bg-primary-50 text-primary-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <Icon
                  className={`w-5 h-5 ${active ? "text-primary-500" : "text-gray-400"}`}
                />
                {tr(item.key)}
                {item.href === "/pedidos" && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-primary-500 text-white rounded-full">
                    3
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {tr("provider.layout.logout")}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              {title && (
                <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
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
              {/* Notifications */}
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                      <Link
                        href="/configuracoes"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        {tr("provider.layout.settings")}
                      </Link>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        {tr("provider.layout.logout")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

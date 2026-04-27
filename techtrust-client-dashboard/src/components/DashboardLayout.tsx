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
  MessageCircle,
  Bot,
  Send,
  Loader2,
} from "lucide-react";

interface ChatMessage {
  id: string;
  from: "bot" | "user";
  text: string;
  time: string;
  quickReplies?: string[];
}

const BOT_REPLIES: Record<string, string> = {
  quote: "To get a quote, go to **New Request**, select your vehicle and service type. Providers will respond within minutes.",
  payment: "We accept credit/debit cards via Stripe. Manage payment methods under **My Profile → Payment Methods**.",
  cancel: "You can cancel a pending request from **My Requests**. Select the request and tap 'Cancel'. Free before a provider is assigned.",
  account: "Visit **My Profile → Personal Data** to update your info, or **Security** to change your password.",
  vehicle: "Add or manage vehicles from the **My Vehicles** section. Tap the + button to register a new one.",
  invoice: "Service invoices are in **My Requests** after a job is completed. You can view, accept, or dispute them.",
  human: "Connecting you with a support agent. Our team responds within 2 hours (Mon–Fri, 8am–8pm EST).",
  default: "Thanks for reaching out! Support is available Mon–Fri 8am–8pm EST. You can also email support@techtrust.app.",
};

function getChatReply(text: string): { text: string; quickReplies?: string[] } {
  const l = text.toLowerCase();
  if (l.includes("quote") || l.includes("estimate") || l.includes("price")) return { text: BOT_REPLIES.quote };
  if (l.includes("pay") || l.includes("card") || l.includes("billing")) return { text: BOT_REPLIES.payment };
  if (l.includes("cancel")) return { text: BOT_REPLIES.cancel };
  if (l.includes("account") || l.includes("profile") || l.includes("password")) return { text: BOT_REPLIES.account };
  if (l.includes("vehicle") || l.includes("car") || l.includes("truck")) return { text: BOT_REPLIES.vehicle };
  if (l.includes("invoice") || l.includes("bill")) return { text: BOT_REPLIES.invoice };
  if (l.includes("human") || l.includes("agent") || l.includes("person")) return { text: BOT_REPLIES.human };
  return { text: BOT_REPLIES.default, quickReplies: ["Get a quote", "Payment help", "Cancel a request", "Talk to agent"] };
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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

  // Floating chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatTyping, setChatTyping] = useState(false);
  const [chatHasNew, setChatHasNew] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      from: "bot",
      text: "Hi! I'm TechTrust Support. How can I help you today?",
      time: nowTime(),
      quickReplies: ["Get a quote", "Payment help", "Cancel a request", "Talk to agent"],
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatTyping]);

  useEffect(() => {
    if (chatOpen) {
      setChatHasNew(false);
      setTimeout(() => chatInputRef.current?.focus(), 200);
    }
  }, [chatOpen]);

  function sendChatMessage(text?: string) {
    const content = (text || chatInput).trim();
    if (!content) return;
    setChatInput("");
    const userMsg: ChatMessage = { id: Date.now().toString(), from: "user", text: content, time: nowTime() };
    setChatMessages((p) => [...p, userMsg]);
    setChatTyping(true);
    setTimeout(() => {
      const reply = getChatReply(content);
      setChatTyping(false);
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), from: "bot", text: reply.text, time: nowTime(), quickReplies: reply.quickReplies };
      setChatMessages((p) => [...p, botMsg]);
      if (!chatOpen) setChatHasNew(true);
    }, 1200 + Math.random() * 500);
  }

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

      {/* ── Floating Support Chat (left side of content area) ── */}
      <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3">
        {/* Chat panel */}
        {chatOpen && (
          <div className="w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
            style={{ height: "460px" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 flex-shrink-0">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">TechTrust Support</p>
                <p className="text-[11px] text-primary-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Online
                </p>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50 text-sm">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.from === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.from === "bot" ? "bg-primary-100" : "bg-gray-200"}`}>
                    {msg.from === "bot"
                      ? <Bot className="w-3.5 h-3.5 text-primary-600" />
                      : <User className="w-3.5 h-3.5 text-gray-600" />}
                  </div>
                  <div className={`max-w-[78%] flex flex-col gap-1 ${msg.from === "user" ? "items-end" : "items-start"}`}>
                    <div className={`px-3 py-2 rounded-2xl leading-relaxed ${
                      msg.from === "user"
                        ? "bg-primary-600 text-white rounded-tr-sm"
                        : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm"
                    }`}>
                      {msg.text.split("**").map((p, i) =>
                        i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 px-1">{msg.time}</span>
                    {msg.quickReplies && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {msg.quickReplies.map((qr) => (
                          <button key={qr} onClick={() => sendChatMessage(qr)}
                            className="text-[11px] px-2.5 py-1 rounded-full border border-primary-200 text-primary-600 hover:bg-primary-50 font-medium transition-colors">
                            {qr}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatTyping && (
                <div className="flex gap-2 items-end">
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-primary-600" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm border border-gray-100 flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2.5 bg-white border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-primary-400 focus-within:bg-white transition-all">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                />
                <button
                  onClick={() => sendChatMessage()}
                  disabled={!chatInput.trim() || chatTyping}
                  className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-40"
                >
                  {chatTyping ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-1.5">
                Powered by TechTrust AI ·{" "}
                <button onClick={() => sendChatMessage("human")} className="underline hover:text-gray-600">
                  Talk to a human
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setChatOpen((p) => !p)}
          className={`relative flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg transition-all font-semibold text-sm ${
            chatOpen
              ? "bg-gray-800 text-white hover:bg-gray-700"
              : "bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:shadow-primary-200 hover:shadow-xl hover:scale-105"
          }`}
        >
          {chatOpen ? <X className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
          <span>{chatOpen ? "Close" : "Support"}</span>
          {chatHasNew && !chatOpen && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
          )}
        </button>
      </div>
    </div>
  );
}

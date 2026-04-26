import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import {
  ChevronLeft, Headphones, MessageCircle, Mail, Phone,
  Clock, Send, Bot, User, ExternalLink, ChevronRight,
  CheckCircle, X, Loader2,
} from 'lucide-react';

interface Message {
  id: string;
  from: 'bot' | 'user';
  text: string;
  time: string;
  quickReplies?: string[];
}

const BOT_RESPONSES: Record<string, string> = {
  quote: "To get a quote, go to **New Request**, select your vehicle and service type. Providers will send you competitive quotes within minutes.",
  payment: "We accept credit/debit cards and Stripe-secured payments. You can manage your payment methods under My Profile → Payment Methods.",
  cancel: "You can cancel a pending service request from the **My Requests** page. Select the request and tap 'Cancel Request'. Cancellation is free before a provider is assigned.",
  account: "For account-related issues, visit **My Profile → Personal Data** to update your information, or **Security** to change your password.",
  vehicle: "You can add or manage your vehicles from the **My Vehicles** section on the dashboard. Tap the + button to register a new vehicle.",
  invoice: "Service invoices are available in **My Requests** after a job is completed. You can view, accept, or dispute any invoice there.",
  provider: "Providers are rated by other customers. You can view their rating, reviews, and response time before accepting a quote.",
  emergency: "For roadside emergencies, create a new request with **EMERGENCY** urgency. Nearby providers will be notified immediately.",
  human: "I'm connecting you with a support agent now. Our team typically responds within 2 hours during business hours (Mon–Fri, 8am–8pm EST).",
  default: "Thanks for reaching out! Our support team is available Mon–Fri, 8am–8pm EST. You can also email us at support@techtrust.app or call +1 (407) 900-0000.",
};

function getBotReply(text: string): { text: string; quickReplies?: string[] } {
  const lower = text.toLowerCase();
  if (lower.includes('quote') || lower.includes('estimate') || lower.includes('price')) return { text: BOT_RESPONSES.quote };
  if (lower.includes('pay') || lower.includes('card') || lower.includes('billing')) return { text: BOT_RESPONSES.payment };
  if (lower.includes('cancel')) return { text: BOT_RESPONSES.cancel };
  if (lower.includes('account') || lower.includes('profile') || lower.includes('password')) return { text: BOT_RESPONSES.account };
  if (lower.includes('vehicle') || lower.includes('car') || lower.includes('truck')) return { text: BOT_RESPONSES.vehicle };
  if (lower.includes('invoice') || lower.includes('bill') || lower.includes('receipt')) return { text: BOT_RESPONSES.invoice };
  if (lower.includes('provider') || lower.includes('mechanic') || lower.includes('technician')) return { text: BOT_RESPONSES.provider };
  if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('roadside')) return { text: BOT_RESPONSES.emergency };
  if (lower.includes('human') || lower.includes('agent') || lower.includes('person') || lower.includes('real')) return { text: BOT_RESPONSES.human };
  return {
    text: BOT_RESPONSES.default,
    quickReplies: ['Get a quote', 'Payment help', 'Cancel a request', 'Talk to an agent'],
  };
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const CONTACT_OPTIONS = [
  {
    icon: MessageCircle,
    bg: 'from-primary-500 to-primary-600',
    title: 'Live Chat',
    subtitle: 'Chat with our support team',
    badge: 'Online',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    action: 'chat',
  },
  {
    icon: Mail,
    bg: 'from-violet-500 to-purple-600',
    title: 'Email Support',
    subtitle: 'support@techtrust.app',
    badge: '< 24h reply',
    badgeColor: 'bg-violet-100 text-violet-700',
    action: 'email',
  },
  {
    icon: Phone,
    bg: 'from-emerald-500 to-teal-600',
    title: 'Phone Support',
    subtitle: '+1 (407) 900-0000',
    badge: 'Mon–Fri',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    action: 'phone',
  },
];

export default function FaleConoscoPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      from: 'bot',
      text: "Hi! I'm TechTrust Support. How can I help you today?",
      time: now(),
      quickReplies: ['Get a quote', 'Payment help', 'Cancel a request', 'Talk to an agent'],
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [chatOpen]);

  function sendMessage(text?: string) {
    const content = (text || inputText).trim();
    if (!content) return;
    setInputText('');

    const userMsg: Message = { id: Date.now().toString(), from: 'user', text: content, time: now() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const reply = getBotReply(content);
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), from: 'bot', text: reply.text, time: now(), quickReplies: reply.quickReplies },
      ]);
    }, 1200 + Math.random() * 600);
  }

  function handleAction(action: string) {
    if (action === 'chat') { setChatOpen(true); return; }
    if (action === 'email') { window.location.href = 'mailto:support@techtrust.app'; return; }
    if (action === 'phone') { window.location.href = 'tel:+14079000000'; return; }
  }

  if (authLoading) return null;

  return (
    <DashboardLayout title="Contact Us">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <button
          onClick={() => router.push('/perfil')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">My Profile</span>
        </button>

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-2xl p-8 mb-8 overflow-hidden text-white">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg backdrop-blur-sm">
              <Headphones className="w-10 h-10 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold mb-1">How can we help you?</h1>
              <p className="text-primary-200 text-sm leading-relaxed max-w-md">
                Our support team is ready to assist you. Choose your preferred contact method below or start a live chat.
              </p>
              <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/20 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Support is online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Option Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {CONTACT_OPTIONS.map(opt => {
            const IconComp = opt.icon;
            return (
              <button
                key={opt.action}
                onClick={() => handleAction(opt.action)}
                className="group bg-white rounded-2xl shadow-soft p-5 text-left hover:shadow-md transition-all hover:-translate-y-0.5 border border-transparent hover:border-primary-100"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${opt.bg} flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform`}>
                  <IconComp className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-900 text-sm">{opt.title}</h3>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-gray-500 mb-3">{opt.subtitle}</p>
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${opt.badgeColor}`}>
                  {opt.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Support Hours */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-600" /> Support Hours
          </h3>
          <div className="space-y-3">
            {[
              { day: 'Monday – Friday', hours: '8:00 AM – 8:00 PM EST', available: true },
              { day: 'Saturday', hours: '9:00 AM – 5:00 PM EST', available: true },
              { day: 'Sunday', hours: 'Emergency support only', available: false },
            ].map(item => (
              <div key={item.day} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm font-medium text-gray-700">{item.day}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{item.hours}</span>
                  <span className={`w-2 h-2 rounded-full ${item.available ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            Emergency requests are handled 24/7 through the app
          </p>
        </div>

        {/* Quick Topics */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
          <h3 className="text-base font-bold text-gray-900 mb-4">Common Topics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'How to get a quote', category: 'quote' },
              { label: 'Payment & billing issues', category: 'payment' },
              { label: 'Cancel a service request', category: 'cancel' },
              { label: 'Account & profile help', category: 'account' },
              { label: 'Add or manage vehicles', category: 'vehicle' },
              { label: 'Dispute an invoice', category: 'invoice' },
            ].map(topic => (
              <button
                key={topic.label}
                onClick={() => { setChatOpen(true); setTimeout(() => sendMessage(topic.category), 400); }}
                className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-primary-50 hover:text-primary-700 text-gray-700 text-sm font-medium transition-all group border border-transparent hover:border-primary-100"
              >
                <span>{topic.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* Start Chat CTA */}
        <div className="bg-gradient-to-r from-primary-50 to-violet-50 rounded-2xl p-6 border border-primary-100 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div>
            <h3 className="font-bold text-gray-900 mb-1">Need immediate help?</h3>
            <p className="text-sm text-gray-500">Start a live chat and get answers in real time.</p>
          </div>
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl shadow-md shadow-primary-200 hover:from-primary-700 hover:to-primary-800 transition-all whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4" />
            Start Live Chat
          </button>
        </div>
      </div>

      {/* Chat Panel */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:w-[420px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '85vh', maxHeight: '600px' }}>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white flex-shrink-0">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">TechTrust Support</p>
                <p className="text-xs text-primary-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  Online · typically replies instantly
                </p>
              </div>
              <button onClick={() => setChatOpen(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.from === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.from === 'bot' ? 'bg-primary-100' : 'bg-gray-200'}`}>
                    {msg.from === 'bot' ? <Bot className="w-4 h-4 text-primary-600" /> : <User className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div className={`max-w-[75%] ${msg.from === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.from === 'user'
                        ? 'bg-primary-600 text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 shadow-sm rounded-tl-sm border border-gray-100'
                    }`}>
                      {msg.text.split('**').map((part, i) =>
                        i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 px-1">{msg.time}</span>
                    {msg.quickReplies && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {msg.quickReplies.map(qr => (
                          <button
                            key={qr}
                            onClick={() => sendMessage(qr)}
                            className="text-xs px-3 py-1.5 rounded-full border-2 border-primary-200 text-primary-600 hover:bg-primary-50 font-medium transition-colors"
                          >
                            {qr}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2 items-end">
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 focus-within:border-primary-400 focus-within:bg-white transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!inputText.trim() || isTyping}
                  className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  {isTyping ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-2">
                Powered by TechTrust AI · <button onClick={() => sendMessage('human')} className="underline hover:text-gray-600">Talk to a human</button>
              </p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

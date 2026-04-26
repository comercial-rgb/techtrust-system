import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import {
  ChevronLeft, Search, ChevronDown, ChevronUp, MessageCircle,
  AlertTriangle, Heart, User, CreditCard, Car, Wrench, HelpCircle,
  X, Send, Bot,
} from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ChatMsg {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'agent';
  time: Date;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: HelpCircle },
  { id: 'account', label: 'Account', icon: User },
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
];

const FAQS: FAQ[] = [
  { id: '1', category: 'services', question: 'How do I request a service quote?', answer: 'Go to the Home tab and click "New Request". Select your vehicle, describe the service, set your urgency level, and submit. Local verified providers will respond with quotes within hours. You can compare quotes and accept the best one.' },
  { id: '2', category: 'vehicles', question: 'How do I add a new vehicle?', answer: "Go to My Vehicles and click \"Add Vehicle\". Enter your vehicle's make, model, year, and license plate number. You can also add optional details like VIN, color, and current mileage. The first vehicle you add becomes your default vehicle." },
  { id: '3', category: 'payments', question: 'How does payment work?', answer: 'TechTrust uses a secure pre-authorization model. When you accept a quote, a temporary hold is placed on your card for the quoted amount. Your card is NOT charged until you review and approve the completed service. You can manage payment methods in Profile > Payment Methods.' },
  { id: '4', category: 'services', question: 'Can I cancel a service request?', answer: 'Yes. Before accepting a quote: cancel at no cost. After accepting a quote: cancellations more than 24 hours after acceptance incur a 10% fee; within 24 hours, a 25% fee applies. Once service has started, cancellation requires provider validation. Use the "Cancel" button on the service details screen.' },
  { id: '5', category: 'account', question: 'How do I change my email or phone?', answer: 'Go to Profile > Personal Information. Your email and phone are verified fields — contact our support team to change them. You can update your full name, gender, and birth date yourself by clicking the Edit button.' },
  { id: '6', category: 'payments', question: 'Is my payment information secure?', answer: 'Yes. All payment processing is handled through PCI-DSS compliant processors (Stripe). We never store your full card number on our servers. All data is encrypted using TLS/SSL in transit and at rest.' },
  { id: '7', category: 'services', question: 'How do I rate a service provider?', answer: "After a service is completed and payment is approved, you'll be prompted to rate your experience (1-5 stars). You can also rate later by going to My Services > completed service > Leave a Review." },
  { id: '8', category: 'services', question: "What if I'm not satisfied with a service?", answer: "Contact the provider first using the in-app messaging. If you can't resolve the issue, contact our support team through Contact Us. We'll help mediate. For payment disputes, use the 'Report Issue' button on the service details within 48 hours of approval." },
  { id: '9', category: 'account', question: 'How do I delete my account?', answer: 'Go to Profile > Personal Information and scroll to the Danger Zone section. Click Delete Account. Note that this is irreversible and will permanently delete all your data including service history, vehicles, and payment methods.' },
  { id: '10', category: 'payments', question: 'How do refunds work?', answer: 'Submit refund requests within 48 hours of service approval using the "Report Issue" button on the service details. Approved refunds are processed to your original payment method within 5-10 business days. You can also opt for platform credit with a 10% bonus on the refund amount.' },
];

const BOT_RESPONSES: Record<string, string> = {
  quote: 'To request a quote, go to Home and click "New Request". Select your vehicle, describe the service, and submit. Providers will respond within hours!',
  payment: 'For payment issues, go to Profile > Payment Methods to manage your cards. If you see an incorrect charge, use "Report Issue" on the service details screen.',
  cancel: 'You can cancel before accepting a quote at no cost. After accepting: >24h = 10% fee, <24h = 25% fee. Use the "Cancel" button on service details.',
  account: 'For account changes, go to Profile > Personal Information. You can update name, gender, and birth date. Contact support to change email or phone.',
  vehicle: 'To add a vehicle, go to My Vehicles and click "Add Vehicle". Enter make, model, year, and plate number. You can manage all your vehicles from that screen.',
  human: "I'm connecting you to a support agent. Our team is available Mon–Fri 8am–8pm EST. Average wait time: under 5 minutes. You'll be notified when an agent joins.",
  default: "Thanks for your message! I can help with quotes, payments, vehicles, cancellations, and account questions. Try a quick reply below or describe your issue.",
};

const QUICK_REPLIES = ['How do I get a quote?', 'Payment issue', 'Cancel a service', 'Vehicle help', 'Talk to an agent'];

export default function CentralDeAjudaPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  function openChat() {
    setShowChat(true);
    if (chatMessages.length === 0) {
      setChatMessages([{ id: '0', text: "Hi! 👋 I'm TechTrust's virtual assistant. How can I help you today?", sender: 'bot', time: new Date() }]);
    }
  }

  function sendMessage(text?: string) {
    const msg = text || chatInput.trim();
    if (!msg) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), text: msg, sender: 'user', time: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);
    setTimeout(() => {
      const lower = msg.toLowerCase();
      let key = 'default';
      if (lower.includes('quote') || lower.includes('service')) key = 'quote';
      else if (lower.includes('pay') || lower.includes('charge') || lower.includes('card')) key = 'payment';
      else if (lower.includes('cancel')) key = 'cancel';
      else if (lower.includes('account') || lower.includes('email') || lower.includes('profile')) key = 'account';
      else if (lower.includes('vehicle') || lower.includes('car')) key = 'vehicle';
      else if (lower.includes('human') || lower.includes('agent') || lower.includes('person')) key = 'human';
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: BOT_RESPONSES[key],
        sender: key === 'human' ? 'agent' : 'bot',
        time: new Date(),
      }]);
      setIsTyping(false);
    }, 1200);
  }

  const filteredFAQs = FAQS.filter(faq => {
    const matchCat = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchSearch = !searchQuery || faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <DashboardLayout title="Help Center">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <button onClick={() => router.push('/perfil')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">My Profile</span>
        </button>

        {/* Hero */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 mb-6 text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">How can we help you?</h2>
            <p className="text-primary-100 mb-5">Search our knowledge base or start a live chat</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for answers..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: MessageCircle, label: 'Live Chat', desc: 'Chat with support', color: 'text-blue-600 bg-blue-100', onClick: openChat },
            { icon: AlertTriangle, label: 'Report Issue', desc: 'Report a problem', color: 'text-amber-600 bg-amber-100', onClick: () => router.push('/perfil/fale-conosco') },
            { icon: Heart, label: 'Give Feedback', desc: 'Share your thoughts', color: 'text-pink-600 bg-pink-100', onClick: () => {} },
          ].map(item => {
            const Icon = item.icon;
            return (
              <button key={item.label} onClick={item.onClick} className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-md transition-all text-left group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${item.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </button>
            );
          })}
        </div>

        {/* FAQ section */}
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          {/* Category filter */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex gap-2 overflow-x-auto">
              {CATEGORIES.map(cat => {
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <CatIcon className="w-4 h-4" /> {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredFAQs.length === 0 ? (
            <div className="py-12 text-center">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No results found for "{searchQuery}"</p>
              <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} className="text-primary-600 text-sm font-semibold mt-2 hover:underline">Clear filters</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredFAQs.map(faq => (
                <div key={faq.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                    {expandedId === faq.id
                      ? <ChevronUp className="w-5 h-5 text-primary-600 flex-shrink-0" />
                      : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    }
                  </button>
                  {expandedId === faq.id && (
                    <div className="px-6 pb-5">
                      <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Still need help */}
        <div className="mt-6 bg-primary-50 border border-primary-100 rounded-2xl p-6 text-center">
          <p className="font-semibold text-gray-900 mb-1">Still need help?</p>
          <p className="text-sm text-gray-500 mb-4">Our support team is available Mon–Fri, 8am–8pm EST</p>
          <button onClick={openChat} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-md shadow-primary-200">
            <MessageCircle className="w-5 h-5" /> Start Live Chat
          </button>
        </div>
      </div>

      {/* Chat panel */}
      {showChat && (
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden" style={{ height: 520 }}>
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary-600 text-white">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">TechTrust Support</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-primary-100">Online</span>
              </div>
            </div>
            <button onClick={() => setShowChat(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {chatMessages.map(msg => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                  {!isUser && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.sender === 'agent' ? 'bg-emerald-500' : 'bg-primary-600'}`}>
                      {msg.sender === 'agent' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                    </div>
                  )}
                  <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                    {msg.sender === 'agent' && <span className="text-xs text-emerald-600 font-semibold mb-0.5 ml-1">Support Agent</span>}
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isUser ? 'bg-primary-600 text-white rounded-tr-md' : 'bg-white text-gray-800 shadow-sm rounded-tl-md'}`}>
                      {msg.text}
                    </div>
                    <span className={`text-xs text-gray-400 mt-1 ${isUser ? 'mr-1' : 'ml-1'}`}>
                      {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick replies */}
          {chatMessages.length <= 1 && (
            <div className="px-3 py-2 border-t border-gray-100 flex gap-2 overflow-x-auto bg-white">
              {QUICK_REPLIES.map(r => (
                <button key={r} onClick={() => sendMessage(r)} className="px-3 py-1.5 rounded-full border border-primary-200 text-primary-700 text-xs font-semibold whitespace-nowrap hover:bg-primary-50 transition-colors">
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 px-3 py-3 border-t border-gray-100 bg-white">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!chatInput.trim()}
              className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

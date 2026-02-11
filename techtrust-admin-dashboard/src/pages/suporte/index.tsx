/**
 * Admin Support Page
 * View and respond to customer support tickets
 * Real-time updates via polling
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Globe,
  ChevronRight,
  X,
  RefreshCw,
  Inbox,
  Archive,
} from 'lucide-react';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  topic: string;
  subject: string;
  language: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  assignedAdminId: string | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    language: string;
  };
  messages: {
    id: string;
    message: string;
    senderRole: string;
    createdAt: string;
    sender: { id: string; fullName: string; role: string };
  }[];
  _count: { messages: number };
}

interface TicketStats {
  total: number;
  open: number;
  waitingAdmin: number;
  resolved: number;
  closed: number;
  unreadMessages: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  OPEN: { label: 'Open', color: 'text-blue-700', bg: 'bg-blue-50', icon: Inbox },
  WAITING_ADMIN: { label: 'Awaiting Reply', color: 'text-orange-700', bg: 'bg-orange-50', icon: AlertCircle },
  WAITING_CUSTOMER: { label: 'Awaiting Customer', color: 'text-purple-700', bg: 'bg-purple-50', icon: Clock },
  RESOLVED: { label: 'Resolved', color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle },
  CLOSED: { label: 'Closed', color: 'text-gray-500', bg: 'bg-gray-100', icon: Archive },
};

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇺🇸 English',
  pt: '🇧🇷 Português',
  es: '🇪🇸 Español',
};

const TOPIC_LABELS: Record<string, string> = {
  payments: '💳 Payments',
  services: '🔧 Services',
  account: '👤 Account',
  vehicles: '🚗 Vehicles',
  technical: '📱 Technical',
  general: '💬 General',
  other: '❓ Other',
};

export default function SuportePage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      // Poll every 10 seconds for new tickets/messages
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, statusFilter]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.messages]);

  async function loadData() {
    try {
      const statusQuery = statusFilter ? `?status=${statusFilter}` : '';
      const [ticketsRes, statsRes] = await Promise.all([
        adminApi.get<any>(`/support/tickets${statusQuery}`),
        adminApi.get<any>('/support/stats'),
      ]);

      if (ticketsRes.data?.data) {
        setTickets(ticketsRes.data.data);
      }
      if (statsRes.data?.data) {
        setStats(statsRes.data.data);
      }
    } catch (error) {
      console.error('Error loading support data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function openTicket(ticket: SupportTicket) {
    try {
      const res = await adminApi.get<any>(`/support/tickets/${ticket.id}`);
      if (res.data?.data) {
        setSelectedTicket(res.data.data);
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
    }
  }

  async function sendReply() {
    if (!replyText.trim() || !selectedTicket) return;

    setSending(true);
    try {
      const res = await adminApi.post<any>(`/support/tickets/${selectedTicket.id}/messages`, {
        message: replyText.trim(),
      });

      if (!res.error) {
        setReplyText('');
        // Reload ticket to get updated messages
        await openTicket(selectedTicket);
        await loadData();
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(ticketId: string, status: string) {
    try {
      await adminApi.patch(`/support/tickets/${ticketId}/status`, { status });
      await loadData();
      if (selectedTicket?.id === ticketId) {
        await openTicket(selectedTicket);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function formatMessageTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  if (authLoading || loading) {
    return (
      <AdminLayout title="Support Center">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Support Center">
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Open', value: stats.open, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Awaiting Reply', value: stats.waitingAdmin, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Resolved', value: stats.resolved, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Closed', value: stats.closed, color: 'text-gray-600', bg: 'bg-gray-50' },
            { label: 'Unread Messages', value: stats.unreadMessages, color: 'text-red-600', bg: 'bg-red-50' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: '', label: 'All' },
          { key: 'OPEN', label: 'Open' },
          { key: 'WAITING_ADMIN', label: 'Needs Reply' },
          { key: 'WAITING_CUSTOMER', label: 'Waiting Customer' },
          { key: 'RESOLVED', label: 'Resolved' },
          { key: 'CLOSED', label: 'Closed' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={loadData}
          className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
        >
          <RefreshCw className="w-4 h-4 inline mr-1" />
          Refresh
        </button>
      </div>

      <div className="flex gap-6">
        {/* Ticket List */}
        <div className={`${selectedTicket ? 'w-1/3' : 'w-full'} space-y-3`}>
          {tickets.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No support tickets found</p>
            </div>
          ) : (
            tickets.map((ticket) => {
              const statusConf = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
              const StatusIcon = statusConf.icon;
              const lastMsg = ticket.messages?.[0];

              return (
                <div
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  className={`bg-white rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow border-2 ${
                    selectedTicket?.id === ticket.id ? 'border-indigo-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-600">
                        {ticket.ticketNumber}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusConf.bg} ${statusConf.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConf.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(ticket.updatedAt)}</span>
                  </div>

                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{ticket.subject}</h4>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {ticket.user.fullName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {LANGUAGE_FLAGS[ticket.language] || ticket.language}
                    </span>
                    <span>{TOPIC_LABELS[ticket.topic] || ticket.topic}</span>
                  </div>

                  {lastMsg && (
                    <p className="text-xs text-gray-400 truncate">
                      {lastMsg.senderRole === 'CLIENT' ? '👤' : '🛡️'} {lastMsg.message}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {ticket._count?.messages || 0} messages
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chat Panel */}
        {selectedTicket && (
          <div className="w-2/3 bg-white rounded-xl flex flex-col" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {/* Ticket Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-indigo-600">{selectedTicket.ticketNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[selectedTicket.status]?.bg} ${STATUS_CONFIG[selectedTicket.status]?.color}`}>
                    {STATUS_CONFIG[selectedTicket.status]?.label}
                  </span>
                  <span className="text-sm text-gray-400">
                    {LANGUAGE_FLAGS[selectedTicket.language] || selectedTicket.language}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">{selectedTicket.subject}</h3>
                <p className="text-sm text-gray-500">
                  {selectedTicket.user.fullName} • {selectedTicket.user.email} • {TOPIC_LABELS[selectedTicket.topic] || selectedTicket.topic}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                  <button
                    onClick={() => updateStatus(selectedTicket.id, 'RESOLVED')}
                    className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Resolve
                  </button>
                )}
                {selectedTicket.status === 'RESOLVED' && (
                  <button
                    onClick={() => updateStatus(selectedTicket.id, 'CLOSED')}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    <Archive className="w-4 h-4 inline mr-1" />
                    Close
                  </button>
                )}
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {selectedTicket.messages?.map((msg) => {
                const isAdmin = msg.senderRole === 'ADMIN';
                const isSystem = msg.senderRole === 'SYSTEM';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="text-xs bg-gray-200 text-gray-500 px-3 py-1 rounded-full">
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      isAdmin
                        ? 'bg-indigo-600 text-white rounded-br-md'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${isAdmin ? 'text-indigo-200' : 'text-gray-500'}`}>
                          {isAdmin ? '🛡️ Admin' : `👤 ${msg.sender.fullName}`}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1 ${isAdmin ? 'text-indigo-300' : 'text-gray-400'}`}>
                        {formatMessageTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            {selectedTicket.status !== 'CLOSED' && (
              <div className="p-4 border-t">
                <div className="flex gap-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${selectedTicket.user.fullName}...`}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                  <button
                    onClick={sendReply}
                    disabled={!replyText.trim() || sending}
                    className={`px-4 rounded-xl flex items-center justify-center transition-colors ${
                      replyText.trim() && !sending
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  Search,
  Clock,
  ChevronRight,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  Eye,
  Download,
  Shield,
} from 'lucide-react';

export default function InvoicesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { translate: t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) loadInvoices();
  }, [isAuthenticated]);

  async function loadInvoices() {
    setLoading(true);
    try {
      const res = await api.getRepairInvoices();
      const data = res.data?.data || {};
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      DRAFT: { label: t('client.invoices.statusDraft') || 'Draft', color: 'bg-gray-100 text-gray-700', icon: <FileText className="w-4 h-4" /> },
      IN_PROGRESS: { label: t('client.invoices.statusInProgress') || 'In Progress', color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-4 h-4" /> },
      COMPLETED: { label: t('client.invoices.statusCompleted') || 'Awaiting Review', color: 'bg-yellow-100 text-yellow-700', icon: <CheckCircle className="w-4 h-4" /> },
      APPROVED: { label: t('client.invoices.statusApproved') || 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
      DISPUTED: { label: t('client.invoices.statusDisputed') || 'Disputed', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
    };
    return statuses[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: <Clock className="w-4 h-4" /> };
  };

  const filterOptions = [
    { value: 'all', label: t('client.invoices.filterAll') || 'All' },
    { value: 'COMPLETED', label: t('client.invoices.statusCompleted') || 'Awaiting Review' },
    { value: 'APPROVED', label: t('client.invoices.statusApproved') || 'Approved' },
    { value: 'DISPUTED', label: t('client.invoices.statusDisputed') || 'Disputed' },
  ];

  const filteredInvoices = invoices.filter((inv: any) => {
    if (filter !== 'all' && inv.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (inv.invoiceNumber || '').toLowerCase().includes(query) ||
        (inv.providerName || '').toLowerCase().includes(query) ||
        (inv.providerBusinessName || '').toLowerCase().includes(query) ||
        (inv.vehicleInfo || '').toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const stats = {
    total: invoices.length,
    needsReview: invoices.filter((i: any) => i.status === 'COMPLETED').length,
    approved: invoices.filter((i: any) => i.status === 'APPROVED').length,
    totalPaid: invoices
      .filter((i: any) => i.status === 'APPROVED')
      .reduce((sum: number, i: any) => sum + Number(i.finalTotal || 0), 0),
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout title={t('client.invoices.title') || 'Repair Invoices'}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">{t('client.invoices.statTotal') || 'Total'}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">{stats.needsReview}</p>
            <p className="text-sm text-gray-500">{t('client.invoices.statNeedsReview') || 'Needs Review'}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-sm text-gray-500">{t('client.invoices.statApproved') || 'Approved'}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-primary-600">${stats.totalPaid.toFixed(2)}</p>
            <p className="text-sm text-gray-500">{t('client.invoices.statTotalPaid') || 'Total Paid'}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('client.invoices.search') || 'Search invoices...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-200 min-w-[160px]"
          >
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Invoice list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
                    <div className="h-4 w-64 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('client.invoices.emptyTitle') || 'No invoices yet'}
            </h3>
            <p className="text-gray-500">
              {t('client.invoices.emptyDesc') || 'Invoices will appear here once a service is completed.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice: any) => {
              const statusInfo = getStatusInfo(invoice.status);

              return (
                <div key={invoice.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${statusInfo.color.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
                      <div className={statusInfo.color.split(' ')[1]}>{statusInfo.icon}</div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{invoice.invoiceNumber}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {invoice.providerBusinessName || invoice.providerName} &bull; {invoice.vehicleInfo}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-gray-900">${Number(invoice.finalTotal).toFixed(2)}</p>
                          {Number(invoice.supplementsTotal) > 0 && (
                            <p className="text-xs text-blue-600">+${Number(invoice.supplementsTotal).toFixed(2)} supplements</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          Original: ${Number(invoice.originalTotal).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(invoice.createdAt)}
                        </div>
                        {invoice.completedAt && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            Completed: {formatDate(invoice.completedAt)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400">{invoice.invoiceNumber}</span>
                        <div className="flex items-center gap-3">
                          {invoice.pdfUrl && (
                            <a
                              href={invoice.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-gray-500 hover:text-primary-600 font-medium flex items-center gap-1"
                            >
                              <Download className="w-4 h-4" />
                              PDF
                            </a>
                          )}
                          <button
                            onClick={() => router.push(`/faturas/${invoice.id}`)}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            {t('client.invoices.viewDetail') || 'View Details'}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

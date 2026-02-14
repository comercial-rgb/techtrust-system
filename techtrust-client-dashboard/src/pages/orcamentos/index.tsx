import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../services/api';
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
  Shield,
} from 'lucide-react';
import Link from 'next/link';

export default function EstimatesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { translate: t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [allQuotes, setAllQuotes] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated]);

  async function loadData() {
    setLoading(true);
    try {
      // Get all service requests that have quotes
      const srRes = await api.getServiceRequests();
      const requests = srRes.data?.data?.serviceRequests || srRes.data?.data || [];
      setServiceRequests(requests);

      // Get quotes from each service request that has them
      const quotesPromises = requests
        .filter((sr: any) => sr.quotesCount > 0 || sr.status === 'QUOTES_RECEIVED' || sr.status === 'QUOTE_ACCEPTED')
        .map(async (sr: any) => {
          try {
            const qRes = await api.getQuotesForRequest(sr.id);
            const quotes = qRes.data?.data || [];
            return quotes.map((q: any) => ({
              ...q,
              serviceRequestTitle: sr.title,
              serviceRequestNumber: sr.requestNumber,
              vehicleInfo: sr.vehicle
                ? `${sr.vehicle.year} ${sr.vehicle.make} ${sr.vehicle.model}`
                : '',
            }));
          } catch { return []; }
        });

      const quotesArrays = await Promise.all(quotesPromises);
      setAllQuotes(quotesArrays.flat());
    } catch (error) {
      console.error('Error loading estimates:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      PENDING: { label: t('common.status.pending') || 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
      ACCEPTED: { label: t('common.status.accepted') || 'Accepted', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
      REJECTED: { label: t('common.status.rejected') || 'Rejected', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
      EXPIRED: { label: t('common.status.expired') || 'Expired', color: 'bg-gray-100 text-gray-700', icon: <Clock className="w-4 h-4" /> },
    };
    return statuses[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: <Clock className="w-4 h-4" /> };
  };

  const filterOptions = [
    { value: 'all', label: t('client.estimates.filterAll') || 'All' },
    { value: 'PENDING', label: t('common.status.pending') || 'Pending' },
    { value: 'ACCEPTED', label: t('common.status.accepted') || 'Accepted' },
    { value: 'REJECTED', label: t('common.status.rejected') || 'Rejected' },
  ];

  const filteredQuotes = allQuotes.filter((q) => {
    if (filter !== 'all' && q.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (q.serviceRequestTitle || '').toLowerCase().includes(query) ||
        (q.estimateNumber || '').toLowerCase().includes(query) ||
        (q.provider?.fullName || '').toLowerCase().includes(query) ||
        (q.provider?.providerProfile?.businessName || '').toLowerCase().includes(query) ||
        (q.vehicleInfo || '').toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const stats = {
    total: allQuotes.length,
    pending: allQuotes.filter((q) => q.status === 'PENDING').length,
    accepted: allQuotes.filter((q) => q.status === 'ACCEPTED').length,
    rejected: allQuotes.filter((q) => q.status === 'REJECTED').length,
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout title={t('client.estimates.title') || 'Estimates'}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">{t('client.estimates.total') || 'Total'}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-gray-500">{t('common.status.pending') || 'Pending'}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
            <p className="text-sm text-gray-500">{t('common.status.accepted') || 'Accepted'}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-sm text-gray-500">{t('common.status.rejected') || 'Rejected'}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('client.estimates.search') || 'Search estimates...'}
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

        {/* Estimate list */}
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
        ) : filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('client.estimates.emptyTitle') || 'No estimates yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {t('client.estimates.emptyDesc') || 'Create a service request to receive estimates from providers.'}
            </p>
            <Link href="/solicitacoes/nova" className="inline-block px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              {t('client.estimates.createRequest') || 'New Service Request'}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuotes.map((quote: any) => {
              const statusInfo = getStatusInfo(quote.status);
              const providerName = quote.provider?.providerProfile?.businessName || quote.provider?.fullName || 'Provider';

              return (
                <div key={quote.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${statusInfo.color.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
                      <div className={statusInfo.color.split(' ')[1]}>{statusInfo.icon}</div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{quote.serviceRequestTitle}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {providerName} &bull; {quote.vehicleInfo}
                          </p>
                          {quote.estimateNumber && (
                            <p className="text-xs text-primary-600 flex items-center gap-1 mt-1">
                              <Shield className="w-3 h-3" />
                              {quote.estimateNumber}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-gray-900">${Number(quote.totalAmount).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          Parts: ${Number(quote.partsCost).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          Labor: ${Number(quote.laborCost).toFixed(2)}
                        </div>
                        {quote.warrantyMonths && (
                          <div className="flex items-center gap-1">
                            <Shield className="w-4 h-4 text-gray-400" />
                            {quote.warrantyMonths}mo / {quote.warrantyMileage?.toLocaleString() || '—'}mi
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(quote.createdAt)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400">#{quote.serviceRequestNumber}</span>
                        <button
                          onClick={() => router.push(`/solicitacoes/${quote.serviceRequestId}`)}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          {t('client.estimates.viewDetail') || 'View Details'}
                          <ChevronRight className="w-4 h-4" />
                        </button>
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

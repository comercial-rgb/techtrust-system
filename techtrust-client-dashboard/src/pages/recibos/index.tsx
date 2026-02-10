import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  Receipt,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  CreditCard,
  ChevronRight,
  Filter,
  Download,
  CalendarDays,
} from 'lucide-react';

interface Payment {
  id: string;
  paymentNumber: string;
  status: string;
  totalAmount: number;
  platformFee: number;
  providerAmount: number;
  cardLast4?: string;
  cardBrand?: string;
  createdAt: string;
  workOrder?: {
    id: string;
    orderNumber: string;
    serviceRequest?: {
      title: string;
      vehicle?: {
        make: string;
        model: string;
        year: number;
      };
    };
    provider?: {
      businessName: string;
    };
  };
}

export default function RecibosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPayments();
    }
  }, [isAuthenticated]);

  async function loadPayments() {
    try {
      const response = await api.getPaymentHistory();
      if (response.data) {
        const data = Array.isArray(response.data) ? response.data : (response.data as any)?.data || [];
        setPayments(data.map((p: any) => ({
          id: p.id,
          paymentNumber: p.paymentNumber || `PAY-${p.id.slice(0, 8)}`,
          status: p.status,
          totalAmount: p.totalAmount || 0,
          platformFee: p.platformFee || 0,
          providerAmount: p.providerAmount || 0,
          cardLast4: p.cardLast4,
          cardBrand: p.cardBrand,
          createdAt: p.createdAt,
          workOrder: p.workOrder,
        })));
      }
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
      case 'AUTHORIZED':
        return { label: 'Authorized', color: 'bg-blue-100 text-blue-700', icon: CheckCircle };
      case 'CAPTURED':
        return { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'REFUNDED':
        return { label: 'Refunded', color: 'bg-purple-100 text-purple-700', icon: AlertCircle };
      case 'FAILED':
        return { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle };
      case 'CANCELLED':
        return { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'CAPTURED', label: 'Paid' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'REFUNDED', label: 'Refunded' },
  ];

  const filteredPayments = payments.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.paymentNumber.toLowerCase().includes(q) ||
        p.workOrder?.serviceRequest?.title?.toLowerCase().includes(q) ||
        p.workOrder?.provider?.businessName?.toLowerCase().includes(q) ||
        p.cardLast4?.includes(q)
      );
    }
    return true;
  });

  // Stats
  const totalPaid = payments
    .filter(p => p.status === 'CAPTURED')
    .reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPending = payments
    .filter(p => p.status === 'PENDING' || p.status === 'AUTHORIZED')
    .reduce((sum, p) => sum + p.totalAmount, 0);
  const totalRefunded = payments
    .filter(p => p.status === 'REFUNDED')
    .reduce((sum, p) => sum + p.totalAmount, 0);

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Receipts & Transactions">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl"></div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Receipts & Transactions">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
              <p className="text-sm text-gray-500">Paid</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{formatCurrency(totalPending)}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(totalRefunded)}</p>
              <p className="text-sm text-gray-500">Refunded</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === option.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments list */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-soft">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 mb-2">
            {searchQuery ? 'No transactions found' : 'No transactions yet'}
          </p>
          <p className="text-sm text-gray-400">
            Transactions from services completed via the app will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => {
            const statusInfo = getStatusInfo(payment.status);
            const StatusIcon = statusInfo.icon;
            return (
              <div
                key={payment.id}
                onClick={() => setSelectedPayment(payment)}
                className="bg-white rounded-xl p-5 shadow-soft cursor-pointer card-hover"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    payment.status === 'CAPTURED' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <DollarSign className={`w-6 h-6 ${
                      payment.status === 'CAPTURED' ? 'text-green-600' : 'text-gray-500'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {payment.workOrder?.serviceRequest?.title || `Payment #${payment.paymentNumber}`}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {payment.workOrder?.provider?.businessName || 'Service Provider'}
                          {payment.workOrder?.serviceRequest?.vehicle && (
                            <> • {payment.workOrder.serviceRequest.vehicle.make} {payment.workOrder.serviceRequest.vehicle.model}</>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(payment.totalAmount)}</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {formatDate(payment.createdAt)}
                      </span>
                      {payment.cardLast4 && (
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          •••• {payment.cardLast4}
                        </span>
                      )}
                      <span>#{payment.paymentNumber}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Transaction Detail</h2>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="text-center mb-6">
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {formatCurrency(selectedPayment.totalAmount)}
              </p>
              {(() => {
                const si = getStatusInfo(selectedPayment.status);
                return (
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${si.color}`}>
                    {si.label}
                  </span>
                );
              })()}
            </div>

            <div className="space-y-4 border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Payment #</span>
                <span className="font-medium text-gray-900">{selectedPayment.paymentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-900">{formatDate(selectedPayment.createdAt)}</span>
              </div>
              {selectedPayment.workOrder?.serviceRequest?.title && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Service</span>
                  <span className="font-medium text-gray-900 text-right max-w-[200px]">
                    {selectedPayment.workOrder.serviceRequest.title}
                  </span>
                </div>
              )}
              {selectedPayment.workOrder?.provider?.businessName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Provider</span>
                  <span className="font-medium text-gray-900">
                    {selectedPayment.workOrder.provider.businessName}
                  </span>
                </div>
              )}
              {selectedPayment.workOrder?.serviceRequest?.vehicle && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Vehicle</span>
                  <span className="font-medium text-gray-900">
                    {selectedPayment.workOrder.serviceRequest.vehicle.make}{' '}
                    {selectedPayment.workOrder.serviceRequest.vehicle.model}{' '}
                    {selectedPayment.workOrder.serviceRequest.vehicle.year}
                  </span>
                </div>
              )}
              {selectedPayment.cardLast4 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment</span>
                  <span className="font-medium text-gray-900">
                    {selectedPayment.cardBrand || 'Card'} •••• {selectedPayment.cardLast4}
                  </span>
                </div>
              )}
              
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Service Amount</span>
                  <span className="text-gray-900">{formatCurrency(selectedPayment.providerAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Platform Fee</span>
                  <span className="text-gray-900">{formatCurrency(selectedPayment.platformFee)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-100 pt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatCurrency(selectedPayment.totalAmount)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedPayment(null)}
              className="w-full btn btn-primary py-3 mt-6"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

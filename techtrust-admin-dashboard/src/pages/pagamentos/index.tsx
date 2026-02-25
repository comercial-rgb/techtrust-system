import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';
import { Search, CreditCard, CheckCircle, Clock, XCircle, RefreshCw, Eye, User, Building2 } from 'lucide-react';

interface Payment {
  id: string;
  transactionId: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  customer: { fullName: string };
  provider: { companyName: string };
  workOrder: { orderNumber: string };
  createdAt: string;
}

export default function PagamentosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);
  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated]);

  async function loadData() {
    try {
      const response = await adminApi.getPayments({ status: statusFilter !== 'all' ? statusFilter : undefined });
      const list = response.data?.data?.payments || response.data?.data || response.data?.payments || [];
      setPayments(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string; icon: any }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente', icon: Clock },
      COMPLETED: { color: 'bg-green-100 text-green-800', label: 'Concluído', icon: CheckCircle },
      FAILED: { color: 'bg-red-100 text-red-800', label: 'Falhou', icon: XCircle },
      REFUNDED: { color: 'bg-purple-100 text-purple-800', label: 'Reembolsado', icon: RefreshCw },
    };
    return config[status] || { color: 'bg-gray-100 text-gray-800', label: status, icon: Clock };
  };

  const filtered = payments.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.transactionId.toLowerCase().includes(q) || p.customer.fullName.toLowerCase().includes(q);
    }
    return true;
  });

  const totalReceived = payments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0);

  if (authLoading || loading) return <AdminLayout title="Pagamentos"><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}</div></AdminLayout>;

  return (
    <AdminLayout title="Pagamentos">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-900">{payments.length}</p><p className="text-sm text-gray-500">Total</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">R$ {totalReceived.toLocaleString('pt-BR')}</p><p className="text-sm text-gray-500">Recebido</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-yellow-600">R$ {totalPending.toLocaleString('pt-BR')}</p><p className="text-sm text-gray-500">Pendente</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-purple-600">{payments.filter(p => p.status === 'REFUNDED').length}</p><p className="text-sm text-gray-500">Reembolsados</p></div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Buscar por transação ou cliente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input !pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="all">Todos</option>
            <option value="PENDING">Pendentes</option>
            <option value="COMPLETED">Concluídos</option>
            <option value="REFUNDED">Reembolsados</option>
            <option value="FAILED">Falhos</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-header">Transação</th>
              <th className="table-header">Cliente</th>
              <th className="table-header">Fornecedor</th>
              <th className="table-header">Método</th>
              <th className="table-header">Valor</th>
              <th className="table-header">Status</th>
              <th className="table-header">Data</th>
              <th className="table-header text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((payment) => {
              const status = getStatusBadge(payment.status);
              const StatusIcon = status.icon;
              return (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <p className="font-medium text-gray-900">{payment.transactionId}</p>
                    <p className="text-sm text-gray-500">{payment.workOrder.orderNumber}</p>
                  </td>
                  <td className="table-cell"><span className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" />{payment.customer.fullName}</span></td>
                  <td className="table-cell"><span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" />{payment.provider.companyName}</span></td>
                  <td className="table-cell">{payment.paymentMethod}</td>
                  <td className="table-cell font-semibold text-green-600">R$ {payment.amount.toFixed(2)}</td>
                  <td className="table-cell"><span className={`badge ${status.color} flex items-center gap-1 w-fit`}><StatusIcon className="w-3 h-3" />{status.label}</span></td>
                  <td className="table-cell text-sm text-gray-500">{new Date(payment.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="table-cell text-right">
                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4" /></button>
                    {payment.status === 'COMPLETED' && (
                      <button className="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg" title="Reembolsar"><RefreshCw className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

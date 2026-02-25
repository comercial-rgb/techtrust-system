import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';
import { Search, Wrench, Clock, CheckCircle, CreditCard, Eye, Building2, User, Car } from 'lucide-react';

interface WorkOrder {
  id: string;
  orderNumber: string;
  title: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED';
  isPaid: boolean;
  totalCost: number;
  customer: { fullName: string };
  provider: { companyName: string };
  vehicle: { make: string; model: string };
  createdAt: string;
}

export default function ServicosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);
  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated]);

  async function loadData() {
    try {
      const response = await adminApi.getWorkOrders({ status: statusFilter !== 'all' ? statusFilter : undefined });
      const list = response.data?.data?.workOrders || response.data?.data || response.data?.workOrders || [];
      setWorkOrders(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      SCHEDULED: { color: 'bg-blue-100 text-blue-800', label: 'Agendado' },
      IN_PROGRESS: { color: 'bg-amber-100 text-amber-800', label: 'Em Execução' },
      WAITING_PARTS: { color: 'bg-purple-100 text-purple-800', label: 'Aguardando Peças' },
      COMPLETED: { color: 'bg-green-100 text-green-800', label: 'Concluído' },
    };
    return config[status] || { color: 'bg-gray-100 text-gray-800', label: status };
  };

  const filtered = workOrders.filter((w) => {
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return w.title.toLowerCase().includes(q) || w.orderNumber.toLowerCase().includes(q) || w.customer.fullName.toLowerCase().includes(q);
    }
    return true;
  });

  const totalRevenue = workOrders.filter(w => w.isPaid).reduce((sum, w) => sum + w.totalCost, 0);

  if (authLoading || loading) return <AdminLayout title="Serviços"><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}</div></AdminLayout>;

  return (
    <AdminLayout title="Ordens de Serviço">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-900">{workOrders.length}</p><p className="text-sm text-gray-500">Total</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-amber-600">{workOrders.filter(w => w.status === 'IN_PROGRESS').length}</p><p className="text-sm text-gray-500">Em Execução</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">{workOrders.filter(w => w.status === 'COMPLETED').length}</p><p className="text-sm text-gray-500">Concluídos</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">R$ {totalRevenue.toLocaleString('pt-BR')}</p><p className="text-sm text-gray-500">Receita</p></div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input !pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="all">Todos</option>
            <option value="SCHEDULED">Agendados</option>
            <option value="IN_PROGRESS">Em Execução</option>
            <option value="COMPLETED">Concluídos</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-header">Serviço</th>
              <th className="table-header">Cliente</th>
              <th className="table-header">Fornecedor</th>
              <th className="table-header">Status</th>
              <th className="table-header">Valor</th>
              <th className="table-header">Pagamento</th>
              <th className="table-header text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((wo) => {
              const status = getStatusBadge(wo.status);
              return (
                <tr key={wo.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <p className="font-medium text-gray-900">{wo.title}</p>
                    <p className="text-sm text-gray-500">#{wo.orderNumber}</p>
                  </td>
                  <td className="table-cell"><span className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" />{wo.customer.fullName}</span></td>
                  <td className="table-cell"><span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" />{wo.provider.companyName}</span></td>
                  <td className="table-cell"><span className={`badge ${status.color}`}>{status.label}</span></td>
                  <td className="table-cell font-semibold">R$ {wo.totalCost.toFixed(2)}</td>
                  <td className="table-cell"><span className={`badge ${wo.isPaid ? 'badge-success' : 'badge-warning'}`}>{wo.isPaid ? 'Pago' : 'Pendente'}</span></td>
                  <td className="table-cell text-right">
                    <button onClick={() => router.push(`/servicos/${wo.id}`)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4" /></button>
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

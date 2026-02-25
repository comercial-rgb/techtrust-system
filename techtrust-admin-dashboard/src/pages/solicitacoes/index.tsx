import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';
import {
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ChevronRight,
  Car,
  User,
  Calendar,
} from 'lucide-react';

interface ServiceRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: 'SEARCHING' | 'QUOTES_RECEIVED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  urgency: string;
  customer: { fullName: string };
  vehicle: { make: string; model: string; year: number };
  quotesCount: number;
  createdAt: string;
}

export default function SolicitacoesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated]);

  async function loadData() {
    try {
      const response = await adminApi.getServiceRequests({ status: statusFilter !== 'all' ? statusFilter : undefined });
      const list = response.data?.data?.serviceRequests || response.data?.data || response.data?.serviceRequests || [];
      setRequests(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      SEARCHING: { color: 'bg-blue-100 text-blue-800', label: 'Buscando' },
      QUOTES_RECEIVED: { color: 'bg-yellow-100 text-yellow-800', label: 'Com Orçamentos' },
      ACCEPTED: { color: 'bg-purple-100 text-purple-800', label: 'Aceito' },
      IN_PROGRESS: { color: 'bg-indigo-100 text-indigo-800', label: 'Em Andamento' },
      COMPLETED: { color: 'bg-green-100 text-green-800', label: 'Concluído' },
      CANCELLED: { color: 'bg-red-100 text-red-800', label: 'Cancelado' },
    };
    return config[status] || { color: 'bg-gray-100 text-gray-800', label: status };
  };

  const filtered = requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.requestNumber.toLowerCase().includes(q) || r.customer.fullName.toLowerCase().includes(q);
    }
    return true;
  });

  if (authLoading || loading) return <AdminLayout title="Solicitações"><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}</div></AdminLayout>;

  return (
    <AdminLayout title="Solicitações de Serviço">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-900">{requests.length}</p><p className="text-sm text-gray-500">Total</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-blue-600">{requests.filter(r => r.status === 'SEARCHING').length}</p><p className="text-sm text-gray-500">Buscando</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{requests.filter(r => r.status === 'QUOTES_RECEIVED').length}</p><p className="text-sm text-gray-500">Com Orçamentos</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-indigo-600">{requests.filter(r => r.status === 'IN_PROGRESS').length}</p><p className="text-sm text-gray-500">Em Andamento</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">{requests.filter(r => r.status === 'COMPLETED').length}</p><p className="text-sm text-gray-500">Concluídos</p></div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input !pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="all">Todos</option>
            <option value="SEARCHING">Buscando</option>
            <option value="QUOTES_RECEIVED">Com Orçamentos</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="COMPLETED">Concluídos</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-header">Solicitação</th>
              <th className="table-header">Cliente</th>
              <th className="table-header">Veículo</th>
              <th className="table-header">Status</th>
              <th className="table-header">Orçamentos</th>
              <th className="table-header">Data</th>
              <th className="table-header text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((req) => {
              const status = getStatusBadge(req.status);
              return (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <p className="font-medium text-gray-900">{req.title}</p>
                    <p className="text-sm text-gray-500">#{req.requestNumber}</p>
                  </td>
                  <td className="table-cell"><span className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" />{req.customer.fullName}</span></td>
                  <td className="table-cell"><span className="flex items-center gap-2"><Car className="w-4 h-4 text-gray-400" />{req.vehicle.make} {req.vehicle.model}</span></td>
                  <td className="table-cell"><span className={`badge ${status.color}`}>{status.label}</span></td>
                  <td className="table-cell text-center">{req.quotesCount}</td>
                  <td className="table-cell text-sm text-gray-500">{new Date(req.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="table-cell text-right">
                    <button onClick={() => router.push(`/solicitacoes/${req.id}`)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4" /></button>
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

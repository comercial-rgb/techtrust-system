import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  Plus,
  Search,
  Clock,
  FileText,
  Wrench,
  CheckCircle,
  ChevronRight,
  Star,
  Filter,
} from 'lucide-react';

interface ServiceRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  status: 'SEARCHING' | 'QUOTES_RECEIVED' | 'QUOTE_ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED';
  quotesCount: number;
  createdAt: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
}

export default function SolicitacoesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadRequests();
    }
  }, [isAuthenticated]);

  async function loadRequests() {
    try {
      const response = await api.getServiceRequests();
      
      if (response.data) {
        setRequests(response.data.map((r: any) => ({
          id: r.id,
          requestNumber: r.requestNumber || `SR-${r.id.slice(0, 8)}`,
          title: r.title,
          description: r.description,
          status: r.status,
          quotesCount: r._count?.quotes || r.quotesCount || 0,
          createdAt: r.createdAt,
          vehicle: r.vehicle || { make: 'N/A', model: 'N/A', year: 0 },
        })));
      } else {
        // Fallback mock data
        setRequests([
          {
            id: '1',
            requestNumber: 'SR-2024-001',
            title: 'Troca de óleo e filtros',
            description: 'Troca de óleo sintético e filtros de ar e combustível',
            status: 'QUOTES_RECEIVED',
            quotesCount: 4,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            vehicle: { make: 'Honda', model: 'Civic', year: 2020 },
          },
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'SEARCHING':
        return { label: 'Buscando Fornecedores', color: 'bg-blue-100 text-blue-700', icon: Clock };
      case 'QUOTES_RECEIVED':
        return { label: 'Orçamentos Recebidos', color: 'bg-yellow-100 text-yellow-700', icon: FileText };
      case 'QUOTE_ACCEPTED':
        return { label: 'Orçamento Aceito', color: 'bg-purple-100 text-purple-700', icon: CheckCircle };
      case 'IN_PROGRESS':
        return { label: 'Em Andamento', color: 'bg-indigo-100 text-indigo-700', icon: Wrench };
      case 'COMPLETED':
        return { label: 'Concluído', color: 'bg-green-100 text-green-700', icon: CheckCircle };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock };
    }
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) return 'Agora mesmo';
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  const filterOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'SEARCHING', label: 'Buscando' },
    { value: 'QUOTES_RECEIVED', label: 'Com Orçamentos' },
    { value: 'IN_PROGRESS', label: 'Em Andamento' },
    { value: 'COMPLETED', label: 'Concluídas' },
  ];

  const filteredRequests = requests.filter((req) => {
    if (filter !== 'all' && req.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        req.title.toLowerCase().includes(query) ||
        req.vehicle.make.toLowerCase().includes(query) ||
        req.requestNumber.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: requests.length,
    searching: requests.filter((r) => r.status === 'SEARCHING').length,
    withQuotes: requests.filter((r) => r.status === 'QUOTES_RECEIVED').length,
    inProgress: requests.filter((r) => r.status === 'IN_PROGRESS').length,
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Minhas Solicitações">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 skeleton rounded-xl"></div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Minhas Solicitações">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-soft text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{stats.searching}</p>
          <p className="text-sm text-blue-600">Buscando</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{stats.withQuotes}</p>
          <p className="text-sm text-yellow-600">Com Orçamentos</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-indigo-700">{stats.inProgress}</p>
          <p className="text-sm text-indigo-600">Em Andamento</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar solicitações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-12"
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
        <button
          onClick={() => router.push('/solicitacoes/nova')}
          className="btn btn-primary whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Nova Solicitação
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-soft">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'Nenhuma solicitação encontrada' : 'Nenhuma solicitação ainda'}
            </p>
            <button
              onClick={() => router.push('/solicitacoes/nova')}
              className="btn btn-primary"
            >
              <Plus className="w-5 h-5" />
              Criar Solicitação
            </button>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const statusInfo = getStatusInfo(request.status);
            const StatusIcon = statusInfo.icon;
            return (
              <div
                key={request.id}
                onClick={() => router.push(`/solicitacoes/${request.id}`)}
                className="bg-white rounded-xl p-5 shadow-soft cursor-pointer card-hover"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <StatusIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{request.title}</h3>
                        <p className="text-sm text-gray-500">
                          {request.vehicle.make} {request.vehicle.model} {request.vehicle.year} • #{request.requestNumber}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{request.description}</p>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-4 h-4" />
                        {formatTimeAgo(request.createdAt)}
                      </span>
                      {request.quotesCount > 0 && (
                        <span className="flex items-center gap-1 text-yellow-600 font-medium">
                          <Star className="w-4 h-4" />
                          {request.quotesCount} orçamento(s)
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}

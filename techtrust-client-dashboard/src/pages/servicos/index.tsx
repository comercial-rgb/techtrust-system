import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  Search,
  Clock,
  Wrench,
  CheckCircle,
  CreditCard,
  ChevronRight,
  Star,
  Building,
  Calendar,
} from 'lucide-react';

interface WorkOrder {
  id: string;
  orderNumber: string;
  status: 'PENDING_START' | 'IN_PROGRESS' | 'AWAITING_PAYMENT' | 'COMPLETED';
  title: string;
  finalAmount: number;
  createdAt: string;
  completedAt?: string;
  provider: {
    businessName: string;
    rating: number;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
}

export default function ServicosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadWorkOrders();
    }
  }, [isAuthenticated]);

  async function loadWorkOrders() {
    try {
      const response = await api.getWorkOrders();
      
      if (response.data) {
        setWorkOrders(response.data.map((w: any) => ({
          id: w.id,
          orderNumber: w.orderNumber || `WO-${w.id.slice(0, 8)}`,
          status: w.status,
          title: w.quote?.serviceRequest?.title || w.title || 'Serviço',
          finalAmount: w.finalAmount || w.quote?.totalAmount || 0,
          createdAt: w.createdAt,
          completedAt: w.completedAt,
          provider: {
            businessName: w.provider?.businessName || 'Prestador',
            rating: w.provider?.rating || 4.5,
          },
          vehicle: w.quote?.serviceRequest?.vehicle || w.vehicle || { make: 'N/A', model: 'N/A', year: 0 },
        })));
      } else {
        setWorkOrders([]);
      }
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING_START':
        return { label: 'Aguardando Início', color: 'bg-yellow-100 text-yellow-700', icon: Clock, border: 'border-l-yellow-500' };
      case 'IN_PROGRESS':
        return { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', icon: Wrench, border: 'border-l-blue-500' };
      case 'AWAITING_PAYMENT':
        return { label: 'Aguardando Pagamento', color: 'bg-purple-100 text-purple-700', icon: CreditCard, border: 'border-l-purple-500' };
      case 'COMPLETED':
        return { label: 'Concluído', color: 'bg-green-100 text-green-700', icon: CheckCircle, border: 'border-l-green-500' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock, border: 'border-l-gray-500' };
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Ativos' },
    { value: 'AWAITING_PAYMENT', label: 'Pagamento' },
    { value: 'COMPLETED', label: 'Concluídos' },
  ];

  const filteredOrders = workOrders.filter((wo) => {
    if (filter === 'active') return wo.status === 'PENDING_START' || wo.status === 'IN_PROGRESS';
    if (filter !== 'all' && wo.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return wo.title.toLowerCase().includes(query) || wo.provider.businessName.toLowerCase().includes(query);
    }
    return true;
  });

  const stats = {
    active: workOrders.filter((w) => w.status === 'IN_PROGRESS' || w.status === 'PENDING_START').length,
    awaitingPayment: workOrders.filter((w) => w.status === 'AWAITING_PAYMENT').length,
    completed: workOrders.filter((w) => w.status === 'COMPLETED').length,
    totalSpent: workOrders.filter((w) => w.status === 'COMPLETED').reduce((acc, w) => acc + w.finalAmount, 0),
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Meus Serviços">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (<div key={i} className="h-32 skeleton rounded-xl"></div>))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Meus Serviços">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <Wrench className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-700">{stats.active}</p>
          <p className="text-sm text-blue-600">Ativos</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <CreditCard className="w-6 h-6 text-purple-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-700">{stats.awaitingPayment}</p>
          <p className="text-sm text-purple-600">Pagamento</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
          <p className="text-sm text-green-600">Concluídos</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <span className="text-2xl mb-2 block">💰</span>
          <p className="text-2xl font-bold text-yellow-700">${stats.totalSpent}</p>
          <p className="text-sm text-yellow-600">Investido</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Buscar serviços..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-12" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {filterOptions.map((option) => (
            <button key={option.value} onClick={() => setFilter(option.value)} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filter === option.value ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-soft">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{searchQuery ? 'Nenhum serviço encontrado' : 'Nenhum serviço ainda'}</p>
          </div>
        ) : (
          filteredOrders.map((wo) => {
            const statusInfo = getStatusInfo(wo.status);
            const StatusIcon = statusInfo.icon;
            return (
              <div key={wo.id} onClick={() => router.push(`/servicos/${wo.id}`)} className={`bg-white rounded-xl p-5 shadow-soft cursor-pointer card-hover border-l-4 ${statusInfo.border}`}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <StatusIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{wo.title}</h3>
                        <p className="text-sm text-gray-500">{wo.vehicle.make} {wo.vehicle.model} • #{wo.orderNumber}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{wo.provider.businessName}</span>
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-gray-600">{wo.provider.rating}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />{formatDate(wo.createdAt)}
                      </span>
                      <span className="text-lg font-bold text-primary-600">${wo.finalAmount.toFixed(2)}</span>
                    </div>
                    {wo.status === 'AWAITING_PAYMENT' && (
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/pagamento/${wo.id}`); }} className="w-full mt-4 btn bg-purple-600 text-white hover:bg-purple-700">
                        <CreditCard className="w-4 h-4" />Efetuar Pagamento
                      </button>
                    )}
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

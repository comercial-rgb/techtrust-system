import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import {
  Search,
  Filter,
  Building2,
  Star,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

interface Provider {
  id: string;
  companyName: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  totalReviews: number;
  totalServices: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isVerified: boolean;
  createdAt: string;
}

export default function FornecedoresPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { filter } = router.query;
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(filter === 'pending' ? 'PENDING' : 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend'>('approve');
  const [actionReason, setActionReason] = useState('');

  const itemsPerPage = 10;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProviders();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (filter === 'pending') {
      setStatusFilter('PENDING');
    }
  }, [filter]);

  async function loadProviders() {
    try {
      const response = await api.get('/admin/providers');
      setProviders(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Aprovado' };
      case 'PENDING':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendente' };
      case 'REJECTED':
        return { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejeitado' };
      case 'SUSPENDED':
        return { color: 'bg-gray-100 text-gray-800', icon: Ban, label: 'Suspenso' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock, label: status };
    }
  };

  const filteredProviders = providers.filter((provider) => {
    if (statusFilter !== 'all' && provider.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        provider.companyName.toLowerCase().includes(query) ||
        provider.email.toLowerCase().includes(query) ||
        provider.cnpj.includes(query)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredProviders.length / itemsPerPage);
  const paginatedProviders = filteredProviders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  async function handleAction() {
    if (!selectedProvider) return;
    // API call here
    
    if (actionType === 'approve') {
      setProviders(providers.map(p => p.id === selectedProvider.id ? { ...p, status: 'APPROVED' as const, isVerified: true } : p));
    } else if (actionType === 'reject') {
      setProviders(providers.map(p => p.id === selectedProvider.id ? { ...p, status: 'REJECTED' as const } : p));
    } else if (actionType === 'suspend') {
      setProviders(providers.map(p => p.id === selectedProvider.id ? { ...p, status: 'SUSPENDED' as const } : p));
    }
    
    setShowActionModal(false);
    setSelectedProvider(null);
    setActionReason('');
  }

  const pendingCount = providers.filter(p => p.status === 'PENDING').length;

  if (authLoading || loading) {
    return (
      <AdminLayout title="Fornecedores">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl"></div>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Fornecedores">
      {/* Alert for pending */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-amber-800">{pendingCount} fornecedor(es) aguardando aprovação</p>
            <p className="text-sm text-amber-600">Revise os cadastros pendentes para liberar o acesso.</p>
          </div>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className="btn-primary bg-amber-600 hover:bg-amber-700"
          >
            Ver Pendentes
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{providers.length}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{providers.filter(p => p.status === 'APPROVED').length}</p>
          <p className="text-sm text-gray-500">Aprovados</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-sm text-gray-500">Pendentes</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{providers.filter(p => p.status === 'REJECTED').length}</p>
          <p className="text-sm text-gray-500">Rejeitados</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-600">{providers.filter(p => p.status === 'SUSPENDED').length}</p>
          <p className="text-sm text-gray-500">Suspensos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou CNPJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Todos os status</option>
            <option value="APPROVED">Aprovados</option>
            <option value="PENDING">Pendentes</option>
            <option value="REJECTED">Rejeitados</option>
            <option value="SUSPENDED">Suspensos</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {paginatedProviders.length === 0 ? (
          <div className="card p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum fornecedor encontrado</p>
          </div>
        ) : (
          paginatedProviders.map((provider) => {
            const statusInfo = getStatusBadge(provider.status);
            const StatusIcon = statusInfo.icon;
            return (
              <div key={provider.id} className="card p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-admin-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-7 h-7 text-admin-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{provider.companyName}</h3>
                          <span className={`badge ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </span>
                          {provider.isVerified && (
                            <span className="badge badge-info">✓ Verificado</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">CNPJ: {provider.cnpj}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {provider.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {provider.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {provider.address}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  {provider.status === 'APPROVED' && (
                    <div className="flex gap-6 text-center border-l border-gray-100 pl-6">
                      <div>
                        <div className="flex items-center gap-1 justify-center">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-bold text-gray-900">{provider.rating.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-500">{provider.totalReviews} avaliações</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{provider.totalServices}</p>
                        <p className="text-xs text-gray-500">serviços</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/fornecedores/${provider.id}`)}
                      className="btn-secondary"
                    >
                      <Eye className="w-4 h-4" />
                      Detalhes
                    </button>
                    
                    {provider.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => { setSelectedProvider(provider); setActionType('approve'); setShowActionModal(true); }}
                          className="btn-success"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Aprovar
                        </button>
                        <button
                          onClick={() => { setSelectedProvider(provider); setActionType('reject'); setShowActionModal(true); }}
                          className="btn-danger"
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeitar
                        </button>
                      </>
                    )}
                    
                    {provider.status === 'APPROVED' && (
                      <button
                        onClick={() => { setSelectedProvider(provider); setActionType('suspend'); setShowActionModal(true); }}
                        className="btn bg-gray-600 text-white hover:bg-gray-700"
                      >
                        <Ban className="w-4 h-4" />
                        Suspender
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-gray-600">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {actionType === 'approve' && 'Aprovar Fornecedor'}
              {actionType === 'reject' && 'Rejeitar Fornecedor'}
              {actionType === 'suspend' && 'Suspender Fornecedor'}
            </h2>
            
            <p className="text-gray-600 mb-4">
              {actionType === 'approve' && `Confirma a aprovação de "${selectedProvider.companyName}"? O fornecedor poderá receber solicitações de serviço.`}
              {actionType === 'reject' && `Confirma a rejeição de "${selectedProvider.companyName}"?`}
              {actionType === 'suspend' && `Confirma a suspensão de "${selectedProvider.companyName}"? O fornecedor não poderá mais receber solicitações.`}
            </p>

            {(actionType === 'reject' || actionType === 'suspend') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo *
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Informe o motivo..."
                  required
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowActionModal(false); setSelectedProvider(null); setActionReason(''); }}
                className="flex-1 btn-secondary py-3"
              >
                Cancelar
              </button>
              <button
                onClick={handleAction}
                disabled={(actionType !== 'approve') && !actionReason}
                className={`flex-1 py-3 ${
                  actionType === 'approve' ? 'btn-success' :
                  actionType === 'reject' ? 'btn-danger' :
                  'btn bg-gray-600 text-white hover:bg-gray-700'
                } disabled:opacity-50`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

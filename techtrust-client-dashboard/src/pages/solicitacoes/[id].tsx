import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  ChevronLeft,
  Car,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Star,
  Shield,
  MapPin,
  Phone,
  DollarSign,
  User,
  Wrench,
} from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
}

interface Quote {
  id: string;
  providerId: string;
  provider: {
    id: string;
    companyName: string;
    rating: number;
    totalReviews: number;
    phone: string;
    address: string;
  };
  laborCost: number;
  partsCost: number;
  totalCost: number;
  estimatedHours: number;
  notes: string;
  validUntil: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
}

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  serviceType: string;
  status: 'SEARCHING' | 'QUOTES_RECEIVED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  preferredDate: string | null;
  vehicle: Vehicle;
  quotes: Quote[];
  createdAt: string;
  updatedAt: string;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  OIL_CHANGE: 'Troca de Óleo',
  BRAKE_SERVICE: 'Serviço de Freios',
  TIRE_SERVICE: 'Pneus e Alinhamento',
  ENGINE_SERVICE: 'Motor',
  ELECTRICAL: 'Elétrica',
  AC_SERVICE: 'Ar Condicionado',
  SUSPENSION: 'Suspensão',
  TRANSMISSION: 'Transmissão',
  GENERAL_REPAIR: 'Reparo Geral',
  INSPECTION: 'Inspeção/Revisão',
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Baixa', color: 'bg-green-100 text-green-700' },
  MEDIUM: { label: 'Média', color: 'bg-yellow-100 text-yellow-700' },
  HIGH: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  EMERGENCY: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  SEARCHING: { label: 'Buscando Orçamentos', color: 'bg-blue-100 text-blue-700', icon: Clock },
  QUOTES_RECEIVED: { label: 'Orçamentos Recebidos', color: 'bg-purple-100 text-purple-700', icon: DollarSign },
  ACCEPTED: { label: 'Orçamento Aceito', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  IN_PROGRESS: { label: 'Em Execução', color: 'bg-amber-100 text-amber-700', icon: Wrench },
  COMPLETED: { label: 'Concluído', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function SolicitacaoDetalhesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [error, setError] = useState('');
  const [acceptingQuote, setAcceptingQuote] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && id) {
      loadRequest();
    }
  }, [isAuthenticated, id]);

  async function loadRequest() {
    try {
      const response = await api.getServiceRequestById(id as string);
      if (response.error) {
        setError(response.error);
        return;
      }
      setRequest(response.data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar solicitação');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptQuote(quoteId: string) {
    setAcceptingQuote(quoteId);
    try {
      const response = await api.acceptQuote(quoteId);
      if (response.error) {
        alert(response.error);
        return;
      }
      // Recarregar para ver status atualizado
      loadRequest();
    } catch (err: any) {
      alert(err.message || 'Erro ao aceitar orçamento');
    } finally {
      setAcceptingQuote(null);
    }
  }

  async function handleRejectQuote(quoteId: string) {
    if (!confirm('Deseja realmente recusar este orçamento?')) return;
    
    try {
      const response = await api.rejectQuote(quoteId);
      if (response.error) {
        alert(response.error);
        return;
      }
      loadRequest();
    } catch (err: any) {
      alert(err.message || 'Erro ao recusar orçamento');
    }
  }

  async function handleCancelRequest() {
    if (!confirm('Deseja realmente cancelar esta solicitação?')) return;
    
    try {
      const response = await api.cancelServiceRequest(id as string);
      if (response.error) {
        alert(response.error);
        return;
      }
      router.push('/solicitacoes');
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar solicitação');
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Detalhes da Solicitação">
        <div className="max-w-3xl mx-auto">
          <div className="h-64 skeleton rounded-xl mb-4"></div>
          <div className="h-48 skeleton rounded-xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !request) {
    return (
      <DashboardLayout title="Detalhes da Solicitação">
        <div className="max-w-3xl mx-auto text-center py-12">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-500 mb-6">{error || 'Solicitação não encontrada'}</p>
          <button onClick={() => router.push('/solicitacoes')} className="btn-primary">
            Voltar para Solicitações
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.SEARCHING;
  const StatusIcon = statusConfig.icon;

  return (
    <DashboardLayout title="Detalhes da Solicitação">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Voltar
        </button>

        {/* Main Info Card */}
        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                <StatusIcon className="w-4 h-4" />
                {statusConfig.label}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 mt-3">{request.title}</h1>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${URGENCY_CONFIG[request.urgency].color}`}>
              {URGENCY_CONFIG[request.urgency].label}
            </span>
          </div>

          {request.description && (
            <p className="text-gray-600 mb-6">{request.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Veículo</p>
                <p className="font-medium text-gray-900">
                  {request.vehicle.make} {request.vehicle.model}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tipo</p>
                <p className="font-medium text-gray-900">
                  {SERVICE_TYPE_LABELS[request.serviceType] || request.serviceType}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Criado em</p>
                <p className="font-medium text-gray-900">
                  {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {request.preferredDate && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Data preferencial</p>
                  <p className="font-medium text-gray-900">
                    {new Date(request.preferredDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Cancelar */}
          {['SEARCHING', 'QUOTES_RECEIVED'].includes(request.status) && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={handleCancelRequest}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Cancelar Solicitação
              </button>
            </div>
          )}
        </div>

        {/* Quotes Section */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Orçamentos ({request.quotes?.length || 0})
          </h2>

          {(!request.quotes || request.quotes.length === 0) ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aguardando orçamentos...</p>
              <p className="text-sm text-gray-400 mt-1">
                Fornecedores próximos estão sendo notificados
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {request.quotes.map((quote) => (
                <div
                  key={quote.id}
                  className={`border-2 rounded-xl p-4 transition-all ${
                    quote.status === 'ACCEPTED'
                      ? 'border-green-300 bg-green-50'
                      : quote.status === 'REJECTED'
                      ? 'border-red-200 bg-red-50 opacity-60'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Provider Info */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <User className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {quote.provider?.companyName || 'Fornecedor'}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{quote.provider?.rating?.toFixed(1) || '5.0'}</span>
                          </div>
                          <span className="text-gray-400">
                            ({quote.provider?.totalReviews || 0} avaliações)
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {quote.status === 'ACCEPTED' && (
                      <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                        ✓ Aceito
                      </span>
                    )}
                    {quote.status === 'REJECTED' && (
                      <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
                        Recusado
                      </span>
                    )}
                  </div>

                  {/* Quote Details */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Mão de obra</p>
                        <p className="font-semibold text-gray-900">
                          R$ {quote.laborCost?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Peças</p>
                        <p className="font-semibold text-gray-900">
                          R$ {quote.partsCost?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p className="font-bold text-primary-600 text-lg">
                          R$ {quote.totalCost?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                    
                    {quote.estimatedHours && (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                        <p className="text-sm text-gray-500">
                          Tempo estimado: <span className="font-medium text-gray-700">{quote.estimatedHours}h</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {quote.notes && (
                    <p className="text-sm text-gray-600 mb-4">{quote.notes}</p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>Válido até: {new Date(quote.validUntil).toLocaleDateString('pt-BR')}</span>
                    {quote.provider?.phone && (
                      <a 
                        href={`tel:${quote.provider.phone}`}
                        className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
                      >
                        <Phone className="w-4 h-4" />
                        {quote.provider.phone}
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  {quote.status === 'PENDING' && request.status !== 'CANCELLED' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAcceptQuote(quote.id)}
                        disabled={acceptingQuote === quote.id}
                        className="flex-1 btn-primary py-3 disabled:opacity-50"
                      >
                        {acceptingQuote === quote.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processando...
                          </span>
                        ) : (
                          'Aceitar Orçamento'
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectQuote(quote.id)}
                        className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

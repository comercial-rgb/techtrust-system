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
  CreditCard,
  FileText,
  Image,
  Send,
} from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
}

interface Provider {
  id: string;
  companyName: string;
  rating: number;
  totalReviews: number;
  phone: string;
  address: string;
}

interface ServiceRequest {
  id: string;
  title: string;
  serviceType: string;
}

interface WorkOrder {
  id: string;
  serviceRequest: ServiceRequest;
  vehicle: Vehicle;
  provider: Provider;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  estimatedHours: number;
  actualHours: number | null;
  notes: string;
  internalNotes: string;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  SCHEDULED: { label: 'Agendado', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Calendar },
  IN_PROGRESS: { label: 'Em Execução', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Wrench },
  WAITING_PARTS: { label: 'Aguardando Peças', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Clock },
  COMPLETED: { label: 'Concluído', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
};

export default function ServicoDetalhesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [error, setError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && id) {
      loadWorkOrder();
    }
  }, [isAuthenticated, id]);

  async function loadWorkOrder() {
    try {
      const response = await api.getWorkOrderById(id as string);
      if (response.error) {
        setError(response.error);
        return;
      }
      setWorkOrder(response.data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar ordem de serviço');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReview() {
    if (!workOrder) return;
    
    setSubmittingReview(true);
    try {
      const response = await api.createReview({
        workOrderId: workOrder.id,
        providerId: workOrder.provider.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      
      if (response.error) {
        alert(response.error);
        return;
      }
      
      setShowReviewModal(false);
      alert('Avaliação enviada com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar avaliação');
    } finally {
      setSubmittingReview(false);
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Detalhes do Serviço">
        <div className="max-w-3xl mx-auto">
          <div className="h-64 skeleton rounded-xl mb-4"></div>
          <div className="h-48 skeleton rounded-xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !workOrder) {
    return (
      <DashboardLayout title="Detalhes do Serviço">
        <div className="max-w-3xl mx-auto text-center py-12">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-500 mb-6">{error || 'Serviço não encontrado'}</p>
          <button onClick={() => router.push('/servicos')} className="btn-primary">
            Voltar para Serviços
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[workOrder.status] || STATUS_CONFIG.SCHEDULED;
  const StatusIcon = statusConfig.icon;

  return (
    <DashboardLayout title="Detalhes do Serviço">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Voltar
        </button>

        {/* Status Card */}
        <div className={`${statusConfig.bgColor} rounded-2xl p-6 mb-6`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 bg-white/50 rounded-xl flex items-center justify-center`}>
              <StatusIcon className={`w-7 h-7 ${statusConfig.color}`} />
            </div>
            <div>
              <span className={`text-sm font-medium ${statusConfig.color}`}>Status</span>
              <h2 className={`text-2xl font-bold ${statusConfig.color}`}>
                {statusConfig.label}
              </h2>
            </div>
            {!workOrder.isPaid && workOrder.status === 'COMPLETED' && (
              <span className="ml-auto px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
                Pagamento Pendente
              </span>
            )}
            {workOrder.isPaid && (
              <span className="ml-auto px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Pago
              </span>
            )}
          </div>
        </div>

        {/* Service Info */}
        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Informações do Serviço</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {workOrder.serviceRequest?.title || 'Serviço'}
          </h3>
          
          {workOrder.notes && (
            <p className="text-gray-600 mb-4">{workOrder.notes}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Veículo</p>
                <p className="font-medium text-gray-900">
                  {workOrder.vehicle?.make} {workOrder.vehicle?.model}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Data Agendada</p>
                <p className="font-medium text-gray-900">
                  {new Date(workOrder.scheduledDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {workOrder.startedAt && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Iniciado em</p>
                  <p className="font-medium text-gray-900">
                    {new Date(workOrder.startedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            )}

            {workOrder.completedAt && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-green-600">Concluído em</p>
                  <p className="font-medium text-green-700">
                    {new Date(workOrder.completedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Provider Info */}
        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Fornecedor</h2>
          
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {workOrder.provider?.companyName || 'Fornecedor'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-medium">{workOrder.provider?.rating?.toFixed(1) || '5.0'}</span>
                </div>
                <span className="text-gray-400 text-sm">
                  ({workOrder.provider?.totalReviews || 0} avaliações)
                </span>
              </div>
              
              {workOrder.provider?.address && (
                <div className="flex items-center gap-2 mt-3 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{workOrder.provider.address}</span>
                </div>
              )}
              
              {workOrder.provider?.phone && (
                <a
                  href={`tel:${workOrder.provider.phone}`}
                  className="inline-flex items-center gap-2 mt-2 text-primary-600 hover:text-primary-700"
                >
                  <Phone className="w-4 h-4" />
                  <span>{workOrder.provider.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Valores</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Mão de obra</span>
              <span className="font-medium text-gray-900">
                R$ {workOrder.laborCost?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Peças</span>
              <span className="font-medium text-gray-900">
                R$ {workOrder.partsCost?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-primary-600">
                  R$ {workOrder.totalCost?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>

          {workOrder.estimatedHours && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tempo estimado: {workOrder.estimatedHours}h</span>
                {workOrder.actualHours && (
                  <span>Tempo real: {workOrder.actualHours}h</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-soft space-y-3">
          {workOrder.status === 'COMPLETED' && !workOrder.isPaid && (
            <button
              onClick={() => router.push(`/pagamento/${workOrder.id}`)}
              className="w-full btn-primary py-4 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Realizar Pagamento
            </button>
          )}

          {workOrder.status === 'COMPLETED' && workOrder.isPaid && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Star className="w-5 h-5" />
              Avaliar Serviço
            </button>
          )}

          <button
            onClick={() => router.push(`/chat/${workOrder.provider?.id}`)}
            className="w-full border border-gray-300 text-gray-700 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            <MessageSquare className="w-5 h-5" />
            Enviar Mensagem
          </button>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Avaliar Serviço</h2>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">Como foi sua experiência?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= reviewRating
                          ? 'text-amber-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentário (opcional)
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Conte como foi o atendimento..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="flex-1 btn-primary py-3 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingReview ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Avaliação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

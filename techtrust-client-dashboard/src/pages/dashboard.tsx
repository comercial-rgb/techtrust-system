import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import {
  Car,
  FileText,
  Briefcase,
  Wallet,
  Plus,
  ChevronRight,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  Wrench,
  Droplets,
  Disc,
  ClipboardList,
  Zap,
  ArrowRight,
} from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
}

interface ServiceRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: 'SEARCHING' | 'QUOTES_RECEIVED' | 'IN_PROGRESS' | 'COMPLETED';
  quotesCount: number;
  createdAt: string;
  vehicle: {
    make: string;
    model: string;
  };
}

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState({
    activeServices: 0,
    pendingQuotes: 0,
    completedServices: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  async function loadDashboardData() {
    try {
      // Carregar dados em paralelo da API
      const [vehiclesRes, requestsRes, workOrdersRes] = await Promise.all([
        api.getVehicles(),
        api.getServiceRequests(),
        api.getWorkOrders(),
      ]);

      // Veículos
      if (vehiclesRes.data) {
        setVehicles(vehiclesRes.data);
      }

      // Solicitações
      if (requestsRes.data) {
        setRequests(requestsRes.data.map((r: any) => ({
          id: r.id,
          requestNumber: r.requestNumber || `SR-${r.id.slice(0, 8)}`,
          title: r.title,
          status: r.status,
          quotesCount: r._count?.quotes || r.quotesCount || 0,
          createdAt: r.createdAt,
          vehicle: r.vehicle,
        })));
      }

      // Estatísticas calculadas
      const activeServices = workOrdersRes.data?.filter((w: any) => 
        w.status === 'IN_PROGRESS' || w.status === 'PENDING_START'
      ).length || 0;
      
      const pendingQuotes = requestsRes.data?.filter((r: any) => 
        r.status === 'QUOTES_RECEIVED' || r.status === 'SEARCHING'
      ).length || 0;
      
      const completedServices = workOrdersRes.data?.filter((w: any) => 
        w.status === 'COMPLETED'
      ).length || 0;
      
      const totalSpent = workOrdersRes.data?.filter((w: any) => w.status === 'COMPLETED')
        .reduce((acc: number, w: any) => acc + (w.finalAmount || 0), 0) || 0;

      setStats({
        activeServices,
        pendingQuotes,
        completedServices,
        totalSpent,
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setStats({
        activeServices: 0,
        pendingQuotes: 0,
        completedServices: 0,
        totalSpent: 0,
      });
      setVehicles([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'SEARCHING':
        return { label: t.client.dashboard.status.searching, color: 'bg-blue-100 text-blue-700', icon: Clock };
      case 'QUOTES_RECEIVED':
        return { label: t.client.dashboard.status.quotes, color: 'bg-yellow-100 text-yellow-700', icon: FileText };
      case 'IN_PROGRESS':
        return { label: t.client.dashboard.status.inProgress, color: 'bg-purple-100 text-purple-700', icon: Wrench };
      case 'COMPLETED':
        return { label: t.client.dashboard.status.completed, color: 'bg-green-100 text-green-700', icon: CheckCircle };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700', icon: AlertCircle };
    }
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) return t.client.dashboard.timeAgo.now;
    if (hours < 24) return t.client.dashboard.timeAgo.hours.replace('{hours}', String(hours));
    const days = Math.floor(hours / 24);
    return t.client.dashboard.timeAgo.days.replace('{days}', String(days));
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="space-y-6">
          <div className="h-32 skeleton rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 skeleton rounded-xl"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {t.client.dashboard.welcome.replace('{name}', user?.fullName?.split(' ')[0] || '')}
            </h2>
            <p className="text-primary-100">{t.client.dashboard.subtitle}</p>
          </div>
          <button
            onClick={() => router.push('/solicitacoes/nova')}
            className="bg-white text-primary-600 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-primary-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t.client.dashboard.newRequest}
          </button>
        </div>
      </div>

      {/* Promotional Offers */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Special Offers</h3>
          <button
            onClick={() => router.push('/solicitacoes/nova')}
            className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
          >
            Book now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Oil Change */}
          <div
            onClick={() => router.push('/solicitacoes/nova')}
            className="relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
            <Droplets className="w-8 h-8 mb-3 relative z-10" />
            <p className="font-bold text-lg mb-1 relative z-10">Oil Change Special</p>
            <p className="text-sm text-amber-100 mb-4 relative z-10">Full synthetic + filter included</p>
            <span className="inline-flex items-center gap-1 bg-white/25 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold relative z-10">
              Save up to 20%
            </span>
          </div>

          {/* Brake Inspection */}
          <div
            onClick={() => router.push('/solicitacoes/nova')}
            className="relative bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-5 text-white overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
            <Disc className="w-8 h-8 mb-3 relative z-10" />
            <p className="font-bold text-lg mb-1 relative z-10">Brake Inspection</p>
            <p className="text-sm text-rose-100 mb-4 relative z-10">Complete brake check & diagnosis</p>
            <span className="inline-flex items-center gap-1 bg-white/25 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold relative z-10">
              Free estimate
            </span>
          </div>

          {/* Full Inspection */}
          <div
            onClick={() => router.push('/solicitacoes/nova')}
            className="relative bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
            <ClipboardList className="w-8 h-8 mb-3 relative z-10" />
            <p className="font-bold text-lg mb-1 relative z-10">Multi-Point Inspection</p>
            <p className="text-sm text-emerald-100 mb-4 relative z-10">30-point vehicle health check</p>
            <span className="inline-flex items-center gap-1 bg-white/25 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold relative z-10">
              First service free
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border-l-4 border-blue-500 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.activeServices}</p>
              <p className="text-sm text-gray-500">{t.client.dashboard.activeServices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border-l-4 border-yellow-500 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingQuotes}</p>
              <p className="text-sm text-gray-500">{t.client.dashboard.pendingQuotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border-l-4 border-green-500 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completedServices}</p>
              <p className="text-sm text-gray-500">{t.client.dashboard.completedServices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border-l-4 border-purple-500 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${stats.totalSpent}</p>
              <p className="text-sm text-gray-500">{t.client.dashboard.totalSpent}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Vehicles */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-soft overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{t.client.dashboard.vehicles}</h3>
              <button
                onClick={() => router.push('/veiculos')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {t.common.viewAll}
              </button>
            </div>
            <div className="p-4 space-y-3">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => router.push(`/veiculos/${vehicle.id}`)}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Car className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm text-gray-500">{vehicle.year} • {vehicle.plateNumber}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}

              <button
                onClick={() => router.push('/veiculos/novo')}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t.client.dashboard.addVehicle}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Requests */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-soft overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{t.client.dashboard.recentRequests}</h3>
              <button
                onClick={() => router.push('/solicitacoes')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {t.common.viewAll}
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {requests.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4">{t.client.dashboard.noRequests}</p>
                  <button
                    onClick={() => router.push('/solicitacoes/nova')}
                    className="btn btn-primary"
                  >
                    <Plus className="w-5 h-5" />
                    {t.client.dashboard.createRequest}
                  </button>
                </div>
              ) : (
                requests.map((request) => {
                  const statusInfo = getStatusInfo(request.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <div
                      key={request.id}
                      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/solicitacoes/${request.id}`)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <StatusIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-gray-900">{request.title}</p>
                              <p className="text-sm text-gray-500">
                                {request.vehicle.make} {request.vehicle.model} • #{request.requestNumber}
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatTimeAgo(request.createdAt)}
                            </span>
                            {request.quotesCount > 0 && request.status === 'QUOTES_RECEIVED' && (
                              <span className="flex items-center gap-1 text-yellow-600 font-medium">
                                <Star className="w-4 h-4" />
                                {t.client.dashboard.quotesCount.replace('{count}', String(request.quotesCount))}
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
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💡</span>
          </div>
          <div>
            <p className="font-semibold text-yellow-800">{t.client.dashboard.tip.title}</p>
            <p className="text-sm text-yellow-700 mt-1">{t.client.dashboard.tip.content}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

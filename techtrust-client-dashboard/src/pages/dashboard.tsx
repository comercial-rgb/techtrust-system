import { useEffect, useState, useRef } from 'react';
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
  Tag,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react';

import { logApiError } from "../utils/logger";
interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  linkType?: string;
}

interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  discountLabel: string;
  discountType: string;
  discountValue?: number;
  promoCode?: string;
  serviceType?: string;
  validUntil?: string;
}

const OFFER_GRADIENTS = [
  'from-amber-500 to-orange-600',
  'from-rose-500 to-red-600',
  'from-emerald-500 to-green-600',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-teal-500 to-cyan-600',
];

const SERVICE_ICON_MAP: Record<string, any> = {
  oil: Droplets,
  brake: Disc,
  inspection: ClipboardList,
  electric: Zap,
  tire: Car,
  transmission: Wrench,
  default: Tag,
};

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
  const [banners, setBanners] = useState<Banner[]>([]);
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerTimer = useRef<ReturnType<typeof setInterval> | null>(null);
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

  useEffect(() => {
    if (banners.length > 1) {
      bannerTimer.current = setInterval(() => {
        setActiveBanner(prev => (prev + 1) % banners.length);
      }, 4000);
    }
    return () => { if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, [banners.length]);

  async function loadDashboardData() {
    try {
      const [vehiclesRes, requestsRes, workOrdersRes, homeDataRes] = await Promise.all([
        api.getVehicles(),
        api.getServiceRequests(),
        api.getWorkOrders(),
        api.getHomeData(),
      ]);

      if (homeDataRes.data) {
        setBanners(homeDataRes.data.banners || []);
        setOffers(homeDataRes.data.offers || []);
      }

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
      logApiError('Erro ao carregar dashboard:', error);
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

      {/* Popular Services */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Popular Services</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'Oil Change', serviceType: 'oil', Icon: Droplets, bg: 'bg-amber-100', color: 'text-amber-600' },
            { label: 'Brakes', serviceType: 'brake', Icon: Disc, bg: 'bg-red-100', color: 'text-red-600' },
            { label: 'Diagnostics', serviceType: 'diagnostic', Icon: Zap, bg: 'bg-violet-100', color: 'text-violet-600' },
            { label: 'A/C', serviceType: 'ac', Icon: Wrench, bg: 'bg-sky-100', color: 'text-sky-600' },
            { label: 'Tires', serviceType: 'tire', Icon: Car, bg: 'bg-emerald-100', color: 'text-emerald-600' },
            { label: 'Inspection', serviceType: 'inspection', Icon: ClipboardList, bg: 'bg-indigo-100', color: 'text-indigo-600' },
          ].map(({ label, serviceType, Icon, bg, color }) => (
            <button
              key={serviceType}
              onClick={() => router.push(`/solicitacoes/nova?serviceType=${serviceType}`)}
              className="flex flex-col items-center gap-2.5 bg-white rounded-2xl p-4 shadow-soft hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Banner Carousel — only when admin has active banners */}
      {banners.length > 0 && (
        <div className="relative mb-8 rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: '16/5', maxHeight: '260px', minHeight: '140px' }}>
          {banners.map((banner, idx) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ${idx === activeBanner ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              {/* Background image */}
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
              {/* Text content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h3 className="text-white text-xl font-bold leading-tight mb-1">{banner.title}</h3>
                {banner.subtitle && <p className="text-white/80 text-sm mb-3">{banner.subtitle}</p>}
                {banner.linkUrl && (
                  <button
                    onClick={() => {
                      if (banner.linkType === 'external') window.open(banner.linkUrl, '_blank');
                      else router.push(banner.linkUrl!);
                    }}
                    className="self-start flex items-center gap-1.5 bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Learn more <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Prev / Next arrows */}
          {banners.length > 1 && (
            <>
              <button
                onClick={() => { setActiveBanner(p => (p - 1 + banners.length) % banners.length); if (bannerTimer.current) clearInterval(bannerTimer.current); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors z-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setActiveBanner(p => (p + 1) % banners.length); if (bannerTimer.current) clearInterval(bannerTimer.current); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors z-10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {/* Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveBanner(i)}
                    className={`rounded-full transition-all ${i === activeBanner ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Special Offers — only when admin has active offers */}
      {offers.length > 0 && (
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
          <div className={`grid gap-4 ${offers.length === 1 ? 'grid-cols-1 max-w-sm' : offers.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {offers.map((offer, idx) => {
              const gradient = OFFER_GRADIENTS[idx % OFFER_GRADIENTS.length];
              const IconComp = SERVICE_ICON_MAP[offer.serviceType || ''] || SERVICE_ICON_MAP.default;
              const handleClick = () => {
                if (offer.serviceType) router.push(`/solicitacoes/nova?serviceType=${offer.serviceType}`);
                else router.push('/solicitacoes/nova');
              };
              return (
                <div
                  key={offer.id}
                  onClick={handleClick}
                  className={`relative bg-gradient-to-br ${gradient} rounded-2xl p-5 text-white overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all`}
                >
                  {/* Decorative blobs */}
                  <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
                  <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
                  {/* Image overlay if available */}
                  {offer.imageUrl && (
                    <img src={offer.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                  )}
                  <IconComp className="w-8 h-8 mb-3 relative z-10" />
                  <p className="font-bold text-lg mb-1 relative z-10 leading-tight">{offer.title}</p>
                  <p className="text-sm text-white/80 mb-4 relative z-10 line-clamp-2">{offer.description}</p>
                  <div className="flex items-center gap-2 relative z-10 flex-wrap">
                    <span className="inline-flex items-center gap-1 bg-white/25 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold">
                      {offer.discountLabel}
                    </span>
                    {offer.promoCode && (
                      <span className="inline-flex items-center gap-1 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-mono font-semibold">
                        {offer.promoCode}
                      </span>
                    )}
                  </div>
                  {offer.validUntil && (
                    <p className="text-[10px] text-white/60 mt-2 relative z-10">
                      Valid until {new Date(offer.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

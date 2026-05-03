import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  Car,
  Plus,
  MoreVertical,
  Calendar,
  Star,
  Wrench,
  AlertTriangle,
  Crown,
  ArrowUpCircle,
} from 'lucide-react';

import { logApiError } from "../../utils/logger";
interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color?: string;
  currentMileage?: number;
  lastService?: string;
  nextServiceDue?: string;
  isDefault: boolean;
}

interface SubscriptionInfo {
  plan: string;
  vehicleLimit: number;
}

export default function VeiculosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { translate: t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({ plan: '', vehicleLimit: 1 });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadVehicles();
      loadSubscription();
    }
  }, [isAuthenticated]);

  async function loadVehicles() {
    try {
      const response = await api.getVehicles();
      if (response.data) {
        setVehicles(response.data.map((v: any) => ({
          id: v.id,
          make: v.make,
          model: v.model,
          year: v.year,
          plateNumber: v.plateNumber,
          color: v.color,
          currentMileage: v.mileage || v.currentMileage,
          lastService: v.lastServiceDate,
          nextServiceDue: v.nextServiceDue,
          isDefault: v.isDefault || false,
        })));
      } else {
        setVehicles([]);
      }
    } catch (error) {
      logApiError('Erro ao carregar veículos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSubscription() {
    const PLAN_LABELS: Record<string, string> = {
      FREE: 'Free', STARTER: 'Starter', PRO: 'Pro', ENTERPRISE: 'Enterprise',
    };
    try {
      const response = await api.getProfile();
      // Backend returns { user: {...}, subscription: {...} } at the same level
      const raw = response.data as any;
      const sub = raw?.subscription || raw?.user?.subscription;
      if (sub) {
        const planKey = (sub.plan || '').toUpperCase();
        setSubscription({
          plan: PLAN_LABELS[planKey] || sub.plan || 'Free',
          vehicleLimit: sub.maxVehicles || sub.vehicleLimit || sub.plan?.vehicleLimit || 1,
        });
      } else {
        setSubscription({ plan: 'Free', vehicleLimit: 1 });
      }
    } catch {
      setSubscription({ plan: 'Free', vehicleLimit: 1 });
    }
  }

  function handleAddVehicle() {
    if (vehicles.length >= subscription.vehicleLimit) {
      setShowUpgradeModal(true);
    } else {
      router.push('/veiculos/novo');
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function isServiceDue(date?: string) {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title={t('client.nav.vehicles')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 skeleton rounded-xl"></div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('client.nav.vehicles')}>
      {/* Stats */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {vehicles.length}<span className="text-lg text-gray-400">/{subscription.vehicleLimit}</span>
              </p>
              <p className="text-sm text-gray-500">{t('client.vehicles.registered')}</p>
            </div>
            <div className="h-12 w-px bg-gray-200 hidden sm:block"></div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {vehicles.reduce((acc, v) => acc + (v.currentMileage || 0), 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">{t('client.vehicles.totalMileage')}</p>
            </div>
            {subscription.plan && (
              <>
                <div className="h-12 w-px bg-gray-200 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <Crown className={`w-5 h-5 ${subscription.plan === 'Premium' ? 'text-yellow-500' : subscription.plan === 'Basic' || subscription.plan === 'Starter' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-semibold text-gray-900">{subscription.plan}</p>
                    <p className="text-xs text-gray-500">{t('client.vehicles.yourPlan')}</p>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {vehicles.length >= subscription.vehicleLimit && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="btn btn-secondary border-yellow-400 text-yellow-600 hover:bg-yellow-50"
              >
                <ArrowUpCircle className="w-5 h-5" />
                {t('client.vehicles.upgrade')}
              </button>
            )}
            <button
              onClick={handleAddVehicle}
              className={`btn ${vehicles.length >= subscription.vehicleLimit ? 'btn-secondary opacity-60' : 'btn-primary'}`}
            >
              <Plus className="w-5 h-5" />
              {t('client.dashboard.addVehicle')}
            </button>
          </div>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white rounded-xl shadow-soft overflow-hidden card-hover">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Car className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {vehicle.make} {vehicle.model}
                      </h3>
                      {vehicle.isDefault && (
                        <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3" />
                          {t('client.vehicles.default')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{vehicle.year}</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('client.vehicles.plate')}</p>
                  <p className="font-semibold text-gray-900">{vehicle.plateNumber}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('client.vehicles.color')}</p>
                  <p className="font-semibold text-gray-900">{vehicle.color || '-'}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('client.vehicles.mileage')}</p>
                  <p className="font-semibold text-gray-900">
                    {vehicle.currentMileage?.toLocaleString() || '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {vehicle.lastService && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600">{t('client.vehicles.lastService')}</span>
                    <span className="font-medium text-gray-900">{formatDate(vehicle.lastService)}</span>
                  </div>
                )}
                {vehicle.nextServiceDue && (
                  <div className={`flex items-center gap-2 text-sm ${isServiceDue(vehicle.nextServiceDue) ? 'text-red-600' : ''}`}>
                    {isServiceDue(vehicle.nextServiceDue) ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Wrench className="w-4 h-4 text-gray-400" />
                    )}
                    <span className={isServiceDue(vehicle.nextServiceDue) ? 'text-red-600' : 'text-gray-600'}>
                      {t('client.vehicles.nextService')}
                    </span>
                    <span className={`font-medium ${isServiceDue(vehicle.nextServiceDue) ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatDate(vehicle.nextServiceDue)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/solicitacoes/nova?vehicleId=${vehicle.id}`)}
                  className="flex-1 btn btn-primary"
                >
                  <Plus className="w-4 h-4" />
                  {t('client.dashboard.newRequest')}
                </button>
                {!vehicle.isDefault && (
                  <button className="btn btn-secondary">
                    <Star className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add Vehicle Card */}
        <div
          onClick={handleAddVehicle}
          className={`bg-white rounded-xl border-2 border-dashed flex items-center justify-center min-h-[300px] cursor-pointer transition-colors ${
            vehicles.length >= subscription.vehicleLimit
              ? 'border-gray-200 bg-gray-50 opacity-60'
              : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/30'
          }`}
        >
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100">
              {vehicles.length >= subscription.vehicleLimit ? (
                <ArrowUpCircle className="w-8 h-8 text-yellow-500" />
              ) : (
                <Plus className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <p className="text-gray-600 font-medium">
              {vehicles.length >= subscription.vehicleLimit
                ? t('client.vehicles.limitReached')
                : t('client.vehicles.addNew')}
            </p>
            {vehicles.length >= subscription.vehicleLimit && (
              <p className="text-sm text-gray-400 mt-1">
                {t('client.vehicles.limitDesc')
                  .replace('{plan}', subscription.plan)
                  .replace('{limit}', String(subscription.vehicleLimit))}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('client.vehicles.limitTitle')}</h2>
              <p className="text-gray-600">
                {t('client.vehicles.limitBody')
                  .replace('{plan}', subscription.plan)
                  .replace('{limit}', String(subscription.vehicleLimit))}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 btn btn-secondary py-3"
              >
                {t('client.vehicles.back')}
              </button>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  router.push('/planos');
                }}
                className="flex-1 btn btn-primary py-3"
              >
                {t('client.vehicles.viewPlans')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

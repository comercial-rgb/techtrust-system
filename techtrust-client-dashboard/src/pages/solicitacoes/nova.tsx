import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  Car,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
}

export default function NovaSolicitacaoPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { translate: t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState('');

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'>('MEDIUM');
  const [preferredDate, setPreferredDate] = useState('');

  const SERVICE_TYPES = [
    { value: 'oil', icon: '🛢️' },
    { value: 'brake', icon: '🛞' },
    { value: 'tire', icon: '🔧' },
    { value: 'engine', icon: '⚙️' },
    { value: 'electric', icon: '⚡' },
    { value: 'ac', icon: '❄️' },
    { value: 'suspension', icon: '🔩' },
    { value: 'transmission', icon: '🚗' },
    { value: 'air_filter', icon: '💨' },
    { value: 'belts_hoses', icon: '🔗' },
    { value: 'cooling', icon: '🌡️' },
    { value: 'fuel_system', icon: '⛽' },
    { value: 'steering', icon: '🎯' },
    { value: 'exhaust', icon: '💨' },
    { value: 'drivetrain', icon: '⚙️' },
    { value: 'fluids', icon: '🧴' },
    { value: 'general_repair', icon: '🔨' },
    { value: 'inspection', icon: '📋' },
    { value: 'maintenance', icon: '🔎' },
    { value: 'detailing', icon: '✨' },
    { value: 'battery', icon: '🔋' },
    { value: 'towing', icon: '🚛' },
  ].map((s) => ({
    ...s,
    label: t(`client.requests.serviceTypes.${s.value}`) || s.value,
  }));

  const URGENCY_OPTIONS = [
    { value: 'LOW', labelKey: 'client.requests.urgencyLow', descKey: 'client.requests.urgencyLowDesc', color: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'MEDIUM', labelKey: 'client.requests.urgencyMedium', descKey: 'client.requests.urgencyMediumDesc', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 'HIGH', labelKey: 'client.requests.urgencyHigh', descKey: 'client.requests.urgencyHighDesc', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { value: 'EMERGENCY', labelKey: 'client.requests.urgencyEmergency', descKey: 'client.requests.urgencyEmergencyDesc', color: 'bg-red-100 text-red-700 border-red-300' },
  ];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadVehicles();
    }
  }, [isAuthenticated]);

  async function loadVehicles() {
    try {
      const response = await api.getVehicles();
      if (response.data) {
        setVehicles(response.data);
        if (response.data.length === 1) {
          setSelectedVehicle(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar veículos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!selectedVehicle || !title || !serviceType) {
      setError(t('client.requests.errorRequired'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.createServiceRequest({
        vehicleId: selectedVehicle,
        title,
        description,
        serviceType,
        urgency,
        preferredDate: preferredDate || undefined,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      router.push('/solicitacoes');
    } catch (err: any) {
      setError(err.message || t('client.requests.errorRequired'));
    } finally {
      setSubmitting(false);
    }
  }

  function nextStep() {
    if (step === 1 && !selectedVehicle) {
      setError(t('client.requests.errorVehicle'));
      return;
    }
    if (step === 2 && !serviceType) {
      setError(t('client.requests.errorService'));
      return;
    }
    if (step === 3 && !title) {
      setError(t('client.requests.errorTitle'));
      return;
    }
    setError('');
    setStep(step + 1);
  }

  function prevStep() {
    setError('');
    setStep(step - 1);
  }

  const pageTitle = t('client.requests.title') || 'New Request';

  if (authLoading || loading) {
    return (
      <DashboardLayout title={pageTitle}>
        <div className="max-w-2xl mx-auto">
          <div className="h-64 skeleton rounded-xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={pageTitle}>
      <div className="max-w-2xl mx-auto">
        {/* Progress header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            {t('client.requests.back')}
          </button>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-primary-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-500">
            <span className={step >= 1 ? 'text-primary-600 font-medium' : ''}>{t('client.requests.stepVehicle')}</span>
            <span className={step >= 2 ? 'text-primary-600 font-medium' : ''}>{t('client.requests.stepService')}</span>
            <span className={step >= 3 ? 'text-primary-600 font-medium' : ''}>{t('client.requests.stepDetails')}</span>
            <span className={step >= 4 ? 'text-primary-600 font-medium' : ''}>{t('client.requests.stepConfirm')}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Step 1: Select Vehicle */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('client.requests.selectVehicle')}</h2>

            {vehicles.length === 0 ? (
              <div className="text-center py-8">
                <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">{t('client.requests.noVehicles')}</p>
                <button onClick={() => router.push('/veiculos/novo')} className="btn-primary">
                  {t('client.requests.addVehicle')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedVehicle === vehicle.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        selectedVehicle === vehicle.id ? 'bg-primary-100' : 'bg-gray-100'
                      }`}>
                        <Car className={`w-6 h-6 ${selectedVehicle === vehicle.id ? 'text-primary-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{vehicle.make} {vehicle.model}</p>
                        <p className="text-sm text-gray-500">{vehicle.year} • {vehicle.plateNumber}</p>
                      </div>
                      {selectedVehicle === vehicle.id && (
                        <CheckCircle className="w-6 h-6 text-primary-600 ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Service Type */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('client.requests.serviceType')}</h2>

            <div className="grid grid-cols-2 gap-3">
              {SERVICE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    setServiceType(type.value);
                    if (!title) setTitle(type.label);
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    serviceType === type.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{type.icon}</span>
                  <p className="font-medium text-gray-900">{type.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('client.requests.serviceDetails')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('client.requests.titleLabel')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('client.requests.titlePlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('client.requests.descriptionLabel')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('client.requests.descriptionPlaceholder')}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('client.requests.urgencyLabel')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {URGENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setUrgency(opt.value as any)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        urgency === opt.value
                          ? opt.color + ' border-current'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium">{t(opt.labelKey)}</p>
                      <p className="text-xs opacity-75">{t(opt.descKey)}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('client.requests.dateLabel')}
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('client.requests.confirmTitle')}</h2>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">{t('client.requests.vehicleLabel')}</p>
                <p className="font-semibold text-gray-900">
                  {vehicles.find(v => v.id === selectedVehicle)?.make}{' '}
                  {vehicles.find(v => v.id === selectedVehicle)?.model}{' '}
                  {vehicles.find(v => v.id === selectedVehicle)?.year}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">{t('client.requests.serviceLabel')}</p>
                <p className="font-semibold text-gray-900">{title}</p>
                {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">{t('client.requests.urgencyConfirmLabel')}</p>
                <p className="font-semibold text-gray-900">
                  {t(URGENCY_OPTIONS.find(u => u.value === urgency)?.labelKey || '')}
                </p>
              </div>

              {preferredDate && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">{t('client.requests.dateConfirmLabel')}</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(preferredDate + 'T00:00:00').toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
                <p className="text-sm text-primary-700">
                  🔔 {t('client.requests.notification')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
            >
              {t('client.requests.back')}
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button onClick={nextStep} className="btn-primary flex items-center gap-2">
              {t('client.requests.continue')}
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('client.requests.sending')}
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  {t('client.requests.send')}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

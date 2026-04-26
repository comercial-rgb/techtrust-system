import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  Car,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Camera,
  MapPin,
  Calendar,
  FileText,
} from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
}

const SERVICE_TYPES = [
  { value: 'oil', label: 'Troca de Óleo', icon: '🛢️' },
  { value: 'brake', label: 'Serviço de Freios', icon: '🛞' },
  { value: 'tire', label: 'Pneus e Alinhamento', icon: '🔧' },
  { value: 'engine', label: 'Motor', icon: '⚙️' },
  { value: 'electric', label: 'Elétrica', icon: '⚡' },
  { value: 'ac', label: 'Ar Condicionado', icon: '❄️' },
  { value: 'suspension', label: 'Suspensão', icon: '🔩' },
  { value: 'transmission', label: 'Transmissão', icon: '🚗' },
  { value: 'air_filter', label: 'Filtro de Ar', icon: '💨' },
  { value: 'belts_hoses', label: 'Correias e Mangueiras', icon: '🔗' },
  { value: 'cooling', label: 'Arrefecimento', icon: '🌡️' },
  { value: 'fuel_system', label: 'Sistema de Combustível', icon: '⛽' },
  { value: 'steering', label: 'Direção', icon: '🎯' },
  { value: 'exhaust', label: 'Escapamento', icon: '💨' },
  { value: 'drivetrain', label: 'Transmissão/Tração', icon: '⚙️' },
  { value: 'fluids', label: 'Fluidos', icon: '🧴' },
  { value: 'general_repair', label: 'Reparo Geral', icon: '🔨' },
  { value: 'inspection', label: 'Inspeção/Revisão', icon: '📋' },
  { value: 'maintenance', label: 'Revisão Preventiva', icon: '🔎' },
  { value: 'detailing', label: 'Estética/Detailing', icon: '✨' },
  { value: 'battery', label: 'Bateria', icon: '🔋' },
  { value: 'towing', label: 'Reboque', icon: '🚛' },
];

const URGENCY_OPTIONS = [
  { value: 'LOW', label: 'Baixa', description: 'Posso esperar alguns dias', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'MEDIUM', label: 'Média', description: 'Preciso em até 3 dias', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'HIGH', label: 'Alta', description: 'Preciso amanhã', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'EMERGENCY', label: 'Urgente', description: 'Preciso hoje!', color: 'bg-red-100 text-red-700 border-red-300' },
];

export default function NovaSolicitacaoPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState('');

  // Form state
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'>('MEDIUM');
  const [preferredDate, setPreferredDate] = useState('');
  const [location, setLocation] = useState('');

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
      setError('Preencha todos os campos obrigatórios');
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

      // Sucesso - redirecionar para solicitações
      router.push('/solicitacoes');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar solicitação');
    } finally {
      setSubmitting(false);
    }
  }

  function nextStep() {
    if (step === 1 && !selectedVehicle) {
      setError('Selecione um veículo');
      return;
    }
    if (step === 2 && !serviceType) {
      setError('Selecione o tipo de serviço');
      return;
    }
    if (step === 3 && !title) {
      setError('Descreva o serviço');
      return;
    }
    setError('');
    setStep(step + 1);
  }

  function prevStep() {
    setError('');
    setStep(step - 1);
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Nova Solicitação">
        <div className="max-w-2xl mx-auto">
          <div className="h-64 skeleton rounded-xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Nova Solicitação">
      <div className="max-w-2xl mx-auto">
        {/* Header com progresso */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            Voltar
          </button>
          
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${
                  s <= step ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-500">
            <span className={step >= 1 ? 'text-primary-600 font-medium' : ''}>Veículo</span>
            <span className={step >= 2 ? 'text-primary-600 font-medium' : ''}>Serviço</span>
            <span className={step >= 3 ? 'text-primary-600 font-medium' : ''}>Detalhes</span>
            <span className={step >= 4 ? 'text-primary-600 font-medium' : ''}>Confirmar</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Step 1: Selecionar Veículo */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Selecione o Veículo</h2>
            
            {vehicles.length === 0 ? (
              <div className="text-center py-8">
                <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Você não tem veículos cadastrados</p>
                <button
                  onClick={() => router.push('/veiculos/novo')}
                  className="btn-primary"
                >
                  Adicionar Veículo
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
                        <Car className={`w-6 h-6 ${
                          selectedVehicle === vehicle.id ? 'text-primary-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-sm text-gray-500">
                          {vehicle.year} • {vehicle.plateNumber}
                        </p>
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

        {/* Step 2: Tipo de Serviço */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Tipo de Serviço</h2>
            
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

        {/* Step 3: Detalhes */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Detalhes do Serviço</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Troca de óleo e filtros"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o problema ou serviço desejado..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgência
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
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-xs opacity-75">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data preferencial (opcional)
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

        {/* Step 4: Confirmar */}
        {step === 4 && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Confirmar Solicitação</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Veículo</p>
                <p className="font-semibold text-gray-900">
                  {vehicles.find(v => v.id === selectedVehicle)?.make}{' '}
                  {vehicles.find(v => v.id === selectedVehicle)?.model}{' '}
                  {vehicles.find(v => v.id === selectedVehicle)?.year}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Serviço</p>
                <p className="font-semibold text-gray-900">{title}</p>
                {description && (
                  <p className="text-sm text-gray-600 mt-1">{description}</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Urgência</p>
                <p className="font-semibold text-gray-900">
                  {URGENCY_OPTIONS.find(u => u.value === urgency)?.label}
                </p>
              </div>

              {preferredDate && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Data preferencial</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(preferredDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
                <p className="text-sm text-primary-700">
                  🔔 Você receberá orçamentos de fornecedores próximos. 
                  Compare os preços e escolha o melhor para você!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
            >
              Voltar
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={nextStep}
              className="btn-primary flex items-center gap-2"
            >
              Continuar
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
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Criar Solicitação
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

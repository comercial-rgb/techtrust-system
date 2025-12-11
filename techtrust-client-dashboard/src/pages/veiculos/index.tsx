import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  Car,
  Plus,
  MoreVertical,
  Calendar,
  Gauge,
  Star,
  Wrench,
  AlertTriangle,
} from 'lucide-react';

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

export default function VeiculosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

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
        // Fallback mock data
        setVehicles([
          {
            id: '1',
            make: 'Honda',
            model: 'Civic',
            year: 2020,
            plateNumber: 'ABC1234',
            color: 'Prata',
            currentMileage: 45000,
            lastService: '2024-01-15',
            nextServiceDue: '2024-07-15',
            isDefault: true,
          },
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar veículos:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('pt-BR', {
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
      <DashboardLayout title="Meus Veículos">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 skeleton rounded-xl"></div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Meus Veículos">
      {/* Stats */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-3xl font-bold text-gray-900">{vehicles.length}</p>
              <p className="text-sm text-gray-500">Veículos cadastrados</p>
            </div>
            <div className="h-12 w-px bg-gray-200"></div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {vehicles.reduce((acc, v) => acc + (v.currentMileage || 0), 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">KM Total</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/veiculos/novo')}
            className="btn btn-primary"
          >
            <Plus className="w-5 h-5" />
            Adicionar Veículo
          </button>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-white rounded-xl shadow-soft overflow-hidden card-hover"
          >
            {/* Header */}
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
                          Padrão
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

            {/* Details */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Placa</p>
                  <p className="font-semibold text-gray-900">{vehicle.plateNumber}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Cor</p>
                  <p className="font-semibold text-gray-900">{vehicle.color || '-'}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">KM</p>
                  <p className="font-semibold text-gray-900">
                    {vehicle.currentMileage?.toLocaleString() || '-'}
                  </p>
                </div>
              </div>

              {/* Service Info */}
              <div className="space-y-2">
                {vehicle.lastService && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600">Último serviço:</span>
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
                      Próxima revisão:
                    </span>
                    <span className={`font-medium ${isServiceDue(vehicle.nextServiceDue) ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatDate(vehicle.nextServiceDue)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5">
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/solicitacoes/nova?vehicleId=${vehicle.id}`)}
                  className="flex-1 btn btn-primary"
                >
                  <Plus className="w-4 h-4" />
                  Solicitar Serviço
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
          onClick={() => router.push('/veiculos/novo')}
          className="bg-white rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center min-h-[300px] cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">Adicionar novo veículo</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

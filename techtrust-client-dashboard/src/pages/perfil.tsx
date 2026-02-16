import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../services/api';
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Bell,
  Shield,
  ChevronRight,
  Camera,
  Car,
  Briefcase,
  LogOut,
} from 'lucide-react';

export default function PerfilPage() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [stats, setStats] = useState({ totalServices: 0, totalSpent: 0, vehiclesCount: 0 });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated]);

  async function loadStats() {
    try {
      const [vehiclesRes, servicesRes] = await Promise.all([
        api.getVehicles(),
        api.getWorkOrders(),
      ]);
      const vehicles = vehiclesRes.data?.data || vehiclesRes.data || [];
      const workOrders = servicesRes.data?.data || servicesRes.data || [];
      const completed = Array.isArray(workOrders) ? workOrders.filter((w: any) => w.status === 'COMPLETED') : [];
      const totalSpent = completed.reduce((sum: number, w: any) => sum + (w.finalAmount || 0), 0);
      setStats({
        totalServices: completed.length,
        totalSpent: Math.round(totalSpent),
        vehiclesCount: Array.isArray(vehicles) ? vehicles.length : 0,
      });
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    }
  }

  const menuItems = [
    { id: 'personal', title: 'Dados Pessoais', subtitle: 'Nome, email, telefone', icon: User, color: 'text-blue-600 bg-blue-100' },
    { id: 'vehicles', title: 'Meus Veículos', subtitle: `${stats.vehiclesCount} veículo(s)`, icon: Car, color: 'text-yellow-600 bg-yellow-100', href: '/veiculos' },
    { id: 'addresses', title: 'Endereços', subtitle: 'Endereços salvos', icon: MapPin, color: 'text-green-600 bg-green-100' },
    { id: 'payment', title: 'Formas de Pagamento', subtitle: 'Cartões e métodos', icon: CreditCard, color: 'text-purple-600 bg-purple-100' },
    { id: 'history', title: 'Histórico de Serviços', subtitle: `${stats.totalServices} serviços`, icon: Briefcase, color: 'text-pink-600 bg-pink-100', href: '/servicos' },
    { id: 'security', title: 'Segurança', subtitle: 'Senha e autenticação', icon: Shield, color: 'text-red-600 bg-red-100' },
  ];

  if (authLoading) {
    return (
      <DashboardLayout title="Meu Perfil">
        <div className="max-w-3xl mx-auto">
          <div className="h-48 skeleton rounded-xl mb-6"></div>
          <div className="h-32 skeleton rounded-xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Meu Perfil">
      <div className="max-w-3xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 h-24"></div>
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
              <div className="relative">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-4xl font-bold text-primary-600">
                    {user?.fullName?.charAt(0) || 'U'}
                  </span>
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center border-2 border-white">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{user?.fullName || 'Usuário'}</h2>
                <p className="text-gray-500">{user?.email}</p>
              </div>
              <div className="flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-full">
                <Shield className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-medium text-primary-700">Membro desde {user?.memberSince || '2023'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 text-center shadow-soft">
            <p className="text-3xl font-bold text-gray-900">{stats.totalServices}</p>
            <p className="text-sm text-gray-500 mt-1">Serviços</p>
          </div>
          <div className="bg-white rounded-xl p-5 text-center shadow-soft">
            <p className="text-3xl font-bold text-gray-900">${stats.totalSpent}</p>
            <p className="text-sm text-gray-500 mt-1">Investido</p>
          </div>
          <div className="bg-white rounded-xl p-5 text-center shadow-soft">
            <p className="text-3xl font-bold text-gray-900">{stats.vehiclesCount}</p>
            <p className="text-sm text-gray-500 mt-1">Veículos</p>
          </div>
        </div>

        {/* Notifications Toggles */}
        <div className="bg-white rounded-xl shadow-soft mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notificações</h3>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Notificações Push</p>
                  <p className="text-sm text-gray-500">Alertas de orçamentos e serviços</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-500">Resumos e ofertas</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-xl shadow-soft overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Minha Conta</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => item.href && router.push(item.href)}
                  className="flex items-center justify-between p-5 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.subtitle}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Support & Logout */}
        <div className="bg-white rounded-xl shadow-soft overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Ajuda & Suporte</h3>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between p-5 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg">❓</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Central de Ajuda</p>
                  <p className="text-sm text-gray-500">Dúvidas frequentes</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center justify-between p-5 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg">💬</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Fale Conosco</p>
                  <p className="text-sm text-gray-500">Suporte por chat</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-semibold py-4 rounded-xl hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair da Conta
        </button>

        {/* Version */}
        <p className="text-center text-sm text-gray-400 mt-6 mb-8">
          TechTrust v1.0.0
        </p>
      </div>
    </DashboardLayout>
  );
}

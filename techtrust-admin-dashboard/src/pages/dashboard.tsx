import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from '../components/AdminLayout';
import {
  Users,
  Building2,
  FileText,
  Wrench,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface DashboardStats {
  users: {
    total: number;
    customers: number;
    providers: number;
    newThisMonth: number;
  };
  services: {
    totalRequests: number;
    activeWorkOrders: number;
    completedThisMonth: number;
    pendingApproval: number;
  };
  revenue: {
    totalThisMonth: number;
    percentChange: number;
    pendingPayments: number;
  };
  providers: {
    total: number;
    pendingApproval: number;
    suspended: number;
  };
}

export default function DashboardPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    users: { total: 0, customers: 0, providers: 0, newThisMonth: 0 },
    services: { totalRequests: 0, activeWorkOrders: 0, completedThisMonth: 0, pendingApproval: 0 },
    revenue: { totalThisMonth: 0, percentChange: 0, pendingPayments: 0 },
    providers: { total: 0, pendingApproval: 0, suspended: 0 },
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

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
    // Simulated data - replace with API call
    setStats({
      users: { total: 1247, customers: 1089, providers: 158, newThisMonth: 87 },
      services: { totalRequests: 3456, activeWorkOrders: 234, completedThisMonth: 456, pendingApproval: 12 },
      revenue: { totalThisMonth: 125890.5, percentChange: 15.3, pendingPayments: 23450.0 },
      providers: { total: 158, pendingApproval: 8, suspended: 3 },
    });

    setRecentActivities([
      { id: 1, type: 'user', message: 'Novo usuário cadastrado: João Silva', time: '5 min atrás' },
      { id: 2, type: 'provider', message: 'Fornecedor "Auto Center Express" aguardando aprovação', time: '15 min atrás' },
      { id: 3, type: 'payment', message: 'Pagamento de R$ 450,00 confirmado', time: '1 hora atrás' },
      { id: 4, type: 'service', message: 'Serviço #WO-2024-789 concluído', time: '2 horas atrás' },
      { id: 5, type: 'alert', message: 'Avaliação negativa recebida - verificar', time: '3 horas atrás' },
    ]);

    setLoading(false);
  }

  if (authLoading || loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 skeleton rounded-xl"></div>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Users */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className="flex items-center gap-1 text-sm font-medium text-green-600">
              <ArrowUpRight className="w-4 h-4" />
              +{stats.users.newThisMonth}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.users.total.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Usuários totais</p>
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span>{stats.users.customers} clientes</span>
            <span>{stats.users.providers} fornecedores</span>
          </div>
        </div>

        {/* Services */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-purple-600" />
            </div>
            <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
              <Clock className="w-4 h-4" />
              {stats.services.activeWorkOrders} ativos
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.services.totalRequests.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Solicitações totais</p>
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span>{stats.services.completedThisMonth} concluídos este mês</span>
          </div>
        </div>

        {/* Revenue */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <span className={`flex items-center gap-1 text-sm font-medium ${stats.revenue.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.revenue.percentChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {stats.revenue.percentChange >= 0 ? '+' : ''}{stats.revenue.percentChange}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            R$ {stats.revenue.totalThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-gray-500">Receita do mês</p>
          <div className="mt-3 text-xs text-amber-600">
            R$ {stats.revenue.pendingPayments.toLocaleString('pt-BR')} pendentes
          </div>
        </div>

        {/* Providers */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-amber-600" />
            </div>
            {stats.providers.pendingApproval > 0 && (
              <span className="flex items-center gap-1 text-sm font-medium text-red-600">
                <AlertTriangle className="w-4 h-4" />
                {stats.providers.pendingApproval} pendentes
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.providers.total}</p>
          <p className="text-sm text-gray-500">Fornecedores</p>
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span>{stats.providers.suspended} suspensos</span>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ações Rápidas</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/fornecedores?filter=pending')}
                className="w-full flex items-center gap-3 p-3 bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors"
              >
                <Building2 className="w-5 h-5" />
                <span className="flex-1 text-left">Aprovar Fornecedores</span>
                <span className="bg-amber-200 px-2 py-0.5 rounded-full text-xs font-medium">
                  {stats.providers.pendingApproval}
                </span>
              </button>
              
              <button
                onClick={() => router.push('/usuarios/novo')}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <Users className="w-5 h-5" />
                <span className="flex-1 text-left">Novo Usuário</span>
              </button>
              
              <button
                onClick={() => router.push('/notificacoes/enviar')}
                className="w-full flex items-center gap-3 p-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span className="flex-1 text-left">Enviar Notificação</span>
              </button>
              
              <button
                onClick={() => router.push('/relatorios')}
                className="w-full flex items-center gap-3 p-3 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors"
              >
                <TrendingUp className="w-5 h-5" />
                <span className="flex-1 text-left">Ver Relatórios</span>
              </button>
            </div>
          </div>

          {/* Alerts */}
          {stats.providers.pendingApproval > 0 && (
            <div className="card p-6 mt-6 border-l-4 border-amber-500">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Atenção necessária</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.providers.pendingApproval} fornecedor(es) aguardando aprovação de cadastro.
                  </p>
                  <button
                    onClick={() => router.push('/fornecedores?filter=pending')}
                    className="text-sm text-admin-600 hover:text-admin-700 font-medium mt-2"
                  >
                    Revisar agora →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Atividade Recente</h2>
              <button
                onClick={() => router.push('/logs')}
                className="text-sm text-admin-600 hover:text-admin-700"
              >
                Ver tudo
              </button>
            </div>
            
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'user' ? 'bg-blue-100' :
                    activity.type === 'provider' ? 'bg-amber-100' :
                    activity.type === 'payment' ? 'bg-green-100' :
                    activity.type === 'service' ? 'bg-purple-100' :
                    'bg-red-100'
                  }`}>
                    {activity.type === 'user' && <Users className="w-5 h-5 text-blue-600" />}
                    {activity.type === 'provider' && <Building2 className="w-5 h-5 text-amber-600" />}
                    {activity.type === 'payment' && <CreditCard className="w-5 h-5 text-green-600" />}
                    {activity.type === 'service' && <CheckCircle className="w-5 h-5 text-purple-600" />}
                    {activity.type === 'alert' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">{activity.message}</p>
                    <p className="text-sm text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini Charts */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Serviços por Status</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Em andamento</span>
                    <span className="font-medium">{stats.services.activeWorkOrders}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Concluídos</span>
                    <span className="font-medium">{stats.services.completedThisMonth}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '70%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Pendentes</span>
                    <span className="font-medium">{stats.services.pendingApproval}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '15%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Usuários por Tipo</h3>
              <div className="flex items-center justify-center h-32">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#3b82f6"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(stats.users.customers / stats.users.total) * 351.86} 351.86`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{Math.round((stats.users.customers / stats.users.total) * 100)}%</span>
                    <span className="text-xs text-gray-500">Clientes</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  Clientes
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-200 rounded-full" />
                  Fornecedores
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

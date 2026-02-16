import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';
import { BarChart3, TrendingUp, Calendar, Download, DollarSign, Users, Wrench, FileText } from 'lucide-react';

export default function RelatoriosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [reportData, setReportData] = useState<any>({ totalRevenue: 0, newUsers: 0, servicesCompleted: 0, avgRating: 0 });

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);
  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated, period]);

  async function loadData() {
    setLoading(true);
    try {
      const response = await adminApi.get(`/admin/reports?type=overview&period=${period}`);
      const data = response.data?.data || response.data || {};
      setReportData({
        totalRevenue: data.totalRevenue || data.revenue?.total || 0,
        newUsers: data.newUsers || data.users?.new || 0,
        servicesCompleted: data.servicesCompleted || data.services?.completed || 0,
        avgRating: data.avgRating || data.reviews?.average || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  }

  const reports = [
    { id: 'revenue', title: 'Relatório de Receitas', description: 'Análise completa de receitas, pagamentos e comissões', icon: DollarSign, color: 'bg-green-100 text-green-600' },
    { id: 'users', title: 'Relatório de Usuários', description: 'Crescimento, retenção e análise de comportamento', icon: Users, color: 'bg-blue-100 text-blue-600' },
    { id: 'services', title: 'Relatório de Serviços', description: 'Volume, tipos e tempo médio de execução', icon: Wrench, color: 'bg-purple-100 text-purple-600' },
    { id: 'providers', title: 'Relatório de Fornecedores', description: 'Performance, avaliações e rankings', icon: FileText, color: 'bg-amber-100 text-amber-600' },
  ];

  if (authLoading || loading) return <AdminLayout title="Relatórios"><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 skeleton rounded-xl" />)}</div></AdminLayout>;

  return (
    <AdminLayout title="Relatórios">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input w-auto">
          <option value="week">Última Semana</option>
          <option value="month">Último Mês</option>
          <option value="quarter">Último Trimestre</option>
          <option value="year">Último Ano</option>
          <option value="custom">Período Personalizado</option>
        </select>
        {period === 'custom' && (
          <>
            <input type="date" className="input w-auto" />
            <input type="date" className="input w-auto" />
          </>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${reportData.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Receita Total</p>
              <p className="text-xs text-gray-400">{reportData.totalRevenue > 0 ? 'Período selecionado' : 'Sem dados'}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{reportData.newUsers}</p>
              <p className="text-sm text-gray-500">Novos Usuários</p>
              <p className="text-xs text-gray-400">{reportData.newUsers > 0 ? 'Período selecionado' : 'Sem dados'}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{reportData.servicesCompleted}</p>
              <p className="text-sm text-gray-500">Serviços Realizados</p>
              <p className="text-xs text-gray-400">{reportData.servicesCompleted > 0 ? 'Período selecionado' : 'Sem dados'}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{reportData.avgRating > 0 ? reportData.avgRating.toFixed(1) : '0'}</p>
              <p className="text-sm text-gray-500">Média de Avaliação</p>
              <p className="text-xs text-gray-400">{reportData.avgRating > 0 ? 'Período selecionado' : 'Sem dados'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="card p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Receita ao Longo do Tempo</h3>
        <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
          <div className="text-center text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-2" />
            <p>Gráfico de Receitas</p>
            <p className="text-sm">(Integrar com biblioteca de gráficos)</p>
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <h3 className="text-lg font-bold text-gray-900 mb-4">Relatórios Disponíveis</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div key={report.id} className="card p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/relatorios/${report.id}`)}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${report.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{report.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                </div>
                <button className="btn-secondary">
                  <Download className="w-4 h-4" />
                  Exportar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { Tag, Plus, Edit, Trash2, CheckCircle, XCircle, DollarSign, Users } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  features: string[];
  isActive: boolean;
  subscribersCount: number;
}

export default function AssinaturasPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);
  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated]);

  async function loadData() {
    try {
      // Carregar dados reais da API quando implementado
      setPlans([]);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }

  const totalRevenue = plans.reduce((sum, p) => sum + (p.price * p.subscribersCount), 0);
  const totalSubscribers = plans.reduce((sum, p) => sum + p.subscribersCount, 0);

  if (authLoading || loading) return <AdminLayout title="Assinaturas"><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 skeleton rounded-xl" />)}</div></AdminLayout>;

  return (
    <AdminLayout title="Planos de Assinatura">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-900">{plans.length}</p><p className="text-sm text-gray-500">Planos</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">{plans.filter(p => p.isActive).length}</p><p className="text-sm text-gray-500">Ativos</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-blue-600">{totalSubscribers}</p><p className="text-sm text-gray-500">Assinantes</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">R$ {totalRevenue.toLocaleString('pt-BR')}</p><p className="text-sm text-gray-500">Receita/mês</p></div>
      </div>

      <div className="flex justify-end mb-6">
        <button onClick={() => { setEditingPlan(null); setShowModal(true); }} className="btn-primary">
          <Plus className="w-5 h-5" />Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className={`card p-6 ${!plan.isActive ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500">{plan.description}</p>
              </div>
              <span className={`badge ${plan.isActive ? 'badge-success' : 'badge-danger'}`}>
                {plan.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="mb-4">
              <span className="text-3xl font-bold text-admin-600">R$ {plan.price.toFixed(2)}</span>
              <span className="text-gray-500">/mês</span>
            </div>

            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                {plan.subscribersCount} assinantes
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingPlan(plan); setShowModal(true); }} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingPlan ? 'Editar Plano' : 'Novo Plano'}
            </h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input type="text" className="input" defaultValue={editingPlan?.name} placeholder="Nome do plano" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <input type="text" className="input" defaultValue={editingPlan?.description} placeholder="Descrição breve" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço (R$)</label>
                <input type="number" step="0.01" className="input" defaultValue={editingPlan?.price} placeholder="99.90" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recursos (um por linha)</label>
                <textarea className="input" rows={4} defaultValue={editingPlan?.features.join('\n')} placeholder="Recurso 1&#10;Recurso 2&#10;Recurso 3" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" defaultChecked={editingPlan?.isActive ?? true} className="w-4 h-4" />
                <label htmlFor="isActive" className="text-sm text-gray-700">Plano ativo</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary py-3">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary py-3">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { Tag, Plus, Edit, Trash2, CheckCircle, XCircle, DollarSign, Users, Car, Crown, Star, Zap } from 'lucide-react';
import api from '../../services/api';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  vehicleLimit: number;
  features: string[];
  isActive: boolean;
  subscribersCount: number;
  isFeatured?: boolean;
}

// Default subscription plans for TechTrust
const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'freemium',
    name: 'Freemium',
    description: 'Perfect for getting started',
    price: 0,
    duration: 0,
    vehicleLimit: 1,
    features: [
      '1 vehicle',
      'Basic service requests',
      'Email support',
      'Standard notifications',
    ],
    isActive: true,
    subscribersCount: 0,
    isFeatured: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'For individuals with multiple vehicles',
    price: 9.99,
    duration: 30,
    vehicleLimit: 5,
    features: [
      'Up to 5 vehicles',
      'Priority service requests',
      'Chat support',
      'Service history reports',
      'Push notifications',
    ],
    isActive: true,
    subscribersCount: 0,
    isFeatured: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Best for families and small businesses',
    price: 19.99,
    duration: 30,
    vehicleLimit: 10,
    features: [
      'Up to 10 vehicles',
      'VIP service requests',
      '24/7 priority support',
      'Advanced analytics',
      'Multi-user access',
      'API access',
      'Custom reports',
    ],
    isActive: true,
    subscribersCount: 0,
    isFeatured: true,
  },
];

export default function AssinaturasPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    vehicleLimit: 1,
    features: '',
    isActive: true,
    isFeatured: false,
  });

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);
  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated]);

  async function loadData() {
    try {
      // Try to load from API
      const response = await api.get<{ plans: SubscriptionPlan[] }>('/admin/subscription-plans');
      if (response.data?.plans && response.data.plans.length > 0) {
        setPlans(response.data.plans);
      } else {
        // Use default plans if none exist
        setPlans(DEFAULT_PLANS);
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      // Use default plans on error
      setPlans(DEFAULT_PLANS);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        vehicleLimit: plan.vehicleLimit,
        features: plan.features.join('\n'),
        isActive: plan.isActive,
        isFeatured: plan.isFeatured || false,
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        vehicleLimit: 1,
        features: '',
        isActive: true,
        isFeatured: false,
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const planData = {
        ...formData,
        features: formData.features.split('\n').filter(f => f.trim()),
        duration: 30,
      };
      
      if (editingPlan) {
        // Update existing plan
        await api.put(`/admin/subscription-plans/${editingPlan.id}`, planData);
        setPlans(plans.map(p => p.id === editingPlan.id ? { ...p, ...planData } : p));
      } else {
        // Create new plan
        const response = await api.post<{ id: string }>('/admin/subscription-plans', planData);
        setPlans([...plans, { ...planData, id: response.data?.id || Date.now().toString(), subscribersCount: 0 }]);
      }
      
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      // Still update locally for demo purposes
      if (editingPlan) {
        setPlans(plans.map(p => p.id === editingPlan.id ? { 
          ...p, 
          ...formData,
          features: formData.features.split('\n').filter(f => f.trim()),
        } : p));
      } else {
        setPlans([...plans, { 
          ...formData, 
          id: Date.now().toString(), 
          features: formData.features.split('\n').filter(f => f.trim()),
          subscribersCount: 0,
          duration: 30,
        }]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    
    try {
      await api.delete(`/admin/subscription-plans/${planId}`);
      setPlans(plans.filter(p => p.id !== planId));
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      // Still remove locally for demo
      setPlans(plans.filter(p => p.id !== planId));
    }
  };

  const handleToggleStatus = async (plan: SubscriptionPlan) => {
    try {
      await api.patch(`/admin/subscription-plans/${plan.id}`, { isActive: !plan.isActive });
      setPlans(plans.map(p => p.id === plan.id ? { ...p, isActive: !p.isActive } : p));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setPlans(plans.map(p => p.id === plan.id ? { ...p, isActive: !p.isActive } : p));
    }
  };

  const getPlanIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('premium') || lower.includes('pro')) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (lower.includes('basic') || lower.includes('standard')) return <Star className="w-6 h-6 text-blue-500" />;
    return <Zap className="w-6 h-6 text-gray-400" />;
  };

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
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="w-5 h-5" />Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className={`card p-6 relative ${!plan.isActive ? 'opacity-60' : ''} ${plan.isFeatured ? 'ring-2 ring-yellow-400' : ''}`}>
            {plan.isFeatured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
            )}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {getPlanIcon(plan.name)}
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                </div>
              </div>
              <span className={`badge ${plan.isActive ? 'badge-success' : 'badge-danger'}`}>
                {plan.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="mb-2">
              <span className="text-3xl font-bold text-admin-600">
                {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
              </span>
              {plan.price > 0 && <span className="text-gray-500">/mês</span>}
            </div>
            
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
              <Car className="w-4 h-4 text-admin-600" />
              <span className="font-medium">Limite: {plan.vehicleLimit} {plan.vehicleLimit === 1 ? 'veículo' : 'veículos'}</span>
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
                <button 
                  onClick={() => handleToggleStatus(plan)} 
                  className={`p-2 rounded-lg ${plan.isActive ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50' : 'text-green-500 hover:text-green-700 hover:bg-green-50'}`}
                  title={plan.isActive ? 'Desativar' : 'Ativar'}
                >
                  {plan.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </button>
                <button onClick={() => handleOpenModal(plan)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Editar">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(plan.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg" title="Excluir">
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
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input 
                  type="text" 
                  className="input" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome do plano" 
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <input 
                  type="text" 
                  className="input" 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descrição breve" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preço (R$)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    className="input" 
                    value={formData.price || ''} 
                    onChange={(e) => {
                      const value = e.target.value.replace(',', '.');
                      const num = parseFloat(value);
                      setFormData({...formData, price: isNaN(num) ? 0 : num});
                    }}
                    placeholder="0.00" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Limite de Veículos</label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    className="input" 
                    value={formData.vehicleLimit} 
                    onChange={(e) => setFormData({...formData, vehicleLimit: parseInt(e.target.value) || 1})}
                    placeholder="1" 
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recursos (um por linha)</label>
                <textarea 
                  className="input" 
                  rows={4} 
                  value={formData.features} 
                  onChange={(e) => setFormData({...formData, features: e.target.value})}
                  placeholder="Recurso 1&#10;Recurso 2&#10;Recurso 3" 
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.isActive} 
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500" 
                  />
                  <span className="text-sm text-gray-700">Ativo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.isFeatured} 
                    onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400" 
                  />
                  <span className="text-sm text-gray-700">Destacado</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary py-3" disabled={saving}>Cancelar</button>
                <button type="submit" className="flex-1 btn-primary py-3" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

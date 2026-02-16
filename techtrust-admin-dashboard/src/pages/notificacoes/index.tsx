import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';
import { Bell, Send, Plus, Users, Building2, Megaphone, CheckCircle, Clock } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  targetRole: 'ALL' | 'CUSTOMERS' | 'PROVIDERS';
  sentAt: string;
  readCount: number;
  totalRecipients: number;
}

export default function NotificacoesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newNotification, setNewNotification] = useState({ title: '', message: '', targetRole: 'ALL' as const });

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);
  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated]);

  async function loadData() {
    try {
      const response = await adminApi.get<any>('/admin/notifications');
      const list = response.data?.data?.notifications || response.data?.data || [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminApi.sendBroadcast(newNotification);
      setShowModal(false);
      setNewNotification({ title: '', message: '', targetRole: 'ALL' });
      loadData();
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      alert('Erro ao enviar notificação');
    }
  }

  const getTargetLabel = (role: string) => {
    switch (role) {
      case 'ALL': return { label: 'Todos', icon: Megaphone, color: 'bg-purple-100 text-purple-600' };
      case 'CUSTOMERS': return { label: 'Clientes', icon: Users, color: 'bg-blue-100 text-blue-600' };
      case 'PROVIDERS': return { label: 'Fornecedores', icon: Building2, color: 'bg-green-100 text-green-600' };
      default: return { label: role, icon: Bell, color: 'bg-gray-100 text-gray-600' };
    }
  };

  if (authLoading || loading) return <AdminLayout title="Notificações"><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}</div></AdminLayout>;

  return (
    <AdminLayout title="Notificações">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-500">{notifications.length} notificações enviadas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-5 h-5" />
          Nova Notificação
        </button>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => {
          const target = getTargetLabel(notification.targetRole);
          const TargetIcon = target.icon;
          const readRate = Math.round((notification.readCount / notification.totalRecipients) * 100);
          
          return (
            <div key={notification.id} className="card p-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${target.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <TargetIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                    <span className={`badge ${target.color}`}>{target.label}</span>
                  </div>
                  <p className="text-gray-600 mb-3">{notification.message}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(notification.sentAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {notification.readCount} leituras ({readRate}%)
                    </span>
                    <span>
                      {notification.totalRecipients} destinatários
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Enviar Notificação</h2>
            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                <input
                  type="text"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  className="input"
                  placeholder="Título da notificação"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
                <textarea
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                  className="input"
                  rows={4}
                  placeholder="Conteúdo da notificação..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destinatários</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'ALL', label: 'Todos', icon: Megaphone },
                    { value: 'CUSTOMERS', label: 'Clientes', icon: Users },
                    { value: 'PROVIDERS', label: 'Fornecedores', icon: Building2 },
                  ].map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setNewNotification({ ...newNotification, targetRole: option.value as any })}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          newNotification.targetRole === option.value
                            ? 'border-admin-500 bg-admin-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-sm">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary py-3">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 btn-primary py-3">
                  <Send className="w-5 h-5" />
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

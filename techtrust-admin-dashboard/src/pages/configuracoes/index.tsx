import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { Settings, Save, DollarSign, Bell, Shield, Clock, Percent, MessageSquare, Mail, Smartphone } from 'lucide-react';
import { adminApi as api } from '../../services/api';

interface SystemConfig {
  platformFee: number;
  minQuoteValue: number;
  maxQuoteValue: number;
  quoteExpirationHours: number;
  maxPhotosPerRequest: number;
  maxProvidersPerQuote: number;
  enableSMS: boolean;
  enableEmail: boolean;
  enablePushNotifications: boolean;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  requirePhoneVerification: boolean;
}

export default function ConfiguracoesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'fees' | 'notifications' | 'security'>('general');
  const [config, setConfig] = useState<SystemConfig>({
    platformFee: 10,
    minQuoteValue: 50,
    maxQuoteValue: 50000,
    quoteExpirationHours: 48,
    maxPhotosPerRequest: 10,
    maxProvidersPerQuote: 5,
    enableSMS: true,
    enableEmail: true,
    enablePushNotifications: true,
    maintenanceMode: false,
    allowNewRegistrations: true,
    requirePhoneVerification: true,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
    }
  }, [isAuthenticated]);

  async function loadConfig() {
    try {
      // const response = await api.getSystemConfig();
      // setConfig(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateSettings(config);
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: 'general', label: 'Geral', icon: Settings },
    { id: 'fees', label: 'Taxas e Valores', icon: DollarSign },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
  ];

  if (authLoading || loading) {
    return (
      <AdminLayout title="Configurações">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configurações">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-64">
          <div className="card p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-admin-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="card p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurações Gerais</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Expiração de Orçamentos (horas)
                    </label>
                    <input
                      type="number"
                      value={config.quoteExpirationHours}
                      onChange={(e) => setConfig({ ...config, quoteExpirationHours: Number(e.target.value) })}
                      className="input"
                      min="1"
                      max="168"
                    />
                    <p className="text-xs text-gray-500 mt-1">Tempo até o orçamento expirar automaticamente</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Máximo de Fotos por Solicitação
                    </label>
                    <input
                      type="number"
                      value={config.maxPhotosPerRequest}
                      onChange={(e) => setConfig({ ...config, maxPhotosPerRequest: Number(e.target.value) })}
                      className="input"
                      min="1"
                      max="20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Máximo de Fornecedores por Orçamento
                    </label>
                    <input
                      type="number"
                      value={config.maxProvidersPerQuote}
                      onChange={(e) => setConfig({ ...config, maxProvidersPerQuote: Number(e.target.value) })}
                      className="input"
                      min="1"
                      max="20"
                    />
                    <p className="text-xs text-gray-500 mt-1">Quantidade máxima de fornecedores que podem enviar orçamento</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">Status do Sistema</h3>
                  
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <span className="font-medium text-gray-900">Modo Manutenção</span>
                        <p className="text-sm text-gray-500">Bloqueia acesso de usuários ao sistema</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.maintenanceMode}
                        onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                        className="w-6 h-6 text-admin-600 rounded focus:ring-admin-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <span className="font-medium text-gray-900">Permitir Novos Cadastros</span>
                        <p className="text-sm text-gray-500">Permite que novos usuários se registrem</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.allowNewRegistrations}
                        onChange={(e) => setConfig({ ...config, allowNewRegistrations: e.target.checked })}
                        className="w-6 h-6 text-admin-600 rounded focus:ring-admin-500"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fees' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Taxas e Valores</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Percent className="w-4 h-4 inline mr-2" />
                      Taxa da Plataforma (%)
                    </label>
                    <input
                      type="number"
                      value={config.platformFee}
                      onChange={(e) => setConfig({ ...config, platformFee: Number(e.target.value) })}
                      className="input"
                      min="0"
                      max="50"
                      step="0.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Percentual cobrado sobre cada transação</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-2" />
                      Valor Mínimo do Orçamento
                    </label>
                    <input
                      type="number"
                      value={config.minQuoteValue}
                      onChange={(e) => setConfig({ ...config, minQuoteValue: Number(e.target.value) })}
                      className="input"
                      min="0"
                      step="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-2" />
                      Valor Máximo do Orçamento
                    </label>
                    <input
                      type="number"
                      value={config.maxQuoteValue}
                      onChange={(e) => setConfig({ ...config, maxQuoteValue: Number(e.target.value) })}
                      className="input"
                      min="100"
                      step="100"
                    />
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-6">
                  <h4 className="font-medium text-yellow-800 mb-2">⚠️ Atenção</h4>
                  <p className="text-sm text-yellow-700">
                    Alterações nas taxas afetarão apenas novos orçamentos. Transações em andamento manterão as taxas anteriores.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Notificações</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-6 h-6 text-green-600" />
                      <div>
                        <span className="font-medium text-gray-900">SMS</span>
                        <p className="text-sm text-gray-500">Enviar notificações por SMS</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.enableSMS}
                      onChange={(e) => setConfig({ ...config, enableSMS: e.target.checked })}
                      className="w-6 h-6 text-admin-600 rounded focus:ring-admin-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Mail className="w-6 h-6 text-blue-600" />
                      <div>
                        <span className="font-medium text-gray-900">E-mail</span>
                        <p className="text-sm text-gray-500">Enviar notificações por e-mail</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.enableEmail}
                      onChange={(e) => setConfig({ ...config, enableEmail: e.target.checked })}
                      className="w-6 h-6 text-admin-600 rounded focus:ring-admin-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-6 h-6 text-purple-600" />
                      <div>
                        <span className="font-medium text-gray-900">Push Notifications</span>
                        <p className="text-sm text-gray-500">Enviar notificações push para o app</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.enablePushNotifications}
                      onChange={(e) => setConfig({ ...config, enablePushNotifications: e.target.checked })}
                      className="w-6 h-6 text-admin-600 rounded focus:ring-admin-500"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Segurança</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <span className="font-medium text-gray-900">Verificação de Telefone Obrigatória</span>
                      <p className="text-sm text-gray-500">Usuários devem verificar o telefone para acessar o sistema</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.requirePhoneVerification}
                      onChange={(e) => setConfig({ ...config, requirePhoneVerification: e.target.checked })}
                      className="w-6 h-6 text-admin-600 rounded focus:ring-admin-500"
                    />
                  </label>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">Ações de Segurança</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-admin-500 transition-colors text-left">
                      <h4 className="font-medium text-gray-900">Forçar Logout Geral</h4>
                      <p className="text-sm text-gray-500">Encerrar todas as sessões ativas</p>
                    </button>

                    <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-admin-500 transition-colors text-left">
                      <h4 className="font-medium text-gray-900">Limpar Cache</h4>
                      <p className="text-sm text-gray-500">Limpar cache do sistema</p>
                    </button>

                    <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-admin-500 transition-colors text-left">
                      <h4 className="font-medium text-gray-900">Backup Manual</h4>
                      <p className="text-sm text-gray-500">Criar backup do banco de dados</p>
                    </button>

                    <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-admin-500 transition-colors text-left">
                      <h4 className="font-medium text-gray-900">Logs de Auditoria</h4>
                      <p className="text-sm text-gray-500">Visualizar logs do sistema</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end mt-8 pt-6 border-t">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-8"
              >
                {saving ? (
                  <>Salvando...</>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import {
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  DollarSign,
  Shield,
  Bell,
  Lock,
  Camera,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wrench,
  Car,
  Sparkles,
  Zap,
  ChevronRight,
} from 'lucide-react'

interface ProviderProfile {
  businessName: string
  businessType: string
  description: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  zipCode: string
  serviceRadius: number
  averageRating: number
  totalReviews: number
  isVerified: boolean
  workingHours: {
    monday: { open: string; close: string; closed: boolean }
    tuesday: { open: string; close: string; closed: boolean }
    wednesday: { open: string; close: string; closed: boolean }
    thursday: { open: string; close: string; closed: boolean }
    friday: { open: string; close: string; closed: boolean }
    saturday: { open: string; close: string; closed: boolean }
    sunday: { open: string; close: string; closed: boolean }
  }
  services: string[]
  notifications: {
    newRequests: boolean
    quoteAccepted: boolean
    payments: boolean
    reviews: boolean
    marketing: boolean
  }
}

export default function ConfiguracoesPage() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth()
  const { translate: t } = useI18n()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [successMessage, setSuccessMessage] = useState('')

  const [profile, setProfile] = useState<ProviderProfile>({
    businessName: '',
    businessType: 'AUTO_REPAIR',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    serviceRadius: 25,
    averageRating: 0,
    totalReviews: 0,
    isVerified: false,
    workingHours: {
      monday: { open: '08:00', close: '18:00', closed: false },
      tuesday: { open: '08:00', close: '18:00', closed: false },
      wednesday: { open: '08:00', close: '18:00', closed: false },
      thursday: { open: '08:00', close: '18:00', closed: false },
      friday: { open: '08:00', close: '18:00', closed: false },
      saturday: { open: '08:00', close: '14:00', closed: false },
      sunday: { open: '08:00', close: '14:00', closed: true },
    },
    services: ['SCHEDULED_MAINTENANCE', 'REPAIR', 'INSPECTION'],
    notifications: {
      newRequests: true,
      quoteAccepted: true,
      payments: true,
      reviews: true,
      marketing: false,
    },
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile()
    }
  }, [isAuthenticated])

  async function loadProfile() {
    setLoading(true)
    try {
      // Em produção, buscar dados reais da API
      // const response = await api.get('/provider/profile')
      
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setProfile({
        businessName: 'Auto Center Express',
        businessType: 'AUTO_REPAIR',
        description: 'Oficina especializada em manutenção preventiva e corretiva. Mais de 15 anos de experiência no mercado automotivo.',
        phone: '+1 (407) 555-1234',
        email: 'contato@autocenterexpress.com',
        address: '1234 Main Street',
        city: 'Orlando',
        state: 'FL',
        zipCode: '32801',
        serviceRadius: 25,
        averageRating: 4.8,
        totalReviews: 47,
        isVerified: true,
        workingHours: {
          monday: { open: '08:00', close: '18:00', closed: false },
          tuesday: { open: '08:00', close: '18:00', closed: false },
          wednesday: { open: '08:00', close: '18:00', closed: false },
          thursday: { open: '08:00', close: '18:00', closed: false },
          friday: { open: '08:00', close: '18:00', closed: false },
          saturday: { open: '08:00', close: '14:00', closed: false },
          sunday: { open: '08:00', close: '14:00', closed: true },
        },
        services: ['SCHEDULED_MAINTENANCE', 'REPAIR', 'INSPECTION', 'DETAILING'],
        notifications: {
          newRequests: true,
          quoteAccepted: true,
          payments: true,
          reviews: true,
          marketing: false,
        },
      })
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      // await api.put('/provider/profile', profile)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSuccessMessage(t('settings.messages.savedSuccess'))
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error(t('settings.messages.loadError'), error)
      alert(t('settings.messages.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const serviceTypes = [
    { id: 'SCHEDULED_MAINTENANCE', label: t('common.maintenance'), icon: Wrench },
    { id: 'REPAIR', label: t('common.repair'), icon: AlertCircle },
    { id: 'INSPECTION', label: t('common.inspection'), icon: Shield },
    { id: 'DETAILING', label: t('common.detailing'), icon: Sparkles },
    { id: 'ROADSIDE_SOS', label: t('common.sos'), icon: Zap },
  ]

  const businessTypes = [
    { id: 'AUTO_REPAIR', label: t('common.autoRepairShop') },
    { id: 'TIRE_SHOP', label: t('common.tireShop') },
    { id: 'AUTO_ELECTRIC', label: t('common.autoElectric') },
    { id: 'BODY_SHOP', label: t('common.bodyShop') },
    { id: 'DETAILING', label: t('common.autoDetailing') },
    { id: 'TOWING', label: t('common.towing') },
    { id: 'MULTI_SERVICE', label: t('common.multiService') },
  ]

  const weekDays = [
    { key: 'monday', label: t('common.monday') },
    { key: 'tuesday', label: t('common.tuesday') },
    { key: 'wednesday', label: t('common.wednesday') },
    { key: 'thursday', label: t('common.thursday') },
    { key: 'friday', label: t('common.friday') },
    { key: 'saturday', label: t('common.saturday') },
    { key: 'sunday', label: t('common.sunday') },
  ]

  const tabs = [
    { id: 'profile', label: t('settings.tabs.profile'), icon: Building2 },
    { id: 'services', label: t('settings.tabs.services'), icon: Wrench },
    { id: 'hours', label: t('settings.tabs.hours'), icon: Clock },
    { id: 'notifications', label: t('settings.tabs.notifications'), icon: Bell },
    { id: 'security', label: t('settings.tabs.security'), icon: Lock },
  ]

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (loading) {
    return (
      <DashboardLayout title={t('settings.title')}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <div className="skeleton h-8 w-48 mb-6 rounded" />
            <div className="space-y-4">
              <div className="skeleton h-12 w-full rounded" />
              <div className="skeleton h-12 w-full rounded" />
              <div className="skeleton h-12 w-full rounded" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={t('settings.title')}>
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Success message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-slide-up">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <p className="font-medium text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Profile header */}
        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-primary-100 flex items-center justify-center">
                <Building2 className="w-12 h-12 text-primary-600" />
              </div>
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">{profile.businessName}</h2>
                {profile.isVerified && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    <Shield className="w-3 h-3" />
                    Verificado
                  </span>
                )}
              </div>
              <p className="text-gray-500 mb-2">{businessTypes.find(t => t.id === profile.businessType)?.label}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-yellow-600">
                  ⭐ {profile.averageRating.toFixed(1)}
                </span>
                <span className="text-gray-500">{profile.totalReviews} avaliações</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          {/* Profile tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Informações do Negócio</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Negócio
                  </label>
                  <input
                    type="text"
                    value={profile.businessName}
                    onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Negócio
                  </label>
                  <select
                    value={profile.businessType}
                    onChange={(e) => setProfile({ ...profile, businessType: e.target.value })}
                    className="input"
                  >
                    {businessTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={profile.description}
                    onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                    rows={3}
                    className="input resize-none"
                    placeholder="Descreva seu negócio..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <input
                      type="text"
                      value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={profile.zipCode}
                      onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Raio de Atendimento (km)
                  </label>
                  <input
                    type="number"
                    value={profile.serviceRadius}
                    onChange={(e) => setProfile({ ...profile, serviceRadius: parseInt(e.target.value) })}
                    className="input"
                    min="1"
                    max="100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Services tab */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Serviços Oferecidos</h3>
              <p className="text-sm text-gray-500">Selecione os tipos de serviço que você oferece</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {serviceTypes.map(service => {
                  const Icon = service.icon
                  const isSelected = profile.services.includes(service.id)
                  
                  return (
                    <button
                      key={service.id}
                      onClick={() => {
                        if (isSelected) {
                          setProfile({
                            ...profile,
                            services: profile.services.filter(s => s !== service.id),
                          })
                        } else {
                          setProfile({
                            ...profile,
                            services: [...profile.services, service.id],
                          })
                        }
                      }}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                          {service.label}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-primary-500" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Hours tab */}
          {activeTab === 'hours' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Horário de Funcionamento</h3>
              
              <div className="space-y-4">
                {weekDays.map(day => {
                  const dayKey = day.key as keyof typeof profile.workingHours
                  const hours = profile.workingHours[dayKey]
                  
                  return (
                    <div key={day.key} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-24">
                        <span className="font-medium text-gray-700">{day.label}</span>
                      </div>
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!hours.closed}
                          onChange={(e) => {
                            setProfile({
                              ...profile,
                              workingHours: {
                                ...profile.workingHours,
                                [dayKey]: { ...hours, closed: !e.target.checked },
                              },
                            })
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-600">Aberto</span>
                      </label>

                      {!hours.closed && (
                        <>
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) => {
                              setProfile({
                                ...profile,
                                workingHours: {
                                  ...profile.workingHours,
                                  [dayKey]: { ...hours, open: e.target.value },
                                },
                              })
                            }}
                            className="input w-32"
                          />
                          <span className="text-gray-500">às</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) => {
                              setProfile({
                                ...profile,
                                workingHours: {
                                  ...profile.workingHours,
                                  [dayKey]: { ...hours, close: e.target.value },
                                },
                              })
                            }}
                            className="input w-32"
                          />
                        </>
                      )}

                      {hours.closed && (
                        <span className="text-gray-400 italic">Fechado</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notifications tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Preferências de Notificação</h3>
              
              <div className="space-y-4">
                {[
                  { key: 'newRequests', label: 'Novas solicitações', description: 'Receber notificação quando houver novos pedidos na sua área' },
                  { key: 'quoteAccepted', label: 'Orçamento aceito', description: 'Quando um cliente aceitar seu orçamento' },
                  { key: 'payments', label: 'Pagamentos', description: 'Notificações sobre pagamentos recebidos' },
                  { key: 'reviews', label: 'Avaliações', description: 'Quando um cliente avaliar seu serviço' },
                  { key: 'marketing', label: 'Novidades e promoções', description: 'Receber informações sobre novidades da plataforma' },
                ].map(notification => {
                  const notifKey = notification.key as keyof typeof profile.notifications
                  
                  return (
                    <div key={notification.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-700">{notification.label}</p>
                        <p className="text-sm text-gray-500">{notification.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.notifications[notifKey]}
                          onChange={(e) => {
                            setProfile({
                              ...profile,
                              notifications: {
                                ...profile.notifications,
                                [notifKey]: e.target.checked,
                              },
                            })
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Security tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Segurança</h3>
              
              <div className="space-y-4">
                <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-700">Alterar senha</p>
                      <p className="text-sm text-gray-500">Atualize sua senha de acesso</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-700">Autenticação em dois fatores</p>
                      <p className="text-sm text-gray-500">Adicione uma camada extra de segurança</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-700">Email de recuperação</p>
                      <p className="text-sm text-gray-500">{profile.email}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <div className="pt-6 border-t border-gray-200">
                  <button
                    onClick={logout}
                    className="btn btn-danger w-full"
                  >
                    Sair da conta
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          {activeTab !== 'security' && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary px-8 py-3 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

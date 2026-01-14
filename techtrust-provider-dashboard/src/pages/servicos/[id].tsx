'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Car,
  User,
  Phone,
  Calendar,
  Loader2,
  Play,
  CheckCircle,
  DollarSign,
  FileText,
  AlertCircle,
  MessageSquare,
  Camera,
  X,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

interface WorkOrder {
  id: string
  orderNumber: string
  status: string
  originalAmount: number
  finalAmount: number
  createdAt: string
  scheduledDate?: string
  startedAt?: string
  completedAt?: string
  customer: {
    fullName: string
    phone: string
    email: string
    location?: string
  }
  vehicle: {
    make: string
    model: string
    year: number
    plateNumber: string
    color?: string
    currentMileage?: number
  }
  serviceRequest: {
    title: string
    description: string
    serviceType: string
  }
  quote: {
    partsCost: number
    laborCost: number
    laborDescription: string
    estimatedDuration: string
    notes?: string
  }
  timeline: {
    status: string
    timestamp: string
    description: string
  }[]
}

export default function ServicoDetalhesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { translate: t } = useI18n()
  const router = useRouter()
  const { id } = router.query

  const [loading, setLoading] = useState(true)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [finalAmount, setFinalAmount] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && id) {
      loadWorkOrder()
    }
  }, [isAuthenticated, id])

  async function loadWorkOrder() {
    setLoading(true)
    try {
      // Em produção, buscar dados reais da API
      // const response = await api.get(`/work-orders/${id}`)
      
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const mockWO: WorkOrder = {
        id: id as string,
        orderNumber: 'WO-2024-001',
        status: 'IN_PROGRESS',
        originalAmount: 450.00,
        finalAmount: 450.00,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        customer: {
          fullName: 'Maria Santos',
          phone: '+1 (407) 555-5678',
          email: 'maria.santos@email.com',
          location: 'Kissimmee, FL - 3.5 km',
        },
        vehicle: {
          make: 'Toyota',
          model: 'Corolla',
          year: 2019,
          plateNumber: 'XYZ5678',
          color: 'Prata',
          currentMileage: 58000,
        },
        serviceRequest: {
          title: 'Revisão completa',
          description: 'Revisão dos 30.000 km com verificação completa de freios, suspensão, fluidos e filtros. Cliente solicitou atenção especial aos freios que estavam fazendo ruído.',
          serviceType: 'INSPECTION',
        },
        quote: {
          partsCost: 200.00,
          laborCost: 250.00,
          laborDescription: 'Revisão completa incluindo: troca de óleo e filtro, verificação de freios (pastilhas e discos), verificação de suspensão, checagem de fluidos (freio, direção, arrefecimento), verificação de correias e mangueiras.',
          estimatedDuration: '3h',
          notes: 'Verificar ruído nos freios reportado pela cliente.',
        },
        timeline: [
          {
            status: 'CREATED',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Orçamento aceito pelo cliente',
          },
          {
            status: 'SCHEDULED',
            timestamp: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Serviço agendado para 28/11/2024',
          },
          {
            status: 'IN_PROGRESS',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            description: 'Serviço iniciado',
          },
        ],
      }
      
      setWorkOrder(mockWO)
      setFinalAmount(mockWO.finalAmount.toString())
    } catch (error) {
      console.error('Erro ao carregar serviço:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleStartService() {
    if (!workOrder) return
    
    setActionLoading(true)
    try {
      // await api.post(`/work-orders/${workOrder.id}/start`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setWorkOrder({
        ...workOrder,
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
        timeline: [
          ...workOrder.timeline,
          {
            status: 'IN_PROGRESS',
            timestamp: new Date().toISOString(),
            description: 'Serviço iniciado',
          },
        ],
      })
    } catch (error) {
      console.error('Erro ao iniciar serviço:', error)
      alert('Erro ao iniciar serviço. Tente novamente.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCompleteService() {
    if (!workOrder) return
    
    setActionLoading(true)
    try {
      // await api.post(`/work-orders/${workOrder.id}/complete`, {
      //   finalAmount: parseFloat(finalAmount),
      //   completionNotes,
      // })
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setWorkOrder({
        ...workOrder,
        status: 'AWAITING_APPROVAL',
        completedAt: new Date().toISOString(),
        finalAmount: parseFloat(finalAmount),
        timeline: [
          ...workOrder.timeline,
          {
            status: 'AWAITING_APPROVAL',
            timestamp: new Date().toISOString(),
            description: 'Serviço concluído, aguardando aprovação do cliente',
          },
        ],
      })
      
      setShowCompleteModal(false)
    } catch (error) {
      console.error('Erro ao concluir serviço:', error)
      alert('Erro ao concluir serviço. Tente novamente.')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { label: string; color: string; bgColor: string }> = {
      PENDING_START: { label: t('services.detail.pendingStart'), color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
      IN_PROGRESS: { label: t('common.status.inProgress'), color: 'text-blue-700', bgColor: 'bg-blue-100' },
      AWAITING_APPROVAL: { label: t('common.status.awaitingApproval'), color: 'text-purple-700', bgColor: 'bg-purple-100' },
      COMPLETED: { label: t('common.status.completed'), color: 'text-green-700', bgColor: 'bg-green-100' },
      DISPUTED: { label: t('common.status.disputed'), color: 'text-red-700', bgColor: 'bg-red-100' },
    }
    return statuses[status] || { label: status, color: 'text-gray-700', bgColor: 'bg-gray-100' }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="skeleton h-8 w-48 mb-6 rounded" />
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <div className="skeleton h-6 w-64 mb-4 rounded" />
            <div className="skeleton h-4 w-full mb-2 rounded" />
            <div className="skeleton h-4 w-3/4 mb-6 rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="skeleton h-32 rounded-xl" />
              <div className="skeleton h-32 rounded-xl" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!workOrder) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('services.detail.notFound')}</h2>
          <p className="text-gray-500 mb-6">{t('services.detail.notFoundDesc')}</p>
          <Link href="/servicos" className="btn btn-primary">
            {t('services.detail.backToList')}
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const statusInfo = getStatusInfo(workOrder.status)

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Back button */}
        <Link
          href="/servicos"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('services.detail.backToList')}
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`badge ${statusInfo.bgColor} ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{workOrder.serviceRequest.title}</h1>
              <p className="text-gray-500">#{workOrder.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary-600">${workOrder.finalAmount.toFixed(2)}</p>
              <p className="text-sm text-gray-500">{t('services.detail.totalValue')}</p>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-6">{workOrder.serviceRequest.description}</p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {workOrder.status === 'PENDING_START' && (
              <button
                onClick={handleStartService}
                disabled={actionLoading}
                className="btn btn-primary flex items-center gap-2"
              >
                {actionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                {t('services.detail.startService')}
              </button>
            )}
            
            {workOrder.status === 'IN_PROGRESS' && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="btn btn-success flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {t('services.detail.completeService')}
              </button>
            )}

            <a
              href={`tel:${workOrder.customer.phone}`}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Phone className="w-5 h-5" />
              {t('services.detail.callCustomer')}
            </a>

            <button className="btn btn-secondary flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t('services.detail.sendMessage')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Customer info */}
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 {t('services.detail.customer')}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{workOrder.customer.fullName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <a href={`tel:${workOrder.customer.phone}`} className="text-primary-600 hover:underline">
                  {workOrder.customer.phone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{workOrder.customer.location}</span>
              </div>
            </div>
          </div>

          {/* Vehicle info */}
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🚗 {t('services.detail.vehicle')}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700 font-medium">
                  {workOrder.vehicle.make} {workOrder.vehicle.model} {workOrder.vehicle.year}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{t('services.detail.plate')}: {workOrder.vehicle.plateNumber}</span>
              </div>
              {workOrder.vehicle.color && (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-300" />
                  <span className="text-gray-700">{t('services.detail.color')}: {workOrder.vehicle.color}</span>
                </div>
              )}
              {workOrder.vehicle.currentMileage && (
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{t('services.detail.mileage')}: {workOrder.vehicle.currentMileage.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quote details */}
        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 {t('services.detail.quoteDetails')}</h3>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-2">{t('services.detail.serviceDescription')}</p>
              <p className="text-gray-700">{workOrder.quote.laborDescription}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">{t('services.detail.parts')}</p>
                <p className="text-xl font-semibold text-gray-900">${workOrder.quote.partsCost.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">{t('services.detail.labor')}</p>
                <p className="text-xl font-semibold text-gray-900">${workOrder.quote.laborCost.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">{t('services.detail.estimatedTime')}</p>
                <p className="text-xl font-semibold text-gray-900">{workOrder.quote.estimatedDuration}</p>
              </div>
              <div className="bg-primary-50 rounded-xl p-4">
                <p className="text-sm text-primary-600 mb-1">{t('services.detail.total')}</p>
                <p className="text-xl font-bold text-primary-700">${workOrder.finalAmount.toFixed(2)}</p>
              </div>
            </div>

            {workOrder.quote.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  <strong>{t('services.detail.observation')}:</strong> {workOrder.quote.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 {t('services.timeline.title')}</h3>
          
          <div className="relative">
            {workOrder.timeline.map((event, index) => {
              const isLast = index === workOrder.timeline.length - 1
              const eventStatus = getStatusInfo(event.status)
              
              return (
                <div key={index} className="flex gap-4 pb-6 last:pb-0">
                  {/* Line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${isLast ? 'bg-primary-500' : 'bg-gray-300'}`} />
                    {!isLast && <div className="w-0.5 h-full bg-gray-200 mt-1" />}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 -mt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${eventStatus.bgColor} ${eventStatus.color}`}>
                        {eventStatus.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{event.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Complete modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">{t('services.completeModal.title')}</h3>
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('services.completeModal.finalAmount')}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={finalAmount}
                      onChange={(e) => setFinalAmount(e.target.value)}
                      className="input pl-12"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('services.completeModal.amountHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('services.completeModal.completionNotes')}
                  </label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder={t('services.completeModal.notesPlaceholder')}
                    rows={4}
                    className="input resize-none"
                  />
                </div>

                <button className="btn btn-secondary w-full flex items-center justify-center gap-2">
                  <Camera className="w-5 h-5" />
                  {t('services.completeModal.addPhotos')}
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    <strong>{t('services.completeModal.nextStepsTitle')}</strong> {t('services.completeModal.nextStepsDesc')}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCompleteModal(false)}
                    className="btn btn-secondary flex-1"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleCompleteService}
                    disabled={actionLoading}
                    className="btn btn-success flex-1 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    {t('common.confirm')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

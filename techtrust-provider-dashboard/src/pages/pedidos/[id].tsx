'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
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
  Send,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
  Wrench,
  Zap,
  Shield,
  Sparkles,
  X,
} from 'lucide-react'
import Link from 'next/link'

interface ServiceRequest {
  id: string
  requestNumber: string
  title: string
  description: string
  serviceType: string
  status: string
  isUrgent: boolean
  createdAt: string
  expiresAt: string
  customer: {
    fullName: string
    phone: string
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
  quotesCount: number
  photos?: string[]
}

export default function PedidoDetalhesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const { id } = router.query

  const [loading, setLoading] = useState(true)
  const [request, setRequest] = useState<ServiceRequest | null>(null)
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [quoteSubmitted, setQuoteSubmitted] = useState(false)

  // Quote form state
  const [partsCost, setPartsCost] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [laborDescription, setLaborDescription] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && id) {
      loadRequest()
    }
  }, [isAuthenticated, id])

  async function loadRequest() {
    setLoading(true)
    try {
      // Em produção, buscar dados reais da API
      // const response = await api.get(`/service-requests/${id}`)
      
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setRequest({
        id: id as string,
        requestNumber: 'SR-2024-001',
        title: 'Troca de óleo e filtros',
        description: 'Preciso trocar o óleo e filtros do meu carro. Último serviço foi há 10.000 km. Gostaria de usar óleo sintético de boa qualidade. Também verificar se há necessidade de trocar o filtro de ar.',
        serviceType: 'SCHEDULED_MAINTENANCE',
        status: 'SEARCHING_PROVIDERS',
        isUrgent: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
        customer: {
          fullName: 'João Silva',
          phone: '+1 (407) 555-1234',
          location: 'Orlando, FL - 5.2 km',
        },
        vehicle: {
          make: 'Honda',
          model: 'Civic',
          year: 2020,
          plateNumber: 'ABC1234',
          color: 'Preto',
          currentMileage: 45000,
        },
        quotesCount: 2,
      })
    } catch (error) {
      console.error('Erro ao carregar pedido:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitQuote(e: React.FormEvent) {
    e.preventDefault()
    
    if (!partsCost || !laborCost || !laborDescription || !estimatedDuration) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    setSubmitting(true)
    try {
      // Em produção, enviar para API
      // await api.post('/quotes', { ... })
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setQuoteSubmitted(true)
      setShowQuoteForm(false)
    } catch (error) {
      console.error('Erro ao enviar orçamento:', error)
      alert('Erro ao enviar orçamento. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const getServiceTypeInfo = (type: string) => {
    const types: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
      SCHEDULED_MAINTENANCE: { label: 'Manutenção', icon: <Wrench className="w-5 h-5" />, color: 'bg-blue-100 text-blue-700' },
      REPAIR: { label: 'Reparo', icon: <AlertCircle className="w-5 h-5" />, color: 'bg-orange-100 text-orange-700' },
      ROADSIDE_SOS: { label: 'Socorro', icon: <Zap className="w-5 h-5" />, color: 'bg-red-100 text-red-700' },
      INSPECTION: { label: 'Inspeção', icon: <Shield className="w-5 h-5" />, color: 'bg-purple-100 text-purple-700' },
      DETAILING: { label: 'Estética', icon: <Sparkles className="w-5 h-5" />, color: 'bg-pink-100 text-pink-700' },
    }
    return types[type] || { label: type, icon: <Wrench className="w-5 h-5" />, color: 'bg-gray-100 text-gray-700' }
  }

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return { text: 'Expirado', urgent: true }
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return { text: `${hours}h ${minutes % 60}min restantes`, urgent: hours < 1 }
    }
    return { text: `${minutes}min restantes`, urgent: minutes < 30 }
  }

  const calculateTotal = () => {
    const parts = parseFloat(partsCost) || 0
    const labor = parseFloat(laborCost) || 0
    return parts + labor
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
              <div className="skeleton h-24 rounded-xl" />
              <div className="skeleton h-24 rounded-xl" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!request) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Pedido não encontrado</h2>
          <p className="text-gray-500 mb-6">O pedido que você está procurando não existe ou foi removido.</p>
          <Link href="/pedidos" className="btn btn-primary">
            Voltar para pedidos
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const serviceType = getServiceTypeInfo(request.serviceType)
  const timeRemaining = getTimeRemaining(request.expiresAt)

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Back button */}
        <Link
          href="/pedidos"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para pedidos
        </Link>

        {/* Success message */}
        {quoteSubmitted && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-slide-up">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-medium text-green-800">Orçamento enviado com sucesso!</p>
              <p className="text-sm text-green-600">O cliente será notificado e poderá aceitar seu orçamento.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`badge ${serviceType.color}`}>
                  {serviceType.icon}
                  <span className="ml-1">{serviceType.label}</span>
                </span>
                {request.isUrgent && (
                  <span className="badge bg-red-100 text-red-700">
                    🚨 Urgente
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{request.title}</h1>
              <p className="text-gray-500">#{request.requestNumber}</p>
            </div>
            <div className={`text-right ${timeRemaining.urgent ? 'text-red-600' : 'text-gray-600'}`}>
              <div className="flex items-center gap-1 justify-end">
                <Clock className={`w-4 h-4 ${timeRemaining.urgent ? 'text-red-500' : 'text-gray-400'}`} />
                <span className="font-medium">{timeRemaining.text}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">para enviar orçamento</p>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed">{request.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Customer info */}
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Cliente</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{request.customer.fullName}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{request.customer.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{request.customer.phone}</span>
              </div>
            </div>
          </div>

          {/* Vehicle info */}
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🚗 Veículo</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700 font-medium">
                  {request.vehicle.make} {request.vehicle.model} {request.vehicle.year}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">Placa: {request.vehicle.plateNumber}</span>
              </div>
              {request.vehicle.color && (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-200" />
                  <span className="text-gray-700">Cor: {request.vehicle.color}</span>
                </div>
              )}
              {request.vehicle.currentMileage && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">KM: {request.vehicle.currentMileage.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quote section */}
        {!quoteSubmitted && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            {!showQuoteForm ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Envie seu orçamento</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {request.quotesCount} fornecedor(es) já enviaram orçamento. Seja competitivo!
                </p>
                <button
                  onClick={() => setShowQuoteForm(true)}
                  className="btn btn-primary px-8 py-3 text-lg"
                >
                  Criar Orçamento
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitQuote}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Criar Orçamento</h3>
                  <button
                    type="button"
                    onClick={() => setShowQuoteForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custo das Peças ($) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={partsCost}
                        onChange={(e) => setPartsCost(e.target.value)}
                        placeholder="0.00"
                        className="input pl-12"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mão de Obra ($) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={laborCost}
                        onChange={(e) => setLaborCost(e.target.value)}
                        placeholder="0.00"
                        className="input pl-12"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição do Serviço *
                  </label>
                  <textarea
                    value={laborDescription}
                    onChange={(e) => setLaborDescription(e.target.value)}
                    placeholder="Descreva o que será feito, peças utilizadas, etc."
                    rows={4}
                    className="input resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tempo Estimado *
                    </label>
                    <select
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                      className="input"
                      required
                    >
                      <option value="">Selecione...</option>
                      <option value="30min">30 minutos</option>
                      <option value="1h">1 hora</option>
                      <option value="2h">2 horas</option>
                      <option value="3h">3 horas</option>
                      <option value="4h">4 horas</option>
                      <option value="1d">1 dia</option>
                      <option value="2d">2 dias</option>
                      <option value="3d+">3+ dias</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações (opcional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Informações adicionais..."
                      className="input"
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total do Orçamento</span>
                    <span className="text-2xl font-bold text-primary-600">
                      ${calculateTotal().toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    A comissão da plataforma (10%) será deduzida do valor final
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary w-full py-3 text-lg disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Send className="w-5 h-5" />
                      Enviar Orçamento
                    </span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

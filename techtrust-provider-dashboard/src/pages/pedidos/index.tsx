'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import {
  Search,
  Filter,
  MapPin,
  Clock,
  Car,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  Wrench,
  Zap,
  Shield,
  Sparkles,
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
    location?: string
  }
  vehicle: {
    make: string
    model: string
    year: number
    plateNumber: string
  }
  quotesCount: number
}

export default function PedidosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadRequests()
    }
  }, [isAuthenticated])

  async function loadRequests() {
    setLoading(true)
    try {
      // Em produção, buscar dados reais da API
      // const response = await api.get('/provider/service-requests')
      
      // Dados mockados para demonstração
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setRequests([
        {
          id: '1',
          requestNumber: 'SR-2024-001',
          title: 'Troca de óleo e filtros',
          description: 'Preciso trocar o óleo e filtros do meu carro. Último serviço foi há 10.000 km.',
          serviceType: 'SCHEDULED_MAINTENANCE',
          status: 'SEARCHING_PROVIDERS',
          isUrgent: false,
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
          customer: {
            fullName: 'João Silva',
            location: 'Orlando, FL',
          },
          vehicle: {
            make: 'Honda',
            model: 'Civic',
            year: 2020,
            plateNumber: 'ABC1234',
          },
          quotesCount: 2,
        },
        {
          id: '2',
          requestNumber: 'SR-2024-002',
          title: 'Revisão completa',
          description: 'Revisão dos 30.000 km. Incluir verificação de freios, suspensão e fluidos.',
          serviceType: 'INSPECTION',
          status: 'SEARCHING_PROVIDERS',
          isUrgent: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          customer: {
            fullName: 'Maria Santos',
            location: 'Kissimmee, FL',
          },
          vehicle: {
            make: 'Toyota',
            model: 'Corolla',
            year: 2019,
            plateNumber: 'XYZ5678',
          },
          quotesCount: 4,
        },
        {
          id: '3',
          requestNumber: 'SR-2024-003',
          title: 'Freio fazendo barulho',
          description: 'Os freios estão fazendo um barulho estranho ao frear. Preciso de diagnóstico urgente.',
          serviceType: 'REPAIR',
          status: 'SEARCHING_PROVIDERS',
          isUrgent: true,
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 105 * 60 * 1000).toISOString(),
          customer: {
            fullName: 'Pedro Costa',
            location: 'Orlando, FL',
          },
          vehicle: {
            make: 'Ford',
            model: 'Focus',
            year: 2021,
            plateNumber: 'DEF9012',
          },
          quotesCount: 1,
        },
        {
          id: '4',
          requestNumber: 'SR-2024-004',
          title: 'Polimento e cristalização',
          description: 'Gostaria de fazer polimento completo e cristalização de pintura.',
          serviceType: 'DETAILING',
          status: 'SEARCHING_PROVIDERS',
          isUrgent: false,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
          customer: {
            fullName: 'Ana Oliveira',
            location: 'Davenport, FL',
          },
          vehicle: {
            make: 'BMW',
            model: 'X3',
            year: 2022,
            plateNumber: 'GHI3456',
          },
          quotesCount: 0,
        },
      ])
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const getServiceTypeInfo = (type: string) => {
    const types: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
      SCHEDULED_MAINTENANCE: { label: 'Manutenção', icon: <Wrench className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
      REPAIR: { label: 'Reparo', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700' },
      ROADSIDE_SOS: { label: 'Socorro', icon: <Zap className="w-4 h-4" />, color: 'bg-red-100 text-red-700' },
      INSPECTION: { label: 'Inspeção', icon: <Shield className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
      DETAILING: { label: 'Estética', icon: <Sparkles className="w-4 h-4" />, color: 'bg-pink-100 text-pink-700' },
    }
    return types[type] || { label: type, icon: <Wrench className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700' }
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

  const filteredRequests = requests.filter(request => {
    if (filter === 'urgent' && !request.isUrgent) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        request.title.toLowerCase().includes(query) ||
        request.vehicle.make.toLowerCase().includes(query) ||
        request.vehicle.model.toLowerCase().includes(query) ||
        request.requestNumber.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <DashboardLayout title="Pedidos">
      <div className="space-y-6 animate-fade-in">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, veículo ou número..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-12"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Todos ({requests.length})
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'urgent'
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              🚨 Urgentes ({requests.filter(r => r.isUrgent).length})
            </button>
          </div>
        </div>

        {/* Requests list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-soft">
                <div className="flex items-start gap-4">
                  <div className="skeleton w-12 h-12 rounded-xl" />
                  <div className="flex-1">
                    <div className="skeleton h-5 w-48 mb-2 rounded" />
                    <div className="skeleton h-4 w-64 mb-4 rounded" />
                    <div className="flex gap-4">
                      <div className="skeleton h-4 w-24 rounded" />
                      <div className="skeleton h-4 w-24 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-soft text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum pedido encontrado
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? 'Tente buscar com outros termos'
                : 'Novos pedidos aparecerão aqui'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const serviceType = getServiceTypeInfo(request.serviceType)
              const timeRemaining = getTimeRemaining(request.expiresAt)
              
              return (
                <Link
                  key={request.id}
                  href={`/pedidos/${request.id}`}
                  className="block bg-white rounded-2xl p-6 shadow-soft card-hover"
                >
                  <div className="flex items-start gap-4">
                    {/* Service type icon */}
                    <div className={`w-12 h-12 rounded-xl ${serviceType.color.split(' ')[0]} flex items-center justify-center`}>
                      <div className={serviceType.color.split(' ')[1]}>
                        {serviceType.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{request.title}</h3>
                            {request.isUrgent && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                🚨 Urgente
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2">{request.description}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Car className="w-4 h-4 text-gray-400" />
                          {request.vehicle.make} {request.vehicle.model} {request.vehicle.year}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {request.customer.location}
                        </div>
                        <div className={`flex items-center gap-1.5 ${timeRemaining.urgent ? 'text-red-600' : 'text-gray-600'}`}>
                          <Clock className={`w-4 h-4 ${timeRemaining.urgent ? 'text-red-500' : 'text-gray-400'}`} />
                          {timeRemaining.text}
                        </div>
                        <span className={`badge ${serviceType.color}`}>
                          {serviceType.icon}
                          <span className="ml-1">{serviceType.label}</span>
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <span className="text-xs text-gray-400">
                          #{request.requestNumber}
                        </span>
                        <span className="text-sm text-gray-500">
                          {request.quotesCount} orçamento(s) enviado(s)
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

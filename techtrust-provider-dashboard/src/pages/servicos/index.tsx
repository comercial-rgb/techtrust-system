'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import {
  Search,
  Clock,
  Car,
  User,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Play,
  DollarSign,
  Calendar,
  Phone,
  MapPin,
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
    location?: string
  }
  vehicle: {
    make: string
    model: string
    year: number
    plateNumber: string
  }
  serviceRequest: {
    title: string
    description: string
  }
}

export default function ServicosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { translate: t } = useI18n()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadWorkOrders()
    }
  }, [isAuthenticated])

  async function loadWorkOrders() {
    setLoading(true)
    try {
      const response = await api.get('/work-orders')
      const data = response.data.data
      const orders = (data.orders || []).map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber || '',
        status: order.status || 'PENDING_START',
        originalAmount: Number(order.originalAmount) || 0,
        finalAmount: Number(order.finalAmount) || 0,
        createdAt: order.createdAt,
        scheduledDate: order.scheduledDate,
        startedAt: order.startedAt,
        completedAt: order.completedAt,
        customer: {
          fullName: order.customer?.fullName || '',
          phone: order.customer?.phone || '',
          location: order.customer?.city ? `${order.customer.city}, ${order.customer.state || ''}` : '',
        },
        vehicle: {
          make: order.vehicle?.make || '',
          model: order.vehicle?.model || '',
          year: order.vehicle?.year || 0,
          plateNumber: order.vehicle?.plateNumber || '',
        },
        serviceRequest: {
          title: order.serviceRequest?.title || order.title || '',
          description: order.serviceRequest?.description || order.description || '',
        },
      }))
      setWorkOrders(orders)
    } catch (error) {
      console.error('Erro ao carregar serviços:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      PENDING_START: { label: t('common.status.pending'), color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
      IN_PROGRESS: { label: t('common.status.inProgress'), color: 'bg-blue-100 text-blue-700', icon: <Play className="w-4 h-4" /> },
      AWAITING_APPROVAL: { label: t('common.status.awaitingApproval'), color: 'bg-purple-100 text-purple-700', icon: <CheckCircle className="w-4 h-4" /> },
      COMPLETED: { label: t('common.status.completed'), color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
      DISPUTED: { label: t('common.status.disputed'), color: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-4 h-4" /> },
    }
    return statuses[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: <Clock className="w-4 h-4" /> }
  }

  const filterOptions = [
    { value: 'all', label: t('services.filters.all') },
    { value: 'PENDING_START', label: t('common.status.pending') },
    { value: 'IN_PROGRESS', label: t('common.status.inProgress') },
    { value: 'AWAITING_APPROVAL', label: t('common.status.awaitingApproval') },
    { value: 'COMPLETED', label: t('services.filters.completed') },
  ]

  const filteredWorkOrders = workOrders.filter(wo => {
    if (filter !== 'all' && wo.status !== filter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        wo.serviceRequest.title.toLowerCase().includes(query) ||
        wo.vehicle.make.toLowerCase().includes(query) ||
        wo.vehicle.model.toLowerCase().includes(query) ||
        wo.orderNumber.toLowerCase().includes(query) ||
        wo.customer.fullName.toLowerCase().includes(query)
      )
    }
    return true
  })

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
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

  return (
    <DashboardLayout title={t('services.title')}>
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <p className="text-2xl font-bold text-yellow-600">
              {workOrders.filter(w => w.status === 'PENDING_START').length}
            </p>
            <p className="text-sm text-gray-500">{t('common.status.pending')}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <p className="text-2xl font-bold text-blue-600">
              {workOrders.filter(w => w.status === 'IN_PROGRESS').length}
            </p>
            <p className="text-sm text-gray-500">{t('common.status.inProgress')}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <p className="text-2xl font-bold text-purple-600">
              {workOrders.filter(w => w.status === 'AWAITING_APPROVAL').length}
            </p>
            <p className="text-sm text-gray-500">{t('common.status.awaitingApproval')}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <p className="text-2xl font-bold text-green-600">
              {workOrders.filter(w => w.status === 'COMPLETED').length}
            </p>
            <p className="text-sm text-gray-500">{t('services.filters.completed')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('services.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input !pl-12"
            />
          </div>

          {/* Filter dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-auto min-w-[180px]"
          >
            {filterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Work orders list */}
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
        ) : filteredWorkOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-soft text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('services.empty.title')}
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? t('services.empty.searchHint')
                : t('services.empty.description')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredWorkOrders.map((wo) => {
              const statusInfo = getStatusInfo(wo.status)
              
              return (
                <Link
                  key={wo.id}
                  href={`/servicos/${wo.id}`}
                  className="block bg-white rounded-2xl p-6 shadow-soft card-hover"
                >
                  <div className="flex items-start gap-4">
                    {/* Status icon */}
                    <div className={`w-12 h-12 rounded-xl ${statusInfo.color.split(' ')[0]} flex items-center justify-center`}>
                      <div className={statusInfo.color.split(' ')[1]}>
                        {statusInfo.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{wo.serviceRequest.title}</h3>
                            <span className={`badge ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-1">{wo.serviceRequest.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-gray-900">${wo.finalAmount.toFixed(2)}</p>
                          <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <User className="w-4 h-4 text-gray-400" />
                          {wo.customer.fullName}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Car className="w-4 h-4 text-gray-400" />
                          {wo.vehicle.make} {wo.vehicle.model}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(wo.createdAt)}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <span className="text-xs text-gray-400">
                          #{wo.orderNumber}
                        </span>
                        {wo.status === 'PENDING_START' && wo.scheduledDate && (
                          <span className="text-sm text-orange-600 font-medium">
                            Agendado: {formatDate(wo.scheduledDate)}
                          </span>
                        )}
                        {wo.status === 'AWAITING_APPROVAL' && (
                          <span className="text-sm text-purple-600 font-medium">
                            Aguardando cliente aprovar
                          </span>
                        )}
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

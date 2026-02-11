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
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import Link from 'next/link'

interface Quote {
  id: string
  status: string
  totalAmount: number
  partsCost: number
  laborCost: number
  estimatedDuration: string
  createdAt: string
  expiresAt: string
  serviceRequest: {
    id: string
    requestNumber: string
    title: string
    description: string
  }
  vehicle: {
    make: string
    model: string
    year: number
  }
  customer: {
    fullName: string
  }
}

export default function OrcamentosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { translate: t } = useI18n()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadQuotes()
    }
  }, [isAuthenticated])

  async function loadQuotes() {
    setLoading(true)
    try {
      const response = await api.get('/providers/my-quotes')
      const data = response.data.data
      const quotesData = (data.quotes || []).map((q: any) => ({
        id: q.id,
        status: q.status || 'PENDING',
        totalAmount: Number(q.totalAmount) || 0,
        partsCost: Number(q.partsCost) || 0,
        laborCost: Number(q.laborCost) || 0,
        estimatedDuration: q.estimatedCompletionTime || q.estimatedDuration || '',
        createdAt: q.createdAt,
        expiresAt: q.expiresAt || q.serviceRequest?.quoteDeadline || new Date(new Date(q.createdAt).getTime() + 48 * 60 * 60 * 1000).toISOString(),
        serviceRequest: {
          id: q.serviceRequestId || q.serviceRequest?.id || '',
          requestNumber: q.serviceRequest?.requestNumber || '',
          title: q.serviceRequest?.title || '',
          description: q.serviceRequest?.description || '',
        },
        vehicle: {
          make: q.serviceRequest?.vehicle?.make || '',
          model: q.serviceRequest?.vehicle?.model || '',
          year: q.serviceRequest?.vehicle?.year || 0,
        },
        customer: {
          fullName: q.serviceRequest?.user?.fullName || q.customer?.fullName || '',
        },
      }))
      setQuotes(quotesData)
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      PENDING: { label: t('common.status.pending'), color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
      ACCEPTED: { label: t('common.status.accepted'), color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
      REJECTED: { label: t('common.status.rejected'), color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
      EXPIRED: { label: t('common.status.expired'), color: 'bg-gray-100 text-gray-700', icon: <Clock className="w-4 h-4" /> },
    }
    return statuses[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: <Clock className="w-4 h-4" /> }
  }

  const filterOptions = [
    { value: 'all', label: t('quotes.filters.all') },
    { value: 'PENDING', label: t('common.status.pending') },
    { value: 'ACCEPTED', label: t('quotes.filters.accepted') },
    { value: 'REJECTED', label: t('quotes.filters.rejected') },
    { value: 'EXPIRED', label: t('quotes.filters.expired') },
  ]

  const filteredQuotes = quotes.filter(quote => {
    if (filter !== 'all' && quote.status !== filter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        quote.serviceRequest.title.toLowerCase().includes(query) ||
        quote.vehicle.make.toLowerCase().includes(query) ||
        quote.vehicle.model.toLowerCase().includes(query) ||
        quote.serviceRequest.requestNumber.toLowerCase().includes(query) ||
        quote.customer.fullName.toLowerCase().includes(query)
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

  const getTimeStatus = (expiresAt: string, status: string) => {
    if (status !== 'PENDING') return null
    
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return { text: 'Expirado', urgent: true }
    
    const hours = Math.floor(diff / (60 * 60 * 1000))
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return { text: `${days}d restante(s)`, urgent: false }
    }
    return { text: `${hours}h restante(s)`, urgent: hours < 12 }
  }

  // Stats
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'PENDING').length,
    accepted: quotes.filter(q => q.status === 'ACCEPTED').length,
    rejected: quotes.filter(q => q.status === 'REJECTED').length,
    conversionRate: quotes.length > 0 
      ? Math.round((quotes.filter(q => q.status === 'ACCEPTED').length / quotes.filter(q => q.status !== 'PENDING').length) * 100) || 0
      : 0,
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <DashboardLayout title={t('quotes.title')}>
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">{t('quotes.stats.total')}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-gray-500">{t('common.status.pending')}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
            <p className="text-sm text-gray-500">{t('quotes.filters.accepted')}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-sm text-gray-500">{t('quotes.filters.rejected')}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-primary-600">{stats.conversionRate}%</p>
              {stats.conversionRate >= 50 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className="text-sm text-gray-500">{t('quotes.stats.conversion')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('quotes.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-12"
            />
          </div>

          {/* Filter dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-auto min-w-[160px]"
          >
            {filterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Quotes list */}
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
        ) : filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-soft text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('quotes.empty.title')}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? t('quotes.empty.searchHint')
                : t('quotes.empty.description')}
            </p>
            <Link href="/pedidos" className="btn btn-primary">
              {t('quotes.empty.viewRequests')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuotes.map((quote) => {
              const statusInfo = getStatusInfo(quote.status)
              const timeStatus = getTimeStatus(quote.expiresAt, quote.status)
              
              return (
                <div
                  key={quote.id}
                  className="bg-white rounded-2xl p-6 shadow-soft card-hover"
                >
                  <div className="flex items-start gap-4">
                    {/* Status icon */}
                    <div className={`w-12 h-12 rounded-xl ${statusInfo.color.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
                      <div className={statusInfo.color.split(' ')[1]}>
                        {statusInfo.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{quote.serviceRequest.title}</h3>
                            <span className={`badge ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {quote.customer.fullName} • {quote.vehicle.make} {quote.vehicle.model} {quote.vehicle.year}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-gray-900">${quote.totalAmount.toFixed(2)}</p>
                          {timeStatus && (
                            <p className={`text-xs ${timeStatus.urgent ? 'text-red-600' : 'text-gray-500'}`}>
                              {timeStatus.text}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          Peças: ${quote.partsCost.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          M.O.: ${quote.laborCost.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {quote.estimatedDuration}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(quote.createdAt)}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <span className="text-xs text-gray-400">
                          #{quote.serviceRequest.requestNumber}
                        </span>
                        {quote.status === 'ACCEPTED' && (
                          <Link
                            href={`/servicos`}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                          >
                            Ver Serviço
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

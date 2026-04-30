'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import {
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Car,
  ArrowDownRight,
} from 'lucide-react'

interface PaymentRecord {
  id: string
  paymentNumber: string
  status: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'REFUNDED' | 'FAILED' | 'CANCELLED'
  subtotal: number
  platformFee: number
  stripeFee: number
  totalAmount: number
  providerAmount: number
  refundAmount: number | null
  createdAt: string
  capturedAt: string | null
  workOrder?: {
    orderNumber: string
    serviceRequest?: {
      title: string
      vehicle?: {
        plateNumber: string
        make: string
        model: string
      }
    }
  }
}

interface Balance {
  available: number
  pending: number
  currency: string
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CAPTURED:    { label: 'Received',   color: 'bg-green-100 text-green-700',  icon: <CheckCircle className="w-4 h-4" /> },
  PENDING:     { label: 'Pending',    color: 'bg-amber-100 text-amber-700',  icon: <Clock className="w-4 h-4" /> },
  AUTHORIZED:  { label: 'Authorized', color: 'bg-blue-100 text-blue-700',   icon: <Clock className="w-4 h-4" /> },
  REFUNDED:    { label: 'Refunded',   color: 'bg-blue-100 text-blue-700',   icon: <RefreshCw className="w-4 h-4" /> },
  FAILED:      { label: 'Failed',     color: 'bg-red-100 text-red-700',     icon: <AlertCircle className="w-4 h-4" /> },
  CANCELLED:   { label: 'Cancelled',  color: 'bg-gray-100 text-gray-700',   icon: <AlertCircle className="w-4 h-4" /> },
}

const FILTER_TABS = [
  { value: 'all',       label: 'All' },
  { value: 'CAPTURED',  label: 'Received' },
  { value: 'PENDING',   label: 'Pending' },
  { value: 'REFUNDED',  label: 'Refunded' },
]

export default function HistoricoPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  async function loadData() {
    setLoading(true)
    await Promise.allSettled([loadPayments(), loadBalance()])
    setLoading(false)
  }

  async function loadPayments() {
    try {
      const res = await api.get('/payments/history', { params: { limit: 50 } })
      const payload = res.data
      const records = Array.isArray(payload) ? payload : (payload?.data ?? payload?.payments ?? [])
      setPayments(records.map((p: any) => ({
        id: p.id,
        paymentNumber: p.paymentNumber || '',
        status: p.status || 'PENDING',
        subtotal: Number(p.subtotal) || 0,
        platformFee: Number(p.platformFee) || 0,
        stripeFee: Number(p.stripeFee) || 0,
        totalAmount: Number(p.totalAmount) || 0,
        providerAmount: Number(p.providerAmount) || 0,
        refundAmount: p.refundAmount ? Number(p.refundAmount) : null,
        createdAt: p.createdAt,
        capturedAt: p.capturedAt || null,
        workOrder: p.workOrder,
      })))
    } catch {
      setPayments([])
    }
  }

  async function loadBalance() {
    try {
      const res = await api.get('/connect/balance')
      const payload = res.data
      const bal = payload?.available !== undefined ? payload : (payload?.data ?? null)
      if (bal) setBalance(bal)
    } catch {
      // no stripe connect yet
    }
  }

  const filtered = payments.filter(p => filter === 'all' || p.status === filter)

  const totalReceived = payments
    .filter(p => p.status === 'CAPTURED')
    .reduce((sum, p) => sum + p.providerAmount, 0)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <DashboardLayout title="Payment History">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

        {/* Balance summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {balance && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                <p className="text-sm font-medium text-green-700 mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-green-800">${balance.available.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-1">Ready to transfer</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <p className="text-sm font-medium text-amber-700 mb-1">Pending</p>
                <p className="text-2xl font-bold text-amber-800">${balance.pending.toFixed(2)}</p>
                <p className="text-xs text-amber-600 mt-1">Processing (3–5 days)</p>
              </div>
            </>
          )}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-soft">
            <p className="text-sm font-medium text-gray-600 mb-1">Total Received</p>
            <p className="text-2xl font-bold text-gray-900">${totalReceived.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{payments.filter(p => p.status === 'CAPTURED').length} payments</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {tab.label}
              {tab.value !== 'all' && (
                <span className="ml-1.5 text-xs opacity-75">
                  ({payments.filter(p => p.status === tab.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Payment list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-soft text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No payments yet</h3>
            <p className="text-sm text-gray-500">Completed service payments will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(payment => {
              const statusInfo = STATUS_INFO[payment.status] || STATUS_INFO['PENDING']
              const wo = payment.workOrder
              return (
                <div key={payment.id} className="bg-white rounded-2xl p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${statusInfo.color.split(' ')[0]} flex items-center justify-center`}>
                        <span className={statusInfo.color.split(' ')[1]}>{statusInfo.icon}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {wo?.serviceRequest?.title || `Payment #${payment.paymentNumber}`}
                        </p>
                        {wo?.serviceRequest?.vehicle && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Car className="w-3 h-3" />
                            {wo.serviceRequest.vehicle.make} {wo.serviceRequest.vehicle.model}
                            {wo.serviceRequest.vehicle.plateNumber && ` · ${wo.serviceRequest.vehicle.plateNumber}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">${payment.providerAmount.toFixed(2)}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-3 text-center text-sm">
                    <div>
                      <p className="text-gray-400 text-xs">Service</p>
                      <p className="font-semibold text-gray-900">${payment.subtotal.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Platform fee</p>
                      <p className="font-semibold text-red-600">-${payment.platformFee.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">You receive</p>
                      <p className="font-semibold text-green-600">${payment.providerAmount.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                    <span>#{payment.paymentNumber || wo?.orderNumber}</span>
                    <span>{formatDate(payment.capturedAt || payment.createdAt)}</span>
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

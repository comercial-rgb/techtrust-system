'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import {
  DollarSign,
  Wrench,
  Star,
  TrendingUp,
  BarChart2,
  Download,
  Loader2,
  RefreshCw,
  CheckCircle,
} from 'lucide-react'

interface EarningsData { month: string; amount: number }
interface ServiceStat { name: string; count: number; revenue: number; percentage: number; color: string }

const PERIOD_OPTIONS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
] as const

const BAR_COLORS = ['#2B5EA7', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE']

export default function ReportsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()

  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [loading, setLoading] = useState(true)
  const [earnings, setEarnings] = useState<EarningsData[]>([])
  const [serviceStats, setServiceStats] = useState<ServiceStat[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalServices, setTotalServices] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [acceptanceRate, setAcceptanceRate] = useState(0)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) loadReports()
  }, [isAuthenticated, period])

  async function loadReports() {
    setLoading(true)
    try {
      const res = await api.get('/providers/reports', { params: { period } })
      const data = res.data?.earnings !== undefined ? res.data : (res.data?.data ?? res.data ?? {})
      setEarnings(data.earnings || [])
      setServiceStats((data.serviceStats || []).map((s: any, i: number) => ({ ...s, color: BAR_COLORS[i % BAR_COLORS.length] })))
      setTotalRevenue(data.totalRevenue || 0)
      setTotalServices(data.totalServices || 0)
      setAvgRating(data.avgRating || 0)
      setAcceptanceRate(data.acceptanceRate || 0)
    } catch {
      setEarnings([])
      setServiceStats([])
      setTotalRevenue(0)
      setTotalServices(0)
    } finally {
      setLoading(false)
    }
  }

  const avgTicket = totalServices > 0 ? totalRevenue / totalServices : 0
  const platformFee = totalRevenue * 0.1
  const netRevenue = totalRevenue - platformFee
  const maxEarning = earnings.length > 0 ? Math.max(...earnings.map(e => e.amount), 1) : 1

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <DashboardLayout title="Reports">
      {/* Period selector + actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                period === p.key ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-soft'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={loadReports} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white shadow-soft rounded-xl text-sm font-medium text-primary-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: DollarSign, label: 'Gross Revenue', value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'bg-emerald-100 text-emerald-600' },
          { icon: Wrench, label: 'Services Completed', value: String(totalServices), color: 'bg-blue-100 text-blue-600' },
          { icon: Star, label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '—', color: 'bg-yellow-100 text-yellow-600' },
          { icon: CheckCircle, label: 'Acceptance Rate', value: acceptanceRate > 0 ? `${acceptanceRate.toFixed(0)}%` : '—', color: 'bg-purple-100 text-purple-600' },
        ].map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-2xl p-5 shadow-soft">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : card.value}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Earnings chart */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary-500" />
              Earnings
            </h3>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : earnings.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400">
              <BarChart2 className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No earnings data for this period</p>
            </div>
          ) : (
            <div className="flex items-end gap-1.5 h-48">
              {earnings.map((e, i) => {
                const heightPct = maxEarning > 0 ? (e.amount / maxEarning) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full">
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        ${e.amount.toFixed(0)}
                      </div>
                      <div
                        className="w-full bg-primary-500 rounded-t-md transition-all hover:bg-primary-600"
                        style={{ height: `${Math.max(heightPct * 1.6, e.amount > 0 ? 4 : 0)}px` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 truncate w-full text-center">{e.month}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Financials breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Financial Summary
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Gross Revenue', value: totalRevenue, highlight: false },
              { label: 'Platform Fee (10%)', value: -platformFee, highlight: false, negative: true },
              { label: 'Net Revenue', value: netRevenue, highlight: true },
              { label: 'Avg Ticket', value: avgTicket, highlight: false },
            ].map(row => (
              <div key={row.label} className={`flex items-center justify-between p-3 rounded-xl ${row.highlight ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                <span className={`text-sm font-medium ${row.highlight ? 'text-emerald-800' : 'text-gray-600'}`}>{row.label}</span>
                <span className={`text-sm font-bold ${row.highlight ? 'text-emerald-700' : row.negative ? 'text-red-600' : 'text-gray-900'}`}>
                  {loading ? '—' : `${row.negative ? '-' : ''}$${Math.abs(row.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services breakdown */}
      {!loading && serviceStats.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Services Breakdown</h3>
          <div className="space-y-3">
            {serviceStats.map(s => (
              <div key={s.name} className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600 font-medium truncate">{s.name}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${s.percentage}%`, backgroundColor: s.color }}
                  />
                </div>
                <div className="text-right text-sm w-24">
                  <span className="font-semibold text-gray-900">${s.revenue.toFixed(0)}</span>
                  <span className="text-gray-400 ml-1">({s.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

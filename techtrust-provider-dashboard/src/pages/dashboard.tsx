'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import { useI18n } from '@/i18n'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ClipboardList,
  CheckCircle,
  Clock,
  Star,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  pendingRequests: number
  activeWorkOrders: number
  completedThisMonth: number
  earningsThisMonth: number
  rating: number
  totalReviews: number
}

interface RecentActivity {
  id: string
  type: 'new_request' | 'quote_accepted' | 'service_completed' | 'payment_received'
  title: string
  description: string
  time: string
  amount?: number
}

export default function DashboardPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const { translate } = useI18n()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData()
    }
  }, [isAuthenticated])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const response = await api.get('/provider/dashboard')
      
      setStats(response.data.stats || {
        pendingRequests: 0,
        activeWorkOrders: 0,
        completedThisMonth: 0,
        earningsThisMonth: 0,
        rating: 0,
        totalReviews: 0,
      })

      setRecentActivity(response.data.recentActivity || [])
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <DashboardLayout title={translate('provider.nav.dashboard')}>
      <div className="space-y-8 animate-fade-in">
        {/* Welcome section */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">
            {translate('provider.dashboard.welcome').replace('{name}', user?.providerProfile?.businessName || user?.fullName || '')}
          </h2>
          <p className="text-primary-100">
            {stats?.pendingRequests ? (
              <>
                {translate('provider.dashboard.pendingRequests')}: <strong>{stats.pendingRequests}</strong>
              </>
            ) : (
              translate('provider.dashboard.allGood')
            )}
          </p>
          {stats?.pendingRequests && stats.pendingRequests > 0 && (
            <Link 
              href="/pedidos"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors"
            >
              {translate('provider.dashboard.seeRequests')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Stats cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-soft">
                <div className="skeleton h-4 w-24 mb-4 rounded" />
                <div className="skeleton h-8 w-20 mb-2 rounded" />
                <div className="skeleton h-3 w-32 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<ClipboardList className="w-6 h-6" />}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              label={translate('provider.dashboard.pendingRequests')}
              value={stats?.pendingRequests || 0}
              trend={+2}
              trendLabel={translate('provider.dashboard.vsYesterday')}
            />
            <StatCard
              icon={<Clock className="w-6 h-6" />}
              iconBg="bg-orange-100"
              iconColor="text-orange-600"
              label={translate('provider.dashboard.activeServices')}
              value={stats?.activeWorkOrders || 0}
            />
            <StatCard
              icon={<CheckCircle className="w-6 h-6" />}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              label={translate('provider.dashboard.completedMonth')}
              value={stats?.completedThisMonth || 0}
              trend={+15}
              trendLabel={translate('provider.dashboard.vsLastMonth')}
            />
            <StatCard
              icon={<DollarSign className="w-6 h-6" />}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              label={translate('provider.dashboard.earningsMonth')}
              value={`$${stats?.earningsThisMonth?.toLocaleString() || 0}`}
              trend={+8}
              trendLabel={translate('provider.dashboard.vsLastMonth')}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-soft">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">{translate('provider.dashboard.recentActivity')}</h3>
                <Link href="/pedidos" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  {translate('common.viewAll')}
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {loading ? (
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 flex items-center gap-4">
                      <div className="skeleton w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <div className="skeleton h-4 w-48 mb-2 rounded" />
                        <div className="skeleton h-3 w-32 rounded" />
                      </div>
                    </div>
                  ))
                ) : (
                  recentActivity.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="space-y-4">
            {/* Rating card */}
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{translate('provider.dashboard.ratingTitle')}</h3>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-gray-900">
                  {stats?.rating?.toFixed(1) || '0.0'}
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= (stats?.rating || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    {stats?.totalReviews || 0} {translate('provider.layout.rating')}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{translate('provider.dashboard.quickActions')}</h3>
              <div className="space-y-2">
                <Link
                  href="/pedidos"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-700">{translate('provider.dashboard.seeRequests')}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </Link>
                <Link
                  href="/servicos"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="font-medium text-gray-700">{translate('provider.dashboard.activeServices')}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </Link>
                <Link
                  href="/configuracoes"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-gray-600" />
                    </div>
                    <span className="font-medium text-gray-700">{translate('provider.layout.settings')}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatCard({ 
  icon, 
  iconBg, 
  iconColor, 
  label, 
  value, 
  trend, 
  trendLabel 
}: { 
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: number | string
  trend?: number
  trendLabel?: string
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-soft card-hover">
      <div className={`w-12 h-12 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {trend > 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          {trendLabel && (
            <span className="text-xs text-gray-400">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const icons = {
    new_request: { icon: ClipboardList, bg: 'bg-blue-100', color: 'text-blue-600' },
    quote_accepted: { icon: CheckCircle, bg: 'bg-green-100', color: 'text-green-600' },
    service_completed: { icon: Star, bg: 'bg-purple-100', color: 'text-purple-600' },
    payment_received: { icon: DollarSign, bg: 'bg-emerald-100', color: 'text-emerald-600' },
  }

  const { icon: Icon, bg, color } = icons[activity.type]

  return (
    <div className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer">
      <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
        <p className="text-sm text-gray-500 truncate">{activity.description}</p>
      </div>
      <div className="text-right">
        {activity.amount && (
          <p className="text-sm font-semibold text-green-600">+${activity.amount.toFixed(2)}</p>
        )}
        <p className="text-xs text-gray-400">{activity.time}</p>
      </div>
    </div>
  )
}

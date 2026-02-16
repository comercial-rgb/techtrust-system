'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import {
  Plus,
  Loader2,
  MapPin,
  Star,
  Eye,
  Edit,
  BarChart3,
  Droplets,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

interface CarWash {
  id: string
  businessName: string
  status: string
  address: string
  city: string
  state: string
  averageRating: number
  totalReviews: number
  carWashTypes: string[]
  _count?: {
    packages: number
    membershipPlans: number
  }
}

interface DashboardMetrics {
  totalProfileViews: number
  totalDirectionClicks: number
  totalPhoneCalls: number
  totalWebsiteClicks: number
  totalReviews: number
  averageRating: number
  period: string
}

const TYPE_LABELS: Record<string, string> = {
  AUTOMATIC_TUNNEL: 'Automatic Tunnel',
  EXPRESS_EXTERIOR: 'Express Exterior',
  SELF_SERVICE_BAY: 'Self-Service Bay',
  FULL_SERVICE: 'Full Service',
  HAND_WASH: 'Hand Wash',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  SUSPENDED: 'bg-red-100 text-red-700',
}

export default function CarWashPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { translate: t } = useI18n()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [carWashes, setCarWashes] = useState<CarWash[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  async function loadData() {
    setLoading(true)
    try {
      const [washesRes, metricsRes] = await Promise.all([
        api.get('/car-wash/provider/my-car-washes'),
        api.get('/car-wash/provider/my-car-washes').then(r => {
          const washes = r.data?.data || []
          if (washes.length > 0) {
            return api.get(`/car-wash/provider/${washes[0].id}/dashboard`).catch(() => null)
          }
          return null
        }).catch(() => null),
      ])
      setCarWashes(washesRes.data.data || [])
      if (metricsRes?.data?.data) {
        setMetrics(metricsRes.data.data)
      }
    } catch (error) {
      console.error('Error loading car wash data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <DashboardLayout title="Car Wash Management">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Droplets className="w-6 h-6 text-blue-500" />
              Car Wash Management
            </h1>
            <p className="text-gray-500 mt-1">
              Manage your car wash locations, packages, and memberships
            </p>
          </div>
          <Link
            href="/car-wash/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Car Wash
          </Link>
        </div>

        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Eye className="w-4 h-4" />
                <span className="text-sm">Profile Views</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalProfileViews}</p>
              <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Direction Clicks</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalDirectionClicks}</p>
              <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Star className="w-4 h-4" />
                <span className="text-sm">Avg Rating</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{Number(metrics.averageRating).toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-1">{metrics.totalReviews} reviews</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Phone Calls</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalPhoneCalls}</p>
              <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
            </div>
          </div>
        )}

        {/* Car Washes List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : carWashes.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Droplets className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Car Wash Locations</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Register your car wash to start appearing on TechTrust&apos;s map and reach thousands of customers.
            </p>
            <Link
              href="/car-wash/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Register Your Car Wash
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {carWashes.map((wash) => (
              <div
                key={wash.id}
                className="bg-white rounded-xl border hover:shadow-md transition p-5"
              >
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{wash.businessName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[wash.status] || 'bg-gray-100 text-gray-500'}`}>
                        {wash.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                      <MapPin className="w-3.5 h-3.5" />
                      {wash.address}, {wash.city}, {wash.state}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {wash.carWashTypes.map((type) => (
                        <span key={type} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                          {TYPE_LABELS[type] || type}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-bold">{Number(wash.averageRating).toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-gray-400">{wash.totalReviews} reviews</span>
                    </div>
                    <Link
                      href={`/car-wash/${wash.id}`}
                      className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition text-sm font-medium"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Manage
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

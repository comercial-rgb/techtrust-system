'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import {
  Zap,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  Loader2,
  RefreshCw,
  Car,
  Fuel,
  Key,
  Truck,
  Battery,
  X,
  AlertTriangle,
} from 'lucide-react'

interface SOSRequest {
  id: string
  sosType: string
  customerName: string
  vehicleDescription: string
  distanceKm: number
  estimatedEtaMinutes: number
  suggestedPrice: number | null
  suggestedBaseFee: number | null
  suggestedPerMileRate: number | null
  pricingType: 'flat' | 'towing'
  createdAt: string
}

const SOS_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  JUMP_START:      { label: 'Jump Start',         icon: Zap,       color: '#f59e0b', bg: '#fef3c7' },
  FLAT_TIRE:       { label: 'Flat Tire',           icon: Car,       color: '#3b82f6', bg: '#dbeafe' },
  FUEL_DELIVERY:   { label: 'Fuel Delivery',       icon: Fuel,      color: '#10b981', bg: '#d1fae5' },
  LOCKOUT:         { label: 'Vehicle Lockout',     icon: Key,       color: '#8b5cf6', bg: '#ede9fe' },
  TOWING:          { label: 'Towing',              icon: Truck,     color: '#dc2626', bg: '#fee2e2' },
  BATTERY_REPLACE: { label: 'Battery Replacement', icon: Battery,   color: '#ec4899', bg: '#fce7f3' },
}

export default function SOSPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()

  const [requests, setRequests] = useState<SOSRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(false)
  const [togglingOnline, setTogglingOnline] = useState(false)
  const [acceptModal, setAcceptModal] = useState<SOSRequest | null>(null)
  const [offeredPrice, setOfferedPrice] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) initialize()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [isAuthenticated])

  async function initialize() {
    setLoading(true)
    try {
      const res = await api.get('/sos/rate-card')
      const data = res.data?.availabilityStatus !== undefined ? res.data : (res.data?.data ?? res.data ?? {})
      if (data?.availabilityStatus === 'ONLINE') {
        setIsOnline(true)
        await fetchRequests()
        startPolling()
      }
    } catch {
      // If SOS rate card not found, show offline state
    } finally {
      setLoading(false)
    }
  }

  async function fetchRequests() {
    try {
      const res = await api.get('/sos/nearby', { params: { radiusKm: 30 } })
      const data = res.data
      setRequests(Array.isArray(data) ? data : (data?.requests ?? data?.data ?? []))
    } catch {
      setRequests([])
    }
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(fetchRequests, 30000)
  }

  async function toggleOnline() {
    setTogglingOnline(true)
    try {
      const newStatus = isOnline ? 'OFFLINE' : 'ONLINE'
      await api.patch('/sos/rate-card', { availabilityStatus: newStatus })
      setIsOnline(!isOnline)
      if (!isOnline) {
        await fetchRequests()
        startPolling()
      } else {
        if (pollRef.current) clearInterval(pollRef.current)
        setRequests([])
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status')
    } finally {
      setTogglingOnline(false)
    }
  }

  async function acceptRequest() {
    if (!acceptModal || !offeredPrice) return
    setAccepting(true)
    setError(null)
    try {
      await api.post(`/sos/requests/${acceptModal.id}/accept`, {
        offeredPrice: parseFloat(offeredPrice),
      })
      setRequests(prev => prev.filter(r => r.id !== acceptModal.id))
      setAcceptModal(null)
      setOfferedPrice('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept request')
    } finally {
      setAccepting(false)
    }
  }

  function openAcceptModal(req: SOSRequest) {
    const suggested = req.suggestedPrice ?? req.suggestedBaseFee ?? ''
    setOfferedPrice(suggested ? String(suggested) : '')
    setAcceptModal(req)
  }

  const distanceMiles = (km: number) => (km / 1.60934).toFixed(1)

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <DashboardLayout title="SOS / Emergency Requests">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {/* Online toggle card */}
      <div className={`rounded-2xl p-6 mb-6 border-2 transition-all ${isOnline ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`relative w-4 h-4 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}>
              {isOnline && (
                <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
              )}
            </div>
            <div>
              <p className={`text-lg font-bold ${isOnline ? 'text-green-800' : 'text-gray-700'}`}>
                {isOnline ? 'You are ONLINE' : 'You are OFFLINE'}
              </p>
              <p className="text-sm text-gray-500">
                {isOnline
                  ? 'Receiving SOS requests within 30 km. Refreshes every 30 seconds.'
                  : 'Go online to start receiving emergency service requests.'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleOnline}
            disabled={togglingOnline}
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
              isOnline
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {togglingOnline ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : !isOnline ? (
        <div className="bg-white rounded-2xl p-12 shadow-soft text-center">
          <Zap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-medium text-gray-700 mb-1">Go online to see SOS requests</p>
          <p className="text-sm text-gray-400">Emergency requests from nearby customers will appear here.</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-soft text-center">
          <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <p className="font-medium text-gray-700 mb-1">No open SOS requests nearby</p>
          <p className="text-sm text-gray-400">New requests will appear automatically. Keep this page open.</p>
          <button
            onClick={fetchRequests}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-xl text-sm font-medium hover:bg-primary-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">{requests.length} open request{requests.length !== 1 ? 's' : ''} nearby</p>
            <button onClick={fetchRequests} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {requests.map(req => {
            const meta = SOS_META[req.sosType] || { label: req.sosType, icon: Zap, color: '#6b7280', bg: '#f3f4f6' }
            const Icon = meta.icon
            return (
              <div key={req.id} className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
                      <Icon className="w-6 h-6" style={{ color: meta.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{meta.label}</p>
                      <p className="text-sm text-gray-500">{req.customerName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {req.suggestedPrice && (
                      <p className="text-lg font-bold text-emerald-600">${req.suggestedPrice.toFixed(2)}</p>
                    )}
                    <p className="text-xs text-gray-400">suggested</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-600">
                  {req.vehicleDescription && (
                    <span className="flex items-center gap-1">
                      <Car className="w-4 h-4 text-gray-400" />
                      {req.vehicleDescription}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {distanceMiles(req.distanceKm)} mi away
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    ~{req.estimatedEtaMinutes} min ETA
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <button
                  onClick={() => openAcceptModal(req)}
                  className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Accept Request
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Accept modal */}
      {acceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Accept Request</h3>
              <button onClick={() => setAcceptModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="font-medium text-gray-900">{SOS_META[acceptModal.sosType]?.label || acceptModal.sosType}</p>
              <p className="text-sm text-gray-500 mt-1">{acceptModal.vehicleDescription}</p>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{distanceMiles(acceptModal.distanceKm)} mi</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />~{acceptModal.estimatedEtaMinutes} min</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your Price ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={offeredPrice}
                  onChange={e => setOfferedPrice(e.target.value)}
                  className="input !pl-8 w-full"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              {acceptModal.suggestedPrice && (
                <p className="text-xs text-gray-400 mt-1">
                  Suggested: ${acceptModal.suggestedPrice.toFixed(2)}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={acceptRequest}
                disabled={accepting || !offeredPrice}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {accepting ? 'Accepting...' : 'Confirm Accept'}
              </button>
              <button onClick={() => setAcceptModal(null)} className="btn btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

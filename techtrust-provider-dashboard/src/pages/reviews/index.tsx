'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import {
  Star,
  Loader2,
  RefreshCw,
  MessageSquare,
  X,
  Send,
  ChevronDown,
  Car,
  Wrench,
} from 'lucide-react'

import { logApiError } from "../../utils/logger";
interface Review {
  id: string
  customerName: string
  customerInitials: string
  rating: number
  comment: string
  serviceType: string
  vehicle: string
  date: string
  reply?: string
}

interface ReviewStats {
  average: number
  total: number
  distribution: Record<string, number>
}

export default function ReviewsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()

  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats>({
    average: 0, total: 0,
    distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all')
  const [replyModal, setReplyModal] = useState<Review | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) loadReviews()
  }, [isAuthenticated])

  async function loadReviews() {
    setLoading(true)
    try {
      const res = await api.get('/reviews/provider/me')
      const data = res.data?.reviews !== undefined ? res.data : (res.data?.data ?? res.data)
      const list = data?.reviews ?? data ?? []
      setReviews(
        Array.isArray(list)
          ? list.map((r: any) => ({
              id: r.id,
              customerName: r.customerName || r.customer?.fullName || 'Customer',
              customerInitials: (r.customerName || r.customer?.fullName || 'C')
                .split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
              rating: r.rating,
              comment: r.comment || '',
              serviceType: r.serviceType || r.workOrder?.serviceType || '',
              vehicle: r.vehicle || (r.workOrder?.vehicle
                ? `${r.workOrder.vehicle.make || ''} ${r.workOrder.vehicle.model || ''} ${r.workOrder.vehicle.year || ''}`.trim()
                : ''),
              date: r.createdAt || r.date,
              reply: r.reply || r.providerResponse || undefined,
            }))
          : []
      )
      if (data?.stats) setStats(data.stats)
    } catch {
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  async function submitReply() {
    if (!replyModal || !replyText.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/reviews/${replyModal.id}/response`, { providerResponse: replyText })
      setReviews(prev =>
        prev.map(r => r.id === replyModal.id ? { ...r, reply: replyText } : r)
      )
      setReplyModal(null)
      setReplyText('')
    } catch (err) {
      logApiError('Reply error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const displayed = filter === 'all'
    ? reviews
    : reviews.filter(r => r.rating === Number(filter))

  const totalDist = Object.values(stats.distribution).reduce((a, b) => a + b, 0) || 1

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <DashboardLayout title="Reviews">
      {/* Stats header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Average rating */}
        <div className="bg-white rounded-2xl p-6 shadow-soft flex items-center gap-6">
          <div className="text-center">
            <p className="text-5xl font-bold text-gray-900">{stats.average.toFixed(1)}</p>
            <div className="flex justify-center gap-0.5 mt-2 mb-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`w-5 h-5 ${s <= Math.round(stats.average) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
              ))}
            </div>
            <p className="text-sm text-gray-500">{stats.total} reviews</p>
          </div>
          {/* Distribution bars */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats.distribution[String(star)] || 0
              const pct = Math.round((count / totalDist) * 100)
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-2 text-gray-500">{star}</span>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-gray-400">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick stats */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-4">
          {[
            { label: 'Total Reviews', value: stats.total, color: 'text-gray-900' },
            { label: '5-Star Reviews', value: stats.distribution['5'] || 0, color: 'text-yellow-600' },
            { label: 'Response Rate', value: `${reviews.length > 0 ? Math.round((reviews.filter(r => r.reply).length / reviews.length) * 100) : 0}%`, color: 'text-green-600' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl p-5 shadow-soft text-center">
              <p className={`text-3xl font-bold mb-1 ${item.color}`}>{item.value}</p>
              <p className="text-sm text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + refresh */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', '5', '4', '3', '2', '1'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-soft'
              }`}
            >
              {f === 'all' ? 'All Reviews' : `${f} Stars`}
            </button>
          ))}
        </div>
        <button
          onClick={loadReviews}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-soft animate-pulse">
              <div className="skeleton h-4 w-32 mb-3 rounded" />
              <div className="skeleton h-3 w-full mb-2 rounded" />
              <div className="skeleton h-3 w-3/4 rounded" />
            </div>
          ))
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-soft text-center">
            <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No reviews yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'all' ? 'Complete services to start receiving reviews.' : `No ${filter}-star reviews.`}
            </p>
          </div>
        ) : (
          displayed.map(review => (
            <div key={review.id} className="bg-white rounded-2xl p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                    {review.customerInitials}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{review.customerName}</p>
                    <p className="text-xs text-gray-400">
                      {review.date ? new Date(review.date).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                  ))}
                </div>
              </div>

              {/* Service / vehicle tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {review.serviceType && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    <Wrench className="w-3 h-3" />
                    {review.serviceType}
                  </span>
                )}
                {review.vehicle && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    <Car className="w-3 h-3" />
                    {review.vehicle}
                  </span>
                )}
              </div>

              {review.comment && (
                <p className="text-sm text-gray-700 mb-3 leading-relaxed">{review.comment}</p>
              )}

              {/* Provider reply */}
              {review.reply && (
                <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 mb-3">
                  <p className="text-xs font-semibold text-primary-700 mb-1">Your Reply</p>
                  <p className="text-sm text-primary-800">{review.reply}</p>
                </div>
              )}

              {!review.reply && (
                <button
                  onClick={() => { setReplyModal(review); setReplyText('') }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Reply to review
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reply modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reply to Review</h3>
              <button onClick={() => setReplyModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <div className="flex gap-1 mb-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-3.5 h-3.5 ${s <= replyModal.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <p className="text-sm text-gray-700 italic">"{replyModal.comment}"</p>
              <p className="text-xs text-gray-400 mt-1">— {replyModal.customerName}</p>
            </div>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={4}
              placeholder="Write a professional reply..."
              className="input resize-none w-full mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={submitReply}
                disabled={submitting || !replyText.trim()}
                className="btn btn-primary flex items-center gap-2 flex-1 justify-center disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Sending...' : 'Send Reply'}
              </button>
              <button onClick={() => setReplyModal(null)} className="btn btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

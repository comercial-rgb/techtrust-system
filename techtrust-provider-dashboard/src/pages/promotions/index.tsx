'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import api from '@/services/api'
import {
  Megaphone, Plus, Image, Calendar, Eye, MousePointer, Trash2, Edit2,
  Loader2, Droplets, Package, BarChart3, AlertCircle, CheckCircle, Clock
} from 'lucide-react'

interface Promotion {
  id: string
  title: string
  description?: string
  imageUrl?: string
  ctaText?: string
  discountType?: string
  discountValue?: number
  promoCode?: string
  type: string
  position: string
  isActive: boolean
  startsAt: string
  endsAt?: string
  impressions: number
  clicks: number
  carWashId?: string
  partsStoreId?: string
  carWash?: { businessName: string }
  partsStore?: { storeName: string }
}

interface Listing {
  id: string
  name: string
  type: 'carwash' | 'autoparts'
}

export default function PromotionsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const { translate } = useI18n()
  const tr = translate

  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    ctaText: 'Learn More',
    discountType: '',
    discountValue: '',
    promoCode: '',
    type: 'BANNER',
    targetId: '',
    targetType: 'carwash' as 'carwash' | 'autoparts',
    startsAt: new Date().toISOString().split('T')[0],
    endsAt: '',
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && user) loadData()
  }, [isAuthenticated, user])

  async function loadData() {
    setLoading(true)
    try {
      // Load promotions
      const promoRes = await api.get('/marketplace/promotions/my').catch(() => ({ data: [] }))
      setPromotions(Array.isArray(promoRes.data) ? promoRes.data : promoRes.data?.data || [])

      // Load listings to associate promotions
      const cwRes = await api.get('/car-wash/provider/my-car-washes').catch(() => ({ data: [] }))
      const cwList = (Array.isArray(cwRes.data) ? cwRes.data : cwRes.data?.data || []).map((cw: any) => ({
        id: cw.id, name: cw.businessName, type: 'carwash' as const
      }))

      const psRes = await api.get('/parts-store/provider/my-stores').catch(() => ({ data: [] }))
      const psList = (Array.isArray(psRes.data) ? psRes.data : psRes.data?.data || []).map((ps: any) => ({
        id: ps.id, name: ps.storeName, type: 'autoparts' as const
      }))

      setListings([...cwList, ...psList])
      if (cwList.length > 0) {
        setForm(f => ({ ...f, targetId: cwList[0].id, targetType: 'carwash' }))
      } else if (psList.length > 0) {
        setForm(f => ({ ...f, targetId: psList[0].id, targetType: 'autoparts' }))
      }
    } catch {}
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.targetId) { setError('Select a business'); return }
    setError('')
    setSaving(true)
    try {
      await api.post('/marketplace/promotions', {
        title: form.title,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        ctaText: form.ctaText || undefined,
        discountType: form.discountType || undefined,
        discountValue: form.discountValue ? parseFloat(form.discountValue) : undefined,
        promoCode: form.promoCode || undefined,
        type: form.type,
        position: 'PROFILE',
        startsAt: form.startsAt,
        endsAt: form.endsAt || undefined,
        ...(form.targetType === 'carwash' ? { carWashId: form.targetId } : { partsStoreId: form.targetId }),
      })
      setShowCreate(false)
      setForm({ title: '', description: '', imageUrl: '', ctaText: 'Learn More', discountType: '', discountValue: '', promoCode: '', type: 'BANNER', targetId: listings[0]?.id || '', targetType: listings[0]?.type || 'carwash', startsAt: new Date().toISOString().split('T')[0], endsAt: '' })
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create promotion')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this promotion?')) return
    try {
      await api.delete(`/marketplace/promotions/${id}`)
      loadData()
    } catch {}
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await api.patch(`/marketplace/promotions/${id}`, { isActive: !isActive })
      loadData()
    } catch {}
  }

  const activeCount = promotions.filter(p => p.isActive).length
  const totalImpressions = promotions.reduce((s, p) => s + p.impressions, 0)
  const totalClicks = promotions.reduce((s, p) => s + p.clicks, 0)
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0'

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Promotions & Ads - TechTrust</title>
      </Head>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-purple-600" />
              {tr('promotions.title') || 'Promotions & Ads'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {tr('promotions.subtitle') || 'Create ads that appear on your business profiles in web and mobile.'}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {tr('promotions.create') || 'Create Promotion'}
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Megaphone className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">{tr('promotions.active') || 'Active'}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">{tr('promotions.impressions') || 'Impressions'}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalImpressions.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <MousePointer className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">{tr('promotions.clicks') || 'Clicks'}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalClicks.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">CTR</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{ctr}%</p>
          </div>
        </div>

        {/* Create Promotion Modal */}
        {showCreate && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {tr('promotions.new') || 'New Promotion'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business *</label>
                <select
                  value={form.targetId}
                  onChange={e => {
                    const l = listings.find(l => l.id === e.target.value)
                    setForm(f => ({ ...f, targetId: e.target.value, targetType: l?.type || 'carwash' }))
                  }}
                  className="input"
                >
                  {listings.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.type === 'carwash' ? '🚿' : '🏪'} {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input">
                  <option value="BANNER">Banner</option>
                  <option value="CARD">Card</option>
                  <option value="STORY">Story</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Summer Special - 20% Off!" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Get 20% off all full detail packages this summer..." className="input" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input type="url" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." className="input" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))} className="input">
                  <option value="">None</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount ($)</option>
                  <option value="BOGO">Buy One Get One</option>
                  <option value="FREE_SERVICE">Free Service</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                <input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder="10" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
                <input type="text" value={form.promoCode} onChange={e => setForm(f => ({ ...f, promoCode: e.target.value.toUpperCase() }))} placeholder="SUMMER20" className="input" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button</label>
                <input type="text" value={form.ctaText} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))} placeholder="Book Now" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} className="input" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={saving} className="btn btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Creating...' : 'Create Promotion'}
              </button>
              <button onClick={() => { setShowCreate(false); setError('') }} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Promotions List */}
        {promotions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {tr('promotions.empty') || 'No Promotions Yet'}
            </h3>
            <p className="text-gray-500 mb-4 max-w-sm mx-auto">
              {tr('promotions.emptyDesc') || 'Create promotions that will appear on your business profiles. Customers will see them when visiting your page on web and mobile.'}
            </p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              {tr('promotions.createFirst') || 'Create Your First Promotion'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map(promo => (
              <div key={promo.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {promo.imageUrl ? (
                      <img src={promo.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Image className="w-6 h-6 text-purple-500" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{promo.title}</h3>
                        {promo.isActive ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Inactive
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">{promo.type}</span>
                      </div>
                      {promo.description && <p className="text-sm text-gray-500 mb-1">{promo.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>
                          {promo.carWash ? `🚿 ${promo.carWash.businessName}` : promo.partsStore ? `🏪 ${promo.partsStore.storeName}` : ''}
                        </span>
                        {promo.promoCode && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-mono">{promo.promoCode}</span>}
                        {promo.discountType && promo.discountValue && (
                          <span>{promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% off` : `$${promo.discountValue} off`}</span>
                        )}
                        <span><Calendar className="w-3 h-3 inline mr-0.5" />{new Date(promo.startsAt).toLocaleDateString()}</span>
                        {promo.endsAt && <span>→ {new Date(promo.endsAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs text-gray-500">
                      <div><Eye className="w-3 h-3 inline mr-1" />{promo.impressions.toLocaleString()}</div>
                      <div><MousePointer className="w-3 h-3 inline mr-1" />{promo.clicks.toLocaleString()}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleToggle(promo.id, promo.isActive)}
                        className={`p-2 rounded-lg transition-colors ${promo.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                        title={promo.isActive ? 'Pause' : 'Activate'}
                      >
                        {promo.isActive ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Plan Info */}
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            {tr('promotions.planInfo') || 'Promotion Limits by Plan'}
          </h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3">
              <div className="font-medium text-gray-900">Basic</div>
              <div className="text-gray-500">No promotions included</div>
            </div>
            <div className="bg-white rounded-lg p-3 ring-1 ring-purple-200">
              <div className="font-medium text-gray-900">Pro</div>
              <div className="text-gray-500">1 active promotion/month</div>
            </div>
            <div className="bg-white rounded-lg p-3 ring-2 ring-yellow-300">
              <div className="font-medium text-gray-900">Pro+ ⭐</div>
              <div className="text-gray-500">5 active promotions/month</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

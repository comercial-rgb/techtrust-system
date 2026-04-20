'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
  MapPin,
  Clock,
  DollarSign,
  Package,
  Star,
  Image as ImageIcon,
  CheckCircle,
  X,
  Truck,
  Search,
  Eye,
  ShoppingCart,
  BarChart3,
  TrendingUp,
  Phone,
  Globe,
} from 'lucide-react'
import Link from 'next/link'

const PARTS_CATEGORIES = [
  { value: 'engine', label: 'Engine Parts' },
  { value: 'brakes', label: 'Brakes & Rotors' },
  { value: 'filters', label: 'Filters' },
  { value: 'oil_fluids', label: 'Oil & Fluids' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'suspension', label: 'Suspension & Steering' },
  { value: 'exhaust', label: 'Exhaust System' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'cooling', label: 'Cooling System' },
  { value: 'body_exterior', label: 'Body & Exterior' },
  { value: 'interior', label: 'Interior' },
  { value: 'tires_wheels', label: 'Tires & Wheels' },
  { value: 'battery', label: 'Battery & Charging' },
  { value: 'belts_hoses', label: 'Belts & Hoses' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'accessories', label: 'Accessories' },
]

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const CONDITION_OPTIONS = [
  { value: 'NEW', label: 'New (OEM / Aftermarket)' },
  { value: 'REFURBISHED', label: 'Remanufactured' },
  { value: 'USED', label: 'Used' },
]

interface ProductForm {
  name: string
  brand: string
  partNumber: string
  oemNumber: string
  categoryId: string
  price: string
  salePrice: string
  quantity: string
  condition: string
  description: string
  compatibility: string
  warrantyInfo: string
}

interface HoursEntry {
  day: string
  open: string
  close: string
  closed: boolean
}

interface StoreMetrics {
  totalProfileViews: number
  totalProductViews: number
  totalDirectionClicks: number
  totalPhoneCalls: number
  totalReservations: number
  averageRating: number
  totalReviews: number
  period: string
  dailyMetrics?: Array<{
    date: string
    profileViews: number
    productViews: number
    directionClicks: number
  }>
}

export default function AutoPartsDetailPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { translate: t } = useI18n()
  const router = useRouter()
  const { id, tab: queryTab, action } = router.query
  const isNew = id === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null)

  // Store form
  const [form, setForm] = useState({
    storeName: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: '',
    longitude: '',
    phoneNumber: '',
    email: '',
    websiteUrl: '',
    logoUrl: '',
    offersDelivery: false,
    deliveryRadius: '',
    deliveryFee: '',
    acceptsReturns: true,
    returnPolicy: '',
    taxId: '',
    categories: [] as string[],
  })

  const [hours, setHours] = useState<HoursEntry[]>(
    DAYS.map((day, i) => ({
      day,
      open: '08:00',
      close: '18:00',
      closed: i === 0,
    }))
  )

  // Products
  const [products, setProducts] = useState<any[]>([])
  const [showAddProduct, setShowAddProduct] = useState(action === 'add')
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>({
    name: '',
    brand: '',
    partNumber: '',
    oemNumber: '',
    categoryId: 'engine',
    price: '',
    salePrice: '',
    quantity: '1',
    condition: 'NEW',
    description: '',
    compatibility: '',
    warrantyInfo: '',
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (queryTab === 'products') setActiveTab('products')
    if (queryTab === 'analytics') setActiveTab('analytics')
  }, [queryTab])

  useEffect(() => {
    if (isAuthenticated && !isNew && id) {
      loadStore()
    }
  }, [isAuthenticated, id])

  async function loadStore() {
    try {
      const [storeRes, productsRes, metricsRes] = await Promise.all([
        api.get(`/parts-store/${id}`),
        api.get(`/parts-store/${id}/products`).catch(() => null),
        api.get(`/parts-store/provider/${id}/dashboard`).catch(() => null),
      ])

      const data = storeRes.data?.data
      if (data) {
        setForm({
          storeName: data.storeName || '',
          description: data.description || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          latitude: String(data.latitude || ''),
          longitude: String(data.longitude || ''),
          phoneNumber: data.phoneNumber || '',
          email: data.email || '',
          websiteUrl: data.websiteUrl || '',
          logoUrl: data.logoUrl || '',
          offersDelivery: data.offersDelivery || false,
          deliveryRadius: String(data.deliveryRadius || ''),
          deliveryFee: String(data.deliveryFee || ''),
          acceptsReturns: data.acceptsReturns ?? true,
          returnPolicy: data.returnPolicy || '',
          taxId: data.taxId || '',
          categories: data.categories || [],
        })
        if (data.operatingHours) {
          try {
            const parsed = typeof data.operatingHours === 'string' ? JSON.parse(data.operatingHours) : data.operatingHours
            if (Array.isArray(parsed)) setHours(parsed)
          } catch {}
        }
      }

      if (productsRes?.data?.data) setProducts(productsRes.data.data)
      if (metricsRes?.data?.data) setMetrics(metricsRes.data.data)
    } catch (error) {
      console.error('Error loading store:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        storeName: form.storeName,
        description: form.description || undefined,
        address: form.address,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        latitude: parseFloat(form.latitude) || undefined,
        longitude: parseFloat(form.longitude) || undefined,
        phoneNumber: form.phoneNumber || undefined,
        email: form.email || undefined,
        websiteUrl: form.websiteUrl || undefined,
        logoUrl: form.logoUrl || undefined,
        offersDelivery: form.offersDelivery,
        deliveryRadius: form.deliveryRadius ? parseFloat(form.deliveryRadius) : undefined,
        deliveryFee: form.deliveryFee ? parseFloat(form.deliveryFee) : undefined,
        acceptsReturns: form.acceptsReturns,
        returnPolicy: form.returnPolicy || undefined,
        taxId: form.taxId || undefined,
        categories: form.categories,
        operatingHours: hours,
      }

      if (isNew) {
        await api.post('/parts-store/provider/create', payload)
      } else {
        await api.patch(`/parts-store/provider/${id}`, payload)
      }
      router.push('/auto-parts')
    } catch (error: any) {
      console.error('Error saving store:', error)
      alert(error?.response?.data?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddProduct() {
    try {
      const payload = {
        name: productForm.name,
        brand: productForm.brand,
        partNumber: productForm.partNumber,
        oemNumber: productForm.oemNumber || undefined,
        categoryId: productForm.categoryId,
        price: parseFloat(productForm.price) || 0,
        salePrice: productForm.salePrice ? parseFloat(productForm.salePrice) : undefined,
        quantity: parseInt(productForm.quantity) || 1,
        condition: productForm.condition,
        description: productForm.description || undefined,
        compatibility: productForm.compatibility ? productForm.compatibility.split(',').map(s => s.trim()) : undefined,
        warrantyInfo: productForm.warrantyInfo || undefined,
      }

      if (editingProduct) {
        await api.patch(`/parts-store/provider/${id}/products/${editingProduct}`, payload)
      } else {
        await api.post(`/parts-store/provider/${id}/products`, payload)
      }

      setShowAddProduct(false)
      setEditingProduct(null)
      setProductForm({ name: '', brand: '', partNumber: '', oemNumber: '', categoryId: 'engine', price: '', salePrice: '', quantity: '1', condition: 'NEW', description: '', compatibility: '', warrantyInfo: '' })
      loadStore()
    } catch (error: any) {
      console.error('Error saving product:', error)
      alert(error?.response?.data?.message || 'Failed to save product.')
    }
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm('Delete this product?')) return
    try {
      await api.delete(`/parts-store/provider/${id}/products/${productId}`)
      setProducts(prev => prev.filter(p => p.id !== productId))
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  function editProduct(product: any) {
    setProductForm({
      name: product.name,
      brand: product.brand || '',
      partNumber: product.partNumber || '',
      oemNumber: product.oemNumber || '',
      categoryId: product.categoryId || 'engine',
      price: String(product.price),
      salePrice: product.salePrice ? String(product.salePrice) : '',
      quantity: String(product.quantity),
      condition: product.condition || 'NEW',
      description: product.description || '',
      compatibility: Array.isArray(product.compatibility) ? product.compatibility.join(', ') : '',
      warrantyInfo: product.warrantyInfo || '',
    })
    setEditingProduct(product.id)
    setShowAddProduct(true)
  }

  const toggleCategory = (cat: string) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }))
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (loading) {
    return (
      <DashboardLayout title="Auto Parts Store">
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    )
  }

  const TABS = isNew
    ? [{ key: 'info', label: 'Store Info' }, { key: 'hours', label: 'Hours' }, { key: 'delivery', label: 'Delivery' }]
    : [
        { key: 'info', label: 'Store Info' },
        { key: 'hours', label: 'Hours' },
        { key: 'delivery', label: 'Delivery' },
        { key: 'products', label: `Products (${products.length})` },
        { key: 'analytics', label: 'Analytics' },
      ]

  return (
    <DashboardLayout title={isNew ? 'Register Store' : form.storeName}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/auto-parts" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">
              {isNew ? 'Register Your Auto Parts Store' : form.storeName}
            </h1>
          </div>
          {(activeTab === 'info' || activeTab === 'hours' || activeTab === 'delivery') && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isNew ? 'Register Store' : 'Save Changes'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.key ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Store Info Tab */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-xl border p-6 space-y-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Store Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
                <input
                  type="text"
                  value={form.storeName}
                  onChange={e => setForm(prev => ({ ...prev, storeName: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g. AutoZone - Orange Ave"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Describe your store, specialties, years in business..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={e => setForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="(407) 555-0100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="store@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={e => setForm(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (EIN)</label>
                <input
                  type="text"
                  value={form.taxId}
                  onChange={e => setForm(prev => ({ ...prev, taxId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </div>

            {/* Address */}
            <h3 className="font-medium text-gray-800 flex items-center gap-2 pt-4 border-t">
              <MapPin className="w-4 h-4" /> Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="1234 W Colonial Dr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Orlando"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="FL"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                <input
                  type="text"
                  value={form.zipCode}
                  onChange={e => setForm(prev => ({ ...prev, zipCode: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="32801"
                />
              </div>
            </div>

            {/* Categories */}
            <h3 className="font-medium text-gray-800 pt-4 border-t">Parts Categories</h3>
            <p className="text-sm text-gray-500">Select the categories your store carries</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PARTS_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => toggleCategory(cat.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition text-left ${
                    form.categories.includes(cat.value)
                      ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hours Tab */}
        {activeTab === 'hours' && (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Operating Hours
            </h2>
            <div className="space-y-3">
              {hours.map((h, i) => (
                <div key={h.day} className="flex items-center gap-4 py-2 border-b last:border-0">
                  <span className="w-28 font-medium text-gray-700">{h.day}</span>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={h.closed}
                      onChange={e => {
                        const updated = [...hours]
                        updated[i] = { ...updated[i], closed: e.target.checked }
                        setHours(updated)
                      }}
                      className="rounded text-orange-600"
                    />
                    Closed
                  </label>
                  {!h.closed && (
                    <>
                      <input
                        type="time"
                        value={h.open}
                        onChange={e => {
                          const updated = [...hours]
                          updated[i] = { ...updated[i], open: e.target.value }
                          setHours(updated)
                        }}
                        className="border rounded-lg px-2 py-1 text-sm"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={h.close}
                        onChange={e => {
                          const updated = [...hours]
                          updated[i] = { ...updated[i], close: e.target.value }
                          setHours(updated)
                        }}
                        className="border rounded-lg px-2 py-1 text-sm"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delivery Tab */}
        {activeTab === 'delivery' && (
          <div className="bg-white rounded-xl border p-6 space-y-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-500" />
              Delivery & Returns
            </h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.offersDelivery}
                  onChange={e => setForm(prev => ({ ...prev, offersDelivery: e.target.checked }))}
                  className="rounded text-orange-600 w-5 h-5"
                />
                <div>
                  <span className="font-medium text-gray-900">Offer Delivery</span>
                  <p className="text-sm text-gray-500">Deliver parts to customers or repair shops</p>
                </div>
              </label>

              {form.offersDelivery && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-orange-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Radius (miles)</label>
                    <input
                      type="number"
                      value={form.deliveryRadius}
                      onChange={e => setForm(prev => ({ ...prev, deliveryRadius: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.deliveryFee}
                      onChange={e => setForm(prev => ({ ...prev, deliveryFee: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="5.99"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.acceptsReturns}
                    onChange={e => setForm(prev => ({ ...prev, acceptsReturns: e.target.checked }))}
                    className="rounded text-orange-600 w-5 h-5"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Accept Returns</span>
                    <p className="text-sm text-gray-500">Allow customers to return parts within your policy</p>
                  </div>
                </label>
              </div>

              {form.acceptsReturns && (
                <div className="pl-4 border-l-2 border-orange-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Policy</label>
                  <textarea
                    value={form.returnPolicy}
                    onChange={e => setForm(prev => ({ ...prev, returnPolicy: e.target.value }))}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="30-day return policy for unused parts in original packaging..."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && !isNew && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Product Catalog</h2>
              <button
                onClick={() => { setShowAddProduct(true); setEditingProduct(null); setProductForm({ name: '', brand: '', partNumber: '', oemNumber: '', categoryId: 'engine', price: '', salePrice: '', quantity: '1', condition: 'NEW', description: '', compatibility: '', warrantyInfo: '' }) }}
                className="inline-flex items-center gap-1.5 bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            {/* Add/Edit Product Form */}
            {showAddProduct && (
              <div className="bg-white rounded-xl border p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-gray-900">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
                  <button onClick={() => { setShowAddProduct(false); setEditingProduct(null) }} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Brake Pad Set - Front"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                    <input
                      type="text"
                      value={productForm.brand}
                      onChange={e => setProductForm(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Bosch"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Part Number *</label>
                    <input
                      type="text"
                      value={productForm.partNumber}
                      onChange={e => setProductForm(prev => ({ ...prev, partNumber: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="BP2000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">OEM Number</label>
                    <input
                      type="text"
                      value={productForm.oemNumber}
                      onChange={e => setProductForm(prev => ({ ...prev, oemNumber: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      value={productForm.categoryId}
                      onChange={e => setProductForm(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {PARTS_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition *</label>
                    <select
                      value={productForm.condition}
                      onChange={e => setProductForm(prev => ({ ...prev, condition: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {CONDITION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={e => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="29.99"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.salePrice}
                      onChange={e => setProductForm(prev => ({ ...prev, salePrice: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      value={productForm.quantity}
                      onChange={e => setProductForm(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="10"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Compatibility</label>
                    <input
                      type="text"
                      value={productForm.compatibility}
                      onChange={e => setProductForm(prev => ({ ...prev, compatibility: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Honda Civic 2016-2023, Honda Accord 2018-2023"
                    />
                    <p className="text-xs text-gray-400 mt-1">Comma-separated list of compatible vehicles</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={productForm.description}
                      onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Info</label>
                    <input
                      type="text"
                      value={productForm.warrantyInfo}
                      onChange={e => setProductForm(prev => ({ ...prev, warrantyInfo: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="2-year / 24,000-mile warranty"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => { setShowAddProduct(false); setEditingProduct(null) }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddProduct}
                    disabled={!productForm.name || !productForm.brand || !productForm.partNumber || !productForm.price}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition"
                  >
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                </div>
              </div>
            )}

            {/* Products List */}
            {products.length === 0 && !showAddProduct ? (
              <div className="bg-white rounded-xl border p-8 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No products yet. Start building your catalog.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Part #</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Stock</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-400">{product.brand}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{product.partNumber}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {PARTS_CATEGORIES.find(c => c.value === product.categoryId)?.label || product.categoryId}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ${Number(product.price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={product.quantity <= 5 ? 'text-red-600 font-medium' : ''}>
                            {product.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => editProduct(product)} className="text-gray-400 hover:text-orange-600 mr-2">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && !isNew && (
          <div className="space-y-6">
            {/* Metrics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl border p-4 text-center">
                <Eye className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">{metrics?.totalProfileViews || 0}</p>
                <p className="text-xs text-gray-500">Store Views</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <Search className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">{metrics?.totalProductViews || 0}</p>
                <p className="text-xs text-gray-500">Product Views</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <MapPin className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">{metrics?.totalDirectionClicks || 0}</p>
                <p className="text-xs text-gray-500">Map Routes</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <Phone className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">{metrics?.totalPhoneCalls || 0}</p>
                <p className="text-xs text-gray-500">Phone Calls</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <ShoppingCart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">{metrics?.totalReservations || 0}</p>
                <p className="text-xs text-gray-500">Reservations</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">{Number(metrics?.averageRating || 0).toFixed(1)}</p>
                <p className="text-xs text-gray-500">{metrics?.totalReviews || 0} Reviews</p>
              </div>
            </div>

            {/* Performance Insight */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                Performance Summary — Last 30 Days
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Customer Engagement</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">View-to-Route Rate</span>
                      <span className="font-medium">
                        {metrics?.totalProfileViews
                          ? `${((metrics.totalDirectionClicks / metrics.totalProfileViews) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 rounded-full h-2"
                        style={{ width: `${Math.min(100, metrics?.totalProfileViews ? (metrics.totalDirectionClicks / metrics.totalProfileViews) * 100 : 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">View-to-Call Rate</span>
                      <span className="font-medium">
                        {metrics?.totalProfileViews
                          ? `${((metrics.totalPhoneCalls / metrics.totalProfileViews) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 rounded-full h-2"
                        style={{ width: `${Math.min(100, metrics?.totalProfileViews ? (metrics.totalPhoneCalls / metrics.totalProfileViews) * 100 : 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">View-to-Reserve Rate</span>
                      <span className="font-medium">
                        {metrics?.totalProfileViews
                          ? `${((metrics.totalReservations / metrics.totalProfileViews) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 rounded-full h-2"
                        style={{ width: `${Math.min(100, metrics?.totalProfileViews ? (metrics.totalReservations / metrics.totalProfileViews) * 100 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Quick Tips</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Add more product photos to increase engagement
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Keep inventory quantities updated for accuracy
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Respond to reviews to build trust with customers
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      Upgrade to Best plan for 3x search boost
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Transaction Fee Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Transaction Fee Schedule</h4>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-amber-600 font-bold">11%</p>
                      <p className="text-xs text-gray-500">&lt; $1,000/mo</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-amber-600 font-bold">10%</p>
                      <p className="text-xs text-gray-500">$1K - $5K/mo</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-amber-600 font-bold">9%</p>
                      <p className="text-xs text-gray-500">$5K - $10K/mo</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-amber-600 font-bold">8%</p>
                      <p className="text-xs text-gray-500">&gt; $10K/mo</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

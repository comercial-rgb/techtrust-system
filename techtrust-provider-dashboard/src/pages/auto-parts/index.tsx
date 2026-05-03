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
  Package,
  TrendingUp,
  ShoppingCart,
  Truck,
  Search,
  Filter,
} from 'lucide-react'
import Link from 'next/link'
import { logApiError } from "../../utils/logger";

interface PartsStore {
  id: string
  storeName: string
  isActive: boolean
  isVerified: boolean
  address: string
  city: string
  state: string
  averageRating: number
  totalReviews: number
  offersDelivery: boolean
  deliveryRadius: number | null
  _count?: {
    products: number
  }
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
}

interface Product {
  id: string
  name: string
  brand: string
  partNumber: string
  price: number
  salePrice: number | null
  quantity: number
  condition: string
  categoryId: string
  isActive: boolean
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-500',
}

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'New',
  REFURBISHED: 'Refurbished',
  USED: 'Used',
}

export default function AutoPartsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { translate: t } = useI18n()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<PartsStore[]>([])
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'products'>('overview')

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
      const storesRes = await api.get('/parts-store/provider/my-stores')
      const storesList = storesRes.data?.data || []
      setStores(storesList)

      if (storesList.length > 0) {
        const [metricsRes, productsRes] = await Promise.all([
          api.get(`/parts-store/provider/${storesList[0].id}/dashboard`).catch(() => null),
          api.get(`/parts-store/provider/${storesList[0].id}/products`).catch(() => null),
        ])
        if (metricsRes?.data?.data) setMetrics(metricsRes.data.data)
        if (productsRes?.data?.data) setProducts(productsRes.data.data)
      }
    } catch (error) {
      logApiError('Error loading parts store data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <DashboardLayout title="Auto Parts Management">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-500" />
              Auto Parts Store
            </h1>
            <p className="text-gray-500 mt-1">
              Manage your parts store, inventory, and customer insights
            </p>
          </div>
          {stores.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'overview' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'products' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Products ({products.length})
              </button>
            </div>
          )}
        </div>

        {/* Metrics Cards */}
        {metrics && activeTab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Eye className="w-4 h-4" />
                <span className="text-sm">Store Views</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalProfileViews}</p>
              <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Search className="w-4 h-4" />
                <span className="text-sm">Product Views</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalProductViews}</p>
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
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm">Reservations</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalReservations}</p>
              <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Star className="w-4 h-4" />
                <span className="text-sm">Rating</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{Number(metrics.averageRating).toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-1">{metrics.totalReviews} reviews</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : stores.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl border p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Parts Store Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Register your auto parts store to start selling on TechTrust&apos;s marketplace and connect with repair shops and vehicle owners.
            </p>
            <Link
              href="/auto-parts/new"
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Register Your Store
            </Link>
          </div>
        ) : activeTab === 'overview' ? (
          /* Store Cards */
          <div className="grid gap-4">
            {stores.map((store) => (
              <div key={store.id} className="bg-white rounded-xl border hover:shadow-md transition p-5">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{store.storeName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${store.isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {store.isActive ? 'Active' : 'Pending'}
                      </span>
                      {store.isVerified && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                      <MapPin className="w-3.5 h-3.5" />
                      {store.address}, {store.city}, {store.state}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {store.offersDelivery && (
                        <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs font-medium flex items-center gap-1">
                          <Truck className="w-3 h-3" /> Delivery {store.deliveryRadius ? `(${store.deliveryRadius} mi)` : ''}
                        </span>
                      )}
                      {store._count?.products !== undefined && (
                        <span className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-xs font-medium">
                          {store._count.products} products
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-bold">{Number(store.averageRating).toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-gray-400">{store.totalReviews} reviews</span>
                    </div>
                    <Link
                      href={`/auto-parts/${store.id}`}
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
        ) : (
          /* Products Tab */
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">{products.length} products in your catalog</p>
              <Link
                href={`/auto-parts/${stores[0]?.id}?tab=products&action=add`}
                className="inline-flex items-center gap-1.5 bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </Link>
            </div>
            {products.length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No products yet. Add your first product to start selling.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Part #</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Condition</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Stock</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.slice(0, 20).map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-400">{product.brand}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{product.partNumber}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {CONDITION_LABELS[product.condition] || product.condition}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {product.salePrice ? (
                            <div>
                              <span className="text-red-600 font-medium">${Number(product.salePrice).toFixed(2)}</span>
                              <span className="text-gray-400 line-through text-xs ml-1">${Number(product.price).toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="font-medium text-gray-900">${Number(product.price).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={product.quantity <= 5 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {product.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Plan Info */}
        {stores.length > 0 && activeTab === 'overview' && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Your Listing Plan</h3>
                <p className="text-sm text-gray-600">
                  Upgrade to the Best plan for 3x search boost, featured badge, and 50-mile ad reach.
                </p>
              </div>
              <Link
                href="/configuracoes?tab=billing"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium whitespace-nowrap"
              >
                Manage Plan
              </Link>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Transaction fee: 8-11% per sale depending on volume tier
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

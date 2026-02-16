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
  Droplets,
  Star,
  Image as ImageIcon,
  CheckCircle,
  X,
} from 'lucide-react'
import Link from 'next/link'

const WASH_TYPES = [
  { value: 'AUTOMATIC_TUNNEL', label: 'Automatic Tunnel' },
  { value: 'EXPRESS_EXTERIOR', label: 'Express Exterior' },
  { value: 'SELF_SERVICE_BAY', label: 'Self-Service Bay' },
  { value: 'FULL_SERVICE', label: 'Full Service' },
  { value: 'HAND_WASH', label: 'Hand Wash' },
]

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface PackageForm {
  name: string
  priceBase: string
  priceSUV: string
  isMostPopular: boolean
  serviceIds: string[]
}

interface MembershipForm {
  name: string
  monthlyPrice: string
  packageLevel: string
  multiLocation: boolean
  description: string
}

interface AddOnForm {
  name: string
  price: string
  description: string
}

interface HoursForm {
  dayOfWeek: number
  openTime: string
  closeTime: string
  is24Hours: boolean
  isClosed: boolean
}

export default function CarWashDetailPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { translate: t } = useI18n()
  const router = useRouter()
  const { id } = router.query
  const isNew = id === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  // Service & Amenity catalogs
  const [serviceCatalog, setServiceCatalog] = useState<any[]>([])
  const [amenityCatalog, setAmenityCatalog] = useState<any[]>([])
  const [paymentCatalog, setPaymentCatalog] = useState<any[]>([])

  // Form state
  const [form, setForm] = useState({
    businessName: '',
    description: '',
    carWashTypes: [] as string[],
    address: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: '',
    longitude: '',
    phoneNumber: '',
    websiteUrl: '',
    logoUrl: '',
    isEcoFriendly: false,
    waterRecycling: false,
    acceptsLargeVehicles: true,
    maxVehicleHeight: '',
    numberOfTunnels: '0',
    numberOfBays: '0',
    accessInstructions: '',
    selectedAmenities: [] as string[],
    selectedPaymentMethods: [] as string[],
  })

  const [hours, setHours] = useState<HoursForm[]>(
    DAYS.map((_, i) => ({
      dayOfWeek: i,
      openTime: '07:00',
      closeTime: '20:00',
      is24Hours: false,
      isClosed: i === 0, // Sunday closed by default
    }))
  )

  const [packages, setPackages] = useState<PackageForm[]>([])
  const [memberships, setMemberships] = useState<MembershipForm[]>([])
  const [addOns, setAddOns] = useState<AddOnForm[]>([])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadCatalogs()
      if (!isNew && id) {
        loadCarWash()
      }
    }
  }, [isAuthenticated, id])

  async function loadCatalogs() {
    try {
      const [svcRes, amenRes, payRes] = await Promise.all([
        api.get('/car-wash/catalog/services'),
        api.get('/car-wash/catalog/amenities'),
        api.get('/car-wash/catalog/payment-methods'),
      ])
      setServiceCatalog(svcRes.data.data || [])
      setAmenityCatalog(amenRes.data.data || [])
      setPaymentCatalog(payRes.data.data || [])
    } catch (error) {
      console.error('Error loading catalogs:', error)
    }
  }

  async function loadCarWash() {
    try {
      const response = await api.get(`/car-wash/${id}`)
      const data = response.data.data
      setForm({
        businessName: data.businessName || '',
        description: data.description || '',
        carWashTypes: data.carWashTypes || [],
        address: data.address || '',
        addressLine2: data.addressLine2 || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        latitude: String(data.latitude || ''),
        longitude: String(data.longitude || ''),
        phoneNumber: data.phoneNumber || '',
        websiteUrl: data.websiteUrl || '',
        logoUrl: data.logoUrl || '',
        isEcoFriendly: data.isEcoFriendly || false,
        waterRecycling: data.waterRecycling || false,
        acceptsLargeVehicles: data.acceptsLargeVehicles ?? true,
        maxVehicleHeight: String(data.maxVehicleHeight || ''),
        numberOfTunnels: String(data.numberOfTunnels || 0),
        numberOfBays: String(data.numberOfBays || 0),
        accessInstructions: data.accessInstructions || '',
        selectedAmenities: (data.amenities || []).map((a: any) => a.amenity?.id || a.amenityId),
        selectedPaymentMethods: (data.paymentMethods || []).map((p: any) => p.paymentMethod?.id || p.paymentMethodId),
      })

      if (data.operatingHours?.length) {
        setHours(data.operatingHours.map((h: any) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime || '07:00',
          closeTime: h.closeTime || '20:00',
          is24Hours: h.is24Hours || false,
          isClosed: h.isClosed || false,
        })))
      }

      if (data.packages?.length) {
        setPackages(data.packages.map((p: any) => ({
          name: p.name,
          priceBase: String(p.priceBase),
          priceSUV: String(p.priceSUV || ''),
          isMostPopular: p.isMostPopular || false,
          serviceIds: (p.services || []).map((s: any) => s.serviceId),
        })))
      }

      if (data.membershipPlans?.length) {
        setMemberships(data.membershipPlans.map((m: any) => ({
          name: m.name,
          monthlyPrice: String(m.monthlyPrice),
          packageLevel: m.packageLevel || '',
          multiLocation: m.multiLocation || false,
          description: m.description || '',
        })))
      }

      if (data.addOnServices?.length) {
        setAddOns(data.addOnServices.map((a: any) => ({
          name: a.name,
          price: String(a.price),
          description: a.description || '',
        })))
      }
    } catch (error) {
      console.error('Error loading car wash:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        businessName: form.businessName,
        description: form.description,
        carWashTypes: form.carWashTypes,
        address: form.address,
        addressLine2: form.addressLine2 || undefined,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        latitude: parseFloat(form.latitude) || 0,
        longitude: parseFloat(form.longitude) || 0,
        phoneNumber: form.phoneNumber || undefined,
        websiteUrl: form.websiteUrl || undefined,
        logoUrl: form.logoUrl || undefined,
        isEcoFriendly: form.isEcoFriendly,
        waterRecycling: form.waterRecycling,
        acceptsLargeVehicles: form.acceptsLargeVehicles,
        maxVehicleHeight: form.maxVehicleHeight ? parseFloat(form.maxVehicleHeight) : undefined,
        numberOfTunnels: parseInt(form.numberOfTunnels) || 0,
        numberOfBays: parseInt(form.numberOfBays) || 0,
        accessInstructions: form.accessInstructions || undefined,
        amenityIds: form.selectedAmenities,
        paymentMethodIds: form.selectedPaymentMethods,
        operatingHours: hours,
        packages: packages.map((p, i) => ({
          name: p.name,
          priceBase: parseFloat(p.priceBase) || 0,
          priceSUV: p.priceSUV ? parseFloat(p.priceSUV) : undefined,
          sortOrder: i,
          isMostPopular: p.isMostPopular,
          serviceIds: p.serviceIds,
        })),
        membershipPlans: memberships.map((m, i) => ({
          name: m.name,
          monthlyPrice: parseFloat(m.monthlyPrice) || 0,
          packageLevel: m.packageLevel,
          multiLocation: m.multiLocation,
          description: m.description || undefined,
          sortOrder: i,
        })),
        addOns: addOns.map((a, i) => ({
          name: a.name,
          price: parseFloat(a.price) || 0,
          description: a.description || undefined,
          sortOrder: i,
        })),
      }

      if (isNew) {
        await api.post('/car-wash/provider', payload)
      } else {
        await api.put(`/car-wash/provider/${id}`, payload)
      }

      router.push('/car-wash')
    } catch (error: any) {
      console.error('Error saving car wash:', error)
      alert(error?.response?.data?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleWashType = (type: string) => {
    setForm((prev) => ({
      ...prev,
      carWashTypes: prev.carWashTypes.includes(type)
        ? prev.carWashTypes.filter((t) => t !== type)
        : [...prev.carWashTypes, type],
    }))
  }

  const toggleAmenity = (id: string) => {
    setForm((prev) => ({
      ...prev,
      selectedAmenities: prev.selectedAmenities.includes(id)
        ? prev.selectedAmenities.filter((a) => a !== id)
        : [...prev.selectedAmenities, id],
    }))
  }

  const togglePayment = (id: string) => {
    setForm((prev) => ({
      ...prev,
      selectedPaymentMethods: prev.selectedPaymentMethods.includes(id)
        ? prev.selectedPaymentMethods.filter((p) => p !== id)
        : [...prev.selectedPaymentMethods, id],
    }))
  }

  if (authLoading || !isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const tabs = [
    { key: 'info', label: 'Basic Info', icon: Droplets },
    { key: 'hours', label: 'Hours', icon: Clock },
    { key: 'packages', label: 'Packages', icon: DollarSign },
    { key: 'memberships', label: 'Memberships', icon: Star },
    { key: 'amenities', label: 'Amenities & Payments', icon: CheckCircle },
  ]

  return (
    <DashboardLayout title={isNew ? 'Register Car Wash' : 'Edit Car Wash'}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/car-wash" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew ? 'Register Car Wash' : `Edit: ${form.businessName}`}
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: Basic Info */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-xl border p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. AutoSpa Express"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your car wash..."
                />
              </div>

              {/* Wash Types */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Car Wash Types *</label>
                <div className="flex flex-wrap gap-2">
                  {WASH_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => toggleWashType(type.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                        form.carWashTypes.includes(type.value)
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="FL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                <input
                  type="text"
                  value={form.zipCode}
                  onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="text"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 25.7617"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="text"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. -80.1918"
                />
              </div>

              {/* Facility Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"># of Tunnels</label>
                <input
                  type="number"
                  value={form.numberOfTunnels}
                  onChange={(e) => setForm({ ...form, numberOfTunnels: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"># of Bays</label>
                <input
                  type="number"
                  value={form.numberOfBays}
                  onChange={(e) => setForm({ ...form, numberOfBays: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  min="0"
                />
              </div>

              {/* Checkboxes */}
              <div className="md:col-span-2 flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isEcoFriendly}
                    onChange={(e) => setForm({ ...form, isEcoFriendly: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Eco-Friendly</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.waterRecycling}
                    onChange={(e) => setForm({ ...form, waterRecycling: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Water Recycling</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.acceptsLargeVehicles}
                    onChange={(e) => setForm({ ...form, acceptsLargeVehicles: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Accepts Large Vehicles</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Hours */}
        {activeTab === 'hours' && (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h2>
            {hours.map((h, idx) => (
              <div key={idx} className="flex items-center gap-4 py-2 border-b last:border-0">
                <span className="w-24 font-medium text-gray-700 text-sm">{DAYS[h.dayOfWeek]}</span>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={h.isClosed}
                    onChange={() => {
                      const updated = [...hours]
                      updated[idx].isClosed = !updated[idx].isClosed
                      setHours(updated)
                    }}
                    className="w-3.5 h-3.5 text-red-500 rounded"
                  />
                  Closed
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={h.is24Hours}
                    disabled={h.isClosed}
                    onChange={() => {
                      const updated = [...hours]
                      updated[idx].is24Hours = !updated[idx].is24Hours
                      setHours(updated)
                    }}
                    className="w-3.5 h-3.5 text-blue-500 rounded"
                  />
                  24h
                </label>
                {!h.isClosed && !h.is24Hours && (
                  <>
                    <input
                      type="time"
                      value={h.openTime}
                      onChange={(e) => {
                        const updated = [...hours]
                        updated[idx].openTime = e.target.value
                        setHours(updated)
                      }}
                      className="border rounded px-2 py-1 text-sm"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="time"
                      value={h.closeTime}
                      onChange={(e) => {
                        const updated = [...hours]
                        updated[idx].closeTime = e.target.value
                        setHours(updated)
                      }}
                      className="border rounded px-2 py-1 text-sm"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB: Packages */}
        {activeTab === 'packages' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Wash Packages</h2>
              <button
                onClick={() => setPackages([...packages, { name: '', priceBase: '', priceSUV: '', isMostPopular: false, serviceIds: [] }])}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add Package
              </button>
            </div>

            {packages.map((pkg, pIdx) => (
              <div key={pIdx} className="bg-white rounded-xl border p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Package Name</label>
                      <input
                        type="text"
                        value={pkg.name}
                        onChange={(e) => { const u = [...packages]; u[pIdx].name = e.target.value; setPackages(u) }}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Premium Wash"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Base Price ($)</label>
                      <input
                        type="number"
                        value={pkg.priceBase}
                        onChange={(e) => { const u = [...packages]; u[pIdx].priceBase = e.target.value; setPackages(u) }}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">SUV/Truck Price ($)</label>
                      <input
                        type="number"
                        value={pkg.priceSUV}
                        onChange={(e) => { const u = [...packages]; u[pIdx].priceSUV = e.target.value; setPackages(u) }}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setPackages(packages.filter((_, i) => i !== pIdx))}
                    className="p-1.5 text-red-400 hover:text-red-600 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pkg.isMostPopular}
                    onChange={() => { const u = [...packages]; u[pIdx].isMostPopular = !u[pIdx].isMostPopular; setPackages(u) }}
                    className="w-3.5 h-3.5 text-blue-500 rounded"
                  />
                  Mark as Most Popular
                </label>

                {/* Services selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Included Services</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {serviceCatalog.map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => {
                          const u = [...packages]
                          const ids = u[pIdx].serviceIds
                          u[pIdx].serviceIds = ids.includes(svc.id)
                            ? ids.filter((s: string) => s !== svc.id)
                            : [...ids, svc.id]
                          setPackages(u)
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium border transition ${
                          pkg.serviceIds.includes(svc.id)
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : 'bg-white border-gray-200 text-gray-500'
                        }`}
                      >
                        {pkg.serviceIds.includes(svc.id) && '✓ '}{svc.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {packages.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">
                No packages yet. Add your first wash package to display pricing to customers.
              </p>
            )}

            {/* Add-ons section */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Add-On Services</h2>
                <button
                  onClick={() => setAddOns([...addOns, { name: '', price: '', description: '' }])}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Add Add-On
                </button>
              </div>
              {addOns.map((addon, aIdx) => (
                <div key={aIdx} className="bg-white rounded-xl border p-4 mb-3 flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={addon.name}
                      onChange={(e) => { const u = [...addOns]; u[aIdx].name = e.target.value; setAddOns(u) }}
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder="Service name"
                    />
                    <input
                      type="number"
                      value={addon.price}
                      onChange={(e) => { const u = [...addOns]; u[aIdx].price = e.target.value; setAddOns(u) }}
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder="Price"
                      min="0"
                    />
                    <input
                      type="text"
                      value={addon.description}
                      onChange={(e) => { const u = [...addOns]; u[aIdx].description = e.target.value; setAddOns(u) }}
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder="Description"
                    />
                  </div>
                  <button
                    onClick={() => setAddOns(addOns.filter((_, i) => i !== aIdx))}
                    className="p-1.5 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Memberships */}
        {activeTab === 'memberships' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Unlimited Membership Plans</h2>
              <button
                onClick={() => setMemberships([...memberships, { name: '', monthlyPrice: '', packageLevel: '', multiLocation: false, description: '' }])}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add Plan
              </button>
            </div>
            {memberships.map((plan, mIdx) => (
              <div key={mIdx} className="bg-white rounded-xl border p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Plan Name</label>
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => { const u = [...memberships]; u[mIdx].name = e.target.value; setMemberships(u) }}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Unlimited Basic"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Monthly Price ($)</label>
                      <input
                        type="number"
                        value={plan.monthlyPrice}
                        onChange={(e) => { const u = [...memberships]; u[mIdx].monthlyPrice = e.target.value; setMemberships(u) }}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        min="0" step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Package Level</label>
                      <input
                        type="text"
                        value={plan.packageLevel}
                        onChange={(e) => { const u = [...memberships]; u[mIdx].packageLevel = e.target.value; setMemberships(u) }}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Premium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                      <input
                        type="text"
                        value={plan.description}
                        onChange={(e) => { const u = [...memberships]; u[mIdx].description = e.target.value; setMemberships(u) }}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setMemberships(memberships.filter((_, i) => i !== mIdx))}
                    className="p-1.5 text-red-400 hover:text-red-600 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.multiLocation}
                    onChange={() => { const u = [...memberships]; u[mIdx].multiLocation = !u[mIdx].multiLocation; setMemberships(u) }}
                    className="w-3.5 h-3.5 text-purple-500 rounded"
                  />
                  Valid at all locations
                </label>
              </div>
            ))}
            {memberships.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">
                No membership plans yet. Add unlimited wash plans to attract recurring customers.
              </p>
            )}
          </div>
        )}

        {/* TAB: Amenities & Payments */}
        {activeTab === 'amenities' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Free Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {amenityCatalog.map((am) => (
                  <button
                    key={am.id}
                    onClick={() => toggleAmenity(am.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                      form.selectedAmenities.includes(am.id)
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {form.selectedAmenities.includes(am.id) && '✓ '}{am.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Accepted Payment Methods</h2>
              <div className="flex flex-wrap gap-2">
                {paymentCatalog.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => togglePayment(pm.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                      form.selectedPaymentMethods.includes(pm.id)
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {form.selectedPaymentMethods.includes(pm.id) && '✓ '}{pm.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

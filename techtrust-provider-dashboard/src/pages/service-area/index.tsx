'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/services/api'
import {
  MapPin,
  Loader2,
  CheckCircle,
  Save,
  Search,
  Car,
  Zap,
  DollarSign,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'

const RADIUS_OPTIONS_MILES = [5, 10, 15, 20, 25, 35, 50, 75, 100]
const MI_TO_KM = 1.60934

const FLORIDA_REGIONS: Record<string, string[]> = {
  'South Florida': ['Broward', 'Miami-Dade', 'Monroe', 'Palm Beach'],
  'Tampa Bay': ['Hernando', 'Hillsborough', 'Manatee', 'Pasco', 'Pinellas', 'Sarasota'],
  'Central Florida': ['Lake', 'Orange', 'Osceola', 'Polk', 'Seminole', 'Volusia'],
  'Northeast Florida': ['Baker', 'Clay', 'Duval', 'Flagler', 'Nassau', 'Putnam', 'St. Johns'],
  'Space & Treasure Coast': ['Brevard', 'Indian River', 'Martin', 'Okeechobee', 'St. Lucie'],
  'Southwest Florida': ['Charlotte', 'Collier', 'De Soto', 'Glades', 'Hardee', 'Hendry', 'Lee'],
  'North Central Florida': ['Alachua', 'Bradford', 'Citrus', 'Columbia', 'Dixie', 'Gilchrist', 'Lafayette', 'Levy', 'Marion', 'Sumter', 'Suwannee', 'Union'],
  'Panhandle West': ['Bay', 'Escambia', 'Okaloosa', 'Santa Rosa', 'Walton'],
  'Panhandle East': ['Calhoun', 'Franklin', 'Gadsden', 'Gulf', 'Hamilton', 'Holmes', 'Jackson', 'Jefferson', 'Leon', 'Liberty', 'Madison', 'Taylor', 'Wakulla', 'Washington'],
}

function kmToMiles(km: number) {
  return Math.round(km / MI_TO_KM)
}

function milesToKm(miles: number) {
  return Math.round(miles * MI_TO_KM)
}

export default function ServiceAreaPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [radiusMiles, setRadiusMiles] = useState(25)
  const [mobileService, setMobileService] = useState(false)
  const [roadsideAssistance, setRoadsideAssistance] = useState(false)
  const [freeKm, setFreeKm] = useState(0)
  const [extraFeePerKm, setExtraFeePerKm] = useState(0)
  const [travelChargeType, setTravelChargeType] = useState<'ONE_WAY' | 'ROUND_TRIP'>('ONE_WAY')
  const [serviceCounties, setServiceCounties] = useState<string[]>([])

  const [countySearch, setCountySearch] = useState('')
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({})
  const [showCountyPicker, setShowCountyPicker] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) loadProfile()
  }, [isAuthenticated])

  async function loadProfile() {
    setLoading(true)
    try {
      const res = await api.get('/providers/profile')
      const p = res.data || {}
      if (p.serviceRadiusKm) setRadiusMiles(kmToMiles(p.serviceRadiusKm))
      setMobileService(!!p.mobileService)
      setRoadsideAssistance(!!p.roadsideAssistance)
      setFreeKm(Number(p.freeKm) || 0)
      setExtraFeePerKm(Number(p.extraFeePerKm) || 0)
      setTravelChargeType(p.travelChargeType === 'ROUND_TRIP' ? 'ROUND_TRIP' : 'ONE_WAY')
      setServiceCounties(Array.isArray(p.serviceCounties) ? p.serviceCounties : [])
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.patch('/providers/profile', {
        serviceRadiusKm: milesToKm(radiusMiles),
        mobileService,
        roadsideAssistance,
        freeKm,
        extraFeePerKm,
        travelChargeType,
        serviceCounties,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // silent fail
    } finally {
      setSaving(false)
    }
  }

  function toggleCounty(county: string) {
    setServiceCounties(prev =>
      prev.includes(county) ? prev.filter(c => c !== county) : [...prev, county]
    )
  }

  function toggleRegion(region: string, counties: string[]) {
    const allSelected = counties.every(c => serviceCounties.includes(c))
    if (allSelected) {
      setServiceCounties(prev => prev.filter(c => !counties.includes(c)))
    } else {
      setServiceCounties(prev => Array.from(new Set([...prev, ...counties])))
    }
  }

  function toggleRegionExpand(region: string) {
    setExpandedRegions(prev => ({ ...prev, [region]: !prev[region] }))
  }

  const filteredRegions = Object.entries(FLORIDA_REGIONS).reduce<Record<string, string[]>>((acc, [region, counties]) => {
    if (!countySearch) {
      acc[region] = counties
    } else {
      const filtered = counties.filter(c => c.toLowerCase().includes(countySearch.toLowerCase()))
      if (filtered.length > 0) acc[region] = filtered
    }
    return acc
  }, {})

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <DashboardLayout title="Service Area">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

        {/* Service Radius */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Service Radius</h2>
              <p className="text-sm text-gray-500">How far will you travel to customers?</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {RADIUS_OPTIONS_MILES.map(miles => (
                  <button
                    key={miles}
                    onClick={() => setRadiusMiles(miles)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      radiusMiles === miles
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {miles} mi
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                Selected: <span className="font-medium text-gray-900">{radiusMiles} miles</span>
                <span className="text-gray-400"> (~{milesToKm(radiusMiles)} km)</span>
              </p>
            </>
          )}
        </div>

        {/* Mobile Service */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Car className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Mobile / On-Site Services</h2>
              <p className="text-sm text-gray-500">Configure travel options for on-site jobs</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">Mobile / On-Site Service</p>
                <p className="text-sm text-gray-500">You travel to the customer's location</p>
              </div>
              <button
                onClick={() => setMobileService(!mobileService)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mobileService ? 'bg-primary-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mobileService ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">Roadside Assistance (SOS)</p>
                <p className="text-sm text-gray-500">Accept emergency roadside calls</p>
              </div>
              <button
                onClick={() => setRoadsideAssistance(!roadsideAssistance)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${roadsideAssistance ? 'bg-red-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${roadsideAssistance ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Travel Fee */}
        {mobileService && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Travel Fee</h2>
                <p className="text-sm text-gray-500">Charge customers for your travel time</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Free Miles</label>
                <input
                  type="number"
                  value={freeKm > 0 ? Math.round(freeKm / MI_TO_KM) : ''}
                  onChange={e => setFreeKm(e.target.value ? milesToKm(Number(e.target.value)) : 0)}
                  className="input"
                  placeholder="0"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-gray-400 mt-1">Miles included at no charge</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fee per Mile ($)</label>
                <input
                  type="number"
                  value={extraFeePerKm > 0 ? (extraFeePerKm * MI_TO_KM).toFixed(2) : ''}
                  onChange={e => setExtraFeePerKm(e.target.value ? Number(e.target.value) / MI_TO_KM : 0)}
                  className="input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-400 mt-1">Per mile beyond free miles</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Travel Type</label>
              <div className="flex gap-3">
                {(['ONE_WAY', 'ROUND_TRIP'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setTravelChargeType(type)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                      travelChargeType === type
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {type === 'ONE_WAY' ? 'One Way' : 'Round Trip'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Florida County Coverage */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Florida County Coverage</h2>
                <p className="text-sm text-gray-500">
                  {serviceCounties.length === 0 ? 'No counties selected' : `${serviceCounties.length} county selected`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCountyPicker(!showCountyPicker)}
              className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors flex items-center gap-1.5"
            >
              {showCountyPicker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showCountyPicker ? 'Hide' : 'Select Counties'}
            </button>
          </div>

          {/* Selected county pills */}
          {serviceCounties.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {serviceCounties.map(county => (
                <span
                  key={county}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                >
                  {county}
                  <button onClick={() => toggleCounty(county)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {showCountyPicker && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Search */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={countySearch}
                    onChange={e => setCountySearch(e.target.value)}
                    placeholder="Search county..."
                    className="input !pl-9 !py-2 text-sm"
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {Object.entries(filteredRegions).map(([region, counties]) => {
                  const allSelected = counties.every(c => serviceCounties.includes(c))
                  const someSelected = counties.some(c => serviceCounties.includes(c))
                  const isExpanded = expandedRegions[region] ?? !!countySearch

                  return (
                    <div key={region} className="border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3 p-3 bg-gray-50">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                          onChange={() => toggleRegion(region, counties)}
                          className="w-4 h-4 rounded accent-primary-500"
                        />
                        <button
                          className="flex-1 flex items-center justify-between text-left"
                          onClick={() => toggleRegionExpand(region)}
                        >
                          <span className="text-sm font-semibold text-gray-900">{region}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{counties.filter(c => serviceCounties.includes(c)).length}/{counties.length}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-0">
                          {counties.map(county => (
                            <label
                              key={county}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={serviceCounties.includes(county)}
                                onChange={() => toggleCounty(county)}
                                className="w-4 h-4 rounded accent-primary-500"
                              />
                              <span className="text-sm text-gray-700">{county}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary flex items-center gap-2 min-w-[140px] justify-center"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

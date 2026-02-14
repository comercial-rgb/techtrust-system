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
  Download,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Car,
  User,
  Shield,
  Wrench,
  Calendar,
  Save,
} from 'lucide-react'
import Link from 'next/link'

export default function FaturaDetalhePage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { translate: t } = useI18n()
  const router = useRouter()
  const { id } = router.query

  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<any>(null)
  const [servicePerformed, setServicePerformed] = useState('')
  const [warrantyStatement, setWarrantyStatement] = useState('')
  const [odometerReading, setOdometerReading] = useState('')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && id) loadInvoice()
  }, [isAuthenticated, id])

  async function loadInvoice() {
    setLoading(true)
    try {
      const res = await api.get(`/repair-invoices/${id}`)
      const inv = res.data.data.invoice
      setInvoice(inv)
      setServicePerformed(inv.servicePerformed || '')
      setWarrantyStatement(inv.warrantyStatement || '')
      setOdometerReading(inv.odometerReading?.toString() || '')
    } catch (error) {
      console.error('Error loading invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.patch(`/repair-invoices/${id}/update-work`, {
        servicePerformed,
        warrantyStatement,
        odometerReading: odometerReading ? parseInt(odometerReading) : undefined,
      })
      await loadInvoice()
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    if (!confirm(t('invoices.confirmComplete'))) return
    setCompleting(true)
    try {
      await api.patch(`/repair-invoices/${id}/complete`, {
        servicePerformed,
        warrantyStatement,
      })
      await loadInvoice()
    } catch (error) {
      console.error('Error completing:', error)
    } finally {
      setCompleting(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      DRAFT: { label: t('invoices.status.draft'), color: 'bg-gray-100 text-gray-700', icon: <FileText className="w-5 h-5" /> },
      IN_PROGRESS: { label: t('common.status.inProgress'), color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-5 h-5" /> },
      COMPLETED: { label: t('common.status.completed'), color: 'bg-yellow-100 text-yellow-700', icon: <CheckCircle className="w-5 h-5" /> },
      APPROVED: { label: t('invoices.status.approved'), color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-5 h-5" /> },
      DISPUTED: { label: t('common.status.disputed'), color: 'bg-red-100 text-red-700', icon: <XCircle className="w-5 h-5" /> },
    }
    return statuses[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: <Clock className="w-5 h-5" /> }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (loading) {
    return (
      <DashboardLayout title={t('invoices.detail')}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </DashboardLayout>
    )
  }

  if (!invoice) {
    return (
      <DashboardLayout title={t('invoices.detail')}>
        <div className="text-center py-20">
          <p className="text-gray-500">{t('invoices.notFound')}</p>
          <Link href="/faturas" className="text-primary-600 hover:underline mt-4 inline-block">
            {t('common.back')}
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const statusInfo = getStatusInfo(invoice.status)
  const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : []
  const canEdit = ['DRAFT', 'IN_PROGRESS'].includes(invoice.status)

  return (
    <DashboardLayout title={`${t('invoices.detail')} - ${invoice.invoiceNumber}`}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/faturas" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            {t('common.back')}
          </Link>
          <div className="flex items-center gap-3">
            {invoice.pdfUrl && (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('invoices.downloadPdf')}
              </a>
            )}
            <span className={`badge text-sm px-3 py-1 ${statusInfo.color}`}>
              {statusInfo.icon}
              <span className="ml-1">{statusInfo.label}</span>
            </span>
          </div>
        </div>

        {/* Invoice info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer */}
          <div className="bg-white rounded-xl p-5 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold text-gray-900">{t('invoices.customer')}</h3>
            </div>
            <p className="text-sm text-gray-700">{invoice.customerName}</p>
            {invoice.customerContact && (
              <p className="text-sm text-gray-500">{invoice.customerContact}</p>
            )}
          </div>

          {/* Vehicle */}
          <div className="bg-white rounded-xl p-5 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold text-gray-900">{t('invoices.vehicle')}</h3>
            </div>
            <p className="text-sm text-gray-700">{invoice.vehicleInfo}</p>
            {invoice.odometerReading && (
              <p className="text-sm text-gray-500">{t('invoices.odometer')}: {invoice.odometerReading.toLocaleString()} mi</p>
            )}
          </div>

          {/* FDACS */}
          <div className="bg-white rounded-xl p-5 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold text-gray-900">FDACS</h3>
            </div>
            <p className="text-sm text-gray-700">
              {t('invoices.registrationNumber')}: {invoice.fdacsRegistrationNumber || 'N/A'}
            </p>
            <p className="text-sm text-gray-500">
              {t('invoices.quoteRef')}: {invoice.quote?.quoteNumber || '-'}
            </p>
            <p className="text-sm text-gray-500">
              {t('invoices.workOrderRef')}: {invoice.workOrder?.orderNumber || '-'}
            </p>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl shadow-soft overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{t('invoices.lineItems')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">Condition</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase px-5 py-3">Qty</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">Unit Price</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((item: any, idx: number) => {
                  const qty = Number(item.quantity) || 1
                  const price = Number(item.unitPrice || item.partsCost || 0)
                  const total = qty * price
                  return (
                    <tr key={idx}>
                      <td className="px-5 py-3 text-sm">
                        <span className={`badge ${item.type === 'LABOR' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {item.type || 'PART'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">
                        {item.description}
                        {item.isNoCharge && <span className="ml-2 text-xs text-green-600">(No Charge)</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{item.partCondition || '-'}</td>
                      <td className="px-5 py-3 text-sm text-center">{qty}</td>
                      <td className="px-5 py-3 text-sm text-right">${price.toFixed(2)}</td>
                      <td className="px-5 py-3 text-sm text-right font-medium">${total.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl p-5 shadow-soft">
          <h3 className="font-semibold text-gray-900 mb-4">{t('invoices.totals')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">{t('invoices.parts')}</p>
              <p className="text-lg font-semibold">${Number(invoice.finalPartsCost).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('invoices.labor')}</p>
              <p className="text-lg font-semibold">${Number(invoice.finalLaborCost).toFixed(2)}</p>
            </div>
            {Number(invoice.supplementsTotal) > 0 && (
              <div>
                <p className="text-sm text-gray-500">Supplements</p>
                <p className="text-lg font-semibold text-blue-600">+${Number(invoice.supplementsTotal).toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">{t('invoices.finalTotal')}</p>
              <p className="text-2xl font-bold text-primary-600">${Number(invoice.finalTotal).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Service performed & warranty (editable) */}
        {canEdit && (
          <div className="bg-white rounded-xl p-5 shadow-soft space-y-4">
            <h3 className="font-semibold text-gray-900">{t('invoices.updateWork')}</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('invoices.servicePerformed')} *
              </label>
              <textarea
                value={servicePerformed}
                onChange={(e) => setServicePerformed(e.target.value)}
                rows={4}
                className="input"
                placeholder={t('invoices.servicePerformedPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('invoices.warrantyStatement')}
              </label>
              <textarea
                value={warrantyStatement}
                onChange={(e) => setWarrantyStatement(e.target.value)}
                rows={2}
                className="input"
                placeholder={t('invoices.warrantyPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('invoices.odometer')}
              </label>
              <input
                type="number"
                value={odometerReading}
                onChange={(e) => setOdometerReading(e.target.value)}
                className="input w-48"
                placeholder="e.g. 45000"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-outline flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('common.save')}
              </button>
              <button
                onClick={handleComplete}
                disabled={completing || !servicePerformed}
                className="btn btn-primary flex items-center gap-2"
              >
                {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {t('invoices.markComplete')}
              </button>
            </div>
          </div>
        )}

        {/* Read-only service performed */}
        {!canEdit && invoice.servicePerformed && (
          <div className="bg-white rounded-xl p-5 shadow-soft">
            <h3 className="font-semibold text-gray-900 mb-2">{t('invoices.servicePerformed')}</h3>
            <p className="text-sm text-gray-700">{invoice.servicePerformed}</p>
          </div>
        )}

        {/* Warranty */}
        {(invoice.warrantyStatement || invoice.warrantyMonths || invoice.warrantyMileage) && !canEdit && (
          <div className="bg-white rounded-xl p-5 shadow-soft">
            <h3 className="font-semibold text-gray-900 mb-2">{t('invoices.warranty')}</h3>
            {invoice.warrantyStatement && <p className="text-sm text-gray-700 mb-1">{invoice.warrantyStatement}</p>}
            <div className="flex gap-4 text-sm text-gray-500">
              {invoice.warrantyMonths && <span>{invoice.warrantyMonths} months</span>}
              {invoice.warrantyMileage && <span>{invoice.warrantyMileage.toLocaleString()} miles</span>}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

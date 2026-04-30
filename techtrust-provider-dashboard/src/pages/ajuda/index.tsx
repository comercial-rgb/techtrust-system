'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Rocket,
  FileText,
  DollarSign,
  ClipboardList,
  Star,
  Settings,
  Gavel,
  MessageCircle,
  Mail,
  Phone,
  BookOpen,
  Video,
  Lightbulb,
  Shield,
  Scale,
  FileCheck,
  X,
} from 'lucide-react'

interface FAQItem {
  id: string
  category: string
  question: string
  answer: string
}

interface HelpCategory {
  id: string
  title: string
  icon: React.ReactNode
  color: string
  bg: string
}

const CATEGORIES: HelpCategory[] = [
  { id: 'Getting Started', title: 'Getting Started', icon: <Rocket className="w-5 h-5" />, color: '#2B5EA7', bg: '#dbeafe' },
  { id: 'Quotes',          title: 'Quotes',          icon: <FileText className="w-5 h-5" />, color: '#16a34a', bg: '#dcfce7' },
  { id: 'Payments',        title: 'Payments',        icon: <DollarSign className="w-5 h-5" />, color: '#d97706', bg: '#fef3c7' },
  { id: 'Work Orders',     title: 'Work Orders',     icon: <ClipboardList className="w-5 h-5" />, color: '#8b5cf6', bg: '#ede9fe' },
  { id: 'Reviews',         title: 'Reviews',         icon: <Star className="w-5 h-5" />, color: '#ec4899', bg: '#fce7f3' },
  { id: 'Settings',        title: 'Settings',        icon: <Settings className="w-5 h-5" />, color: '#6b7280', bg: '#f3f4f6' },
  { id: 'FL Compliance',   title: 'FL Compliance',   icon: <Gavel className="w-5 h-5" />, color: '#dc2626', bg: '#fee2e2' },
]

const FAQ_ITEMS: FAQItem[] = [
  { id: 'gs1', category: 'Getting Started', question: 'How do I set up my business profile?', answer: 'Go to Settings → Profile tab. Fill in your business name, address, phone, and description. Make sure your service radius is correct — this determines which customer requests you see. Save before switching tabs.' },
  { id: 'gs2', category: 'Getting Started', question: 'How does the verification process work?', answer: 'After completing your profile and uploading your business license and insurance documents (Compliance section), our team reviews your application within 1–2 business days. Once approved, you receive a "Verified Business" badge visible to customers.' },
  { id: 'gs3', category: 'Getting Started', question: 'When will I start receiving service requests?', answer: "You start receiving matching requests as soon as your profile is saved with a valid service radius and at least one service type selected. Requests appear under Requests in the menu. You don't need to be verified to receive requests, but verified providers are ranked higher." },
  { id: 'gs4', category: 'Getting Started', question: 'How do I enable mobile / on-site service?', answer: 'Go to Service Area from the sidebar menu and toggle "Mobile / On-Site Service" on. You can then set your free travel miles and the fee per mile. Customers near your area will see you as available for on-site visits.' },
  { id: 'q1',  category: 'Quotes', question: 'How do I create a quote for a customer?', answer: "Open the customer's service request, click on it to view details, then create a quote with your parts and labor line items. Submit and the customer is notified immediately." },
  { id: 'q2',  category: 'Quotes', question: 'Can I edit a quote after sending it?', answer: 'Yes, as long as the customer has not yet accepted. Once a customer accepts, the quote is locked — any scope change requires a new quote.' },
  { id: 'q3',  category: 'Quotes', question: 'What happens if my quote is rejected?', answer: "Rejected quotes are moved to Closed status. You can review the customer's request and submit a revised quote. Check your pricing — customers often reject if they feel the price is too high or the description is unclear." },
  { id: 'p1',  category: 'Payments', question: 'When do I receive payment?', answer: 'Payouts are processed within 3–5 business days after the customer approves the completed service. The platform fee is deducted automatically. Configure your payout method in Settings → Payout.' },
  { id: 'p2',  category: 'Payments', question: 'What is the platform fee?', answer: 'TechTrust charges a 10% platform fee per completed service. This covers payment processing, customer acquisition, the platform, customer support, and fraud protection. The fee is deducted before your payout.' },
  { id: 'p3',  category: 'Payments', question: 'Do I need to collect sales tax from customers?', answer: 'No. TechTrust operates as a Marketplace Facilitator under Florida law and handles all applicable sales tax collection and remittance. Do not add sales tax to your quote price.' },
  { id: 'p4',  category: 'Payments', question: 'Will I receive a 1099 form?', answer: 'Yes. TechTrust will issue a 1099-NEC for annual earnings over $600 as required by the IRS. As an independent contractor, you are responsible for reporting income and paying quarterly estimated taxes.' },
  { id: 'wo1', category: 'Work Orders', question: 'How do I complete a work order?', answer: 'When the job is done, open the work order and mark it as complete. Add at least 3 photos documenting the finished work (required when the customer is not present). The customer is notified and has the opportunity to approve and rate the service.' },
  { id: 'wo2', category: 'Work Orders', question: 'What if a customer cancels after I started the job?', answer: 'Report the work already completed in the app. TechTrust will review documented evidence (photos, time logs) and may compensate you for work performed. Always photograph the vehicle condition before starting.' },
  { id: 'r1',  category: 'Reviews', question: 'How does the rating system work?', answer: 'After each completed service, the customer can rate 1–5 stars and leave a comment. Your average rating is shown on your profile and in search results. Providers below 3.5 stars for 30+ consecutive days may be placed under review.' },
  { id: 'r2',  category: 'Reviews', question: 'Can I respond to a review?', answer: "Yes, you can reply to customer reviews from the Reviews page. Keep responses professional — potential customers read them too. Contact support if you receive a review you believe is fraudulent." },
  { id: 's1',  category: 'Settings', question: 'How do I update my payout method?', answer: 'Go to Settings → Payout tab. Select your preferred method: Zelle, Bank Transfer, or Manual. Save changes — your next payout will use the updated method.' },
  { id: 's2',  category: 'Settings', question: 'How do I update my business hours?', answer: 'Go to Settings → Hours tab. Toggle each day open or closed and set opening/closing times. Save when done. Customers see these hours on your profile.' },
  { id: 's3',  category: 'Settings', question: 'How do I change my service area?', answer: 'Go to Service Area from the main sidebar. Adjust your radius with the chips, and use the county picker to declare coverage beyond your radius. Changes take effect immediately after saving.' },
  { id: 'fl1', category: 'FL Compliance', question: 'What is required for FDACS motor vehicle repair registration?', answer: 'Florida Statute 559.901–559.9221 requires all motor vehicle repair shops to register with FDACS. You need: (1) MV Registration Number (MV-XXXXX), (2) Proof of business location, (3) Garage liability insurance, (4) Surety bond ($10,000 min). Registration renews annually. Register at fdacs.gov.' },
  { id: 'fl2', category: 'FL Compliance', question: 'What documents must I give customers before starting work?', answer: 'Florida law requires: (1) Written repair estimate signed by the customer before starting, (2) Written authorization for repairs exceeding the estimate by more than 10% or $50, (3) Itemized invoice listing parts and labor, (4) Return of replaced parts if requested.' },
  { id: 'fl3', category: 'FL Compliance', question: 'What insurance does my shop need in Florida?', answer: "At minimum: (1) General Liability, (2) Garage Liability — covers damage to customer vehicles in your care, (3) Garagekeepers coverage for vehicles stored overnight, (4) Workers' Comp if you have 4+ employees. Upload proof in the Compliance section." },
  { id: 'fl4', category: 'FL Compliance', question: 'How do I handle unclaimed vehicles in Florida?', answer: "Under FL Statute 713.78: (1) Wait 30+ days after service completion, (2) Send a certified letter to the registered owner, (3) File a mechanic's lien with the county clerk, (4) Apply for a title via FL DHSMV. Document all communication attempts." },
]

const COMPLIANCE_DOCS = [
  { icon: <FileCheck className="w-5 h-5" />, title: 'FDACS Registration Guide', subtitle: 'Step-by-step registration process' },
  { icon: <Shield className="w-5 h-5" />, title: 'FL Repair Shop Requirements', subtitle: 'Insurance, bonding & licensing' },
  { icon: <FileText className="w-5 h-5" />, title: 'Customer Rights Disclosure', subtitle: 'Required disclosures template' },
  { icon: <Scale className="w-5 h-5" />, title: 'Dispute Resolution Process', subtitle: 'FDACS mediation & complaints' },
]

export default function AjudaPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, router])

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  const filteredFAQs = FAQ_ITEMS.filter(item => {
    const matchesSearch = !searchQuery ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !activeCategory || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <DashboardLayout title="Help Center">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search help articles..."
            className="input !pl-12"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Categories</h2>
            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Show all
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(prev => prev === cat.id ? null : cat.id); setSearchQuery('') }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all text-center ${isActive ? 'ring-2' : 'hover:bg-gray-50'}`}
                  style={isActive ? { outline: `2px solid ${cat.color}` } : {}}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: cat.bg, color: cat.color }}
                  >
                    {cat.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-700 leading-tight">{cat.title}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <h2 className="font-semibold text-gray-900 mb-4">
            {activeCategory ? activeCategory : 'Frequently Asked Questions'}
            <span className="ml-2 text-sm font-normal text-gray-400">({filteredFAQs.length})</span>
          </h2>

          {filteredFAQs.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No results found. Try a different search or category.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFAQs.map(item => (
                <div key={item.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
                  >
                    <div className="flex-1">
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded mb-2">
                        {item.category}
                      </span>
                      <p className="font-medium text-gray-900 text-sm">{item.question}</p>
                    </div>
                    {expandedFAQ === item.id
                      ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    }
                  </button>
                  {expandedFAQ === item.id && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Florida Compliance Resources */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Gavel className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Florida Compliance</h2>
              <p className="text-xs text-gray-500">FDACS requirements & regulations</p>
            </div>
          </div>
          <div className="space-y-2">
            {COMPLIANCE_DOCS.map((doc, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-red-600 shadow-sm flex-shrink-0">
                  {doc.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                  <p className="text-xs text-gray-500">{doc.subtitle}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <h2 className="font-semibold text-gray-900 mb-4">Need more help?</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Chat with Support</p>
                <p className="text-sm text-gray-500">Response in up to 5 minutes</p>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-400 -rotate-90" />
            </div>

            <a
              href="mailto:support@techtrustautosolutions.com"
              className="flex items-center gap-4 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Send Email</p>
                <p className="text-sm text-gray-500">support@techtrustautosolutions.com</p>
              </div>
            </a>

            <a
              href="tel:+17869197605"
              className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Call</p>
                <p className="text-sm text-gray-500">(786) 919-7605</p>
              </div>
            </a>
          </div>
        </div>

        {/* Resources */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <h2 className="font-semibold text-gray-900 mb-4">Resources</h2>
          <div className="divide-y divide-gray-100">
            {[
              { icon: <BookOpen className="w-5 h-5 text-primary-600" />, title: 'Provider Guide', subtitle: 'Learn everything about the platform' },
              { icon: <Video className="w-5 h-5 text-primary-600" />, title: 'Video Tutorials', subtitle: 'Watch video demonstrations' },
              { icon: <Lightbulb className="w-5 h-5 text-primary-600" />, title: 'Success Tips', subtitle: 'How to increase your earnings' },
            ].map((res, i) => (
              <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  {res.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{res.title}</p>
                  <p className="text-xs text-gray-500">{res.subtitle}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, FileText, Shield, Scale, Percent } from 'lucide-react'

type TabType = 'terms' | 'privacy' | 'contract' | 'fees'

const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'terms',    label: 'Terms of Use', icon: <FileText className="w-4 h-4" /> },
  { key: 'privacy',  label: 'Privacy',       icon: <Shield className="w-4 h-4" /> },
  { key: 'contract', label: 'Contract',      icon: <Scale className="w-4 h-4" /> },
  { key: 'fees',     label: 'Fees',          icon: <Percent className="w-4 h-4" /> },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 ml-2">
      {items.map((item, i) => <li key={i} className="flex gap-2"><span className="text-gray-400 flex-shrink-0">•</span><span>{item}</span></li>)}
    </ul>
  )
}

const CONTENT: Record<TabType, React.ReactNode> = {
  terms: (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Terms of Use – Providers</h2>
      <p className="text-sm text-gray-400 mt-1 mb-4">Last updated: February 2026</p>

      <Section title="1. Registration and Eligibility">
        <p>To register as a service provider on the TechTrust platform, you must:</p>
        <Bullets items={['Be at least 18 years old', 'Have an active business registration', 'Have proven experience in the automotive field', 'Accept all terms of this platform']} />
      </Section>

      <Section title="2. Provider Obligations">
        <p>The provider commits to:</p>
        <Bullets items={['Provide quality services', 'Meet agreed deadlines', 'Use parts with guaranteed origin', 'Maintain clear communication with the customer', 'Issue invoice when requested', 'Respond to requests in a timely manner', 'Document service with photos (minimum 3 when customer is absent)']} />
      </Section>

      <Section title="3. Service Quality">
        <p>TechTrust values excellence. Providers who maintain a rating below 3.5 stars for more than 30 consecutive days may have their accounts suspended for review.</p>
      </Section>

      <Section title="4. Cancellations">
        <p>Frequent cancellations negatively affect your reputation. High cancellation rates may result in penalties or suspension.</p>
        <p>When a customer requests cancellation after service has started, you will be asked to validate the request and report work already completed. You may be compensated for documented work performed.</p>
      </Section>

      <Section title="5. Independent Contractor Status">
        <p>You are an independent contractor, not an employee of TechTrust AutoSolutions LLC. You are responsible for your own taxes, insurance, business licenses, and compliance with all applicable federal, state, and local laws. TechTrust does not withhold taxes from your earnings.</p>
      </Section>

      <Section title="6. Dispute Resolution & Arbitration">
        <p>Any disputes arising from this agreement shall be resolved through binding arbitration administered by the American Arbitration Association (AAA) in the State of Florida. <strong>YOU WAIVE YOUR RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN CLASS ACTIONS OR CLASS ARBITRATIONS.</strong></p>
      </Section>

      <Section title="7. Governing Law">
        <p>These terms are governed by the laws of the State of Florida. Any non-arbitrable legal action shall be brought exclusively in courts located in Florida.</p>
      </Section>
    </div>
  ),

  privacy: (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Privacy Policy</h2>
      <p className="text-sm text-gray-400 mt-1 mb-4">Last updated: February 2026</p>

      <Section title="1. Data Collected">
        <p>We collect the following information from providers:</p>
        <Bullets items={['Personal and business data', 'Tax ID and documentation', 'Address and service area', 'Banking details for payments', 'Service history', 'Ratings and feedback received']} />
      </Section>

      <Section title="2. Use of Data">
        <p>Your data is used to:</p>
        <Bullets items={['Connect you to customers', 'Process payments', 'Improve our services', 'Platform communications', 'Legal obligations compliance']} />
      </Section>

      <Section title="3. Data Protection">
        <p>We use encryption and advanced security measures to protect all information. Your banking data is stored with the highest security standards.</p>
      </Section>

      <Section title="4. Data Compliance">
        <p>We comply with applicable data protection laws, including the California Consumer Privacy Act (CCPA/CPRA) and Florida's Information Protection Act. You may request access, correction, or deletion of your data at any time through <a href="mailto:privacy@techtrust.com" className="text-primary-600 hover:underline">privacy@techtrust.com</a>.</p>
      </Section>

      <Section title="5. Data Breach Notification">
        <p>In the event of a data breach affecting your personal information, we will notify you as required by applicable federal and state law, including Florida Statutes § 501.171.</p>
      </Section>
    </div>
  ),

  contract: (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Partnership Contract</h2>
      <p className="text-sm text-gray-400 mt-1 mb-4">Last updated: February 2026</p>

      <Section title="1. Contract Object">
        <p>This contract establishes the terms of the partnership between the automotive service provider and the TechTrust platform for service intermediation.</p>
      </Section>

      <Section title="2. Responsibilities">
        <p>TechTrust acts as an intermediary, connecting providers to customers. Service execution is the sole responsibility of the provider, including warranties and post-service support.</p>
      </Section>

      <Section title="3. Exclusivity">
        <p>There is no exclusivity clause. You can work on other platforms or independently. However, services started through TechTrust must be completed through the platform.</p>
      </Section>

      <Section title="4. Termination">
        <p>Both parties can end the partnership at any time. Pending payments will be processed normally. TechTrust may suspend accounts for violation of terms.</p>
      </Section>

      <Section title="5. Intellectual Property">
        <p>Use of the TechTrust brand is only permitted for partnership disclosure, according to provided guidelines. Marketing materials must be pre-approved.</p>
      </Section>

      <Section title="6. Tax Obligations">
        <p>As an independent contractor, you are responsible for reporting and paying all applicable federal, state, and local taxes on your earnings. TechTrust will issue a 1099-NEC form for earnings over $600 in a calendar year, as required by IRS regulations. You are responsible for estimated quarterly tax payments.</p>
      </Section>

      <Section title="7. Insurance Requirements">
        <p>You are responsible for maintaining appropriate business insurance, including general liability insurance. TechTrust does not provide insurance coverage for services performed through the platform. Proof of insurance may be requested at any time.</p>
      </Section>

      <Section title="8. Governing Law">
        <p>This contract is governed by the laws of the State of Florida. TechTrust AutoSolutions LLC is registered in the State of Florida.</p>
      </Section>
    </div>
  ),

  fees: (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Fee Policy</h2>
      <p className="text-sm text-gray-400 mt-1 mb-4">Last updated: February 2026</p>

      {/* Big fee card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col items-center mb-6">
        <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
          <Percent className="w-5 h-5" />
          Service Fee
        </div>
        <p className="text-6xl font-bold text-blue-700 leading-none">10%</p>
        <p className="text-blue-600 text-sm mt-2">Of the total service value</p>
      </div>

      <Section title="1. How It Works">
        <p>TechTrust charges a flat 10% platform fee on the total value of each completed service. This fee is automatically deducted when the customer approves the completed service and payment is captured. The processing fee (Stripe: 2.9% + $0.30) is paid by the customer, not the provider.</p>
      </Section>

      <Section title="2. What's Included">
        <Bullets items={["Platform and app access", "Online payment system", "24/7 customer support", "Marketing and customer acquisition", "Rating system", "Fraud protection", "Pre-authorization payment security", "Dispute mediation support"]} />
      </Section>

      <Section title="3. Payouts">
        <p>Payouts are processed within 3–5 business days after service completion and customer approval. Payment is sent via your selected payout method: Zelle, bank transfer (ACH), or manual arrangement — configure your preference in Settings → Payout.</p>
      </Section>

      <Section title="4. Payment Example">
        <div className="mt-3 bg-white border border-gray-200 rounded-xl overflow-hidden">
          {[
            { label: 'Service quoted', value: '$200.00', valueClass: 'text-gray-900' },
            { label: 'Platform fee (10%)', value: '-$20.00', valueClass: 'text-red-600' },
            { label: 'You receive', value: '$180.00', valueClass: 'text-green-600 font-bold' },
          ].map((row, i) => (
            <div key={i} className={`flex justify-between px-4 py-3 ${i < 2 ? 'border-b border-gray-100' : ''} ${i === 2 ? 'bg-green-50' : ''}`}>
              <span className={`text-sm ${i === 2 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{row.label}</span>
              <span className={`text-sm ${row.valueClass}`}>{row.value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 italic">The customer pays any applicable processing fee separately; it does not affect your net earnings.</p>
      </Section>

      <Section title="5. Tax Reporting">
        <p>TechTrust will issue a 1099-NEC form for annual earnings exceeding $600, as required by the IRS. It is your responsibility to report all income and pay applicable taxes.</p>
      </Section>
    </div>
  ),
}

export default function TermosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('terms')

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

  return (
    <DashboardLayout title="Terms & Policies">
      <div className="max-w-3xl mx-auto animate-fade-in">

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          {CONTENT[activeTab]}
        </div>
      </div>
    </DashboardLayout>
  )
}

/**
 * ProviderHelpScreen - Central de Ajuda
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface HelpCategory {
  id: string;
  title: string;
  icon: string;
  color: string;
  backgroundColor: string;
}

export default function ProviderHelpScreen({ navigation }: any) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const CATEGORY_KEYS = {
    GETTING_STARTED: 'Getting Started',
    QUOTES: t.nav?.quotes || 'Quotes',
    PAYMENTS: t.common?.payments || 'Payments',
    WORK_ORDERS: t.nav?.workOrders || 'Work Orders',
    REVIEWS: t.reviews?.reviews || 'Reviews',
    SETTINGS: t.nav?.settings || 'Settings',
    COMPLIANCE: 'Florida Compliance',
  };

  const helpCategories: HelpCategory[] = [
    { id: CATEGORY_KEYS.GETTING_STARTED, title: 'Getting Started', icon: 'rocket-launch', color: '#2B5EA7', backgroundColor: '#dbeafe' },
    { id: CATEGORY_KEYS.QUOTES, title: t.nav?.quotes || 'Quotes', icon: 'file-document-edit', color: '#16a34a', backgroundColor: '#dcfce7' },
    { id: CATEGORY_KEYS.PAYMENTS, title: t.common?.payments || 'Payments', icon: 'cash-multiple', color: '#d97706', backgroundColor: '#fef3c7' },
    { id: CATEGORY_KEYS.WORK_ORDERS, title: t.nav?.workOrders || 'Work Orders', icon: 'clipboard-list', color: '#8b5cf6', backgroundColor: '#ede9fe' },
    { id: CATEGORY_KEYS.REVIEWS, title: t.reviews?.reviews || 'Reviews', icon: 'star', color: '#ec4899', backgroundColor: '#fce7f3' },
    { id: CATEGORY_KEYS.SETTINGS, title: t.nav?.settings || 'Settings', icon: 'cog', color: '#6b7280', backgroundColor: '#f3f4f6' },
    { id: CATEGORY_KEYS.COMPLIANCE, title: 'FL Compliance', icon: 'gavel', color: '#dc2626', backgroundColor: '#fee2e2' },
  ];

  const faqItems: FAQItem[] = [
    // ── Getting Started ──────────────────────────────────────────────────
    {
      id: 'gs1',
      category: 'Getting Started',
      question: 'How do I set up my business profile?',
      answer: 'Go to Settings → Profile tab. Fill in your business name, address, phone, and description. Make sure your service radius is correct — this determines which customer requests you see. Save before switching tabs.',
    },
    {
      id: 'gs2',
      category: 'Getting Started',
      question: 'How does the verification process work?',
      answer: 'After completing your profile and uploading your business license and insurance documents (Compliance section), our team reviews your application within 1–2 business days. Once approved, you receive a "Verified Business" badge visible to customers, which increases trust and quote acceptance rates.',
    },
    {
      id: 'gs3',
      category: 'Getting Started',
      question: 'When will I start receiving service requests?',
      answer: 'You start receiving matching requests as soon as your profile is saved with a valid service radius and at least one service type selected. Requests appear under Requests in the app. You don\'t need to be verified to receive requests, but verified providers are ranked higher in search results.',
    },
    {
      id: 'gs4',
      category: 'Getting Started',
      question: 'How do I enable mobile / on-site service?',
      answer: 'Go to Settings → Profile tab and toggle "Mobile / On-Site Service" on. You can then set your free travel miles and the fee you charge per mile beyond that. Customers near your area will see you as available for on-site visits.',
    },
    // ── Quotes ──────────────────────────────────────────────────────────
    {
      id: 'q1',
      category: t.nav?.quotes || 'Quotes',
      question: 'How do I create a quote for a customer?',
      answer: 'Open the customer\'s service request, tap "Create Quote," and add your line items (parts, labor, fees). Each item needs a description and price. The system totals everything automatically. Submit and the customer is notified immediately.',
    },
    {
      id: 'q2',
      category: t.nav?.quotes || 'Quotes',
      question: 'Can I edit a quote after sending it?',
      answer: 'Yes, as long as the customer has not yet accepted. Open the quote and tap "Edit." Once a customer accepts, the quote is locked — any scope change requires customer agreement and a new quote.',
    },
    {
      id: 'q3',
      category: t.nav?.quotes || 'Quotes',
      question: 'What happens if my quote is rejected?',
      answer: 'Rejected quotes are moved to Closed. You can review the customer\'s request and submit a revised quote if appropriate. Check your pricing and services — customers often reject if they feel the price is too high or the service description is unclear.',
    },
    // ── Payments ────────────────────────────────────────────────────────
    {
      id: 'p1',
      category: t.common?.payments || 'Payments',
      question: 'When do I receive payment?',
      answer: 'Payouts are processed within 3–5 business days after the customer approves the completed service. The platform fee is deducted automatically. Payment is sent via your selected payout method (Zelle, bank transfer, or manual arrangement) — configure this in Settings → Payout.',
    },
    {
      id: 'p2',
      category: t.common?.payments || 'Payments',
      question: 'What is the platform fee?',
      answer: 'TechTrust charges a platform fee per completed service. This covers payment processing, customer acquisition, the app, customer support, and fraud protection. The fee is deducted before your payout — you see your net earnings in the app.',
    },
    {
      id: 'p3',
      category: t.common?.payments || 'Payments',
      question: 'Do I need to collect sales tax from customers?',
      answer: 'No. TechTrust operates as a Marketplace Facilitator under Florida law (s. 212.05965, F.S.) and handles all applicable sales tax collection and remittance on your behalf. Do not add sales tax to your quote price — enter parts, labor, and fees separately so tax is calculated correctly at checkout.',
    },
    {
      id: 'p4',
      category: t.common?.payments || 'Payments',
      question: 'Will I receive a 1099 form?',
      answer: 'Yes. TechTrust will issue a 1099-NEC for annual earnings over $600 as required by the IRS. As an independent contractor, you are responsible for reporting income and paying quarterly estimated taxes. We recommend consulting a tax professional.',
    },
    // ── Work Orders ─────────────────────────────────────────────────────
    {
      id: 'wo1',
      category: t.nav?.workOrders || 'Work Orders',
      question: 'How do I complete a work order?',
      answer: 'When the job is done, open the work order and tap "Mark Complete." Add at least 3 photos documenting the finished work (required when the customer is not present). The customer is notified and has the opportunity to approve and rate the service.',
    },
    {
      id: 'wo2',
      category: t.nav?.workOrders || 'Work Orders',
      question: 'What if a customer cancels after I started the job?',
      answer: 'Report the work already completed in the app. TechTrust will review documented evidence (photos, time logs) and may compensate you for work performed. Always photograph the vehicle condition before starting to protect yourself in disputes.',
    },
    // ── Reviews ─────────────────────────────────────────────────────────
    {
      id: 'r1',
      category: t.reviews?.reviews || 'Reviews',
      question: 'How does the rating system work?',
      answer: 'After each completed service, the customer can rate 1–5 stars and leave a comment. Your average rating is shown on your profile and in search results. Providers below 3.5 stars for 30+ consecutive days may be placed under review.',
    },
    {
      id: 'r2',
      category: t.reviews?.reviews || 'Reviews',
      question: 'Can I respond to a review?',
      answer: 'Response functionality is being added. In the meantime, contact support if you receive a review you believe is fraudulent or violates community guidelines — we investigate and remove reviews that don\'t meet our standards.',
    },
    // ── Settings ────────────────────────────────────────────────────────
    {
      id: 's1',
      category: t.nav?.settings || 'Settings',
      question: 'How do I update my payout method?',
      answer: 'Go to Settings → Payout tab. Select your preferred method: Zelle (enter email/phone), Bank Transfer (enter routing + account numbers), or Manual. Save changes — your next payout will use the updated method.',
    },
    {
      id: 's2',
      category: t.nav?.settings || 'Settings',
      question: 'How do I update my business hours?',
      answer: 'Go to Settings → Hours tab. Toggle each day open or closed and set opening/closing times. Save when done. Customers see these hours on your profile — keeping them accurate avoids missed requests.',
    },
    {
      id: 's3',
      category: t.nav?.settings || 'Settings',
      question: 'How do I change my service area?',
      answer: 'Go to Service Area (from the main menu). Adjust your radius with the slider or chips, and use the county picker to declare coverage beyond your radius. Changes take effect immediately after saving.',
    },
    // ── Florida Compliance ───────────────────────────────────────────────
    {
      id: 'fl1',
      category: 'Florida Compliance',
      question: 'What is required for FDACS motor vehicle repair registration?',
      answer: 'Florida Statute 559.901–559.9221 requires all motor vehicle repair shops to register with FDACS. You need: (1) MV Registration Number (MV-XXXXX), (2) Proof of business location, (3) Garage liability insurance, (4) Surety bond or letter of credit ($10,000 min). Registration renews annually. Register at fdacs.gov.',
    },
    {
      id: 'fl2',
      category: 'Florida Compliance',
      question: 'What documents must I give customers before starting work?',
      answer: 'Florida law requires: (1) Written repair estimate signed by the customer before starting, (2) Written authorization for any repair exceeding the estimate by more than 10% or $50, (3) Itemized invoice listing parts (new vs. used) and labor, (4) Return of replaced parts if requested, (5) Warranty disclosure. Violations can result in fines up to $5,000 per incident.',
    },
    {
      id: 'fl3',
      category: 'Florida Compliance',
      question: 'What insurance does my shop need in Florida?',
      answer: 'At minimum: (1) General Liability — protects against third-party bodily injury/property damage, (2) Garage Liability — covers damage to customer vehicles in your care, (3) Garagekeepers coverage — for vehicles stored overnight, (4) Workers\' Comp if you have employees (required for 4+ employees in FL). Upload proof in the Compliance section.',
    },
    {
      id: 'fl4',
      category: 'Florida Compliance',
      question: 'How do I handle unclaimed vehicles in Florida?',
      answer: 'Under FL Statute 713.78: (1) Wait 30+ days after service completion, (2) Send a certified letter to the registered owner, (3) File a mechanic\'s lien with the county clerk, (4) Apply for a title via FL DHSMV. Document all communication attempts. Keep detailed records.',
    },
  ];

  // D36 — Florida Compliance categories
  const complianceDocs = [
    { icon: 'file-document-outline', title: 'FDACS Registration Guide', subtitle: 'Step-by-step registration process' },
    { icon: 'shield-check', title: 'FL Repair Shop Requirements', subtitle: 'Insurance, bonding & licensing' },
    { icon: 'file-sign', title: 'Customer Rights Disclosure', subtitle: 'Required disclosures template' },
    { icon: 'scale-balance', title: 'Dispute Resolution Process', subtitle: 'FDACS mediation & complaints' },
  ];

  const filteredFAQs = faqItems.filter(item => {
    const matchesSearch = !searchQuery ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !activeCategory || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleCategoryPress = (categoryId: string) => {
    setActiveCategory(prev => prev === categoryId ? null : categoryId);
    setSearchQuery('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.helpCenter || 'Help Center'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={22} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t.common?.searchHelp || 'Search help...'}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Help Categories */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t.common?.categories || 'Categories'}</Text>
            {activeCategory && (
              <TouchableOpacity onPress={() => setActiveCategory(null)}>
                <Text style={{ fontSize: 13, color: '#2B5EA7', fontWeight: '500' }}>Show all</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.categoriesGrid}>
            {helpCategories.map(category => {
              const isActive = activeCategory === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryCard, isActive && { borderWidth: 2, borderColor: category.color }]}
                  onPress={() => handleCategoryPress(category.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: category.backgroundColor }]}>
                    <MaterialCommunityIcons name={category.icon as any} size={24} color={category.color} />
                  </View>
                  <Text style={[styles.categoryTitle, isActive && { color: category.color, fontWeight: '600' }]}>
                    {category.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {activeCategory ? activeCategory : (t.provider?.faq || 'Frequently Asked Questions')}
          </Text>
          {filteredFAQs.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <MaterialCommunityIcons name="magnify-remove-outline" size={40} color="#d1d5db" />
              <Text style={{ color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
                No results found. Try a different search or category.
              </Text>
            </View>
          )}
          <View style={styles.faqList}>
            {filteredFAQs.map(item => (
              <TouchableOpacity 
                key={item.id}
                style={styles.faqCard}
                onPress={() => toggleFAQ(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqCategory}>{item.category}</Text>
                  <MaterialCommunityIcons 
                    name={expandedFAQ === item.id ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color="#6b7280" 
                  />
                </View>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                {expandedFAQ === item.id && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* D36 — Florida Compliance Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="gavel" size={22} color="#dc2626" />
            </View>
            <View>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Florida Compliance</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>FDACS requirements & regulations</Text>
            </View>
          </View>
          {complianceDocs.map((doc, idx) => (
            <TouchableOpacity
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 14,
                marginBottom: 8,
                gap: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name={doc.icon as any} size={22} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1f2937' }}>{doc.title}</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{doc.subtitle}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.needMoreHelp || 'Need more help?'}</Text>
          <View style={styles.contactOptions}>
            <TouchableOpacity 
              style={styles.contactCard}
              onPress={() => navigation.navigate('SupportChat')}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#dbeafe' }]}>
                <MaterialCommunityIcons name="chat" size={24} color="#2B5EA7" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>{t.provider?.chatWithSupport || 'Chat with Support'}</Text>
                <Text style={styles.contactSubtitle}>{t.provider?.responseTime || 'Response in up to 5 minutes'}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard}>
              <View style={[styles.contactIcon, { backgroundColor: '#dcfce7' }]}>
                <MaterialCommunityIcons name="email" size={24} color="#16a34a" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>{t.provider?.sendEmail || 'Send Email'}</Text>
                <Text style={styles.contactSubtitle}>support@techtrustautosolutions.com</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard}>
              <View style={[styles.contactIcon, { backgroundColor: '#fef3c7' }]}>
                <MaterialCommunityIcons name="phone" size={24} color="#d97706" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>{t.provider?.call || 'Call'}</Text>
                <Text style={styles.contactSubtitle}>(786) 919-7605</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.common?.resources || 'Resources'}</Text>
          <View style={styles.resourcesList}>
            <TouchableOpacity style={styles.resourceCard}>
              <MaterialCommunityIcons name="book-open-variant" size={24} color="#2B5EA7" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>{t.provider?.providerGuide || 'Provider Guide'}</Text>
                <Text style={styles.resourceSubtitle}>{t.provider?.learnPlatform || 'Learn everything about the platform'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resourceCard}>
              <MaterialCommunityIcons name="video" size={24} color="#2B5EA7" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>{t.provider?.videoTutorials || 'Video Tutorials'}</Text>
                <Text style={styles.resourceSubtitle}>{t.provider?.watchDemos || 'Watch video demonstrations'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resourceCard}>
              <MaterialCommunityIcons name="lightbulb-on" size={24} color="#2B5EA7" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>{t.provider?.successTips || 'Success Tips'}</Text>
                <Text style={styles.resourceSubtitle}>{t.provider?.increaseEarnings || 'How to increase your earnings'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  faqList: {
    gap: 12,
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  faqCategory: {
    fontSize: 12,
    color: '#2B5EA7',
    fontWeight: '500',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  contactOptions: {
    gap: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  contactSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  resourcesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  resourceSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});

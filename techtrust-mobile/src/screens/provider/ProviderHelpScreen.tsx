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

  const helpCategories: HelpCategory[] = [
    { id: '1', title: t.provider?.gettingStarted || 'Getting Started', icon: 'rocket-launch', color: '#1976d2', backgroundColor: '#dbeafe' },
    { id: '2', title: t.nav?.quotes || 'Quotes', icon: 'file-document-edit', color: '#16a34a', backgroundColor: '#dcfce7' },
    { id: '3', title: t.common?.payments || 'Payments', icon: 'cash-multiple', color: '#d97706', backgroundColor: '#fef3c7' },
    { id: '4', title: t.nav?.workOrders || 'Work Orders', icon: 'clipboard-list', color: '#8b5cf6', backgroundColor: '#ede9fe' },
    { id: '5', title: t.reviews?.reviews || 'Reviews', icon: 'star', color: '#ec4899', backgroundColor: '#fce7f3' },
    { id: '6', title: t.nav?.settings || 'Settings', icon: 'cog', color: '#6b7280', backgroundColor: '#f3f4f6' },
    { id: '7', title: 'FL Compliance', icon: 'gavel', color: '#dc2626', backgroundColor: '#fee2e2' },
  ];

  const faqItems: FAQItem[] = [
    {
      id: '1',
      category: t.nav?.quotes || 'Quotes',
      question: t.provider?.faqHowToQuote || 'How do I create a quote for a customer?',
      answer: t.provider?.faqHowToQuoteAnswer || 'To create a quote, access the customer\'s request, click "Create Quote" and fill in the parts and services fields. You can add multiple items and the system will automatically calculate the total.',
    },
    {
      id: '2',
      category: t.common?.payments || 'Payments',
      question: t.provider?.faqWhenPayment || 'When do I receive payment for services?',
      answer: t.provider?.faqWhenPaymentAnswer || 'Payment is automatically processed within 2 business days after service completion. The amount will be deposited into the registered bank account, with a 10% platform fee deducted.',
    },
    {
      id: '3',
      category: t.nav?.quotes || 'Quotes',
      question: t.provider?.faqEditQuote || 'Can I change a quote already sent?',
      answer: t.provider?.faqEditQuoteAnswer || 'Yes, as long as the customer has not accepted the quote, you can edit it. After acceptance, any changes must be agreed with the customer and a new quote must be sent.',
    },
    {
      id: '4',
      category: t.nav?.workOrders || 'Work Orders',
      question: t.provider?.faqFinishOrder || 'How do I finish a work order?',
      answer: t.provider?.faqFinishOrderAnswer || 'After completing the service, access the order, click "Finish" and add photos of the work done. The customer will receive a notification and can rate the service.',
    },
    {
      id: '5',
      category: t.reviews?.reviews || 'Reviews',
      question: t.provider?.faqReviews || 'How do reviews work?',
      answer: t.provider?.faqReviewsAnswer || 'After each completed service, the customer can rate from 1 to 5 stars and leave a comment. Your average rating is displayed on your profile and influences search ranking.',
    },
    {
      id: '6',
      category: t.common?.payments || 'Payments',
      question: t.provider?.faqPlatformFee || 'Why was a 10% fee charged?',
      answer: t.provider?.faqPlatformFeeAnswer || 'The 10% fee is the platform commission that covers payment processing costs, customer support, marketing and app maintenance.',
    },
    // D36 — Florida Compliance FAQ
    {
      id: '7',
      category: 'Florida Compliance',
      question: 'What is required for FDACS motor vehicle repair registration?',
      answer: 'Florida Statute 559.901-559.9221 requires all motor vehicle repair shops to register with the Department of Agriculture and Consumer Services (FDACS). You need: (1) MV Registration Number (MV-XXXXX format), (2) Proof of business location, (3) Garage liability insurance, (4) Surety bond or letter of credit ($10,000 minimum). Registration must be renewed annually.',
    },
    {
      id: '8',
      category: 'Florida Compliance',
      question: 'What documents must I provide to customers in Florida?',
      answer: 'Florida law requires: (1) Written repair estimate before starting work, (2) Customer authorization for repairs exceeding estimate by more than 10% or $50, (3) Itemized invoice with parts breakdown (new vs. used), (4) Return of replaced parts if requested, (5) Warranty disclosure for parts and labor. Failure to comply can result in fines up to $5,000 per violation.',
    },
    {
      id: '9',
      category: 'Florida Compliance',
      question: 'What is PIP (Personal Injury Protection) and how does it affect my shop?',
      answer: 'Florida is a no-fault state requiring all drivers to carry PIP coverage ($10,000 minimum). As a repair shop, you should: (1) Verify customer insurance before starting repairs, (2) Understand that PIP covers medical expenses, not vehicle repairs, (3) Ensure your customers also have Property Damage Liability ($10,000 minimum), (4) Be aware of Florida\'s comparative negligence system for claims.',
    },
    {
      id: '10',
      category: 'Florida Compliance',
      question: 'How do I handle unclaimed vehicles in Florida?',
      answer: 'Under Florida Statute 713.78, if a customer abandons a vehicle: (1) You must wait at least 30 days after service completion, (2) Send a certified letter to the registered owner, (3) File a mechanic\'s lien with the county clerk, (4) Apply for a title certificate through the FL DHSMV. Storage fees can be charged at reasonable daily rates. Keep detailed records of all communication attempts.',
    },
  ];

  // D36 — Florida Compliance categories
  const complianceDocs = [
    { icon: 'file-document-outline', title: 'FDACS Registration Guide', subtitle: 'Step-by-step registration process' },
    { icon: 'shield-check', title: 'FL Repair Shop Requirements', subtitle: 'Insurance, bonding & licensing' },
    { icon: 'file-sign', title: 'Customer Rights Disclosure', subtitle: 'Required disclosures template' },
    { icon: 'scale-balance', title: 'Dispute Resolution Process', subtitle: 'FDACS mediation & complaints' },
  ];

  const filteredFAQs = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
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
          <Text style={styles.sectionTitle}>{t.common?.categories || 'Categories'}</Text>
          <View style={styles.categoriesGrid}>
            {helpCategories.map(category => (
              <TouchableOpacity key={category.id} style={styles.categoryCard}>
                <View style={[styles.categoryIcon, { backgroundColor: category.backgroundColor }]}>
                  <MaterialCommunityIcons 
                    name={category.icon as any} 
                    size={24} 
                    color={category.color} 
                  />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.faq || 'Frequently Asked Questions'}</Text>
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
                <MaterialCommunityIcons name="chat" size={24} color="#1976d2" />
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
              <MaterialCommunityIcons name="book-open-variant" size={24} color="#1976d2" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>{t.provider?.providerGuide || 'Provider Guide'}</Text>
                <Text style={styles.resourceSubtitle}>{t.provider?.learnPlatform || 'Learn everything about the platform'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resourceCard}>
              <MaterialCommunityIcons name="video" size={24} color="#1976d2" />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>{t.provider?.videoTutorials || 'Video Tutorials'}</Text>
                <Text style={styles.resourceSubtitle}>{t.provider?.watchDemos || 'Watch video demonstrations'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resourceCard}>
              <MaterialCommunityIcons name="lightbulb-on" size={24} color="#1976d2" />
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
    color: '#1976d2',
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

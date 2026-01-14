/**
 * ProviderTermsAndPoliciesScreen - Termos e Políticas para Prestadores
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

type TabType = 'terms' | 'privacy' | 'contract' | 'fees';

export default function ProviderTermsAndPoliciesScreen({ navigation }: any) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('terms');

  const tabs = [
    { key: 'terms' as TabType, label: t.provider?.terms || 'Terms', icon: 'file-document' },
    { key: 'privacy' as TabType, label: t.provider?.privacy || 'Privacy', icon: 'shield-account' },
    { key: 'contract' as TabType, label: t.provider?.contract || 'Contract', icon: 'handshake' },
    { key: 'fees' as TabType, label: t.provider?.fees || 'Fees', icon: 'percent' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'terms':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>{t.provider?.termsOfUseProviders || 'Terms of Use - Providers'}</Text>
            <Text style={styles.lastUpdated}>{t.provider?.lastUpdated || 'Last updated'}: {t.common?.monthJanuary || 'January'} 2024</Text>

            <Text style={styles.sectionHeading}>1. {t.provider?.registrationEligibility || 'Registration and Eligibility'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.registrationRequirements || 'To register as a service provider on the TechTrust platform, you must:'}
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• {t.provider?.reqAge18 || 'Be at least 18 years old'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.reqBusinessId || 'Have an active business registration'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.reqExperience || 'Have proven experience in the automotive field'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.reqAcceptTerms || 'Accept all terms of this platform'}</Text>
            </View>

            <Text style={styles.sectionHeading}>2. {t.provider?.providerObligations || 'Provider Obligations'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.providerCommitment || 'The provider commits to:'}
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• {t.provider?.oblQuality || 'Provide quality services'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.oblDeadlines || 'Meet agreed deadlines'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.oblGenuineParts || 'Use parts with guaranteed origin'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.oblCommunication || 'Maintain clear communication with the customer'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.oblInvoice || 'Issue invoice when requested'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.oblRespond || 'Respond to requests in a timely manner'}</Text>
            </View>

            <Text style={styles.sectionHeading}>3. {t.provider?.serviceQuality || 'Service Quality'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.qualityStandards || 'TechTrust values excellence. Providers who maintain a rating below 3.5 stars for more than 30 consecutive days may have their accounts suspended for review.'}
            </Text>

            <Text style={styles.sectionHeading}>4. {t.provider?.cancellations || 'Cancellations'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.cancellationPolicy || 'Frequent cancellations negatively affect your reputation on the platform. High cancellation rates may result in penalties or suspension.'}
            </Text>
          </View>
        );

      case 'privacy':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>{t.provider?.privacyPolicy || 'Privacy Policy'}</Text>
            <Text style={styles.lastUpdated}>{t.provider?.lastUpdated || 'Last updated'}: {t.common?.monthJanuary || 'January'} 2024</Text>

            <Text style={styles.sectionHeading}>1. {t.provider?.dataCollected || 'Data Collected'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.dataCollectedDesc || 'We collect the following information from providers:'}
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• {t.provider?.dataPersonalBusiness || 'Personal and business data'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.dataTaxId || 'Tax ID and documentation'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.dataAddress || 'Address and service area'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.dataBanking || 'Banking details for payments'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.dataServiceHistory || 'Service history'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.dataReviews || 'Ratings and feedback received'}</Text>
            </View>

            <Text style={styles.sectionHeading}>2. {t.provider?.dataUsage || 'Use of Data'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.dataUsageDesc || 'Your data is used to:'}
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• {t.provider?.dataConnectCustomers || 'Connect you to customers'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.dataProcessPayments || 'Process payments'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.dataImproveServices || 'Improve our services'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.dataCommunications || 'Platform communications'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.dataLegalObligations || 'Legal obligations compliance'}</Text>
            </View>

            <Text style={styles.sectionHeading}>3. {t.provider?.dataProtection || 'Data Protection'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.dataProtectionDesc || 'We use encryption and advanced security measures to protect all information. Your banking data is stored with the highest security standards.'}
            </Text>

            <Text style={styles.sectionHeading}>4. {t.provider?.dataCompliance || 'Data Compliance'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.dataComplianceDesc || 'We comply with data protection regulations. You may request access, correction, or deletion of your data at any time through support.'}
            </Text>
          </View>
        );

      case 'contract':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>{t.provider?.partnershipContract || 'Partnership Contract'}</Text>
            <Text style={styles.lastUpdated}>{t.provider?.lastUpdated || 'Last updated'}: {t.common?.monthJanuary || 'January'} 2024</Text>

            <Text style={styles.sectionHeading}>1. {t.provider?.contractObject || 'Contract Object'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.contractObjectDesc || 'This contract establishes the terms of the partnership between the automotive service provider and the TechTrust platform for service intermediation.'}
            </Text>

            <Text style={styles.sectionHeading}>2. {t.provider?.responsibilities || 'Responsibilities'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.responsibilitiesDesc || 'TechTrust acts as an intermediary, connecting providers to customers. Service execution is the sole responsibility of the provider, including warranties and post-service support.'}
            </Text>

            <Text style={styles.sectionHeading}>3. {t.provider?.exclusivity || 'Exclusivity'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.exclusivityDesc || 'There is no exclusivity clause. You can work on other platforms or independently. However, services started through TechTrust must be completed through the platform.'}
            </Text>

            <Text style={styles.sectionHeading}>4. {t.provider?.termination || 'Termination'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.terminationDesc || 'Both parties can end the partnership at any time. Pending payments will be processed normally. TechTrust may suspend accounts for violation of terms.'}
            </Text>

            <Text style={styles.sectionHeading}>5. {t.provider?.intellectualProperty || 'Intellectual Property'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.intellectualPropertyDesc || 'Use of the TechTrust brand is only permitted for partnership disclosure, according to provided guidelines. Marketing materials must be pre-approved.'}
            </Text>
          </View>
        );

      case 'fees':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>{t.provider?.feePolicy || 'Fee Policy'}</Text>
            <Text style={styles.lastUpdated}>{t.provider?.lastUpdated || 'Last updated'}: {t.common?.monthJanuary || 'January'} 2024</Text>

            <View style={styles.feeCard}>
              <View style={styles.feeHeader}>
                <MaterialCommunityIcons name="percent" size={24} color="#1976d2" />
                <Text style={styles.feeTitle}>{t.provider?.serviceFee || 'Service Fee'}</Text>
              </View>
              <Text style={styles.feeValue}>10%</Text>
              <Text style={styles.feeDescription}>
                Sobre o valor total do serviço
              </Text>
            </View>

            <Text style={styles.sectionHeading}>1. {t.provider?.howItWorks || 'How It Works'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.howItWorksDesc || 'TechTrust charges a 10% fee on the total value of each completed service. This fee is automatically deducted at the time of payment transfer.'}
            </Text>

            <Text style={styles.sectionHeading}>2. {t.provider?.whatsIncluded || "What's Included"}</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• {t.provider?.inclPlatformAccess || 'Platform and app access'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.inclPaymentSystem || 'Online payment system'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.inclSupport || '24/7 customer support'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.inclMarketing || 'Marketing and customer acquisition'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.inclRatings || 'Rating system'}</Text>
              <Text style={styles.bulletItem}>• {t.provider?.inclFraudProtection || 'Fraud protection'}</Text>
            </View>

            <Text style={styles.sectionHeading}>3. {t.provider?.payments || 'Payments'}</Text>
            <Text style={styles.paragraph}>
              {t.provider?.paymentsDesc || 'Transfers are made within 2 business days after service completion and customer confirmation. In case of installments, the amount is transferred as payments are confirmed.'}
            </Text>

            <Text style={styles.sectionHeading}>4. {t.provider?.volumeDiscounts || 'Volume Discounts'}</Text>
            <View style={styles.tierCard}>
              <View style={styles.tierRow}>
                <Text style={styles.tierLabel}>{t.provider?.tier1 || 'Up to 10 services/month'}</Text>
                <Text style={styles.tierValue}>10%</Text>
              </View>
              <View style={styles.tierRow}>
                <Text style={styles.tierLabel}>{t.provider?.tier2 || '11-30 services/month'}</Text>
                <Text style={styles.tierValue}>9%</Text>
              </View>
              <View style={styles.tierRow}>
                <Text style={styles.tierLabel}>{t.provider?.tier3 || '31+ services/month'}</Text>
                <Text style={styles.tierValue}>8%</Text>
              </View>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.termsAndPolicies || 'Terms and Policies'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.key ? '#1976d2' : '#6b7280'}
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderContent()}
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
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#dbeafe',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#1976d2',
  },
  contentContainer: {
    padding: 20,
  },
  contentTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
  bulletList: {
    marginTop: 8,
    marginLeft: 8,
  },
  bulletItem: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 24,
  },
  feeCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  feeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
  feeValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1976d2',
  },
  feeDescription: {
    fontSize: 14,
    color: '#1e40af',
  },
  tierCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tierLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  tierValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
});

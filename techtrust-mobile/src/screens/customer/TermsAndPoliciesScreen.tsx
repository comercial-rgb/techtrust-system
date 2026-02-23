/**
 * TermsAndPoliciesScreen - Termos e Políticas
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
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';

type DocumentType = 'terms' | 'privacy' | 'tracking' | 'refund';

interface DocumentSection {
  title: string;
  content: string;
}

export default function TermsAndPoliciesScreen({ navigation }: any) {
  const { t } = useI18n();
  const [activeDocument, setActiveDocument] = useState<DocumentType>('terms');

  const documents: Record<DocumentType, { title: string; lastUpdated: string; icon: string; sections: DocumentSection[] }> = {
    terms: {
      title: 'Terms of Use',
      lastUpdated: '02/01/2026',
      icon: 'document-text',
      sections: [
        {
          title: '1. Acceptance of Terms',
          content: 'By downloading, accessing, or using the TechTrust mobile application ("App"), you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, do not use the App. TechTrust AutoSolutions LLC ("TechTrust," "we," "us," or "our") reserves the right to modify these Terms at any time. Continued use after changes constitutes acceptance.',
        },
        {
          title: '2. Eligibility',
          content: 'You must be at least 18 years of age and legally capable of entering into binding agreements to use this App. By using TechTrust, you represent and warrant that you meet these eligibility requirements.',
        },
        {
          title: '3. Service Description',
          content: 'TechTrust is a technology platform that connects vehicle owners ("Customers") with independent automotive service providers ("Providers"). TechTrust acts solely as an intermediary and marketplace. We do not perform automotive services and are not responsible for the quality, safety, legality, or any aspect of services performed by Providers.',
        },
        {
          title: '4. Account Responsibilities',
          content: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized access or use of your account.',
        },
        {
          title: '5. Independent Contractors',
          content: 'All service providers on TechTrust are independent contractors, not employees, agents, or representatives of TechTrust. TechTrust does not supervise, direct, or control service providers\' work. Any warranty or guarantee on services is the sole responsibility of the Provider.',
        },
        {
          title: '6. Payment Terms',
          content: 'TechTrust uses a pre-authorization payment model. When you accept a quote, a hold is placed on your payment method for the quoted amount plus applicable fees. The actual charge is only captured after you review and approve the completed service. A 10% platform fee and payment processing fees (varies by processor) apply to each transaction and are visible before you confirm. Payment processing is handled by secure third-party partners (e.g., Stripe).',
        },
        {
          title: '7. Cancellation Policy',
          content: 'You may cancel a service request at no cost before accepting a quote. After accepting a quote: cancellations made more than 24 hours after acceptance are subject to a 10% cancellation fee; cancellations made within 24 hours of acceptance are subject to a 25% cancellation fee. Once service has started, cancellation requires Provider validation and may be subject to charges for work already performed.',
        },
        {
          title: '8. Electronic Communications Consent',
          content: 'By using the App, you consent to receive electronic communications from TechTrust, including push notifications, emails, and in-app messages regarding your account, transactions, service updates, and promotional offers. You may opt out of promotional communications at any time through your account settings.',
        },
        {
          title: '9. Disclaimer of Warranties',
          content: 'THE APP AND ALL SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TECHTRUST SPECIFICALLY DISCLAIMS ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.',
        },
        {
          title: '10. Limitation of Liability',
          content: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, TECHTRUST SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF OR INABILITY TO USE THE APP OR SERVICES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. TECHTRUST\'S TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID THROUGH THE APP IN THE 12 MONTHS PRECEDING THE CLAIM.',
        },
        {
          title: '11. Indemnification',
          content: 'You agree to indemnify, defend, and hold harmless TechTrust AutoSolutions LLC, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorney fees) arising from your use of the App, violation of these Terms, or infringement of any third-party rights.',
        },
        {
          title: '12. Binding Arbitration & Class Action Waiver',
          content: 'Any dispute, claim, or controversy arising out of or relating to these Terms or the App shall be resolved by binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. Arbitration shall take place in the State of Florida. YOU AGREE TO WAIVE YOUR RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN A CLASS ACTION, CLASS ARBITRATION, OR REPRESENTATIVE PROCEEDING. Each party shall bear its own costs, and the arbitrator\'s decision shall be final and binding.',
        },
        {
          title: '13. Governing Law',
          content: 'These Terms shall be governed by and construed in accordance with the laws of the State of Florida, without regard to its conflict of law provisions. Any legal action not subject to arbitration shall be brought exclusively in the state or federal courts located in Florida.',
        },
        {
          title: '14. Force Majeure',
          content: 'TechTrust shall not be liable for any failure or delay in performing its obligations due to circumstances beyond its reasonable control, including but not limited to natural disasters, pandemics, government actions, internet or telecommunications failures, or acts of third parties.',
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: '02/01/2026',
      icon: 'shield-checkmark',
      sections: [
        {
          title: '1. Information We Collect',
          content: 'We collect information you provide directly, including: full name, email address, phone number, vehicle information (make, model, year, VIN, license plate), payment method details, GPS location (when using services), and profile photos. We also automatically collect device information, usage data, IP address, and app interaction analytics.',
        },
        {
          title: '2. How We Use Your Information',
          content: 'Your information is used to: provide and improve our services; process transactions and payment holds; match you with nearby service providers; communicate about your account and services; personalize your experience; comply with legal obligations; prevent fraud and ensure security; and send service-related notifications.',
        },
        {
          title: '3. Information Sharing',
          content: 'We share limited information with service providers to fulfill your service requests (e.g., vehicle details, location). We share payment data with our payment processors (Stripe and/or Chase Payment Solutions) to execute transactions. We do NOT sell your personal information to third parties. We may share data with law enforcement if required by law or valid legal process.',
        },
        {
          title: '4. Data Security',
          content: 'We implement industry-standard security measures including TLS/SSL encryption for data in transit, encrypted storage for sensitive data at rest, PCI-DSS compliant payment processing through certified third-party processors, and regular security assessments. No method of electronic transmission is 100% secure, and we cannot guarantee absolute security.',
        },
        {
          title: '5. Your Rights',
          content: 'You have the right to: access your personal information; request correction of inaccurate data; request deletion of your data; opt out of marketing communications; and export your data in a portable format. To exercise these rights, contact us at privacy@techtrust.com or through the App\'s settings.',
        },
        {
          title: '6. California Privacy Rights (CCPA/CPRA)',
          content: 'If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA): the right to know what personal information we collect, use, and disclose; the right to request deletion; the right to opt out of the sale or sharing of personal information (we do not sell your data); and the right to non-discrimination for exercising your privacy rights. To make a request, email privacy@techtrust.com or call our support line. We will respond within 45 days.',
        },
        {
          title: '7. Data Retention',
          content: 'We retain your information for as long as your account is active, plus a reasonable period for legal, tax, and accounting purposes (typically up to 7 years for transaction records as required by IRS regulations). You can request deletion of your data at any time, subject to legal retention requirements.',
        },
        {
          title: '8. Children\'s Privacy',
          content: 'TechTrust is not intended for use by individuals under 18 years of age. We do not knowingly collect personal information from minors. If we learn we have collected data from a minor, we will delete it promptly. If you believe a minor has provided us with personal information, please contact us at privacy@techtrust.com.',
        },
        {
          title: '9. Third-Party Services',
          content: 'Our App integrates with third-party services including payment processors (Stripe, Chase), analytics providers, and notification services. These third parties have their own privacy policies. We are not responsible for the privacy practices of external services.',
        },
        {
          title: '10. Do Not Track',
          content: 'Our App does not currently respond to "Do Not Track" browser signals. However, you can manage your privacy preferences through the App settings and your device\'s permission controls for location, notifications, and camera access.',
        },
        {
          title: '11. Data Breach Notification',
          content: 'In the event of a data breach that may affect your personal information, we will notify you as required by applicable law, including Florida\'s Information Protection Act (Fla. Stat. § 501.171), within the timeframes mandated by law.',
        },
        {
          title: '12. Contact Us',
          content: 'If you have questions about this Privacy Policy or wish to exercise your privacy rights, contact us at: privacy@techtrust.com. TechTrust AutoSolutions LLC, State of Florida.',
        },
      ],
    },
    tracking: {
      title: 'Data & Tracking',
      lastUpdated: '02/01/2026',
      icon: 'information-circle',
      sections: [
        {
          title: '1. Tracking Technologies',
          content: 'As a mobile application, TechTrust uses device-based tracking technologies rather than browser cookies. These include local storage, device identifiers, and analytics SDKs to provide and improve our services.',
        },
        {
          title: '2. Types of Data Stored Locally',
          content: 'We store the following data on your device: authentication tokens to keep you signed in; user preferences and settings; cached service data for faster loading; and notification preferences.',
        },
        {
          title: '3. Analytics & Performance',
          content: 'We use analytics tools to understand how users interact with the App, measure performance, identify crashes, and improve the user experience. This data is aggregated and does not personally identify you.',
        },
        {
          title: '4. Location Data',
          content: 'With your permission, we collect GPS location data to connect you with nearby service providers and provide accurate service area matching. You can revoke location permission at any time through your device settings, though some features may not function properly without it.',
        },
        {
          title: '5. Managing Your Data',
          content: 'You can control data collection through your device settings: disable location services, revoke notification permissions, clear app data and cache, or uninstall the App to remove all locally stored data. Account data stored on our servers can be deleted by contacting support or through the "Delete Account" option in your profile.',
        },
      ],
    },
    refund: {
      title: 'Refund Policy',
      lastUpdated: '02/01/2026',
      icon: 'cash',
      sections: [
        {
          title: '1. Pre-Authorization Model',
          content: 'TechTrust uses a pre-authorization (hold) payment model. When you accept a quote, a temporary hold is placed on your payment method. Your card is NOT charged until you explicitly approve the completed service. If you do not approve or the service is cancelled, the hold is released back to your payment method.',
        },
        {
          title: '2. Eligible Refunds',
          content: 'Refunds may be issued for: services not rendered or partially rendered; significant quality issues documented with evidence; cancellations made according to our Cancellation Policy; overcharges or billing errors; and services that substantially deviate from the accepted quote without approved supplements.',
        },
        {
          title: '3. Refund Window',
          content: 'Refund requests must be submitted within 48 hours of payment capture (service approval). Requests submitted after this window will be evaluated on a case-by-case basis but are not guaranteed. To request a refund, use the "Report Issue" option on the service details screen or contact support.',
        },
        {
          title: '4. Platform Credit Option',
          content: 'As an alternative to a refund to your payment method, you may choose to receive a platform credit. If you select the platform credit option, you will receive a 10% bonus on the refund amount (e.g., a $100 refund becomes $110 in platform credit). Platform credits never expire and can be used for any future service.',
        },
        {
          title: '5. Processing Time',
          content: 'Approved refunds to your original payment method are processed within 5-10 business days. The actual time to appear in your account depends on your bank or card issuer. Platform credits are applied immediately upon approval.',
        },
        {
          title: '6. Non-Refundable Items',
          content: 'The following are generally non-refundable: completed services that meet the agreed specifications and were approved by you; platform fees on completed transactions; cancellation fees as defined in the Cancellation Policy; and payment processing fees already incurred.',
        },
        {
          title: '7. Dispute Resolution',
          content: 'If you disagree with a refund decision, you may appeal through our customer support team. We will review your case within 48 hours and provide a final determination. If the dispute cannot be resolved informally, it shall be subject to the arbitration provisions in our Terms of Use.',
        },
      ],
    },
  };

  const activeDoc = documents[activeDocument];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.customer?.termsAndPolicies || 'Terms & Policies'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Document Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {(Object.keys(documents) as DocumentType[]).map((doc) => (
            <TouchableOpacity
              key={doc}
              style={[
                styles.tab,
                activeDocument === doc && styles.tabActive,
              ]}
              onPress={() => setActiveDocument(doc)}
            >
              <Ionicons
                name={documents[doc].icon as any}
                size={18}
                color={activeDocument === doc ? '#2B5EA7' : '#6b7280'}
              />
              <Text style={[
                styles.tabText,
                activeDocument === doc && styles.tabTextActive,
              ]}>
                {documents[doc].title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Document Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.documentHeader}>
          <Text style={styles.documentTitle}>{activeDoc.title}</Text>
          <Text style={styles.documentDate}>{t.common?.lastUpdated || 'Last updated'}: {activeDoc.lastUpdated}</Text>
        </View>

        {activeDoc.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Ionicons name="mail" size={24} color="#2B5EA7" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>{t.customer?.questionsAboutPolicies || 'Questions about our policies?'}</Text>
            <Text style={styles.contactSubtitle}>{t.customer?.contactUsAt || 'Contact us at'} legal@techtrust.com</Text>
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>TechTrust v1.0.0</Text>
          <Text style={styles.versionText}>© 2026 TechTrust AutoSolutions LLC. All rights reserved.</Text>
        </View>

        <View style={{ height: 100 }} />
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
  tabsWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#dbeafe',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#2B5EA7',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  documentHeader: {
    marginBottom: 24,
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  contactSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#3b82f6',
  },
  versionInfo: {
    alignItems: 'center',
    marginTop: 32,
    padding: 20,
  },
  versionText: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
});

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

type DocumentType = 'terms' | 'privacy' | 'cookies' | 'refund';

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
      lastUpdated: '01/15/2024',
      icon: 'document-text',
      sections: [
        {
          title: '1. Acceptance of Terms',
          content: 'By accessing and using TechTrust, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this application.',
        },
        {
          title: '2. Use License',
          content: 'Permission is granted to temporarily download one copy of TechTrust for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.',
        },
        {
          title: '3. Service Description',
          content: 'TechTrust is a platform that connects vehicle owners with automotive service providers. We facilitate communication and transactions but are not responsible for the quality of services provided by third-party providers.',
        },
        {
          title: '4. User Responsibilities',
          content: 'You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.',
        },
        {
          title: '5. Service Provider Terms',
          content: 'All service providers on TechTrust are independent contractors. TechTrust does not employ these providers and is not responsible for their actions, services, or quality of work.',
        },
        {
          title: '6. Payment Terms',
          content: 'Payments are processed securely through our payment partners. All transactions are final once the service has been completed and confirmed by both parties.',
        },
        {
          title: '7. Cancellation Policy',
          content: 'Cancellations made more than 24 hours before a scheduled service are eligible for a full refund. Cancellations within 24 hours may be subject to a cancellation fee.',
        },
        {
          title: '8. Limitation of Liability',
          content: 'TechTrust shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.',
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: '01/15/2024',
      icon: 'shield-checkmark',
      sections: [
        {
          title: '1. Information We Collect',
          content: 'We collect information you provide directly, including name, email, phone number, vehicle information, and payment details. We also collect usage data and device information.',
        },
        {
          title: '2. How We Use Your Information',
          content: 'Your information is used to provide and improve our services, process transactions, communicate with you, and personalize your experience.',
        },
        {
          title: '3. Information Sharing',
          content: 'We share your information with service providers only as necessary to fulfill service requests. We do not sell your personal information to third parties.',
        },
        {
          title: '4. Data Security',
          content: 'We implement industry-standard security measures to protect your data, including encryption, secure servers, and regular security audits.',
        },
        {
          title: '5. Your Rights',
          content: 'You have the right to access, correct, or delete your personal information. You can also opt out of marketing communications at any time.',
        },
        {
          title: '6. Data Retention',
          content: 'We retain your information for as long as your account is active or as needed to provide services. You can request deletion of your data at any time.',
        },
        {
          title: '7. Third-Party Services',
          content: 'Our app may contain links to third-party services. We are not responsible for the privacy practices of these external sites or services.',
        },
        {
          title: '8. Contact Us',
          content: 'If you have questions about this Privacy Policy, please contact us at privacy@techtrust.com.',
        },
      ],
    },
    cookies: {
      title: 'Cookie Policy',
      lastUpdated: '01/10/2024',
      icon: 'information-circle',
      sections: [
        {
          title: '1. What Are Cookies',
          content: 'Cookies are small text files stored on your device that help us provide a better user experience.',
        },
        {
          title: '2. Types of Cookies We Use',
          content: 'We use essential cookies for app functionality, analytics cookies to understand usage, and preference cookies to remember your settings.',
        },
        {
          title: '3. Essential Cookies',
          content: 'These cookies are necessary for the app to function properly. They enable basic features like page navigation and access to secure areas.',
        },
        {
          title: '4. Analytics Cookies',
          content: 'We use analytics cookies to understand how users interact with our app, helping us improve functionality and user experience.',
        },
        {
          title: '5. Managing Cookies',
          content: 'You can control cookies through your device settings. Disabling certain cookies may affect app functionality.',
        },
      ],
    },
    refund: {
      title: 'Refund Policy',
      lastUpdated: '01/05/2024',
      icon: 'cash',
      sections: [
        {
          title: '1. Eligible Refunds',
          content: 'Refunds may be issued for services not rendered, significant quality issues, or cancellations made according to our cancellation policy.',
        },
        {
          title: '2. Refund Process',
          content: 'To request a refund, contact our support team within 7 days of the service. Provide your order details and reason for the refund request.',
        },
        {
          title: '3. Processing Time',
          content: 'Approved refunds are processed within 5-10 business days. The time to appear in your account depends on your payment method.',
        },
        {
          title: '4. Non-Refundable Items',
          content: 'Completed services that meet the agreed specifications, convenience fees, and subscription fees are generally non-refundable.',
        },
        {
          title: '5. Dispute Resolution',
          content: 'If you disagree with a refund decision, you can appeal through our customer support. We will review your case within 48 hours.',
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
                color={activeDocument === doc ? '#1976d2' : '#6b7280'}
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
          <Ionicons name="mail" size={24} color="#1976d2" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>{t.customer?.questionsAboutPolicies || 'Questions about our policies?'}</Text>
            <Text style={styles.contactSubtitle}>{t.customer?.contactUsAt || 'Contact us at'} legal@techtrust.com</Text>
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>TechTrust v1.0.0</Text>
          <Text style={styles.versionText}>© 2024 TechTrust Inc. All rights reserved.</Text>
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
    color: '#1976d2',
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

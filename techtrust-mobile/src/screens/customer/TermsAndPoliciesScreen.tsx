/**
 * TermsAndPoliciesScreen - Termos e Políticas
 */

import React, { useState, useMemo, useEffect } from 'react';
import type { ComponentProps } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>["name"];
import { useI18n } from '../../i18n';
import termsPoliciesDocumentsEn from '../../i18n/locales/fragments/termsPoliciesDocuments.en';
import type {
  CustomerTermsPoliciesTab,
  TermsAndPoliciesScreenProps,
} from '../../navigation/types';

type DocumentType = 'terms' | 'privacy' | 'tracking' | 'refund';

interface DocumentSection {
  title: string;
  content: string;
}

type PolicyDocBundle = Record<
  DocumentType,
  { title: string; lastUpdated: string; icon: string; sections: DocumentSection[] }
>;

/** Maps stack params (incl. legacy "about" from landing footer) to document keys. */
function resolveDocumentTab(
  initialTab?: CustomerTermsPoliciesTab | string | null,
): DocumentType {
  const key = (initialTab || '').toLowerCase();
  if (key === 'privacy') return 'privacy';
  if (key === 'tracking') return 'tracking';
  if (key === 'refund') return 'refund';
  if (key === 'terms') return 'terms';
  // No separate "about" policy doc — treat as Terms of Use.
  if (key === 'about') return 'terms';
  return 'terms';
}

export default function TermsAndPoliciesScreen({
  navigation,
  route,
}: TermsAndPoliciesScreenProps) {
  const { t } = useI18n();
  const paramTab = route.params?.initialTab;
  const [activeDocument, setActiveDocument] = useState<DocumentType>(() =>
    resolveDocumentTab(paramTab)
  );

  useEffect(() => {
    const tab = route.params?.initialTab;
    if (tab === undefined || tab === null) return;
    setActiveDocument(resolveDocumentTab(tab));
  }, [route.params?.initialTab]);

  const documents = useMemo((): PolicyDocBundle => {
    const raw = (t as unknown as { termsPoliciesDocuments?: PolicyDocBundle })
      .termsPoliciesDocuments;
    if (raw && typeof raw === "object" && "terms" in raw && "privacy" in raw) {
      return raw;
    }
    return termsPoliciesDocumentsEn as PolicyDocBundle;
  }, [t]);

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
                name={documents[doc].icon as IoniconName}
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
          <Text style={styles.versionText}>
            {(t.customer as Record<string, string | undefined> | undefined)
              ?.termsPoliciesAppVersion ?? "TechTrust v1.0.0"}
          </Text>
          <Text style={styles.versionText}>
            {(t.customer as Record<string, string | undefined> | undefined)
              ?.termsPoliciesCopyright ??
              "© 2026 TechTrust AutoSolutions LLC. All rights reserved."}
          </Text>
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

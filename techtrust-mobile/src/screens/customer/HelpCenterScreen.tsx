/**
 * HelpCenterScreen - Central de Ajuda
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
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';
import { useRoute } from '@react-navigation/native';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function HelpCenterScreen({ navigation }: any) {
  const { t } = useI18n();
  const route = useRoute<any>();
  const fromDashboard = route.params?.fromDashboard;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleBack = () => {
    if (fromDashboard) {
      navigation.navigate('Home', { screen: 'Dashboard' });
    } else {
      navigation.goBack();
    }
  };

  const categories = [
    { id: 'all', label: 'All', icon: 'grid' },
    { id: 'account', label: 'Account', icon: 'person' },
    { id: 'services', label: 'Services', icon: 'construct' },
    { id: 'payments', label: 'Payments', icon: 'card' },
    { id: 'vehicles', label: 'Vehicles', icon: 'car' },
  ];

  const faqs: FAQItem[] = [
    {
      id: '1',
      question: 'How do I request a service quote?',
      answer: 'To request a quote, go to the Home tab and tap "Need a service?" or the + button. Select your vehicle, describe the service needed, and submit. Local providers will send you quotes within hours.',
      category: 'services',
    },
    {
      id: '2',
      question: 'How do I add a new vehicle?',
      answer: 'Go to the Vehicles tab and tap the "Add Vehicle" card. Enter your vehicle\'s make, model, year, and license plate. You can also add optional details like VIN number and current mileage.',
      category: 'vehicles',
    },
    {
      id: '3',
      question: 'How do I pay for a service?',
      answer: 'TechTrust uses a pre-authorization (hold) payment model. When you accept a quote, a temporary hold is placed on your card for the quoted amount plus fees. Your card is NOT charged until you review and approve the completed service. You can add or manage payment methods in Profile > Payment Methods.',
      category: 'payments',
    },
    {
      id: '4',
      question: 'Can I cancel a service request?',
      answer: 'Yes. Before accepting a quote, you can cancel at no cost. After accepting a quote: cancellations made more than 24 hours after acceptance incur a 10% fee; within 24 hours, a 25% fee applies. Once service has started, cancellation requires provider validation. Use the "Cancel" button on the service details screen — the fee is calculated automatically.',
      category: 'services',
    },
    {
      id: '5',
      question: 'How do I change my email or phone number?',
      answer: 'Go to Profile > Personal Information. Tap the edit icon, make your changes, and save. You may need to verify your new email or phone number.',
      category: 'account',
    },
    {
      id: '6',
      question: 'Is my payment information secure?',
      answer: 'Yes. All payment information is processed through PCI-DSS compliant payment processors (Stripe and/or Chase Payment Solutions). We never store your full card number on our servers. Data is encrypted using TLS/SSL both in transit and at rest.',
      category: 'payments',
    },
    {
      id: '7',
      question: 'How do I rate a service provider?',
      answer: 'After a service is completed, you\'ll be prompted to rate your experience. You can also rate later by going to Services > View completed service > Leave a Review.',
      category: 'services',
    },
    {
      id: '8',
      question: 'What if I\'m not satisfied with a service?',
      answer: 'Contact the service provider first to resolve the issue. If you can\'t reach a resolution, contact our support team through the "Contact Us" option. We\'ll help mediate the situation.',
      category: 'services',
    },
    {
      id: '9',
      question: 'How do I delete my account?',
      answer: 'Go to Profile > Personal Information > Delete Account. Note that this action is irreversible and will delete all your data, including service history and saved vehicles.',
      category: 'account',
    },
    {
      id: '10',
      question: 'How do refunds work?',
      answer: 'Refund requests must be submitted within 48 hours of service approval. Use the "Report Issue" button on the service details screen. Approved refunds are processed to your original payment method within 5-10 business days. Alternatively, you can choose a platform credit and receive a 10% bonus on the refund amount.',
      category: 'payments',
    },
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && (searchQuery === '' || matchesSearch);
  });

  const quickActions = [
    { 
      id: 'contact', 
      title: 'Contact Us', 
      subtitle: 'Chat with support',
      icon: 'chatbubbles',
      color: '#3b82f6',
      onPress: () => navigation.navigate('ContactUs'),
    },
    { 
      id: 'report', 
      title: 'Report Issue', 
      subtitle: 'Report a problem',
      icon: 'warning',
      color: '#f59e0b',
      onPress: () => navigation.navigate('ContactUs', { subject: 'Report Issue' }),
    },
    { 
      id: 'feedback', 
      title: 'Give Feedback', 
      subtitle: 'Share your thoughts',
      icon: 'heart',
      color: '#ec4899',
      onPress: () => navigation.navigate('RateApp'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.customer?.helpCenter || 'Help Center'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder={t.customer?.searchForHelp || 'Search for help...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          {quickActions.map((action) => (
            <TouchableOpacity 
              key={action.id} 
              style={styles.quickAction}
              onPress={action.onPress}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
              <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Ionicons 
                name={category.icon as any} 
                size={16} 
                color={selectedCategory === category.id ? '#fff' : '#6b7280'} 
              />
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category.id && styles.categoryChipTextActive,
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQs */}
        <View style={styles.faqsContainer}>
          <Text style={styles.sectionTitle}>{t.customer?.frequentlyAskedQuestions || 'Frequently Asked Questions'}</Text>
          
          {filteredFAQs.length === 0 ? (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={48} color="#d1d5db" />
              <Text style={styles.noResultsText}>{t.common?.noResults || 'No results found'}</Text>
              <Text style={styles.noResultsSubtext}>{t.customer?.tryDifferentSearch || 'Try a different search term'}</Text>
            </View>
          ) : (
            filteredFAQs.map((faq) => (
              <TouchableOpacity
                key={faq.id}
                style={styles.faqCard}
                onPress={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                activeOpacity={0.7}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons 
                    name={expandedId === faq.id ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#6b7280" 
                  />
                </View>
                {expandedId === faq.id && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Still Need Help */}
        <View style={styles.stillNeedHelp}>
          <Text style={styles.stillNeedHelpTitle}>{t.customer?.stillNeedHelp || 'Still need help?'}</Text>
          <Text style={styles.stillNeedHelpText}>
            {t.customer?.supportAvailable || 'Our support team is available 24/7 to assist you'}
          </Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => navigation.navigate('ContactUs')}
          >
            <Ionicons name="chatbubbles" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>{t.customer?.chatWithSupport || 'Chat with Support'}</Text>
          </TouchableOpacity>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 2,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  faqsContainer: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginRight: 12,
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  stillNeedHelp: {
    backgroundColor: '#1976d2',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  stillNeedHelpTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  stillNeedHelpText: {
    fontSize: 14,
    color: '#bfdbfe',
    textAlign: 'center',
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
});

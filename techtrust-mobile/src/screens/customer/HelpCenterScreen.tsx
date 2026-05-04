/**
 * HelpCenterScreen - Central de Ajuda
 * D23: Live Chat with support integrated
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { ComponentProps } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>["name"];
import { useI18n } from '../../i18n';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from "@react-navigation/native";
import helpCenterFaqEn from '../../i18n/locales/fragments/helpCenterFaq.en';
import type {
  CustomerAppNavigation,
  CustomerAppParamList,
} from "../../navigation/types";

type ScreenMode = 'help' | 'chat';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'agent';
  timestamp: Date;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

type BotResponseKey =
  | 'quote'
  | 'payment'
  | 'cancel'
  | 'account'
  | 'human'
  | 'default';

export default function HelpCenterScreen({ navigation }: { navigation: CustomerAppNavigation }) {
  const { t, formatTime } = useI18n();
  const route = useRoute<RouteProp<CustomerAppParamList, "HelpCenter">>();
  const fromDashboard = route.params?.fromDashboard;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [screenMode, setScreenMode] = useState<ScreenMode>('help');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatListRef = useRef<FlatList>(null);

  const botResponses = useMemo((): Record<BotResponseKey, string> => {
    const c = t.customer as Record<string, string | undefined> | undefined;
    return {
      quote: String(c?.helpBotQuote ?? ''),
      payment: String(c?.helpBotPayment ?? ''),
      cancel: String(c?.helpBotCancel ?? ''),
      account: String(c?.helpBotAccount ?? ''),
      human: String(c?.helpBotHuman ?? ''),
      default: String(c?.helpBotDefault ?? ''),
    };
  }, [t]);

  const quickReplyDefs = useMemo(() => {
    const c = t.customer as Record<string, string | undefined> | undefined;
    return [
      { key: 'quote' as const, label: String(c?.helpQuickReplyQuote ?? '') },
      { key: 'payment' as const, label: String(c?.helpQuickReplyPayment ?? '') },
      { key: 'cancel' as const, label: String(c?.helpQuickReplyCancel ?? '') },
      { key: 'account' as const, label: String(c?.helpQuickReplyAccount ?? '') },
      { key: 'human' as const, label: String(c?.helpQuickReplyHuman ?? '') },
    ];
  }, [t]);

  const categories = useMemo(() => {
    const c = t.customer as Record<string, string | undefined> | undefined;
    return [
      { id: 'all', label: String(c?.helpCategoryAll ?? ''), icon: 'grid' as const },
      { id: 'account', label: String(c?.helpCategoryAccount ?? ''), icon: 'person' as const },
      { id: 'services', label: String(c?.helpCategoryServices ?? ''), icon: 'construct' as const },
      { id: 'payments', label: String(c?.helpCategoryPayments ?? ''), icon: 'card' as const },
      { id: 'vehicles', label: String(c?.helpCategoryVehicles ?? ''), icon: 'car' as const },
    ];
  }, [t]);

  const startChat = () => {
    setScreenMode('chat');
    if (chatMessages.length === 0) {
      const greeting =
        (t.customer as Record<string, string | undefined> | undefined)
          ?.helpVirtualGreeting ??
        "Hi! 👋 I'm TechTrust's virtual assistant. How can I help you today?";
      setChatMessages([
        {
          id: '1',
          text: greeting,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    }
  };

  const sendMessage = (text?: string, responseHint?: BotResponseKey) => {
    const msg = (text ?? chatInput).trim();
    if (!msg) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: msg,
      sender: 'user',
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      let responseKey: BotResponseKey = responseHint ?? 'default';
      if (!responseHint) {
        const lower = msg.toLowerCase();
        if (lower.includes('quote') || lower.includes('service') || lower.includes('orçamento') || lower.includes('presupuesto') || lower.includes('orcamento')) {
          responseKey = 'quote';
        } else if (lower.includes('pay') || lower.includes('charge') || lower.includes('card') || lower.includes('pagamento') || lower.includes('pago')) {
          responseKey = 'payment';
        } else if (lower.includes('cancel') || lower.includes('cancelar')) {
          responseKey = 'cancel';
        } else if (lower.includes('account') || lower.includes('profile') || lower.includes('email') || lower.includes('conta') || lower.includes('cuenta')) {
          responseKey = 'account';
        } else if (lower.includes('human') || lower.includes('agent') || lower.includes('person') || lower.includes('talk') || lower.includes('humano') || lower.includes('pessoa')) {
          responseKey = 'human';
        }
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponses[responseKey],
        sender: responseKey === 'human' ? 'agent' : 'bot',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const renderChatMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    const isAgent = item.sender === 'agent';
    return (
      <View style={[chatStyles.msgRow, isUser && chatStyles.msgRowUser]}>
        {!isUser && (
          <View style={[chatStyles.avatar, isAgent && { backgroundColor: '#10b981' }]}>
            <Ionicons name={isAgent ? 'person' : 'chatbubble-ellipses'} size={14} color="#fff" />
          </View>
        )}
        <View style={[chatStyles.bubble, isUser ? chatStyles.bubbleUser : chatStyles.bubbleBot, isAgent && chatStyles.bubbleAgent]}>
          {isAgent && (
            <Text style={chatStyles.agentLabel}>
              {(t.customer as Record<string, string | undefined> | undefined)
                ?.helpSupportAgentLabel ?? 'Support Agent'}
            </Text>
          )}
          <Text style={[chatStyles.msgText, isUser && chatStyles.msgTextUser]}>{item.text}</Text>
          <Text style={[chatStyles.msgTime, isUser && chatStyles.msgTimeUser]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const handleBack = () => {
    if (fromDashboard) {
      navigation.navigate('Home', { screen: 'DashboardMain' });
    } else {
      navigation.goBack();
    }
  };

  const faqs = useMemo((): FAQItem[] => {
    const raw = (t as unknown as { helpCenterFaq?: FAQItem[] }).helpCenterFaq;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((item) => ({
        id: String(item.id),
        question: String(item.question),
        answer: String(item.answer),
        category: String(item.category),
      }));
    }
    return helpCenterFaqEn.map((item) => ({
      id: String(item.id),
      question: String(item.question),
      answer: String(item.answer),
      category: String(item.category),
    }));
  }, [t]);

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && (searchQuery === '' || matchesSearch);
  });

  const quickActions = (() => {
    const c = t.customer as Record<string, string | undefined> | undefined;
    const reportSubject = String(c?.helpReportIssueSubject ?? 'Report Issue');
    return [
      {
        id: 'contact' as const,
        title: String(c?.helpChatTitle ?? 'Live Chat'),
        subtitle: String(c?.helpQuickActionLiveSub ?? ''),
        icon: 'chatbubbles' as const,
        color: '#3b82f6',
        onPress: () => startChat(),
      },
      {
        id: 'report' as const,
        title: String(c?.helpQuickActionReportTitle ?? ''),
        subtitle: String(c?.helpQuickActionReportSub ?? ''),
        icon: 'warning' as const,
        color: '#f59e0b',
        onPress: () => navigation.navigate('SupportChat', { subject: reportSubject }),
      },
      {
        id: 'feedback' as const,
        title: String(c?.helpQuickActionFeedbackTitle ?? ''),
        subtitle: String(c?.helpQuickActionFeedbackSub ?? ''),
        icon: 'heart' as const,
        color: '#ec4899',
        onPress: () => navigation.navigate('RateApp'),
      },
    ];
  })();

  // ========= CHAT MODE =========
  if (screenMode === 'chat') {
    return (
      <SafeAreaView style={styles.container}>
        {/* Chat Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreenMode('help')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>
              {(t.customer as Record<string, string | undefined> | undefined)
                ?.helpChatTitle ?? 'Live Chat'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
              <Text style={{ fontSize: 12, color: '#10b981' }}>
                {t.common?.online ?? 'Online'}
              </Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Messages */}
          <FlatList
            ref={chatListRef}
            data={chatMessages}
            renderItem={renderChatMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={chatStyles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={
              isTyping ? (
                <View style={chatStyles.typingRow}>
                  <View style={chatStyles.avatar}>
                    <Ionicons name="chatbubble-ellipses" size={14} color="#fff" />
                  </View>
                  <View style={chatStyles.typingBubble}>
                    <Text style={chatStyles.typingDots}>●  ●  ●</Text>
                  </View>
                </View>
              ) : null
            }
          />

          {/* Quick Replies */}
          {chatMessages.length <= 2 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={chatStyles.quickReplies}
            >
              {quickReplyDefs.map((def, i) => (
                <TouchableOpacity
                  key={i}
                  style={chatStyles.quickReplyBtn}
                  onPress={() => sendMessage(def.label, def.key)}
                >
                  <Text style={chatStyles.quickReplyText}>{def.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Input */}
          <View style={chatStyles.inputBar}>
            <TextInput
              style={chatStyles.chatInput}
              placeholder={t.chat?.typeMessage || "Type a message..."}
              placeholderTextColor="#9ca3af"
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity
              style={[chatStyles.sendBtn, !chatInput.trim() && { opacity: 0.4 }]}
              onPress={() => sendMessage()}
              disabled={!chatInput.trim()}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ========= HELP MODE =========
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
                <Ionicons
                  name={action.icon as IoniconName}
                  size={24}
                  color={action.color}
                />
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
                name={category.icon as IoniconName} 
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
            onPress={() => startChat()}
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
    backgroundColor: '#2B5EA7',
    borderColor: '#2B5EA7',
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
    backgroundColor: '#2B5EA7',
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
    color: '#2B5EA7',
  },
});

const chatStyles = StyleSheet.create({
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  msgRowUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2B5EA7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleBot: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#2B5EA7',
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    backgroundColor: '#ecfdf5',
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  agentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 4,
  },
  msgText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 21,
  },
  msgTextUser: {
    color: '#fff',
  },
  msgTime: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'right',
  },
  msgTimeUser: {
    color: '#bfdbfe',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  typingBubble: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  typingDots: {
    fontSize: 14,
    color: '#9ca3af',
    letterSpacing: 2,
  },
  quickReplies: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  quickReplyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2B5EA7',
    backgroundColor: '#fff',
  },
  quickReplyText: {
    fontSize: 13,
    color: '#2B5EA7',
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#111827',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B5EA7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

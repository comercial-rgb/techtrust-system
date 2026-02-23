/**
 * SupportChatScreen - Chat with TechTrust Support
 * Phase 1: Show FAQ help topics to self-service
 * Phase 2: If still needs help → live support chat with admin
 * Each session generates a ticket ID (SUP-XXXXXX)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import api from '../services/api';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// FAQ TOPICS & ANSWERS
// ============================================

interface FaqItem {
  id: string;
  topic: string;
  icon: string;
  title: string;
  items: { q: string; a: string }[];
}

const FAQ_TOPICS: FaqItem[] = [
  {
    id: 'payments',
    topic: 'payments',
    icon: 'card-outline',
    title: 'Payments & Billing',
    items: [
      {
        q: 'How does payment work?',
        a: 'When you accept a quote, a pre-authorization hold is placed on your card for the service amount plus fees. The charge is only captured after you approve the completed service.',
      },
      {
        q: 'What fees are charged?',
        a: 'A 10% platform fee is added to the service total. Payment processing fee (2.9% + $0.30) also applies. You see the full breakdown before accepting any quote.',
      },
      {
        q: 'How do I get a refund?',
        a: 'You have 48 hours after service approval to request a refund. Go to Services → select the order → Request Refund. You can also choose a 10% bonus platform credit instead.',
      },
      {
        q: 'My payment failed, what do I do?',
        a: 'Check that your card is valid and has sufficient funds. Go to Profile → Payment Methods to update your card. If the issue persists, contact us below.',
      },
    ],
  },
  {
    id: 'services',
    topic: 'services',
    icon: 'construct-outline',
    title: 'Services & Quotes',
    items: [
      {
        q: 'How do I request a service?',
        a: 'Go to Dashboard → New Request. Select your vehicle, service type, location preference (shop/mobile/roadside), add a description, and submit. Providers will send quotes within 48 hours.',
      },
      {
        q: 'What is a mobile service?',
        a: 'Mobile service means the provider comes to your location. A travel/displacement fee may apply based on distance. You\'ll see this fee clearly in the quote breakdown.',
      },
      {
        q: 'How do I cancel a service?',
        a: 'Go to Services → select the order → Cancel. Cancellation fees depend on the stage: 0% before work starts, 10% after scheduling, 25% after work has begun.',
      },
      {
        q: 'My provider hasn\'t responded',
        a: 'Providers have 48 hours to respond to your request. If no quotes are received, the request expires and you can create a new one. You\'re never charged for expired requests.',
      },
    ],
  },
  {
    id: 'account',
    topic: 'account',
    icon: 'person-outline',
    title: 'Account & Profile',
    items: [
      {
        q: 'How do I update my information?',
        a: 'Go to Profile → Personal Info to update your name, email, or phone. Go to Profile → Addresses to manage your saved addresses.',
      },
      {
        q: 'How do I change my password?',
        a: 'Go to Profile → Personal Info → Change Password. You\'ll need to enter your current password and choose a new one.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Contact our support team below. Account deletion requires all active services to be completed and any outstanding payments settled first.',
      },
    ],
  },
  {
    id: 'vehicles',
    topic: 'vehicles',
    icon: 'car-outline',
    title: 'Vehicles',
    items: [
      {
        q: 'How do I add a vehicle?',
        a: 'Go to Vehicles tab → Add Vehicle. Enter the VIN for automatic detection, or manually enter make, model, and year. You can also scan your license plate.',
      },
      {
        q: 'Can I transfer a vehicle?',
        a: 'Yes! Go to Vehicles → select vehicle → Transfer. Enter the new owner\'s email. They\'ll receive a notification to accept the transfer.',
      },
    ],
  },
  {
    id: 'technical',
    topic: 'technical',
    icon: 'phone-portrait-outline',
    title: 'Technical Issues',
    items: [
      {
        q: 'The app is running slow',
        a: 'Try closing and reopening the app. Make sure you\'re on the latest version. Clear the app cache in your device settings if the problem persists.',
      },
      {
        q: 'I\'m not receiving notifications',
        a: 'Check that notifications are enabled in your device settings for TechTrust. Also verify in Profile → your notification preferences are turned on.',
      },
    ],
  },
];

// ============================================
// TYPES
// ============================================

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support' | 'system';
  timestamp: string;
  isRead?: boolean;
}

type ScreenPhase = 'topics' | 'faq_detail' | 'chat';

export default function SupportChatScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const initialSubject = route?.params?.subject || '';

  // Phase control
  const [phase, setPhase] = useState<ScreenPhase>('topics');
  const [selectedTopic, setSelectedTopic] = useState<FaqItem | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTickets, setActiveTickets] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);

  // Load active tickets on mount
  useEffect(() => {
    loadActiveTickets();
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // If came with a preset subject, go directly to chat
  useEffect(() => {
    if (initialSubject) {
      startLiveChat('other', initialSubject);
    }
  }, [initialSubject]);

  const loadActiveTickets = async () => {
    try {
      const { data } = await api.get('/support/tickets?status=OPEN');
      if (data.success && data.data.length > 0) {
        setActiveTickets(data.data);
      }
    } catch (e) {
      // Silently fail — not critical
    }
  };

  // ============================================
  // START LIVE CHAT
  // ============================================

  const startLiveChat = async (topic: string, subject?: string) => {
    setLoading(true);
    try {
      // Get user's language
      const userDataStr = await AsyncStorage.getItem('@TechTrust:userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : {};
      const language = userData.language?.toLowerCase() || 'en';

      const { data } = await api.post('/support/tickets', {
        topic,
        subject: subject || `Help with ${topic}`,
        message: subject || `I need help with ${topic}`,
        language,
      });

      if (data.success) {
        const ticket = data.data;
        setTicketId(ticket.id);
        setTicketNumber(ticket.ticketNumber);
        setPhase('chat');

        // Add system welcome + existing messages
        const initialMessages: Message[] = [
          {
            id: 'system-welcome',
            text: `Support ticket ${ticket.ticketNumber} created. An agent will respond shortly.`,
            sender: 'system',
            timestamp: new Date().toISOString(),
          },
        ];

        if (ticket.messages) {
          for (const msg of ticket.messages) {
            initialMessages.push({
              id: msg.id,
              text: msg.message,
              sender: msg.senderRole === 'CLIENT' ? 'user' : 'support',
              timestamp: msg.createdAt,
              isRead: msg.isRead,
            });
          }
        }

        setMessages(initialMessages);
        connectSocket(ticket.id);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create support ticket');
    } finally {
      setLoading(false);
    }
  };

  // Resume existing ticket
  const resumeTicket = async (ticket: any) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/support/tickets/${ticket.id}`);
      if (data.success) {
        const detail = data.data;
        setTicketId(detail.id);
        setTicketNumber(detail.ticketNumber);
        setPhase('chat');

        const msgs: Message[] = [
          {
            id: 'system-resume',
            text: `Resumed ticket ${detail.ticketNumber}`,
            sender: 'system',
            timestamp: new Date().toISOString(),
          },
        ];

        for (const msg of detail.messages) {
          msgs.push({
            id: msg.id,
            text: msg.message,
            sender: msg.senderRole === 'CLIENT' ? 'user' : 'support',
            timestamp: msg.createdAt,
            isRead: msg.isRead,
          });
        }

        setMessages(msgs);
        connectSocket(detail.id);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SOCKET CONNECTION
  // ============================================

  const connectSocket = useCallback(async (tId: string) => {
    try {
      const token = await AsyncStorage.getItem('@TechTrust:token');
      const userDataStr = await AsyncStorage.getItem('@TechTrust:userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : {};
      
      const baseUrl = api.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:3000';
      const socket = io(baseUrl, { transports: ['websocket'] });

      socket.on('connect', () => {
        socket.emit('join', userData.id);
      });

      socket.on('support_message', (data: any) => {
        if (data.ticketId === tId && data.message) {
          const msg = data.message;
          setMessages(prev => [...prev, {
            id: msg.id || Date.now().toString(),
            text: msg.message,
            sender: msg.senderRole === 'CLIENT' ? 'user' : 'support',
            timestamp: msg.createdAt || new Date().toISOString(),
          }]);
          setIsTyping(false);
        }
      });

      socketRef.current = socket;
    } catch (e) {
      // Socket connection optional — REST fallback works
    }
  }, []);

  // ============================================
  // SEND MESSAGE
  // ============================================

  const sendMessage = async () => {
    if (!inputText.trim() || !ticketId) return;

    const text = inputText.trim();
    setInputText('');

    // Optimistic add
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: tempId,
      text,
      sender: 'user',
      timestamp: new Date().toISOString(),
    }]);

    try {
      await api.post(`/support/tickets/${ticketId}/messages`, { message: text });
    } catch (error) {
      // Message was already added optimistically
    }
  };

  // ============================================
  // FORMAT HELPERS
  // ============================================

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // ============================================
  // RENDER: TOPICS PHASE
  // ============================================

  const renderTopicsPhase = () => (
    <FlatList
      data={[]}
      renderItem={() => null}
      ListHeaderComponent={
        <View style={styles.topicsContainer}>
          {/* Active tickets banner */}
          {activeTickets.length > 0 && (
            <View style={styles.activeTicketBanner}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#2B5EA7" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.activeTicketTitle}>Active Support Tickets</Text>
                {activeTickets.map((ticket) => (
                  <TouchableOpacity
                    key={ticket.id}
                    style={styles.activeTicketItem}
                    onPress={() => resumeTicket(ticket)}
                  >
                    <Text style={styles.activeTicketNumber}>{ticket.ticketNumber}</Text>
                    <Text style={styles.activeTicketSubject} numberOfLines={1}>{ticket.subject}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.topicsTitle}>How can we help you?</Text>
          <Text style={styles.topicsSubtitle}>
            Browse topics below to find quick answers, or talk to our support team.
          </Text>

          {/* Topic Cards */}
          {FAQ_TOPICS.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={styles.topicCard}
              onPress={() => {
                setSelectedTopic(topic);
                setPhase('faq_detail');
              }}
            >
              <View style={styles.topicIcon}>
                <Ionicons name={topic.icon as any} size={24} color="#2B5EA7" />
              </View>
              <View style={styles.topicInfo}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicCount}>{topic.items.length} articles</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}

          {/* Talk to Human button */}
          <View style={styles.humanSection}>
            <Text style={styles.humanTitle}>Still need help?</Text>
            <Text style={styles.humanSubtitle}>
              Chat with our support team — we typically respond within minutes.
            </Text>
            <TouchableOpacity
              style={styles.humanBtn}
              onPress={() => startLiveChat('general', 'I need help from a support agent')}
            >
              <Ionicons name="chatbubbles" size={20} color="#fff" />
              <Text style={styles.humanBtnText}>Chat with Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    />
  );

  // ============================================
  // RENDER: FAQ DETAIL PHASE
  // ============================================

  const renderFaqDetailPhase = () => {
    if (!selectedTopic) return null;

    return (
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <View style={styles.faqContainer}>
            <View style={styles.faqHeader}>
              <View style={styles.faqHeaderIcon}>
                <Ionicons name={selectedTopic.icon as any} size={28} color="#2B5EA7" />
              </View>
              <Text style={styles.faqHeaderTitle}>{selectedTopic.title}</Text>
            </View>

            {selectedTopic.items.map((faq, index) => {
              const faqId = `${selectedTopic.id}-${index}`;
              const isExpanded = expandedFaq === faqId;
              return (
                <TouchableOpacity
                  key={faqId}
                  style={styles.faqItem}
                  onPress={() => setExpandedFaq(isExpanded ? null : faqId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqQuestion}>
                    <Text style={styles.faqQuestionText}>{faq.q}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#6b7280"
                    />
                  </View>
                  {isExpanded && (
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Didn't find answer */}
            <View style={styles.humanSection}>
              <Text style={styles.humanTitle}>Didn't find your answer?</Text>
              <TouchableOpacity
                style={styles.humanBtn}
                onPress={() => startLiveChat(selectedTopic.topic, `Help with ${selectedTopic.title}`)}
              >
                <Ionicons name="chatbubbles" size={20} color="#fff" />
                <Text style={styles.humanBtnText}>Chat with Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />
    );
  };

  // ============================================
  // RENDER: CHAT PHASE
  // ============================================

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.sender === 'system') {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }

    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        {!isUser && (
          <View style={styles.supportAvatar}>
            <Ionicons name="headset" size={16} color="#fff" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.supportBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderChatPhase = () => (
    <>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.keyboardAvoid}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, inputText.trim() && styles.sendBtnActive]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#fff' : '#9ca3af'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  const getHeaderTitle = () => {
    if (phase === 'chat' && ticketNumber) return `Support • ${ticketNumber}`;
    if (phase === 'faq_detail' && selectedTopic) return selectedTopic.title;
    return 'Help & Support';
  };

  const handleBack = () => {
    if (phase === 'chat') {
      Alert.alert(
        'Leave Chat',
        'Your ticket will remain open. You can resume it anytime from the support screen.',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave',
            onPress: () => {
              socketRef.current?.disconnect();
              setPhase('topics');
              setTicketId(null);
              setMessages([]);
              loadActiveTickets();
            },
          },
        ],
      );
      return;
    }
    if (phase === 'faq_detail') {
      setPhase('topics');
      setSelectedTopic(null);
      setExpandedFaq(null);
      return;
    }
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B5EA7" />
          <Text style={styles.loadingText}>Creating support ticket...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{getHeaderTitle()}</Text>
          {phase === 'chat' && (
            <Text style={styles.headerSubtitle}>
              {isTyping ? 'Agent is typing...' : 'Support team'}
            </Text>
          )}
        </View>
        {phase === 'chat' && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        )}
      </View>

      {/* Content */}
      {phase === 'topics' && renderTopicsPhase()}
      {phase === 'faq_detail' && renderFaqDetailPhase()}
      {phase === 'chat' && renderChatPhase()}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardAvoid: {
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#6b7280',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#10b981',
    marginTop: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },

  // Topics Phase
  topicsContainer: {
    padding: 20,
  },
  topicsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  topicsSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 21,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  topicCount: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },

  // Active tickets
  activeTicketBanner: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  activeTicketTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B5EA7',
    marginBottom: 6,
  },
  activeTicketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  activeTicketNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  activeTicketSubject: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },

  // Human section
  humanSection: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  humanTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  humanSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  humanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B5EA7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  humanBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // FAQ detail
  faqContainer: {
    padding: 20,
  },
  faqHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  faqHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  faqHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 21,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },

  // Chat Phase
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  supportAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2B5EA7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '78%',
    padding: 12,
    borderRadius: 16,
  },
  supportBubble: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#2B5EA7',
    borderTopRightRadius: 4,
    marginLeft: 'auto',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#374151',
  },
  userMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'right',
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 12,
  },
  systemMessageText: {
    fontSize: 12,
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    textAlign: 'center',
    overflow: 'hidden',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#2B5EA7',
  },
});

/**
 * SupportChatScreen - Chat with TechTrust Support
 * Phase 1: Show FAQ help topics to self-service
 * Phase 2: If still needs help → live support chat with admin
 * Each session generates a ticket ID (SUP-XXXXXX)
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ComponentProps,
} from 'react';
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
import { interpolate } from '../i18n/interpolate';
import supportChatEn from '../i18n/locales/fragments/supportChat.en';
import api from '../services/api';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupportChatScreenProps } from "../navigation/types";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

// ============================================
// FAQ TOPICS & ANSWERS
// ============================================

interface FaqItem {
  id: string;
  topic: string;
  icon: IoniconName;
  title: string;
  items: { q: string; a: string }[];
}

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

export default function SupportChatScreen({
  navigation,
  route,
}: SupportChatScreenProps) {
  const { t, formatTime } = useI18n();
  const sc = t.supportChat ?? supportChatEn;
  const faqTopics = useMemo((): FaqItem[] => {
    const raw = sc.faqTopics ?? supportChatEn.faqTopics;
    return raw as FaqItem[];
  }, [t]);
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

      const subjectLine =
        subject ||
        interpolate(sc?.helpWithTopicSlug || supportChatEn.helpWithTopicSlug, {
          topic,
        });
      const messageLine =
        subject ||
        interpolate(sc?.needHelpWithTopicSlug || supportChatEn.needHelpWithTopicSlug, {
          topic,
        });

      const { data } = await api.post('/support/tickets', {
        topic,
        subject: subjectLine,
        message: messageLine,
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
            text: interpolate(
              sc?.ticketCreatedBody || supportChatEn.ticketCreatedBody,
              { ticketNumber: ticket.ticketNumber },
            ),
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
      Alert.alert(
        t.common?.error || 'Error',
        error.response?.data?.message || t.chat?.ticketCreateFailed || 'Failed to create support ticket',
      );
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
            text: interpolate(
              sc?.resumeTicketBody || supportChatEn.resumeTicketBody,
              { ticketNumber: detail.ticketNumber },
            ),
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
      Alert.alert(t.common?.error || 'Error', t.chat?.ticketLoadFailed || 'Failed to load ticket');
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
                <Text style={styles.activeTicketTitle}>
                  {sc?.activeTicketsTitle || supportChatEn.activeTicketsTitle}
                </Text>
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

          <Text style={styles.topicsTitle}>
            {sc?.topicsTitle || supportChatEn.topicsTitle}
          </Text>
          <Text style={styles.topicsSubtitle}>
            {sc?.topicsSubtitle || supportChatEn.topicsSubtitle}
          </Text>

          {/* Topic Cards */}
          {faqTopics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={styles.topicCard}
              onPress={() => {
                setSelectedTopic(topic);
                setPhase('faq_detail');
              }}
            >
              <View style={styles.topicIcon}>
                <Ionicons name={topic.icon} size={24} color="#2B5EA7" />
              </View>
              <View style={styles.topicInfo}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicCount}>
                  {interpolate(sc?.articlesCount || supportChatEn.articlesCount, {
                    count: topic.items.length,
                  })}
                </Text>
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
                <Ionicons name={selectedTopic.icon} size={28} color="#2B5EA7" />
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
              <Text style={styles.humanTitle}>
                {sc?.didntFindAnswerTitle || supportChatEn.didntFindAnswerTitle}
              </Text>
              <TouchableOpacity
                style={styles.humanBtn}
                onPress={() =>
                  startLiveChat(
                    selectedTopic.topic,
                    interpolate(
                      sc?.liveChatSubjectWithTopic ||
                        supportChatEn.liveChatSubjectWithTopic,
                      { topicTitle: selectedTopic.title },
                    ),
                  )
                }
              >
                <Ionicons name="chatbubbles" size={20} color="#fff" />
                <Text style={styles.humanBtnText}>
                  {sc?.chatWithSupportBtn || supportChatEn.chatWithSupportBtn}
                </Text>
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
            placeholder={t.chat?.typeMessage || "Type a message..."}
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
    if (phase === 'chat' && ticketNumber) {
      return interpolate(sc?.headerWithTicket || supportChatEn.headerWithTicket, {
        prefix: sc?.supportHeaderPrefix || supportChatEn.supportHeaderPrefix,
        ticketNumber,
      });
    }
    if (phase === 'faq_detail' && selectedTopic) return selectedTopic.title;
    return sc?.screenTitle || supportChatEn.screenTitle;
  };

  const handleBack = () => {
    if (phase === 'chat') {
      Alert.alert(
        sc?.leaveChatTitle || supportChatEn.leaveChatTitle,
        sc?.leaveChatBody || supportChatEn.leaveChatBody,
        [
          { text: sc?.stay || supportChatEn.stay, style: 'cancel' },
          {
            text: sc?.leave || supportChatEn.leave,
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
          <Text style={styles.headerTitle}>
            {sc?.screenTitle || supportChatEn.screenTitle}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B5EA7" />
          <Text style={styles.loadingText}>
            {sc?.creatingTicket || supportChatEn.creatingTicket}
          </Text>
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
              {isTyping
                ? sc?.agentTyping || supportChatEn.agentTyping
                : sc?.supportTeamSubtitle || supportChatEn.supportTeamSubtitle}
            </Text>
          )}
        </View>
        {phase === 'chat' && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              {sc?.liveBadge || supportChatEn.liveBadge}
            </Text>
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

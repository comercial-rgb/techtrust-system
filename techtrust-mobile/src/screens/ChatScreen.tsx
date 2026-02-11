/**
 * ChatScreen - Chat between Customers and Providers
 * Real-time messaging interface
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { useNotifications } from '../contexts/NotificationsContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  isOwn: boolean;
  status: 'sent' | 'delivered' | 'read';
}

interface ChatParticipant {
  id: string;
  name: string;
  role: 'customer' | 'provider';
  avatar?: string;
  isOnline: boolean;
}

export default function ChatScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const { markMessagesAsRead: markMessagesAsReadGlobal } = useNotifications();
  const { chatId, requestId, participant, conversationId: paramConversationId, serviceRequestId } = route.params || {};
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  const [chatParticipant] = useState<ChatParticipant>({
    id: participant?.id || '',
    name: participant?.name || t.chat?.participant || 'Participant',
    role: participant?.role || 'provider',
    isOnline: participant?.isOnline ?? false,
  });
  
  const [showUserModal, setShowUserModal] = useState(false);

  // User profile data from route params
  const [userProfile] = useState({
    id: participant?.id || '',
    name: participant?.name || t.chat?.participant || 'Participant',
    role: participant?.role || 'provider',
    phone: participant?.phone || '',
    email: participant?.email || '',
    address: participant?.address || '',
    rating: participant?.rating || 0,
    totalServices: participant?.totalServices || 0,
    memberSince: participant?.memberSince || '',
    verified: participant?.verified || false,
  });

  useEffect(() => {
    initChat();
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  async function initChat() {
    try {
      const userDataStr = await AsyncStorage.getItem('@TechTrust:userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : {};
      setCurrentUserId(userData.id || '');

      // Connect socket
      const baseUrl = api.defaults.baseURL?.replace('/api/v1', '') || '';
      if (!baseUrl) return;
      const socket = io(baseUrl, { transports: ['websocket'] });
      socket.on('connect', () => {
        socket.emit('join', userData.id);
      });
      socket.on('receive_message', (data: any) => {
        if (data.fromUserId !== userData.id) {
          setMessages(prev => [...prev, {
            id: data.id || Date.now().toString(),
            text: data.message,
            senderId: data.fromUserId,
            senderName: chatParticipant.name,
            timestamp: data.createdAt || new Date().toISOString(),
            isOwn: false,
            status: 'delivered' as const,
          }]);
        }
      });
      socketRef.current = socket;
    } catch (e) {
      console.error('Socket init error:', e);
    }
    loadMessages();
  }

  // Mark all unread messages as read when chat opens
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages.length]);

  async function markMessagesAsRead() {
    // In production, this would call an API to mark messages as read
    // For now, we'll update local state
    setMessages(prev => 
      prev.map(msg => 
        !msg.isOwn && msg.status !== 'read' 
          ? { ...msg, status: 'read' as const }
          : msg
      )
    );
    
    // Update global notification badge count
    markMessagesAsReadGlobal(chatId);
  }

  function handleCall() {
    if (userProfile.phone) {
      Linking.openURL(`tel:${userProfile.phone}`);
    }
  }

  function handleWhatsApp() {
    if (userProfile.phone) {
      const phone = userProfile.phone.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  }

  function handleViewProfile() {
    setShowUserModal(true);
  }

  function handleBlockUser() {
    Alert.alert(
      t.chat?.blockUser || 'Block User',
      t.chat?.blockUserConfirm || 'Are you sure you want to block this user?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        { 
          text: t.chat?.block || 'Block', 
          style: 'destructive',
          onPress: () => {
            // API call to block user
            Alert.alert(t.common?.success || 'Success', t.chat?.userBlocked || 'User has been blocked');
            navigation.goBack();
          }
        },
      ]
    );
  }

  function handleReportUser() {
    Alert.alert(
      t.chat?.reportUser || 'Report User',
      t.chat?.reportUserMessage || 'What would you like to report?',
      [
        { text: t.chat?.spam || 'Spam', onPress: () => submitReport('spam') },
        { text: t.chat?.inappropriate || 'Inappropriate', onPress: () => submitReport('inappropriate') },
        { text: t.chat?.fraud || 'Fraud', onPress: () => submitReport('fraud') },
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
      ]
    );
  }

  function submitReport(type: string) {
    // API call to submit report
    Alert.alert(t.common?.success || 'Success', t.chat?.reportSubmitted || 'Your report has been submitted. We will review it shortly.');
  }

  async function loadMessages() {
    try {
      const convId = paramConversationId || chatId;
      if (convId) {
        const { data } = await api.get(`/chat/conversations/${convId}`);
        if (data.success && data.data) {
          const userDataStr = await AsyncStorage.getItem('@TechTrust:userData');
          const userData = userDataStr ? JSON.parse(userDataStr) : {};
          const mapped = data.data.map((m: any) => ({
            id: m.id,
            text: m.message,
            senderId: m.fromUserId,
            senderName: m.fromUser?.fullName || '',
            timestamp: m.createdAt,
            isOwn: m.fromUserId === userData.id,
            status: m.isRead ? 'read' as const : 'delivered' as const,
          }));
          setMessages(mapped);
        }
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function formatDateHeader(timestamp: string) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t.common.today || 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t.common.yesterday || 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  async function handleSend() {
    if (!inputText.trim()) return;
    const text = inputText.trim();

    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      senderId: currentUserId,
      senderName: 'You',
      timestamp: new Date().toISOString(),
      isOwn: true,
      status: 'sent',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      await api.post('/chat/messages', {
        toUserId: participant?.id,
        message: text,
        serviceRequestId: serviceRequestId || requestId || undefined,
      });
      setMessages(prev =>
        prev.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' as const } : m)
      );
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'sent': return 'checkmark';
      case 'delivered': return 'checkmark-done';
      case 'read': return 'checkmark-done';
      default: return 'checkmark';
    }
  }

  function renderMessage({ item, index }: { item: Message; index: number }) {
    const showDateHeader = index === 0 || 
      formatDateHeader(item.timestamp) !== formatDateHeader(messages[index - 1].timestamp);

    return (
      <View>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{formatDateHeader(item.timestamp)}</Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          item.isOwn ? styles.ownMessage : styles.otherMessage
        ]}>
          <View style={[
            styles.messageBubble,
            item.isOwn ? styles.ownBubble : styles.otherBubble
          ]}>
            <Text style={[
              styles.messageText,
              item.isOwn ? styles.ownMessageText : styles.otherMessageText
            ]}>
              {item.text}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                item.isOwn ? styles.ownMessageTime : styles.otherMessageTime
              ]}>
                {formatTime(item.timestamp)}
              </Text>
              {item.isOwn && (
                <Ionicons 
                  name={getStatusIcon(item.status) as any} 
                  size={14} 
                  color={item.status === 'read' ? '#1976d2' : '#bfdbfe'} 
                  style={styles.statusIcon}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={handleViewProfile}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="business" size={20} color="#1976d2" />
            </View>
            {chatParticipant.isOnline && <View style={styles.onlineIndicator} />}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{chatParticipant.name}</Text>
            <Text style={styles.headerStatus}>
              {chatParticipant.isOnline ? (t.chat?.online || 'Online') : (t.chat?.offline || 'Offline')}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction} onPress={handleCall}>
          <Ionicons name="call-outline" size={22} color="#1976d2" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={22} color="#25d366" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction} onPress={handleViewProfile}>
          <Ionicons name="person-circle-outline" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions Banner */}
      <View style={styles.quickActionsBanner}>
        <TouchableOpacity style={styles.quickActionBtn} onPress={handleViewProfile}>
          <Ionicons name="person" size={16} color="#1976d2" />
          <Text style={styles.quickActionText}>{t.chat?.viewProfile || 'Profile'}</Text>
        </TouchableOpacity>
        <View style={styles.quickActionDivider} />
        <TouchableOpacity style={styles.quickActionBtn} onPress={handleReportUser}>
          <Ionicons name="flag" size={16} color="#f59e0b" />
          <Text style={styles.quickActionText}>{t.chat?.report || 'Report'}</Text>
        </TouchableOpacity>
        <View style={styles.quickActionDivider} />
        <TouchableOpacity style={styles.quickActionBtn} onPress={handleBlockUser}>
          <Ionicons name="ban" size={16} color="#ef4444" />
          <Text style={styles.quickActionText}>{t.chat?.block || 'Block'}</Text>
        </TouchableOpacity>
      </View>

      {/* Request Info Banner */}
      {requestId && (
        <TouchableOpacity 
          style={styles.requestBanner}
          onPress={() => navigation.navigate('RequestDetails', { requestId })}
        >
          <Ionicons name="document-text-outline" size={18} color="#1976d2" />
          <Text style={styles.requestBannerText}>
            {t.chat.relatedToRequest || 'Related to: Service Request'} #{requestId}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#1976d2" />
        </TouchableOpacity>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach" size={24} color="#6b7280" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t.chat?.typeMessage || 'Type a message...'}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
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

      {/* User Profile Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.chat?.userProfile || 'User Profile'}</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileSection}>
              <View style={styles.profileAvatar}>
                <Ionicons name="business" size={40} color="#1976d2" />
              </View>
              <Text style={styles.profileName}>{userProfile.name}</Text>
              {userProfile.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#10b981" />
                  <Text style={styles.verifiedText}>{t.common?.verified || 'Verified'}</Text>
                </View>
              )}
            </View>

            <View style={styles.profileStats}>
              <View style={styles.profileStat}>
                <Text style={styles.statValue}>{userProfile.rating}</Text>
                <Text style={styles.statLabel}>{t.common?.rating || 'Rating'}</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStat}>
                <Text style={styles.statValue}>{userProfile.totalServices}</Text>
                <Text style={styles.statLabel}>{t.common?.services || 'Services'}</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStat}>
                <Text style={styles.statValue}>{userProfile.memberSince}</Text>
                <Text style={styles.statLabel}>{t.profile?.since || 'Since'}</Text>
              </View>
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="call" size={18} color="#6b7280" />
                <Text style={styles.infoText}>{userProfile.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="mail" size={18} color="#6b7280" />
                <Text style={styles.infoText}>{userProfile.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={18} color="#6b7280" />
                <Text style={styles.infoText}>{userProfile.address}</Text>
              </View>
            </View>

            <View style={styles.profileActions}>
              <TouchableOpacity style={styles.profileActionBtn} onPress={() => { setShowUserModal(false); handleCall(); }}>
                <Ionicons name="call" size={20} color="#1976d2" />
                <Text style={styles.profileActionText}>{t.common?.call || 'Call'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileActionBtn} onPress={() => { setShowUserModal(false); handleWhatsApp(); }}>
                <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
                <Text style={[styles.profileActionText, { color: '#25d366' }]}>WhatsApp</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.closeModalBtn} 
              onPress={() => setShowUserModal(false)}
            >
              <Text style={styles.closeModalText}>{t.common?.close || 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerText: {
    marginLeft: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerStatus: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  headerAction: {
    padding: 8,
  },
  requestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    gap: 8,
  },
  requestBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '500',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginBottom: 8,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#1976d2',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#111827',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: '#bfdbfe',
  },
  otherMessageTime: {
    color: '#9ca3af',
  },
  statusIcon: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  // Quick Actions Banner
  quickActionsBanner: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  quickActionDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#e5e7eb',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  profileStats: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  profileInfo: {
    gap: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  profileActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  profileActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
  closeModalBtn: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

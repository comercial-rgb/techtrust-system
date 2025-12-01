/**
 * ChatScreen - Chat between Customers and Providers
 * Real-time messaging interface
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';

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
  const { chatId, requestId, participant } = route.params || {};
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  
  const [chatParticipant] = useState<ChatParticipant>({
    id: participant?.id || '1',
    name: participant?.name || 'AutoCare Plus',
    role: 'provider',
    isOnline: true,
  });

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock messages
      setMessages([
        {
          id: '1',
          text: 'Hi! I saw your service request for brake inspection. I can help you with that.',
          senderId: '1',
          senderName: 'AutoCare Plus',
          timestamp: '2024-11-30T10:00:00Z',
          isOwn: false,
          status: 'read',
        },
        {
          id: '2',
          text: 'Great! When would be a good time to bring in the car?',
          senderId: 'me',
          senderName: 'You',
          timestamp: '2024-11-30T10:02:00Z',
          isOwn: true,
          status: 'read',
        },
        {
          id: '3',
          text: 'We have availability tomorrow morning at 9 AM or afternoon at 2 PM. Which works better for you?',
          senderId: '1',
          senderName: 'AutoCare Plus',
          timestamp: '2024-11-30T10:05:00Z',
          isOwn: false,
          status: 'read',
        },
        {
          id: '4',
          text: '2 PM works perfectly for me.',
          senderId: 'me',
          senderName: 'You',
          timestamp: '2024-11-30T10:08:00Z',
          isOwn: true,
          status: 'read',
        },
        {
          id: '5',
          text: 'Perfect! I\'ll schedule you for 2 PM tomorrow. Please bring your vehicle to our location at 123 Main Street. See you then!',
          senderId: '1',
          senderName: 'AutoCare Plus',
          timestamp: '2024-11-30T10:10:00Z',
          isOwn: false,
          status: 'read',
        },
      ]);
    } catch (error) {
      console.error('Error loading messages:', error);
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

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      senderId: 'me',
      senderName: 'You',
      timestamp: new Date().toISOString(),
      isOwn: true,
      status: 'sent',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate message delivery
    setTimeout(() => {
      setMessages(prev => 
        prev.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m)
      );
    }, 1000);
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="business" size={20} color="#1976d2" />
            </View>
            {chatParticipant.isOnline && <View style={styles.onlineIndicator} />}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{chatParticipant.name}</Text>
            <Text style={styles.headerStatus}>
              {chatParticipant.isOnline ? (t.chat.online || 'Online') : (t.chat.offline || 'Offline')}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call-outline" size={22} color="#1976d2" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="ellipsis-vertical" size={22} color="#6b7280" />
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach" size={24} color="#6b7280" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t.chat.typeMessage || 'Type a message...'}
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
});

/**
 * SupportChatScreen - Chat with TechTrust Support
 * Direct chat with support team
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { logos } from '../constants/images';
import { useI18n } from '../i18n';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

export default function SupportChatScreen({ navigation }: any) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let isMounted = true;
    let innerTimer: ReturnType<typeof setTimeout> | undefined;
    
    // Load initial messages
    setMessages([
      {
        id: '1',
        text: 'Hello! Welcome to TechTrust Support. How can I help you today?',
        sender: 'support',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ]);

    // Simulate support typing after initial load
    const timer = setTimeout(() => {
      if (!isMounted) return;
      setIsTyping(true);
      innerTimer = setTimeout(() => {
        if (!isMounted) return;
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: '2',
          text: 'Feel free to ask any questions about our services, payments, or how to use the app.',
          sender: 'support',
          timestamp: new Date().toISOString(),
        }]);
      }, 2000);
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (innerTimer) clearTimeout(innerTimer);
    };
  }, []);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Simulate support response
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const supportResponses = [
          "Thank you for reaching out! I'll look into that for you.",
          "I understand your concern. Let me help you with that.",
          "Great question! Here's what you need to know...",
          "I'm checking on this for you. One moment please.",
        ];
        const randomResponse = supportResponses[Math.floor(Math.random() * supportResponses.length)];
        
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: randomResponse,
          sender: 'support',
          timestamp: new Date().toISOString(),
        }]);
      }, 1500 + Math.random() * 1500);
    }, 500);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';

    return (
      <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        {!isUser && (
          <Image source={logos.noText} style={styles.supportAvatarImage} />
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.supportBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>
              {formatTime(item.timestamp)}
            </Text>
            {isUser && item.status && (
              <Ionicons 
                name={item.status === 'read' ? 'checkmark-done' : 'checkmark'} 
                size={14} 
                color={item.status === 'read' ? '#60a5fa' : '#fff'} 
                style={styles.statusIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.supportInfo}>
            <Image source={logos.noText} style={styles.headerAvatarImage} />
            <View>
              <Text style={styles.headerTitle}>{t.chat.techTrustSupport || 'TechTrust Support'}</Text>
              <Text style={styles.headerSubtitle}>
                {isTyping ? (t.chat.typing || 'Typing...') : (t.chat.onlineRepliesInstantly || 'Online • Usually replies instantly')}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionBtn}>
          <Ionicons name="card-outline" size={16} color="#1976d2" />
          <Text style={styles.quickActionText}>{t.nav.payments || 'Payments'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBtn}>
          <Ionicons name="document-text-outline" size={16} color="#1976d2" />
          <Text style={styles.quickActionText}>{t.nav.quotes || 'Quotes'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBtn}>
          <Ionicons name="settings-outline" size={16} color="#1976d2" />
          <Text style={styles.quickActionText}>{t.nav.account || 'Account'}</Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingContainer}>
              <Image source={logos.noText} style={styles.supportAvatarImage} />
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>
            </View>
          ) : null
        }
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="attach" size={24} color="#6b7280" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t.chat.typeMessage || 'Type a message...'}
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
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
  headerContent: {
    flex: 1,
  },
  supportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#10b981',
    marginTop: 1,
  },
  menuBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    gap: 6,
  },
  quickActionText: {
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '500',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  supportAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  supportAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  messageBubble: {
    maxWidth: '75%',
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
    backgroundColor: '#1976d2',
    borderTopRightRadius: 4,
    marginLeft: 'auto',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#374151',
  },
  userMessageText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  statusIcon: {
    marginLeft: 4,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  typingBubble: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9ca3af',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  attachBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#1976d2',
  },
});

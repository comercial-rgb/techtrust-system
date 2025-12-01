/**
 * ContactUsScreen - Fale Conosco (Chat com Suporte)
 */

import React, { useState, useRef, useEffect } from 'react';
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
import { useI18n } from '../../i18n';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

export default function ContactUsScreen({ navigation }: any) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Initial welcome message
    setMessages([
      {
        id: '1',
        text: 'Hi! 👋 Welcome to TechTrust Support. How can I help you today?',
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const quickReplies = [
    'I have a payment issue',
    'Need help with a service',
    'Account problem',
    'Other question',
  ];

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate agent typing
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      
      const responses = [
        'Thank you for reaching out! Let me look into that for you.',
        'I understand your concern. Can you please provide more details?',
        'I\'m here to help! Let me check our system for more information.',
        'That\'s a great question! Here\'s what I can tell you...',
      ];

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responses[Math.floor(Math.random() * responses.length)],
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, agentMessage]);
    }, 1500);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessageContainer : styles.agentMessageContainer,
    ]}>
      {!item.isUser && (
        <View style={styles.agentAvatar}>
          <Ionicons name="headset" size={16} color="#1976d2" />
        </View>
      )}
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.agentBubble,
      ]}>
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userMessageText : styles.agentMessageText,
        ]}>
          {item.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            item.isUser && styles.userMessageTime,
          ]}>
            {formatTime(item.timestamp)}
          </Text>
          {item.isUser && item.status && (
            <Ionicons 
              name={item.status === 'read' ? 'checkmark-done' : 'checkmark'} 
              size={14} 
              color={item.status === 'read' ? '#60a5fa' : '#bfdbfe'} 
            />
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Ionicons name="headset" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>{t.customer?.techtrustSupport || 'TechTrust Support'}</Text>
            <View style={styles.statusContainer}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>{t.common?.online || 'Online'}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
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
                <View style={styles.agentAvatar}>
                  <Ionicons name="headset" size={16} color="#1976d2" />
                </View>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDots}>
                    <View style={[styles.typingDot, styles.typingDot1]} />
                    <View style={[styles.typingDot, styles.typingDot2]} />
                    <View style={[styles.typingDot, styles.typingDot3]} />
                  </View>
                </View>
              </View>
            ) : null
          }
        />

        {/* Quick Replies */}
        {messages.length <= 2 && (
          <View style={styles.quickRepliesContainer}>
            <Text style={styles.quickRepliesTitle}>{t.customer?.quickReplies || 'Quick Replies'}</Text>
            <View style={styles.quickReplies}>
              {quickReplies.map((reply, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickReplyButton}
                  onPress={() => sendMessage(reply)}
                >
                  <Text style={styles.quickReplyText}>{reply}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach" size={24} color="#6b7280" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t.customer?.typeMessage || 'Type a message...'}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              inputText.trim() && styles.sendButtonActive,
            ]}
            onPress={() => sendMessage(inputText)}
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
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 12,
    color: '#10b981',
  },
  menuBtn: {
    padding: 8,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  agentMessageContainer: {
    justifyContent: 'flex-start',
  },
  agentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: '#1976d2',
    borderBottomRightRadius: 4,
  },
  agentBubble: {
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
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  agentMessageText: {
    color: '#111827',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  userMessageTime: {
    color: '#bfdbfe',
  },
  typingContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typingBubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9ca3af',
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  quickRepliesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  quickRepliesTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  quickReplies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickReplyButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1976d2',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickReplyText: {
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
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
    fontSize: 15,
    maxHeight: 100,
    color: '#111827',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#1976d2',
  },
});

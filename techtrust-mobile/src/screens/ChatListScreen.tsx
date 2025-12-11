/**
 * ChatListScreen - List of Conversations
 * Shows all chats between customer and providers
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { FadeInView } from '../components/Animated';
import { useI18n } from '../i18n';

interface ChatPreview {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: 'customer' | 'provider';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  relatedRequest?: {
    id: string;
    title: string;
  };
}

export default function ChatListScreen({ navigation }: any) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState<ChatPreview[]>([]);

  // Reload chats every time the screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  async function loadChats() {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock chats
      setChats([
        {
          id: '1',
          participantId: 'p1',
          participantName: 'AutoCare Plus',
          participantRole: 'provider',
          lastMessage: 'Perfect! I\'ll schedule you for 2 PM tomorrow.',
          lastMessageTime: '2024-11-30T10:10:00Z',
          unreadCount: 0,
          isOnline: true,
          relatedRequest: {
            id: 'SR-2024-001',
            title: 'Brake Inspection',
          },
        },
        {
          id: '2',
          participantId: 'p2',
          participantName: 'Quick Lube Express',
          participantRole: 'provider',
          lastMessage: 'Your oil change is complete. The car is ready for pickup.',
          lastMessageTime: '2024-11-29T15:30:00Z',
          unreadCount: 2,
          isOnline: false,
          relatedRequest: {
            id: 'SR-2024-002',
            title: 'Oil Change',
          },
        },
        {
          id: '3',
          participantId: 'p3',
          participantName: 'Discount Tire',
          participantRole: 'provider',
          lastMessage: 'We have the tires in stock. Would you like to schedule the installation?',
          lastMessageTime: '2024-11-28T09:15:00Z',
          unreadCount: 1,
          isOnline: true,
        },
      ]);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (days === 1) {
      return t.common.yesterday || 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  }

  function markChatAsRead(chatId: string) {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      )
    );
  }

  function renderChat({ item, index }: { item: ChatPreview; index: number }) {
    return (
      <FadeInView delay={index * 50}>
        <TouchableOpacity
          style={styles.chatItem}
          onPress={() => {
            // Mark chat as read when opening
            if (item.unreadCount > 0) {
              markChatAsRead(item.id);
            }
            navigation.navigate('Chat', { 
              chatId: item.id, 
              participant: { id: item.participantId, name: item.participantName },
              requestId: item.relatedRequest?.id,
            });
          }}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="business" size={24} color="#1976d2" />
            </View>
            {item.isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatName} numberOfLines={1}>
                {item.participantName}
              </Text>
              <Text style={[
                styles.chatTime,
                item.unreadCount > 0 && styles.chatTimeUnread
              ]}>
                {formatTime(item.lastMessageTime)}
              </Text>
            </View>

            <View style={styles.chatFooter}>
              <Text style={[
                styles.lastMessage,
                item.unreadCount > 0 && styles.lastMessageUnread
              ]} numberOfLines={1}>
                {item.lastMessage}
              </Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>
                    {item.unreadCount > 9 ? '9+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>

            {item.relatedRequest && (
              <View style={styles.requestTag}>
                <Ionicons name="document-text-outline" size={12} color="#6b7280" />
                <Text style={styles.requestTagText} numberOfLines={1}>
                  {item.relatedRequest.title}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </FadeInView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.chat.messages || 'Messages'}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text>{t.common.loading || 'Loading...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.chat.messages || 'Messages'}</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      {chats.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>{t.chat.noMessagesYet || 'No Messages Yet'}</Text>
          <Text style={styles.emptySubtitle}>
            {t.chat.startConversation || 'Start a conversation by requesting a quote from a service provider'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={renderChat}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  searchButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatList: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  chatTimeUnread: {
    color: '#1976d2',
    fontWeight: '600',
  },
  chatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: '#111827',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  requestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  requestTagText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});

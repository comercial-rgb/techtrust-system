/**
 * NotificationsContext - Gerenciamento de notificações e badges
 * Controla contagem de mensagens não lidas e solicitações pendentes
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES
// ============================================
interface NotificationsState {
  unreadMessagesCount: number;
  pendingRequestsCount: number;
  unreadNotificationsCount: number;
}

interface NotificationsContextType extends NotificationsState {
  // Messages
  markMessagesAsRead: (chatId?: string) => void;
  incrementUnreadMessages: (count?: number) => void;
  setUnreadMessagesCount: (count: number) => void;
  
  // Requests (Provider)
  markRequestAsViewed: (requestId: string) => void;
  incrementPendingRequests: (count?: number) => void;
  setPendingRequestsCount: (count: number) => void;
  
  // Notifications
  markNotificationsAsRead: () => void;
  incrementNotifications: (count?: number) => void;
  setUnreadNotificationsCount: (count: number) => void;
  
  // Refresh
  refreshCounts: () => Promise<void>;
}

const STORAGE_KEYS = {
  UNREAD_MESSAGES: '@techtrust:unread_messages',
  PENDING_REQUESTS: '@techtrust:pending_requests',
  UNREAD_NOTIFICATIONS: '@techtrust:unread_notifications',
  VIEWED_REQUESTS: '@techtrust:viewed_requests',
};

// ============================================
// CONTEXT
// ============================================
const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NotificationsState>({
    unreadMessagesCount: 0,
    pendingRequestsCount: 0,
    unreadNotificationsCount: 0,
  });
  
  const [viewedRequests, setViewedRequests] = useState<string[]>([]);

  // Load saved counts on mount
  useEffect(() => {
    loadSavedCounts();
  }, []);

  const loadSavedCounts = async () => {
    try {
      const [messages, requests, notifications, viewed] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.UNREAD_MESSAGES),
        AsyncStorage.getItem(STORAGE_KEYS.PENDING_REQUESTS),
        AsyncStorage.getItem(STORAGE_KEYS.UNREAD_NOTIFICATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.VIEWED_REQUESTS),
      ]);

      setState({
        unreadMessagesCount: messages ? parseInt(messages, 10) : 2, // Mock initial value
        pendingRequestsCount: requests ? parseInt(requests, 10) : 3, // Mock initial value
        unreadNotificationsCount: notifications ? parseInt(notifications, 10) : 1, // Mock initial value
      });
      
      if (viewed) {
        setViewedRequests(JSON.parse(viewed));
      }
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  };

  const saveCounts = async (newState: NotificationsState) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.UNREAD_MESSAGES, String(newState.unreadMessagesCount)),
        AsyncStorage.setItem(STORAGE_KEYS.PENDING_REQUESTS, String(newState.pendingRequestsCount)),
        AsyncStorage.setItem(STORAGE_KEYS.UNREAD_NOTIFICATIONS, String(newState.unreadNotificationsCount)),
      ]);
    } catch (error) {
      console.error('Error saving notification counts:', error);
    }
  };

  // ============================================
  // MESSAGES
  // ============================================
  const markMessagesAsRead = useCallback((chatId?: string) => {
    setState(prev => {
      // If chatId is provided, decrement by 1, otherwise reset to 0
      const newCount = chatId ? Math.max(0, prev.unreadMessagesCount - 1) : 0;
      const newState = { ...prev, unreadMessagesCount: newCount };
      saveCounts(newState);
      return newState;
    });
  }, []);

  const incrementUnreadMessages = useCallback((count: number = 1) => {
    setState(prev => {
      const newState = { ...prev, unreadMessagesCount: prev.unreadMessagesCount + count };
      saveCounts(newState);
      return newState;
    });
  }, []);

  const setUnreadMessagesCount = useCallback((count: number) => {
    setState(prev => {
      const newState = { ...prev, unreadMessagesCount: count };
      saveCounts(newState);
      return newState;
    });
  }, []);

  // ============================================
  // REQUESTS (Provider)
  // ============================================
  const markRequestAsViewed = useCallback(async (requestId: string) => {
    if (viewedRequests.includes(requestId)) return;
    
    const newViewed = [...viewedRequests, requestId];
    setViewedRequests(newViewed);
    
    setState(prev => {
      const newCount = Math.max(0, prev.pendingRequestsCount - 1);
      const newState = { ...prev, pendingRequestsCount: newCount };
      saveCounts(newState);
      return newState;
    });
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.VIEWED_REQUESTS, JSON.stringify(newViewed));
    } catch (error) {
      console.error('Error saving viewed requests:', error);
    }
  }, [viewedRequests]);

  const incrementPendingRequests = useCallback((count: number = 1) => {
    setState(prev => {
      const newState = { ...prev, pendingRequestsCount: prev.pendingRequestsCount + count };
      saveCounts(newState);
      return newState;
    });
  }, []);

  const setPendingRequestsCount = useCallback((count: number) => {
    setState(prev => {
      const newState = { ...prev, pendingRequestsCount: count };
      saveCounts(newState);
      return newState;
    });
  }, []);

  // ============================================
  // NOTIFICATIONS
  // ============================================
  const markNotificationsAsRead = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, unreadNotificationsCount: 0 };
      saveCounts(newState);
      return newState;
    });
  }, []);

  const incrementNotifications = useCallback((count: number = 1) => {
    setState(prev => {
      const newState = { ...prev, unreadNotificationsCount: prev.unreadNotificationsCount + count };
      saveCounts(newState);
      return newState;
    });
  }, []);

  const setUnreadNotificationsCount = useCallback((count: number) => {
    setState(prev => {
      const newState = { ...prev, unreadNotificationsCount: count };
      saveCounts(newState);
      return newState;
    });
  }, []);

  // ============================================
  // REFRESH
  // ============================================
  const refreshCounts = useCallback(async () => {
    // In production, this would fetch from API
    // For now, we simulate with mock data
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In production:
      // const response = await api.getNotificationCounts();
      // setState({
      //   unreadMessagesCount: response.unreadMessages,
      //   pendingRequestsCount: response.pendingRequests,
      //   unreadNotificationsCount: response.unreadNotifications,
      // });
    } catch (error) {
      console.error('Error refreshing counts:', error);
    }
  }, []);

  const value: NotificationsContextType = {
    ...state,
    markMessagesAsRead,
    incrementUnreadMessages,
    setUnreadMessagesCount,
    markRequestAsViewed,
    incrementPendingRequests,
    setPendingRequestsCount,
    markNotificationsAsRead,
    incrementNotifications,
    setUnreadNotificationsCount,
    refreshCounts,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}

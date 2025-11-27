/**
 * Toast Component - Notificações elegantes
 * TechTrust Mobile
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const toastConfig: Record<ToastType, { icon: string; bg: string; color: string }> = {
  success: {
    icon: 'check-circle',
    bg: '#10b981',
    color: '#ffffff',
  },
  error: {
    icon: 'alert-circle',
    bg: '#ef4444',
    color: '#ffffff',
  },
  warning: {
    icon: 'alert',
    bg: '#f59e0b',
    color: '#ffffff',
  },
  info: {
    icon: 'information',
    bg: '#3b82f6',
    color: '#ffffff',
  },
};

export default function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
  action,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const config = toastConfig[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={config.icon as any}
          size={24}
          color={config.color}
          style={styles.icon}
        />
        <Text style={[styles.message, { color: config.color }]} numberOfLines={2}>
          {message}
        </Text>
        {action && (
          <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
            <Text style={[styles.actionText, { color: config.color }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={20} color={config.color} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});

// ============================================
// Hook para usar Toast facilmente
// ============================================

import { useState, useCallback } from 'react';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  action?: { label: string; onPress: () => void };
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      action?: { label: string; onPress: () => void }
    ) => {
      setToast({ visible: true, message, type, action });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const success = useCallback((message: string) => showToast(message, 'success'), []);
  const error = useCallback((message: string) => showToast(message, 'error'), []);
  const warning = useCallback((message: string) => showToast(message, 'warning'), []);
  const info = useCallback((message: string) => showToast(message, 'info'), []);

  return {
    toast,
    showToast,
    hideToast,
    success,
    error,
    warning,
    info,
  };
}

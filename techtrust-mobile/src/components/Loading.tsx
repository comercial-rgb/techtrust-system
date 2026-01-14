/**
 * Loading & Button Components - Estados de carregamento
 * TechTrust Mobile
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

// ============================================
// Loading Overlay - Tela de carregamento
// ============================================

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  transparent?: boolean;
}

export function LoadingOverlay({
  visible,
  message = 'Loading...',
  transparent = false,
}: LoadingOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={[styles.overlay, transparent && styles.overlayTransparent]}>
        <Animated.View
          style={[
            styles.loadingBox,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ============================================
// Spinner Dots - Loading com pontos animados
// ============================================

export function SpinnerDots({ color = '#1976d2', size = 10 }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: -8,
            duration: 300,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const dotStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    marginHorizontal: 4,
  };

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[dotStyle, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[dotStyle, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[dotStyle, { transform: [{ translateY: dot3 }] }]} />
    </View>
  );
}

// ============================================
// Enhanced Button - Botão com estados
// ============================================

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface EnhancedButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: any;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: '#1976d2', text: '#ffffff', border: '#1976d2' },
  secondary: { bg: '#6b7280', text: '#ffffff', border: '#6b7280' },
  outline: { bg: 'transparent', text: '#1976d2', border: '#1976d2' },
  ghost: { bg: 'transparent', text: '#1976d2', border: 'transparent' },
  danger: { bg: '#ef4444', text: '#ffffff', border: '#ef4444' },
};

const sizeStyles: Record<ButtonSize, { paddingV: number; paddingH: number; fontSize: number; iconSize: number }> = {
  small: { paddingV: 8, paddingH: 16, fontSize: 13, iconSize: 16 },
  medium: { paddingV: 14, paddingH: 24, fontSize: 15, iconSize: 20 },
  large: { paddingV: 18, paddingH: 32, fontSize: 17, iconSize: 24 },
};

export function EnhancedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
}: EnhancedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 100,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
    }).start();
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor: v.bg,
            borderColor: v.border,
            borderWidth: variant === 'outline' ? 2 : 0,
            paddingVertical: s.paddingV,
            paddingHorizontal: s.paddingH,
            opacity: isDisabled ? 0.5 : 1,
            transform: [{ scale: scaleAnim }],
          },
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={v.text} />
        ) : (
          <View style={styles.buttonContent}>
            {icon && iconPosition === 'left' && (
              <MaterialCommunityIcons
                name={icon as any}
                size={s.iconSize}
                color={v.text}
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={[styles.buttonText, { color: v.text, fontSize: s.fontSize }]}>
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <MaterialCommunityIcons
                name={icon as any}
                size={s.iconSize}
                color={v.text}
                style={{ marginLeft: 8 }}
              />
            )}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ============================================
// Pull to Refresh Indicator
// ============================================

interface RefreshIndicatorProps {
  refreshing: boolean;
}

export function RefreshIndicator({ refreshing }: RefreshIndicatorProps) {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      Animated.loop(
        Animated.timing(rotate, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotate.setValue(0);
    }
  }, [refreshing]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!refreshing) return null;

  return (
    <View style={styles.refreshContainer}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <MaterialCommunityIcons name="loading" size={24} color="#1976d2" />
      </Animated.View>
      <Text style={styles.refreshText}>Atualizando...</Text>
    </View>
  );
}

// ============================================
// Empty State - Estado vazio com animação
// ============================================

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'inbox-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.emptyContainer}>
      <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
        <MaterialCommunityIcons name={icon as any} size={80} color="#d1d5db" />
      </Animated.View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.emptyDescription}>{description}</Text>}
      {actionLabel && onAction && (
        <EnhancedButton
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="medium"
          style={{ marginTop: 20 }}
        />
      )}
    </View>
  );
}

// ============================================
// Success Animation - Checkmark animado
// ============================================

interface SuccessAnimationProps {
  visible: boolean;
  message?: string;
  onComplete?: () => void;
}

export function SuccessAnimation({
  visible,
  message = 'Success!',
  onComplete,
}: SuccessAnimationProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 3,
        }),
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 3,
        }),
      ]).start(() => {
        if (onComplete) {
          setTimeout(onComplete, 1000);
        }
      });
    } else {
      scale.setValue(0);
      checkScale.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.successOverlay}>
        <Animated.View
          style={[
            styles.successCircle,
            { transform: [{ scale }] },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <MaterialCommunityIcons name="check" size={60} color="#fff" />
          </Animated.View>
        </Animated.View>
        <Animated.Text
          style={[
            styles.successMessage,
            { opacity: checkScale },
          ]}
        >
          {message}
        </Animated.Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTransparent: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
  },
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '700',
  },
  refreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  refreshText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  successMessage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
  },
});

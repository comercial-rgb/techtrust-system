/**
 * Animated Components - Transições e micro-interações
 * TechTrust Mobile
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Pressable,
  ViewStyle,
} from 'react-native';

// ============================================
// Fade In View - Animação de entrada suave
// ============================================

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

export function FadeInView({
  children,
  delay = 0,
  duration = 400,
  style,
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ============================================
// Scale Press - Botão com animação de escala
// ============================================

interface ScalePressProps {
  children: React.ReactNode;
  onPress: () => void;
  scale?: number;
  style?: ViewStyle;
  disabled?: boolean;
}

export function ScalePress({
  children,
  onPress,
  scale = 0.95,
  style,
  disabled = false,
}: ScalePressProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scale,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// Pulse Animation - Efeito de pulso
// ============================================

interface PulseViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  duration?: number;
  minScale?: number;
  maxScale?: number;
}

export function PulseView({
  children,
  style,
  duration = 1500,
  minScale = 1,
  maxScale = 1.05,
}: PulseViewProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: maxScale,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: minScale,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
      {children}
    </Animated.View>
  );
}

// ============================================
// Shake Animation - Efeito de tremor (para erros)
// ============================================

interface ShakeViewProps {
  children: React.ReactNode;
  shake: boolean;
  style?: ViewStyle;
}

export function ShakeView({ children, shake, style }: ShakeViewProps) {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shake) {
      Animated.sequence([
        Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [shake]);

  return (
    <Animated.View style={[style, { transform: [{ translateX }] }]}>
      {children}
    </Animated.View>
  );
}

// ============================================
// Slide In View - Animação de deslizar
// ============================================

type SlideDirection = 'left' | 'right' | 'up' | 'down';

interface SlideInViewProps {
  children: React.ReactNode;
  direction?: SlideDirection;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

export function SlideInView({
  children,
  direction = 'up',
  delay = 0,
  duration = 400,
  style,
}: SlideInViewProps) {
  const translateValue = useRef(new Animated.Value(getInitialValue(direction))).current;
  const opacity = useRef(new Animated.Value(0)).current;

  function getInitialValue(dir: SlideDirection): number {
    switch (dir) {
      case 'left': return -50;
      case 'right': return 50;
      case 'up': return 50;
      case 'down': return -50;
    }
  }

  function getTransform() {
    if (direction === 'left' || direction === 'right') {
      return { translateX: translateValue };
    }
    return { translateY: translateValue };
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateValue, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [getTransform()],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ============================================
// Staggered List - Lista com animação escalonada
// ============================================

interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  style?: ViewStyle;
}

export function StaggeredList({
  children,
  staggerDelay = 100,
  style,
}: StaggeredListProps) {
  return (
    <View style={style}>
      {React.Children.map(children, (child, index) => (
        <FadeInView delay={index * staggerDelay}>
          {child}
        </FadeInView>
      ))}
    </View>
  );
}

// ============================================
// Rotating View - Rotação contínua (para loading)
// ============================================

interface RotatingViewProps {
  children: React.ReactNode;
  duration?: number;
  style?: ViewStyle;
}

export function RotatingView({ children, duration = 1000, style }: RotatingViewProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[style, { transform: [{ rotate }] }]}>
      {children}
    </Animated.View>
  );
}

// ============================================
// Bounce In View - Entrada com bounce
// ============================================

interface BounceInViewProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

export function BounceInView({ children, delay = 0, style }: BounceInViewProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 3,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ============================================
// Accordion View - Expansão animada
// ============================================

interface AccordionViewProps {
  children: React.ReactNode;
  expanded: boolean;
  maxHeight?: number;
  style?: ViewStyle;
}

export function AccordionView({
  children,
  expanded,
  maxHeight = 500,
  style,
}: AccordionViewProps) {
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: expanded ? maxHeight : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: expanded ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [expanded]);

  return (
    <Animated.View
      style={[
        style,
        {
          maxHeight: animatedHeight,
          opacity,
          overflow: 'hidden',
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ============================================
// Progress Bar Animated
// ============================================

interface AnimatedProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  backgroundColor?: string;
  height?: number;
  style?: ViewStyle;
}

export function AnimatedProgressBar({
  progress,
  color = '#2B5EA7',
  backgroundColor = '#e5e7eb',
  height = 8,
  style,
}: AnimatedProgressBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: height / 2,
          height,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          backgroundColor: color,
          borderRadius: height / 2,
          height,
          width,
        }}
      />
    </View>
  );
}

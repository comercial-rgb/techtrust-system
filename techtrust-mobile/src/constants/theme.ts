/**
 * TechTrust Brand Theme
 * Brand colors and design tokens
 */

export const colors = {
  // Brand Colors
  primary: 'rgb(0, 91, 237)',      // Main brand blue
  secondary: 'rgb(37, 28, 89)',    // Dark purple
  black: 'rgb(0, 0, 0)',           // Pure black
  white: 'rgb(255, 255, 255)',     // Pure white

  // Primary variations
  primaryLight: 'rgba(0, 91, 237, 0.1)',
  primaryMedium: 'rgba(0, 91, 237, 0.5)',
  primaryDark: 'rgb(0, 70, 180)',

  // Secondary variations
  secondaryLight: 'rgba(37, 28, 89, 0.1)',
  secondaryMedium: 'rgba(37, 28, 89, 0.5)',
  secondaryDark: 'rgb(25, 18, 60)',

  // Semantic colors
  success: '#10b981',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  errorLight: '#fef2f2',
  info: '#3b82f6',
  infoLight: '#dbeafe',

  // Grayscale
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Background colors
  background: '#f8fafc',
  backgroundSecondary: '#f1f5f9',
  card: '#ffffff',

  // Text colors
  text: '#111827',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  textInverse: '#ffffff',

  // Border colors
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  borderDark: '#d1d5db',

  // Status colors (for orders, quotes, etc.)
  status: {
    pending: '#f59e0b',
    pendingBg: '#fef3c7',
    approved: '#10b981',
    approvedBg: '#dcfce7',
    rejected: '#ef4444',
    rejectedBg: '#fef2f2',
    inProgress: '#3b82f6',
    inProgressBg: '#dbeafe',
    completed: '#8b5cf6',
    completedBg: '#ede9fe',
    cancelled: '#6b7280',
    cancelledBg: '#f3f4f6',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  display: 36,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Hex versions for compatibility
export const colorsHex = {
  primary: '#005BED',
  secondary: '#251C59',
  black: '#000000',
  white: '#FFFFFF',
};

export default {
  colors,
  colorsHex,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
};

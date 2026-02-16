/**
 * ThemeContext - Dark Mode Support
 * Provides theme switching between light and dark mode
 * Persists preference to AsyncStorage
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================
// TYPES
// ============================================
export type ThemeMode = "light" | "dark" | "system";

export interface ThemeColors {
  // Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;

  // Background
  background: string;
  backgroundSecondary: string;
  card: string;
  surface: string;

  // Text
  text: string;
  textSecondary: string;
  textLight: string;
  textInverse: string;

  // Border
  border: string;
  borderLight: string;
  borderDark: string;

  // Semantic
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;

  // Grayscale
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;

  // Status bar
  statusBar: "light" | "dark";
}

// ============================================
// COLOR SCHEMES
// ============================================
const lightColors: ThemeColors = {
  primary: "rgb(0, 91, 237)",
  primaryLight: "rgba(0, 91, 237, 0.1)",
  primaryDark: "rgb(0, 70, 180)",
  secondary: "rgb(37, 28, 89)",

  background: "#f8fafc",
  backgroundSecondary: "#f1f5f9",
  card: "#ffffff",
  surface: "#ffffff",

  text: "#111827",
  textSecondary: "#6b7280",
  textLight: "#9ca3af",
  textInverse: "#ffffff",

  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  borderDark: "#d1d5db",

  success: "#10b981",
  successLight: "#dcfce7",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  error: "#ef4444",
  errorLight: "#fef2f2",
  info: "#3b82f6",
  infoLight: "#dbeafe",

  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",

  statusBar: "dark",
};

const darkColors: ThemeColors = {
  primary: "rgb(59, 130, 246)",
  primaryLight: "rgba(59, 130, 246, 0.15)",
  primaryDark: "rgb(96, 165, 250)",
  secondary: "rgb(139, 92, 246)",

  background: "#0f172a",
  backgroundSecondary: "#1e293b",
  card: "#1e293b",
  surface: "#334155",

  text: "#f1f5f9",
  textSecondary: "#94a3b8",
  textLight: "#64748b",
  textInverse: "#0f172a",

  border: "#334155",
  borderLight: "#1e293b",
  borderDark: "#475569",

  success: "#34d399",
  successLight: "rgba(52, 211, 153, 0.15)",
  warning: "#fbbf24",
  warningLight: "rgba(251, 191, 36, 0.15)",
  error: "#f87171",
  errorLight: "rgba(248, 113, 113, 0.15)",
  info: "#60a5fa",
  infoLight: "rgba(96, 165, 250, 0.15)",

  gray50: "#1e293b",
  gray100: "#334155",
  gray200: "#475569",
  gray300: "#64748b",
  gray400: "#94a3b8",
  gray500: "#cbd5e1",
  gray600: "#e2e8f0",
  gray700: "#f1f5f9",
  gray800: "#f8fafc",
  gray900: "#ffffff",

  statusBar: "light",
};

// ============================================
// CONTEXT
// ============================================
interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const THEME_KEY = "@TechTrust:themeMode";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  // Load saved preference
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === "light" || saved === "dark" || saved === "system") {
          setModeState(saved);
        }
      } catch {
        // fallback to system
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_KEY, newMode);
    } catch {
      // ignore
    }
  };

  const isDark = useMemo(() => {
    if (mode === "system") return systemScheme === "dark";
    return mode === "dark";
  }, [mode, systemScheme]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value = useMemo(
    () => ({ mode, isDark, colors, setMode }),
    [mode, isDark, colors],
  );

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Export color schemes for reference
export { lightColors, darkColors };

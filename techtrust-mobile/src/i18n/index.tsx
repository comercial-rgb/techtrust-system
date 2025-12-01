/**
 * TechTrust i18n - Internationalization
 * Supports: English, Portuguese, Spanish
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en';
import pt from './locales/pt';
import es from './locales/es';

// Available languages
export type Language = 'en' | 'pt' | 'es';

export const languages: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
];

// Translations type
type Translations = typeof en;

const translations: Record<Language, Translations> = {
  en,
  pt,
  es,
};

// Storage key
const LANGUAGE_KEY = '@techtrust_language';

// Context
interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: Translations;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Provider
interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'pt' || savedLanguage === 'es')) {
        setLanguageState(savedLanguage as Language);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = translations[language];

  const formatCurrency = (amount: number): string => {
    const { currency, currencySymbol } = t.formats;
    
    if (currency === 'BRL') {
      return `${currencySymbol} ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (language === 'pt') {
      return d.toLocaleDateString('pt-BR');
    } else if (language === 'es') {
      return d.toLocaleDateString('es-ES');
    }
    return d.toLocaleDateString('en-US');
  };

  const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (language === 'pt') {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (language === 'es') {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (!isLoaded) {
    return null; // Or loading screen
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, formatCurrency, formatDate, formatTime }}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Simple translate function for use outside React components
export function translate(key: string, language: Language = 'en'): string {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }
  
  return typeof value === 'string' ? value : key;
}

export default {
  I18nProvider,
  useI18n,
  languages,
  translate,
};

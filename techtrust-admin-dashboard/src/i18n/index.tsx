import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

import en from './locales/en';
import es from './locales/es';
import pt from './locales/pt';

export type Language = 'pt' | 'en' | 'es';

export const languages: { code: Language; label: string }[] = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

type Translations = typeof en;

const translations: Record<Language, Translations> = {
  pt,
  en,
  es,
};

const STORAGE_KEY = 'techtrust_lang';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  translate: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function traverse(obj: any, path: string): string {
  return path.split('.').reduce((acc: any, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return acc[key];
    }
    return path;
  }, obj) as string;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('pt');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved === 'pt' || saved === 'en' || saved === 'es') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  const value = useMemo<I18nContextType>(() => {
    const current = translations[language];
    const translate = (key: string) => {
      const value = traverse(current, key);
      return typeof value === 'string' ? value : key;
    };

    return {
      language,
      setLanguage,
      t: current,
      translate,
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}

export function translate(key: string, language: Language = 'pt') {
  const current = translations[language];
  const value = traverse(current, key);
  return typeof value === 'string' ? value : key;
}

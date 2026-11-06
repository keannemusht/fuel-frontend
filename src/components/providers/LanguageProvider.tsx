'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '@/locales/translations';

export type { Language };

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  mounted: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'id',
  setLang: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  mounted: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('id');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('fms_lang') as Language;
    if (saved === 'id' || saved === 'en') {
      setLangState(saved);
    }
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fms_lang' && (e.newValue === 'id' || e.newValue === 'en')) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('fms_lang', newLang);
  };

  const t = (key: string, fallback?: string): string => {
    return translations[lang]?.[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

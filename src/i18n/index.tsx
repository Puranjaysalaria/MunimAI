import React, { createContext, useContext, useState, useEffect } from 'react';
import { Translations, LanguageCode } from './types';
import { hi } from './hi';
import { pa } from './pa';
import { en } from './en';

const translationsMap: Record<LanguageCode, Translations> = {
  hi,
  pa,
  en,
  mr: hi,
  bn: hi,
  gu: hi,
  ta: hi,
};

interface I18nContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: Translations;
  availableLanguages: { code: LanguageCode; label: string; nativeLabel: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'munim_preferred_language';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved && (saved === 'hi' || saved === 'pa' || saved === 'en')) {
      return saved;
    }
    return 'hi';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const availableLanguages = [
    { code: 'hi' as LanguageCode, label: 'Hindi', nativeLabel: 'हिंदी' },
    { code: 'pa' as LanguageCode, label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
    { code: 'en' as LanguageCode, label: 'English / Hinglish', nativeLabel: 'English' },
  ];

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t: translationsMap[language] || hi,
        availableLanguages,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

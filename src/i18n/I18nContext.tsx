import React, { createContext, useContext, useState, useEffect } from 'react';
import { Translations, LanguageCode } from './types';
import { hi } from './hi';
import { en } from './en';
import { pa } from './pa';
import { gu } from './gu';
import { mr } from './mr';
import { bn } from './bn';
import { ta } from './ta';
import { te } from './te';
import { kn } from './kn';
import { ml } from './ml';

export const translationsMap: Record<LanguageCode, Translations> = {
  hi,
  en,
  pa,
  gu,
  mr,
  bn,
  ta,
  te,
  kn,
  ml,
};

export const locales = translationsMap;

export interface LanguageMeta {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  region: string;
}

export interface I18nContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: Translations;
  availableLanguages: LanguageMeta[];
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'munim_preferred_language';

export const availableLanguages: LanguageMeta[] = [
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', region: 'North & Central' },
  { code: 'en', label: 'English / Hinglish', nativeLabel: 'English', region: 'Pan-India' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', region: 'Punjab / Haryana' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', region: 'Gujarat / Mumbai' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', region: 'Maharashtra' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', region: 'West Bengal' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', region: 'Tamil Nadu' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', region: 'AP & Telangana' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', region: 'Karnataka' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', region: 'Kerala' },
];

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved && translationsMap[saved]) {
      return saved;
    }
    return 'hi';
  });

  const setLanguage = (lang: LanguageCode) => {
    if (translationsMap[lang]) {
      setLanguageState(lang);
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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

import { LanguageCode } from '../i18n/types';
import { ParsedIntent } from '../types/schema';

export type SupportedVoiceLanguage = LanguageCode;

export const LANGUAGE_RECOGNITION_CODES: Record<SupportedVoiceLanguage, string> = {
  hi: 'hi-IN',
  en: 'en-IN',
  pa: 'pa-IN',
  gu: 'gu-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
};

export interface IntentMatchPattern {
  intent: ParsedIntent;
  patterns: RegExp[];
  confidence?: number;
  extractCount?: boolean;
  timeframe?: 'today' | 'yesterday' | 'this_week' | 'month';
}

export interface LanguagePhraseTable {
  language: SupportedVoiceLanguage;
  intents: IntentMatchPattern[];
  yesKeywords: string[];
  noKeywords: string[];
  undoKeywords: string[];
}

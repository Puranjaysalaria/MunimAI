import { LanguageCode } from '../../i18n/types';
import { LanguagePhraseTable } from '../types';
import { hiIntents } from './hi';
import { enIntents } from './en';
import { paIntents } from './pa';
import { guIntents } from './gu';
import { mrIntents } from './mr';
import { bnIntents } from './bn';
import { taIntents } from './ta';
import { teIntents } from './te';
import { knIntents } from './kn';
import { mlIntents } from './ml';

export const INTENT_TABLES: Record<LanguageCode, LanguagePhraseTable> = {
  hi: hiIntents,
  en: enIntents,
  pa: paIntents,
  gu: guIntents,
  mr: mrIntents,
  bn: bnIntents,
  ta: taIntents,
  te: teIntents,
  kn: knIntents,
  ml: mlIntents,
};

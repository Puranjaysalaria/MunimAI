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
import { EDIT_INTENT_PATTERNS } from './editIntents';

function withEditIntents(table: LanguagePhraseTable): LanguagePhraseTable {
  const editPatterns = EDIT_INTENT_PATTERNS[table.language] || [];
  return {
    ...table,
    intents: [...editPatterns, ...table.intents],
  };
}

export const INTENT_TABLES: Record<LanguageCode, LanguagePhraseTable> = {
  hi: withEditIntents(hiIntents),
  en: withEditIntents(enIntents),
  pa: withEditIntents(paIntents),
  gu: withEditIntents(guIntents),
  mr: withEditIntents(mrIntents),
  bn: withEditIntents(bnIntents),
  ta: withEditIntents(taIntents),
  te: withEditIntents(teIntents),
  kn: withEditIntents(knIntents),
  ml: withEditIntents(mlIntents),
};

import { describe, it, expect } from 'vitest';
import {
  STAGED_EDIT_PHRASE_FIXTURES,
  EditIntentGroup,
  FixtureLocaleKey,
} from './fixtures/editPhrases';
import { parsePendingCorrection } from '../src/voice/pendingCorrectionParser';
import { INTENT_TABLES } from '../src/voice/intents';
import { routeVoiceIntent } from '../src/voice/intentRouter';
import {
  parseReminderPreviewEdit,
  parseSupplierOrderEdit,
  parseStockCountEdit,
  parseCustomerDetailEdit,
} from '../src/voice/domainEditParser';
import { INITIAL_CUSTOMERS, INITIAL_ITEMS } from '../src/data/mockData';
import { PendingConfirmation } from '../src/components/ConfirmationCard/ConfirmationCard';
import { LanguageCode } from '../src/i18n/types';

const STAGE1_LOCALES: FixtureLocaleKey[] = ['hi', 'en', 'hinglish', 'pa'];
const STAGE2_LOCALES: FixtureLocaleKey[] = ['gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml'];
const ALL_GROUPS: EditIntentGroup[] = [
  'pending_correction',
  'edit_entry',
  'change_amount',
  'change_item',
  'change_customer',
  'change_quantity',
  'change_date',
  'edit_note',
  'domain_edits',
];

const basePending: PendingConfirmation = {
  intent: 'credit',
  customer: INITIAL_CUSTOMERS[0],
  customerName: INITIAL_CUSTOMERS[0].name,
  amount: 500,
  item: INITIAL_ITEMS[0],
  itemName: INITIAL_ITEMS[0].name,
  quantity: 2,
  unit: 'kilo',
  rawText: 'Ramesh Sharma 500 udhaar',
};

describe('Fix 5: Staged Phrase Coverage, Held-Out Evaluation & Rule vs LLM Rates', () => {
  it.each(STAGE1_LOCALES)(
    'Stage 1 (%s) has >= 30 phrases per intent group, all marked "needs native review"',
    (locale) => {
      const list = STAGED_EDIT_PHRASE_FIXTURES[locale];
      for (const group of ALL_GROUPS) {
        const groupPhrases = list.filter((f) => f.group === group);
        expect(groupPhrases.length, `${locale}:${group} count`).toBeGreaterThanOrEqual(30);
        expect(groupPhrases.some((f) => f.heldOut), `${locale}:${group} heldOut`).toBe(true);
        for (const f of groupPhrases) {
          expect(f.reviewStatus).toBe('needs native review');
        }
      }
    }
  );

  it.each(STAGE2_LOCALES)(
    'Stage 2 (%s) has >= 10 phrases per intent group, all marked "needs native review"',
    (locale) => {
      const list = STAGED_EDIT_PHRASE_FIXTURES[locale];
      for (const group of ALL_GROUPS) {
        const groupPhrases = list.filter((f) => f.group === group);
        expect(groupPhrases.length, `${locale}:${group} count`).toBeGreaterThanOrEqual(10);
        expect(groupPhrases.some((f) => f.heldOut), `${locale}:${group} heldOut`).toBe(true);
        for (const f of groupPhrases) {
          expect(f.reviewStatus).toBe('needs native review');
        }
      }
    }
  );

  it('evaluates all phrases including held-out set and reports rule-hit vs LLM fallback rates per language', async () => {
    const rateReport: Array<{ locale: string; total: number; ruleHits: number; llmFallback: number; accuracyPct: number }> = [];

    for (const locale of [...STAGE1_LOCALES, ...STAGE2_LOCALES]) {
      const lang: LanguageCode = locale === 'hinglish' ? 'hi' : (locale as LanguageCode);
      const list = STAGED_EDIT_PHRASE_FIXTURES[locale];
      let ruleHits = 0;
      let llmFallback = 0;
      let passed = 0;

      for (const item of list) {
        if (item.group === 'pending_correction') {
          const res = parsePendingCorrection(item.phrase, basePending, {
            language: lang,
            customers: INITIAL_CUSTOMERS,
            items: INITIAL_ITEMS,
          });
          if (res.type === 'update_slots') {
            ruleHits++;
            passed++;
          }
        } else if (item.group === 'domain_edits') {
          const matched =
            parseReminderPreviewEdit(item.phrase) ||
            parseSupplierOrderEdit(item.phrase, INITIAL_ITEMS) ||
            parseStockCountEdit(item.phrase, INITIAL_ITEMS) ||
            parseCustomerDetailEdit(item.phrase);
          if (matched) {
            ruleHits++;
            passed++;
          }
        } else {
          const primaryTable = INTENT_TABLES[lang] || INTENT_TABLES.hi;
          const isPrimaryRuleHit =
            primaryTable.intents.some((p) => p.patterns.some((rx) => rx.test(item.phrase))) ||
            INTENT_TABLES.en.intents.some((p) => p.patterns.some((rx) => rx.test(item.phrase))) ||
            INTENT_TABLES.hi.intents.some((p) => p.patterns.some((rx) => rx.test(item.phrase)));

          const routed = await routeVoiceIntent(item.phrase, {
            language: lang,
            customers: INITIAL_CUSTOMERS,
            items: INITIAL_ITEMS,
          });

          if (isPrimaryRuleHit) ruleHits++;
          else llmFallback++;

          if (routed.intent === item.group) {
            passed++;
          }
        }
      }

      const accuracyPct = Math.round((passed / list.length) * 100);
      rateReport.push({
        locale,
        total: list.length,
        ruleHits,
        llmFallback,
        accuracyPct,
      });

      expect(accuracyPct, `accuracy for ${locale}`).toBeGreaterThanOrEqual(90);
    }

    // Emit structured report for CI logs
    console.info('[Staged Phrase Coverage Report]', JSON.stringify(rateReport));
  }, 30000);
});

import { describe, it, expect } from 'vitest';
import { parsePendingCorrection } from '../src/voice/pendingCorrectionParser';
import { routeVoiceIntent } from '../src/voice/intentRouter';
import { parseWithRules } from '../src/parser/ruleParser';
import { MockIntentClassifier } from '../src/voice/llmIntentClassifier';
import { INITIAL_CUSTOMERS, INITIAL_ITEMS } from '../src/data/mockData';
import { PendingConfirmation } from '../src/components/ConfirmationCard/ConfirmationCard';

const basePending: PendingConfirmation = {
  intent: 'credit',
  customer: INITIAL_CUSTOMERS[0],
  customerName: INITIAL_CUSTOMERS[0].name,
  amount: 500,
  item: INITIAL_ITEMS[0],
  itemName: INITIAL_ITEMS[0].name,
  quantity: 2,
  unit: 'kilo',
  rawText: 'Ramesh 500 credit',
};

describe('User-Reported Voice Fixes (Cancel/Remove, Voice Undo, Low-Stock & Semantic Paraphrases)', () => {
  it('cancels pending confirmation card on "cancel it", "remove it", "delete it", "ise hatao"', () => {
    for (const phrase of ['cancel it', 'remove it', 'delete it', 'cancel this', 'ise hatao', 'hata do']) {
      const res = parsePendingCorrection(phrase, basePending, {
        language: 'en',
        customers: INITIAL_CUSTOMERS,
        items: INITIAL_ITEMS,
      });
      expect(res.type, `phrase="${phrase}"`).toBe('cancel');
    }
  });

  it('parses voice undo paraphrases ("undo it", "remove it", "remove last", "cancel last", "wapas lo")', async () => {
    for (const phrase of ['undo it', 'undo that', 'remove it', 'remove last', 'cancel last', 'wapas lo', 'revert']) {
      const ruleRes = parseWithRules(phrase, { customers: INITIAL_CUSTOMERS, items: INITIAL_ITEMS, preferredLanguage: 'en' });
      const routeRes = await routeVoiceIntent(phrase, { language: 'en', customers: INITIAL_CUSTOMERS, items: INITIAL_ITEMS });
      expect(ruleRes.intent, `rule phrase="${phrase}"`).toBe('undo');
      expect(routeRes.intent, `route phrase="${phrase}"`).toBe('undo');
    }
  });

  it('handles "what item is running low" as show_low_stock and "order the item running low" as build_order_list', async () => {
    const checkPhrases = [
      'what item is running low',
      'which items are running low',
      'tell me what is running out',
    ];
    for (const p of checkPhrases) {
      const r1 = parseWithRules(p, { customers: INITIAL_CUSTOMERS, items: INITIAL_ITEMS, preferredLanguage: 'en' });
      const r2 = await routeVoiceIntent(p, { language: 'en', customers: INITIAL_CUSTOMERS, items: INITIAL_ITEMS });
      expect(r1.intent, `rule "${p}"`).toBe('show_low_stock');
      expect(r2.intent, `route "${p}"`).toBe('show_low_stock');
    }

    const orderPhrases = [
      'order the item running low',
      'order items that are running low',
      'restock low items',
      'buy whatever is running low',
    ];
    for (const p of orderPhrases) {
      const r1 = parseWithRules(p, { customers: INITIAL_CUSTOMERS, items: INITIAL_ITEMS, preferredLanguage: 'en' });
      const r2 = await routeVoiceIntent(p, { language: 'en', customers: INITIAL_CUSTOMERS, items: INITIAL_ITEMS });
      expect([r1.intent, r2.intent]).toContain('build_order_list');
    }
  });

  it('handles semantic paraphrases in MockIntentClassifier', async () => {
    const clf = new MockIntentClassifier();
    expect((await clf.classify('how much did I earn today', 'en')).intent).toBe('summary');
    expect((await clf.classify('take back the last entry', 'en')).intent).toBe('undo');
    expect((await clf.classify('restock items finishing soon', 'en')).intent).toBe('build_order_list');
    expect((await clf.classify('which goods are finishing', 'en')).intent).toBe('show_low_stock');
  });
});

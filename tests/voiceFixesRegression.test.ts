import { describe, it, expect } from 'vitest';
import { parsePendingCorrection } from '../src/voice/pendingCorrectionParser';
import { routeVoiceIntent } from '../src/voice/intentRouter';
import { parseWithRules } from '../src/parser/ruleParser';
import { parseSpeech } from '../src/parser';
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

  it('handles semantic paraphrases in MockIntentClassifier across all intent groups', async () => {
    const clf = new MockIntentClassifier();
    const cases: Array<[string, string]> = [
      ['how much did I earn today', 'summary'],
      ['take back the last entry', 'undo'],
      ['restock items finishing soon', 'build_order_list'],
      ['which goods are finishing', 'show_low_stock'],
      ['dispatch the order to supplier', 'send_order'],
      ['please procure 5 kg sugar', 'order_item'],
      ['how much rice is remaining in inventory', 'stock'],
      ['open the warehouse inventory', 'open_stock'],
      ['take a photo of the receipt', 'open_bill_scan'],
      ['change my reminder schedule settings', 'reminder_settings'],
      ['follow up with customers who owe me', 'recovery'],
      ['update wholesale cost price to 40', 'set_cost_price'],
      ['change retail selling price to 55', 'set_selling_price'],
      ['capture customer voice consent', 'proof'],
      ['listen to the voice recording', 'play_proof'],
      ['fix the wrong amount to 300', 'change_amount'],
      ['change the product to atta', 'change_item'],
      ['correct the customer name', 'change_customer'],
      ['adjust quantity to 3 kg', 'change_quantity'],
      ['fix the entry date', 'change_date'],
      ['update the remark on it', 'edit_note'],
      ['modify that transaction', 'edit_entry'],
      ['monthly udhaar total summary', 'monthly_credit_summary'],
      ['who has the biggest pending dues', 'top_debtors'],
      ['open all customer passbook', 'open_ledger'],
      ['check the account passbook of Ramesh', 'show_customer_ledger'],
      ['show latest activity entries', 'recent_transactions'],
      ['paid 500 for shop electricity bill', 'expense'],
      ['customer settled 400 rupees', 'payment'],
      ['put 250 on tab for later', 'credit'],
      ['sold for 150 cash mein', 'sale'],
      ['say again please', 'repeat'],
      ['dismiss this screen', 'close'],
    ];
    for (const [phrase, expected] of cases) {
      expect((await clf.classify(phrase, 'en')).intent, `phrase="${phrase}"`).toBe(expected);
    }
  });

  it('routes natural paraphrases end-to-end through parseSpeech', async () => {
    const ctx = { customers: INITIAL_CUSTOMERS, items: INITIAL_ITEMS, language: 'en' as const };
    expect((await parseSpeech('take a photo of the receipt', ctx)).intent).toBe('open_bill_scan');
    expect((await parseSpeech('follow up with customers who owe me', ctx)).intent).toBe('recovery');
    expect((await parseSpeech('change my reminder schedule settings', ctx)).intent).toBe('reminder_settings');
    expect((await parseSpeech('which goods are finishing', ctx)).intent).toBe('show_low_stock');
    expect((await parseSpeech('restock items finishing soon', ctx)).intent).toBe('build_order_list');
  });
});

import { describe, it, expect } from 'vitest';
import { routeVoiceIntent } from '../src/voice/intentRouter';
import { parseWithRules } from '../src/parser/ruleParser';
import { resolveTargetEntry, extractNewEditValue } from '../src/voice/entryResolver';
import { INITIAL_CUSTOMERS, INITIAL_ITEMS } from '../src/data/mockData';
import { Transaction } from '../src/types/schema';

const now = Date.now();
const sampleTransactions: Transaction[] = [
  {
    id: 'tx-latest',
    shop_id: 'shop-1',
    type: 'credit',
    amount: 500,
    customer_id: INITIAL_CUSTOMERS[0].id, // Ramesh Sharma
    items: [{ name: 'chini', quantity: 2, unit: 'kilo', price: 500 }],
    created_at: new Date(now - 60_000).toISOString(),
    confirmed_by_voice: true,
  },
  {
    id: 'tx-older-ramesh',
    shop_id: 'shop-1',
    type: 'credit',
    amount: 300,
    customer_id: INITIAL_CUSTOMERS[0].id, // Ramesh Sharma
    items: [{ name: 'aata', quantity: 5, unit: 'kilo', price: 300 }],
    created_at: new Date(now - 3600_000).toISOString(),
    confirmed_by_voice: true,
  },
  {
    id: 'tx-yesterday-suresh',
    shop_id: 'shop-1',
    type: 'payment',
    amount: 250,
    customer_id: INITIAL_CUSTOMERS[2].id, // Suresh
    items: [],
    created_at: new Date(now - 86400_000).toISOString(),
    confirmed_by_voice: false,
  },
];

describe('Part 2: Saved-Entry Edit Intents & Target Resolution', () => {
  it('parses all 7 saved-entry edit intents via ruleParser & intentRouter', async () => {
    const cases: Array<[string, string]> = [
      ['pichhli entry badlo', 'edit_entry'],
      ['edit the last transaction', 'edit_entry'],
      ['amount badal do 600', 'change_amount'],
      ['change the amount to 600', 'change_amount'],
      ['samaan badlo', 'change_item'],
      ['change the item', 'change_item'],
      ['customer badlo', 'change_customer'],
      ['change customer', 'change_customer'],
      ['quantity badal do', 'change_quantity'],
      ['change quantity to 5', 'change_quantity'],
      ['tarikh badlo', 'change_date'],
      ['change the date', 'change_date'],
      ['note edit karo', 'edit_note'],
      ['edit the note', 'edit_note'],
    ];

    for (const [phrase, expected] of cases) {
      const ruleRes = parseWithRules(phrase, { customers: INITIAL_CUSTOMERS, items: INITIAL_ITEMS });
      const routeRes = await routeVoiceIntent(phrase, { customers: INITIAL_CUSTOMERS, items: INITIAL_ITEMS, language: 'hi' });
      expect([ruleRes.intent, routeRes.intent]).toContain(expected);
    }
  });

  it('defaults to most recent entry when no specific filter is given', () => {
    const res = resolveTargetEntry(
      { rawText: 'pichhli entry ka amount 600 kar do' },
      sampleTransactions,
      INITIAL_CUSTOMERS,
      'hi'
    );
    expect(res.status).toBe('resolved');
    if (res.status === 'resolved') {
      expect(res.entry.id).toBe('tx-latest');
    }
  });

  it('resolves uniquely by amount, item, or date', () => {
    const byAmt = resolveTargetEntry(
      { rawText: 'Ramesh Sharma ki 300 wali entry badlo' },
      sampleTransactions,
      INITIAL_CUSTOMERS,
      'hi'
    );
    expect(byAmt.status).toBe('resolved');
    if (byAmt.status === 'resolved') {
      expect(byAmt.entry.id).toBe('tx-older-ramesh');
    }

    const byItem = resolveTargetEntry(
      { rawText: 'aata wali entry badlo' },
      sampleTransactions,
      INITIAL_CUSTOMERS,
      'hi'
    );
    expect(byItem.status).toBe('resolved');
    if (byItem.status === 'resolved') {
      expect(byItem.entry.id).toBe('tx-older-ramesh');
    }

    const byDate = resolveTargetEntry(
      { rawText: 'kal wali entry badlo' },
      sampleTransactions,
      INITIAL_CUSTOMERS,
      'hi'
    );
    expect(byDate.status).toBe('resolved');
    if (byDate.status === 'resolved') {
      expect(byDate.entry.id).toBe('tx-yesterday-suresh');
    }
  });

  it('asks for disambiguation instead of guessing when multiple entries match', () => {
    const res = resolveTargetEntry(
      { rawText: 'Ramesh Sharma ki entry badlo' },
      sampleTransactions,
      INITIAL_CUSTOMERS,
      'hi'
    );
    expect(res.status).toBe('ambiguous');
    if (res.status === 'ambiguous') {
      expect(res.candidates.length).toBe(2);
      expect(res.question).toBeTruthy();
    }
  });

  it('extracts replacement amount from "500 nahi 600 kar do"', () => {
    const val = extractNewEditValue('500 nahi 600 kar do', 'change_amount');
    expect(val.newAmount).toBe(600);
  });
});

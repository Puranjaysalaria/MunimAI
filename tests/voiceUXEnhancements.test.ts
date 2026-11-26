import { describe, it, expect } from 'vitest';
import { resolveOrdinalSelection, buildNumberedCustomerPrompt } from '../src/voice/ordinalMatcher';
import { parseWithRules } from '../src/parser/ruleParser';
import type { Customer } from '../src/types/schema';

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    shop_id: 's1',
    name: 'Ramesh Sharma',
    phone: '9999999991',
    address_note: 'Gali 4',
    balance_owed: 500,
    credit_limit: 5000,
    trust_score: 4,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    shop_id: 's1',
    name: 'Ramesh Verma',
    phone: '9999999992',
    address_note: 'Main Market',
    balance_owed: 200,
    credit_limit: 5000,
    trust_score: 4,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('Voice UX Enhancements (Disambiguation, Undo, Last Record)', () => {
  it('resolves ordinal selections across English, Hindi, Hinglish, and numbers', () => {
    expect(resolveOrdinalSelection('second one', MOCK_CUSTOMERS)?.id).toBe('c2');
    expect(resolveOrdinalSelection('the 2nd one', MOCK_CUSTOMERS)?.id).toBe('c2');
    expect(resolveOrdinalSelection('number 2', MOCK_CUSTOMERS)?.id).toBe('c2');
    expect(resolveOrdinalSelection('doosra wala', MOCK_CUSTOMERS)?.id).toBe('c2');
    expect(resolveOrdinalSelection('दूसरा', MOCK_CUSTOMERS)?.id).toBe('c2');
    expect(resolveOrdinalSelection('first one', MOCK_CUSTOMERS)?.id).toBe('c1');
    expect(resolveOrdinalSelection('1st', MOCK_CUSTOMERS)?.id).toBe('c1');
  });

  it('builds numbered spoken prompt for disambiguation', () => {
    const prompt = buildNumberedCustomerPrompt(MOCK_CUSTOMERS, 'en');
    expect(prompt).toContain('1. Ramesh Sharma, Gali 4');
    expect(prompt).toContain('2. Ramesh Verma, Main Market');
    expect(prompt).toContain('Which one?');
  });

  it('parses last_customer_record queries naturally', () => {
    const res1 = parseWithRules('what was the last record of Ramesh', {
      customers: MOCK_CUSTOMERS,
      items: [],
      preferredLanguage: 'en',
    });
    expect(res1.intent).toBe('last_customer_record');
    expect(res1.customer).toBeTruthy();

    const res2 = parseWithRules('Ramesh ka last hisab kya tha', {
      customers: MOCK_CUSTOMERS,
      items: [],
      preferredLanguage: 'hi',
    });
    expect(res2.intent).toBe('last_customer_record');
  });

  it('parses natural undo / cancel / remove last transaction phrases', () => {
    for (const phrase of [
      'undo last transaction',
      'cancel the last entry',
      'remove last transaction',
      'delete the entry I just made',
      'pichla hisab hatao',
    ]) {
      const res = parseWithRules(phrase, { customers: MOCK_CUSTOMERS, items: [] });
      expect(res.intent).toBe('undo');
    }
  });
});

import { describe, it, expect } from 'vitest';
import { parsePendingCorrection } from '../src/voice/pendingCorrectionParser';
import { INITIAL_CUSTOMERS, INITIAL_ITEMS } from '../src/data/mockData';
import { PendingConfirmation } from '../src/components/ConfirmationCard/ConfirmationCard';
import { LanguageCode } from '../src/i18n/types';

const basePending: PendingConfirmation = {
  intent: 'credit',
  customer: INITIAL_CUSTOMERS[0], // Ramesh Sharma
  customerName: INITIAL_CUSTOMERS[0].name,
  amount: 500,
  item: INITIAL_ITEMS[0], // chini
  itemName: INITIAL_ITEMS[0].name,
  quantity: 2,
  unit: 'kilo',
  rawText: 'Ramesh ko 500 udhaar 2 kilo chini',
};

describe('Part 1: Pending Corrections (while confirmation card is showing)', () => {
  it('updates amount on "nahi, 600" without restarting', () => {
    const res = parsePendingCorrection('nahi, 600', basePending, {
      language: 'hi',
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
    });
    expect(res.type).toBe('update_slots');
    if (res.type === 'update_slots') {
      expect(res.updatedFields).toContain('amount');
      expect(res.newAmount).toBe(600);
      expect(res.spokenReadback).toContain('₹600');
    }
  });

  it('replaces old amount with new amount on "600 nahi 500"', () => {
    const res = parsePendingCorrection('600 nahi 500', { ...basePending, amount: 600 }, {
      language: 'hi',
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
    });
    expect(res.type).toBe('update_slots');
    if (res.type === 'update_slots') {
      expect(res.newAmount).toBe(500);
    }
  });

  it('updates customer on "Ramesh Kumar wala"', () => {
    const res = parsePendingCorrection('Ramesh Kumar wala', basePending, {
      language: 'hi',
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
    });
    expect(res.type).toBe('update_slots');
    if (res.type === 'update_slots') {
      expect(res.updatedFields).toContain('customer');
      expect(res.newCustomer?.name).toBe('Ramesh Kumar');
    }
  });

  it('triggers disambiguation if customer correction matches two customers ("Ramesh wala")', () => {
    const res = parsePendingCorrection('Ramesh wala', basePending, {
      language: 'hi',
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
    });
    expect(res.type).toBe('update_slots');
    if (res.type === 'update_slots') {
      expect(res.ambiguousCustomers?.length).toBeGreaterThan(1);
    }
  });

  it('updates item on "chini nahi aata"', () => {
    const res = parsePendingCorrection('chini nahi aata', basePending, {
      language: 'hi',
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
    });
    expect(res.type).toBe('update_slots');
    if (res.type === 'update_slots') {
      expect(res.updatedFields).toContain('item');
      expect(res.newItemName?.toLowerCase()).toBe('aata');
    }
  });

  it('updates quantity on "do kilo nahi paanch"', () => {
    const res = parsePendingCorrection('do kilo nahi paanch', basePending, {
      language: 'hi',
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
    });
    expect(res.type).toBe('update_slots');
    if (res.type === 'update_slots') {
      expect(res.updatedFields).toContain('quantity');
      expect(res.newQuantity).toBe(5);
    }
  });

  it('computes relative increase "200 aur jodo" from pending amount', () => {
    const res = parsePendingCorrection('200 aur jodo', basePending, {
      language: 'hi',
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
    });
    expect(res.type).toBe('update_slots');
    if (res.type === 'update_slots') {
      expect(res.newAmount).toBe(700);
    }
  });

  it('computes relative double "double kar do" from pending amount', () => {
    const res = parsePendingCorrection('double kar do', basePending, {
      language: 'hi',
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
    });
    expect(res.type).toBe('update_slots');
    if (res.type === 'update_slots') {
      expect(res.newAmount).toBe(1000);
    }
  });

  it('computes relative slight decrease "thoda kam karo" from pending amount', () => {
    const res = parsePendingCorrection('thoda kam karo', basePending, {
      language: 'hi',
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
    });
    expect(res.type).toBe('update_slots');
    if (res.type === 'update_slots') {
      expect(res.newAmount).toBeLessThan(500);
      expect(res.newAmount).toBeGreaterThan(0);
    }
  });

  it('pauses without saving on "ruko" and cancels on "cancel" / "nahi"', () => {
    expect(parsePendingCorrection('ruko', basePending, { language: 'hi' }).type).toBe('pause');
    expect(parsePendingCorrection('wait', basePending, { language: 'en' }).type).toBe('pause');
    expect(parsePendingCorrection('cancel', basePending, { language: 'en' }).type).toBe('cancel');
    expect(parsePendingCorrection('nahi', basePending, { language: 'hi' }).type).toBe('cancel');
  });

  it('handles date correction "aaj nahi kal"', () => {
    const res = parsePendingCorrection('aaj nahi kal', basePending, {
      language: 'hi',
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
    });
    expect(res.type).toBe('update_slots');
    if (res.type === 'update_slots') {
      expect(res.updatedFields).toContain('date');
      expect(res.newDate).toBeTruthy();
    }
  });

  it('returns localized readbacks across all 10 languages', () => {
    const langs: LanguageCode[] = ['hi', 'en', 'pa', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml'];
    for (const lang of langs) {
      const res = parsePendingCorrection('nahi, 750', basePending, {
        language: lang,
        customers: INITIAL_CUSTOMERS,
        items: INITIAL_ITEMS,
      });
      expect(res.type).toBe('update_slots');
      if (res.type === 'update_slots') {
        expect(res.newAmount).toBe(750);
        expect(res.spokenReadback).toContain('₹750');
      }
    }
  });
});

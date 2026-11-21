import { describe, it, expect } from 'vitest';
import {
  formatItemName,
  formatUnit,
  getLocalizedTransactionDesc,
} from '../src/lib/nameTranslation';
import { Transaction } from '../src/types/schema';

describe('Grocery Item & Unit Dynamic Multilingual Localization', () => {
  const languages = ['en', 'hi', 'pa', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml'] as const;

  it('translates all core grocery items across all 10 commercial Indic languages', () => {
    const testItems = ['chini', 'aata', 'doodh', 'chawal', 'dal', 'tel', 'chai patti', 'namak'];

    for (const item of testItems) {
      for (const lang of languages) {
        const localized = formatItemName(item, lang);
        expect(localized).toBeTruthy();
        expect(typeof localized).toBe('string');
        // Ensure that for non-English active languages, it returns Indic script representation
        if (lang === 'pa') {
          if (item === 'chini') expect(localized).toBe('ਖੰਡ');
          if (item === 'aata') expect(localized).toBe('ਆਟਾ');
          if (item === 'doodh') expect(localized).toBe('ਦੁੱਧ');
          if (item === 'chawal') expect(localized).toBe('ਚੌਲ');
          if (item === 'dal') expect(localized).toBe('ਦਾਲ');
          if (item === 'tel') expect(localized).toBe('ਤੇਲ');
          if (item === 'chai patti') expect(localized).toBe('ਚਾਹ ਪੱਤੀ');
        } else if (lang === 'hi') {
          if (item === 'chini') expect(localized).toBe('चीनी');
          if (item === 'doodh') expect(localized).toBe('दूध');
          if (item === 'tel') expect(localized).toBe('तेल');
        } else if (lang === 'gu') {
          if (item === 'chini') expect(localized).toBe('ખાંડ');
          if (item === 'aata') expect(localized).toBe('લોટ');
        }
      }
    }
  });

  it('translates measurement units across all 10 supported commercial languages', () => {
    const testUnits = ['kilo', 'litre', 'packet', 'piece'];

    for (const unit of testUnits) {
      for (const lang of languages) {
        const localized = formatUnit(unit, lang);
        expect(localized).toBeTruthy();
        if (lang === 'pa') {
          if (unit === 'kilo') expect(localized).toBe('ਕਿਲੋ');
          if (unit === 'litre') expect(localized).toBe('ਲੀਟਰ');
          if (unit === 'packet') expect(localized).toBe('ਪੈਕੇਟ');
          if (unit === 'piece') expect(localized).toBe('ਪੀਸ');
        } else if (lang === 'hi') {
          if (unit === 'kilo') expect(localized).toBe('किलो');
          if (unit === 'litre') expect(localized).toBe('लीटर');
        } else if (lang === 'gu') {
          if (unit === 'litre') expect(localized).toBe('લિટર');
        }
      }
    }
  });

  it('resolves item aliases and synonyms correctly to localized names', () => {
    expect(formatItemName('cheeni', 'pa')).toBe('ਖੰਡ');
    expect(formatItemName('sugar', 'hi')).toBe('चीनी');
    expect(formatItemName('atta', 'pa')).toBe('ਆਟਾ');
    expect(formatItemName('milk', 'pa')).toBe('ਦੁੱਧ');
    expect(formatItemName('tea', 'pa')).toBe('ਚਾਹ ਪੱਤੀ');
    expect(formatItemName('oil', 'pa')).toBe('ਤੇਲ');
  });

  it('resolves compound names and brand variants through substring matching', () => {
    expect(formatItemName('Amul Doodh', 'pa')).toBe('ਦੁੱਧ');
    expect(formatItemName('Chakki Aata', 'hi')).toBe('आटा');
    expect(formatItemName('Fortune Tel', 'pa')).toBe('ਤੇਲ');
  });

  it('localizes structured transaction descriptions with translated items and units', () => {
    const mockTx: Transaction = {
      id: 'tx-123',
      shop_id: 'shop-1',
      customer_id: 'cust-1',
      type: 'credit',
      amount: 500,
      items: [
        { name: 'doodh', quantity: 2, unit: 'litre', price: 132 },
        { name: 'chini', quantity: 5, unit: 'kilo', price: 220 },
      ],
      created_at: new Date().toISOString(),
      confirmed_by_voice: true,
    };

    const paDesc = getLocalizedTransactionDesc(mockTx, 'Ramesh Sharma', 'pa');
    expect(paDesc).toContain('ਦੁੱਧ');
    expect(paDesc).toContain('ਲੀਟਰ');
    expect(paDesc).toContain('ਖੰਡ');
    expect(paDesc).toContain('ਕਿਲੋ');

    const hiDesc = getLocalizedTransactionDesc(mockTx, 'Ramesh Sharma', 'hi');
    expect(hiDesc).toContain('दूध');
    expect(hiDesc).toContain('लीटर');
    expect(hiDesc).toContain('चीनी');
    expect(hiDesc).toContain('किलो');
  });
});

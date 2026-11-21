import { describe, it, expect } from 'vitest';
import { ExtractedBillItem } from '../src/lib/billOcrService';

// Function mirroring the discrepancy adjustment logic in BillScanModal
function matchPriceAdjustment(
  speechText: string,
  items: ExtractedBillItem[]
): { matchedItem: ExtractedBillItem | null; newPrice: number | null } {
  const numMatches = speechText.match(/\b(\d+(?:\.\d+)?)\b/g);
  if (!numMatches || numMatches.length === 0) {
    return { matchedItem: null, newPrice: null };
  }

  const newPrice = Number(numMatches[numMatches.length - 1]);
  const query = speechText
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '')
    .replace(
      /\b(rupaye|rupayee|rupees|rs|inr|daam|bhaav|price|rate|karo|kar|do|ka|to|change|set|update|badlo|kardo|packet|piece|litre|kg|kilo|cost|selling)\b/gi,
      ''
    )
    .trim()
    .toLowerCase();

  let bestMatch: ExtractedBillItem | null = null;
  let highestScore = 0;

  for (const it of items) {
    const itName = it.name.toLowerCase();
    let score = 0;

    if (query.length > 1 && (itName.includes(query) || query.includes(itName))) {
      score += 10;
    }

    const tokens = query.split(/\s+/).filter((t) => t.length > 1);
    for (const token of tokens) {
      if (itName.includes(token)) score += 3;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = it;
    }
  }

  return {
    matchedItem: highestScore > 0 ? bestMatch : null,
    newPrice: newPrice > 0 ? newPrice : null,
  };
}

describe('Bill Scan Voice Price Discrepancy & Confirmation Flow', () => {
  const mockScannedItems: ExtractedBillItem[] = [
    {
      id: 'item-1',
      name: 'Butter Biscuit',
      quantity: 1,
      unit: 'packet',
      price: 46,
      priceType: 'cost',
      selected: true,
    },
    {
      id: 'item-2',
      name: 'Toastea Rusk',
      quantity: 2,
      unit: 'packet',
      price: 20,
      priceType: 'cost',
      selected: true,
    },
    {
      id: 'item-3',
      name: 'Udhayakrishna Ghee 500ml',
      quantity: 1,
      unit: 'packet',
      price: 430,
      priceType: 'cost',
      selected: true,
    },
  ];

  it('correctly matches voice adjustment "Butter biscuit 45 rupaye" to Butter Biscuit with price 45', () => {
    const res = matchPriceAdjustment('Butter biscuit 45 rupaye', mockScannedItems);
    expect(res.matchedItem).toBeDefined();
    expect(res.matchedItem?.name).toBe('Butter Biscuit');
    expect(res.newPrice).toBe(45);
  });

  it('correctly matches voice adjustment "Ghee 400" to Udhayakrishna Ghee 500ml with price 400', () => {
    const res = matchPriceAdjustment('Ghee 400', mockScannedItems);
    expect(res.matchedItem).toBeDefined();
    expect(res.matchedItem?.name).toBe('Udhayakrishna Ghee 500ml');
    expect(res.newPrice).toBe(400);
  });

  it('correctly matches "Rusk 25 rupaye karo" to Toastea Rusk with price 25', () => {
    const res = matchPriceAdjustment('Rusk 25 rupaye karo', mockScannedItems);
    expect(res.matchedItem).toBeDefined();
    expect(res.matchedItem?.name).toBe('Toastea Rusk');
    expect(res.newPrice).toBe(25);
  });

  it('recognizes confirmation keywords across Hindi, Punjabi, and English', () => {
    const latinYes = /\b(haan|ha|haa|yes|yeah|yup|ok|okay|confirm|save|update|theek\s*hai|theek|sahi|sahi\s*hai|kar\s*do|karo|done|right|aaho|ho)\b/i;
    const indicYes = /(?:^|\s|[^\p{L}\p{N}])(हाँ|हां|हाँजी|जी\s*हाँ|लिख\s*दो|कर\s*दो|ठीक\s*है|सही\s*है|ਹਾਂ|ਹਾਂਜੀ|ਜੀ\s*ਹਾਂ|ਆਹੋ|ਠੀਕ\s*ਹੈ)(?:$|\s|[^\p{L}\p{N}])/u;

    const testPhrases = ['yes', 'haan', 'theek hai', 'confirm', 'update', 'haan kar do', 'हाँ', 'हाँजी', 'ਹਾਂ', 'ਹਾਂਜੀ', 'ਠੀਕ ਹੈ'];

    for (const phrase of testPhrases) {
      const isConfirmed = latinYes.test(phrase) || indicYes.test(phrase);
      expect(isConfirmed).toBe(true);
    }
  });
});

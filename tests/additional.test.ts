import { describe, it, expect } from 'vitest';
import {
  calculateCustomerTrustScore,
  checkCreditLimitWarning,
} from '../src/lib/trustScore';
import {
  getSeasonalStockInsights,
  getSeasonalRecommendedItems,
} from '../src/lib/seasonalInsights';
import { Customer, Transaction } from '../src/types/schema';
import { INITIAL_ITEMS, DEMO_SHOP_ID } from '../src/data/mockData';

describe('Phase 7: Customer Trust Score & Credit Limit Safeguards', () => {
  const goodCustomer: Customer = {
    id: 'cust-good-1',
    shop_id: DEMO_SHOP_ID,
    name: 'Sunita Devi',
    preferred_language: 'hi',
    credit_limit: 3000,
    balance_owed: 350,
    trust_score: 95,
  };

  const riskyCustomer: Customer = {
    id: 'cust-risky-1',
    shop_id: DEMO_SHOP_ID,
    name: 'Manoj Tiwari',
    preferred_language: 'hi',
    credit_limit: 2000,
    balance_owed: 2600, // already over limit
    trust_score: 55,
  };

  const mockTxs: Transaction[] = [
    {
      id: 'tx-1',
      shop_id: DEMO_SHOP_ID,
      customer_id: 'cust-good-1',
      type: 'credit',
      amount: 1000,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      confirmed_by_voice: true,
    },
    {
      id: 'tx-2',
      shop_id: DEMO_SHOP_ID,
      customer_id: 'cust-good-1',
      type: 'payment',
      amount: 1000, // 100% repaid
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      confirmed_by_voice: true,
    },
  ];

  it('calculates high trust score for customer with strong repayment record', () => {
    const details = calculateCustomerTrustScore(goodCustomer, mockTxs);
    expect(details.score).toBeGreaterThanOrEqual(90);
    expect(details.tier).toBe('excellent');
    expect(details.repaymentRatio).toBe(1.0);
  });

  it('calculates lower trust score and flags high risk when debt exceeds limit', () => {
    const details = calculateCustomerTrustScore(riskyCustomer, []);
    expect(details.score).toBeLessThanOrEqual(65);
    expect(['moderate', 'high_risk']).toContain(details.tier);
  });

  it('triggers credit limit warning before confirming excessive udhaar', () => {
    // Current owed: 350, limit: 3000
    // Lending 2500 -> 2850 (within limit)
    const check1 = checkCreditLimitWarning(goodCustomer, 2500);
    expect(check1.isExceeded).toBe(false);

    // Lending 3000 -> 3350 (exceeds limit by 350)
    const check2 = checkCreditLimitWarning(goodCustomer, 3000);
    expect(check2.isExceeded).toBe(true);
    expect(check2.projectedBalance).toBe(3350);
    expect(check2.excessAmount).toBe(350);
    expect(check2.warningTextHi).toContain('3350');
  });
});

describe('Phase 7: Seasonal Stock Insights & Calendar Analytics', () => {
  it('returns seasonal demand recommendations with item impact mapping', () => {
    const insights = getSeasonalStockInsights();
    expect(insights.length).toBeGreaterThan(0);

    const active = insights[0];
    expect(active.seasonKey).toBeDefined();
    expect(active.recommendedBoostPercentage).toBeGreaterThanOrEqual(15);

    // Filter recommended items
    const recommendedItems = getSeasonalRecommendedItems(INITIAL_ITEMS, active);
    expect(recommendedItems.length).toBeGreaterThan(0);
  });

  it('provides specific recommendations for festive Diwali / Wedding months', () => {
    // Month 10 = November (Diwali & Wedding season in India)
    const novDate = new Date(2026, 10, 15);
    const insights = getSeasonalStockInsights(novDate);

    const diwaliOrWedding = insights.find(
      (i) => i.seasonKey === 'diwali' || i.seasonKey === 'wedding'
    );
    expect(diwaliOrWedding).toBeDefined();
    expect(diwaliOrWedding!.impactedItemNames).toContain('chini');
  });
});

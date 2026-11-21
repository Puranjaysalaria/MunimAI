import { describe, it, expect } from 'vitest';
import {
  compute14DayStockAnalysis,
  groupOrdersBySupplier,
  computeDailySummary,
  generateStockVoiceReply,
  generateDailySummaryVoice,
} from '../src/lib/stockAnalytics';
import { parseWithRules } from '../src/parser/ruleParser';
import {
  INITIAL_CUSTOMERS,
  INITIAL_ITEMS,
  INITIAL_SUPPLIERS,
  generate14DaysTransactions,
  DEMO_SHOP_ID,
} from '../src/data/mockData';
import { Transaction } from '../src/types/schema';

describe('Phase 5: Stock Analytics, Prediction & Reordering', () => {
  const items = INITIAL_ITEMS;
  const suppliers = INITIAL_SUPPLIERS;
  const pastTransactions = generate14DaysTransactions();

  it('calculates 14-day sales run rate and identifies critical low stock', () => {
    const analysis = compute14DayStockAnalysis(items, pastTransactions);

    expect(analysis.length).toBe(items.length);

    // Doodh (Milk) has 8 litres in stock, high daily turnover
    const doodhAnalysis = analysis.find((a) => a.item.name === 'doodh');
    expect(doodhAnalysis).toBeDefined();
    expect(doodhAnalysis!.isCritical).toBe(true);
    expect(doodhAnalysis!.daysStockLeft).toBeLessThan(2);
    expect(doodhAnalysis!.suggestedReorderQty).toBeGreaterThan(0);

    // Chawal (Rice) has 80 kg in stock, should have plenty of days left
    const chawalAnalysis = analysis.find((a) => a.item.name === 'chawal');
    expect(chawalAnalysis).toBeDefined();
    expect(chawalAnalysis!.daysStockLeft).toBeGreaterThan(5);
    expect(chawalAnalysis!.isCritical).toBe(false);
  });

  it('groups low stock items by supplier with 7-day restock quantities and estimated costs', () => {
    const analysis = compute14DayStockAnalysis(items, pastTransactions);
    const drafts = groupOrdersBySupplier(analysis, suppliers);

    expect(drafts.length).toBe(suppliers.length);

    // Aggarwal Grain Mandi: Grains, Pulses, Sugar
    const aggarwalDraft = drafts.find((d) =>
      d.supplier.name.includes('Aggarwal')
    );
    expect(aggarwalDraft).toBeDefined();
    const aggarwalItemNames = aggarwalDraft!.items.map((i) => i.item.name);
    // Should only contain grain/pulse items
    aggarwalItemNames.forEach((name) => {
      expect(['chini', 'aata', 'chawal', 'dal']).toContain(name);
    });

    // Gupta Dairy & FMCG: Milk, FMCG, Spices
    const guptaDraft = drafts.find((d) => d.supplier.name.includes('Gupta'));
    expect(guptaDraft).toBeDefined();
    const guptaItemNames = guptaDraft!.items.map((i) => i.item.name);
    expect(guptaItemNames).toContain('doodh');

    // Total estimated cost should be positive
    expect(guptaDraft!.totalEstimatedCost).toBeGreaterThan(0);
  });

  it('generates natural spoken stock replies in Hindi, Punjabi, and English', () => {
    const analysis = compute14DayStockAnalysis(items, pastTransactions);
    const doodhAnalysis = analysis.find((a) => a.item.name === 'doodh')!;

    const hindiVoice = generateStockVoiceReply(doodhAnalysis, 'hi');
    expect(hindiVoice).toContain('दूध');
    expect(hindiVoice).toContain('खत्म होने वाला');

    const punjabiVoice = generateStockVoiceReply(doodhAnalysis, 'pa');
    expect(punjabiVoice).toContain('ਦੁੱਧ');
    expect(punjabiVoice).toContain('ਸਟਾਕ ਖ਼ਤਮ');

    const englishVoice = generateStockVoiceReply(doodhAnalysis, 'en');
    expect(englishVoice).toContain('doodh stock is critically low');
  });
});

describe('Phase 5: Daily Summary & Financial Voice Narration', () => {
  it('computes today summary metrics accurately', () => {
    const now = Date.now();
    const testTxs: Transaction[] = [
      {
        id: 'tx-1',
        shop_id: DEMO_SHOP_ID,
        type: 'sale',
        amount: 800,
        created_at: new Date(now).toISOString(),
        confirmed_by_voice: true,
      },
      {
        id: 'tx-2',
        shop_id: DEMO_SHOP_ID,
        type: 'credit',
        amount: 500,
        customer_id: '11111111-0000-0000-0000-000000000001',
        created_at: new Date(now).toISOString(),
        confirmed_by_voice: true,
      },
      {
        id: 'tx-3',
        shop_id: DEMO_SHOP_ID,
        type: 'payment',
        amount: 300,
        customer_id: '11111111-0000-0000-0000-000000000002',
        created_at: new Date(now).toISOString(),
        confirmed_by_voice: true,
      },
      {
        id: 'tx-4',
        shop_id: DEMO_SHOP_ID,
        type: 'expense',
        amount: 50,
        created_at: new Date(now).toISOString(),
        confirmed_by_voice: false,
      },
    ];

    const summary = computeDailySummary(testTxs);
    expect(summary.totalSales).toBe(800);
    expect(summary.creditGiven).toBe(500);
    expect(summary.cashCollected).toBe(300);
    expect(summary.expenses).toBe(50);
    // (800 + 500) * 0.15 - 50 = 195 - 50 = 145
    expect(summary.estimatedProfit).toBe(145);
    expect(summary.transactionCount).toBe(4);

    const spokenHindi = generateDailySummaryVoice(summary, 'hi');
    expect(spokenHindi).toContain('800');
    expect(spokenHindi).toContain('500');
    expect(spokenHindi).toContain('145');
  });
});

describe('Phase 5: Payment Received Intent & Voice Disambiguation', () => {
  const context = {
    customers: INITIAL_CUSTOMERS,
    items: INITIAL_ITEMS,
  };

  it('parses payment received in Hindi ("Ramesh Sharma ne 200 diye")', () => {
    const res = parseWithRules('Ramesh Sharma ne 200 diye', context);
    expect(res.intent).toBe('payment');
    expect(res.customer).toBe('Ramesh Sharma');
    expect(res.amount).toBe(200);
  });

  it('parses payment received in Punjabi ("Harpreet ne 400 wapis kite")', () => {
    const res = parseWithRules('Harpreet ne 400 wapis kite', context);
    expect(res.intent).toBe('payment');
    expect(res.amount).toBe(400);
  });

  it('parses stock query for milk in Hindi ("Doodh khatam hone wala hai?")', () => {
    const res = parseWithRules('Doodh khatam hone wala hai?', context);
    expect(res.intent).toBe('stock');
    expect(res.item).toBe('doodh');
  });

  it('parses weekly supplier order intent ("Agle hafte ka samaan mangwana hai")', () => {
    const res = parseWithRules('Agle hafte ka samaan mangwana hai', context);
    expect(res.intent).toBe('ordering');
  });

  it('parses daily earnings inquiry ("Aaj kitni kamai hui?")', () => {
    const res = parseWithRules('Aaj kitni kamai hui?', context);
    expect(res.intent).toBe('summary');
  });

  it('verifies that items support MRP and MRP is greater than or equal to selling price', () => {
    expect(INITIAL_ITEMS.length).toBeGreaterThan(0);
    INITIAL_ITEMS.forEach((it) => {
      expect(it.mrp).toBeDefined();
      expect(it.mrp).toBeGreaterThanOrEqual(it.selling_price);
      expect(it.selling_price).toBeGreaterThanOrEqual(it.cost_price);
    });
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { buildAppendOnlyCorrection, getEffectiveTransactions } from '../src/lib/correctionService';
import { resolveTargetEntry } from '../src/voice/entryResolver';
import { computeDailySummary, compute14DayStockAnalysis } from '../src/lib/stockAnalytics';
import { INITIAL_CUSTOMERS, INITIAL_ITEMS } from '../src/data/mockData';
import { Transaction, User } from '../src/types/schema';

const ownerUser: User = {
  id: 'usr-owner-1',
  shop_id: 'shop-1',
  phone: '+919876543210',
  name: 'Madan Lal Sharma',
  role: 'owner',
};

describe('Part 3: Append-Only Corrections & Audit Log', () => {
  it('never overwrites the original transaction and generates linked reversal + correction + audit log', () => {
    const original: Transaction = {
      id: 'tx-orig-1',
      shop_id: 'shop-1',
      type: 'credit',
      amount: 500,
      customer_id: INITIAL_CUSTOMERS[0].id,
      items: [{ name: 'chini', quantity: 2, unit: 'kilo', price: 500 }],
      created_at: new Date().toISOString(),
      confirmed_by_voice: true,
    };

    const originalSnapshot = JSON.stringify(original);

    const result = buildAppendOnlyCorrection(
      original,
      {
        amount: 600,
        items: [{ name: 'chini', quantity: 5, unit: 'kilo', price: 600 }],
      },
      {
        shopId: 'shop-1',
        actor: ownerUser,
        source: 'voice',
        reason: 'Customer took 5 kg instead of 2 kg',
      }
    );

    // Original object is NEVER mutated
    expect(JSON.stringify(original)).toBe(originalSnapshot);

    // Reversal & Correction are linked to original
    expect(result.reversalTx.is_reversal).toBe(true);
    expect(result.reversalTx.parent_transaction_id).toBe('tx-orig-1');
    expect(result.reversalTx.amount).toBe(500);

    expect(result.correctionTx.is_correction).toBe(true);
    expect(result.correctionTx.parent_transaction_id).toBe('tx-orig-1');
    expect(result.correctionTx.amount).toBe(600);

    // Balance delta = +100 for credit customer
    expect(result.customerBalanceDeltas).toEqual([
      { customerId: INITIAL_CUSTOMERS[0].id, delta: 100 },
    ]);

    // Stock delta = +3 kg sold (5 - 2)
    expect(result.itemStockDeltas).toEqual([
      { itemName: 'chini', quantityDelta: 3 },
    ]);

    // Audit log records who, when, before, after, and source
    expect(result.auditLog.actor_name).toBe('Madan Lal Sharma');
    expect(result.auditLog.actor_role).toBe('owner');
    expect(result.auditLog.source).toBe('voice');
    expect(result.auditLog.before_value.amount).toBe(500);
    expect(result.auditLog.after_value.amount).toBe(600);
    expect(result.auditLog.created_at).toBeTruthy();
  });

  it('handles customer reassignment by reversing old customer balance and crediting new customer', () => {
    const original: Transaction = {
      id: 'tx-orig-2',
      shop_id: 'shop-1',
      type: 'credit',
      amount: 400,
      customer_id: INITIAL_CUSTOMERS[0].id,
      items: [],
      created_at: new Date().toISOString(),
      confirmed_by_voice: true,
    };

    const result = buildAppendOnlyCorrection(
      original,
      { customer_id: INITIAL_CUSTOMERS[1].id, amount: 450 },
      { shopId: 'shop-1', actor: ownerUser, source: 'tap' }
    );

    expect(result.customerBalanceDeltas).toEqual(
      expect.arrayContaining([
        { customerId: INITIAL_CUSTOMERS[0].id, delta: -400 },
        { customerId: INITIAL_CUSTOMERS[1].id, delta: 450 },
      ])
    );
    expect(result.auditLog.source).toBe('tap');
  });

  it('keeps daily summary, profit, and stock analytics accurate after append-only corrections', () => {
    const nowIso = new Date().toISOString();
    const original: Transaction = {
      id: 'tx-orig-3',
      shop_id: 'shop-1',
      type: 'sale',
      amount: 500,
      items: [{ name: 'chini', quantity: 2, unit: 'kilo', price: 500 }],
      created_at: nowIso,
      confirmed_by_voice: true,
    };

    const corr = buildAppendOnlyCorrection(
      original,
      { amount: 1000, items: [{ name: 'chini', quantity: 5, unit: 'kilo', price: 1000 }] },
      { shopId: 'shop-1', actor: ownerUser, source: 'voice' }
    );

    const txs: Transaction[] = [
      corr.correctionTx,
      corr.reversalTx,
      { ...original, superseded_by: corr.correctionTx.id },
    ];

    const effective = getEffectiveTransactions(txs);
    expect(effective).toHaveLength(1);
    expect(effective[0].amount).toBe(1000);

    const summary = computeDailySummary(txs);
    expect(summary.totalSales).toBe(1000);
    expect(summary.estimatedProfit).toBe(150);

    const stock = compute14DayStockAnalysis(INITIAL_ITEMS, txs);
    const chini = stock.find((s) => s.item.name.toLowerCase() === 'chini');
    expect(chini?.totalSold14Days).toBe(5);
  });

  it('includes audit_logs and price_history tables with RLS in migration', () => {
    const sqlPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20261125000000_append_only_corrections_audit.sql'
    );
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.audit_logs');
    expect(sql).toContain('ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY "audit_logs_select_own_shop"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.price_history');
    expect(sql).toContain('ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY');
  });

  it('Fix 2: supports re-edit -> edit again -> undo once -> undo again with root entity_id & previous_correction_id', () => {
    const nowIso = new Date().toISOString();
    let balance = 1000;
    let chiniStock = 20;

    const orig: Transaction = {
      id: 'tx-root-1',
      shop_id: 'shop-1',
      type: 'credit',
      amount: 500,
      customer_id: INITIAL_CUSTOMERS[0].id,
      items: [{ name: 'chini', quantity: 2, unit: 'kilo', price: 500 }],
      created_at: nowIso,
      confirmed_by_voice: true,
    };

    // Edit 1: 500 -> 600, qty 2 -> 3
    const c1 = buildAppendOnlyCorrection(
      orig,
      { amount: 600, items: [{ name: 'chini', quantity: 3, unit: 'kilo', price: 600 }] },
      { shopId: 'shop-1', actor: ownerUser, source: 'voice' }
    );
    c1.customerBalanceDeltas.forEach((d) => (balance += d.delta));
    c1.itemStockDeltas.forEach((s) => (chiniStock -= s.quantityDelta));
    let txs: Transaction[] = [
      c1.correctionTx,
      c1.reversalTx,
      { ...orig, superseded_by: c1.correctionTx.id },
    ];
    expect(c1.auditLog.entity_id).toBe('tx-root-1');
    expect(c1.auditLog.previous_correction_id).toBeNull();

    // Voice entryResolver must resolve to c1.correctionTx (effective 600), NOT orig (500)
    const resolvedAfterEdit1 = resolveTargetEntry(
      { rawText: 'Ramesh Sharma ki entry badlo' },
      txs,
      INITIAL_CUSTOMERS,
      'hi'
    );
    expect(resolvedAfterEdit1.status).toBe('resolved');
    if (resolvedAfterEdit1.status === 'resolved') {
      expect(resolvedAfterEdit1.entry.id).toBe(c1.correctionTx.id);
      expect(resolvedAfterEdit1.entry.amount).toBe(600);
    }

    // Edit 2 (Re-edit): 600 -> 900, qty 3 -> 5
    const c2 = buildAppendOnlyCorrection(
      c1.correctionTx,
      { amount: 900, items: [{ name: 'chini', quantity: 5, unit: 'kilo', price: 900 }] },
      { shopId: 'shop-1', actor: ownerUser, source: 'voice' }
    );
    c2.customerBalanceDeltas.forEach((d) => (balance += d.delta));
    c2.itemStockDeltas.forEach((s) => (chiniStock -= s.quantityDelta));
    txs = [
      c2.correctionTx,
      c2.reversalTx,
      ...txs.map((t) => (t.id === c1.correctionTx.id ? { ...t, superseded_by: c2.correctionTx.id } : t)),
    ];

    expect(c2.correctionTx.parent_transaction_id).toBe('tx-root-1');
    expect(c2.correctionTx.previous_correction_id).toBe(c1.correctionTx.id);
    expect(c2.auditLog.entity_id).toBe('tx-root-1');
    expect(c2.auditLog.previous_correction_id).toBe(c1.correctionTx.id);
    expect(balance).toBe(1400); // 1000 + (900 - 500)
    expect(chiniStock).toBe(17); // 20 - (5 - 2)

    // Undo once (reverts Edit 2 -> back to Edit 1: 600, qty 3)
    c2.undoRecord.customerBalanceDeltas.forEach((d) => (balance -= d.delta));
    c2.undoRecord.itemStockDeltas.forEach((s) => (chiniStock += s.quantityDelta));
    txs = txs
      .filter((t) => t.id !== c2.correctionTx.id && t.id !== c2.reversalTx.id)
      .map((t) => (t.id === c1.correctionTx.id ? { ...t, superseded_by: null } : t));
    expect(balance).toBe(1100);
    expect(chiniStock).toBe(19);
    expect(getEffectiveTransactions(txs)[0].amount).toBe(600);

    // Undo again (reverts Edit 1 -> back to Original: 500, qty 2)
    c1.undoRecord.customerBalanceDeltas.forEach((d) => (balance -= d.delta));
    c1.undoRecord.itemStockDeltas.forEach((s) => (chiniStock += s.quantityDelta));
    txs = txs
      .filter((t) => t.id !== c1.correctionTx.id && t.id !== c1.reversalTx.id)
      .map((t) => (t.id === orig.id ? { ...t, superseded_by: null } : t));
    expect(balance).toBe(1000);
    expect(chiniStock).toBe(20);
    expect(getEffectiveTransactions(txs)[0].amount).toBe(500);
  });
});

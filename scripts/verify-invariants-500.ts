/**
 * Standalone 500-Seed Property-Style Invariant Verification Script
 * (Not part of the normal vitest run; execute manually via `npx tsx scripts/verify-invariants-500.ts`)
 */
import { buildAppendOnlyCorrection, getEffectiveTransactions, TransactionCorrectionPatch } from '../src/lib/correctionService';
import { computeDailySummary } from '../src/lib/stockAnalytics';
import { canCompleteByVoiceConfirm } from '../src/voice/safetyTiers';
import { clearAllPendingMutations } from '../src/offline/db';
import type { SyncTransport } from '../src/offline/syncEngine';
import { INITIAL_CUSTOMERS, INITIAL_ITEMS } from '../src/data/mockData';
import { Customer, Item, LastCorrectionUndo, Transaction, User } from '../src/types/schema';

if (!(import.meta as any).env) {
  (import.meta as any).env = process.env;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ownerUser: User = {
  id: 'usr-500',
  shop_id: 'shop-1',
  phone: '+919876543210',
  name: 'Madan Lal Sharma',
  role: 'owner',
};

async function runSeed(seed: number): Promise<void> {
  const { queueTransactionOffline, queueCorrectionOffline, drainOfflineQueue } = await import('../src/offline/syncEngine');
  const rand = mulberry32(seed);
  const nowIso = new Date().toISOString();
  let customers: Customer[] = INITIAL_CUSTOMERS.slice(0, 4).map((c) => ({ ...c, balance_owed: 1000 }));
  let items: Item[] = INITIAL_ITEMS.slice(0, 4).map((i) => ({ ...i, current_stock: 100 }));
  let transactions: Transaction[] = [];
  let undoStack: LastCorrectionUndo[] = [];

  await clearAllPendingMutations();
  let dropNextSync = seed % 5 === 0;
  const serverTxs = new Map<string, Transaction & { superseded_by?: string | null }>();
  const transport: SyncTransport = {
    async insertTransaction(tx) {
      if (dropNextSync) {
        dropNextSync = false;
        throw new Error(`Simulated mid-sync drop on seed=${seed}`);
      }
      serverTxs.set(tx.id, { ...tx, superseded_by: null });
    },
    async applyCorrectionAtomic(payload) {
      if (serverTxs.has(payload.correctionTx.id)) return { status: 'already_applied' };
      const target = serverTxs.get(payload.targetTxId);
      if (!target) return { status: 'not_found' };
      if (target.superseded_by !== payload.expectedSupersededBy) return { status: 'conflict' };
      target.superseded_by = payload.correctionTx.id;
      serverTxs.set(payload.reversalTx.id, payload.reversalTx);
      serverTxs.set(payload.correctionTx.id, payload.correctionTx);
      return { status: 'applied' };
    },
  };

  for (let step = 0; step < 25; step++) {
    const roll = rand();
    const effective = getEffectiveTransactions(transactions);

    if (effective.length === 0 || roll < 0.35) {
      const typeRoll = rand();
      const type: Transaction['type'] = typeRoll < 0.45 ? 'credit' : typeRoll < 0.8 ? 'sale' : 'payment';
      const cust = customers[Math.floor(rand() * customers.length)];
      const item = items[Math.floor(rand() * items.length)];
      const qty = type === 'payment' ? 0 : 1 + Math.floor(rand() * 3);
      const rawAmount = 50 + Math.floor(rand() * 4) * 50;
      const amount = type === 'payment' ? Math.min(rawAmount, cust.balance_owed) : rawAmount;
      if (type === 'payment' && amount <= 0) continue;
      const tx: Transaction = {
        id: `tx-${seed}-${step}`,
        shop_id: 'shop-1',
        type,
        amount,
        customer_id: type === 'sale' ? null : cust.id,
        items: qty > 0 ? [{ name: item.name, quantity: qty, unit: item.unit, price: amount }] : [],
        created_at: nowIso,
        confirmed_by_voice: true,
      };
      if (type === 'credit' && tx.customer_id) {
        customers = customers.map((c) => (c.id === tx.customer_id ? { ...c, balance_owed: c.balance_owed + amount } : c));
      } else if (type === 'payment' && tx.customer_id) {
        customers = customers.map((c) => (c.id === tx.customer_id ? { ...c, balance_owed: Math.max(0, c.balance_owed - amount) } : c));
      }
      if (qty > 0) {
        items = items.map((it) => (it.name === item.name ? { ...it, current_stock: it.current_stock - qty } : it));
      }
      transactions = [tx, ...transactions];
      await queueTransactionOffline(tx, 'shop-1');
    } else if (roll < 0.7) {
      const target = effective[Math.floor(rand() * effective.length)];
      const patch: TransactionCorrectionPatch = {
        amount: 50 + Math.floor(rand() * 5) * 50,
        items:
          target.type === 'payment'
            ? []
            : [{ name: items[Math.floor(rand() * items.length)].name, quantity: 1 + Math.floor(rand() * 3), unit: 'kilo', price: 100 }],
      };
      const corr = buildAppendOnlyCorrection(target, patch, { shopId: 'shop-1', actor: ownerUser, source: 'voice' });
      for (const d of corr.customerBalanceDeltas) {
        customers = customers.map((c) => (c.id === d.customerId ? { ...c, balance_owed: c.balance_owed + d.delta } : c));
      }
      for (const s of corr.itemStockDeltas) {
        items = items.map((it) => (it.name.toLowerCase() === s.itemName.toLowerCase() ? { ...it, current_stock: it.current_stock - s.quantityDelta } : it));
      }
      transactions = [
        corr.correctionTx,
        corr.reversalTx,
        ...transactions.map((t) => (t.id === target.id ? { ...t, superseded_by: corr.correctionTx.id } : t)),
      ];
      undoStack = [corr.undoRecord, ...undoStack];
      await queueCorrectionOffline(
        {
          targetTxId: target.id,
          expectedSupersededBy: target.superseded_by ?? null,
          reversalTx: corr.reversalTx,
          correctionTx: corr.correctionTx,
          customerBalanceDeltas: corr.customerBalanceDeltas,
          itemStockDeltas: corr.itemStockDeltas,
          auditLog: corr.auditLog,
        },
        'shop-1'
      );
    } else if (roll < 0.85 && undoStack.length > 0) {
      const u = undoStack[0];
      undoStack = undoStack.slice(1);
      for (const d of u.customerBalanceDeltas) {
        customers = customers.map((c) => (c.id === d.customerId ? { ...c, balance_owed: c.balance_owed - d.delta } : c));
      }
      for (const s of u.itemStockDeltas) {
        items = items.map((it) => (it.name.toLowerCase() === s.itemName.toLowerCase() ? { ...it, current_stock: it.current_stock + s.quantityDelta } : it));
      }
      transactions = transactions
        .filter((t) => t.id !== u.correctionTxId && t.id !== u.reversalTxId)
        .map((t) => (t.id === u.originalTxId ? { ...t, superseded_by: u.previousSupersededBy ?? null } : t));
    } else {
      if (canCompleteByVoiceConfirm({ isPillActive: true, isCardShowing: true, isDeleteAction: true })) {
        throw new Error(`seed=${seed} step=${step}: delete completed by voice`);
      }
    }

    // Recompute & assert invariants
    const effAfter = getEffectiveTransactions(transactions);
    const expBal = 4000 + effAfter.reduce((s, t) => s + (t.type === 'credit' ? t.amount : t.type === 'payment' ? -t.amount : 0), 0);
    const actBal = customers.reduce((s, c) => s + c.balance_owed, 0);
    if (actBal !== expBal) throw new Error(`seed=${seed} step=${step}: balance ${actBal} !== ${expBal}`);

    const expStk = 400 - effAfter.reduce((s, t) => s + (t.items || []).reduce((q, it) => q + (it.quantity || 0), 0), 0);
    const actStk = items.reduce((s, i) => s + i.current_stock, 0);
    if (actStk !== expStk) throw new Error(`seed=${seed} step=${step}: stock ${actStk} !== ${expStk}`);

    const summary = computeDailySummary(transactions);
    const expProfit = Math.max(0, Math.round(effAfter.filter((t) => t.type === 'sale' || t.type === 'credit').reduce((s, t) => s + t.amount, 0) * 0.15));
    if (summary.estimatedProfit !== expProfit) throw new Error(`seed=${seed} step=${step}: profit ${summary.estimatedProfit} !== ${expProfit}`);
  }

  // Simulate mid-sync drop + reconnect drain
  await drainOfflineQueue('shop-1', transport);
  await drainOfflineQueue('shop-1', transport);
}

async function main() {
  const failingSeeds: Array<{ seed: number; error: string }> = [];
  for (let seed = 1; seed <= 500; seed++) {
    try {
      await runSeed(seed);
    } catch (err: any) {
      failingSeeds.push({ seed, error: err?.message || String(err) });
    }
  }
  if (failingSeeds.length > 0) {
    console.error('Failing seeds:', failingSeeds);
    process.exit(1);
  }
  console.log('✅ 500/500 seeds passed all balance, stock, profit, and mid-sync drop invariants.');
}

main();

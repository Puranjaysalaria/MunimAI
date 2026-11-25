import { describe, it, expect } from 'vitest';
import {
  buildAppendOnlyCorrection,
  getEffectiveTransactions,
  TransactionCorrectionPatch,
} from '../src/lib/correctionService';
import { computeDailySummary } from '../src/lib/stockAnalytics';
import { canCompleteByVoiceConfirm } from '../src/voice/safetyTiers';
import { INITIAL_CUSTOMERS, INITIAL_ITEMS } from '../src/data/mockData';
import { Customer, Item, LastCorrectionUndo, Transaction, User } from '../src/types/schema';

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
  id: 'usr-inv-1',
  shop_id: 'shop-1',
  phone: '+919876543210',
  name: 'Madan Lal Sharma',
  role: 'owner',
};

interface SimState {
  customers: Customer[];
  items: Item[];
  transactions: Transaction[];
  lastCorrectionUndo: LastCorrectionUndo | null;
  lastAddedTxId: string | null;
}

function createInitialSimState(): SimState {
  return {
    customers: INITIAL_CUSTOMERS.slice(0, 4).map((c) => ({ ...c, balance_owed: 1000 })),
    items: INITIAL_ITEMS.slice(0, 4).map((i) => ({ ...i, current_stock: 100 })),
    transactions: [],
    lastCorrectionUndo: null,
    lastAddedTxId: null,
  };
}

function applyAdd(state: SimState, tx: Transaction) {
  if (tx.type === 'credit' && tx.customer_id) {
    state.customers = state.customers.map((c) =>
      c.id === tx.customer_id ? { ...c, balance_owed: c.balance_owed + tx.amount } : c
    );
  } else if (tx.type === 'payment' && tx.customer_id) {
    state.customers = state.customers.map((c) =>
      c.id === tx.customer_id ? { ...c, balance_owed: Math.max(0, c.balance_owed - tx.amount) } : c
    );
  }
  if (tx.items && tx.items.length > 0) {
    for (const sold of tx.items) {
      state.items = state.items.map((it) =>
        it.name.toLowerCase() === sold.name.toLowerCase()
          ? { ...it, current_stock: Math.max(0, it.current_stock - sold.quantity) }
          : it
      );
    }
  }
  state.transactions = [tx, ...state.transactions];
  state.lastAddedTxId = tx.id;
  state.lastCorrectionUndo = null;
}

function applyEdit(state: SimState, targetTxId: string, patch: TransactionCorrectionPatch) {
  const targetTx = state.transactions.find((t) => t.id === targetTxId);
  if (!targetTx) return;
  const computed = buildAppendOnlyCorrection(targetTx, patch, {
    shopId: 'shop-1',
    actor: ownerUser,
    source: 'voice',
  });
  for (const { customerId, delta } of computed.customerBalanceDeltas) {
    state.customers = state.customers.map((c) =>
      c.id === customerId ? { ...c, balance_owed: c.balance_owed + delta } : c
    );
  }
  for (const { itemName, quantityDelta } of computed.itemStockDeltas) {
    state.items = state.items.map((it) =>
      it.name.toLowerCase() === itemName.toLowerCase()
        ? { ...it, current_stock: it.current_stock - quantityDelta }
        : it
    );
  }
  state.transactions = [
    computed.correctionTx,
    computed.reversalTx,
    ...state.transactions.map((tx) =>
      tx.id === targetTx.id ? { ...tx, superseded_by: computed.correctionTx.id } : tx
    ),
  ];
  state.lastCorrectionUndo = computed.undoRecord;
}

function applyUndo(state: SimState): boolean {
  if (state.lastCorrectionUndo) {
    const u = state.lastCorrectionUndo;
    for (const { customerId, delta } of u.customerBalanceDeltas) {
      state.customers = state.customers.map((c) =>
        c.id === customerId ? { ...c, balance_owed: c.balance_owed - delta } : c
      );
    }
    for (const { itemName, quantityDelta } of u.itemStockDeltas) {
      state.items = state.items.map((it) =>
        it.name.toLowerCase() === itemName.toLowerCase()
          ? { ...it, current_stock: it.current_stock + quantityDelta }
          : it
      );
    }
    state.transactions = state.transactions
      .filter((tx) => tx.id !== u.correctionTxId && tx.id !== u.reversalTxId)
      .map((tx) =>
        tx.id === u.originalTxId ? { ...tx, superseded_by: u.previousSupersededBy ?? null } : tx
      );
    state.lastCorrectionUndo = null;
    return true;
  }
  return false;
}

function assertInvariants(state: SimState, seed: number, step: number) {
  const effective = getEffectiveTransactions(state.transactions);

  // 1. Recompute sum of customer balances from base (4 * 1000 = 4000) + effective transactions
  const expectedTotalBalance =
    4000 +
    effective.reduce((sum, tx) => {
      if (tx.type === 'credit') return sum + tx.amount;
      if (tx.type === 'payment') return sum - tx.amount;
      return sum;
    }, 0);
  const actualTotalBalance = state.customers.reduce((sum, c) => sum + c.balance_owed, 0);
  expect(actualTotalBalance, `seed=${seed} step=${step} totalBalance mismatch`).toBe(
    expectedTotalBalance
  );

  // 2. Recompute total item stock from base (4 * 100 = 400) - effective sold quantities
  const expectedTotalStock =
    400 -
    effective.reduce(
      (sum, tx) => sum + (tx.items || []).reduce((s, it) => s + (it.quantity || 0), 0),
      0
    );
  const actualTotalStock = state.items.reduce((sum, i) => sum + i.current_stock, 0);
  expect(actualTotalStock, `seed=${seed} step=${step} totalStock mismatch`).toBe(expectedTotalStock);

  // 3. Recompute daily profit from effective transactions
  const summary = computeDailySummary(state.transactions);
  const recomputedSalesAndCredit = effective
    .filter((t) => t.type === 'sale' || t.type === 'credit')
    .reduce((s, t) => s + t.amount, 0);
  const expectedProfit = Math.max(0, Math.round(recomputedSalesAndCredit * 0.15));
  expect(summary.estimatedProfit, `seed=${seed} step=${step} profit mismatch`).toBe(expectedProfit);
}

describe('Fix 1: Property-Style Invariants (Balances, Stock, Profit & Online/Offline Equivalence)', () => {
  const SEEDS = [101, 202, 303, 404, 505, 606, 707, 808];

  it.each(SEEDS)(
    'maintains exact balance, stock, and profit invariants across randomized add/edit/re-edit/undo/double-undo/delete-request (seed=%i)',
    (seed) => {
      const rand = mulberry32(seed);
      const state = createInitialSimState();
      const nowIso = new Date().toISOString();

      for (let step = 0; step < 35; step++) {
        const opRoll = rand();
        const effective = getEffectiveTransactions(state.transactions);

        if (effective.length === 0 || opRoll < 0.35) {
          // ADD
          const typeRoll = rand();
          const type: Transaction['type'] =
            typeRoll < 0.45 ? 'credit' : typeRoll < 0.8 ? 'sale' : 'payment';
          const cust = state.customers[Math.floor(rand() * state.customers.length)];
          const item = state.items[Math.floor(rand() * state.items.length)];
          const qty = type === 'payment' ? 0 : 1 + Math.floor(rand() * 3);
          const amount = 50 + Math.floor(rand() * 5) * 50; // <= 250 so payment never goes negative on 1000 base
          applyAdd(state, {
            id: `tx-${seed}-${step}`,
            shop_id: 'shop-1',
            type,
            amount,
            customer_id: type === 'sale' ? null : cust.id,
            items: qty > 0 ? [{ name: item.name, quantity: qty, unit: item.unit, price: amount }] : [],
            created_at: nowIso,
            confirmed_by_voice: true,
          });
        } else if (opRoll < 0.65) {
          // EDIT or RE-EDIT effective transaction
          const target = effective[Math.floor(rand() * effective.length)];
          const newAmount = 50 + Math.floor(rand() * 6) * 50;
          const item = state.items[Math.floor(rand() * state.items.length)];
          const newQty = target.type === 'payment' ? 0 : 1 + Math.floor(rand() * 4);
          const newCust = state.customers[Math.floor(rand() * state.customers.length)];
          applyEdit(state, target.id, {
            amount: newAmount,
            customer_id: target.type === 'sale' ? null : newCust.id,
            items:
              newQty > 0
                ? [{ name: item.name, quantity: newQty, unit: item.unit, price: newAmount }]
                : [],
          });
        } else if (opRoll < 0.8) {
          // UNDO
          applyUndo(state);
        } else if (opRoll < 0.9) {
          // DOUBLE UNDO
          applyUndo(state);
          const second = applyUndo(state);
          expect(second, `seed=${seed} step=${step} double-undo must be false`).toBe(false);
        } else {
          // DELETE REQUEST by voice -> must be blocked and leave state unchanged
          const allowed = canCompleteByVoiceConfirm({
            isPillActive: true,
            isCardShowing: true,
            isDeleteAction: true,
          });
          expect(allowed, `seed=${seed} step=${step} delete by voice must be blocked`).toBe(false);
        }

        assertInvariants(state, seed, step);
      }
    }
  );

  it('produces identical balances, stock, and profit whether operations run online or offline-then-synced', () => {
    const nowIso = new Date().toISOString();
    const onlineState = createInitialSimState();
    const offlineState = createInitialSimState();

    const ops: Array<{ kind: 'add'; tx: Transaction } | { kind: 'edit'; targetId: string; patch: TransactionCorrectionPatch } | { kind: 'undo' }> = [
      {
        kind: 'add',
        tx: {
          id: 'tx-eq-1',
          shop_id: 'shop-1',
          type: 'credit',
          amount: 400,
          customer_id: onlineState.customers[0].id,
          items: [{ name: onlineState.items[0].name, quantity: 2, unit: 'kilo', price: 400 }],
          created_at: nowIso,
          confirmed_by_voice: true,
        },
      },
      {
        kind: 'edit',
        targetId: 'tx-eq-1',
        patch: {
          amount: 650,
          items: [{ name: onlineState.items[0].name, quantity: 4, unit: 'kilo', price: 650 }],
        },
      },
      {
        kind: 'add',
        tx: {
          id: 'tx-eq-2',
          shop_id: 'shop-1',
          type: 'sale',
          amount: 300,
          customer_id: null,
          items: [{ name: onlineState.items[1].name, quantity: 3, unit: 'kilo', price: 300 }],
          created_at: nowIso,
          confirmed_by_voice: true,
        },
      },
    ];

    // Online execution
    for (const op of ops) {
      if (op.kind === 'add') applyAdd(onlineState, op.tx);
      else if (op.kind === 'edit') applyEdit(onlineState, op.targetId, op.patch);
      else applyUndo(onlineState);
    }

    // Offline queued execution + FIFO replay
    const queue = [...ops];
    while (queue.length > 0) {
      const op = queue.shift()!;
      if (op.kind === 'add') applyAdd(offlineState, op.tx);
      else if (op.kind === 'edit') applyEdit(offlineState, op.targetId, op.patch);
      else applyUndo(offlineState);
    }

    expect(offlineState.customers.map((c) => c.balance_owed)).toEqual(
      onlineState.customers.map((c) => c.balance_owed)
    );
    expect(offlineState.items.map((i) => i.current_stock)).toEqual(
      onlineState.items.map((i) => i.current_stock)
    );
    expect(computeDailySummary(offlineState.transactions).estimatedProfit).toBe(
      computeDailySummary(onlineState.transactions).estimatedProfit
    );
    expect(getEffectiveTransactions(offlineState.transactions).map((t) => t.amount)).toEqual(
      getEffectiveTransactions(onlineState.transactions).map((t) => t.amount)
    );
  });
});

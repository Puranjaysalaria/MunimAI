import {
  AuditLogEntry,
  LastCorrectionUndo,
  Transaction,
  TransactionItem,
  User,
} from '../types/schema';

export interface TransactionCorrectionPatch {
  amount?: number;
  customer_id?: string | null;
  items?: TransactionItem[];
  created_at?: string;
  note?: string | null;
}

export interface CorrectionComputationResult {
  reversalTx: Transaction;
  correctionTx: Transaction;
  customerBalanceDeltas: Array<{ customerId: string; delta: number }>;
  itemStockDeltas: Array<{ itemName: string; quantityDelta: number }>;
  auditLog: AuditLogEntry;
  undoRecord: LastCorrectionUndo;
}

function getCustomerBalanceEffect(type: Transaction['type'], amount: number): number {
  if (type === 'credit') return Number(amount);
  if (type === 'payment') return -Number(amount);
  return 0;
}

/**
 * Pure append-only correction builder.
 * Never mutates `originalTx`. Produces:
 * 1) A reversal record linked to `originalTx.id`
 * 2) A correction record linked to `originalTx.id` with the new values
 * 3) Exact customer balance deltas and item stock deltas (net of reversal + new values)
 * 4) An immutable AuditLogEntry recording who, when, before, after, and source (voice/tap).
 */
export function buildAppendOnlyCorrection(
  originalTx: Transaction,
  patch: TransactionCorrectionPatch,
  options: {
    shopId: string;
    actor?: User | null;
    source: 'voice' | 'tap';
    reason?: string;
    nowIso?: string;
  }
): CorrectionComputationResult {
  const nowIso = options.nowIso || new Date().toISOString();
  const ts = Date.now();
  const genUuid = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${ts}-${Math.random().toString(36).slice(2, 10)}`;
  const reversalTxId = genUuid();
  const correctionTxId = genUuid();

  const newAmount = patch.amount !== undefined ? patch.amount : originalTx.amount;
  const newCustomerId =
    patch.customer_id !== undefined ? patch.customer_id : (originalTx.customer_id ?? null);
  const newItems = patch.items !== undefined ? patch.items : (originalTx.items || []);
  const newCreatedAt = patch.created_at !== undefined ? patch.created_at : originalTx.created_at;
  const newNote = patch.note !== undefined ? patch.note : (originalTx.note ?? null);

  const rootTxId = originalTx.parent_transaction_id || originalTx.id;
  const previousCorrectionId = originalTx.is_correction ? originalTx.id : null;

  // 1. Reversal record (undoes the previous effective version's financial & stock effect)
  const reversalTx: Transaction = {
    id: reversalTxId,
    shop_id: options.shopId,
    type: originalTx.type,
    amount: originalTx.amount,
    items: originalTx.items ? originalTx.items.map((it) => ({ ...it })) : [],
    customer_id: originalTx.customer_id ?? null,
    created_at: nowIso,
    confirmed_by_voice: options.source === 'voice',
    parent_transaction_id: rootTxId,
    previous_correction_id: previousCorrectionId,
    is_reversal: true,
    is_correction: false,
    source: options.source,
    note: `Reversal of ${originalTx.id}`,
    synced: false,
  };

  // 2. Correction record (applies the new values, chained to root & previous correction)
  const correctionTx: Transaction = {
    id: correctionTxId,
    shop_id: options.shopId,
    type: originalTx.type,
    amount: newAmount,
    items: newItems.map((it) => ({ ...it })),
    customer_id: newCustomerId,
    created_at: newCreatedAt,
    confirmed_by_voice: options.source === 'voice',
    proof_clip_path: originalTx.proof_clip_path ?? null,
    proof_original_amount:
      originalTx.proof_clip_path && newAmount !== originalTx.amount
        ? (originalTx.proof_original_amount ?? originalTx.amount)
        : originalTx.proof_original_amount ?? null,
    voice_transcript: originalTx.voice_transcript ?? null,
    parent_transaction_id: rootTxId,
    previous_correction_id: previousCorrectionId,
    is_reversal: false,
    is_correction: true,
    source: options.source,
    note: newNote,
    has_sent_reminder: originalTx.has_sent_reminder,
    synced: false,
  };

  // 3. Compute Customer Balance Deltas (reversal of old + application of new)
  const deltaMap = new Map<string, number>();
  const oldEffect = getCustomerBalanceEffect(originalTx.type, originalTx.amount);
  const newEffect = getCustomerBalanceEffect(originalTx.type, newAmount);

  if (originalTx.customer_id && oldEffect !== 0) {
    deltaMap.set(originalTx.customer_id, (deltaMap.get(originalTx.customer_id) || 0) - oldEffect);
  }
  if (newCustomerId && newEffect !== 0) {
    deltaMap.set(newCustomerId, (deltaMap.get(newCustomerId) || 0) + newEffect);
  }

  const customerBalanceDeltas: Array<{ customerId: string; delta: number }> = [];
  deltaMap.forEach((delta, customerId) => {
    if (delta !== 0) {
      customerBalanceDeltas.push({ customerId, delta });
    }
  });

  // 4. Compute Item Stock Deltas (quantitySold delta: positive = deduct more, negative = restore stock)
  const stockDeltaMap = new Map<string, number>();
  for (const oldIt of originalTx.items || []) {
    if (oldIt.quantity > 0) {
      const key = oldIt.name.toLowerCase();
      stockDeltaMap.set(key, (stockDeltaMap.get(key) || 0) - oldIt.quantity);
    }
  }
  for (const newIt of newItems) {
    if (newIt.quantity > 0) {
      const key = newIt.name.toLowerCase();
      stockDeltaMap.set(key, (stockDeltaMap.get(key) || 0) + newIt.quantity);
    }
  }

  const itemStockDeltas: Array<{ itemName: string; quantityDelta: number }> = [];
  stockDeltaMap.forEach((quantityDelta, itemName) => {
    if (quantityDelta !== 0) {
      itemStockDeltas.push({ itemName, quantityDelta });
    }
  });

  // 5. Audit Log Entry (normalized to root transaction id + previous_correction_id)
  const auditLog: AuditLogEntry = {
    id: genUuid(),
    shop_id: options.shopId,
    entity_type: 'transaction',
    entity_id: rootTxId,
    previous_correction_id: previousCorrectionId,
    action: 'edit',
    actor_id: options.actor?.id || null,
    actor_name: options.actor?.name || 'Shop Owner',
    actor_role: options.actor?.role || 'owner',
    before_value: {
      amount: originalTx.amount,
      customer_id: originalTx.customer_id ?? null,
      items: originalTx.items || [],
      created_at: originalTx.created_at,
      note: originalTx.note ?? null,
    },
    after_value: {
      amount: newAmount,
      customer_id: newCustomerId,
      items: newItems,
      created_at: newCreatedAt,
      note: newNote,
      correction_tx_id: correctionTxId,
      reversal_tx_id: reversalTxId,
    },
    reason: options.reason || null,
    source: options.source,
    created_at: nowIso,
  };

  // 6. Undo Record
  const undoRecord: LastCorrectionUndo = {
    originalTxId: originalTx.id,
    reversalTxId,
    correctionTxId,
    previousSupersededBy: originalTx.superseded_by ?? null,
    customerBalanceDeltas,
    itemStockDeltas,
    timestamp: ts,
  };

  return {
    reversalTx,
    correctionTx,
    customerBalanceDeltas,
    itemStockDeltas,
    auditLog,
    undoRecord,
  };
}

/**
 * Returns only currently effective transactions (skipping reversal rows and superseded originals)
 * for accurate daily summary, profit, and stock velocity calculations.
 */
export function getEffectiveTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter((tx) => !tx.is_reversal && !tx.superseded_by);
}

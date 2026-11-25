import { Customer, Item, Transaction } from '../types/schema';
import { TransactionCorrectionPatch } from '../lib/correctionService';

export interface StockDeltaEffect {
  itemName: string;
  oldQty: number;
  newQty: number;
  netStockChange: number; // positive = stock restored, negative = more stock deducted
}

export interface SideEffectAnalysis {
  hasProofClip: boolean;
  proofOriginalAmount: number | null;
  hasSentReminder: boolean;
  stockEffects: StockDeltaEffect[];
  profitDelta: number;
}

/**
 * Analyzes side effects of editing a saved transaction:
 * - Customer proof clip attached (flags original amount & offers tap-only re-record)
 * - Sent reminder warning (customer may already have the old amount)
 * - Stock & estimated profit impact
 */
export function analyzeEditSideEffects(
  originalTx: Transaction,
  patch: TransactionCorrectionPatch,
  customers: Customer[],
  _items: Item[]
): SideEffectAnalysis {
  const newAmount = patch.amount !== undefined ? patch.amount : originalTx.amount;
  const targetCustId =
    patch.customer_id !== undefined ? patch.customer_id : originalTx.customer_id;
  const cust = targetCustId ? customers.find((c) => c.id === targetCustId) : undefined;

  const hasProofClip = Boolean(originalTx.proof_clip_path);
  const proofOriginalAmount = hasProofClip
    ? (originalTx.proof_original_amount ?? originalTx.amount)
    : null;

  const reminderSentAfterTx =
    Boolean(cust?.last_reminded_at) &&
    new Date(cust!.last_reminded_at!).getTime() >= new Date(originalTx.created_at).getTime();
  const hasSentReminder = Boolean(originalTx.has_sent_reminder) || reminderSentAfterTx;

  // Stock delta per item
  const oldItems = originalTx.items || [];
  const newItems = patch.items !== undefined ? patch.items : oldItems;
  const itemNames = new Set<string>([
    ...oldItems.map((i) => i.name.toLowerCase()),
    ...newItems.map((i) => i.name.toLowerCase()),
  ]);

  const stockEffects: StockDeltaEffect[] = [];
  itemNames.forEach((nameLower) => {
    const oldQty = oldItems
      .filter((i) => i.name.toLowerCase() === nameLower)
      .reduce((s, i) => s + (i.quantity || 0), 0);
    const newQty = newItems
      .filter((i) => i.name.toLowerCase() === nameLower)
      .reduce((s, i) => s + (i.quantity || 0), 0);
    if (oldQty !== newQty) {
      stockEffects.push({
        itemName: nameLower,
        oldQty,
        newQty,
        netStockChange: oldQty - newQty,
      });
    }
  });

  // Estimated profit delta (~15% kirana margin on sales/credit)
  let profitDelta = 0;
  if (originalTx.type === 'sale' || originalTx.type === 'credit') {
    profitDelta = Math.round((newAmount - originalTx.amount) * 0.15);
  }

  return {
    hasProofClip,
    proofOriginalAmount,
    hasSentReminder,
    stockEffects,
    profitDelta,
  };
}

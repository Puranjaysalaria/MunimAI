import {
  enqueueOfflineMutation,
  getPendingMutations,
  deleteOfflineMutation,
  countPendingMutations,
  OfflineMutation,
} from './db';
import { AuditLogEntry, Transaction } from '../types/schema';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { triggerHaptic, playAudioCue } from '../lib/sound';
import { speechSynthesizer } from '../tts/speechSynthesizer';
import { LanguageCode } from '../i18n';

export interface OfflineCorrectionPayload {
  targetTxId: string;
  expectedSupersededBy: string | null;
  reversalTx: Transaction;
  correctionTx: Transaction;
  customerBalanceDeltas: Array<{ customerId: string; delta: number }>;
  itemStockDeltas: Array<{ itemName: string; quantityDelta: number }>;
  auditLog: AuditLogEntry;
}

export interface SyncConflictNotice {
  mutationId: string;
  targetTxId: string;
  message: string;
}

export interface SyncTransport {
  insertTransaction: (tx: Transaction, shopId: string) => Promise<void>;
  applyCorrectionAtomic: (
    payload: OfflineCorrectionPayload,
    shopId: string
  ) => Promise<{ status: 'applied' | 'already_applied' | 'conflict' | 'not_found' }>;
}

const defaultSupabaseTransport: SyncTransport = {
  async insertTransaction(tx: Transaction, shopId: string) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('transactions').upsert(
      {
        id: tx.id,
        shop_id: shopId,
        type: tx.type,
        amount: tx.amount,
        customer_id: tx.customer_id,
        items: tx.items,
        confirmed_by_voice: tx.confirmed_by_voice,
        voice_transcript: tx.voice_transcript,
        created_at: tx.created_at,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    if (error) throw error;
  },
  async applyCorrectionAtomic(payload: OfflineCorrectionPayload, shopId: string) {
    if (!isSupabaseConfigured()) return { status: 'applied' };
    const { data, error } = await supabase.rpc('apply_correction_atomic', {
      p_shop_id: shopId,
      p_target_tx_id: payload.targetTxId,
      p_expected_superseded_by: payload.expectedSupersededBy,
      p_reversal_tx: payload.reversalTx,
      p_correction_tx: payload.correctionTx,
      p_customer_deltas: payload.customerBalanceDeltas,
      p_stock_deltas: payload.itemStockDeltas,
      p_audit_log: payload.auditLog,
    });
    if (error) throw error;
    return { status: (data?.status || 'applied') as 'applied' | 'already_applied' | 'conflict' | 'not_found' };
  },
};

/**
 * Enqueue a new transaction mutation into IndexedDB when offline
 */
export async function queueTransactionOffline(
  transaction: Transaction,
  shopId: string
): Promise<void> {
  const mutation: OfflineMutation = {
    id: `mut-${Date.now()}-${transaction.id}`,
    shopId,
    type: 'add_transaction',
    payload: transaction,
    timestamp: new Date().toISOString(),
  };

  await enqueueOfflineMutation(mutation);
}

/**
 * Enqueue an append-only correction + reversal + deltas + audit log as one atomic offline unit
 */
export async function queueCorrectionOffline(
  payload: OfflineCorrectionPayload,
  shopId: string
): Promise<void> {
  const mutation: OfflineMutation = {
    id: `mut-corr-${Date.now()}-${payload.correctionTx.id}`,
    shopId,
    type: 'apply_correction',
    payload,
    timestamp: new Date().toISOString(),
  };

  await enqueueOfflineMutation(mutation);
}

/**
 * Drain and synchronize all pending mutations in strict FIFO order.
 * Stops/defers dependent corrections if an earlier add_transaction fails mid-sync,
 * and surfaces optimistic conflicts instead of silently overwriting.
 */
export async function drainOfflineQueue(
  shopId: string,
  transport: SyncTransport = defaultSupabaseTransport
): Promise<{
  syncedCount: number;
  failedCount: number;
  conflicts: SyncConflictNotice[];
}> {
  const mutations = await getPendingMutations();
  if (mutations.length === 0) {
    return { syncedCount: 0, failedCount: 0, conflicts: [] };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const conflicts: SyncConflictNotice[] = [];
  const failedOriginalTxIds = new Set<string>();

  for (const mut of mutations) {
    try {
      if (mut.type === 'add_transaction') {
        const tx: Transaction = mut.payload;
        try {
          await transport.insertTransaction(tx, shopId);
          await deleteOfflineMutation(mut.id);
          syncedCount++;
        } catch (err) {
          failedOriginalTxIds.add(tx.id);
          failedCount++;
          console.error('Failed to sync add_transaction', mut.id, err);
        }
      } else if (mut.type === 'apply_correction') {
        const payload: OfflineCorrectionPayload = mut.payload;
        // Preserve FIFO dependency: if the original entry failed to sync earlier in this pass, defer correction
        const rootId = payload.correctionTx.parent_transaction_id || payload.targetTxId;
        if (failedOriginalTxIds.has(payload.targetTxId) || failedOriginalTxIds.has(rootId)) {
          failedCount++;
          continue;
        }

        const res = await transport.applyCorrectionAtomic(payload, shopId);
        if (res.status === 'conflict') {
          conflicts.push({
            mutationId: mut.id,
            targetTxId: payload.targetTxId,
            message:
              'This entry was already edited on another device. Your offline edit was held to prevent overwriting.',
          });
          await deleteOfflineMutation(mut.id);
        } else {
          await deleteOfflineMutation(mut.id);
          syncedCount++;
        }
      } else {
        await deleteOfflineMutation(mut.id);
        syncedCount++;
      }
    } catch (err) {
      console.error('Failed to sync mutation', mut.id, err);
      failedCount++;
    }
  }

  return { syncedCount, failedCount, conflicts };
}

/**
 * Check count of pending offline mutations
 */
export async function getOfflinePendingCount(): Promise<number> {
  return countPendingMutations();
}

/**
 * Helper to notify the shopkeeper that offline entries have synchronized
 */
export function announceSyncSuccess(count: number, language: LanguageCode): void {
  if (count <= 0) return;

  triggerHaptic('success');
  playAudioCue('success');

  const voiceMsg =
    language === 'en'
      ? `Internet connection restored. ${count} transactions synchronized.`
      : language === 'pa'
      ? `ਇੰਟਰਨੈੱਟ ਵਾਪਸ ਆ ਗਿਆ। ${count} ਸੌਦੇ ਸੁਰੱਖਿਅਤ ਸਿੰਕ ਹੋ ਗਏ ਹਨ।`
      : `इंटरनेट वापस आ गया। ${count} सौदे सर्वर पर सिंक हो गए हैं।`;

  speechSynthesizer.speak(voiceMsg, language);
}

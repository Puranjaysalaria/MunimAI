import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllPendingMutations, getPendingMutations } from '../src/offline/db';
import {
  queueTransactionOffline,
  queueCorrectionOffline,
  drainOfflineQueue,
  SyncTransport,
} from '../src/offline/syncEngine';
import { buildAppendOnlyCorrection } from '../src/lib/correctionService';
import { INITIAL_CUSTOMERS } from '../src/data/mockData';
import { Transaction, User } from '../src/types/schema';

const ownerUser: User = {
  id: 'usr-1',
  shop_id: 'shop-1',
  phone: '+919876543210',
  name: 'Madan Lal Sharma',
  role: 'owner',
};

describe('Fix 3: Offline Correction Queue, Idempotent Replay, Mid-Sync Drop & Conflict Detection', () => {
  beforeEach(async () => {
    await clearAllPendingMutations();
  });

  it('replays original transaction then correction in strict FIFO order and supports idempotent replay', async () => {
    const serverTxs = new Map<string, Transaction & { superseded_by?: string | null }>();
    const appliedOrder: string[] = [];
    let serverBalance = 1000;

    const transport: SyncTransport = {
      async insertTransaction(tx) {
        if (!serverTxs.has(tx.id)) {
          serverTxs.set(tx.id, { ...tx, superseded_by: null });
          if (tx.type === 'credit') serverBalance += tx.amount;
        }
        appliedOrder.push(`add:${tx.id}`);
      },
      async applyCorrectionAtomic(payload) {
        if (serverTxs.has(payload.correctionTx.id)) {
          return { status: 'already_applied' };
        }
        const target = serverTxs.get(payload.targetTxId);
        if (!target) return { status: 'not_found' };
        if (target.superseded_by !== payload.expectedSupersededBy) {
          return { status: 'conflict' };
        }
        target.superseded_by = payload.correctionTx.id;
        serverTxs.set(payload.reversalTx.id, payload.reversalTx);
        serverTxs.set(payload.correctionTx.id, payload.correctionTx);
        payload.customerBalanceDeltas.forEach((d) => (serverBalance += d.delta));
        appliedOrder.push(`corr:${payload.correctionTx.id}`);
        return { status: 'applied' };
      },
    };

    const origTx: Transaction = {
      id: '11111111-1111-4111-8111-111111111111',
      shop_id: 'shop-1',
      type: 'credit',
      amount: 500,
      customer_id: INITIAL_CUSTOMERS[0].id,
      created_at: new Date(Date.now() - 2000).toISOString(),
      confirmed_by_voice: true,
    };

    const corr = buildAppendOnlyCorrection(
      origTx,
      { amount: 750 },
      { shopId: 'shop-1', actor: ownerUser, source: 'voice' }
    );

    await queueTransactionOffline(origTx, 'shop-1');
    await queueCorrectionOffline(
      {
        targetTxId: origTx.id,
        expectedSupersededBy: null,
        reversalTx: corr.reversalTx,
        correctionTx: corr.correctionTx,
        customerBalanceDeltas: corr.customerBalanceDeltas,
        itemStockDeltas: corr.itemStockDeltas,
        auditLog: corr.auditLog,
      },
      'shop-1'
    );

    const res = await drainOfflineQueue('shop-1', transport);
    expect(res.syncedCount).toBe(2);
    expect(res.conflicts).toHaveLength(0);
    expect(appliedOrder).toEqual([`add:${origTx.id}`, `corr:${corr.correctionTx.id}`]);
    expect(serverBalance).toBe(1750);

    // Idempotent replay: running applyCorrectionAtomic again with same client-generated ID returns already_applied
    const replayRes = await transport.applyCorrectionAtomic(
      {
        targetTxId: origTx.id,
        expectedSupersededBy: null,
        reversalTx: corr.reversalTx,
        correctionTx: corr.correctionTx,
        customerBalanceDeltas: corr.customerBalanceDeltas,
        itemStockDeltas: corr.itemStockDeltas,
        auditLog: corr.auditLog,
      },
      'shop-1'
    );
    expect(replayRes.status).toBe('already_applied');
    expect(serverBalance).toBe(1750);
  });

  it('defers dependent correction when connection drops mid-sync during original entry sync, then completes on reconnect', async () => {
    let failOriginal = true;
    const synced: string[] = [];

    const transport: SyncTransport = {
      async insertTransaction(tx) {
        if (failOriginal) throw new Error('Network dropped mid-sync');
        synced.push(`add:${tx.id}`);
      },
      async applyCorrectionAtomic(payload) {
        synced.push(`corr:${payload.correctionTx.id}`);
        return { status: 'applied' };
      },
    };

    const origTx: Transaction = {
      id: '22222222-2222-4222-8222-222222222222',
      shop_id: 'shop-1',
      type: 'credit',
      amount: 300,
      customer_id: INITIAL_CUSTOMERS[0].id,
      created_at: new Date(Date.now() - 2000).toISOString(),
      confirmed_by_voice: true,
    };
    const corr = buildAppendOnlyCorrection(origTx, { amount: 450 }, { shopId: 'shop-1', actor: ownerUser, source: 'tap' });

    await queueTransactionOffline(origTx, 'shop-1');
    await queueCorrectionOffline(
      {
        targetTxId: origTx.id,
        expectedSupersededBy: null,
        reversalTx: corr.reversalTx,
        correctionTx: corr.correctionTx,
        customerBalanceDeltas: corr.customerBalanceDeltas,
        itemStockDeltas: corr.itemStockDeltas,
        auditLog: corr.auditLog,
      },
      'shop-1'
    );

    // Mid-sync drop: neither add nor correction is applied yet
    const firstAttempt = await drainOfflineQueue('shop-1', transport);
    expect(firstAttempt.syncedCount).toBe(0);
    expect(firstAttempt.failedCount).toBe(2);
    expect(synced).toEqual([]);
    expect((await getPendingMutations()).length).toBe(2);

    // Connection restored: FIFO replays add then correction
    failOriginal = false;
    const secondAttempt = await drainOfflineQueue('shop-1', transport);
    expect(secondAttempt.syncedCount).toBe(2);
    expect(secondAttempt.failedCount).toBe(0);
    expect(synced).toEqual([`add:${origTx.id}`, `corr:${corr.correctionTx.id}`]);
    expect((await getPendingMutations()).length).toBe(0);
  });

  it('detects optimistic conflict on superseded_by when two devices edit the same entry and surfaces a notice instead of overwriting', async () => {
    const origTx: Transaction = {
      id: '33333333-3333-4333-8333-333333333333',
      shop_id: 'shop-1',
      type: 'credit',
      amount: 500,
      customer_id: INITIAL_CUSTOMERS[0].id,
      created_at: new Date().toISOString(),
      confirmed_by_voice: true,
    };

    // Device A already superseded origTx on the server
    const serverState = { superseded_by: 'device-a-corr-id' as string | null };

    const deviceBTransport: SyncTransport = {
      async insertTransaction() {},
      async applyCorrectionAtomic(payload) {
        if (serverState.superseded_by !== payload.expectedSupersededBy) {
          return { status: 'conflict' };
        }
        serverState.superseded_by = payload.correctionTx.id;
        return { status: 'applied' };
      },
    };

    const deviceBCorr = buildAppendOnlyCorrection(
      origTx,
      { amount: 900 },
      { shopId: 'shop-1', actor: ownerUser, source: 'voice' }
    );

    await queueCorrectionOffline(
      {
        targetTxId: origTx.id,
        expectedSupersededBy: null,
        reversalTx: deviceBCorr.reversalTx,
        correctionTx: deviceBCorr.correctionTx,
        customerBalanceDeltas: deviceBCorr.customerBalanceDeltas,
        itemStockDeltas: deviceBCorr.itemStockDeltas,
        auditLog: deviceBCorr.auditLog,
      },
      'shop-1'
    );

    const res = await drainOfflineQueue('shop-1', deviceBTransport);
    expect(res.conflicts).toHaveLength(1);
    expect(res.conflicts[0].targetTxId).toBe(origTx.id);
    expect(res.conflicts[0].message).toContain('another device');
    // Server was NOT overwritten by Device B
    expect(serverState.superseded_by).toBe('device-a-corr-id');
  });
});

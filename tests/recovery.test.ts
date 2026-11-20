import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateUPILink,
  generateReminderMessage,
  getRecoveryCustomers,
  buildDraftReminders,
  createReminderRecord,
} from '../src/lib/reminderService';
import {
  queueTransactionOffline,
  drainOfflineQueue,
  getOfflinePendingCount,
} from '../src/offline/syncEngine';
import {
  clearAllPendingMutations,
  countPendingMutations,
  getPendingMutations,
} from '../src/offline/db';
import { INITIAL_CUSTOMERS, DEMO_SHOP_ID } from '../src/data/mockData';
import { Shop, Transaction } from '../src/types/schema';

describe('Phase 6: Recovery Reminders & UPI Deep Links', () => {
  const mockShop: Shop = {
    id: DEMO_SHOP_ID,
    name: 'Sharma Kirana Store',
    owner_phone: '+919876543210',
    upi_id: 'sharma@okicici',
  };

  it('generates a valid NPCI-compliant UPI deep link', () => {
    const upiLink = generateUPILink('sharma@okicici', 'Sharma Kirana Store', 1450);
    expect(upiLink).toContain('upi://pay?');
    expect(upiLink).toContain('pa=sharma@okicici');
    expect(upiLink).toContain('pn=Sharma%20Kirana%20Store');
    expect(upiLink).toContain('am=1450');
    expect(upiLink).toContain('cu=INR');
  });

  it('filters customers exceeding the recovery threshold', () => {
    // Threshold ₹1000: Ramesh Kumar (1450), Gurpreet Singh (2200), Harpreet Kaur (1800), Manoj Tiwari (1200)
    const over1000 = getRecoveryCustomers(INITIAL_CUSTOMERS, 1000);
    expect(over1000.length).toBe(4);
    expect(over1000[0].balance_owed).toBe(2200); // Gurpreet (highest debt first)

    // Threshold ₹2000: Only Gurpreet (2200)
    const over2000 = getRecoveryCustomers(INITIAL_CUSTOMERS, 2000);
    expect(over2000.length).toBe(1);
    expect(over2000[0].name).toBe('Gurpreet Singh');
  });

  it('builds multilingual polite reminder messages', () => {
    const upiLink = generateUPILink('sharma@okaxis', 'Sharma Kirana', 500);

    // Hindi
    const hiMsg = generateReminderMessage({
      customerName: 'रमेश शर्मा',
      shopName: 'शर्मा किराना',
      amount: 500,
      upiLink,
      language: 'hi',
    });
    expect(hiMsg).toContain('नमस्ते रमेश शर्मा जी');
    expect(hiMsg).toContain('₹500');
    expect(hiMsg).toContain(upiLink);

    // Punjabi
    const paMsg = generateReminderMessage({
      customerName: 'ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ',
      shopName: 'ਸ਼ਰਮਾ ਕਿਰਾਣਾ',
      amount: 2200,
      upiLink,
      language: 'pa',
    });
    expect(paMsg).toContain('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ ਜੀ');
    expect(paMsg).toContain('₹2200');

    // English
    const enMsg = generateReminderMessage({
      customerName: 'Amit Verma',
      shopName: 'Sharma Kirana',
      amount: 850,
      upiLink,
      language: 'en',
    });
    expect(enMsg).toContain('Hello Amit Verma');
    expect(enMsg).toContain('friendly reminder');
  });

  it('builds draft reminders with customer preferred languages', () => {
    const drafts = buildDraftReminders(INITIAL_CUSTOMERS, mockShop, 1000);
    expect(drafts.length).toBe(4);

    const gurpreetDraft = drafts.find((d) => d.customer.name === 'Gurpreet Singh');
    expect(gurpreetDraft).toBeDefined();
    expect(gurpreetDraft!.language).toBe('pa');
    expect(gurpreetDraft!.messageText).toContain('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ');

    const record = createReminderRecord(gurpreetDraft!, mockShop.id);
    expect(record.status).toBe('sent');
    expect(record.amount).toBe(2200);
  });
});

describe('Phase 6: Offline Mutation Queue & Timestamp Reconciliation', () => {
  beforeEach(async () => {
    await clearAllPendingMutations();
  });

  it('enqueues mutations into IndexedDB and drains queue on sync', async () => {
    const initialCount = await countPendingMutations();
    expect(initialCount).toBe(0);

    const testTx: Transaction = {
      id: 'tx-offline-101',
      shop_id: DEMO_SHOP_ID,
      type: 'credit',
      amount: 750,
      customer_id: '11111111-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      confirmed_by_voice: true,
      synced: false,
    };

    // 1. Enqueue offline transaction
    await queueTransactionOffline(testTx, DEMO_SHOP_ID);

    const queuedCount = await countPendingMutations();
    expect(queuedCount).toBe(1);

    const pendingList = await getPendingMutations();
    expect(pendingList.length).toBe(1);
    expect(pendingList[0].type).toBe('add_transaction');
    expect(pendingList[0].payload.amount).toBe(750);

    // 2. Drain offline queue (Simulating reconnect)
    const result = await drainOfflineQueue(DEMO_SHOP_ID);
    expect(result.syncedCount).toBe(1);
    expect(result.failedCount).toBe(0);

    // 3. Queue should now be empty
    const remainingCount = await getOfflinePendingCount();
    expect(remainingCount).toBe(0);
  }, 15000);
});

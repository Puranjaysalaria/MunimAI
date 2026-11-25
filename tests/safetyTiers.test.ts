import { describe, it, expect } from 'vitest';
import { analyzeEditSideEffects } from '../src/voice/sideEffectAnalyzer';
import { evaluateEditSafetyTier, canCompleteByVoiceConfirm } from '../src/voice/safetyTiers';
import { INITIAL_CUSTOMERS, INITIAL_ITEMS } from '../src/data/mockData';
import { Transaction } from '../src/types/schema';

describe('Parts 4, 5, 6: Side-Effect Warnings & Safety Tiers', () => {
  it('flags proof clip with original amount and requires tap-only confirmation', () => {
    const txWithProof: Transaction = {
      id: 'tx-proof-1',
      shop_id: 'shop-1',
      type: 'credit',
      amount: 500,
      customer_id: INITIAL_CUSTOMERS[0].id,
      proof_clip_path: 'proof-clips/shop-1/tx-proof-1.webm',
      created_at: new Date().toISOString(),
      confirmed_by_voice: true,
    };

    const sideEffects = analyzeEditSideEffects(
      txWithProof,
      { amount: 600 },
      INITIAL_CUSTOMERS,
      INITIAL_ITEMS
    );
    expect(sideEffects.hasProofClip).toBe(true);
    expect(sideEffects.proofOriginalAmount).toBe(500);
    expect(sideEffects.profitDelta).toBe(15);

    const safety = evaluateEditSafetyTier(txWithProof, { amount: 600 }, sideEffects);
    expect(safety.requiresTapOnly).toBe(true);
    expect(safety.reason).toBe('has_proof_or_reminder');

    // Voice "Haan" MUST NOT complete this edit
    expect(
      canCompleteByVoiceConfirm({
        isPillActive: true,
        isCardShowing: true,
        safetyTier: safety,
      })
    ).toBe(false);
  });

  it('flags sent reminder when reminder was sent after transaction or marked on tx', () => {
    const custWithReminder = {
      ...INITIAL_CUSTOMERS[0],
      last_reminded_at: new Date().toISOString(),
    };
    const tx: Transaction = {
      id: 'tx-rem-1',
      shop_id: 'shop-1',
      type: 'credit',
      amount: 800,
      customer_id: custWithReminder.id,
      created_at: new Date(Date.now() - 60_000).toISOString(),
      confirmed_by_voice: true,
    };

    const sideEffects = analyzeEditSideEffects(tx, { amount: 900 }, [custWithReminder], INITIAL_ITEMS);
    expect(sideEffects.hasSentReminder).toBe(true);

    const safety = evaluateEditSafetyTier(tx, { amount: 900 }, sideEffects);
    expect(safety.requiresTapOnly).toBe(true);
  });

  it('requires tap-only for edits above configurable rupee threshold or older than configurable days', () => {
    const recentSmallTx: Transaction = {
      id: 'tx-small',
      shop_id: 'shop-1',
      type: 'sale',
      amount: 300,
      created_at: new Date().toISOString(),
      confirmed_by_voice: true,
    };

    const sideEffects = analyzeEditSideEffects(recentSmallTx, { amount: 3500 }, INITIAL_CUSTOMERS, INITIAL_ITEMS);
    const overThreshold = evaluateEditSafetyTier(
      recentSmallTx,
      { amount: 3500 },
      sideEffects,
      { edit_rupee_threshold: 2000, edit_age_days_threshold: 7 }
    );
    expect(overThreshold.requiresTapOnly).toBe(true);
    expect(overThreshold.reason).toBe('over_rupee_threshold');

    // Old entry (> 7 days)
    const oldTx: Transaction = {
      id: 'tx-old',
      shop_id: 'shop-1',
      type: 'sale',
      amount: 200,
      created_at: new Date(Date.now() - 10 * 86400_000).toISOString(),
      confirmed_by_voice: true,
    };
    const oldSideEffects = analyzeEditSideEffects(oldTx, { amount: 250 }, INITIAL_CUSTOMERS, INITIAL_ITEMS);
    const oldEval = evaluateEditSafetyTier(
      oldTx,
      { amount: 250 },
      oldSideEffects,
      { edit_rupee_threshold: 2000, edit_age_days_threshold: 7 }
    );
    expect(oldEval.requiresTapOnly).toBe(true);
    expect(oldEval.reason).toBe('older_than_days_threshold');
  });

  it('never allows delete actions by voice and only allows voice Haan when pill is active and card is showing', () => {
    expect(
      canCompleteByVoiceConfirm({
        isPillActive: true,
        isCardShowing: true,
        isDeleteAction: true,
      })
    ).toBe(false);

    expect(
      canCompleteByVoiceConfirm({
        isPillActive: false,
        isCardShowing: true,
      })
    ).toBe(false);

    expect(
      canCompleteByVoiceConfirm({
        isPillActive: true,
        isCardShowing: false,
      })
    ).toBe(false);

    expect(
      canCompleteByVoiceConfirm({
        isPillActive: true,
        isCardShowing: true,
        isFinalResult: true,
        speechStartedAtMs: 2000,
        cardAppearedAtMs: 1000,
        safetyTier: { requiresTapOnly: false, reason: 'standard', thresholdRupees: 2000, thresholdDays: 7 },
      })
    ).toBe(true);

    // Fix 4: Interim "haan" must be rejected
    expect(
      canCompleteByVoiceConfirm({
        isPillActive: true,
        isCardShowing: true,
        isFinalResult: false,
        speechStartedAtMs: 2000,
        cardAppearedAtMs: 1000,
      })
    ).toBe(false);

    // Fix 4: Speech started before card appeared must be rejected
    expect(
      canCompleteByVoiceConfirm({
        isPillActive: true,
        isCardShowing: true,
        isFinalResult: true,
        speechStartedAtMs: 900,
        cardAppearedAtMs: 1000,
      })
    ).toBe(false);
  });
});

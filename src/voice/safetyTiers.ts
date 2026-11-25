import { Shop, Transaction } from '../types/schema';
import { TransactionCorrectionPatch } from '../lib/correctionService';
import { SideEffectAnalysis } from './sideEffectAnalyzer';

export const DEFAULT_EDIT_RUPEE_THRESHOLD = 2000;
export const DEFAULT_EDIT_AGE_DAYS_THRESHOLD = 7;

export type SafetyTierReason =
  | 'delete_always_tap_only'
  | 'over_rupee_threshold'
  | 'older_than_days_threshold'
  | 'has_proof_or_reminder'
  | 'standard';

export interface SafetyTierEvaluation {
  requiresTapOnly: boolean;
  reason: SafetyTierReason;
  thresholdRupees: number;
  thresholdDays: number;
}

/**
 * Evaluates whether an edit/delete action requires a deliberate tap on Confirm
 * instead of voice "Haan" confirmation.
 * Rules:
 * - Deleting an entry, proof clip, or bill is ALWAYS tap-only.
 * - Edits where new amount or delta exceeds configurable `edit_rupee_threshold` require tap.
 * - Edits to entries older than configurable `edit_age_days_threshold` days require tap.
 * - Edits to entries with attached proof clip or sent reminder require tap.
 */
export function evaluateEditSafetyTier(
  originalTx: Transaction,
  patch: TransactionCorrectionPatch,
  sideEffects: SideEffectAnalysis,
  shopSettings?: Shop['settings'],
  nowMs: number = Date.now()
): SafetyTierEvaluation {
  const thresholdRupees = shopSettings?.edit_rupee_threshold ?? DEFAULT_EDIT_RUPEE_THRESHOLD;
  const thresholdDays = shopSettings?.edit_age_days_threshold ?? DEFAULT_EDIT_AGE_DAYS_THRESHOLD;

  const newAmount = patch.amount !== undefined ? patch.amount : originalTx.amount;
  const maxAmount = Math.max(Number(originalTx.amount), Number(newAmount));
  const delta = Math.abs(Number(newAmount) - Number(originalTx.amount));

  if (sideEffects.hasProofClip || sideEffects.hasSentReminder) {
    return {
      requiresTapOnly: true,
      reason: 'has_proof_or_reminder',
      thresholdRupees,
      thresholdDays,
    };
  }

  if (maxAmount > thresholdRupees || delta > thresholdRupees) {
    return {
      requiresTapOnly: true,
      reason: 'over_rupee_threshold',
      thresholdRupees,
      thresholdDays,
    };
  }

  const ageMs = nowMs - new Date(originalTx.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > thresholdDays) {
    return {
      requiresTapOnly: true,
      reason: 'older_than_days_threshold',
      thresholdRupees,
      thresholdDays,
    };
  }

  return {
    requiresTapOnly: false,
    reason: 'standard',
    thresholdRupees,
    thresholdDays,
  };
}

/**
 * Enforces that voice "Haan" only completes an action when:
 * 1. The mic/reply listener pill is active
 * 2. A confirmation card is currently showing
 * 3. The final STT result has arrived (never on interim results)
 * 4. Speech started after the confirmation card appeared
 * 5. The action is not tap-only (not a delete, not over-threshold/old/proof/reminder)
 */
export function canCompleteByVoiceConfirm(params: {
  isPillActive: boolean;
  isCardShowing: boolean;
  isFinalResult?: boolean;
  speechStartedAtMs?: number;
  cardAppearedAtMs?: number;
  isDeleteAction?: boolean;
  safetyTier?: SafetyTierEvaluation | null;
}): boolean {
  if (!params.isPillActive || !params.isCardShowing) return false;
  if (params.isFinalResult === false) return false;
  if (
    params.speechStartedAtMs !== undefined &&
    params.cardAppearedAtMs !== undefined &&
    params.speechStartedAtMs < params.cardAppearedAtMs
  ) {
    return false;
  }
  if (params.isDeleteAction) return false;
  if (params.safetyTier?.requiresTapOnly) return false;
  return true;
}

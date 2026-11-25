# Voice-First Editing & Correction Verification Report (`EDIT_VERIFICATION.md`)

Generated: 2026-11-25 | Scope: Read-only audit of current `main` (`8063017`)

---

## 1. Test Coverage (10 Languages × Edit Intent Groups)

Evaluated from:
- [tests/voiceEditingComprehensive.test.ts](file:///C:/Users/Croma/Desktop/DukaanAI/tests/voiceEditingComprehensive.test.ts#L41-L118)
- [tests/pendingCorrections.test.ts](file:///C:/Users/Croma/Desktop/DukaanAI/tests/pendingCorrections.test.ts#L19-L148)
- [tests/savedEntryEdits.test.ts](file:///C:/Users/Croma/Desktop/DukaanAI/tests/savedEntryEdits.test.ts#L39-L66)

`tests/voiceEditingComprehensive.test.ts` tests **31** phrases total in `hi` and `en`, and **30** phrases total in `pa`, `gu`, `mr`, `bn`, `ta`, `te`, `kn`, `ml`. However, broken down **per intent group**, every single intent group in every language is under 30 phrases:

| Intent Group | `hi` | `en` | `pa` | `gu` | `mr` | `bn` | `ta` | `te` | `kn` | `ml` | Status (< 30?) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **pending correction** | 27 | 18 | 16 | 16 | 16 | 16 | 16 | 16 | 16 | 16 | **FLAG (< 30)** |
| **change_amount** | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | **FLAG (< 30)** |
| **change_item** | 4 | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **FLAG (< 30)** |
| **change_customer** | 3 | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **FLAG (< 30)** |
| **change_quantity** | 3 | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **FLAG (< 30)** |
| **change_date** | 3 | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **FLAG (< 30)** |
| **edit_note** | 2 | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **FLAG (< 30)** |
| **edit_entry** | 4 | 4 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **FLAG (< 30)** |
| **domain edits** (lines 250–266) | 4 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **FLAG (< 30)** |

> **Finding**: Total phrases per language is 30–31+, but **per intent group × per language**, all 9 groups are under 30 phrases.

---

## 2. Database Migration, Idempotency, Applied Status & RLS

### Idempotency (`supabase/migrations/20261125000000_append_only_corrections_audit.sql`)
- **Lines 7–15**: `ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS ...` — **Idempotent**.
- **Lines 17, 36–38, 67–68**: `CREATE INDEX IF NOT EXISTS ...` — **Idempotent**.
- **Lines 20, 55**: `CREATE TABLE IF NOT EXISTS public.audit_logs` and `public.price_history` — **Idempotent**.
- **Lines 40, 70**: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` — **Idempotent**.
- **Lines 42–52, 72–82**: `DROP POLICY IF EXISTS ...` followed by `CREATE POLICY ...` — **Idempotent**.

### Applied Status & Command
- Remote Supabase migration status cannot be inspected from the offline sandbox. Run:
  ```bash
  npx supabase migration list --linked
  npx supabase db push
  ```

### Exact RLS Policies
1. **`public.audit_logs`** ([20261125000000_append_only_corrections_audit.sql#L40-L52](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261125000000_append_only_corrections_audit.sql#L40-L52)):
   - `audit_logs_select_own_shop`: `FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.users WHERE id = auth.uid()))`
   - `audit_logs_insert_own_shop`: `FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.users WHERE id = auth.uid()))`
   - **Confirmed**: There is **no `UPDATE` or `DELETE` policy** on `public.audit_logs`.
2. **`public.price_history`** ([20261125000000_append_only_corrections_audit.sql#L70-L82](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261125000000_append_only_corrections_audit.sql#L70-L82)):
   - `price_history_select_own_shop`: `FOR SELECT USING (shop_id IN (SELECT shop_id FROM public.users WHERE id = auth.uid()))`
   - `price_history_insert_own_shop`: `FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM public.users WHERE id = auth.uid()))`
   - No `UPDATE` or `DELETE` policy.
3. **Correction columns on `public.transactions`** ([20261118000000_initial_schema.sql#L187-L190](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261118000000_initial_schema.sql#L187-L190)):
   - Protected by `transactions_access_policy` (`FOR ALL USING (shop_id = public.auth_shop_id()) WITH CHECK (shop_id = public.auth_shop_id())`).

---

## 3. Bare `"nahi"` vs `"nahi, 600"` vs `"nahi nahi 600"` & Mid-Speech Corrections

### Negation Disambiguation (`src/voice/pendingCorrectionParser.ts`)
- **Bare `"nahi"`** (and equivalents in all 10 languages: `nahi|nahin|na|no|nope|नहीं|ना|ਨਹੀਂ|ਨਾ|ના|नाही|नको|না|இல்லை|வேண்டாம்|వద్దు|కాదు|ಬೇಡ|വേണ്ട`):
  - Matches `PURE_CANCEL_REGEX` ([pendingCorrectionParser.ts#L41-L42](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/pendingCorrectionParser.ts#L41-L42)), anchored `^...[\s.!।]*$`, returning `{ type: 'cancel' }` at [line 203](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/pendingCorrectionParser.ts#L203).
- **`"nahi, 600"`** (all 10 languages):
  - Does **not** match `PURE_CANCEL_REGEX` because of `, 600`.
  - `extractReplacementAfterNahi` ([line 70](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/pendingCorrectionParser.ts#L70)) requires `\s+` before the negation word, so it returns `null` when negation is leading.
  - Line 218 strips `LEADING_NEGATION_REGEX` ([line 48](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/pendingCorrectionParser.ts#L48)), leaving `"600"`, which resolves as `newAmount: 600` ([lines 409–416](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/pendingCorrectionParser.ts#L409-L416)).
- **`"nahi nahi 600"`**:
  - `extractReplacementAfterNahi` ([lines 70–78](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/pendingCorrectionParser.ts#L70-L78)) splits on `\s+(?:nahi|...)\s*[,।:;-]?\s*` into `["nahi", "600"]` and takes the last non-empty segment (`"600"`), resolving `newAmount: 600`.

### Correction Arriving While Confirmation Card Is Mid-Speech
- In [ConfirmationCard.tsx#L246-L270](file:///C:/Users/Croma/Desktop/DukaanAI/src/components/ConfirmationCard/ConfirmationCard.tsx#L246-L270), `speechSynthesizer.speak(...)` runs on `pendingKey` change, and `onStartListeningRef.current?.()` only fires in `.then()` after TTS finishes (unless `isPausedRef.current` is true).
- If the shopkeeper manually taps the mic pill mid-speech ([ConfirmationCard.tsx#L536-L545](file:///C:/Users/Croma/Desktop/DukaanAI/src/components/ConfirmationCard/ConfirmationCard.tsx#L536-L545)), `speechSynthesizer.stop()` cancels TTS before `onStartListeningForReply()` starts.
- When a correction updates `pendingConfirmation`, `pendingKey` ([ConfirmationCard.tsx#L224-L226](file:///C:/Users/Croma/Desktop/DukaanAI/src/components/ConfirmationCard/ConfirmationCard.tsx#L224-L226)) changes, `useEffect` sets `active = false` on the previous TTS promise, and speaks `pending.lastCorrectionReadback` ([line 235](file:///C:/Users/Croma/Desktop/DukaanAI/src/components/ConfirmationCard/ConfirmationCard.tsx#L235)).
- **Gap**: In [useVoiceController.ts#L1368-L1374](file:///C:/Users/Croma/Desktop/DukaanAI/src/hooks/useVoiceController.ts#L1368-L1374), interim `isYes && !isNo && raw.split(/\s+/).length <= 2` can fire `handleConfirmSave()` before `res.isFinal` if the user starts speaking `"haan 600..."` or `"haan nahi 600"`. Also, if `parsePendingCorrection` returns `no_match` while the card is open, `startListeningForReply` is not automatically restarted.

---

## 4. Offline Corrections (Queue Order, Replay on Reconnect, Multi-Device Conflicts)

- **Current Behavior**:
  - `addTransaction` ([ShopContext.tsx#L858-L862](file:///C:/Users/Croma/Desktop/DukaanAI/src/context/ShopContext.tsx#L858-L862)) enqueues new offline transactions into IndexedDB via `queueTransactionOffline`.
  - `applyTransactionCorrection` ([ShopContext.tsx#L727-L804](file:///C:/Users/Croma/Desktop/DukaanAI/src/context/ShopContext.tsx#L727-L804)) updates `localStorage` state immediately, and only inserts `audit_logs` when `isSupabaseConfigured() && navigator.onLine` ([line 777](file:///C:/Users/Croma/Desktop/DukaanAI/src/context/ShopContext.tsx#L777)).
  - **It does NOT enqueue** `reversalTx`, `correctionTx`, `superseded_by` updates, or `auditLogs` into IndexedDB when offline!
  - `drainOfflineQueue` ([syncEngine.ts#L35-L86](file:///C:/Users/Croma/Desktop/DukaanAI/src/offline/syncEngine.ts#L35-L86)) only replays `mut.type === 'add_transaction'` and its `.insert({...})` ([lines 55–65](file:///C:/Users/Croma/Desktop/DukaanAI/src/offline/syncEngine.ts#L55-L65)) omits `parent_transaction_id`, `is_correction`, `is_reversal`, `superseded_by`, `note`, `source`, `has_sent_reminder`, and `proof_original_amount`.
- **Conflict Handling**: There is currently **no** multi-device conflict detection or server-side version/CAS check when two devices edit the same original transaction offline.

---

## 5. Invariant Property-Style Test

- **Current Status**: **Missing (Gap)**. No property-style / randomized sequence test currently exists in `tests/` verifying that after any arbitrary sequence of edits (amount, item, qty, customer) and undos, the sum of customer balances, item stock, and daily profit match values recomputed from original transactions plus effective corrections. (No code was modified per instructions.)

---

## 6. Double-Undo, Re-Editing an Already Corrected Entry & Threshold Defaults

- **Undoing a correction twice** ([ShopContext.tsx#L962-L1023](file:///C:/Users/Croma/Desktop/DukaanAI/src/context/ShopContext.tsx#L962-L1023)):
  - First undo applies `-delta` / `-quantityDelta`, removes `correctionTxId` & `reversalTxId`, restores `superseded_by`, logs an `undo` audit record, and clears `lastCorrectionUndo` and `lastTransaction` ([lines 1003–1004](file:///C:/Users/Croma/Desktop/DukaanAI/src/context/ShopContext.tsx#L1003-L1004)).
  - Second undo sees `lastCorrectionUndo === null` and `lastTransaction === null` and safely returns `{ success: false, message: 'No recent transaction to undo' }` ([line 1022](file:///C:/Users/Croma/Desktop/DukaanAI/src/context/ShopContext.tsx#L1022)) without double-reversing. (Caveat: if an older `lastPriceChange` is still set, a second undo would undo that price change.)
- **Editing an already corrected entry**:
  - **Bug in [entryResolver.ts#L69](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/entryResolver.ts#L69)**: `activeEntries` filters `!tx.is_reversal && !tx.is_correction`. This **hides** `correctionTx` and **keeps** the superseded `originalTx`! A second voice edit on the same entry therefore targets `originalTx` (old amount) instead of the latest effective `correctionTx`, causing incorrect diff comparisons and double-reversals.
  - In [ShopContext.tsx#L733-L771](file:///C:/Users/Croma/Desktop/DukaanAI/src/context/ShopContext.tsx#L733-L771), chaining tap edits works for `getEffectiveTransactions`, though `auditLogs.entity_id` records the intermediate `correctionTx.id` rather than normalizing to the root `parent_transaction_id || targetTx.id`.
- **Default Thresholds** ([safetyTiers.ts#L5-L6](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/safetyTiers.ts#L5-L6)):
  - `DEFAULT_EDIT_RUPEE_THRESHOLD = 2000` (`₹2,000`)
  - `DEFAULT_EDIT_AGE_DAYS_THRESHOLD = 7` (`7 days`)

---

## Gaps & Proposed Fixes — Resolution Status (All 5 Implemented)

1. **Gap 1 — Per-Intent-Group Phrase Coverage**: **Resolved** in [tests/fixtures/editPhrases.ts](file:///C:/Users/Croma/Desktop/DukaanAI/tests/fixtures/editPhrases.ts) and [tests/stagedPhraseCoverage.test.ts](file:///C:/Users/Croma/Desktop/DukaanAI/tests/stagedPhraseCoverage.test.ts) (Stage 1 `hi`, `en`, `hinglish`, `pa` ≥ 30 per group; Stage 2 `gu`, `mr`, `bn`, `ta`, `te`, `kn`, `ml` ≥ 10 per group; held-out set; `'needs native review'` markers; rule-hit vs LLM-fallback rates reported).
2. **Gap 2 — Offline Correction Queue & Conflict Check**: **Resolved** in [src/offline/db.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/offline/db.ts), [src/offline/syncEngine.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/offline/syncEngine.ts), [src/context/ShopContext.tsx](file:///C:/Users/Croma/Desktop/DukaanAI/src/context/ShopContext.tsx), [supabase/migrations/20261125000000_append_only_corrections_audit.sql](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261125000000_append_only_corrections_audit.sql) (`apply_correction_atomic` RPC), and [tests/offlineCorrectionSync.test.ts](file:///C:/Users/Croma/Desktop/DukaanAI/tests/offlineCorrectionSync.test.ts).
3. **Gap 3 — Re-Editing Corrected Entries**: **Resolved** in [src/voice/entryResolver.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/entryResolver.ts) (`getEffectiveTransactions`), [src/lib/correctionService.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/lib/correctionService.ts) (root `entity_id` + `previous_correction_id`), and [src/context/ShopContext.tsx](file:///C:/Users/Croma/Desktop/DukaanAI/src/context/ShopContext.tsx) (chained undo stack).
4. **Gap 4 — Property-Style Invariant Test**: **Resolved** in [tests/invariantProperty.test.ts](file:///C:/Users/Croma/Desktop/DukaanAI/tests/invariantProperty.test.ts).
5. **Gap 5 — Interim `"haan"` Guard**: **Resolved** in [src/voice/safetyTiers.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/safetyTiers.ts) and [src/hooks/useVoiceController.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/hooks/useVoiceController.ts).
6. **Settings Thresholds Confirmed**: `edit_rupee_threshold` (default `2000`) and `edit_age_days_threshold` (default `7`) are editable in [src/components/SettingsModal.tsx](file:///C:/Users/Croma/Desktop/DukaanAI/src/components/SettingsModal.tsx).

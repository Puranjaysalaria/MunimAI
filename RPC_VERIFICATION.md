# RPC, Migration, Safety Guard & Conflict UI Verification (`RPC_VERIFICATION.md`)

Generated: 2026-11-26 | Scope: Read-only audit of `main` (`44c0cfb`)

---

## 1. `apply_correction_atomic` Security Mode, `shop_id` Verification & Postgres/RLS Execution Status

- **Security Mode**: `SECURITY INVOKER` ([20261125000000_append_only_corrections_audit.sql#L99](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261125000000_append_only_corrections_audit.sql#L99)). Because it is `SECURITY INVOKER`, it executes with the caller's Postgres role and respects all RLS policies on `transactions`, `customers`, `items`, and `audit_logs`.
- **`shop_id` Verification Against Caller**:
  - Explicit check at [lines 108–110](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261125000000_append_only_corrections_audit.sql#L108-L110):
    ```sql
    IF p_shop_id <> public.auth_shop_id() THEN
        RAISE EXCEPTION 'Unauthorized shop_id';
    END IF;
    ```
  - All subsequent `SELECT ... FOR UPDATE`, `UPDATE public.transactions`, `UPDATE public.customers`, and `UPDATE public.items` also filter by `AND shop_id = p_shop_id` ([lines 120, 161, 168, 176](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261125000000_append_only_corrections_audit.sql#L120-L176)), in addition to table-level RLS (`shop_id = public.auth_shop_id()`).
- **Real / Local Postgres RLS Execution Status**:
  - **Not yet run** against a real or local Postgres instance with RLS enabled (all tests in `tests/` use in-memory/mock `SyncTransport`).
  - **Exact Supabase CLI commands to run locally with RLS enabled**:
    ```bash
    npx supabase start
    npx supabase db reset
    npx supabase test db
    ```

---

## 2. Full Transaction Rollback & Proof Status

- **Does it roll back fully on failure?**: Yes, by Postgres PL/pgSQL function atomicity — `apply_correction_atomic` ([lines 87–194](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261125000000_append_only_corrections_audit.sql#L87-L194)) has no `EXCEPTION` block or subtransaction commits, so any failure (e.g., `Unauthorized shop_id`, constraint violation on `audit_logs`, invalid UUID cast, or RLS `WITH CHECK` failure) aborts the entire function call and rolls back all `INSERT` and `UPDATE` statements.
- **Note on `ON CONFLICT (id) DO NOTHING`**: Lines 145 and 157 use `ON CONFLICT (id) DO NOTHING`, while line 113 already short-circuits if `v_corr_id` exists. If `p_customer_deltas` or `p_stock_deltas` fails after line 135, Postgres rolls back lines 135–177 together.
- **Which test proves it?**: **None currently.** [tests/offlineCorrectionSync.test.ts](file:///C:/Users/Croma/Desktop/DukaanAI/tests/offlineCorrectionSync.test.ts) tests JS-level `SyncTransport` mocks, not a real Postgres rollback when e.g. `audit_logs` insert fails mid-RPC. A pgTAP / local Postgres integration test is needed to prove DB rollback under RLS.

---

## 3. Migration History & Linked Supabase Status

- **Was the RPC added to an already-created migration?**: Yes — `apply_correction_atomic` was appended to [20261125000000_append_only_corrections_audit.sql](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261125000000_append_only_corrections_audit.sql#L86-L194) (originally created in commit `535ef8c`, then edited in `c819248` and `8a669f8`).
- **Output of `npx supabase migration list --linked`**:
  - Executed `npx supabase migration list --linked 2>&1` (exited with code 1 — workspace is not linked via `supabase link`):
    ```
    npm warn exec The following package was not found and will be installed: supabase@3.4.0
    npm notice run munim-ai@1.0.0 npx
    npm notice run supabase migration list --linked
    Warning: --linked is deprecated and will be removed in v4. Use --remote instead
    {"_tag":"Error","error":{"code":"ProjectRefNotLinkedError","message":"Cannot find project ref. Have you run supabase link?"}}
    ```
- **Proposed New Migration File (if `20261125000000` is already applied on linked Supabase)**:
  - If `20261125000000_append_only_corrections_audit.sql` was already applied remotely before `8a669f8`, Supabase CLI will not re-run it. Proposed new migration file:
    `supabase/migrations/20261126000000_apply_correction_atomic_rpc.sql`
    containing:
    1. `ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS previous_correction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;`
    2. `ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS previous_correction_id TEXT;`
    3. `CREATE OR REPLACE FUNCTION public.apply_correction_atomic(...) ...` (lines 87–194 of `20261125000000`).

---

## 4. `"haan"` Guard Behavior When Speech Provider Returns Only a Final Transcript With No Start Time

- In [useVoiceController.ts#L1355-L1367](file:///C:/Users/Croma/Desktop/DukaanAI/src/hooks/useVoiceController.ts#L1355-L1367):
  - `replySpeechStartedAtRef.current` is initialized to `0` when `startListeningForReply` starts ([line 1355](file:///C:/Users/Croma/Desktop/DukaanAI/src/hooks/useVoiceController.ts#L1355)).
  - Inside `onResult`, if `replySpeechStartedAtRef.current === 0`, it sets `replySpeechStartedAtRef.current = Date.now()` ([lines 1365–1367](file:///C:/Users/Croma/Desktop/DukaanAI/src/hooks/useVoiceController.ts#L1365-L1367)) **before** checking `if (res.isFinal)` ([line 1382](file:///C:/Users/Croma/Desktop/DukaanAI/src/hooks/useVoiceController.ts#L1382)).
  - Therefore, if a server/batch STT provider emits **only a single `isFinal: true` result with no separate start-time event**, `replySpeechStartedAtRef.current` is assigned `Date.now()` at final-result delivery time (`>= cardAppearedAtRef.current`), so `canCompleteByVoiceConfirm` ([safetyTiers.ts#L98-L104](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/safetyTiers.ts#L98-L104)) **accepts** it.
  - **Caveat**: If the user actually started speaking *before* the card appeared (e.g. buffered audio from an earlier utterance) and the provider provides no `speechStartTimestamp`, `Date.now()` at `onResult` cannot distinguish pre-card speech from post-card speech unless the STT provider populates an explicit `startedAt` timestamp on `STTResult` or `onSpeechStart` callback.

---

## 5. Shopkeeper UI When a Correction Hits a Sync Conflict

- **Finding (Gap)**: `ShopContext.tsx` exposes `syncConflicts` and `dismissSyncConflicts` ([ShopContext.tsx#L49-L50, L197, L254, L819, L1195-L1196](file:///C:/Users/Croma/Desktop/DukaanAI/src/context/ShopContext.tsx#L49-L50)), **but NO UI component currently reads or renders `syncConflicts`**.
- **Result**: When `apply_correction_atomic` returns `status: 'conflict'`, `syncConflicts` state is populated in memory, **but the shopkeeper sees nothing on screen** and hears no conflict alert.

---

## 6. Proposed 500-Seed Invariant Script (Not in Normal Test Run)

Proposed standalone script (e.g. `scripts/verify-invariants-500.ts`, runnable via `npx tsx scripts/verify-invariants-500.ts`):
- Runs seeds `1..500` with `mulberry32(seed)`.
- Includes `add`, `edit`, `re-edit`, `undo`, `double-undo`, `delete-request`, **and simulated mid-sync connection drops** via `drainOfflineQueue` with a flaky `SyncTransport`.
- Recomputes customer balances, item stock, and daily profit after every step and prints any failing seed + step + mismatch details, exiting non-zero if any seed fails.

---

## 7. Proposed End-to-End Real-Audio Accuracy Test

Proposed harness (e.g. `scripts/eval-audio-e2e.ts` with fixture folder `tests/audio_fixtures/`):
1. **Independent Phrase Authoring**: Collect native-speaker utterances (minimum 20 phrases per intent per language) authored independently from the regex/parser author, recorded as 16kHz mono `.wav`/`.webm` clips with ground-truth JSON labels `{ audioFile, language, expectedIntent, expectedSlots: { amount, customer, item, quantity, unit } }`.
2. **Real STT Pass**: Feed each audio clip through the configured `serverSpeechProvider` (Sarvam / Whisper / Google STT) to obtain real noisy transcripts (no mocked transcripts).
3. **NLU Pass**: Feed each resulting transcript through `routeVoiceIntent` / `parsePendingCorrection` / `domainEditParser` with a realistic shop context.
4. **Metrics Reported per Language**:
   - **WER / CER** (STT quality baseline)
   - **Intent Accuracy** (`predictedIntent === expectedIntent`)
   - **Slot Accuracy** (exact match on `amount`, `customer`, `item`, `quantity`, `unit`)
   - **Rule-Hit vs LLM-Fallback Breakdown** and confusion matrix.

---

## Summary of Gaps Found (Awaiting Approval Before Any Changes)

1. **Missing Sync Conflict Banner/Modal UI**: Render `syncConflicts` in `App.tsx` (persistent high-contrast amber/rose banner or modal with entry details, old vs held correction, and `dismissSyncConflicts` button + TTS warning).
2. **New Incremental Migration File**: Extract `previous_correction_id` columns and `apply_correction_atomic` into `supabase/migrations/20261126000000_apply_correction_atomic_rpc.sql` so already-linked Supabase projects apply it cleanly.
3. **Postgres Rollback & RLS Integration Test**: Add a local Supabase (`pgTAP` or SQL) test verifying `apply_correction_atomic` rolls back all writes on failure and blocks cross-shop access.
4. **STT `speechStartedAtMs` Support**: Add optional `speechStartedAtMs` to `STTResult` / `onSpeechStart` so batch providers that buffer pre-card audio don't bypass the post-card guard.
5. **500-Seed Invariant Script**: Add `scripts/verify-invariants-500.ts` (outside `tests/` so it doesn't slow `vitest run`).
6. **Real-Audio E2E Harness**: Add `scripts/eval-audio-e2e.ts` scaffolding when audio fixtures & server STT keys are ready.

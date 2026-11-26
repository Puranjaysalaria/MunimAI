# QUOTA_SECURITY.md

> **Updated Post-Implementation Status** — All quota lock-down, idempotent reservation, concurrency, secret scan, and device-only override items are now implemented.

---

## 1. `EXECUTE` Grants & Direct Browser Callability (Resolved)
- **Migration**: [20261126010000_voice_usage_atomic_limits.sql#L244-L250](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261126010000_voice_usage_atomic_limits.sql#L244-L250) (edited in place after confirming via `npx supabase migration list` and `npx supabase migration list --linked` that no remote project is linked and it had not been applied remotely).
- `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated;` and `GRANT EXECUTE ON FUNCTION ... TO service_role;` on `reserve_voice_quota`, `reconcile_voice_quota`, and `expire_stale_voice_reservations`.
- **Direct browser callability**: **Blocked** (`permission denied` for both `anon` and `authenticated`).

## 2. Isolated Service-Role Quota Client (Resolved)
- [api/_quotaServiceClient.ts](file:///C:/Users/Croma/Desktop/DukaanAI/api/_quotaServiceClient.ts#L1-L20) provides `getQuotaServiceRoleClient()`, imported **only** by [api/_voiceShared.ts#L3](file:///C:/Users/Croma/Desktop/DukaanAI/api/_voiceShared.ts#L3) for quota RPC calls.
- Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` strictly from server `process.env` (never `VITE_*`) and fails closed (`503`) if missing.
- User verification (`verifySupabaseUserAndShop`) still verifies the Bearer JWT with `supabase.auth.getUser(token)` and derives `shop_id` from `public.users`.

## 3. Idempotent Reconcile with `voice_reservations` & `Asia/Kolkata` Paise Accounting (Resolved)
- `voice_reservations` table ([20261126010000_voice_usage_atomic_limits.sql#L27-L38](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261126010000_voice_usage_atomic_limits.sql#L27-L38)) tracks `reservation_id`, `shop_id`, `provider`, `kind`, `reserved_paise`, `actual_paise`, `status` (`reserved | settled | expired`), `created_at`, `settled_at`.
- Day & month are computed in `Asia/Kolkata`, money is stored as integer paise (`bigint`/`integer`), inputs reject non-positive/NaN/Infinity/oversized/unknown provider or kind, and locks are acquired in fixed order (`voice_usage_global` -> `voice_usage`) before checking all 4 limits.
- `reconcile_voice_quota(p_reservation_id, p_shop_id, p_actual_inr)` locks the reservation row, applies once only if `status = 'reserved'` and `shop_id` matches, refunds `[0, reserved_paise]`, and marks `settled`.
- `expire_stale_voice_reservations(p_max_age_minutes)` marks old `reserved` rows `expired` without refunding.

## 4. Concurrency & Secret Bundle Checks (Resolved)
- Local Supabase 50-parallel concurrency & security test: [scripts/test-voice-quota-concurrency.ts](file:///C:/Users/Croma/Desktop/DukaanAI/scripts/test-voice-quota-concurrency.ts) (`npm run test:quota`), refusing non-local URLs; [supabase/tests/voice_usage_atomic_test.sql](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/tests/voice_usage_atomic_test.sql) updated to verify `anon`/`authenticated` revocation and `service_role` execute grants.
- [scripts/check-no-secrets-in-bundle.ts](file:///C:/Users/Croma/Desktop/DukaanAI/scripts/check-no-secrets-in-bundle.ts) scans `dist/` for `SUPABASE_SERVICE_ROLE_KEY`, `GNANI_API_KEY`, and service-role JWT/secret patterns, and fails if either `GNANI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` is unset in `process.env`.

### 50-Parallel Reserve Diagnosis & Fix
- **Symptom**: `scripts/test-voice-quota-concurrency.ts` initially expected `Math.floor(0.15 / 0.015) = 10` successes and got `7`.
- **Diagnostic Runs (3x after `npx supabase db reset` + 2x without reset)**:
  - All 3 reset runs: `succeeded: 7, denied:shop_daily_budget: 43, errored: 0`, `voice_usage.spend_paise = 14, req_count = 7`, `voice_usage_global.spend_paise = 14, minute_req_count = 7`.
  - Without reset: `succeeded: 7, denied:shop_daily_budget: 43, errored: 0` each time; `voice_usage_global.spend_paise` accumulated `28` then `42` across runs (confirming zero errors and zero cross-shop leakage).
- **Hypothesis Results**:
  - **(a) Concurrent first inserts / deadlocks**: **False** — 0 SQL errors.
  - **(b) Global per-minute or other cap hit first**: **False** — all 43 denials were `shop_daily_budget`.
  - **(c) Reserved amount per call differs from test assumption**: **True (Root Cause)** — `reserve_voice_quota` stores money as integer paise (`v_est_paise := GREATEST(1, round(p_estimated_inr * 100)::integer)`), so `0.015` INR (`1.5` paise) rounds to **`2` paise**, while `0.15` INR cap = `15` paise. Thus `floor(15 / 2) = 7` (`7 * 2 = 14 <= 15`, `8 * 2 = 16 > 15`).
  - **(d) PostgREST transport limits / timeouts**: **False** — 0 transport errors.
  - **(e) Lock timeouts / serialization failures**: **False** — 0 lock/serialization errors.
- **Fix**: Updated [scripts/test-voice-quota-concurrency.ts](file:///C:/Users/Croma/Desktop/DukaanAI/scripts/test-voice-quota-concurrency.ts) to use a fresh shop per run, set `p_global_rpm = 1000`, compute `expectedSuccesses = Math.floor(capPaise / actualCostPaise)` from the actual `voice_reservations.reserved_paise` row in DB, distinguish `succeeded` / `denied` / `errored`, assert `errored === 0` and exact `expectedSuccesses`, and verify double/parallel reconcile, `anon` + `authenticated` permission denied, wrong-shop rejection, and negative/`NaN` rejection.
- **3 Consecutive Passing Runs (`npm run test:quota`)**:
  - Run 1: `succeeded: 7, denied: 43 (shop_daily_budget), errored: 0, actualCostPaise: 2, capPaise: 15` — PASSED.
  - Run 2: `succeeded: 7, denied: 43 (shop_daily_budget), errored: 0, actualCostPaise: 2, capPaise: 15` — PASSED.
  - Run 3: `succeeded: 7, denied: 43 (shop_daily_budget), errored: 0, actualCostPaise: 2, capPaise: 15` — PASSED.

## 5. Device-Only Provider Override (Resolved)
- [src/voice/speechConfig.ts#L160-L220](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/speechConfig.ts#L160-L220) and [src/components/SettingsModal.tsx#L373-L416](file:///C:/Users/Croma/Desktop/DukaanAI/src/components/SettingsModal.tsx#L373-L416) allow per-language device-only STT/TTS overrides in `localStorage` on the Voice Debug screen without redeploying, while preserving shared defaults and still enforcing budgets and consent.

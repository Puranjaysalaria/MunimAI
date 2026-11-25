# QUOTA_SECURITY.md

> **Quota & Security Audit Report** (no code modified — awaiting your approval before changing anything)

---

## 1. `EXECUTE` Grants & Direct Browser Callability

- **Exact `REVOKE` / `GRANT` statements** in [20261126010000_voice_usage_atomic_limits.sql#L211-L214](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261126010000_voice_usage_atomic_limits.sql#L211-L214):
  - `REVOKE ALL ON FUNCTION public.reserve_voice_quota(numeric, numeric, numeric, numeric, integer) FROM PUBLIC, anon;`
  - `REVOKE ALL ON FUNCTION public.reconcile_voice_quota(numeric, numeric, boolean) FROM PUBLIC, anon;`
  - `GRANT EXECUTE ON FUNCTION public.reserve_voice_quota(numeric, numeric, numeric, numeric, integer) TO authenticated, service_role;`
  - `GRANT EXECUTE ON FUNCTION public.reconcile_voice_quota(numeric, numeric, boolean) TO authenticated, service_role;`
- **Can an authenticated browser user call either function directly via the Supabase REST/RPC API with their own token?**
  - **YES — Security Gap**: Because `authenticated` has `EXECUTE` on both functions, any signed-in user could call `supabase.rpc('reconcile_voice_quota', { p_reserved_inr: 9999, p_actual_inr: 0, p_succeeded: false })` directly from browser DevTools using their own JWT, resetting their shop's `spend_inr` to `0` (`GREATEST(0, spend_inr + v_delta)`) and bypassing all rupee budgets, or call `reserve_voice_quota` directly to exhaust global RPM/monthly caps.
- **Proposed Fix**:
  - `REVOKE ALL` from `PUBLIC, anon, authenticated` on **both** `reserve_voice_quota` and `reconcile_voice_quota` (grant `EXECUTE` **only** to `service_role`).
  - Pass `p_shop_id uuid` (or `p_user_id uuid`) from the authenticated server route (`api/gnani-stt.ts` / `api/gnani-tts.ts`) using a `SUPABASE_SERVICE_ROLE_KEY` client after verifying the user's JWT with `supabase.auth.getUser(token)`.

---

## 2. Supabase Client & Key Used by API Routes

- **Verification client (`verifySupabaseUserAndShop`)** in [api/_voiceShared.ts#L315-L335](file:///C:/Users/Croma/Desktop/DukaanAI/api/_voiceShared.ts#L315-L335):
  - Reads `supabaseUrl` from `process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL` and `serviceKey` from `process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY`.
  - Attaches `Authorization: Bearer <token>` and calls `supabase.auth.getUser(token)` + queries `users.shop_id`.
- **Quota client (`reserveVoiceQuota` & `reconcileVoiceQuota`)** in [api/_voiceShared.ts#L173-L185](file:///C:/Users/Croma/Desktop/DukaanAI/api/_voiceShared.ts#L173-L185) and [api/_voiceShared.ts#L254-L270](file:///C:/Users/Croma/Desktop/DukaanAI/api/_voiceShared.ts#L254-L270):
  - Reads `supabaseUrl` from `process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL`.
  - Reads `anonKey` from `process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY` (preferring anon key first!).
  - Passes the **user's JWT** in `global.headers.Authorization: Bearer ${auth.token}` so Postgres `auth.uid()` resolves inside the RPC.
- **Gap**: Quota RPC calls should **require** `SUPABASE_SERVICE_ROLE_KEY` (fail closed with `503` if missing on the server) rather than falling back to `ANON_KEY` + user token, so `authenticated` never needs `EXECUTE` on quota RPCs.

---

## 3. Idempotency & Refund Safety of `reconcile_voice_quota`

- **Is `reconcile` idempotent per reservation ID and capped to refunding up to the reserved amount once?**
  - **NO — Gap**: Look at [20261126010000_voice_usage_atomic_limits.sql#L161-L208](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261126010000_voice_usage_atomic_limits.sql#L161-L208):
    1. There is **no `reservation_id`** parameter or `voice_reservations` tracking table.
    2. `reconcile_voice_quota` simply adds `v_delta` (`-p_reserved_inr` on failure) to `voice_usage.spend_inr` and `voice_usage_global.spend_inr`.
    3. Calling `reconcile_voice_quota` twice for the same failed call subtracts `p_reserved_inr` **twice** (potentially wiping out spend from earlier valid calls down to `0`).
- **Proposed Fix (new additive migration)**:
  1. Add a `public.voice_reservations (id uuid PRIMARY KEY, shop_id uuid NOT NULL, reserved_inr numeric(12,6) NOT NULL, actual_inr numeric(12,6), status text NOT NULL CHECK (status IN ('reserved','settled','refunded')), created_at timestamptz DEFAULT now(), reconciled_at timestamptz)` table with RLS enabled and zero client policies.
  2. `reserve_voice_quota(p_shop_id uuid, p_estimated_inr numeric, ...)` generates and returns `reservation_id uuid`, inserting a row with `status = 'reserved'`.
  3. `reconcile_voice_quota(p_reservation_id uuid, p_actual_inr numeric, p_succeeded boolean)` locks the `voice_reservations` row `WHERE id = p_reservation_id AND status = 'reserved' FOR UPDATE`, computes `v_delta = CASE WHEN p_succeeded THEN LEAST(reserved_inr * 2, GREATEST(0, p_actual_inr)) - reserved_inr ELSE -reserved_inr END`, marks `status = CASE WHEN p_succeeded THEN 'settled' ELSE 'refunded' END`, and returns immediately as a no-op if already reconciled.
  4. `REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;`.

---

## 4. Concurrency Testing (`supabase/tests/voice_usage_atomic_test.sql`)

- **Does `supabase/tests/voice_usage_atomic_test.sql` test true concurrency?**
  - **NO**: [voice_usage_atomic_test.sql#L1-L19](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/tests/voice_usage_atomic_test.sql#L1-L19) only runs a single-transaction `DO $$` block checking `relrowsecurity` and `has_function_privilege('anon', ...)`. It does not fire parallel queries against Postgres.
- **Proposed Node Concurrency Test Script (`scripts/test-voice-quota-concurrency.ts`)** (ready to add upon your approval):
  - Connects to a **local** Supabase instance (`http://127.0.0.1:54321` using local `SUPABASE_SERVICE_ROLE_KEY`), seeds/uses a test shop, fires **50 parallel `reserve_voice_quota` calls** via `Promise.all` against a tight daily cap (e.g., `p_shop_daily_cap = 0.15`, `p_estimated_inr = 0.015` -> max 10 allowed) and a tight global RPM cap (`p_global_rpm = 12`), and asserts:
    - `allowedCount <= 10` (never exceeds daily cap)
    - `voice_usage.spend_inr <= 0.15`
    - `voice_usage_global.minute_req_count <= 12`
    - Duplicate `reconcile_voice_quota(reservation_id, ...)` calls only refund once.

---

## 5. Complete Environment Variable List & Missing-Var Behavior

| Variable Name | Used In | Behavior If Missing (Fail Closed) & User Experience |
|---|---|---|
| `ALLOWED_ORIGINS` | `api/_voiceShared.ts#L68` | Browser requests with an `Origin` header receive `403 Origin not allowed`. Client STT silently falls back to `BrowserSpeechProvider`; TTS falls back to device voice. |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | `api/_voiceShared.ts#L173,L307` | `verifySupabaseUserAndShop` returns `503 Unauthorized`. Client silently falls back to browser STT / device TTS. |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` | `api/_voiceShared.ts#L175-L178,L308-L312` | Returns `503` (auth) or `503 quota_error` (RPC). Client silently falls back to browser STT / device TTS. |
| `GNANI_STT_URL` | `api/gnani-stt.ts#L106` | Route returns `503 Speech service unavailable` (before quota reservation). Client silently falls back to `BrowserSpeechProvider`. |
| `GNANI_API_KEY` / `GNANI_ACCESS_KEY` | `api/gnani-stt.ts#L107`, `api/gnani-tts.ts#L95`, `scripts/check-no-secrets-in-bundle.ts#L84` | Routes return `503 Speech service unavailable`; `npm run check:secrets` exits with code `1`. Client silently falls back to browser STT / device TTS. |
| `GNANI_PRODUCT_ID` | `api/gnani-stt.ts#L108` | Optional header `x-product-id` omitted; request still proceeds if `GNANI_STT_URL` & `GNANI_API_KEY` are set. |
| `GNANI_STT_MODEL` | `api/gnani-stt.ts#L80` | Defaults to `'gnani-stt-v2'`. |
| `TIMBRE_TTS_URL` / `GNANI_TTS_URL` | `api/gnani-tts.ts#L94` | Route returns `503 Speech service unavailable`. Client falls back to device voice / text-only. |
| `TIMBRE_API_KEY` | `api/gnani-tts.ts#L95` | Fallback key if `GNANI_API_KEY` is unset; if both missing -> `503`. |
| `TIMBRE_TTS_MODEL` | `api/gnani-tts.ts#L67` | Defaults to `'timbre-v1'`. |
| `TIMBRE_TTS_VOICE` | `api/gnani-tts.ts#L73` | Defaults to `'ananya'`. |
| `GNANI_DAILY_BUDGET_INR` | `api/_voiceShared.ts#L157` | Defaults to `100` (₹100/day per shop). |
| `GNANI_MONTHLY_BUDGET_INR` | `api/_voiceShared.ts#L158` | Defaults to `1500` (₹1500/month per shop). |
| `GNANI_GLOBAL_MONTHLY_BUDGET_INR` | `api/_voiceShared.ts#L159` | Defaults to `25000` (₹25000/month global). |
| `GNANI_GLOBAL_RPM` | `api/_voiceShared.ts#L160` | Defaults to `120` req/min global. |
| `GNANI_TTS_MAX_CHARS` | `api/gnani-tts.ts#L86` | Defaults to `500` characters. |
| `GNANI_UPSTREAM_TIMEOUT_MS` | `api/gnani-stt.ts#L127`, `api/gnani-tts.ts#L112` | Defaults to `8000` ms. |

---

## 6. Switching a Language to Gnani (Code Change / Redeploy?)

- **Current state in [src/voice/speechConfig.ts#L26-L157](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/speechConfig.ts#L26-L157)**: All 10 languages (`hi`, `en`, `pa`, `gu`, `mr`, `bn`, `ta`, `te`, `kn`, `ml`) already have `sttProvider: 'gnani'` and `ttsProvider: 'gnani'`.
- **Global STT activation ([src/stt/index.ts#L25-L30](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/index.ts#L25-L30))**: `createSTTProvider` reads `VITE_STT_PROVIDER` at **Vite build time** (default `'browser'`).
  - **Does switching `VITE_STT_PROVIDER` require a rebuild/redeploy?** **YES** — Vite inlines `import.meta.env.VITE_*` into the client bundle at build time, so changing `VITE_STT_PROVIDER=gnani` requires a redeploy on Vercel.
  - **Does toggling a specific language between `'gnani'` and `'browser'` require a code change & redeploy?** **YES** currently, because `VOICE_LANGUAGE_PROFILES` is a hardcoded TypeScript constant in `src/voice/speechConfig.ts` (not read from Settings/DB or runtime env). Once `VITE_STT_PROVIDER=gnani` is deployed, the shopkeeper can turn Cloud Speech on/off globally (for all languages) in Settings without a redeploy.

---

## Gaps & Proposed Fixes (Waiting for Your Approval)
1. **Revoke `authenticated` `EXECUTE` on `reserve_voice_quota` & `reconcile_voice_quota`** and require `SUPABASE_SERVICE_ROLE_KEY` on server routes (pass verified `p_shop_id` after `supabase.auth.getUser`).
2. **Add `voice_reservations` table + `p_reservation_id uuid`** so `reconcile_voice_quota` is strictly idempotent and can refund up to `reserved_inr` at most once.
3. **Add `scripts/test-voice-quota-concurrency.ts`** firing >= 50 parallel `reserve_voice_quota` calls against local Supabase to prove caps are never exceeded under real Postgres row locking.

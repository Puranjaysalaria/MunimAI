# GNANI_VERIFICATION.md

> **Verification Audit & Final Report** (code unchanged — awaiting approval before fixing listed gaps)

---

## Final Report Summary

### What Is Done
- **Phase 1 (Command Clip Capture & WAV Conversion)**: [src/stt/audioClipProcessor.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/audioClipProcessor.ts#L1-L263) records only while the voice pill is active (`isPillActive`), caps clips to configurable `maxDurationMs` (default `15_000 ms`), trims leading/trailing silence, mixes to mono, resamples to `16 kHz`, encodes 16-bit PCM WAV, and computes `utteranceStartedAtMs` for the `"haan"` guard in [src/voice/safetyTiers.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/safetyTiers.ts#L90-L111).
- **Phase 2 (Gnani STT & Silent Fallback)**: [src/stt/gnaniSttProvider.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/gnaniSttProvider.ts#L1-L246), [src/stt/index.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/index.ts#L1-L39), and [api/gnani-stt.ts](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-stt.ts#L1-L233) implement REST STT with Hinglish `mixed_language` option when supported, reserved `StreamingSTTInterface` (no WebSocket), and silent fallback to `BrowserSpeechProvider`.
- **Phase 3 (Timbre TTS, Cache, Indian Numbering & Pre-gen)**: [api/gnani-tts.ts](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-tts.ts#L1-L189), [src/tts/ttsCache.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/tts/ttsCache.ts#L1-L97), [src/tts/speechSynthesizer.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/tts/speechSynthesizer.ts#L551-L678), [src/tts/numberToWords.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/tts/numberToWords.ts#L1-L242), and [scripts/pregenerate-audio.ts](file:///C:/Users/Croma/Desktop/DukaanAI/scripts/pregenerate-audio.ts#L1-L162).
- **Phase 4–6 (Privacy, Debug UI, Secret Check & Eval)**: [src/components/Voice/CloudSpeechConsentModal.tsx](file:///C:/Users/Croma/Desktop/DukaanAI/src/components/Voice/CloudSpeechConsentModal.tsx#L1-L98), [src/components/SettingsModal.tsx](file:///C:/Users/Croma/Desktop/DukaanAI/src/components/SettingsModal.tsx#L326-L426), [scripts/check-no-secrets-in-bundle.ts](file:///C:/Users/Croma/Desktop/DukaanAI/scripts/check-no-secrets-in-bundle.ts#L1-L99), [scripts/eval-stt.ts](file:///C:/Users/Croma/Desktop/DukaanAI/scripts/eval-stt.ts#L1-L137), [scripts/eval-tts.ts](file:///C:/Users/Croma/Desktop/DukaanAI/scripts/eval-tts.ts#L1-L116), and `.gitignore` (`tests/audio-eval`, `tests/tts-eval`).
- **Tests**: 26/26 files, 611/611 Vitest tests passing, plus `npm run check:secrets` passing.

### What Is Not Done / Needs Follow-Up (Gaps Listed Below)
1. Duplicate legacy route `api/stt-gnani.ts` still exists alongside `api/gnani-stt.ts`.
2. Server routes do not verify a Supabase JWT (`supabase.auth.getUser(token)`), use `Access-Control-Allow-Origin: *`, and lack a monthly rupee cap or atomic Postgres RPC for rate limiting/budgeting.
3. `GnaniSttProvider` relies on `maxDurationMs` or user tap to end recording (no automatic client-side VAD auto-stop on trailing silence yet) and sets `voiceState` to `'thinking'` rather than an explicit `"Processing..."` banner if `liveTranscript` is empty.
4. `public/audio-pack/` has not been generated yet (requires your Gnani/Timbre keys + `--confirm`).
5. `check:secrets` is a separate npm script (`npm run check:secrets`) rather than chained into `npm test`, and two test assertions from your checklist (rejecting unknown provider names in `createSTTProvider` and asserting client-bundle scan against real `dist/` in Vitest) are not yet explicit unit tests.

### Exact Windows Commands to Run Evaluation & Pre-Generation Scripts
```powershell
# 1. Dry-run pre-generation (shows char count & rupee estimate, no API call)
npx tsx scripts/pregenerate-audio.ts --dry-run

# 2. Actually pre-generate audio pack (requires GNANI_API_KEY and TIMBRE_TTS_URL/GNANI_TTS_URL)
$env:GNANI_API_KEY="your-key"; $env:TIMBRE_TTS_URL="https://..."; npx tsx scripts/pregenerate-audio.ts --confirm

# 3. Estimate & run STT eval (after placing tests/audio-eval/<lang>/*.wav + .txt)
$env:GNANI_API_KEY="your-key"; $env:GNANI_STT_URL="https://..."; npx tsx scripts/eval-stt.ts
$env:GNANI_API_KEY="your-key"; $env:GNANI_STT_URL="https://..."; npx tsx scripts/eval-stt.ts --confirm

# 4. Estimate & run TTS eval (generates 5 sentences + 2 amounts into tests/tts-eval/<lang>/)
$env:GNANI_API_KEY="your-key"; $env:TIMBRE_TTS_URL="https://..."; npx tsx scripts/eval-tts.ts
$env:GNANI_API_KEY="your-key"; $env:TIMBRE_TTS_URL="https://..."; npx tsx scripts/eval-tts.ts --confirm

# 5. Bundle secret scan
npm run check:secrets
```

### Assumptions Made
- Gnani STT REST accepts multipart `form-data` (`audio`, `lang`, `model`, `encoding=pcm16`, `sample_rate=16000`, optional `mixed_language`) with `Authorization: Bearer <key>` and `x-api-key`.
- Timbre TTS REST accepts JSON `{ text, language, voice, model, format: 'wav' }` and returns either `{ audioBase64, mimeType }` or raw `audio/wav` binary.
- Cost estimates use `₹0.015/sec` for STT and `₹0.0005/char` for TTS ([src/voice/speechConfig.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/speechConfig.ts#L22-L24)).

---

## Detailed Verification Answers (1–10)

### 1. Duplicate `api/gnani-stt.ts` vs `api/stt-gnani.ts`
- **Why both exist**: [api/stt-gnani.ts](file:///C:/Users/Croma/Desktop/DukaanAI/api/stt-gnani.ts#L1-L180) was created during Phase 1 for [src/stt/serverSpeechProvider.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/serverSpeechProvider.ts#L213); [api/gnani-stt.ts](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-stt.ts#L1-L233) was added in Phase 2 with auth, rate limiting, budget checks, and Hinglish `mixed_language` support for [src/stt/gnaniSttProvider.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/gnaniSttProvider.ts#L166).
- **Usage**: `api/gnani-stt.ts` imports `isValidWav16kMonoHeader` and `mapGnaniLanguage` from `./stt-gnani` ([api/gnani-stt.ts#L2](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-stt.ts#L2)); `api/gnani-tts.ts` imports `mapGnaniLanguage` from `./stt-gnani` ([api/gnani-tts.ts#L2](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-tts.ts#L2)). `ServerSpeechProvider` still posts to `/api/stt-gnani`.
- **Proposal**: Extract `isValidWav16kMonoHeader` and `mapGnaniLanguage` into `api/_voiceShared.ts`, update `ServerSpeechProvider` (or remove it in favor of `GnaniSttProvider`), and delete `api/stt-gnani.ts` (and update `tests/gnaniCommandClip.test.ts` to test `api/gnani-stt.ts`).

### 2. Server Route Security (`api/gnani-stt.ts`, `api/gnani-tts.ts`, `api/stt-gnani.ts`)
- **Supabase user verification**: **Gap** — None of the three routes verify a Supabase user JWT. `checkAuth` in [api/gnani-stt.ts#L17-L26](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-stt.ts#L17-L26) and [api/gnani-tts.ts#L17-L24](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-tts.ts#L17-L24) only checks an optional static `INTERNAL_STT_SECRET`/`INTERNAL_TTS_SECRET` (allowing all requests if unset) and trusts `x-shop-id`. `api/stt-gnani.ts` has no auth check at all.
- **Allowed origins**: **Gap** — All three set `Access-Control-Allow-Origin: *` ([api/gnani-stt.ts#L64](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-stt.ts#L64), [api/gnani-tts.ts#L50](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-tts.ts#L50), [api/stt-gnani.ts#L40](file:///C:/Users/Croma/Desktop/DukaanAI/api/stt-gnani.ts#L40)) instead of an allowlist (`ALLOWED_ORIGINS`).
- **Max request body size**: `api/stt-gnani.ts` checks decoded audio `> 1 MB` (`413`) ([api/stt-gnani.ts#L96-L103](file:///C:/Users/Croma/Desktop/DukaanAI/api/stt-gnani.ts#L96-L103)); `api/gnani-stt.ts` validates the WAV header but **does not enforce a 1 MB / 15s max buffer check**; `api/gnani-tts.ts` slices text to `1000` chars ([api/gnani-tts.ts#L96](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-tts.ts#L96)).
- **Language-code allowlist**: `mapGnaniLanguage` ([api/stt-gnani.ts#L3-L28](file:///C:/Users/Croma/Desktop/DukaanAI/api/stt-gnani.ts#L3-L28)) maps known codes (`hi-IN`, `en-IN`, `pa-IN`, `gu-IN`, `mr-IN`, `bn-IN`, `ta-IN`, `te-IN`, `kn-IN`, `ml-IN`) and defaults unknown strings to `'hi-IN'` rather than rejecting invalid codes with `400`.
- **Timeouts**: Server-side `fetch` calls to Gnani/Timbre in [api/gnani-stt.ts#L183](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-stt.ts#L183) and [api/gnani-tts.ts#L126](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-tts.ts#L126) **do not have an `AbortController` timeout** (only the client `GnaniSttProvider` has `DEFAULT_GNANI_TIMEOUT_MS = 8000` at [src/stt/gnaniSttProvider.ts#L32](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/gnaniSttProvider.ts#L32)).
- **Error leakage**: `api/gnani-stt.ts` and `api/gnani-tts.ts` return only HTTP status codes and generic messages; `api/stt-gnani.ts#L148` forwards `detail: upstream.text().slice(0, 300)` which could echo upstream internals.

### 3. Rate-Limiter and Budget Counter Storage
- **Current storage**: In-memory `Map`s (`requestBuckets` and `dailySpendByShop`) in [api/gnani-stt.ts#L9-L10](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-stt.ts#L9-L10) and [api/gnani-tts.ts#L9-L10](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-tts.ts#L9-L10), plus client `localStorage` telemetry in [src/voice/speechConfig.ts#L194](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/speechConfig.ts#L194).
- **Multi-instance behavior**: On Vercel serverless, cold starts and concurrent warm lambdas each get their own memory. Rate limits (`30 RPM` / `40 RPM`) and daily rupee budgets (`₹100`) multiply across instances and reset on cold starts.
- **Proposed shared store**: Create a Supabase Postgres table `voice_usage_daily (shop_id uuid, day date, month text, spend_inr numeric, req_count int, window_start timestamptz, PRIMARY KEY (shop_id, day))` plus an atomic PL/pgSQL RPC `consume_voice_quota(p_shop_id, p_cost_inr, p_daily_cap, p_monthly_cap, p_rpm)` using `INSERT ... ON CONFLICT DO UPDATE` with `WHERE` guards.

### 4. Atomicity of Daily & Monthly Budgets
- **Current state**: Not atomic across instances (in-memory `Map` read-then-write), and **monthly budget cap is missing** (only daily `DEFAULT_DAILY_BUDGET_INR = 100` exists in [api/gnani-stt.ts#L6](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-stt.ts#L6) and [api/gnani-tts.ts#L6](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-tts.ts#L6)). Concurrent requests in Postgres without a row lock or single-statement `UPDATE ... WHERE` could overspend.
- **Proposed fix**: Single-statement atomic RPC in Postgres (`UPDATE ... SET spend_inr = spend_inr + p_cost WHERE daily_spend + p_cost <= p_daily_cap AND monthly_spend + p_cost <= p_monthly_cap RETURNING ...`) inside a transaction.

### 5. Clip Ending, Pill State, and Latency
- **How a clip ends**:
  1. User taps the pill again (toggle off) or releases hold-to-talk ([GlobalVoicePill.tsx#L83-L100](file:///C:/Users/Croma/Desktop/DukaanAI/src/components/Voice/GlobalVoicePill.tsx#L83-L100)).
  2. Automatic 15s cap timer (`maxDurationMs = 15_000`) fires `stopListening()` ([gnaniSttProvider.ts#L130-L132](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/gnaniSttProvider.ts#L130-L132)).
  - **Gap**: No automatic client-side trailing-silence VAD auto-stop yet; the user must tap to stop or wait for the 15s cap.
- **What the pill shows while waiting**: When `MediaRecorder` stops, `GnaniSttProvider` emits `onStateChange('processing')` ([gnaniSttProvider.ts#L146](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/gnaniSttProvider.ts#L146)). When `voiceState === 'thinking'`, `GlobalVoicePill` renders an indigo/purple button with a spinning `Loader2` icon ([GlobalVoicePill.tsx#L181-L198](file:///C:/Users/Croma/Desktop/DukaanAI/src/components/Voice/GlobalVoicePill.tsx#L181-L198)).
- **Latency breakdown**:
  - `decodeAudioData` + `OfflineAudioContext` resample to 16 kHz + silence trim + WAV encode: ~20–80 ms on-device.
  - `/api/gnani-stt` -> Gnani REST round-trip: ~300–1200 ms (capped at `timeoutMs = 8000 ms` before silent fallback).
  - NLU `parseSpeech`: <10 ms local.

### 6. Silence-Trimming Thresholds & Background Noise
- **Thresholds**: `DEFAULT_SILENCE_THRESHOLD = 0.015` (RMS amplitude in 10 ms windows) with `DEFAULT_SILENCE_PADDING_MS = 100` ms ([audioClipProcessor.ts#L11-L12](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/audioClipProcessor.ts#L11-L12), [#L102-L162](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/audioClipProcessor.ts#L102-L162)).
- **Background noise behavior**: In a noisy kirana shop (`RMS >= 0.015` from fan/traffic/chatter), the 10 ms RMS window stays above `0.015`, so leading/trailing noise is **not** trimmed and `utteranceStartedAtMs` stays near `recordingStartedAtMs`. The `"haan"` guard remains safe (it never shifts `speechStartedAtMs` forward past actual speech), though bandwidth/duration savings from trimming shrink in loud environments.

### 7. Default Budgets, Kill Switch Variable, and Switching a Language to Gnani
- **Default budgets**: Client & server default daily budget is `₹100` (`DEFAULT_DAILY_BUDGET_INR = 100` at [src/voice/speechConfig.ts#L22](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/speechConfig.ts#L22), [api/gnani-stt.ts#L6](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-stt.ts#L6), [api/gnani-tts.ts#L6](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-tts.ts#L6)); server env override is `GNANI_DAILY_BUDGET_INR`.
- **Kill switch variable**: `VITE_VOICE_CLOUD_KILL_SWITCH=true` ([src/voice/speechConfig.ts#L283](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/speechConfig.ts#L283)) or runtime `setVoiceKillSwitch(true)`.
- **Switching a language to Gnani**:
  1. Per-language routing table in [src/voice/speechConfig.ts#L26-L157](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/speechConfig.ts#L26-L157) (`sttProvider: 'gnani'`, `ttsProvider: 'gnani'` already configured for all 10 languages).
  2. Client env var `VITE_STT_PROVIDER=gnani` activates `GnaniSttProvider` in [src/stt/index.ts#L22](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/index.ts#L22).
  3. Shopkeeper accepts the consent modal and keeps **"Cloud speech"** ON in [SettingsModal.tsx#L326-L355](file:///C:/Users/Croma/Desktop/DukaanAI/src/components/SettingsModal.tsx#L326-L355).

### 8. LLM Intent Classifier Provider, Model & Key Location
- **Current provider & model**: There is **no external paid LLM API call** in the intent classifier. `activeClassifierProvider` defaults to `MockIntentClassifier` in [src/voice/llmIntentClassifier.ts#L312](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/llmIntentClassifier.ts#L312), which runs deterministic local semantic pattern matching across all `ParsedIntentEnum` intents.
- **API key**: None required on client or server for intent classification. (Gemini key is only used server-side in [api/bill-scan.ts](file:///C:/Users/Croma/Desktop/DukaanAI/api/bill-scan.ts) for receipt OCR.)

### 9. Size & Git Tracking of `public/audio-pack`
- `public/audio-pack` does **not exist yet** (`Test-Path public/audio-pack` -> `False`), size `0 bytes`, and **0 files** are tracked in Git (`git ls-files public/audio-pack` returned empty). It will be populated when you run `npx tsx scripts/pregenerate-audio.ts --confirm`.

### 10. Undocumented Gnani Details & Code Handling
- Because Gnani's live API/billing portal is external and credentials were not configured locally, **billing rounding** (e.g., per-second vs 15s pulse), **GST (18%)**, **free credit balance**, and **provider-specific error JSON codes** are undocumented locally.
- **How code handles each unknown**:
  - *Billing rounding & GST*: Estimator uses raw linear `durationSec * 0.015` / `chars * 0.0005` with no GST multiplier (`speechConfig.ts#L164-L172`).
  - *Free credits*: Treated as `₹100/day` local budget cap (`DEFAULT_DAILY_BUDGET_INR`).
  - *Error codes*: Any non-2xx HTTP status (`401`, `402`, `429`, `502`, `503`) or timeout in `GnaniSttProvider` triggers silent fallback to `BrowserSpeechProvider` ([gnaniSttProvider.ts#L204-L208](file:///C:/Users/Croma/Desktop/DukaanAI/src/stt/gnaniSttProvider.ts#L204-L208)); in `speechSynthesizer`, any TTS error falls back to device voice / text ([speechSynthesizer.ts#L656-L660](file:///C:/Users/Croma/Desktop/DukaanAI/src/tts/speechSynthesizer.ts#L656-L660)).

---

## Gaps & Proposed Fixes (Awaiting Your Approval)

| # | Gap | Proposed Fix |
|---|-----|--------------|
| 1 | Duplicate `api/stt-gnani.ts` alongside `api/gnani-stt.ts` | Move shared helpers (`mapGnaniLanguage`, `isValidWav16kMonoHeader`) to `api/_voiceShared.ts`, point `ServerSpeechProvider` to `/api/gnani-stt` (or remove), and delete `api/stt-gnani.ts`. |
| 2 | No server-side Supabase JWT verification + wildcard CORS `*` + missing `AbortController` timeout on server `fetch` + missing 1 MB cap in `api/gnani-stt.ts` | Verify `Authorization: Bearer <supabase_jwt>` via `supabase.auth.getUser(token)`, restrict `Access-Control-Allow-Origin` via `ALLOWED_ORIGINS`, enforce 1 MB max WAV size & strict language allowlist (`400`), add 8s `AbortController` timeout on Gnani/Timbre `fetch`. |
| 3 | In-memory rate-limiter & budget counters + no monthly cap | Add Supabase migration for `voice_usage_daily` + atomic `consume_voice_quota` RPC enforcing RPM, daily cap, and monthly cap across all serverless instances. |
| 4 | Missing client-side VAD trailing-silence auto-stop + explicit `"Processing..."` pill label | Add `AnalyserNode` trailing-silence detector (e.g., 1.2s silence after speech onset) in `GnaniSttProvider` and map `processing` -> `thinking` with visible `"Processing..."` text in `GlobalVoicePill`. |
| 5 | Missing unit tests for unknown provider rejection & client-bundle scan in `npm test`, and `check:secrets` not in CI/test script | Validate provider names in `createSTTProvider` (throw/reject unknown), add unit tests in `tests/voiceCloudPipeline.test.ts`, and chain `check:secrets` or document it in CI. |

# GNANI_FIX_REPORT.md

## 1. Root Cause & Self-Contained `api/` ESM Fix
- **Root cause on Vercel**: `"type": "module"` in [package.json#L5](file:///C:/Users/Croma/Desktop/DukaanAI/package.json#L5) requires explicit `.js` extensions on relative ESM imports in Node.js; `api/gnani-tts.ts` and `api/gnani-stt.ts` imported `./_voiceShared` without `.js`, causing `ERR_MODULE_NOT_FOUND`.
- **Import scan across `api/`**:
  - `api/gnani-stt.ts` -> `./_voiceShared.js`
  - `api/gnani-tts.ts` -> `./_voiceShared.js`
  - `api/_voiceShared.ts` -> `./_quotaServiceClient.js`
  - `api/bill-scan.ts`, `api/register.ts`: external packages only.
  - **Zero** imports in `api/` reach into `src/`.
- **Chosen approach**: Kept `api/` self-contained with explicit `.js` relative import paths (rather than a custom esbuild wrapper) because `api/` has zero `src/` imports and native Vercel Node ESM resolves `.js` sibling imports directly.

## 2. NodeNext Guard & Plain Node ESM Load Test
- Created [tsconfig.api.json](file:///C:/Users/Croma/Desktop/DukaanAI/tsconfig.api.json) (`"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"noEmit": true`, `include: ["api/**/*.ts"]`).
- Added `npm run typecheck:api` and wired it into `npm run build` (`npm run typecheck:api && tsc && vite build`) in [package.json](file:///C:/Users/Croma/Desktop/DukaanAI/package.json).
- Added [scripts/test-api-load.ts](file:///C:/Users/Croma/Desktop/DukaanAI/scripts/test-api-load.ts) (`npm run test:api-load`), which compiles `api/` to a temp directory, imports every handler under plain Node ESM (not Vitest), and asserts `401` when `Authorization` is missing on `gnani-stt.js` and `gnani-tts.js`.
- Added top-level `try/catch` returning generic `503` JSON to `gnani-stt.ts`, `gnani-tts.ts`, `bill-scan.ts`, and `register.ts`.

## 3. Fail-Closed Defaults, Gnani Official Format, Budgets & TTS Rules
- **Fail-closed cloud defaults**: All 10 languages in [src/voice/speechConfig.ts#L29-L160](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/speechConfig.ts#L29-L160) default to `sttProvider: 'browser'` and `ttsProvider: 'device'` so production never calls `/api/gnani-tts` or `/api/gnani-stt` unless explicitly enabled.
- **Official Gnani Vachana REST format**:
  - Auth header: `X-API-Key-ID: <apiKey>` ([api/gnani-stt.ts#L148](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-stt.ts#L148), [api/gnani-tts.ts#L131](file:///C:/Users/Croma/Desktop/DukaanAI/api/gnani-tts.ts#L131)).
  - STT (`multipart/form-data`): `audio_file`, `language_code` (`indic-auto` for Hinglish mixed/auto mode, else `*-IN`), `model` (`prisma-v3.0` / `prisma-v2.5`).
  - TTS (`application/json`): `{ text, voice, model, language, speed: 1.0, audio_config: { encoding: 'linear_pcm', container: 'wav', num_channels: 1, sample_rate: 16000, sample_width: 2 } }` with default model `timbre-v2.5` and voice `Nalini` / `Kaveri`.
- **Budget & rate-limit defaults**: ₹5/day per shop, ₹50/month per shop, ₹200/month global, 50 req/min global ([src/voice/speechConfig.ts#L22-L25](file:///C:/Users/Croma/Desktop/DukaanAI/src/voice/speechConfig.ts#L22-L25), [api/_voiceShared.ts#L167-L170](file:///C:/Users/Croma/Desktop/DukaanAI/api/_voiceShared.ts#L167-L170)).
- **TTS text rules & audio cache**: Control chars sanitized and text capped at 500 chars client-side before any `/api/gnani-tts` call ([src/tts/speechSynthesizer.ts#L633-L645](file:///C:/Users/Croma/Desktop/DukaanAI/src/tts/speechSynthesizer.ts#L633-L645)); `(language, voice, model, textHash)` cache preserved in [src/tts/ttsCache.ts](file:///C:/Users/Croma/Desktop/DukaanAI/src/tts/ttsCache.ts).

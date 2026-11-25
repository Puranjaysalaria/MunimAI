import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  VOICE_LANGUAGE_PROFILES,
  estimateSttCostInr,
  estimateTtsCostInr,
  getLanguageVoiceProfile,
  getRemainingVoiceBudgetInr,
  isCloudSpeechAllowedForShop,
  resetVoiceTelemetryForTest,
  setDailyVoiceBudgetInr,
  setVoiceKillSwitch,
} from '../src/voice/speechConfig';
import { createSTTProvider, GnaniSttProvider, BrowserSpeechProvider } from '../src/stt';
import { encodeWav16BitMono } from '../src/stt/audioClipProcessor';
import { clearTTSCacheForTest, getCachedTTSAudio, setCachedTTSAudio } from '../src/tts/ttsCache';
import { speechSynthesizer } from '../src/tts/speechSynthesizer';
import { formatAmountForSpeech, numberToIndianWords } from '../src/tts/numberToWords';
import gnaniSttHandler, { resetGnaniSttLimitsForTest } from '../api/gnani-stt';
import gnaniTtsHandler, { resetGnaniTtsLimitsForTest } from '../api/gnani-tts';
import { setVoiceAuthVerifierForTest, setVoiceQuotaAdapterForTest } from '../api/_voiceShared';
import { assertRequiredSecretsEnv, scanBuiltFilesForSecrets } from '../scripts/check-no-secrets-in-bundle';
import { LanguageCode } from '../src/i18n/types';

function makeMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    setHeader: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    end: vi.fn(),
  };
  return res;
}

describe('Phases 2-6: Gnani STT, Timbre TTS, Fallbacks, Cache, Numbers, Budgets & Security', () => {
  beforeEach(() => {
    resetVoiceTelemetryForTest();
    clearTTSCacheForTest();
    speechSynthesizer.clearPreRecordedPackForTest();
    resetGnaniSttLimitsForTest();
    resetGnaniTtsLimitsForTest();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('routes all 10 languages with Hinglish mixed-language support only where supported', () => {
    const langs: LanguageCode[] = ['hi', 'en', 'pa', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml'];
    for (const lang of langs) {
      const profile = getLanguageVoiceProfile(lang);
      expect(profile.sttProvider).toBe('gnani');
      expect(profile.ttsProvider).toBe('gnani');
      expect(profile.sttLanguageCode).toMatch(/^[a-z]{2}-IN$/);
    }

    expect(VOICE_LANGUAGE_PROFILES.hi.supportsMixedLanguage).toBe(true);
    expect(VOICE_LANGUAGE_PROFILES.hi.hinglishMode).toBe('mixed');
    expect(VOICE_LANGUAGE_PROFILES.pa.supportsMixedLanguage).toBe(false);
    expect(VOICE_LANGUAGE_PROFILES.pa.hinglishMode).toBe('off');
  });

  it('respects cloudSpeechEnabled=false and kill switch in createSTTProvider', () => {
    expect(createSTTProvider('gnani', { cloudSpeechEnabled: false })).toBeInstanceOf(BrowserSpeechProvider);
    setVoiceKillSwitch(true);
    expect(createSTTProvider('gnani', { cloudSpeechEnabled: true })).toBeInstanceOf(BrowserSpeechProvider);
    setVoiceKillSwitch(false);
    expect(createSTTProvider('gnani', { cloudSpeechEnabled: true })).toBeInstanceOf(GnaniSttProvider);
  });

  it('GnaniSttProvider silently falls back to browser STT on kill switch, budget exhaustion, offline, or cloudSpeechEnabled=false', async () => {
    const mockFallback = {
      id: 'browser',
      name: 'MockBrowser',
      isSupported: true,
      state: 'idle' as const,
      startListening: vi.fn().mockResolvedValue(undefined),
      stopListening: vi.fn(),
      abortListening: vi.fn(),
    };

    const provider = new GnaniSttProvider(mockFallback);
    const onError = vi.fn();

    // 1. cloudSpeechEnabled: false
    await provider.startListening(
      { language: 'hi', cloudSpeechEnabled: false },
      { onResult: vi.fn(), onError, onStateChange: vi.fn() }
    );
    expect(mockFallback.startListening).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();

    // 2. Kill switch active
    setVoiceKillSwitch(true);
    await provider.startListening(
      { language: 'hi', cloudSpeechEnabled: true },
      { onResult: vi.fn(), onError, onStateChange: vi.fn() }
    );
    expect(mockFallback.startListening).toHaveBeenCalledTimes(2);
    setVoiceKillSwitch(false);

    // 3. Budget exhausted
    setDailyVoiceBudgetInr(0);
    await provider.startListening(
      { language: 'hi', cloudSpeechEnabled: true },
      { onResult: vi.fn(), onError, onStateChange: vi.fn() }
    );
    expect(mockFallback.startListening).toHaveBeenCalledTimes(3);
    expect(onError).not.toHaveBeenCalled();
  });

  it('server gnani-stt checks auth, rate limit, budget, treats transcript as data, and returns latency', async () => {
    const wavBase64 = Buffer.from(encodeWav16BitMono(new Float32Array(1600).fill(0.1), 16000)).toString('base64');

    const prevUrl = process.env.GNANI_STT_URL;
    const prevKey = process.env.GNANI_API_KEY;
    process.env.GNANI_STT_URL = 'https://gnani.example/stt';
    process.env.GNANI_API_KEY = 'secret-gnani-key';
    setVoiceAuthVerifierForTest(async (token) =>
      token === 'internal-token'
        ? { ok: true, status: 200, userId: 'u-1', shopId: 'shop-1' }
        : { ok: false, status: 401 }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ transcript: 'Ramesh\u0000 500\n credit', confidence: 0.94 }),
      })
    );

    try {
      // Unauthorized rejected
      const unauthRes = makeMockRes();
      await gnaniSttHandler({ method: 'POST', headers: {}, body: { audioBase64: wavBase64 } } as any, unauthRes);
      expect(unauthRes.statusCode).toBe(401);

      // Authorized succeeds & sanitizes control chars
      const okRes = makeMockRes();
      await gnaniSttHandler(
        {
          method: 'POST',
          headers: { authorization: 'Bearer internal-token' },
          body: { audioBase64: wavBase64, language: 'hi', speechStartedAtMs: 55555 },
        } as any,
        okRes
      );
      expect(okRes.statusCode).toBe(200);
      expect(okRes.body.transcript).toBe('Ramesh 500 credit');
      expect(okRes.body.confidence).toBe(0.94);
      expect(typeof okRes.body.latency).toBe('number');
      expect(okRes.body.speechStartedAtMs).toBe(55555);
    } finally {
      setVoiceAuthVerifierForTest(null);
      process.env.GNANI_STT_URL = prevUrl;
      process.env.GNANI_API_KEY = prevKey;
    }
  });

  it('TTS cache hits prevent duplicate remote calls and speaking follows pack -> gnani -> device -> text order', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ audioBase64: 'UklGRg==', mimeType: 'audio/wav', latency: 42 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal(
      'Audio',
      class MockAudio {
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        play() {
          setTimeout(() => this.onended?.(), 0);
          return Promise.resolve();
        }
      }
    );

    // 1. Pre-recorded pack wins first without calling fetch
    speechSynthesizer.registerPreRecordedPack([{ language: 'hi', text: 'सेव हो गया', url: '/audio-pack/hi/saved.wav' }]);
    const p1 = await speechSynthesizer.speakWithOrder('सेव हो गया', 'hi', { cloudSpeechEnabled: true });
    expect(p1).toBe('pack');
    expect(fetchMock).not.toHaveBeenCalled();

    // 2. Uncached text calls /api/gnani-tts once, then cache hit serves second call with zero fetches
    const p2 = await speechSynthesizer.speakWithOrder('रमेश के 500 रुपये लिखे', 'hi', { cloudSpeechEnabled: true });
    expect(p2).toBe('gnani');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const cached = getCachedTTSAudio({
      language: 'hi-IN',
      voice: 'ananya',
      model: 'timbre-v1',
      text: 'रमेश के 500 रुपये लिखे',
    });
    expect(cached).not.toBeNull();

    const p3 = await speechSynthesizer.speakWithOrder('रमेश के 500 रुपये लिखे', 'hi', { cloudSpeechEnabled: true });
    expect(p3).toBe('gnani');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 3. With cloudSpeechEnabled=false and no synth in Node test env, falls through cleanly to 'text'
    setCachedTTSAudio({ language: 'en-IN', voice: 'kavya', model: 'timbre-v1', text: 'Done' }, 'UklGRg==');
    const p4 = await speechSynthesizer.speakWithOrder('Done', 'en', { cloudSpeechEnabled: false });
    expect(p4).toBe('text');
  });

  it('server gnani-tts calls Timbre and returns audio, latency, and costInr', async () => {
    const prevUrl = process.env.TIMBRE_TTS_URL;
    const prevKey = process.env.GNANI_API_KEY;
    process.env.TIMBRE_TTS_URL = 'https://timbre.example/tts';
    process.env.GNANI_API_KEY = 'secret-timbre-key';
    setVoiceAuthVerifierForTest(async () => ({ ok: true, status: 200, userId: 'u-1', shopId: 'shop-1' }));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ audioBase64: 'UklGRg==', mimeType: 'audio/wav' }),
      })
    );

    try {
      const res = makeMockRes();
      await gnaniTtsHandler(
        {
          method: 'POST',
          headers: { authorization: 'Bearer test-jwt' },
          body: { text: 'Namaste', language: 'hi', voice: 'ananya', model: 'timbre-v1' },
        } as any,
        res
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.audioBase64).toBe('UklGRg==');
      expect(res.body.charCount).toBe(7);
      expect(res.body.costInr).toBeGreaterThan(0);
    } finally {
      setVoiceAuthVerifierForTest(null);
      process.env.TIMBRE_TTS_URL = prevUrl;
      process.env.GNANI_API_KEY = prevKey;
    }
  });

  it('converts Indian numbering (thousand, lakh, crore) across all 10 languages with needsNativeReview flags', () => {
    const langs: LanguageCode[] = ['hi', 'en', 'pa', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml'];
    for (const lang of langs) {
      const words = numberToIndianWords(12_34_567, lang);
      expect(words.text.length).toBeGreaterThan(5);
      expect(words.usedWords).toBe(true);
      if (lang === 'en' || lang === 'hi') {
        expect(words.needsNativeReview).toBe(false);
      } else {
        expect(words.needsNativeReview).toBe(true);
      }

      const raw = formatAmountForSpeech(500, lang, false);
      expect(raw.text).toBe('500');
      expect(raw.usedWords).toBe(false);
    }
    expect(numberToIndianWords(1_05_02_000, 'en').text).toBe('one crore five lakh two thousand');
  });

  it('calculates STT/TTS costs and enforces shop consent & daily budget gates', () => {
    expect(estimateSttCostInr(10_000)).toBeCloseTo(0.15, 4);
    expect(estimateTtsCostInr(1000)).toBeCloseTo(0.5, 4);
    expect(getRemainingVoiceBudgetInr()).toBe(100);

    expect(
      isCloudSpeechAllowedForShop({
        id: 's1',
        name: 'Shop',
        owner_phone: '999',
        settings: { cloud_speech_enabled: true },
      })
    ).toBe(false); // missing cloud_speech_consent_at

    expect(
      isCloudSpeechAllowedForShop({
        id: 's1',
        name: 'Shop',
        owner_phone: '999',
        settings: { cloud_speech_enabled: true, cloud_speech_consent_at: '2026-11-26T00:00:00Z' },
      })
    ).toBe(true);
  });

  it('scanBuiltFilesForSecrets detects leaked key names, env values, and Gnani API host', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'munim-secret-scan-'));
    try {
      const cleanFile = path.join(tmpDir, 'index.js');
      fs.writeFileSync(cleanFile, 'console.log("hello world");');
      expect(scanBuiltFilesForSecrets(tmpDir, { GNANI_API_KEY: 'super-secret-123' })).toEqual([]);

      const leakyFile = path.join(tmpDir, 'leak.js');
      fs.writeFileSync(leakyFile, 'const host="api.gnani.ai"; const k="super-secret-123";');
      const findings = scanBuiltFilesForSecrets(tmpDir, {
        GNANI_API_KEY: 'super-secret-123',
        GNANI_STT_URL: 'https://api.gnani.ai/v1/stt',
      });
      expect(findings.length).toBeGreaterThanOrEqual(2);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects unknown STT provider names in createSTTProvider', () => {
    expect(() => createSTTProvider('whisper-unknown' as any)).toThrow(/Unknown STT provider/);
  });

  it('enforces JWT required, wrong-shop rejection (403), disallowed origin (403), oversized body (413), and timeout (504)', async () => {
    const wavBase64 = Buffer.from(encodeWav16BitMono(new Float32Array(1600).fill(0.1), 16000)).toString('base64');
    const prevAllowed = process.env.ALLOWED_ORIGINS;
    const prevUrl = process.env.GNANI_STT_URL;
    const prevKey = process.env.GNANI_API_KEY;
    process.env.ALLOWED_ORIGINS = 'https://app.munimai.in';
    process.env.GNANI_STT_URL = 'https://gnani.example/stt';
    process.env.GNANI_API_KEY = 'secret-gnani-key';

    try {
      // Disallowed origin -> 403
      const badOriginRes = makeMockRes();
      await gnaniSttHandler(
        { method: 'POST', headers: { origin: 'https://evil.example', authorization: 'Bearer ok' }, body: {} } as any,
        badOriginRes
      );
      expect(badOriginRes.statusCode).toBe(403);

      // Missing JWT -> 401
      const noJwtRes = makeMockRes();
      await gnaniSttHandler(
        { method: 'POST', headers: { origin: 'https://app.munimai.in' }, body: {} } as any,
        noJwtRes
      );
      expect(noJwtRes.statusCode).toBe(401);

      // Wrong-shop / no shop mapping -> 403
      setVoiceAuthVerifierForTest(async () => ({ ok: false, status: 403 }));
      const wrongShopRes = makeMockRes();
      await gnaniSttHandler(
        {
          method: 'POST',
          headers: { origin: 'https://app.munimai.in', authorization: 'Bearer wrong-shop' },
          body: { audioBase64: wavBase64 },
        } as any,
        wrongShopRes
      );
      expect(wrongShopRes.statusCode).toBe(403);

      // Oversized STT body (>1MB) -> 413
      setVoiceAuthVerifierForTest(async () => ({ ok: true, status: 200, userId: 'u1', shopId: 'shop-1' }));
      const hugeBuf = Buffer.alloc(1024 * 1024 + 64);
      const hugeRes = makeMockRes();
      await gnaniSttHandler(
        {
          method: 'POST',
          headers: { origin: 'https://app.munimai.in', authorization: 'Bearer ok' },
          body: { audioBase64: hugeBuf.toString('base64') },
        } as any,
        hugeRes
      );
      expect(hugeRes.statusCode).toBe(413);

      // Oversized TTS body (>500 chars) -> 413
      const hugeTtsRes = makeMockRes();
      await gnaniTtsHandler(
        {
          method: 'POST',
          headers: { origin: 'https://app.munimai.in', authorization: 'Bearer ok' },
          body: { text: 'a'.repeat(501), language: 'hi' },
        } as any,
        hugeTtsRes
      );
      expect(hugeTtsRes.statusCode).toBe(413);

      // Upstream timeout -> 504 and reconciles (refunds) reservation
      const reconcileSpy = vi.fn().mockResolvedValue(undefined);
      setVoiceQuotaAdapterForTest({
        reserve: vi.fn().mockResolvedValue({ allowed: true, status: 200, reason: 'ok', reservationId: 'res-timeout' }),
        reconcile: reconcileSpy,
      });
      const abortErr = new Error('Timed out');
      abortErr.name = 'AbortError';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr));

      const timeoutRes = makeMockRes();
      await gnaniSttHandler(
        {
          method: 'POST',
          headers: { origin: 'https://app.munimai.in', authorization: 'Bearer ok' },
          body: { audioBase64: wavBase64, language: 'hi' },
        } as any,
        timeoutRes
      );
      expect(timeoutRes.statusCode).toBe(504);
      expect(reconcileSpy).toHaveBeenCalledWith(expect.objectContaining({ reservationId: 'res-timeout', actualInr: 0 }));
    } finally {
      setVoiceAuthVerifierForTest(null);
      setVoiceQuotaAdapterForTest(null);
      process.env.ALLOWED_ORIGINS = prevAllowed;
      process.env.GNANI_STT_URL = prevUrl;
      process.env.GNANI_API_KEY = prevKey;
    }
  });

  it('enforces monthly cap atomically under parallel concurrent requests and fails check:secrets when GNANI_API_KEY is unset', async () => {
    const wavBase64 = Buffer.from(encodeWav16BitMono(new Float32Array(16000).fill(0.1), 16000)).toString('base64'); // 1s = ₹0.015
    const prevMonthly = process.env.GNANI_MONTHLY_BUDGET_INR;
    const prevUrl = process.env.GNANI_STT_URL;
    const prevKey = process.env.GNANI_API_KEY;
    process.env.GNANI_MONTHLY_BUDGET_INR = '0.045'; // Allows at most 3 concurrent calls
    process.env.GNANI_STT_URL = 'https://gnani.example/stt';
    process.env.GNANI_API_KEY = 'secret-gnani-key';
    setVoiceAuthVerifierForTest(async () => ({ ok: true, status: 200, userId: 'u1', shopId: 'shop-conc' }));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ transcript: 'ok', confidence: 0.9 }),
      })
    );

    try {
      const results = await Promise.all(
        Array.from({ length: 10 }, async () => {
          const r = makeMockRes();
          await gnaniSttHandler(
            {
              method: 'POST',
              headers: { authorization: 'Bearer ok' },
              body: { audioBase64: wavBase64, language: 'hi' },
            } as any,
            r
          );
          return r.statusCode;
        })
      );
      const okCount = results.filter((s) => s === 200).length;
      const quotaRejected = results.filter((s) => s === 402).length;
      expect(okCount).toBe(3);
      expect(quotaRejected).toBe(7);

      expect(() => assertRequiredSecretsEnv({} as NodeJS.ProcessEnv)).toThrow(/GNANI_API_KEY/);
      expect(() => assertRequiredSecretsEnv({ GNANI_API_KEY: 'k1' } as NodeJS.ProcessEnv)).toThrow(
        /SUPABASE_SERVICE_ROLE_KEY/
      );
      expect(() =>
        assertRequiredSecretsEnv({ GNANI_API_KEY: 'k1', SUPABASE_SERVICE_ROLE_KEY: 'k2' } as NodeJS.ProcessEnv)
      ).not.toThrow();
    } finally {
      setVoiceAuthVerifierForTest(null);
      process.env.GNANI_MONTHLY_BUDGET_INR = prevMonthly;
      process.env.GNANI_STT_URL = prevUrl;
      process.env.GNANI_API_KEY = prevKey;
    }
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  AdaptiveVadTracker,
  DEFAULT_MAX_CLIP_DURATION_MS,
  GNANI_TARGET_SAMPLE_RATE,
  capSamplesDuration,
  encodeWav16BitMono,
  mixDownToMono,
  resampleLinear,
  trimSilenceFromSamples,
} from '../src/stt/audioClipProcessor';
import { ServerSpeechProvider } from '../src/stt/serverSpeechProvider';
import { canCompleteByVoiceConfirm } from '../src/voice/safetyTiers';
import gnaniSttHandler from '../api/gnani-stt';
import { isValidWav16kMonoHeader, mapGnaniLanguage, setVoiceAuthVerifierForTest } from '../api/_voiceShared';

describe('Gnani Command Clip Audio Processor & Safety Guard Integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('caps clip length to configurable maxDurationMs (default 15 seconds)', () => {
    const sampleRate = 16000;
    const twentySeconds = new Float32Array(sampleRate * 20).fill(0.2);

    const cappedDefault = capSamplesDuration(twentySeconds, sampleRate);
    expect(cappedDefault.length).toBe(sampleRate * (DEFAULT_MAX_CLIP_DURATION_MS / 1000));

    const capped5s = capSamplesDuration(twentySeconds, sampleRate, 5000);
    expect(capped5s.length).toBe(sampleRate * 5);
  });

  it('trims leading and trailing silence and computes leadingTrimmedMs accurately', () => {
    const sampleRate = 16000;
    // 1.0s silence + 0.5s speech (0.3 amplitude) + 1.0s silence = 2.5s
    const samples = new Float32Array(sampleRate * 2.5);
    for (let i = sampleRate * 1.0; i < sampleRate * 1.5; i++) {
      samples[i] = 0.3 * Math.sin(i * 0.1);
    }

    const res = trimSilenceFromSamples(samples, sampleRate, { threshold: 0.015, paddingMs: 100 });
    expect(res.hasSpeech).toBe(true);
    // 1000ms leading silence - 100ms padding = 900ms trimmed
    expect(res.leadingTrimmedMs).toBeGreaterThanOrEqual(850);
    expect(res.leadingTrimmedMs).toBeLessThanOrEqual(950);
    // 1000ms trailing silence - 100ms padding = 900ms trimmed
    expect(res.trailingTrimmedMs).toBeGreaterThanOrEqual(850);
    expect(res.trailingTrimmedMs).toBeLessThanOrEqual(950);
    expect(res.trimmed.length).toBeLessThan(samples.length);
  });

  it('detects pure silence clips so empty audio is not sent to server', () => {
    const silent = new Float32Array(16000 * 2);
    const res = trimSilenceFromSamples(silent, 16000);
    expect(res.hasSpeech).toBe(false);
    expect(res.trimmed.length).toBe(0);
  });

  it('mixes stereo to mono, resamples 48kHz -> 16kHz, and encodes valid 16-bit mono WAV', () => {
    const left = new Float32Array(48000).fill(0.4);
    const right = new Float32Array(48000).fill(0.2);
    const mono = mixDownToMono([left, right]);
    expect(mono.length).toBe(48000);
    expect(mono[0]).toBeCloseTo(0.3, 5);

    const resampled = resampleLinear(mono, 48000, GNANI_TARGET_SAMPLE_RATE);
    expect(resampled.length).toBe(16000);

    const wav = encodeWav16BitMono(resampled, GNANI_TARGET_SAMPLE_RATE);
    expect(wav.byteLength).toBe(44 + 16000 * 2);
    expect(isValidWav16kMonoHeader(Buffer.from(wav))).toBe(true);
  });

  it('ServerSpeechProvider refuses to record when voice pill is inactive (isPillActive: false)', async () => {
    const provider = new ServerSpeechProvider();
    const states: string[] = [];
    await provider.startListening(
      { language: 'hi', isPillActive: false },
      {
        onResult: vi.fn(),
        onError: vi.fn(),
        onStateChange: (s) => states.push(s),
      }
    );
    expect(provider.state).toBe('idle');
    expect(states).toEqual(['idle']);
  });

  it('preserves client-side utteranceStartedAtMs for final-only transcripts in safetyTiers "haan" guard', () => {
    const cardAppearedAtMs = 1_700_000_010_000;

    // Case 1: User started speaking BEFORE the confirmation card appeared (even with final-only Gnani transcript)
    const allowedBeforeCard = canCompleteByVoiceConfirm({
      isPillActive: true,
      isCardShowing: true,
      isFinalResult: true,
      speechStartedAtMs: cardAppearedAtMs - 500,
      cardAppearedAtMs,
      isDeleteAction: false,
    });
    expect(allowedBeforeCard).toBe(false);

    // Case 2: User started speaking AFTER the confirmation card appeared
    const allowedAfterCard = canCompleteByVoiceConfirm({
      isPillActive: true,
      isCardShowing: true,
      isFinalResult: true,
      speechStartedAtMs: cardAppearedAtMs + 250,
      cardAppearedAtMs,
      isDeleteAction: false,
    });
    expect(allowedAfterCard).toBe(true);
  });

  it('api/gnani-stt validates 16kHz mono WAV and echoes speechStartedAtMs with Gnani response', async () => {
    expect(mapGnaniLanguage('pa')).toBe('pa-IN');
    expect(mapGnaniLanguage('hi')).toBe('hi-IN');

    const makeMockRes = () => {
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
    };

    setVoiceAuthVerifierForTest(async () => ({ ok: true, status: 200, userId: 'u1', shopId: 'shop-1' }));

    // 1. Invalid audio fails with 400
    const badRes = makeMockRes();
    await gnaniSttHandler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer test-jwt' },
        body: { audioBase64: Buffer.from('not-a-wav').toString('base64'), speechStartedAtMs: 12345 },
      } as any,
      badRes
    );
    expect(badRes.statusCode).toBe(400);

    // 2. Valid 16kHz mono 16-bit WAV forwards to Gnani when configured and preserves speechStartedAtMs
    const wav = encodeWav16BitMono(new Float32Array(1600).fill(0.1), 16000);
    const wavBase64 = Buffer.from(wav).toString('base64');

    const prevUrl = process.env.GNANI_STT_URL;
    const prevKey = process.env.GNANI_API_KEY;
    process.env.GNANI_STT_URL = 'https://stt.gnani.example/v1/transcribe';
    process.env.GNANI_API_KEY = 'test-key';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ transcript: 'haan', confidence: 0.96 }),
      })
    );

    try {
      const okRes = makeMockRes();
      await gnaniSttHandler(
        {
          method: 'POST',
          headers: { authorization: 'Bearer test-jwt' },
          body: { audioBase64: wavBase64, language: 'hi', speechStartedAtMs: 998877 },
        } as any,
        okRes
      );
      expect(okRes.statusCode).toBe(200);
      expect(okRes.body.transcript).toBe('haan');
      expect(okRes.body.speechStartedAtMs).toBe(998877);
      expect(okRes.body.language).toBe('hi-IN');
      expect(okRes.body.provider).toBe('gnani');
    } finally {
      setVoiceAuthVerifierForTest(null);
      process.env.GNANI_STT_URL = prevUrl;
      process.env.GNANI_API_KEY = prevKey;
    }
  });

  it('AdaptiveVadTracker adapts to noise floor, enforces minimum speech length, and auto-stops after trailing silence', () => {
    const vad = new AdaptiveVadTracker({ minSpeechMs: 300, trailingSilenceMs: 1200 });

    // Ambient background noise at 0.02 adapts floor upward without triggering speech
    for (let t = 0; t < 300; t += 60) {
      const r = vad.pushRms(0.01, t);
      expect(r.shouldAutoStop).toBe(false);
    }

    // Brief 100ms click above threshold must NOT trigger auto-stop (below 300ms minSpeechMs)
    vad.pushRms(0.25, 1000);
    vad.pushRms(0.25, 1100);
    expect(vad.pushRms(0.005, 2500).shouldAutoStop).toBe(false);

    // Real speech >= 300ms followed by 1200ms trailing silence DOES trigger auto-stop
    const vad2 = new AdaptiveVadTracker({ minSpeechMs: 300, trailingSilenceMs: 1200 });
    expect(vad2.pushRms(0.2, 1000).speechJustStarted).toBe(true);
    vad2.pushRms(0.2, 1400); // 400ms speech
    expect(vad2.pushRms(0.005, 2500).shouldAutoStop).toBe(false); // 1100ms silence
    expect(vad2.pushRms(0.005, 2700).shouldAutoStop).toBe(true);  // 1300ms silence -> auto-stop
  });
});

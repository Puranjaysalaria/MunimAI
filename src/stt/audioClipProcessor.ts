/**
 * Client-side Web Audio processing for short voice-command clips:
 * - Capping clip duration (configurable, default 15s)
 * - Trimming leading & trailing silence
 * - Converting to Gnani-compatible 16 kHz mono 16-bit PCM WAV
 * - Computing client-side utteranceStartedAtMs for the "haan" safety guard
 */

export const DEFAULT_MAX_CLIP_DURATION_MS = 15_000;
export const GNANI_TARGET_SAMPLE_RATE = 16_000;
export const DEFAULT_SILENCE_THRESHOLD = 0.015;
export const DEFAULT_SILENCE_PADDING_MS = 100;

export interface TrimSilenceResult {
  trimmed: Float32Array;
  startSample: number;
  endSample: number;
  leadingTrimmedMs: number;
  trailingTrimmedMs: number;
  hasSpeech: boolean;
}

export interface ProcessedCommandClip {
  wavBlob: Blob;
  wavBase64: string;
  sampleRate: number;
  durationMs: number;
  leadingTrimmedMs: number;
  trailingTrimmedMs: number;
  utteranceStartedAtMs: number;
  hasSpeech: boolean;
}

/**
 * Averages multi-channel audio buffers into a single mono Float32Array.
 */
export function mixDownToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];

  const length = channels[0].length;
  const mono = new Float32Array(length);
  const numChannels = channels.length;

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      sum += channels[ch][i] || 0;
    }
    mono[i] = sum / numChannels;
  }

  return mono;
}

/**
 * Deterministic linear-interpolation resampler (used directly in tests and as a
 * fallback when OfflineAudioContext is unavailable).
 */
export function resampleLinear(
  samples: Float32Array,
  fromRate: number,
  toRate: number = GNANI_TARGET_SAMPLE_RATE
): Float32Array {
  if (samples.length === 0 || fromRate === toRate) {
    return samples;
  }
  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio;
    const idx0 = Math.floor(srcPos);
    const idx1 = Math.min(samples.length - 1, idx0 + 1);
    const frac = srcPos - idx0;
    out[i] = samples[idx0] * (1 - frac) + samples[idx1] * frac;
  }
  return out;
}

/**
 * Caps a PCM sample array to at most `maxDurationMs` (default 15,000 ms).
 */
export function capSamplesDuration(
  samples: Float32Array,
  sampleRate: number,
  maxDurationMs: number = DEFAULT_MAX_CLIP_DURATION_MS
): Float32Array {
  if (maxDurationMs <= 0 || sampleRate <= 0) return new Float32Array(0);
  const maxSamples = Math.floor((maxDurationMs / 1000) * sampleRate);
  if (samples.length <= maxSamples) return samples;
  return samples.slice(0, maxSamples);
}

/**
 * Trims leading and trailing silence using 10ms RMS windows while preserving a small
 * `paddingMs` margin so word onsets and tails are not clipped.
 */
export function trimSilenceFromSamples(
  samples: Float32Array,
  sampleRate: number,
  options?: { threshold?: number; paddingMs?: number }
): TrimSilenceResult {
  const threshold = options?.threshold ?? DEFAULT_SILENCE_THRESHOLD;
  const paddingMs = options?.paddingMs ?? DEFAULT_SILENCE_PADDING_MS;

  if (samples.length === 0 || sampleRate <= 0) {
    return {
      trimmed: new Float32Array(0),
      startSample: 0,
      endSample: 0,
      leadingTrimmedMs: 0,
      trailingTrimmedMs: 0,
      hasSpeech: false,
    };
  }

  const windowSize = Math.max(1, Math.floor(sampleRate * 0.01)); // 10ms frames
  let firstActiveSample = -1;
  let lastActiveSample = -1;

  for (let start = 0; start < samples.length; start += windowSize) {
    const end = Math.min(samples.length, start + windowSize);
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      const s = samples[i];
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / (end - start));
    if (rms >= threshold) {
      if (firstActiveSample === -1) {
        firstActiveSample = start;
      }
      lastActiveSample = end;
    }
  }

  if (firstActiveSample === -1) {
    return {
      trimmed: new Float32Array(0),
      startSample: samples.length,
      endSample: samples.length,
      leadingTrimmedMs: Math.round((samples.length / sampleRate) * 1000),
      trailingTrimmedMs: 0,
      hasSpeech: false,
    };
  }

  const paddingSamples = Math.floor((paddingMs / 1000) * sampleRate);
  const startSample = Math.max(0, firstActiveSample - paddingSamples);
  const endSample = Math.min(samples.length, lastActiveSample + paddingSamples);

  return {
    trimmed: samples.slice(startSample, endSample),
    startSample,
    endSample,
    leadingTrimmedMs: Math.round((startSample / sampleRate) * 1000),
    trailingTrimmedMs: Math.round(((samples.length - endSample) / sampleRate) * 1000),
    hasSpeech: true,
  };
}

/**
 * Encodes mono Float32Array PCM samples into a 16-bit little-endian RIFF/WAVE ArrayBuffer.
 */
export function encodeWav16BitMono(
  samples: Float32Array,
  sampleRate: number = GNANI_TARGET_SAMPLE_RATE
): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // PCM audio format = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return buffer;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Resamples mono samples to targetRate using Web Audio OfflineAudioContext when available,
 * falling back to linear resampling in non-browser/test environments.
 */
async function resampleToTargetRate(
  monoSamples: Float32Array,
  fromRate: number,
  targetRate: number
): Promise<Float32Array> {
  if (fromRate === targetRate || monoSamples.length === 0) {
    return monoSamples;
  }

  if (typeof OfflineAudioContext !== 'undefined') {
    try {
      const targetLength = Math.max(1, Math.ceil((monoSamples.length * targetRate) / fromRate));
      const offline = new OfflineAudioContext(1, targetLength, targetRate);
      const srcBuffer = offline.createBuffer(1, monoSamples.length, fromRate);
      srcBuffer.copyToChannel(new Float32Array(monoSamples), 0);
      const source = offline.createBufferSource();
      source.buffer = srcBuffer;
      source.connect(offline.destination);
      source.start(0);
      const rendered = await offline.startRendering();
      return rendered.getChannelData(0);
    } catch {
      return resampleLinear(monoSamples, fromRate, targetRate);
    }
  }

  return resampleLinear(monoSamples, fromRate, targetRate);
}

/**
 * Processes a raw recorded command clip Blob using Web Audio API:
 * 1. Decodes audio
 * 2. Mixes down to mono
 * 3. Resamples to 16 kHz (Gnani format)
 * 4. Caps duration to `maxDurationMs` (default 15,000 ms)
 * 5. Trims leading and trailing silence
 * 6. Encodes 16-bit PCM WAV & computes `utteranceStartedAtMs`
 */
export async function processCommandAudioBlob(
  blob: Blob,
  options?: {
    maxDurationMs?: number;
    targetSampleRate?: number;
    silenceThreshold?: number;
    recordingStartedAtMs?: number;
  }
): Promise<ProcessedCommandClip> {
  const maxDurationMs = options?.maxDurationMs ?? DEFAULT_MAX_CLIP_DURATION_MS;
  const targetSampleRate = options?.targetSampleRate ?? GNANI_TARGET_SAMPLE_RATE;
  const recordingStartedAtMs = options?.recordingStartedAtMs ?? Date.now();

  const AudioCtx =
    typeof window !== 'undefined'
      ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;

  if (!AudioCtx) {
    throw new Error('Web Audio API AudioContext is not available in this environment.');
  }

  const audioCtx = new AudioCtx();
  try {
    const rawArrayBuffer = await blob.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(rawArrayBuffer);
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      channels.push(decoded.getChannelData(ch));
    }

    const mono = mixDownToMono(channels);
    const resampled = await resampleToTargetRate(mono, decoded.sampleRate, targetSampleRate);
    const capped = capSamplesDuration(resampled, targetSampleRate, maxDurationMs);
    const trimmedResult = trimSilenceFromSamples(capped, targetSampleRate, {
      threshold: options?.silenceThreshold,
    });

    const utteranceStartedAtMs = recordingStartedAtMs + trimmedResult.leadingTrimmedMs;
    const wavBuffer = encodeWav16BitMono(trimmedResult.trimmed, targetSampleRate);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    const wavBase64 = arrayBufferToBase64(wavBuffer);

    return {
      wavBlob,
      wavBase64,
      sampleRate: targetSampleRate,
      durationMs: Math.round((trimmedResult.trimmed.length / targetSampleRate) * 1000),
      leadingTrimmedMs: trimmedResult.leadingTrimmedMs,
      trailingTrimmedMs: trimmedResult.trailingTrimmedMs,
      utteranceStartedAtMs,
      hasSpeech: trimmedResult.hasSpeech,
    };
  } finally {
    await audioCtx.close().catch(() => {});
  }
}

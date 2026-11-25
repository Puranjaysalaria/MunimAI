/**
 * End-to-End Real-Audio STT + NLU Accuracy Evaluation Harness
 * Usage:
 *   1. Place independently authored audio clips + manifest.json in tests/audio_fixtures/
 *   2. Set SERVER_STT_ENDPOINT and API credentials in environment
 *   3. Run: npx tsx scripts/eval-audio-e2e.ts
 */
import fs from 'fs';
import path from 'path';
import { routeVoiceIntent } from '../src/voice/intentRouter';
import { INITIAL_CUSTOMERS, INITIAL_ITEMS } from '../src/data/mockData';
import { LanguageCode } from '../src/i18n/types';

export interface AudioEvalSample {
  audioFile: string;
  language: LanguageCode;
  referenceTranscript: string;
  expectedIntent: string;
  expectedSlots?: {
    amount?: number;
    customer?: string;
    item?: string;
    quantity?: number;
    unit?: string;
  };
  authorId: string; // ensures independent authoring from regex/parser authors
}

function wordErrorRate(ref: string, hyp: string): number {
  const r = ref.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const h = hyp.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (r.length === 0) return h.length === 0 ? 0 : 1;
  const dp: number[][] = Array.from({ length: r.length + 1 }, () => Array(h.length + 1).fill(0));
  for (let i = 0; i <= r.length; i++) dp[i][0] = i;
  for (let j = 0; j <= h.length; j++) dp[0][j] = j;
  for (let i = 1; i <= r.length; i++) {
    for (let j = 1; j <= h.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[r.length][h.length] / r.length;
}

async function transcribeWithServerSTT(audioPath: string, language: LanguageCode): Promise<string> {
  const endpoint = process.env.SERVER_STT_ENDPOINT;
  if (!endpoint) {
    throw new Error('SERVER_STT_ENDPOINT is not configured. Cannot run live audio STT evaluation.');
  }
  const audioBuffer = fs.readFileSync(audioPath);
  const form = new FormData();
  form.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), path.basename(audioPath));
  form.append('language', language);
  const res = await fetch(endpoint, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`STT HTTP ${res.status}`);
  const data = (await res.json()) as { transcript?: string };
  return data.transcript || '';
}

async function main() {
  const manifestPath = path.join(process.cwd(), 'tests', 'audio_fixtures', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('No audio fixture manifest found at tests/audio_fixtures/manifest.json. Exiting cleanly.');
    return;
  }

  const samples: AudioEvalSample[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const byLang = new Map<LanguageCode, { total: number; intentOk: number; slotOk: number; werSum: number }>();

  for (const sample of samples) {
    const audioPath = path.join(process.cwd(), 'tests', 'audio_fixtures', sample.audioFile);
    const transcript = await transcribeWithServerSTT(audioPath, sample.language);
    const wer = wordErrorRate(sample.referenceTranscript, transcript);

    const parsed = await routeVoiceIntent(transcript, {
      language: sample.language,
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
    });

    const stats = byLang.get(sample.language) || { total: 0, intentOk: 0, slotOk: 0, werSum: 0 };
    stats.total++;
    stats.werSum += wer;
    if (parsed.intent === sample.expectedIntent) stats.intentOk++;

    const slots = sample.expectedSlots || {};
    const slotMatch =
      (slots.amount === undefined || parsed.amount === slots.amount) &&
      (slots.customer === undefined || parsed.customer?.toLowerCase().includes(slots.customer.toLowerCase())) &&
      (slots.item === undefined || parsed.item?.toLowerCase() === slots.item.toLowerCase()) &&
      (slots.quantity === undefined || parsed.quantity === slots.quantity);
    if (slotMatch) stats.slotOk++;

    byLang.set(sample.language, stats);
  }

  for (const [lang, s] of byLang.entries()) {
    console.log(
      `${lang}: samples=${s.total} WER=${((s.werSum / s.total) * 100).toFixed(1)}% intentAcc=${((s.intentOk / s.total) * 100).toFixed(1)}% slotAcc=${((s.slotOk / s.total) * 100).toFixed(1)}%`
    );
  }
}

main();

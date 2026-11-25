/**
 * Phase 6: STT Evaluation Script (runs real WAV clips from tests/audio-eval/<lang>/*.wav).
 * Requires --confirm; prints estimated cost first.
 * Reports per-language WER, intent accuracy, name accuracy, amount accuracy, and latency,
 * plus a separate Hinglish table.
 */

import fs from 'node:fs';
import path from 'node:path';
import { estimateSttCostInr, getLanguageVoiceProfile } from '../src/voice/speechConfig';
import { parseSpeech } from '../src/parser';
import { INITIAL_CUSTOMERS, INITIAL_ITEMS } from '../src/data/mockData';
import { LanguageCode } from '../src/i18n/types';

function wordErrorRate(ref: string, hyp: string): number {
  const r = ref.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const h = hyp.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (r.length === 0) return h.length === 0 ? 0 : 1;

  const dp = Array.from({ length: r.length + 1 }, () => new Array(h.length + 1).fill(0));
  for (let i = 0; i <= r.length; i++) dp[i][0] = i;
  for (let j = 0; j <= h.length; j++) dp[0][j] = j;
  for (let i = 1; i <= r.length; i++) {
    for (let j = 1; j <= h.length; j++) {
      const cost = r[i - 1] === h[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[r.length][h.length] / r.length;
}

async function main() {
  const confirm = process.argv.includes('--confirm');
  const root = path.resolve(process.cwd(), 'tests', 'audio-eval');
  if (!fs.existsSync(root)) {
    console.log(`No evaluation folder found at ${root}. Create tests/audio-eval/<lang>/*.wav + .txt first.`);
    return;
  }

  const langs = fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory());
  const clips: Array<{ lang: string; wavPath: string; refText: string; durationMs: number }> = [];

  for (const lang of langs) {
    const dir = path.join(root, lang);
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.wav'))) {
      const wavPath = path.join(dir, file);
      const txtPath = wavPath.replace(/\.wav$/i, '.txt');
      if (!fs.existsSync(txtPath)) continue;
      const wavBuf = fs.readFileSync(wavPath);
      const durationMs = Math.max(500, Math.round(((wavBuf.length - 44) / 32000) * 1000));
      clips.push({ lang, wavPath, refText: fs.readFileSync(txtPath, 'utf8').trim(), durationMs });
    }
  }

  const totalCost = clips.reduce((acc, c) => acc + estimateSttCostInr(c.durationMs), 0);
  console.log(`STT Eval: ${clips.length} clips across [${langs.join(', ')}], estimated cost: ₹${totalCost.toFixed(4)}`);

  if (!confirm) {
    console.log('Aborted: pass --confirm to call Gnani STT.');
    return;
  }

  const sttUrl = process.env.GNANI_STT_URL || '';
  const apiKey = process.env.GNANI_API_KEY || '';
  if (!sttUrl || !apiKey) {
    console.error('Missing GNANI_STT_URL or GNANI_API_KEY.');
    process.exit(1);
  }

  const stats: Record<
    string,
    { n: number; werSum: number; intentOk: number; nameOk: number; amtOk: number; latencySum: number }
  > = {};

  for (const clip of clips) {
    const profile = getLanguageVoiceProfile(clip.lang === 'hinglish' ? 'hi' : (clip.lang as LanguageCode));
    const wavBuf = fs.readFileSync(clip.wavPath);
    const form = new FormData();
    form.append('audio', new Blob([new Uint8Array(wavBuf)], { type: 'audio/wav' }), path.basename(clip.wavPath));
    form.append('lang', profile.sttLanguageCode);
    form.append('model', profile.sttModel);
    if (clip.lang === 'hinglish' && profile.supportsMixedLanguage) {
      form.append('mixed_language', 'mixed');
    }

    const t0 = Date.now();
    const res = await fetch(sttUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'x-api-key': apiKey },
      body: form,
    });
    const latency = Date.now() - t0;
    const data = (await res.json()) as { transcript?: string; text?: string };
    const hyp = (data.transcript ?? data.text ?? '').trim();

    const refParsed = await parseSpeech(clip.refText, {
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
      language: clip.lang === 'hinglish' ? 'hi' : clip.lang,
    });
    const hypParsed = await parseSpeech(hyp, {
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
      language: clip.lang === 'hinglish' ? 'hi' : clip.lang,
    });

    const bucket = (stats[clip.lang] ||= { n: 0, werSum: 0, intentOk: 0, nameOk: 0, amtOk: 0, latencySum: 0 });
    bucket.n += 1;
    bucket.werSum += wordErrorRate(clip.refText, hyp);
    if (refParsed.intent === hypParsed.intent) bucket.intentOk += 1;
    if ((refParsed.customer || '') === (hypParsed.customer || '')) bucket.nameOk += 1;
    if ((refParsed.amount || 0) === (hypParsed.amount || 0)) bucket.amtOk += 1;
    bucket.latencySum += latency;
  }

  const standardRows = Object.entries(stats)
    .filter(([k]) => k !== 'hinglish')
    .map(([lang, s]) => ({
      lang,
      clips: s.n,
      werPct: ((s.werSum / s.n) * 100).toFixed(1),
      intentAccPct: ((s.intentOk / s.n) * 100).toFixed(1),
      nameAccPct: ((s.nameOk / s.n) * 100).toFixed(1),
      amountAccPct: ((s.amtOk / s.n) * 100).toFixed(1),
      avgLatencyMs: Math.round(s.latencySum / s.n),
    }));
  console.log('\nPer-Language STT Accuracy:');
  console.table(standardRows);

  if (stats.hinglish) {
    const s = stats.hinglish;
    console.log('\nHinglish Mixed-Mode STT Accuracy:');
    console.table([
      {
        lang: 'hinglish',
        clips: s.n,
        werPct: ((s.werSum / s.n) * 100).toFixed(1),
        intentAccPct: ((s.intentOk / s.n) * 100).toFixed(1),
        nameAccPct: ((s.nameOk / s.n) * 100).toFixed(1),
        amountAccPct: ((s.amtOk / s.n) * 100).toFixed(1),
        avgLatencyMs: Math.round(s.latencySum / s.n),
      },
    ]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

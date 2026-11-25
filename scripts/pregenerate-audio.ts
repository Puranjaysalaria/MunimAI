/**
 * Phase 3: Pre-generate static spoken-reply audio files from i18n keys using Timbre/Gnani TTS.
 *
 * Usage:
 *   npx tsx scripts/pregenerate-audio.ts --dry-run
 *   npx tsx scripts/pregenerate-audio.ts --lang hi --max-chars 500 --confirm
 */

import fs from 'node:fs';
import path from 'node:path';
import { estimateTtsCostInr, getLanguageVoiceProfile } from '../src/voice/speechConfig';
import { hashTTSText } from '../src/tts/ttsCache';
import { en } from '../src/i18n/en';
import { hi } from '../src/i18n/hi';
import { pa } from '../src/i18n/pa';
import { gu } from '../src/i18n/gu';
import { mr } from '../src/i18n/mr';
import { bn } from '../src/i18n/bn';
import { ta } from '../src/i18n/ta';
import { te } from '../src/i18n/te';
import { kn } from '../src/i18n/kn';
import { ml } from '../src/i18n/ml';
import { LanguageCode, Translations } from '../src/i18n/types';

const LOCALES: Record<LanguageCode, Translations> = {
  en,
  hi,
  pa,
  gu,
  mr,
  bn,
  ta,
  te,
  kn,
  ml,
};

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run');
  const confirm = argv.includes('--confirm');
  const langIdx = argv.indexOf('--lang');
  const lang = langIdx >= 0 ? (argv[langIdx + 1] as LanguageCode) : undefined;
  const maxIdx = argv.indexOf('--max-chars');
  const maxChars = maxIdx >= 0 ? Number(argv[maxIdx + 1]) : Infinity;
  return { dryRun, confirm, lang, maxChars: Number.isFinite(maxChars) ? maxChars : Infinity };
}

function extractFixedSpokenKeys(t: Translations): Array<{ key: string; text: string }> {
  const candidates: Array<{ key: string; text: string }> = [
    { key: 'voice.listening', text: t.voice.listening },
    { key: 'voice.thinking', text: t.voice.thinking },
    { key: 'voice.noiseError', text: t.voice.noiseError },
    { key: 'voice.confirmSaved', text: t.voice.confirmSaved },
    { key: 'voice.cancelled', text: t.voice.cancelled },
    { key: 'voice.undoSuccess', text: t.voice.undoSuccess },
    { key: 'navigation.billScanOpening', text: t.navigation.billScanOpening },
    { key: 'navigation.openingStock', text: t.navigation.openingStock },
    { key: 'navigation.openingLedger', text: t.navigation.openingLedger },
    { key: 'navigation.openingToday', text: t.navigation.openingToday },
    { key: 'editing.deleteTapOnly', text: t.editing.deleteTapOnly },
    { key: 'editing.tapConfirmRequired', text: t.editing.tapConfirmRequired },
  ];
  return candidates.filter((c) => typeof c.text === 'string' && c.text.trim().length > 0 && !c.text.includes('{'));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outRoot = path.resolve(process.cwd(), 'public', 'audio-pack');
  const targetLangs: LanguageCode[] = args.lang ? [args.lang] : (Object.keys(LOCALES) as LanguageCode[]);

  const jobs: Array<{ lang: LanguageCode; key: string; text: string; hash: string; outPath: string }> = [];
  let totalChars = 0;

  for (const lang of targetLangs) {
    const dict = LOCALES[lang];
    if (!dict) continue;
    const entries = extractFixedSpokenKeys(dict);
    for (const e of entries) {
      if (totalChars + e.text.length > args.maxChars) break;
      const hash = hashTTSText(e.text);
      const outPath = path.join(outRoot, lang, `${hash}.wav`);
      jobs.push({ lang, key: e.key, text: e.text, hash, outPath });
      totalChars += e.text.length;
    }
  }

  const estimatedInr = estimateTtsCostInr(totalChars);
  console.log(`Pre-generate audio job summary:`);
  console.log(`  Languages: ${targetLangs.join(', ')}`);
  console.log(`  Items: ${jobs.length}`);
  console.log(`  Total characters: ${totalChars}`);
  console.log(`  Estimated cost: ₹${estimatedInr.toFixed(4)}`);

  if (args.dryRun || !args.confirm) {
    if (!args.confirm && !args.dryRun) {
      console.log('Aborted: pass --confirm to synthesize audio (or --dry-run to inspect).');
    }
    return;
  }

  const ttsUrl = process.env.TIMBRE_TTS_URL || process.env.GNANI_TTS_URL || '';
  const apiKey = process.env.GNANI_API_KEY || process.env.TIMBRE_API_KEY || '';
  if (!ttsUrl || !apiKey) {
    console.error('Missing TIMBRE_TTS_URL/GNANI_TTS_URL or GNANI_API_KEY in environment.');
    process.exit(1);
  }

  const manifest: Record<string, { lang: string; key: string; text: string; file: string }> = {};
  const throttleMs = Math.max(200, Number(process.env.TTS_THROTTLE_MS) || 350);

  for (const job of jobs) {
    fs.mkdirSync(path.dirname(job.outPath), { recursive: true });
    const relFile = `/audio-pack/${job.lang}/${job.hash}.wav`;
    manifest[`${job.lang}::${job.hash}`] = {
      lang: job.lang,
      key: job.key,
      text: job.text,
      file: relFile,
    };

    if (fs.existsSync(job.outPath)) {
      console.log(`[skip] ${job.lang} ${job.key} (already exists)`);
      continue;
    }

    const profile = getLanguageVoiceProfile(job.lang);
    const res = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        text: job.text,
        language: profile.ttsLanguageCode,
        voice: profile.ttsVoice,
        model: profile.ttsModel,
        format: 'wav',
      }),
    });

    if (!res.ok) {
      console.error(`[err] ${job.lang} ${job.key}: HTTP ${res.status}`);
      continue;
    }

    const contentType = res.headers.get('content-type') || '';
    let buf: Buffer;
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as { audioBase64?: string; audio?: string };
      buf = Buffer.from(data.audioBase64 || data.audio || '', 'base64');
    } else {
      buf = Buffer.from(await res.arrayBuffer());
    }

    fs.writeFileSync(job.outPath, buf);
    console.log(`[ok] ${job.lang} ${job.key} -> ${relFile} (${buf.length} bytes)`);
    await sleep(throttleMs);
  }

  fs.mkdirSync(outRoot, { recursive: true });
  fs.writeFileSync(path.join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Wrote manifest.json (${Object.keys(manifest).length} entries).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Phase 6: TTS Evaluation Script.
 * Generates the same 5 sentences and 2 amounts per language into tests/tts-eval/<lang>/
 * for native listening review. Prints estimated cost first and requires --confirm.
 */

import fs from 'node:fs';
import path from 'node:path';
import { estimateTtsCostInr, getLanguageVoiceProfile } from '../src/voice/speechConfig';
import { formatAmountForSpeech } from '../src/tts/numberToWords';
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

async function main() {
  const confirm = process.argv.includes('--confirm');
  const outRoot = path.resolve(process.cwd(), 'tests', 'tts-eval');
  const langs = Object.keys(LOCALES) as LanguageCode[];

  const jobs: Array<{ lang: LanguageCode; id: string; text: string }> = [];
  let totalChars = 0;

  for (const lang of langs) {
    const t = LOCALES[lang];
    const profile = getLanguageVoiceProfile(lang);
    const sentences = [
      { id: '01_listening', text: t.voice.listening },
      { id: '02_saved', text: t.voice.confirmSaved },
      { id: '03_cancelled', text: t.voice.cancelled },
      { id: '04_undo', text: t.voice.undoSuccess },
      { id: '05_stock', text: t.navigation.openingStock },
      { id: '06_amt_500', text: formatAmountForSpeech(500, lang, profile.numbersAsWords).text },
      { id: '07_amt_125000', text: formatAmountForSpeech(125000, lang, profile.numbersAsWords).text },
    ];
    for (const s of sentences) {
      jobs.push({ lang, id: s.id, text: s.text });
      totalChars += s.text.length;
    }
  }

  console.log(
    `TTS Eval: ${jobs.length} audio clips (${langs.length} languages x 7), ${totalChars} chars, estimated cost: ₹${estimateTtsCostInr(totalChars).toFixed(4)}`
  );

  if (!confirm) {
    console.log('Aborted: pass --confirm to generate TTS evaluation clips.');
    return;
  }

  const ttsUrl = process.env.TIMBRE_TTS_URL || process.env.GNANI_TTS_URL || '';
  const apiKey = process.env.GNANI_API_KEY || process.env.TIMBRE_API_KEY || '';
  if (!ttsUrl || !apiKey) {
    console.error('Missing TIMBRE_TTS_URL/GNANI_TTS_URL or GNANI_API_KEY.');
    process.exit(1);
  }

  for (const job of jobs) {
    const profile = getLanguageVoiceProfile(job.lang);
    const dir = path.join(outRoot, job.lang);
    fs.mkdirSync(dir, { recursive: true });

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
      console.error(`[err] ${job.lang}/${job.id}: HTTP ${res.status}`);
      continue;
    }

    const ct = res.headers.get('content-type') || '';
    const buf = ct.includes('application/json')
      ? Buffer.from(((await res.json()) as { audioBase64?: string }).audioBase64 || '', 'base64')
      : Buffer.from(await res.arrayBuffer());

    fs.writeFileSync(path.join(dir, `${job.id}.wav`), buf);
    fs.writeFileSync(path.join(dir, `${job.id}.txt`), job.text);
    console.log(`[ok] ${job.lang}/${job.id}.wav`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

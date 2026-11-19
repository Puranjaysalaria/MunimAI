import { transliterateIndicToLatin } from './indicNormalizer';

/**
 * Multilingual Number & Amount Parser for Munim AI
 * Supports Hindi, Punjabi, Hinglish, and English spoken numbers.
 */

const EXACT_NUMBER_WORDS: Record<string, number> = {
  // English words
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  twentyfive: 25,
  thirty: 30,
  thirtyfive: 35,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  'five hundred': 500,
  'two hundred': 200,
  'one hundred': 100,
  'three hundred': 300,
  'four hundred': 400,

  // Hindi & Punjabi Units (1-10)
  ek: 1,
  ik: 1,
  ikk: 1,
  do: 2,
  teen: 3,
  tin: 3,
  tinn: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  panj: 5,
  cheh: 6,
  chhe: 6,
  chheh: 6,
  saat: 7,
  sat: 7,
  aath: 8,
  ath: 8,
  nau: 9,
  das: 10,
  dass: 10,

  // 11-20
  gyarah: 11,
  gyaarah: 11,
  barah: 12,
  baarah: 12,
  terah: 13,
  chaudah: 14,
  pandrah: 15,
  solah: 16,
  satrah: 17,
  atharah: 18,
  unnees: 19,
  bees: 20,
  veeh: 20,
  veeha: 20,

  // Tens & Multiples
  pachees: 25,
  pachis: 25,
  tees: 30,
  teeha: 30,
  paitees: 35,
  paintis: 35,
  chalees: 40,
  chalis: 40,
  pachaas: 50,
  pachas: 50,
  panjaah: 50,
  panjah: 50,
  saath: 60,
  sath: 60,
  sattar: 70,
  assi: 80,
  nabbe: 90,

  // Hundreds & Special Kirana Amounts
  sau: 100,
  so: 100,
  'dedh sau': 150,
  'dedh so': 150,
  'dhai sau': 250,
  'dhai so': 250,
  'paanch sau': 500,
  'panch sau': 500,
  'panj sau': 500,
  hazaar: 1000,
  hazar: 1000,
  hajar: 1000,
  hazaara: 1000,

  // Fractional Quantities
  aadha: 0.5,
  adha: 0.5,
  paav: 0.25,
  pao: 0.25,
  dedh: 1.5,
  dhai: 2.5,
  sawwa: 1.25,
  sawa: 1.25,
};

function cleanText(text: string): string {
  const normalized = transliterateIndicToLatin(text);
  return normalized
    .toLowerCase()
    .replace(/[₹,]/g, ' ')
    // Protect Hindi imperative verbs ending in "do" ("likh do", "kar do", "bhej do", "de do")
    // from being misinterpreted as the digit 2
    .replace(/\b(likh|kar|bhej|de|hata|bata|rakh|mod)\s+do\b/gi, '$1_action')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractNumbers(text: string): number[] {
  const clean = cleanText(text);
  const foundNumbers: number[] = [];

  // 1. Direct Regex for Multi-word specials first
  const specialPatterns: [RegExp, number][] = [
    [/\b(dhai\s*sau|dhai\s*so)\b/gi, 250],
    [/\b(dedh\s*sau|dedh\s*so)\b/gi, 150],
    [/\b(paanch\s*sau|panch\s*sau|panj\s*sau|5\s*sau|five\s*hundred)\b/gi, 500],
    [/\b(char\s*sau|chaar\s*sau|4\s*sau|four\s*hundred)\b/gi, 400],
    [/\b(teen\s*sau|tin\s*sau|3\s*sau|three\s*hundred)\b/gi, 300],
    [/\b(do\s*sau|2\s*sau|two\s*hundred)\b/gi, 200],
    [/\b(ek\s*sau|ikk\s*sau|1\s*sau|one\s*hundred)\b/gi, 100],
    [/\b(paanch\s*hazaar|panj\s*hazaar|5\s*hazaar|5\s*hazar|five\s*thousand)\b/gi, 5000],
    [/\b(do\s*hazaar|2\s*hazaar|2\s*hazar|two\s*thousand)\b/gi, 2000],
    [/\b(ek\s*hazaar|ikk\s*hazaar|1\s*hazaar|1\s*hazar|one\s*thousand)\b/gi, 1000],
  ];

  let remaining = clean;
  for (const [pattern, val] of specialPatterns) {
    if (pattern.test(remaining)) {
      foundNumbers.push(val);
      remaining = remaining.replace(pattern, ' ');
    }
  }

  // 2. Multiplier expressions like `<number> sau` or `<number> hundred` or `<number> hazaar`
  const hundredMatch = remaining.match(/(\b\w+\b)\s+(?:sau|so|hundred)\b/);
  if (hundredMatch) {
    const word = hundredMatch[1];
    const base = Number(word) || EXACT_NUMBER_WORDS[word];
    if (base && !isNaN(base)) {
      foundNumbers.push(base * 100);
      remaining = remaining.replace(hundredMatch[0], ' ');
    }
  }

  const hazarMatch = remaining.match(/(\b\w+\b)\s+(?:hazaar|hazar|thousand)\b/);
  if (hazarMatch) {
    const word = hazarMatch[1];
    const base = Number(word) || EXACT_NUMBER_WORDS[word];
    if (base && !isNaN(base)) {
      foundNumbers.push(base * 1000);
      remaining = remaining.replace(hazarMatch[0], ' ');
    }
  }

  // 3. Direct Digits
  const digitMatches = remaining.match(/\b\d+(\.\d+)?\b/g);
  if (digitMatches) {
    for (const d of digitMatches) {
      foundNumbers.push(parseFloat(d));
    }
    remaining = remaining.replace(/\b\d+(\.\d+)?\b/g, ' ');
  }

  // 4. Single Word Lookups
  const tokens = remaining.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (EXACT_NUMBER_WORDS[token] !== undefined) {
      foundNumbers.push(EXACT_NUMBER_WORDS[token]);
    }
  }

  return foundNumbers;
}

export function extractAmount(text: string): number | null {
  const clean = cleanText(text);

  // 1. Explicit amount patterns like "500 ka", "500 rupaye", "₹500", "500 rupees"
  const amountPattern = /(\d+|pachaas|fifty|paanch sau|panj sau|dhai sau|sau|hazaar|thousand)\s*(?:ka|ke|rupaye|rupees|rupee|bucks|rs|inr|da|de|roopaye|rupaiya)\b/i;
  const match = clean.match(amountPattern);
  if (match) {
    const extracted = extractNumbers(match[1]);
    if (extracted.length > 0) return extracted[0];
  }

  // 2. Filter out numbers that represent quantities with units (e.g. "2 kilo", "1 packet")
  const textWithoutUnits = clean.replace(
    /(\b\d+(?:\.\d+)?|\badha\b|\baadha\b|\bpaav\b|\bpao\b|\bdedh\b|\bdhai\b|\bek\b|\bik\b|\bdo\b|\bteen\b|\bchar\b|\bpaanch\b|\bpanj\b|\bcheh\b|\bsaat\b|\baath\b|\bnau\b|\bdas\b)\s*(kilo|kg|kgs|kilogram|ser|litre|liter|ltr|lit|l|gram|gm|gms|g|packet|packets|pkt|pkts|dibba|dabba|piece|pieces|nag|pc|pcs|bori|bag)\b/gi,
    ' '
  );

  const nonUnitNumbers = extractNumbers(textWithoutUnits);
  if (nonUnitNumbers.length === 0) {
    return null;
  }

  if (nonUnitNumbers.length === 1) {
    return nonUnitNumbers[0];
  }

  return Math.max(...nonUnitNumbers);
}

export function extractQuantityAndUnit(text: string): { quantity: number | null; unit: string | null } {
  const clean = cleanText(text);

  // Pattern directly matching "<qty> <unit>" like "5 kg", "5 kilo", "2 litre", "adha kilo"
  const directMatch = clean.match(/(\b\d+(?:\.\d+)?|\badha\b|\baadha\b|\bpaav\b|\bpao\b|\bdedh\b|\bdhai\b|\bek\b|\bik\b|\bdo\b|\bteen\b|\bchar\b|\bpaanch\b|\bpanj\b|\bcheh\b|\bsaat\b|\baath\b|\bnau\b|\bdas\b)\s*(kilo|kg|kgs|kilogram|ser|litre|liter|ltr|lit|l|gram|gm|gms|g|packet|packets|pkt|pkts|dibba|dabba|piece|pieces|nag|pc|pcs|bori|bag)\b/i);

  if (directMatch) {
    const qRaw = directMatch[1];
    const uRaw = directMatch[2].toLowerCase();

    const qNum = extractNumbers(qRaw);
    const quantity = qNum.length > 0 ? qNum[0] : 1;

    let unit = 'kilo';
    if (['litre', 'liter', 'ltr', 'lit', 'l'].includes(uRaw)) unit = 'litre';
    else if (['gram', 'gm', 'gms', 'g'].includes(uRaw)) unit = 'gram';
    else if (['packet', 'packets', 'pkt', 'pkts', 'dibba', 'dabba'].includes(uRaw)) unit = 'packet';
    else if (['piece', 'pieces', 'nag', 'pc', 'pcs'].includes(uRaw)) unit = 'piece';
    else if (['bori', 'bag'].includes(uRaw)) unit = 'bori';

    return { quantity, unit };
  }

  const unitPatterns: [RegExp, string][] = [
    [/\b(kilo|kg|kgs|kilogram|ser)\b/i, 'kilo'],
    [/\b(litre|liter|ltr|lit|l)\b/i, 'litre'],
    [/\b(gram|gm|gms|g)\b/i, 'gram'],
    [/\b(packet|packets|pkt|pkts|dibba|dabba)\b/i, 'packet'],
    [/\b(piece|pieces|nag|pc|pcs)\b/i, 'piece'],
    [/\b(bori|bag)\b/i, 'bori'],
  ];

  let detectedUnit: string | null = null;
  for (const [pattern, unit] of unitPatterns) {
    if (pattern.test(clean)) {
      detectedUnit = unit;
      break;
    }
  }

  const numbers = extractNumbers(text);
  if (numbers.length > 0) {
    return { quantity: numbers[0], unit: detectedUnit || 'kilo' };
  }

  return { quantity: null, unit: detectedUnit };
}

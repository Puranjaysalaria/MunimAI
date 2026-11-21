import { Customer, Item } from '../types/schema';

/**
 * Phonetic Base Transliteration Table for Indic scripts:
 * Maps Devanagari, Gurmukhi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam characters
 * to their root phonetic Latin representation so that cross-script matching is exact.
 */
const INDIC_TO_LATIN_MAP: Record<string, string> = {
  // Vowels
  'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'ਅ': 'a', 'ਆ': 'a', 'ਇ': 'i', 'ਈ': 'ee', 'ਉ': 'u', 'ਊ': 'oo', 'ਏ': 'e', 'ਐ': 'ai', 'ਓ': 'o', 'ਔ': 'au',
  'અ': 'a', 'આ': 'a', 'ઇ': 'i', 'ઈ': 'ee', 'ઉ': 'u', 'ઊ': 'oo', 'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au',
  'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'ee', 'উ': 'u', 'ঊ': 'oo', 'এ': 'e', 'ঐ': 'ai', 'ও': 'o', 'ঔ': 'au',
  'அ': 'a', 'ஆ': 'a', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo', 'எ': 'e', 'ஏ': 'e', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'o', 'ஔ': 'au',
  'అ': 'a', 'ఆ': 'a', 'ఇ': 'i', 'ఈ': 'ee', 'ఉ': 'u', 'ఊ': 'oo', 'ఎ': 'e', 'ఏ': 'e', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'o', 'ఔ': 'au',
  'ಅ': 'a', 'ಆ': 'a', 'ಇ': 'i', 'ಈ': 'ee', 'ಉ': 'u', 'ಊ': 'oo', 'ಎ': 'e', 'ಏ': 'e', 'ಐ': 'ai', 'ಒ': 'o', 'ಓ': 'o', 'ಔ': 'au',
  'അ': 'a', 'ആ': 'a', 'ഇ': 'i', 'ഈ': 'ee', 'ഉ': 'u', 'ഊ': 'oo', 'എ': 'e', 'ഏ': 'e', 'ഐ': 'ai', 'ഒ': 'o', 'ഓ': 'o', 'ഔ': 'au',

  // Consonants - Velars
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'ਕ': 'k', 'ਖ': 'kh', 'ਗ': 'g', 'ਘ': 'gh', 'ਙ': 'ng',
  'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'ng',
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'க': 'k',
  'క': 'k', 'ఖ': 'kh', 'గ': 'g', 'ఘ': 'gh', 'ఙ': 'ng',
  'ಕ': 'k', 'ಖ': 'kh', 'ಗ': 'g', 'ಘ': 'gh', 'ಙ': 'ng',
  'ക': 'k', 'ഖ': 'kh', 'ഗ': 'g', 'ഘ': 'gh', 'ങ': 'ng',

  // Palatals
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ਚ': 'ch', 'ਛ': 'chh', 'ਜ': 'j', 'ਝ': 'jh', 'ਞ': 'ny',
  'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'jh', 'ઞ': 'ny',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'ny',
  'ச': 's', 'ஜ': 'j',
  'చ': 'ch', 'ఛ': 'chh', 'జ': 'j', 'ఝ': 'jh', 'ఞ': 'ny',
  'ಚ': 'ch', 'ಛ': 'chh', 'ಜ': 'j', 'ಝ': 'jh', 'ಞ': 'ny',
  'ച': 'ch', 'ഛ': 'chh', 'ജ': 'j', 'ഝ': 'jh', 'ഞ': 'ny',

  // Retroflex
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'ਟ': 't', 'ਠ': 'th', 'ਡ': 'd', 'ਢ': 'dh', 'ਣ': 'n',
  'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ட': 't', 'ண': 'n',
  'ట': 't', 'ఠ': 'th', 'డ': 'd', 'ఢ': 'dh', 'ణ': 'n',
  'ಟ': 't', 'ಠ': 'th', 'ಡ': 'd', 'ಢ': 'dh', 'ಣ': 'n',
  'ട': 't', 'ഠ': 'th', 'ഡ': 'd', 'ഢ': 'dh', 'ണ': 'n',

  // Dentals
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'ਤ': 't', 'ਥ': 'th', 'ਦ': 'd', 'ਧ': 'dh', 'ਨ': 'n',
  'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'த': 'th', 'ந': 'n', 'ன': 'n',
  'త': 't', 'థ': 'th', 'ద': 'd', 'ధ': 'dh', 'న': 'n',
  'ತ': 't', 'ಥ': 'th', 'ದ': 'd', 'ಧ': 'dh', 'ನ': 'n',
  'ത': 't', 'ഥ': 'th', 'ദ': 'd', 'ധ': 'dh', 'ന': 'n',

  // Labials
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'ਪ': 'p', 'ਫ': 'ph', 'ਬ': 'b', 'ਭ': 'bh', 'ਮ': 'm',
  'પ': 'p', 'ફ': 'ph', 'બ': 'b', 'ભ': 'bh', 'મ': 'm',
  'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'ப': 'p', 'ம': 'm',
  'ప': 'p', 'ఫ': 'ph', 'బ': 'b', 'భ': 'bh', 'మ': 'm',
  'ಪ': 'p', 'ಫ': 'ph', 'ಬ': 'b', 'ಭ': 'bh', 'ಮ': 'm',
  'പ': 'p', 'ഫ': 'ph', 'ബ': 'b', 'ഭ': 'bh', 'മ': 'm',

  // Semivowels & Sibilants
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ਯ': 'y', 'ਰ': 'r', 'ਲ': 'l', 'ਵ': 'v', 'ਸ਼': 'sh', 'ਸ': 's', 'ਹ': 'h',
  'ય': 'y', 'ર': 'r', 'લ': 'l', 'વ': 'v', 'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
  'ய': 'y', 'ர': 'r', 'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h',
  'య': 'y', 'ర': 'r', 'ల': 'l', 'వ': 'v', 'శ': 'sh', 'ష': 'sh', 'స': 's', 'హ': 'h',
  'ಯ': 'y', 'ರ': 'r', 'ಲ': 'l', 'ವ': 'v', 'ಶ': 'sh', 'ಷ': 'sh', 'ಸ': 's', 'ಹ': 'h',
  'യ': 'y', 'ര': 'r', 'ല': 'l', 'വ': 'v', 'ഴ': 'zh', 'ള': 'l', 'റ': 'r', 'ശ': 'sh', 'ഷ': 'sh', 'സ': 's', 'ഹ': 'h',

  // Matras / Vowel signs
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', '्': '',
  'ਾ': 'a', 'ਿ': 'i', 'ੀ': 'ee', 'ੁ': 'u', 'ੂ': 'oo', 'ੇ': 'e', 'ੈ': 'ai', 'ੋ': 'o', 'ੌ': 'au', 'ਂ': 'n', 'ੰ': 'n', '੍': '',
  'ા': 'a', 'િ': 'i', 'ી': 'ee', 'ુ': 'u', 'ૂ': 'oo', 'ૃ': 'ri', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au', 'ં': 'n', '્': '',
  'া': 'a', 'ি': 'i', 'ী': 'ee', 'ু': 'u', 'ূ': 'oo', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'ai', 'ো': 'o', 'ৌ': 'au', 'ং': 'n', '্': '',
  'ா': 'a', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo', 'ெ': 'e', 'ே': 'e', 'ை': 'ai', 'ொ': 'o', 'ோ': 'o', 'ௌ': 'au', '்': '',
  'ా': 'a', 'ి': 'i', 'ీ': 'ee', 'ు': 'u', 'ూ': 'oo', 'ె': 'e', 'ే': 'e', 'ై': 'ai', 'ొ': 'o', 'ో': 'o', 'ౌ': 'au', '్': '',
  'ಾ': 'a', 'ಿ': 'i', 'ೀ': 'ee', 'ು': 'u', 'ೂ': 'oo', 'ೆ': 'e', 'ೇ': 'e', 'ೈ': 'ai', 'ೊ': 'o', 'ೋ': 'o', 'ೌ': 'au', '್': '',
  'ാ': 'a', 'ി': 'i', 'ീ': 'ee', 'ു': 'u', 'ൂ': 'oo', 'െ': 'e', 'േ': 'e', 'ൈ': 'ai', 'ൊ': 'o', 'ോ': 'o', 'ൌ': 'au', '്': '',
};

// All Indic consonants across 8 Indic scripts
const INDIC_CONSONANTS = new Set([
  'क','ख','ग','घ','ङ','च','छ','ज','झ','ञ','ट','ठ','ड','ढ','ण','त','थ','द','ध','न','प','फ','ब','भ','म','य','र','ल','व','श','ष','स','ह',
  'ਕ','ਖ','ਗ','ਘ','ਙ','ਚ','ਛ','ਜ','ਝ','ਞ','ਟ','ਠ','ਡ','ਢ','ਣ','ਤ','ਥ','ਦ','ਧ','ਨ','ਪ','ਫ','ਬ','ਭ','ਮ','ਯ','ਰ','ਲ','ਵ','ਸ਼','ਸ','ਹ',
  'ક','ખ','ગ','ઘ','ઙ','ચ','છ','જ','ઝ','ઞ','ટ','ઠ','ડ','ઢ','ણ','ત','થ','દ','ધ','ન','પ','ફ','બ','ભ','મ','ય','ર','લ','વ','શ','ષ','સ','હ',
  'ক','খ','গ','ঘ','ঙ','চ','ছ','জ','ঝ','ঞ','ট','ঠ','ড','ঢ','ণ','ত','থ','দ','ধ','ন','প','ফ','ব','ভ','ম','য','র','ল','শ','ষ','স','হ',
  'க','ச','ஜ','ட','ண','த','ந','ன','ப','ம','ய','ர','ல','வ','ழ','ள','ற','ஷ','ஸ','ஹ',
  'క','ఖ','గ','ఘ','ఙ','చ','ఛ','జ','ఝ','ఞ','ట','ఠ','డ','ఢ','ణ','త','థ','ద','ధ','న','ప','ఫ','బ','భ','మ','య','ర','ల','వ','శ','ష','స','హ',
  'ಕ','ಖ','ಗ','ಘ','ಙ','ಚ','ಛ','ಜ','ಝ','ಞ','ಟ','ಠ','ಡ','ಢ','ಣ','ತ','ಥ','ದ','ಧ','ನ','ಪ','ಫ','ಬ','ಭ','ಮ','ಯ','ರ','ಲ','ವ','ಶ','ಷ','ಸ','ಹ',
  'ക','ഖ','ഗ','ഘ','ങ','ച','ഛ','ജ','ഝ','ഞ','ട','ഠ','ഡ','ഢ','ണ','ത','ഥ','ദ','ധ','ന','പ','ഫ','ബ','ഭ','മ','യ','ര','ല','വ','ഴ','ള','റ','ശ','ഷ','സ','ഹ'
]);

/**
 * Transliterates any Indian script or Roman string to a simplified phonetic Latin key
 */
export function toPhoneticKey(text: string): string {
  if (!text) return '';
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (INDIC_TO_LATIN_MAP[ch] !== undefined) {
      out += INDIC_TO_LATIN_MAP[ch];
    } else {
      out += ch;
    }
    // If current character is an Indic consonant and next character is also an Indic consonant,
    // insert inherent 'a' (schwa) between them
    if (INDIC_CONSONANTS.has(ch)) {
      const next = text[i + 1];
      if (next && INDIC_CONSONANTS.has(next)) {
        out += 'a';
      }
    }
  }

  // Normalize duplicate vowels and silent markers:
  // e.g., 'ee' -> 'i', 'oo' -> 'u', 'sh'/'s' -> 's', 'v'/'w' -> 'v'
  return out
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/aa/g, 'a')
    .replace(/w/g, 'v')
    .replace(/sh/g, 's')
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/chh/g, 'ch')
    .replace(/jh/g, 'j')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/ph/g, 'p')
    .replace(/bh/g, 'b');
}

/**
 * Calculates Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return d[m][n];
}

export const QUERY_STOP_WORDS = new Set([
  'da','di','de','ka','ki','ke','ko','nu','che','er','in','yokka','na','te','khata','khaata',
  'account','ledger','kholo','dikhao','dekho','dakhva','ughada','thira','kaattu','thereyiri','thorisi',
  'thurakkuka','kaanikkuka','show','open','check','view','of','any','the','a',
  'record','records','statement','details','history','passbook','profile','info','customer','user','grahak','gaahak','hisaab','hisab',
  'ਦਾ','ਦੀ','ਦੇ','ਨੂੰ','ਖਾਤਾ','ਖੋਲ੍ਹੋ','ਲੈਜ਼ਰ','ਵੇਖੋ','ਰਿਕਾਰਡ',
  'का','की','के','को','खाता','खोलो','दिखाओ','देखें','लेजर','खाते','उघडा','चा','ची','चे','रिकॉर्ड','विवरण','हिसाब',
  'ખાતું','ખોલો','નો','ની','નું','લેજર','જોવો','રેકોર્ડ',
  'খাতা','খুলুন','এর','দেখাও','রেকর্ড',
  'கணக்கு','திற','காட்டு','பதிவு',
  'ఖాతా','తెరువు','చూపించు','యొక్క','రికార్డు',
  'ಖಾತೆ','ತೆರೆಯಿರಿ','ತೋರಿಸಿ','ದಾಖಲೆ',
  'ഖാത്ത','തുറക്കുക','കാണിക്കുക','രേഖ'
]);

/**
 * Strips common stop/query words from customer search expressions
 */
export function cleanCustomerQuery(text: string): string {
  if (!text) return '';
  return text
    .split(/[\s,]+/)
    .filter((w) => !QUERY_STOP_WORDS.has(w.toLowerCase()))
    .join(' ')
    .trim();
}

/**
 * Resolves a customer query string across scripts (e.g. "Ramesh", "रमेश", "ਰਮੇਸ਼", "ரமேஷ்", etc.)
 * against the shop's customer list.
 */
export function resolveCrossScriptCustomer(
  query: string,
  customers: Customer[]
): {
  matchedCustomer: Customer | null;
  ambiguousCustomers: Customer[];
  confidence: number;
} {
  if (!query || customers.length === 0) {
    return { matchedCustomer: null, ambiguousCustomers: [], confidence: 0 };
  }

  // Strip relation / query suffix words like "ka khata", "da khata", "account", etc.
  const cleanQuery = query
    .split(/[\s,]+/)
    .filter((w) => !QUERY_STOP_WORDS.has(w.toLowerCase()))
    .join(' ')
    .trim();

  const queryKey = toPhoneticKey(cleanQuery || query);
  if (!queryKey) {
    return { matchedCustomer: null, ambiguousCustomers: [], confidence: 0 };
  }

  // 1. Direct phonetic exact matches (against full name or first/last name tokens)
  const exactMatches: Customer[] = [];
  const partialMatches: Customer[] = [];

  for (const c of customers) {
    const custKey = toPhoneticKey(c.name);
    const nameTokens = c.name.split(/\s+/).map((tok) => toPhoneticKey(tok));

    if (custKey === queryKey || nameTokens.includes(queryKey)) {
      exactMatches.push(c);
    } else if (
      (custKey.length >= 4 && custKey.includes(queryKey) && queryKey.length >= 3) ||
      (queryKey.length <= custKey.length + 2 && queryKey.includes(custKey)) ||
      nameTokens.some(
        (tok) =>
          tok.length >= 4 &&
          ((tok.includes(queryKey) && queryKey.length >= 3) ||
            (queryKey.length <= tok.length + 2 && queryKey.includes(tok)))
      )
    ) {
      partialMatches.push(c);
    }
  }

  if (exactMatches.length === 1) {
    return { matchedCustomer: exactMatches[0], ambiguousCustomers: [], confidence: 1.0 };
  }
  if (exactMatches.length > 1) {
    return { matchedCustomer: null, ambiguousCustomers: exactMatches, confidence: 0.8 };
  }

  if (partialMatches.length === 1) {
    return { matchedCustomer: partialMatches[0], ambiguousCustomers: [], confidence: 0.9 };
  }
  if (partialMatches.length > 1) {
    return { matchedCustomer: null, ambiguousCustomers: partialMatches, confidence: 0.75 };
  }

  // 2. Fuzzy Levenshtein match across phonetic keys (full name or name tokens)
  let bestDist = Infinity;
  let bestMatches: Customer[] = [];

  for (const c of customers) {
    const custKey = toPhoneticKey(c.name);
    const nameTokens = c.name.split(/\s+/).map((tok) => toPhoneticKey(tok));

    let minDist = levenshteinDistance(queryKey, custKey);
    let matchedLen = custKey.length;
    for (const tok of nameTokens) {
      const d = levenshteinDistance(queryKey, tok);
      if (d < minDist) {
        minDist = d;
        matchedLen = tok.length;
      }
    }

    const maxAllowed = queryKey.length <= 4 ? 1 : 2;

    if (minDist <= maxAllowed && Math.abs(queryKey.length - matchedLen) <= 2) {
      if (minDist < bestDist) {
        bestDist = minDist;
        bestMatches = [c];
      } else if (minDist === bestDist) {
        bestMatches.push(c);
      }
    }
  }

  if (bestMatches.length === 1) {
    return { matchedCustomer: bestMatches[0], ambiguousCustomers: [], confidence: 0.85 };
  }
  if (bestMatches.length > 1) {
    return { matchedCustomer: null, ambiguousCustomers: bestMatches, confidence: 0.7 };
  }

  return { matchedCustomer: null, ambiguousCustomers: [], confidence: 0 };
}

/**
 * Resolves an item query string across scripts against the inventory items list
 */
export function resolveCrossScriptItem(
  query: string,
  items: Item[]
): {
  matchedItem: Item | null;
  confidence: number;
} {
  if (!query || items.length === 0) return { matchedItem: null, confidence: 0 };

  const queryKey = toPhoneticKey(query);

  for (const it of items) {
    if (toPhoneticKey(it.name) === queryKey) {
      return { matchedItem: it, confidence: 1.0 };
    }
    for (const syn of it.synonyms) {
      if (toPhoneticKey(syn) === queryKey) {
        return { matchedItem: it, confidence: 0.95 };
      }
    }
  }

  // Fuzzy match
  for (const it of items) {
    if (levenshteinDistance(queryKey, toPhoneticKey(it.name)) <= 1) {
      return { matchedItem: it, confidence: 0.85 };
    }
    for (const syn of it.synonyms) {
      if (levenshteinDistance(queryKey, toPhoneticKey(syn)) <= 1) {
        return { matchedItem: it, confidence: 0.8 };
      }
    }
  }

  return { matchedItem: null, confidence: 0 };
}

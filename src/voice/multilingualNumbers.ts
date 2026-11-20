import { ItemUnit } from '../types/schema';

// Digit mapping for all 10 Indic script numeral systems + Western
const INDIC_DIGIT_MAP: Record<string, string> = {
  // Devanagari (hi, mr)
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  // Gurmukhi (pa)
  '੦': '0', '੧': '1', '੨': '2', '੩': '3', '੪': '4', '੫': '5', '੬': '6', '੭': '7', '੮': '8', '੯': '9',
  // Gujarati (gu)
  '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9',
  // Bengali (bn)
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '⑥': '6', '৭': '7', '৮': '8', '৯': '9',
  // Tamil (ta)
  '௦': '0', '௧': '1', '௨': '2', '௩': '3', '௪': '4', '௫': '5', '௬': '6', '௭': '7', '௮': '8', '௯': '9',
  // Telugu (te)
  '౦': '0', '౧': '1', '౨': '2', '౩': '3', '౪': '4', '౫': '5', '౬': '6', '౭': '7', '౮': '8', '౯': '9',
  // Kannada (kn)
  '೦': '0', '೧': '1', '೨': '2', '೩': '3', '೪': '4', '೫': '5', '೬': '6', '೭': '7', '೮': '8', '೯': '9',
  // Malayalam (ml)
  '൦': '0', '൧': '1', '൨': '2', '൩': '3', '൪': '4', '൫': '5', '൬': '6', '൭': '7', '൮': '8', '൯': '9',
};

// Word to number mappings across all 10 languages
const MULTILINGUAL_NUMBER_WORDS: Record<string, number> = {
  // English
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000, lakh: 100000, crore: 10000000,

  // Hindi / Hinglish
  shunya: 0, ek: 1, do: 2, teen: 3, chaar: 4, char: 4, paanch: 5, panch: 5, chhe: 6, chhah: 6, saat: 7, aath: 8, nau: 9, das: 10,
  gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnees: 19,
  bees: 20, tees: 30, chalees: 40, chalis: 40, pachas: 50, saath: 60, sattar: 70, assi: 80, nabbe: 90,
  sau: 100, so: 100, sae: 100, hazaar: 1000, hazar: 1000, hajar: 1000,

  // Devanagari (Hindi, Marathi)
  'शून्य': 0, 'एक': 1, 'दोन': 2, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाच': 5, 'पाँच': 5, 'पांच': 5, 'सहा': 6, 'छह': 6, 'सात': 7, 'आठ': 8, 'नऊ': 9, 'नौ': 9, 'दहा': 10, 'दस': 10,
  'अकरा': 11, 'ग्यारह': 11, 'बारा': 12, 'बारह': 12, 'तेरा': 13, 'तेरह': 13, 'चौदा': 14, 'चौदह': 14, 'पंधरा': 15, 'पंद्रह': 15, 'सोळा': 16, 'सोलह': 16, 'सतरा': 17, 'सत्रह': 17, 'अठरा': 18, 'अट्ठारह': 18, 'एकोणीस': 19, 'उन्नीस': 19,
  'वीस': 20, 'बीस': 20, 'तीस': 30, 'चाळीस': 40, 'चालीस': 40, 'पन्नास': 50, 'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'ऐंशी': 80, 'अस्सी': 80, 'नव्वद': 90, 'नब्बे': 90,
  'शे': 100, 'शंभर': 100, 'सौ': 100, 'पाचशे': 500, 'हजार': 1000, 'हज़ार': 1000, 'लाख': 100000,

  // Punjabi (Gurmukhi + Roman)
  'ਸਿਫ਼ਰ': 0, 'ਇੱਕ': 1, 'ਦੋ': 2, 'ਤਿੰਨ': 3, 'ਚਾਰ': 4, 'ਪੰਜ': 5, 'ਛੇ': 6, 'ਸੱਤ': 7, 'ਅੱਠ': 8, 'ਨੌਂ': 9, 'ਦੱਸ': 10,
  'ਗਿਆਰਾਂ': 11, 'ਬਾਰਾਂ': 12, 'ਤੇਰਾਂ': 13, 'ਚੌਦਾਂ': 14, 'ਪੰਦਰਾਂ': 15, 'ਸੋਲਾਂ': 16, 'ਸਤਾਰਾਂ': 17, 'ਅਠਾਰਾਂ': 18, 'ਉੱਨੀ': 19,
  'ਵੀਹ': 20, 'ਤੀਹ': 30, 'ਚਾਲੀ': 40, 'ਪੰਜਾਹ': 50, 'ਸੱਠ': 60, 'ਸੱਤਰ': 70, 'ਅੱਸੀ': 80, 'ਨੱਬੇ': 90,
  'ਸੌ': 100, 'ਪੰਜ ਸੌ': 500, 'ਪੰਜ-ਸੌ': 500, 'ਹਜ਼ਾਰ': 1000, 'ਲੱਖ': 100000,
  ikk: 1, tin: 3, panj: 5, satt: 7, atth: 8, dass: 10, vih: 20, tih: 30, chali: 40, panjah: 50,

  // Gujarati (Gujarati + Roman)
  'શૂન્ય': 0, 'એક': 1, 'બે': 2, 'ત્રણ': 3, 'પાંચ': 5, 'છ': 6, 'નવ': 9, 'દસ': 10,
  'અગિયાર': 11, 'બાર': 12, 'તેર': 13, 'ચૌદ': 14, 'પંદર': 15, 'સોળ': 16, 'સત્તર': 17, 'અઢાર': 18, 'ઓગણીસ': 19,
  'વીસ': 20, 'ત્રીસ': 30, 'ચાલીસ': 40, 'પચાસ': 50, 'સાઠ': 60, 'સિત્તેર': 70, 'એંસી': 80, 'નેવું': 90,
  'સો': 100, 'પાંચસો': 500, 'હજાર': 1000,
  be: 2, tran: 3, pachas_gu: 50,

  // Bengali (Bengali + Roman)
  'শূন্য': 0, 'এক': 1, 'দুই': 2, 'তিন': 3, 'পাঁচ': 5, 'ছয়': 6, 'নয়': 9, 'দশ': 10,
  'এগারো': 11, 'বারো': 12, 'তেরো': 13, 'চৌদ্দ': 14, 'পনেরো': 15, 'ষোল': 16, 'সতেরো': 17, 'আঠারো': 18, 'উনিশ': 19,
  'কুড়ি': 20, 'বিশ': 20, 'ত্রিশ': 30, 'চল্লিশ': 40, 'পঞ্চাশ': 50, 'ষাট': 60, 'সत्तर': 70, 'আশি': 80, 'নব্বই': 90,
  'শো': 100, 'পাঁচশো': 500, 'হাজার': 1000, 'লাখ': 100000,
  dui: 2, chhoy: 6, aat: 8, dosh: 10, kudi: 20, bish: 20, sho: 100,

  // Tamil (Tamil + Roman)
  'பூஜ்ஜியம்': 0, 'ஒன்று': 1, 'இரண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5, 'ஆறு': 6, 'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10,
  'இருபது': 20, 'முப்பது': 30, 'நாற்பது': 40, 'ஐம்பது': 50, 'அறுபது': 60, 'எழுபது': 70, 'எண்பது': 80, 'தொண்ணூறு': 90,
  'ஐந்நூறு': 500, 'நூறு': 100, 'ஆயிரம்': 1000, 'இலட்சம்': 100000,
  ondru: 1, oru: 1, rendu: 2, irandu: 2, moonu: 3, moondru: 3, naalu: 4, naangu: 4, aindhu: 5, aaru: 6, ezhu: 7, ettu: 8, ombadhu: 9, patthu: 10,
  irubadhu: 20, muppadhu: 30, naarpadhu: 40, aimbadhu: 50, nooru: 100, aayiram: 1000,

  // Telugu (Telugu + Roman)
  'సున్నా': 0, 'ఒకటి': 1, 'ఒక': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5, 'ఆరు': 6, 'ఏడు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9, 'పది': 10,
  'ఇరవై': 20, 'ముప్పై': 30, 'నలభై': 40, 'యాభై': 50, 'అరవై': 60, 'డెబ్బై': 70, 'ఎనభై': 80, 'తొంభై': 90,
  'ఐదు వందలు': 500, 'ఐదువందలు': 500, 'వంద': 100, 'నూరు': 100, 'వెయ్యి': 1000, 'లక్ష': 100000,
  okati: 1, oka: 1, moodu: 3, naalugu: 4, aidu: 5, enimidi: 8, tommidi: 9, padi: 10,
  iravai: 20, muppai: 30, nalabhai: 40, yaabhai: 50, vanda: 100, veyyi: 1000,

  // Kannada (Kannada + Roman)
  'ಸೊನ್ನೆ': 0, 'ಒಂದು': 1, 'ಎರಡು': 2, 'ಮೂರು': 3, 'ನಾಲ್ಕು': 4, 'ಐದು': 5, 'ಆರು': 6, 'ಏಳು': 7, 'ಎಂಟು': 8, 'ಒಂಬತ್ತು': 9, 'ಹತ್ತು': 10,
  'ಇಪ್ಪತ್ತು': 20, 'ಮೂವತ್ತು': 30, 'ನಲವತ್ತು': 40, 'ಐವತ್ತು': 50, 'ಅರವತ್ತು': 60, 'ಎಪ್ಪತ್ತು': 70, 'ಎಂಬತ್ತು': 80, 'ತೊಂಬತ್ತು': 90,
  'ಐನೂರು': 500, 'ನೂರು': 100, 'ಸಾವಿರ': 1000, 'ಲಕ್ಷ': 100000,
  ondu: 1, eradu: 2, mooru: 3, naalku: 4, eelu: 7, entu: 8, ombattu: 9, hattu: 10,
  ippattu: 20, moovattu: 30, nalavattu: 40, aivattu: 50, aavattu: 60, saavira: 1000,

  // Malayalam (Malayalam + Roman)
  'പൂജ്യം': 0, 'ഒന്ന്': 1, 'ഒരു': 1, 'രണ്ട്': 2, 'മൂന്ന്': 3, 'നാല്': 4, 'അഞ്ച്': 5, 'ആറ്': 6, 'ഏഴ്': 7, 'എട്ട്': 8, 'ഒമ്പത്': 9, 'പത്ത്': 10,
  'ഇരുപത്': 20, 'മുപ്പത്': 30, 'നാല്പത്': 40, 'അമ്പത്': 50, 'അറുപത്': 60, 'എഴുപത്': 70, 'എൺപത്': 80, 'തൊണ്ണൂറ്': 90,
  'അഞ്ഞൂറ്': 500, 'നൂറ്': 100, 'ആയിരം': 1000, 'ലക്ഷം': 100000,
  onnu: 1, randu: 2, moonnu: 3, anchu: 5, onpathu: 9, pathu: 10, irupathu: 20, muppathu: 30, aayiram_ml: 1000,
};

// Unit patterns normalizing to ItemUnit
const UNIT_PATTERNS: Array<{ unit: ItemUnit; regex: RegExp }> = [
  {
    unit: 'kilo',
    regex: /(?:^|[^\p{L}])(kilo|kg|kgs|kilogram|kilograms|किलो|किलोग्राम|ਕਿਲੋ|કિલ્લો|কেজি|কিলোগ্রাম|கிலோ|కిలో|ಕಿಲೋ|കിലോ)(?:$|[^\p{L}])/iu,
  },
  {
    unit: 'gram',
    regex: /(?:^|[^\p{L}])(gram|grams|gm|gms|ग्राम|ਗ੍ਰਾਮ|ગ્રામ|গ্রাম|கிராம்|గ్రాము|ഗ്രാം|ಗ್ರಾಂ)(?:$|[^\p{L}])/iu,
  },
  {
    unit: 'litre',
    regex: /(?:^|[^\p{L}])(litre|liter|litres|liters|ltr|ltrs|लीटर|ਲੀਟਰ|ਲੀਟਰ|লিটার|லிட்டர்|లీటర్|ಲೀಟರ್|ലിറ്റർ)(?:$|[^\p{L}])/iu,
  },
  {
    unit: 'packet',
    regex: /(?:^|[^\p{L}])(packet|packets|pkt|pkts|पैकेट|ਪੈਕੇਟ|પેકેટ|প্যাকেট|பாக்கெட்|ప్యాకెట్|ಪ್ಯಾಕೆಟ್|പാക്കറ്റ്)(?:$|[^\p{L}])/iu,
  },
  {
    unit: 'piece',
    regex: /(?:^|[^\p{L}])(piece|pieces|pc|pcs|nag|nagg|पीस|नग|ਨਗ|નંગ|পিস|துண்டு|ముక్క|ತುಂಡು|പീസ്)(?:$|[^\p{L}])/iu,
  },
  {
    unit: 'dabba',
    regex: /(?:^|[^\p{L}])(dabba|dabbe|box|boxes|डिब्बा|ਡੱਬਾ|ਡબ્બો|বাক্স|പെട്ടി|டப்பா|డబ్బా|ಡಬ್ಬಿ)(?:$|[^\p{L}])/iu,
  },
  {
    unit: 'bori',
    regex: /(?:^|[^\p{L}])(bori|boriyaan|bag|bags|sack|sacks|बोरी|ਬੋਰੀ|બોਰੀ|বস্তা|மூட்டை|బస్తా|ಚೀಲ|ചಾക്ക്)(?:$|[^\p{L}])/iu,
  },
];

/**
 * Normalizes any Indic script digits to standard Western digits 0-9
 */
export function normalizeIndicDigits(text: string): string {
  let res = '';
  for (const char of text) {
    res += INDIC_DIGIT_MAP[char] || char;
  }
  return res;
}

// Pre-sorted phrases by length descending to match composite words before sub-words
const SORTED_PHRASES = Object.keys(MULTILINGUAL_NUMBER_WORDS).sort(
  (a, b) => b.length - a.length
);

/**
 * Parses numeric value from speech string across all 10 languages
 */
export function parseMultilingualNumber(text: string): number | null {
  if (!text) return null;

  // 1. Convert Indic digits to standard digits first
  const normalizedText = normalizeIndicDigits(text).toLowerCase();

  // 2. Word multiplier combinations (e.g. "paanch sau", "five hundred", "be hajaar")
  const wordMultiplierRegex =
    /(ek|do|teen|chaar|char|paanch|panch|chhe|saat|aath|nau|das|panj|ikk|be|tran|dui|tin|ondru|rendu|moonu|naalu|aindhu|okati|aidu|ondu|mooru|onnu|one|two|three|four|five|six|seven|eight|nine|ten)\s+(sau|so|hundred|hazaar|hazar|thousand|ਸੌ|ਹਜ਼ਾਰ|સો|શો|হাজার|நூறு|ஆயிரம்|వంద|వెయ్యి|ನೂರು|ಸಾವಿರ|നൂറ്|ആയിരം)/iu;
  const wordMultMatch = normalizedText.match(wordMultiplierRegex);
  if (wordMultMatch) {
    const baseVal = MULTILINGUAL_NUMBER_WORDS[wordMultMatch[1].toLowerCase()] || 1;
    const multWord = wordMultMatch[2].toLowerCase();
    if (['sau', 'so', 'hundred', 'ਸੌ', 'સો', 'શો', 'நூறு', 'వంద', 'ನೂರು', 'നൂറ്'].includes(multWord)) {
      return baseVal * 100;
    }
    if (['hazaar', 'hazar', 'thousand', 'ਹਜ਼ਾਰ', 'হাজার', 'ஆயிரம்', 'వెయ్యి', 'ಸಾವಿರ', 'ആയിരം'].includes(multWord)) {
      return baseVal * 1000;
    }
  }

  // 3. Multiplier combinations with digits: e.g. "5 sau", "5 hazaar", "500 rupaye"
  // Note: standalone k only (not kg or kilo)
  const multiplierRegex =
    /(\d+)\s*(sau|so|hundred|hazaar|hazar|thousand|k(?![a-zA-Z])|lakh|crore|ਸੌ|ਹਜ਼ਾਰ|સો|શો|হাজার|நூறு|ஆயிரம்|వంద|వెయ్యి|ನೂರು|ಸಾವಿರ|നൂറ്|ആയിരം)/iu;
  const multMatch = normalizedText.match(multiplierRegex);
  if (multMatch) {
    const base = parseInt(multMatch[1], 10);
    const multWord = multMatch[2].toLowerCase();
    if (['sau', 'so', 'hundred', 'ਸੌ', 'સો', 'શો', 'நூறு', 'వంద', 'ನೂರು', 'നൂറ്'].includes(multWord)) {
      return base * 100;
    }
    if (['hazaar', 'hazar', 'thousand', 'k', 'ਹਜ਼ਾਰ', 'হাজার', 'ஆயிரம்', 'వెయ్యి', 'ಸಾವಿರ', 'ആയിരം'].includes(multWord)) {
      return base * 1000;
    }
    if (multWord === 'lakh') return base * 100000;
    if (multWord === 'crore') return base * 10000000;
  }

  // 4. Direct multi-word dictionary phrases (e.g. 'ਪੰਜ ਸੌ', 'ಐದು ವಂದಲು')
  for (const phrase of SORTED_PHRASES) {
    const val = MULTILINGUAL_NUMBER_WORDS[phrase];
    if (phrase.includes(' ') || phrase.includes('-')) {
      const reg = new RegExp(`(?:^|[^\p{L}\p{M}])${phrase}(?:$|[^\p{L}\p{M}])`, 'iu');
      if (reg.test(normalizedText)) {
        return val;
      }
    }
  }

  // 5. Standard digits extraction (e.g. ₹500, 500 rs, 500, 5 kg)
  const digitRegex = /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i;
  const digitMatch = normalizedText.match(digitRegex);
  if (digitMatch && digitMatch[1]) {
    const val = parseFloat(digitMatch[1]);
    if (!isNaN(val)) return val;
  }

  // 6. Single number word lookup (e.g. 'પાંચસો', 'पाचशे', 'পাঁচশো', 'ஐந்நூறு', 'ಐನೂರು', 'twenty', 'paanch')
  for (const phrase of SORTED_PHRASES) {
    const val = MULTILINGUAL_NUMBER_WORDS[phrase];
    const reg = new RegExp(`(?:^|[^\p{L}\p{M}])${phrase}(?:$|[^\p{L}\p{M}])`, 'iu');
    if (reg.test(normalizedText)) {
      return val;
    }
  }

  // 7. Token fallback lookup
  for (const token of normalizedText.split(/[\s,]+/)) {
    if (MULTILINGUAL_NUMBER_WORDS[token] !== undefined) {
      return MULTILINGUAL_NUMBER_WORDS[token];
    }
  }

  return null;
}

/**
 * Extracts quantity and item unit from speech text
 */
export function parseMultilingualQuantityAndUnit(text: string): {
  quantity: number | null;
  unit: ItemUnit | null;
} {
  if (!text) return { quantity: null, unit: null };

  const norm = normalizeIndicDigits(text);

  let detectedUnit: ItemUnit | null = null;
  for (const { unit, regex } of UNIT_PATTERNS) {
    if (regex.test(norm)) {
      detectedUnit = unit;
      break;
    }
  }

  // For quantity, if unit exists, strip unit string first so "2 kilo" doesn't parse kilo as multiplier
  let textForQty = norm;
  if (detectedUnit) {
    textForQty = norm.replace(/(?:^|[^\p{L}])(kilo|kg|kgs|kilogram|kilograms|किलो|किलोग्राम|ਕਿਲੋ|કિલ્લો|কেজি|কিলোগ্রাম|கிலோ|కిలో|ಕಿಲೋ|കിലോ)(?:$|[^\p{L}])/iu, ' ');
  }

  const qty = parseMultilingualNumber(textForQty);

  return {
    quantity: qty,
    unit: detectedUnit,
  };
}

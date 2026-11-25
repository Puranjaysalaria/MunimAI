/**
 * Indian-numbering-system (thousand, lakh, crore) number-to-words converter
 * across all 10 supported languages.
 *
 * NOTE: Every non-English/non-Hindi language output is marked `needsNativeReview: true`
 * so native speakers can audit phrasing and regional dialects.
 */

export interface NumberWordsResult {
  text: string;
  usedWords: boolean;
  needsNativeReview: boolean;
}

interface LangNumberLexicon {
  zero: string;
  units: string[];
  teens: string[];
  tens: string[];
  hundred: string;
  thousand: string;
  lakh: string;
  crore: string;
  rupees: string;
  needsNativeReview: boolean;
}

const LEXICONS: Record<string, LangNumberLexicon> = {
  en: {
    zero: 'zero',
    units: ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
    teens: ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'],
    tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
    hundred: 'hundred',
    thousand: 'thousand',
    lakh: 'lakh',
    crore: 'crore',
    rupees: 'rupees',
    needsNativeReview: false,
  },
  hi: {
    zero: 'शून्य',
    units: ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ'],
    teens: ['दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस'],
    tens: ['', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठ', 'सत्तर', 'अस्सी', 'नब्बे'],
    hundred: 'सौ',
    thousand: 'हज़ार',
    lakh: 'लाख',
    crore: 'करोड़',
    rupees: 'रुपये',
    needsNativeReview: false,
  },
  pa: {
    zero: 'ਸਿਫ਼ਰ',
    units: ['', 'ਇੱਕ', 'ਦੋ', 'ਤਿੰਨ', 'ਚਾਰ', 'ਪੰਜ', 'ਛੇ', 'ਸੱਤ', 'ਅੱਠ', 'ਨੌਂ'],
    teens: ['ਦਸ', 'ਗਿਆਰਾਂ', 'ਬਾਰਾਂ', 'ਤੇਰਾਂ', 'ਚੌਦਾਂ', 'ਪੰਦਰਾਂ', 'ਸੋਲਾਂ', 'ਸਤਾਰਾਂ', 'ਅਠਾਰਾਂ', 'ਉੱਨੀ'],
    tens: ['', '', 'ਵੀਹ', 'ਤੀਹ', 'ਚਾਲੀ', 'ਪੰਜਾਹ', 'ਸੱਠ', 'ਸੱਤਰ', 'ਅੱਸੀ', 'ਨੱਬੇ'],
    hundred: 'ਸੌ',
    thousand: 'ਹਜ਼ਾਰ',
    lakh: 'ਲੱਖ',
    crore: 'ਕਰੋੜ',
    rupees: 'ਰੁਪਏ',
    needsNativeReview: true,
  },
  gu: {
    zero: 'શૂન્ય',
    units: ['', 'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ'],
    teens: ['દસ', 'અગિયાર', 'બાર', 'તેર', 'ચૌદ', 'પંદર', 'સોળ', 'સત્તર', 'અઢાર', 'ઓગણીસ'],
    tens: ['', '', 'વીસ', 'ત્રીસ', 'ચાલીસ', 'પચાસ', 'સાઠ', 'સિત્તેર', 'એંસી', 'નેવું'],
    hundred: 'સો',
    thousand: 'હજાર',
    lakh: 'લાખ',
    crore: 'કરોડ',
    rupees: 'રૂપિયા',
    needsNativeReview: true,
  },
  mr: {
    zero: 'शून्य',
    units: ['', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ'],
    teens: ['दहा', 'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'सोळा', 'सतरा', 'अठरा', 'एकोणीस'],
    tens: ['', '', 'वीस', 'तीस', 'चाळीस', 'पन्नास', 'साठ', 'सत्तर', 'ऐंशी', 'नव्वद'],
    hundred: 'शे',
    thousand: 'हजार',
    lakh: 'लाख',
    crore: 'कोटी',
    rupees: 'रुपये',
    needsNativeReview: true,
  },
  bn: {
    zero: 'শূন্য',
    units: ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'],
    teens: ['দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ'],
    tens: ['', '', 'বিশ', 'ত্রিশ', 'চল্লিশ', 'পঞ্চাশ', 'ষাট', 'সত্তর', 'আশি', 'নব্বই'],
    hundred: 'শত',
    thousand: 'হাজার',
    lakh: 'লক্ষ',
    crore: 'কোটি',
    rupees: 'টাকা',
    needsNativeReview: true,
  },
  ta: {
    zero: 'பூஜ்யம்',
    units: ['', 'ஒன்று', 'இரண்டு', 'மூன்று', 'நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது'],
    teens: ['பத்து', 'பதினொன்று', 'பன்னிரண்டு', 'பதின்மூன்று', 'பதினான்கு', 'பதினைந்து', 'பதினாறு', 'பதினேழு', 'பதினெட்டு', 'பத்தொன்பது'],
    tens: ['', '', 'இருபது', 'முப்பது', 'நாற்பது', 'ஐம்பது', 'அறுபது', 'எழுபது', 'எண்பது', 'தொண்ணூறு'],
    hundred: 'நூறு',
    thousand: 'ஆயிரம்',
    lakh: 'லட்சம்',
    crore: 'கோடி',
    rupees: 'ரூபாய்',
    needsNativeReview: true,
  },
  te: {
    zero: 'సున్నా',
    units: ['', 'ఒకటి', 'రెండు', 'మూడు', 'నాలుగు', 'ఐదు', 'ఆరు', 'ఏడు', 'ఎనిమిది', 'తొమ్మిది'],
    teens: ['పది', 'పదకొండు', 'పన్నెండు', 'పదమూడు', 'పద్నాలుగు', 'పదిహేను', 'పదహారు', 'పదిహేడు', 'పద్దెనిమిది', 'పందొమ్మిది'],
    tens: ['', '', 'ఇరవై', 'ముప్పై', 'నలభై', 'యాభై', 'అరవై', 'డెబ్బై', 'ఎనభై', 'తొంభై'],
    hundred: 'వంద',
    thousand: 'వేయి',
    lakh: 'లక్ష',
    crore: 'కోటి',
    rupees: 'రూపాయలు',
    needsNativeReview: true,
  },
  kn: {
    zero: 'ಸೊನ್ನೆ',
    units: ['', 'ಒಂದು', 'ಎರಡು', 'ಮೂರು', 'ನಾಲ್ಕು', 'ಐದು', 'ಆರು', 'ಏಳು', 'ಎಂಟು', 'ಒಂಬತ್ತು'],
    teens: ['ಹತ್ತು', 'ಹನ್ನೊಂದು', 'ಹನ್ನೆರಡು', 'ಹದಿಮೂರು', 'ಹದಿನಾಲ್ಕು', 'ಹದಿನೈದು', 'ಹದಿನಾರು', 'ಹದಿನೇಳು', 'ಹದಿನೆಂಟು', 'ಹತ್ತೊಂಬತ್ತು'],
    tens: ['', '', 'ಇಪ್ಪತ್ತು', 'ಮೂವತ್ತು', 'ನಲವತ್ತು', 'ಐವತ್ತು', 'ಅರವತ್ತು', 'ಎಪ್ಪತ್ತು', 'ಎಂಬತ್ತು', 'ತೊಂಬತ್ತು'],
    hundred: 'ನೂರು',
    thousand: 'ಸಾವಿರ',
    lakh: 'ಲಕ್ಷ',
    crore: 'ಕೋಟಿ',
    rupees: 'ರೂಪಾಯಿ',
    needsNativeReview: true,
  },
  ml: {
    zero: 'പൂജ്യം',
    units: ['', 'ഒന്ന്', 'രണ്ട്', 'മൂന്ന്', 'നാല്', 'അഞ്ച്', 'ആറ്', 'ഏഴ്', 'എട്ട്', 'ഒൻപത്'],
    teens: ['പത്ത്', 'പതിനൊന്ന്', 'പന്ത്രണ്ട്', 'പതിമൂന്ന്', 'പതിനാല്', 'പതിനഞ്ച്', 'പതിനാറ്', 'പതിനേഴ്', 'പതിനെട്ട്', 'പത്തൊൻപത്'],
    tens: ['', '', 'ഇരുപത്', 'മുപ്പത്', 'നാൽപ്പത്', 'അമ്പത്', 'അറുപത്', 'എഴുപത്', 'എൺപത്', 'തൊണ്ണൂറ്'],
    hundred: 'നൂറ്',
    thousand: 'ആയിരം',
    lakh: 'ലക്ഷം',
    crore: 'കോടി',
    rupees: 'രൂപ',
    needsNativeReview: true,
  },
};

function convertTwoDigits(n: number, lex: LangNumberLexicon): string {
  if (n <= 0) return '';
  if (n < 10) return lex.units[n];
  if (n < 20) return lex.teens[n - 10];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? lex.tens[t] : `${lex.tens[t]} ${lex.units[u]}`;
}

function convertBelowThousand(n: number, lex: LangNumberLexicon): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rem = n % 100;
  if (h > 0) {
    parts.push(`${lex.units[h]} ${lex.hundred}`);
  }
  if (rem > 0) {
    parts.push(convertTwoDigits(rem, lex));
  }
  return parts.join(' ').trim();
}

/**
 * Converts any non-negative integer using the Indian numbering system:
 * crores (10^7), lakhs (10^5), thousands (10^3), hundreds (10^2).
 */
export function numberToIndianWords(amount: number, lang: string = 'hi'): NumberWordsResult {
  const code = (lang || 'hi').slice(0, 2);
  const lex = LEXICONS[code] || LEXICONS.hi;
  const rounded = Math.max(0, Math.round(amount));

  if (rounded === 0) {
    return { text: lex.zero, usedWords: true, needsNativeReview: lex.needsNativeReview };
  }

  const parts: string[] = [];
  let rem = rounded;

  const crores = Math.floor(rem / 10_000_000);
  rem %= 10_000_000;
  if (crores > 0) {
    parts.push(`${convertBelowThousand(crores, lex)} ${lex.crore}`);
  }

  const lakhs = Math.floor(rem / 100_000);
  rem %= 100_000;
  if (lakhs > 0) {
    parts.push(`${convertTwoDigits(lakhs, lex)} ${lex.lakh}`);
  }

  const thousands = Math.floor(rem / 1000);
  rem %= 1000;
  if (thousands > 0) {
    parts.push(`${convertTwoDigits(thousands, lex)} ${lex.thousand}`);
  }

  if (rem > 0) {
    parts.push(convertBelowThousand(rem, lex));
  }

  return {
    text: parts.join(' ').replace(/\s+/g, ' ').trim(),
    usedWords: true,
    needsNativeReview: lex.needsNativeReview,
  };
}

/**
 * Backward-compatible helper returning spoken words for an amount.
 */
export function amountToWords(amount: number, lang: string = 'hi'): string {
  return numberToIndianWords(amount, lang).text;
}

/**
 * Formats an amount for TTS playback according to `numbersAsWords`.
 * Only converts to Indian words when `numbersAsWords` is true; otherwise returns digits.
 */
export function formatAmountForSpeech(
  amount: number,
  lang: string,
  numbersAsWords: boolean
): NumberWordsResult {
  const code = (lang || 'hi').slice(0, 2);
  const lex = LEXICONS[code] || LEXICONS.hi;
  const rounded = Math.round(amount);

  if (!numbersAsWords) {
    return {
      text: `${rounded}`,
      usedWords: false,
      needsNativeReview: lex.needsNativeReview,
    };
  }

  return numberToIndianWords(rounded, code);
}

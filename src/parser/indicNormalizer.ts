/**
 * Indic Phonetic Normalizer & Transliterator for Munim AI
 * Handles Devanagari (Hindi) and Gurmukhi (Punjabi) spoken transcripts,
 * mapping them seamlessly to Latin/Hinglish representation for deterministic parsing.
 */

const DEVANAGARI_CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'g', 'ज़': 'z', 'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f'
};

const DEVANAGARI_VOWEL_SIGNS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', 'ः': 'h'
};

const DEVANAGARI_IND_VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au'
};

const GURMUKHI_CONSONANTS: Record<string, string> = {
  'ਸ': 's', 'ਹ': 'h', 'ਕ': 'k', 'ਖ': 'kh', 'ਗ': 'g', 'ਘ': 'gh', 'ਙ': 'ng',
  'ਚ': 'ch', 'ਛ': 'chh', 'ਜ': 'j', 'ਝ': 'jh', 'ਞ': 'ny',
  'ਟ': 't', 'ਠ': 'th', 'ਡ': 'd', 'ਢ': 'dh', 'ਣ': 'n',
  'ਤ': 't', 'ਥ': 'th', 'ਦ': 'd', 'ਧ': 'dh', 'ਨ': 'n',
  'ਪ': 'p', 'ਫ': 'ph', 'ਬ': 'b', 'ਭ': 'bh', 'ਮ': 'm',
  'ਯ': 'y', 'ਰ': 'r', 'ਲ': 'l', 'ਵ': 'v', 'ੜ': 'r',
  'ਸ਼': 'sha', 'ਜ਼': 'z', 'ਫ਼': 'f'
};

const GURMUKHI_VOWEL_SIGNS: Record<string, string> = {
  'ਾ': 'aa', 'ਿ': 'i', 'ੀ': 'ee', 'ੁ': 'u', 'ੂ': 'oo', 'ੇ': 'e', 'ੈ': 'ai', 'ੋ': 'o', 'ੌ': 'au', 'ੰ': 'n', 'ਂ': 'n'
};

const GURMUKHI_IND_VOWELS: Record<string, string> = {
  'ਅ': 'a', 'ਆ': 'aa', 'ਇ': 'i', 'ਈ': 'ee', 'ਉ': 'u', 'ਊ': 'oo', 'ਏ': 'e', 'ਐ': 'ai', 'ਓ': 'o', 'ਔ': 'au'
};

function unicodeWordBoundaryRegex(pattern: string): RegExp {
  return new RegExp(`(?<=^|[^\\p{L}\\p{N}])(${pattern})(?=[^\\p{L}\\p{N}]|$)`, 'gui');
}

export function transliterateIndicToLatin(text: string): string {
  if (!text) return '';

  // 1. Replace Indic numerals with standard 0-9 digits
  const indicDigits: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
    '੦': '0', '੧': '1', '੨': '2', '੩': '3', '੪': '4', '੫': '5', '੬': '6', '੭': '7', '੮': '8', '੯': '9',
  };
  let result = text.replace(/[\u0966-\u096F\u0A66-\u0A6F]/g, (ch) => indicDigits[ch] || ch);

  // 2. High-priority multi-word phrases and domain keywords (Ordered longest/most-specific first)
  const phraseReplacements: [string, string][] = [
    // Multi-word actions & control
    ['लिख दो|लिख दीजिए|लिख दे|लिख देना|लिख लो|ਲਿਖ ਦਿਓ|ਲਿਖ ਦਵੋ', 'likh do'],
    ['खाते में|खाते मे|खाते विच|ਖਾਤੇ ਵਿੱਚ|ਖਾਤੇ ਵਿਚ', 'khate mein'],
    ['पैसे दिए|पैसे जमा|रुपये दिए|ਵਾਪਿਸ ਕੀਤੇ|ਜਮ੍ਹਾਂ ਕੀਤੇ', 'diye'],
    ['वापस करो|हटा दो|रद्द करो|गलत हो गया|ਮੋੜ ਦਿਓ', 'wapas karo'],
    ['हाँ लिख दो|हाँजी|हाँ जी|कर दो|बिल्कुल|ਸਹੀ ਹੈ|ਆਹੋ', 'haan likh do'],
    ['नहीं मत लिखो|मत लिखो|नहीं रुको|ਰੁਕੋ|ਨਾ ਲਿਖੋ', 'nahi'],
    ['याद दिलाओ|तगादा भेजो|पैसे मांगो|ਉਗਰਾਹੀ', 'yaad dilao'],
    ['आज की कमाई|कुल बिक्री|कुल हिसाब|ਅੱਜ ਦੀ ਕਮਾਈ|ਕੁੱਲ ਹਿਸਾਬ', 'kamai'],
    ['सामान मंगवाना|माल मंगवाना|ऑर्डर बनाओ|ਆਰਡਰ ਬਣਾਓ', 'samaan mangwana'],

    // Common customer names
    ['रमेश\\s*शर्मा|ਰਮੇਸ਼\\s*ਸ਼ਰਮਾ', 'ramesh sharma'],
    ['रमेश\\s*कुमार|ਰਮੇਸ਼\\s*ਕੁਮਾਰ', 'ramesh kumar'],
    ['गुरप्रीत\\s*सिंह|ਗੁਰਪ੍ਰੀਤ\\s*ਸਿੰਘ', 'gurpreet singh'],
    ['सुनीता\\s*देवी|ਸੁਨੀਤਾ\\s*ਦੇਵੀ', 'sunita devi'],
    ['हरप्रीत\\s*कौर|ਹਰਪ੍ਰੀਤ\\s*ਕੌਰ', 'harpreet kaur'],
    ['राजेश\\s*वर्मा|ਰਾਜੇਸ਼\\s*ਵਰਮਾ', 'rajesh verma'],
    ['मनोज\\s*गुप्ता|ਮਨੋਜ\\s*ਗੁਪਤਾ', 'manoj gupta'],
    ['रमेश|ਰਮੇਸ਼', 'ramesh'],
    ['शर्मा|ਸ਼ਰਮਾ', 'sharma'],
    ['गुरप्रीत|ਗੁਰਪ੍ਰੀਤ', 'gurpreet'],
    ['सुनीता|ਸੁਨੀਤਾ', 'sunita'],
    ['हरप्रीत|ਹਰਪ੍ਰੀਤ', 'harpreet'],
    ['अमित|ਅਮਿਤ', 'amit'],
    ['राजेश|ਰਾਜੇਸ਼', 'rajesh'],
    ['मनोज|ਮਨੋਜ', 'manoj'],

    // Units
    ['किलो|किग्रा|केजी|ਕਿੱਲੋ|ਕਿਲੋ', 'kilo'],
    ['लीटर|ली|ਲਿਟਰ|ਲੀਟਰ', 'litre'],
    ['ग्राम|ग्रा|ਗ੍ਰਾਮ', 'gram'],
    ['पैकेट|पैकेट्स|पैकिट|ਪੈਕਟ', 'packet'],
    ['डिब्बा|डब्बा|ਡੱਬਾ', 'dabba'],
    ['पीस|नग|ਪੀਸ', 'piece'],
    ['बोरी|कट्टा|ਬੋਰੀ', 'bori'],

    // Common STT mishearings & Kirana Items
    ['चक्की आटा|गेहूँ का आटा|आशीर्वाद आटा', 'aata'],
    ['सरसों का तेल|सरसों तेल|सरसो तेल|रिफाइंड तेल', 'tel'],
    ['चाय पत्ती|टाटा टी|रेड लेबल', 'chai patti'],
    ['सेंधा नमक|काला नमक|टाटा नमक', 'namak'],
    ['हल्दी पाउडर|एवरेस्ट हल्दी', 'haldi'],
    ['पारले जी|पारले-जी|गुड डे', 'biscuit'],
    ['मैगी नूडल्स|2 मिनट मैगी', 'maggi'],
    ['चीनी|चीनि|शक्कर|खांड|मिश्री|ਸ਼ੱਕਰ|ਖੰਡ', 'chini'],
    ['आटा|आट्टा|ਆਟਾ', 'aata'],
    ['दूध|दुध|दही|ਦੁੱਧ|दूर|दूद', 'doodh'],
    ['चावल|चांवल|बासमती|ਚੌਲ', 'chawal'],
    ['दाल|दालें|तूर दाल|अरहर|मूंग|चना|ਦਾਲ', 'dal'],
    ['तेल|ਰਿਫਾਇੰਡ|ਤੇਲ', 'tel'],
    ['चाय|चहा|ਚਾਹ|ਪੱਤੀ', 'chai patti'],
    ['नमक|ਲੂਣ|ਨੂਣ', 'namak'],
    ['साबुन|सर्फ|रिन|ਡਿਟਰਜੈਂਟ|ਸਾਬਣ', 'sabun'],
    ['बिस्कुट|बिस्किट|पारले|ਬਿਸਕੁਟ', 'biscuit'],
    ['हल्दी|मसाला|ਹਲਦੀ', 'haldi'],
    ['मैगी|ਮੈਗੀ', 'maggi'],

    // Fractional Quantities
    ['डेढ़ सौ|ਡੇਢ ਸੌ', 'dedh sau'],
    ['ढाई सौ|ਢਾਈ ਸੌ', 'dhai sau'],
    ['डेढ़|ਡੇਢ', 'dedh'],
    ['ढाई|ਢਾਈ', 'dhai'],
    ['आधा|ਅੱਧਾ', 'aadha'],
    ['पाव|ਪਾਓ', 'paav'],

    // Numbers
    ['एक|ਇੱਕ', 'ek'],
    ['दो|ਦੋ', 'do'],
    ['तीन|ਤਿੰਨ', 'teen'],
    ['चार|ਚਾਰ', 'chaar'],
    ['पांच|पाँच|ਪੰਜ', 'paanch'],
    ['छह|छः|ਛੇ', 'cheh'],
    ['सात|ਸੱਤ', 'saat'],
    ['आठ|ਅੱਠ', 'aath'],
    ['नौ|ਨੌਂ', 'nau'],
    ['दस|ਦੱਸ', 'das'],
    ['ग्यारह|ਗਿਆਰਾਂ', 'gyarah'],
    ['बारह|ਬਾਰਾਂ', 'barah'],
    ['तेरह|ਤੇਰਾਂ', 'terah'],
    ['चौदह|ਚੌਦਾਂ', 'chaudah'],
    ['पंद्रह|ਪੰਦਰਾਂ', 'pandrah'],
    ['सोलह|ਸੋਲ੍ਹਾਂ', 'solah'],
    ['सत्रह|ਸਤਾਰਾਂ', 'satrah'],
    ['अठारह|ਅਠਾਰਾਂ', 'atharah'],
    ['उन्नीस|ਉੱਨੀ', 'unnees'],
    ['बीस|ਵੀਹ', 'bees'],
    ['पच्चीस|ਪੰਚੀ', 'pachees'],
    ['तीस|ਤੀਹ', 'tees'],
    ['पैंतीस|ਪੈਂਤੀ', 'paitees'],
    ['चालीस|ਚਾਲੀ', 'chalees'],
    ['पचास|ਪੰਜਾਹ', 'pachaas'],
    ['साठ|ਸੱਠ', 'saath'],
    ['सत्तर|ਸੱਤਰ', 'sattar'],
    ['अस्सी|ਅੱਸੀ', 'assi'],
    ['नब्बे|ਨੱਬੇ', 'nabbe'],
    ['सौ|ਸੌ', 'sau'],
    ['हज़ार|हजार|ਹਜ਼ਾਰ', 'hazaar'],

    // Single-word connectors & intents
    ['को|ਨੂੰ', 'ko'],
    ['ने|ਨੇ', 'ne'],
    ['और|ਤੇ', 'aur'],
    ['उधार|ਨਾਮੇ|ਉਧਾਰ', 'udhaar'],
    ['जमा|ਦਿੱਤੇ', 'jama'],
    ['दिए|दिया', 'diye'],
    ['हाँ|हां|ਆਹੋ', 'haan'],
    ['नहीं|ਨਾ', 'nahi'],
    ['रुक|रुको', 'ruko'],
    ['स्टॉक|ਮੁੱਕ', 'stock'],
  ];

  for (const [pattern, replacement] of phraseReplacements) {
    result = result.replace(unicodeWordBoundaryRegex(pattern), replacement);
  }

  // 3. Phonetically transliterate any remaining unknown Devanagari or Gurmukhi words
  result = result.replace(/[\u0900-\u097F]+/g, (word) => {
    let translit = '';
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (DEVANAGARI_IND_VOWELS[ch]) {
        translit += DEVANAGARI_IND_VOWELS[ch];
      } else if (DEVANAGARI_CONSONANTS[ch]) {
        const next = word[i + 1];
        if (next === '्') {
          // Virama / Halant - suppress inherent vowel
          translit += DEVANAGARI_CONSONANTS[ch];
          i++;
        } else if (DEVANAGARI_VOWEL_SIGNS[next]) {
          translit += DEVANAGARI_CONSONANTS[ch] + DEVANAGARI_VOWEL_SIGNS[next];
          i++;
        } else {
          // Inherent 'a'
          translit += DEVANAGARI_CONSONANTS[ch] + (i === word.length - 1 ? '' : 'a');
        }
      } else if (DEVANAGARI_VOWEL_SIGNS[ch]) {
        translit += DEVANAGARI_VOWEL_SIGNS[ch];
      }
    }
    return translit || word;
  });

  result = result.replace(/[\u0A00-\u0A7F]+/g, (word) => {
    let translit = '';
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (GURMUKHI_IND_VOWELS[ch]) {
        translit += GURMUKHI_IND_VOWELS[ch];
      } else if (GURMUKHI_CONSONANTS[ch]) {
        const next = word[i + 1];
        if (next === '੍' || next === 'ੱ') {
          translit += GURMUKHI_CONSONANTS[ch];
          i++;
        } else if (GURMUKHI_VOWEL_SIGNS[next]) {
          translit += GURMUKHI_CONSONANTS[ch] + GURMUKHI_VOWEL_SIGNS[next];
          i++;
        } else {
          translit += GURMUKHI_CONSONANTS[ch] + (i === word.length - 1 ? '' : 'a');
        }
      } else if (GURMUKHI_VOWEL_SIGNS[ch]) {
        translit += GURMUKHI_VOWEL_SIGNS[ch];
      }
    }
    return translit || word;
  });

  // Clean trailing punctuation and multiple spaces
  return result.replace(/[।.,?!]/g, ' ').replace(/\s+/g, ' ').trim();
}

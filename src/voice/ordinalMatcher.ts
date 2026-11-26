import type { Customer } from '../types/schema';

const EXPLICIT_ORDINAL_PATTERNS: Array<{ index: number; pattern: RegExp }> = [
  {
    index: 0,
    pattern:
      /(?:^|\b)(?:1st|first(?:\s*one)?|(?:number|option|no\.?)\s*(?:1|one)|pehla(?:\s*wala)?|pahla|पहला|पहिला|ਪਹਿਲਾ|પહેલું|প্রথম|முதல்|మొదటి|ಮೊದಲ|ആദ്യത്തെ)(?:\b|$)/i,
  },
  {
    index: 1,
    pattern:
      /(?:^|\b)(?:2nd|second(?:\s*one)?|(?:number|option|no\.?)\s*(?:2|two)|doosra(?:\s*wala)?|dusra|दूसरा|दुसरा|ਦੂਜਾ|ਬੀજું|দ্বিতীয়|இரண்டாவது|రెండవ|ಎರಡನೇ|രണ്ടാമത്തെ)(?:\b|$)/i,
  },
  {
    index: 2,
    pattern:
      /(?:^|\b)(?:3rd|third(?:\s*one)?|(?:number|option|no\.?)\s*(?:3|three)|teesra(?:\s*wala)?|tisra|तीसरा|तिसरा|ਤੀਜਾ|ત્રીજું|তৃতীয়|மூன்றாவது|మూడవ|ಮೂರನೇ|മൂന്നാമത്തെ)(?:\b|$)/i,
  },
  {
    index: 3,
    pattern:
      /(?:^|\b)(?:4th|fourth(?:\s*one)?|(?:number|option|no\.?)\s*(?:4|four)|chautha(?:\s*wala)?|चौथा|ਚੌਥਾ|ચોથું|চতুর্থ|நான்காவது|నాలుగవ|ನಾಲ್ಕನೇ|നാലാമത്തെ)(?:\b|$)/i,
  },
  {
    index: 4,
    pattern:
      /(?:^|\b)(?:5th|fifth(?:\s*one)?|(?:number|option|no\.?)\s*(?:5|five)|paanchva(?:\s*wala)?|panchwa|पांचवा|पाँचवाँ|ਪੰਜਵਾਂ|પાંચમું|পঞ্চম|ஐந்தாவது|ఐదవ|ಐದನೇ|അഞ്ചാമത്തെ)(?:\b|$)/i,
  },
];

const STANDALONE_CARDINAL_PATTERNS: Array<{ index: number; pattern: RegExp }> = [
  { index: 0, pattern: /^(?:1|one|ek|एक|ਇੱਕ)$/i },
  { index: 1, pattern: /^(?:2|two|do|दो|ਦੋ)$/i },
  { index: 2, pattern: /^(?:3|three|teen|तीन|ਤਿੰਨ)$/i },
  { index: 3, pattern: /^(?:4|four|chaar|चार|ਚਾਰ)$/i },
  { index: 4, pattern: /^(?:5|five|paanch|पांच|ਪੰਜ)$/i },
];

/**
 * Resolves a spoken ordinal/number selection ("second one", "2nd", "doosra", "option 2")
 * against a list of disambiguation candidates.
 */
export function resolveOrdinalSelection<T>(text: string, candidates: T[]): T | undefined {
  if (!text || candidates.length === 0) return undefined;
  const trimmed = text.trim();
  for (const { index, pattern } of EXPLICIT_ORDINAL_PATTERNS) {
    if (index < candidates.length && pattern.test(trimmed)) {
      return candidates[index];
    }
  }
  for (const { index, pattern } of STANDALONE_CARDINAL_PATTERNS) {
    if (index < candidates.length && pattern.test(trimmed)) {
      return candidates[index];
    }
  }
  return undefined;
}

/**
 * Formats a numbered spoken prompt for customer disambiguation so the user
 * knows which person is "first", "second", etc.
 */
export function buildNumberedCustomerPrompt(customers: Customer[], language: string): string {
  const listed = customers
    .slice(0, 5)
    .map((c, idx) => `${idx + 1}. ${c.name}${c.address_note ? `, ${c.address_note}` : ''}`)
    .join('. ');
  if (language === 'en') return `${listed}. Which one?`;
  if (language === 'pa') return `${listed}. ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ?`;
  return `${listed}. इनमें से कौनसा?`;
}

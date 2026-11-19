import { ParseResultSchema, ValidatedParseResult } from './types';
import { parseWithRules } from './ruleParser';
import { Customer, Item, ParseResult } from '../types/schema';

export * from './types';
export * from './numbers';
export * from './synonyms';
export * from './ruleParser';

/**
 * Main parser entry point for Munim AI
 * Coordinates LLM Edge Function -> Offline Rule-Based Fallback -> Disambiguation Checks.
 */
export async function parseSpeech(
  rawText: string,
  context: {
    customers: Customer[];
    items: Item[];
    isOnline?: boolean;
    language?: string;
  }
): Promise<ParseResult> {
  let result: ValidatedParseResult;

  // 1. Try offline rule parser first or when offline
  result = parseWithRules(rawText, {
    customers: context.customers,
    items: context.items,
    preferredLanguage: context.language,
  });

  // Validate with Zod schema
  const validated = ParseResultSchema.safeParse(result);
  const cleanResult: ValidatedParseResult = validated.success ? validated.data : result;

  // 2. Customer Disambiguation Check ("Kaunsa Ramesh?")
  let matchedCustomer: Customer | null = null;
  let ambiguousCustomers: Customer[] = [];
  let questionToAsk: string | null = cleanResult.questionToAsk || null;
  let spokenReply = cleanResult.spokenReply || '';

  if (cleanResult.customer) {
    const query = cleanResult.customer.trim().toLowerCase();

    // Exact full name match
    const exactMatches = context.customers.filter(
      (c) => c.name.toLowerCase() === query
    );

    if (exactMatches.length === 1) {
      matchedCustomer = exactMatches[0];
    } else {
      // Partial or first name match (e.g. "Ramesh" matching "Ramesh Sharma" and "Ramesh Kumar")
      const partialMatches = context.customers.filter((c) => {
        const nameParts = c.name.toLowerCase().split(' ');
        return nameParts.includes(query) || c.name.toLowerCase().includes(query);
      });

      if (partialMatches.length > 1) {
        // Disambiguation needed!
        ambiguousCustomers = partialMatches;
        matchedCustomer = null;
        questionToAsk =
          context.language === 'en'
            ? `Which ${cleanResult.customer}?`
            : `Kaunsa ${cleanResult.customer}?`;
        spokenReply =
          context.language === 'en'
            ? `Which ${cleanResult.customer}? ${partialMatches.map((c) => `${c.name} (${c.address_note || ''})`).join(' or ')}`
            : context.language === 'pa'
            ? `ਕਿਹੜਾ ${cleanResult.customer}? ${partialMatches.map((c) => `${c.name} (${c.address_note || ''})`).join(' ਜਾਂ ')}`
            : `कौनसा ${cleanResult.customer}? ${partialMatches.map((c) => `${c.name} (${c.address_note || ''})`).join(' या ')}`;
      } else if (partialMatches.length === 1) {
        matchedCustomer = partialMatches[0];
      } else {
        // Unknown customer check
        questionToAsk =
          context.language === 'en'
            ? `Is ${cleanResult.customer} a new customer? Save name?`
            : `Naya customer ${cleanResult.customer} hai? Naam save karoon?`;
        spokenReply =
          context.language === 'en'
            ? `Is ${cleanResult.customer} a new customer? Save name?`
            : context.language === 'pa'
            ? `ਨਵਾਂ ਗਾਹਕ ${cleanResult.customer} ਹੈ? ਨਾਮ ਜੋੜਾਂ?`
            : `नया ग्राहक ${cleanResult.customer} है? नाम जोड़ूँ?`;
      }
    }
  }

  // 3. Item resolution
  let matchedItem: Item | null = null;
  if (cleanResult.item && context.items) {
    const itemQuery = cleanResult.item.toLowerCase();
    matchedItem =
      context.items.find(
        (it) =>
          it.name.toLowerCase() === itemQuery ||
          it.synonyms.some((s) => s.toLowerCase() === itemQuery)
      ) || null;
  }

  return {
    ...cleanResult,
    matchedCustomer,
    ambiguousCustomers,
    matchedItem,
    questionToAsk,
    spokenReply,
  };
}

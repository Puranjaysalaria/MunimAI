import { ParseResultSchema } from './types';
import { parseWithRules } from './ruleParser';
import { Customer, Item, ParseResult, ParsedIntent } from '../types/schema';
import { LanguageCode } from '../i18n/types';
import { routeVoiceIntent } from '../voice/intentRouter';
import { resolveCrossScriptCustomer, resolveCrossScriptItem, cleanCustomerQuery } from '../voice/crossScriptMatcher';

export * from './types';
export * from './numbers';
export * from './synonyms';
export * from './ruleParser';

/**
 * Main parser entry point for Munim AI
 * Coordinates Hybrid Multilingual Router -> Offline Rule-Based Fallback -> Disambiguation Checks.
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
  const activeLang = (context.language as LanguageCode) || 'hi';

  // 1. Try rule parser first for established transactional, price, and navigation commands
  const ruleRes = parseWithRules(rawText, {
    customers: context.customers,
    items: context.items,
    preferredLanguage: context.language,
  });

  const multilingualOverrideIntents: ParsedIntent[] = [
    'show_low_stock',
    'order_item',
    'build_order_list',
    'send_order',
    'top_debtors',
    'monthly_credit_summary',
    'next',
    'previous',
    'repeat',
    'back',
    'close',
    'play_proof',
  ];

  const isLowStockQuery = /(low\s*stock|kam\s*stock|khatam\s*stock|ghatt\s*stock|show\s*low)/i.test(rawText);

  let result: ParseResult;
  if (
    ruleRes.intent !== 'unknown' &&
    !multilingualOverrideIntents.includes(ruleRes.intent) &&
    !(ruleRes.intent === 'stock' && isLowStockQuery) &&
    ruleRes.confidence >= 0.8
  ) {
    result = ruleRes;
  } else {
    // 2. Multilingual hybrid router for all 10 Indic languages and new voice intents
    const routed = await routeVoiceIntent(rawText, {
      language: activeLang,
      customers: context.customers,
      items: context.items,
      isOnline: context.isOnline,
    });
    result = routed.intent !== 'unknown' ? routed : ruleRes;
  }

  // Validate with Zod schema
  const validated = ParseResultSchema.safeParse(result);
  const cleanResult: ParseResult = validated.success ? { ...result, ...validated.data } : result;

  // 2. Customer Disambiguation Check with Cross-Script Matching ("Kaunsa Ramesh?")
  let matchedCustomer: Customer | null = result.matchedCustomer || null;
  let ambiguousCustomers: Customer[] = result.ambiguousCustomers || [];
  let questionToAsk: string | null = cleanResult.questionToAsk || null;
  let spokenReply = cleanResult.spokenReply || '';

  const rawCandidate = cleanResult.customer || (cleanResult.intent === 'show_customer_ledger' ? rawText : null);
  if (rawCandidate) {
    const queryCust = cleanCustomerQuery(rawCandidate) || rawCandidate;
    const crossMatch = resolveCrossScriptCustomer(queryCust, context.customers);

    if (crossMatch.matchedCustomer) {
      matchedCustomer = crossMatch.matchedCustomer;
      cleanResult.customer = crossMatch.matchedCustomer.name;
    } else if (crossMatch.ambiguousCustomers.length > 1) {
      ambiguousCustomers = crossMatch.ambiguousCustomers;
      matchedCustomer = null;
      const cleanCandidate = cleanCustomerQuery(queryCust) || queryCust;
      questionToAsk =
        context.language === 'en'
          ? `Which ${cleanCandidate}?`
          : `Kaunsa ${cleanCandidate}?`;
      spokenReply =
        context.language === 'en'
          ? `Which ${cleanCandidate}? ${ambiguousCustomers.map((c) => `${c.name} (${c.address_note || ''})`).join(' or ')}`
          : context.language === 'pa'
          ? `ਕਿਹੜਾ ${cleanCandidate}? ${ambiguousCustomers.map((c) => `${c.name} (${c.address_note || ''})`).join(' ਜਾਂ ')}`
          : `कौनसा ${cleanCandidate}? ${ambiguousCustomers.map((c) => `${c.name} (${c.address_note || ''})`).join(' या ')}`;
    } else if (cleanResult.customer) {
      if (cleanResult.intent === 'show_customer_ledger') {
        const cleanCandidate = cleanCustomerQuery(queryCust) || queryCust;
        spokenReply =
          context.language === 'en'
            ? `Customer ${cleanCandidate} not found in ledger`
            : context.language === 'pa'
            ? `ਗਾਹਕ ${cleanCandidate} ਖਾਤੇ ਵਿੱਚ ਨਹੀਂ ਮਿਲਿਆ`
            : `ग्राहक ${cleanCandidate} खाते में नहीं मिला`;
        questionToAsk = null;
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

  // 3. Item resolution with cross-script matcher
  let matchedItem: Item | null = result.matchedItem || null;
  if (cleanResult.item && context.items) {
    const itemMatch = resolveCrossScriptItem(cleanResult.item, context.items);
    matchedItem = itemMatch.matchedItem;
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

import { Customer, Transaction } from '../types/schema';
import { LanguageCode } from '../i18n/types';
import { resolveCrossScriptCustomer } from './crossScriptMatcher';
import { findMentionedItems } from '../parser/synonyms';
import { parseMultilingualNumber } from './multilingualNumbers';
import { transliterateIndicToLatin } from '../parser/indicNormalizer';
import { getEffectiveTransactions } from '../lib/correctionService';

export interface EntryResolutionQuery {
  rawText: string;
  customerName?: string | null;
  matchedCustomer?: Customer | null;
  targetAmount?: number | null;
  itemName?: string | null;
  timeframe?: 'today' | 'yesterday' | 'this_week' | 'month' | null;
  selectedTransactionId?: string | null;
}

export type EntryResolutionResult =
  | { status: 'resolved'; entry: Transaction; reason: string }
  | { status: 'ambiguous'; candidates: Transaction[]; question: string }
  | { status: 'not_found'; message: string };

function isSameCalendarDay(isoA: string, dateB: Date): boolean {
  const d = new Date(isoA);
  return (
    d.getFullYear() === dateB.getFullYear() &&
    d.getMonth() === dateB.getMonth() &&
    d.getDate() === dateB.getDate()
  );
}

/**
 * Extracts a target/old amount when the user says e.g.
 * "Ramesh ki 500 wali entry badlo" or "600 nahi 500 kar do".
 */
function extractTargetAmountFromQuery(rawText: string): number | null {
  // Check "X wala / wali / wale"
  const walaMatch = rawText.match(/(\d+(?:\.\d+)?)\s*(?:wala|wali|wale|rupaye\s*wali|रुपये\s*वाली|वाला|वाली)/iu);
  if (walaMatch) return Number(walaMatch[1]);

  // Check "X nahi Y" -> X is the old/target amount
  const nahiMatch = rawText.match(/(\d+(?:\.\d+)?)\s+(?:nahi|nahin|नहीं|ਨਹੀਂ)\s+(\d+(?:\.\d+)?)/iu);
  if (nahiMatch) return Number(nahiMatch[1]);

  // Check "from X to Y"
  const fromToMatch = rawText.match(/\bfrom\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/i);
  if (fromToMatch) return Number(fromToMatch[1]);

  return null;
}

/**
 * Resolves which saved Transaction the shopkeeper wants to edit.
 * Priority:
 * 1. Explicit selectedTransactionId (context)
 * 2. Filters by customer, target amount, item, and/or date
 * 3. Default to most recent active entry ONLY if no specific filter was given
 *    or user explicitly asked for last/recent ("pichhli", "aakhri", "last").
 * Never guesses when multiple entries match a filter!
 */
export function resolveTargetEntry(
  query: EntryResolutionQuery,
  transactions: Transaction[],
  customers: Customer[],
  language: LanguageCode = 'hi'
): EntryResolutionResult {
  // Use only currently effective transactions (excludes reversals & superseded versions)
  const activeEntries = [...getEffectiveTransactions(transactions)].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (activeEntries.length === 0) {
    return {
      status: 'not_found',
      message:
        language === 'en'
          ? 'No entries found to edit.'
          : language === 'pa'
          ? 'ਬਦਲਣ ਲਈ ਕੋਈ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ।'
          : 'बदलने के लिए कोई एंट्री नहीं मिली।',
    };
  }

  // 1. Explicit UI selection context
  if (query.selectedTransactionId) {
    const exact = activeEntries.find((tx) => tx.id === query.selectedTransactionId);
    if (exact) {
      return { status: 'resolved', entry: exact, reason: 'context_selected' };
    }
  }

  const lower = transliterateIndicToLatin(query.rawText).toLowerCase();

  // Explicit "last / most recent" keyword
  const asksForLast =
    /\b(last|latest|recent|pichhli|pichli|aakhri|akhri|abhi\s*wali|पिछली|आखिरी|अभी\s*वाली|ਪਿਛਲੀ|ਆਖਰੀ)\b/iu.test(
      query.rawText
    );

  // Detect filters
  let customerFilter: Customer | null = query.matchedCustomer || null;
  let ambiguousCustomerMatch = false;

  if (!customerFilter) {
    const cleaned = query.rawText
      .replace(/\b(edit|change|update|badlo|badal\s*do|sudharo|entry|amount|raqam|item|date|note|ki|ka|ke|wala|wali|ko|from|to|the|last|recent)\b/gi, ' ')
      .trim();
    if (query.customerName) {
      const res = resolveCrossScriptCustomer(query.customerName, customers);
      if (res.matchedCustomer) customerFilter = res.matchedCustomer;
      else if (res.ambiguousCustomers.length > 1) ambiguousCustomerMatch = true;
    } else if (cleaned.length >= 2) {
      const res = resolveCrossScriptCustomer(cleaned, customers);
      if (res.matchedCustomer) customerFilter = res.matchedCustomer;
      else if (res.ambiguousCustomers.length > 1) ambiguousCustomerMatch = true;
    }
  }

  const targetAmount = query.targetAmount ?? extractTargetAmountFromQuery(query.rawText);
  const mentionedItems = findMentionedItems(query.rawText);
  const itemFilter = query.itemName || (mentionedItems.length > 0 ? mentionedItems[0].canonical : null);

  let dateFilter: 'today' | 'yesterday' | null =
    query.timeframe === 'today' || query.timeframe === 'yesterday' ? query.timeframe : null;
  if (!dateFilter) {
    if (/\b(aaj|today|आज|ਅੱਜ)\b/iu.test(query.rawText)) dateFilter = 'today';
    else if (/\b(kal|yesterday|कल|ਬੀਤਾ\s*ਕੱਲ੍ਹ)\b/iu.test(query.rawText)) dateFilter = 'yesterday';
  }

  const hasAnyFilter = Boolean(customerFilter || ambiguousCustomerMatch || targetAmount || itemFilter || dateFilter);

  // If no filter at all (e.g., "change amount to 600" or "pichhli entry badlo"), default to most recent
  if (!hasAnyFilter || (asksForLast && !customerFilter && !targetAmount && !itemFilter)) {
    return { status: 'resolved', entry: activeEntries[0], reason: 'most_recent_default' };
  }

  let matches = [...activeEntries];

  if (customerFilter) {
    matches = matches.filter((tx) => tx.customer_id === customerFilter!.id);
  } else if (ambiguousCustomerMatch) {
    // Match any customer whose name collides
    const matchingCustIds = customers
      .filter((c) => lower.includes(c.name.split(' ')[0].toLowerCase()))
      .map((c) => c.id);
    if (matchingCustIds.length > 0) {
      matches = matches.filter((tx) => tx.customer_id && matchingCustIds.includes(tx.customer_id));
    }
  }

  if (targetAmount !== null) {
    matches = matches.filter((tx) => Number(tx.amount) === targetAmount);
  }

  if (itemFilter) {
    const itemLower = itemFilter.toLowerCase();
    matches = matches.filter((tx) =>
      tx.items?.some((it) => it.name.toLowerCase().includes(itemLower))
    );
  }

  if (dateFilter === 'today') {
    const today = new Date();
    matches = matches.filter((tx) => isSameCalendarDay(tx.created_at, today));
  } else if (dateFilter === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    matches = matches.filter((tx) => isSameCalendarDay(tx.created_at, yesterday));
  }

  if (matches.length === 0) {
    return {
      status: 'not_found',
      message:
        language === 'en'
          ? 'Could not find a matching entry to edit.'
          : language === 'pa'
          ? 'ਇਸ ਵੇਰਵੇ ਨਾਲ ਕੋਈ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ।'
          : 'इस विवरण से मिलती कोई एंट्री नहीं मिली।',
    };
  }

  if (matches.length === 1 || asksForLast) {
    return { status: 'resolved', entry: matches[0], reason: 'filtered_unique' };
  }

  // Multiple entries match -> NEVER guess! Ask one short question and show cards
  const question =
    language === 'en'
      ? `Found ${matches.length} matching entries. Which one do you want to edit?`
      : language === 'pa'
      ? `${matches.length} ਐਂਟਰੀਆਂ ਮਿਲੀਆਂ। ਕਿਹੜੀ ਬਦਲਣੀ ਹੈ?`
      : `${matches.length} एंट्रियाँ मिलीं। कौनसी बदलनी है?`;

  return {
    status: 'ambiguous',
    candidates: matches.slice(0, 5),
    question,
  };
}

/**
 * Parses the new replacement value from a saved-entry edit utterance,
 * e.g. "Ramesh ki 500 wali entry 600 kar do" -> newAmount: 600.
 */
export function extractNewEditValue(
  rawText: string,
  intent: string
): {
  newAmount?: number;
  newQuantity?: number;
  newItem?: string;
  newNote?: string;
  newDate?: string;
} {
  // Check "X nahi Y"
  const nahiMatch = rawText.match(/(\d+(?:\.\d+)?)\s+(?:nahi|nahin|नहीं|ਨਹੀਂ)\s+(\d+(?:\.\d+)?)/iu);
  if (nahiMatch) {
    return intent === 'change_quantity'
      ? { newQuantity: Number(nahiMatch[2]) }
      : { newAmount: Number(nahiMatch[2]) };
  }

  // Check "to Y" / "Y kar do"
  const toMatch = rawText.match(/(?:to|se|ko|into)\s+(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:kar\s*do|badal\s*do|कर\s*दो|बदल\s*दो|ਕਰ\s*ਦਿਓ)/iu);
  if (toMatch) {
    const val = Number(toMatch[1] || toMatch[2]);
    if (intent === 'change_quantity') return { newQuantity: val };
    return { newAmount: val };
  }

  const num = parseMultilingualNumber(rawText);
  if (num !== null && num > 0) {
    if (intent === 'change_quantity') return { newQuantity: num };
    if (intent === 'change_amount' || intent === 'edit_entry') return { newAmount: num };
  }

  if (intent === 'change_date') {
    if (/\b(kal|yesterday|कल)\b/iu.test(rawText)) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return { newDate: d.toISOString() };
    }
    if (/\b(aaj|today|आज)\b/iu.test(rawText)) {
      return { newDate: new Date().toISOString() };
    }
  }

  if (intent === 'edit_note') {
    const cleaned = rawText
      .replace(/(?:edit|change|update|add|badlo|jodo|note|remark|tippani|नोट|बदलो|जोड़ो|ਨੋਟ)/gi, '')
      .trim();
    if (cleaned) return { newNote: cleaned };
  }

  const items = findMentionedItems(rawText);
  if (items.length > 0) {
    return { newItem: items[items.length - 1].canonical };
  }

  return {};
}

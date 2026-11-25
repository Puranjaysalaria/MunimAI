import { LanguageCode } from '../i18n/types';
import { Customer, Item, ParseResult } from '../types/schema';
import { parseMultilingualNumber, parseMultilingualQuantityAndUnit } from './multilingualNumbers';
import { resolveCrossScriptCustomer, resolveCrossScriptItem, cleanCustomerQuery } from './crossScriptMatcher';
import { INTENT_TABLES } from './intents';
import { classifyWithLLM } from './llmIntentClassifier';

export interface IntentRouterOptions {
  language?: LanguageCode;
  customers?: Customer[];
  items?: Item[];
  isOnline?: boolean;
}

/**
 * Shared Hybrid Intent Router for DukaanAI
 * Implements: Fast phrase matching per language -> Secondary English/Hindi fallback -> Server LLM Intent Classifier.
 */
export async function routeVoiceIntent(
  rawText: string,
  options: IntentRouterOptions = {}
): Promise<ParseResult> {
  const language = options.language || 'hi';
  const customers = options.customers || [];
  const items = options.items || [];
  const trimmed = rawText.trim();

  // Noise / empty check
  if (trimmed.length < 2 || /^(\.|\?|\!|\s)+$/.test(trimmed)) {
    return {
      intent: 'unknown',
      confidence: 0.1,
      language,
      rawText: trimmed,
      spokenReply:
        language === 'en'
          ? 'Voice was not clear, please speak again'
          : language === 'pa'
          ? 'ਆਵਾਜ਼ ਸਾਫ਼ ਨਹੀਂ ਆਈ, ਮੁੜ ਬੋਲੋ'
          : 'आवाज़ साफ़ नहीं आई, फिर से बोलिए',
      questionToAsk: 'Awaaz saaf nahi aayi, phir se boliye',
    };
  }

  const primaryTable = INTENT_TABLES[language] || INTENT_TABLES.hi;
  const lower = trimmed.toLowerCase();

  // 1. Check Confirmations & Undo
  // "Nahi ruko cancel" starts with "nahi", so confirm_no takes precedence when explicitly starting with negative
  if (
    lower.startsWith('nahi') ||
    lower.startsWith('na ') ||
    lower.startsWith('no ') ||
    lower === 'nahi' ||
    lower === 'no' ||
    lower === 'ਨਹੀਂ' ||
    lower.startsWith('ਨਹੀਂ ') ||
    lower === 'ਨਾ' ||
    lower.startsWith('ਨਾ ') ||
    lower === 'ना' ||
    lower.startsWith('ना ') ||
    lower.startsWith('नहीं') ||
    lower.startsWith('இல்லை') ||
    lower.startsWith('కాదు') ||
    lower.startsWith('ಇಲ್ಲ') ||
    lower.startsWith('അല്ല')
  ) {
    return {
      intent: 'confirm_no',
      confidence: 0.96,
      language,
      rawText: trimmed,
    };
  }

  // Check Undo ("Wapas karo", "wapis mod do" and regional equivalents)
  if (
    primaryTable.undoKeywords.some((k) => lower.includes(k.toLowerCase())) ||
    INTENT_TABLES.hi.undoKeywords.some((k) => lower.includes(k.toLowerCase())) ||
    INTENT_TABLES.en.undoKeywords.some((k) => lower.includes(k.toLowerCase()))
  ) {
    return {
      intent: 'undo',
      confidence: 0.98,
      language,
      rawText: trimmed,
    };
  }

  // Check Yes
  if (
    primaryTable.yesKeywords.some(
      (k) => lower === k.toLowerCase() || lower.startsWith(k.toLowerCase() + ' ')
    ) ||
    INTENT_TABLES.hi.yesKeywords.some((k) => lower === k.toLowerCase()) ||
    INTENT_TABLES.en.yesKeywords.some((k) => lower === k.toLowerCase())
  ) {
    return {
      intent: 'confirm_yes',
      confidence: 0.95,
      language,
      rawText: trimmed,
    };
  }

  // 2. Extract numbers, quantity, and unit
  const amount = parseMultilingualNumber(trimmed);
  const { quantity, unit } = parseMultilingualQuantityAndUnit(trimmed);

  // 3. Match against primary language phrase table
  for (const item of primaryTable.intents) {
    for (const pattern of item.patterns) {
      if (pattern.test(trimmed)) {
        let count: number | null = null;
        if (item.extractCount) {
          const countMatch = trimmed.match(/\b(\d+)\b/);
          count = countMatch ? parseInt(countMatch[1], 10) : amount || 5;
        }

        let targetTab: 'home' | 'ledger' | 'stock' | 'today' | 'bill_scan' | null = null;
        if (item.intent === 'open_bill_scan') targetTab = 'bill_scan';
        else if (item.intent === 'open_stock' || item.intent === 'show_low_stock' || item.intent === 'build_order_list' || item.intent === 'order_item') targetTab = 'stock';
        else if (item.intent === 'open_ledger' || item.intent === 'show_customer_ledger' || item.intent === 'top_debtors') targetTab = 'ledger';
        else if (item.intent === 'open_today' || item.intent === 'recent_transactions' || item.intent === 'monthly_credit_summary') targetTab = 'today';

        let candidateCustomer: string | undefined = undefined;
        let matchedCustomerObj: Customer | null = null;
        let ambigCusts: Customer[] | undefined = undefined;

        if (item.intent === 'show_customer_ledger') {
          const cleanCust = cleanCustomerQuery(trimmed);
          if (cleanCust) {
            candidateCustomer = cleanCust;
            const res = resolveCrossScriptCustomer(cleanCust, customers);
            if (res.matchedCustomer) {
              matchedCustomerObj = res.matchedCustomer;
              candidateCustomer = res.matchedCustomer.name;
            } else if (res.ambiguousCustomers.length > 1) {
              ambigCusts = res.ambiguousCustomers;
            }
          }
        }

        return {
          intent: item.intent,
          confidence: item.confidence || 0.9,
          customer: candidateCustomer,
          matchedCustomer: matchedCustomerObj,
          ambiguousCustomers: ambigCusts,
          language,
          rawText: trimmed,
          targetTab,
          count,
          timeframe: item.timeframe || null,
          amount,
          quantity,
          unit,
        };
      }
    }
  }

  // 4. Secondary fallback: English common words & Hindi/Hinglish patterns
  if (language !== 'en') {
    for (const item of INTENT_TABLES.en.intents) {
      for (const pattern of item.patterns) {
        if (pattern.test(trimmed)) {
          let targetTab: 'home' | 'ledger' | 'stock' | 'today' | 'bill_scan' | null = null;
          if (item.intent === 'open_bill_scan') targetTab = 'bill_scan';
          else if (item.intent === 'open_stock' || item.intent === 'show_low_stock' || item.intent === 'build_order_list' || item.intent === 'order_item') targetTab = 'stock';
          else if (item.intent === 'open_ledger' || item.intent === 'show_customer_ledger' || item.intent === 'top_debtors') targetTab = 'ledger';
          else if (item.intent === 'open_today' || item.intent === 'recent_transactions' || item.intent === 'monthly_credit_summary') targetTab = 'today';

          let candidateCustomer: string | undefined = undefined;
          let matchedCustomerObj: Customer | null = null;
          let ambigCusts: Customer[] | undefined = undefined;

          if (item.intent === 'show_customer_ledger') {
            const cleanCust = cleanCustomerQuery(trimmed);
            if (cleanCust) {
              candidateCustomer = cleanCust;
              const res = resolveCrossScriptCustomer(cleanCust, customers);
              if (res.matchedCustomer) {
                matchedCustomerObj = res.matchedCustomer;
                candidateCustomer = res.matchedCustomer.name;
              } else if (res.ambiguousCustomers.length > 1) {
                ambigCusts = res.ambiguousCustomers;
              }
            }
          }

          return {
            intent: item.intent,
            confidence: (item.confidence || 0.9) * 0.9,
            customer: candidateCustomer,
            matchedCustomer: matchedCustomerObj,
            ambiguousCustomers: ambigCusts,
            language,
            rawText: trimmed,
            targetTab,
            timeframe: item.timeframe || null,
            amount,
            quantity,
            unit,
          };
        }
      }
    }
  }

  if (language !== 'hi') {
    for (const item of INTENT_TABLES.hi.intents) {
      for (const pattern of item.patterns) {
        if (pattern.test(trimmed)) {
          let targetTab: 'home' | 'ledger' | 'stock' | 'today' | 'bill_scan' | null = null;
          if (item.intent === 'open_bill_scan') targetTab = 'bill_scan';
          else if (item.intent === 'open_stock' || item.intent === 'show_low_stock' || item.intent === 'build_order_list' || item.intent === 'order_item') targetTab = 'stock';
          else if (item.intent === 'open_ledger' || item.intent === 'show_customer_ledger' || item.intent === 'top_debtors') targetTab = 'ledger';
          else if (item.intent === 'open_today' || item.intent === 'recent_transactions' || item.intent === 'monthly_credit_summary') targetTab = 'today';

          let candidateCustomer: string | undefined = undefined;
          let matchedCustomerObj: Customer | null = null;
          let ambigCusts: Customer[] | undefined = undefined;

          if (item.intent === 'show_customer_ledger') {
            const cleanCust = cleanCustomerQuery(trimmed);
            if (cleanCust) {
              candidateCustomer = cleanCust;
              const res = resolveCrossScriptCustomer(cleanCust, customers);
              if (res.matchedCustomer) {
                matchedCustomerObj = res.matchedCustomer;
                candidateCustomer = res.matchedCustomer.name;
              } else if (res.ambiguousCustomers.length > 1) {
                ambigCusts = res.ambiguousCustomers;
              }
            }
          }

          return {
            intent: item.intent,
            confidence: (item.confidence || 0.9) * 0.88,
            customer: candidateCustomer,
            matchedCustomer: matchedCustomerObj,
            ambiguousCustomers: ambigCusts,
            language,
            rawText: trimmed,
            targetTab,
            timeframe: item.timeframe || null,
            amount,
            quantity,
            unit,
          };
        }
      }
    }
  }

  // 5. Cross-script Customer Resolution
  const { matchedCustomer, ambiguousCustomers } = resolveCrossScriptCustomer(trimmed, customers);
  const { matchedItem } = resolveCrossScriptItem(trimmed, items);

  // 6. Check if query is directly asking for a customer's ledger or transaction
  if (matchedCustomer && !amount && !quantity) {
    return {
      intent: 'show_customer_ledger',
      customer: matchedCustomer.name,
      matchedCustomer: matchedCustomer,
      confidence: 0.9,
      language,
      rawText: trimmed,
    };
  }

  if (ambiguousCustomers.length > 1 && !amount && !quantity) {
    const cleanCust = cleanCustomerQuery(trimmed);
    return {
      intent: 'show_customer_ledger',
      customer: cleanCust || trimmed,
      ambiguousCustomers: ambiguousCustomers,
      confidence: 0.75,
      language,
      rawText: trimmed,
    };
  }

  // 7. Hybrid Fallback: Server LLM Intent Classifier
  const llmResult = await classifyWithLLM(trimmed, language);
  if (llmResult.intent !== 'unknown' && llmResult.confidence >= 0.7) {
    return {
      intent: llmResult.intent,
      confidence: llmResult.confidence,
      customer: llmResult.customer || (matchedCustomer ? matchedCustomer.name : undefined),
      item: llmResult.item || (matchedItem ? matchedItem.name : undefined),
      amount: llmResult.amount !== undefined ? llmResult.amount : amount,
      quantity: llmResult.quantity !== undefined ? llmResult.quantity : quantity,
      unit: llmResult.unit || (unit || undefined),
      count: llmResult.count,
      timeframe: llmResult.timeframe,
      language,
      rawText: trimmed,
    };
  }

  // Default unknown
  return {
    intent: 'unknown',
    confidence: 0.2,
    language,
    rawText: trimmed,
    customer: matchedCustomer ? matchedCustomer.name : undefined,
    item: matchedItem ? matchedItem.name : undefined,
    amount,
    quantity,
    unit,
  };
}

import { z } from 'zod';
import { LanguageCode } from '../i18n/types';
import { ParsedIntentEnum } from '../parser/types';
import { parseMultilingualNumber, parseMultilingualQuantityAndUnit } from './multilingualNumbers';

export const LLMClassificationResultSchema = z.object({
  intent: ParsedIntentEnum,
  confidence: z.number().min(0).max(1),
  customer: z.string().nullable().optional(),
  item: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  count: z.number().nullable().optional(),
  timeframe: z.enum(['today', 'yesterday', 'this_week', 'month']).nullable().optional(),
  reasoning: z.string().optional(),
});

export type LLMClassificationResult = z.infer<typeof LLMClassificationResultSchema>;

export interface IntentClassifierProvider {
  classify(text: string, language: LanguageCode): Promise<LLMClassificationResult>;
}

/**
 * Mock Intent Classifier for Vitest unit tests, CI and offline operation.
 * Accurately handles edge cases, code-mixed queries, and returns strict validated JSON.
 */
export class MockIntentClassifier implements IntentClassifierProvider {
  async classify(text: string, _language: LanguageCode): Promise<LLMClassificationResult> {
    const lower = text.toLowerCase().trim();
    if (!lower) {
      return { intent: 'unknown', confidence: 0.1, reasoning: 'Empty input' };
    }

    const { quantity, unit } = parseMultilingualQuantityAndUnit(lower);
    const amount = parseMultilingualNumber(lower);

    // 1. Undo / Revert / Remove last transaction paraphrases
    if (
      /\b(undo|revert|take\s*back|wapas|wapis|remove\s*(?:it|that|last|this)|cancel\s*(?:it|that|last|this)|delete\s*(?:it|that|last)|pichhla\s*hatao|galti\s*se|by\s*mistake|roll\s*back)\b/i.test(
        lower
      )
    ) {
      return { intent: 'undo', confidence: 0.92, reasoning: 'Semantic undo / revert match' };
    }

    // 2. Order low-running / finishing items vs Send order vs Order specific item
    if (
      /\b(order|reorder|restock|buy|purchase|procure|mangaao|mangwao|supply|replenish)\b/i.test(lower)
    ) {
      if (/\b(low|running|short|finishing|khatam|kam|ghatt|out|needed|list|yaadi)\b/i.test(lower)) {
        return { intent: 'build_order_list', confidence: 0.93, reasoning: 'Semantic order low stock / list match' };
      }
      if (/\b(send|dispatch|whatsapp|forward|share|bhej|bhejo)\b/i.test(lower)) {
        return { intent: 'send_order', confidence: 0.91, reasoning: 'Semantic send order match' };
      }
      return { intent: 'order_item', confidence: 0.88, item: text, quantity, unit, reasoning: 'Semantic order item match' };
    }

    // 3. Low stock / finishing items inquiry paraphrases
    if (
      /\b(low|running\s*low|running\s*out|almost\s*out|finishing|short|empty|khatam|kam|ghatt)\b/i.test(lower) &&
      /\b(item|items|stock|product|products|goods|maal|saman|what|which|kya|kaun)\b/i.test(lower)
    ) {
      return { intent: 'show_low_stock', confidence: 0.92, reasoning: 'Semantic low stock inquiry match' };
    }

    // 4. Open stock / Stock level inquiry
    if (/\b(stock|inventory|godown|warehouse|maal)\b/i.test(lower)) {
      if (/\b(low|kam|out|ghatt|running|finishing|khatam)\b/i.test(lower)) {
        return { intent: 'show_low_stock', confidence: 0.92, reasoning: 'Matched low stock keywords' };
      }
      if (/\b(how\s*(?:much|many)|kitna|kitni|kitne|left|available|remaining|baki)\b/i.test(lower)) {
        return { intent: 'stock', confidence: 0.89, item: text, reasoning: 'Semantic item stock check' };
      }
      return { intent: 'open_stock', confidence: 0.88, reasoning: 'Semantic open stock view' };
    }

    // 5. Bill / Receipt / Invoice Scan
    if (
      /\b(scan|photo|picture|camera|snap|upload|read|khicho|padho)\b/i.test(lower) &&
      /\b(bill|receipt|invoice|parchi|challan|chalan|slip)\b/i.test(lower)
    ) {
      return { intent: 'open_bill_scan', confidence: 0.91, reasoning: 'Semantic bill scan match' };
    }

    // 6. Reminder Settings vs Recovery (Payment reminders)
    if (
      /\b(reminder|reminders|alert|alerts|notification|yaad)\b/i.test(lower) &&
      /\b(setting|settings|rule|rules|tone|quiet|schedule|configure|change|auto|turn\s*on|turn\s*off)\b/i.test(lower)
    ) {
      return { intent: 'reminder_settings', confidence: 0.91, reasoning: 'Semantic reminder settings match' };
    }
    if (
      /\b(remind|reminder|follow\s*up|nudge|vasooli|collect|maang)\b/i.test(lower) &&
      /\b(owe|owes|debtor|debtors|udhaar|overdue|pending|due|customer|people|sabko|baaki)\b/i.test(lower)
    ) {
      return { intent: 'recovery', confidence: 0.9, reasoning: 'Semantic payment recovery reminder match' };
    }

    // 7. Cost Price & Selling Price updates
    if (/\b(price|rate|daam|bhav|mrp)\b/i.test(lower)) {
      if (/\b(cost|purchase|wholesale|buying|khareed|cp)\b/i.test(lower)) {
        return { intent: 'set_cost_price', amount, confidence: 0.9, reasoning: 'Semantic cost price update' };
      }
      if (/\b(sell|selling|retail|bechne|bikri|sp|set|change|update|new|badlo|rakho)\b/i.test(lower)) {
        return { intent: 'set_selling_price', amount, confidence: 0.89, reasoning: 'Semantic selling price update' };
      }
    }

    // 8. Voice Proof (Record vs Play)
    if (/\b(proof|recording|voice\s*note|audio|awaaz|saboot|consent)\b/i.test(lower)) {
      if (/\b(record|take|capture|save|banao|le\s*lo|new)\b/i.test(lower)) {
        return { intent: 'proof', confidence: 0.9, reasoning: 'Semantic record proof match' };
      }
      return { intent: 'play_proof', confidence: 0.9, reasoning: 'Semantic play proof match' };
    }

    // 9. Saved-entry edits (including natural phrases like "wrong amount", "fix quantity")
    if (
      /\b(edit|change|update|fix|correct|modify|adjust|wrong|galat|badlo|sudharo|theek\s*karo)\b/i.test(lower)
    ) {
      if (/\b(amount|price|total|rupees|rs|raqam|paise)\b/i.test(lower)) {
        return { intent: 'change_amount', amount, confidence: 0.9, reasoning: 'Semantic change_amount' };
      }
      if (/\b(item|product|goods|samaan|cheez)\b/i.test(lower)) {
        return { intent: 'change_item', confidence: 0.9, reasoning: 'Semantic change_item' };
      }
      if (/\b(customer|person|client|party|grahak|naam|name)\b/i.test(lower)) {
        return { intent: 'change_customer', confidence: 0.9, reasoning: 'Semantic change_customer' };
      }
      if (/\b(quantity|qty|weight|kilo|kg|gram|liter|packet|piece|count|maatra)\b/i.test(lower)) {
        return { intent: 'change_quantity', quantity, unit, confidence: 0.9, reasoning: 'Semantic change_quantity' };
      }
      if (/\b(date|day|tarikh|taarikh|din)\b/i.test(lower)) {
        return { intent: 'change_date', confidence: 0.9, reasoning: 'Semantic change_date' };
      }
      if (/\b(note|remark|comment|memo|tippani)\b/i.test(lower)) {
        return { intent: 'edit_note', confidence: 0.9, reasoning: 'Semantic edit_note' };
      }
      if (/\b(entry|transaction|hisab|bill|last|it|that)\b/i.test(lower)) {
        return { intent: 'edit_entry', amount, confidence: 0.88, reasoning: 'Semantic edit_entry' };
      }
    }

    // 10. Monthly credit summary
    if (
      /\b(month|monthly|mahine|mahina|30\s*days)\b/i.test(lower) &&
      /\b(credit|udhaar|due|summary|total|hisab)\b/i.test(lower)
    ) {
      return { intent: 'monthly_credit_summary', confidence: 0.9, reasoning: 'Semantic monthly credit summary' };
    }

    // 11. Top debtors / Who owes me
    if (
      /\b(debtor|debtors|owes|owe\s*me|most\s*due|biggest\s*udhaar|pending\s*dues|kis\s*par\s*udhaar|zyada\s*baaki)\b/i.test(
        lower
      )
    ) {
      return { intent: 'top_debtors', confidence: 0.9, reasoning: 'Semantic top debtors query' };
    }

    // 12. Ledger / Khata / Customer balance vs Open Ledger
    if (/\b(ledger|khata|account|passbook|statement|hisab\s*kitab)\b/i.test(lower)) {
      if (/\b(open|all|view\s*all|go\s*to|tab|page)\b/i.test(lower) && !/\b(for|of|ka|ki|ke)\b/i.test(lower)) {
        return { intent: 'open_ledger', confidence: 0.88, reasoning: 'Semantic open ledger view' };
      }
      return { intent: 'show_customer_ledger', confidence: 0.9, reasoning: 'Semantic customer ledger query' };
    }

    // 13. Recent transactions
    if (/\b(transaction|transactions|hisab|len\s*den|entries|activity|history)\b/i.test(lower)) {
      const count = amount || 5;
      return { intent: 'recent_transactions', count, confidence: 0.87, reasoning: 'Semantic transaction history' };
    }

    // 14. Daily summary / earnings / today's business
    if (
      /\b(earn|earned|profit|kamai|kamayi|revenue|business|sales\s*today|how\s*much\s*today|how\s*did\s*we\s*do|summary|daily\s*report|bikri)\b/i.test(
        lower
      )
    ) {
      return { intent: 'summary', confidence: 0.9, reasoning: 'Semantic summary match' };
    }

    // 15. Open today / dashboard
    if (/\b(open|go\s*to|show|view)\b/i.test(lower) && /\b(today|home|dashboard)\b/i.test(lower)) {
      return { intent: 'open_today', confidence: 0.87, reasoning: 'Semantic open today view' };
    }

    // 16. Shop expenses (rent, electricity, salary, supplies spent)
    if (
      /\b(spent|spend|expense|expenses|kharcha|kharch|rent|kiraya|electricity|bijli|salary|pagar|transport|bhada|maintenance|bill\s*paid)\b/i.test(
        lower
      )
    ) {
      return {
        intent: 'expense',
        amount,
        confidence: 0.88,
        reasoning: 'Semantic shop expense match',
      };
    }

    // 17. Customer payment received / settled
    if (
      /\b(jama|paid\s*(?:back|me|off)?|settled|cleared|received|got\s*money|returned|handed\s*me|de\s*gaya|de\s*diya|vasool|aaye|wapas\s*kiye|mil\s*gaye)\b/i.test(
        lower
      )
    ) {
      return {
        intent: 'payment',
        amount,
        confidence: 0.86,
        reasoning: 'Semantic payment received pattern',
      };
    }

    // 18. Credit / Udhaar transaction
    if (
      /\b(udhaar|udhar|credit|on\s*tab|put\s*on\s*account|pay\s*later|likh\s*do|baaki|baki|khata\s*mein)\b/i.test(lower)
    ) {
      return {
        intent: 'credit',
        amount,
        quantity,
        unit,
        confidence: 0.86,
        reasoning: 'Semantic credit transaction pattern',
      };
    }

    // 19. Cash Sale transaction
    if (/\b(sold|sale|cash\s*sale|bought\s*from\s*me|becha|bechi|nagad|cash\s*mein)\b/i.test(lower)) {
      return {
        intent: 'sale',
        amount,
        quantity,
        unit,
        confidence: 0.85,
        reasoning: 'Semantic cash sale pattern',
      };
    }

    // 20. Dialogue navigation & time filters
    if (/\b(next|agla|aage|more)\b/i.test(lower)) {
      return { intent: 'next', confidence: 0.88, reasoning: 'Semantic next' };
    }
    if (/\b(previous|prev|pichhla|peeche)\b/i.test(lower)) {
      return { intent: 'previous', confidence: 0.88, reasoning: 'Semantic previous' };
    }
    if (/\b(repeat|say\s*again|dobara|phir\s*se\s*bolo)\b/i.test(lower)) {
      return { intent: 'repeat', confidence: 0.88, reasoning: 'Semantic repeat' };
    }
    if (/\b(go\s*back|wapas\s*jao)\b/i.test(lower)) {
      return { intent: 'back', confidence: 0.88, reasoning: 'Semantic back' };
    }
    if (/\b(close|dismiss|band\s*karo|exit)\b/i.test(lower)) {
      return { intent: 'close', confidence: 0.88, reasoning: 'Semantic close' };
    }

    return {
      intent: 'unknown',
      confidence: 0.2,
      reasoning: 'No clear semantic match in classifier',
    };
  }
}

let activeClassifierProvider: IntentClassifierProvider = new MockIntentClassifier();

export function setIntentClassifierProvider(provider: IntentClassifierProvider) {
  activeClassifierProvider = provider;
}

export function getIntentClassifierProvider(): IntentClassifierProvider {
  return activeClassifierProvider;
}

/**
 * Classifies intent using server-side / LLM classifier with strict Zod validation
 */
export async function classifyWithLLM(
  text: string,
  language: LanguageCode
): Promise<LLMClassificationResult> {
  try {
    const rawResult = await activeClassifierProvider.classify(text, language);
    const parsed = LLMClassificationResultSchema.safeParse(rawResult);
    if (parsed.success) {
      return parsed.data;
    }
    console.warn('[LLM Classifier] Schema validation warning:', parsed.error);
    return {
      intent: 'unknown',
      confidence: 0.1,
      reasoning: 'Schema validation failed',
    };
  } catch (err) {
    console.warn('[LLM Classifier] Execution failed:', err);
    return {
      intent: 'unknown',
      confidence: 0.1,
      reasoning: (err as Error).message,
    };
  }
}

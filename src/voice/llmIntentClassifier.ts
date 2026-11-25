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

    // Check for quantity & unit
    const { quantity, unit } = parseMultilingualQuantityAndUnit(lower);
    const amount = parseMultilingualNumber(lower);

    // Stock check
    if (lower.includes('stock') || lower.includes('inventory') || lower.includes('maal') || lower.includes('goods')) {
      if (lower.includes('low') || lower.includes('kam') || lower.includes('out') || lower.includes('ghatt')) {
        return { intent: 'show_low_stock', confidence: 0.92, reasoning: 'Matched low stock keywords' };
      }
      return { intent: 'open_stock', confidence: 0.88, reasoning: 'Matched stock view' };
    }

    // Order item
    if (lower.includes('order') || lower.includes('mangaao') || lower.includes('supply')) {
      if (lower.includes('list') || lower.includes('yaadi')) {
        return { intent: 'build_order_list', confidence: 0.9, reasoning: 'Matched order list' };
      }
      if (lower.includes('bhej') || lower.includes('send') || lower.includes('dispatch')) {
        return { intent: 'send_order', confidence: 0.9, reasoning: 'Matched send order' };
      }
      return { intent: 'order_item', confidence: 0.88, item: text, reasoning: 'Matched order item' };
    }

    // Ledger / Khata
    if (lower.includes('ledger') || lower.includes('khata') || lower.includes('account') || lower.includes('passbook')) {
      return { intent: 'show_customer_ledger', confidence: 0.9, reasoning: 'Matched ledger query' };
    }

    // Transactions
    if (lower.includes('transaction') || lower.includes('hisab') || lower.includes('len den') || lower.includes('entry')) {
      const count = amount || 5;
      return { intent: 'recent_transactions', count, confidence: 0.87, reasoning: 'Matched transaction history' };
    }

    // Top debtors
    if (lower.includes('debtor') || lower.includes('udhaar') || lower.includes('baaki') || lower.includes('owes')) {
      return { intent: 'top_debtors', confidence: 0.9, reasoning: 'Matched debtor query' };
    }

    // Voice proof
    if (lower.includes('proof') || lower.includes('recording') || lower.includes('voice') || lower.includes('awaaz')) {
      return { intent: 'play_proof', confidence: 0.9, reasoning: 'Matched voice proof' };
    }

    // Saved-entry edits
    if (
      lower.includes('edit') ||
      lower.includes('change') ||
      lower.includes('update') ||
      lower.includes('badlo') ||
      lower.includes('sudharo') ||
      lower.includes('correct')
    ) {
      if (lower.includes('amount') || lower.includes('raqam') || lower.includes('paise')) {
        return { intent: 'change_amount', amount, confidence: 0.9, reasoning: 'Matched change_amount' };
      }
      if (lower.includes('item') || lower.includes('samaan')) {
        return { intent: 'change_item', confidence: 0.9, reasoning: 'Matched change_item' };
      }
      if (lower.includes('customer') || lower.includes('grahak') || lower.includes('naam')) {
        return { intent: 'change_customer', confidence: 0.9, reasoning: 'Matched change_customer' };
      }
      if (lower.includes('quantity') || lower.includes('qty') || lower.includes('kilo')) {
        return { intent: 'change_quantity', quantity, unit, confidence: 0.9, reasoning: 'Matched change_quantity' };
      }
      if (lower.includes('date') || lower.includes('tarikh') || lower.includes('taarikh')) {
        return { intent: 'change_date', confidence: 0.9, reasoning: 'Matched change_date' };
      }
      if (lower.includes('note') || lower.includes('remark') || lower.includes('tippani')) {
        return { intent: 'edit_note', confidence: 0.9, reasoning: 'Matched edit_note' };
      }
      if (lower.includes('entry') || lower.includes('transaction') || lower.includes('hisab')) {
        return { intent: 'edit_entry', amount, confidence: 0.88, reasoning: 'Matched edit_entry' };
      }
    }

    // General transaction detection (sale / credit / payment)
    if (lower.includes('udhaar') || lower.includes('credit') || lower.includes('likh do') || lower.includes('baki')) {
      return {
        intent: 'credit',
        amount,
        quantity,
        unit,
        confidence: 0.85,
        reasoning: 'Matched credit transaction pattern',
      };
    }

    if (lower.includes('jama') || lower.includes('paid') || lower.includes('aaye') || lower.includes('received')) {
      return {
        intent: 'payment',
        amount,
        confidence: 0.85,
        reasoning: 'Matched payment transaction pattern',
      };
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

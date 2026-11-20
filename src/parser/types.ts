import { z } from 'zod';

export const ParsedIntentEnum = z.enum([
  'sale',
  'credit',
  'payment',
  'expense',
  'proof',
  'stock',
  'recovery',
  'summary',
  'ordering',
  'confirm_yes',
  'confirm_no',
  'undo',
  'reminder_settings',
  'set_selling_price',
  'set_cost_price',
  'open_bill_scan',
  'open_stock',
  'open_ledger',
  'open_today',
  'unknown',
]);

export type ParsedIntent = z.infer<typeof ParsedIntentEnum>;

export const ParseResultSchema = z.object({
  intent: ParsedIntentEnum,
  customer: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  item: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  oldPrice: z.number().nullable().optional(),
  targetTab: z.enum(['home', 'ledger', 'stock', 'today', 'bill_scan']).nullable().optional(),
  language: z.enum(['hi', 'pa', 'en']),
  confidence: z.number().min(0).max(1),
  rawText: z.string().default(''),
  spokenReply: z.string().optional(),
  questionToAsk: z.string().nullable().optional(),
});

export type ValidatedParseResult = z.infer<typeof ParseResultSchema>;

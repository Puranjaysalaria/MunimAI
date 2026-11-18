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
  language: z.enum(['hi', 'pa', 'en']),
  confidence: z.number().min(0).max(1),
  rawText: z.string().default(''),
  spokenReply: z.string().optional(),
  questionToAsk: z.string().nullable().optional(),
});

export type ValidatedParseResult = z.infer<typeof ParseResultSchema>;

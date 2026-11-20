import { LanguagePhraseTable } from '../types';

export const enIntents: LanguagePhraseTable = {
  language: 'en',
  yesKeywords: ['yes', 'yeah', 'yep', 'correct', 'confirm', 'save', 'right'],
  noKeywords: ['no', 'nope', 'cancel', 'wrong', 'dont', "don't"],
  undoKeywords: ['undo', 'revert', 'take back', 'cancel last'],
  intents: [
    {
      intent: 'show_low_stock',
      patterns: [
        /show\s*(low|out of|critical)?\s*stock/i,
        /(low|critical)\s*stock/i,
        /stock\s*check/i,
        /what('s|\s+is)\s*(running low|out of stock)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'send_order',
      patterns: [
        /send\s*(the)?\s*order/i,
        /dispatch\s*order/i,
        /submit\s*order/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'build_order_list',
      patterns: [
        /build\s*(order|supplier)\s*list/i,
        /create\s*order\s*list/i,
        /generate\s*order\s*list/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'order_item',
      patterns: [
        /order\s*(item|stock|goods)/i,
        /place\s*(an)?\s*order/i,
        /need\s*to\s*order/i,
      ],
      confidence: 0.92,
    },
    {
      intent: 'recent_transactions',
      patterns: [
        /recent\s*(\d+)?\s*(transactions?|entries|records?)/i,
        /last\s*(\d+)?\s*(transactions?|entries|records?)/i,
      ],
      confidence: 0.95,
      extractCount: true,
    },
    {
      intent: 'monthly_credit_summary',
      patterns: [
        /monthly\s*(credit|sales?|summary|report)/i,
        /month('s)?\s*(balance|summary|total|sales?)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'top_debtors',
      patterns: [
        /top\s*(debtors?|borrowers?|credit holders?)/i,
        /who\s*owes\s*(the\s*most|most)/i,
        /highest\s*pending\s*(dues|credit|balance)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_ledger',
      patterns: [
        /^open\s*ledger$/i,
        /view\s*ledger$/i,
        /open\s*ledger\s*(screen|tab)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'show_customer_ledger',
      patterns: [
        /open\s+customer\s+(ledger|account|passbook)/i,
        /show\s*(customer)?\s*(ledger|account|passbook)/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'next',
      patterns: [/(?:^|[^\p{L}])(next|forward|advance)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'previous',
      patterns: [/(?:^|[^\p{L}])(previous|prev|backwards?)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'repeat',
      patterns: [/(?:^|[^\p{L}])(repeat|say again|pardon|once more)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'back',
      patterns: [/(?:^|[^\p{L}])(back|go back|return)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'close',
      patterns: [/(?:^|[^\p{L}])(close|dismiss|exit|close screen)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'today',
      patterns: [/(?:^|[^\p{L}])(today|today's)(?:$|[^\p{L}])/iu],
      timeframe: 'today',
      confidence: 0.92,
    },
    {
      intent: 'yesterday',
      patterns: [/(?:^|[^\p{L}])(yesterday|yesterday's)(?:$|[^\p{L}])/iu],
      timeframe: 'yesterday',
      confidence: 0.92,
    },
    {
      intent: 'this_week',
      patterns: [/(?:^|[^\p{L}])(this week|weekly)(?:$|[^\p{L}])/iu],
      timeframe: 'this_week',
      confidence: 0.92,
    },
    {
      intent: 'open_bill_scan',
      patterns: [
        /scan\s*(a\s*)?bill/i,
        /take\s*(a\s*)?photo\s*of\s*bill/i,
        /bill\s*scanner/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_stock',
      patterns: [
        /open\s*(stock|inventory)/i,
        /view\s*(stock|inventory)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_ledger',
      patterns: [
        /open\s*ledger/i,
        /view\s*ledger/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_today',
      patterns: [
        /open\s*today/i,
        /today('s)?\s*(screen|summary)/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'play_proof',
      patterns: [
        /play\s*(voice\s*)?(proof|recording|clip)/i,
        /listen\s*to\s*(proof|recording)/i,
      ],
      confidence: 0.95,
    },
  ],
};

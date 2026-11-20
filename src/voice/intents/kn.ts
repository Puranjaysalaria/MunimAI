import { LanguagePhraseTable } from '../types';

export const knIntents: LanguagePhraseTable = {
  language: 'kn',
  yesKeywords: ['haudu', 'sari', 'nijavada', 'ಹೌದು', 'ಸರಿ', 'ಖಂಡಿತ'],
  noKeywords: ['illa', 'beda', 'thappu', 'ಇಲ್ಲ', 'ಬೇಡ', 'ತಪ್ಪು'],
  undoKeywords: ['hindakke thagoli', 'raddu madi', 'undo', 'ಹಿಂಪಡೆಯಿರಿ', 'ರದ್ದು ಮಾಡಿ', 'ರದ್ದು'],
  intents: [
    {
      intent: 'show_low_stock',
      patterns: [
        /(kadime|mugida)\s*(stock|saraku)/iu,
        /ಕಡಿಮೆ\s*ಸ್ಟಾಕ್/iu,
        /ಯಾವ\s*ಸರಕು\s*ಮುಗಿದಿದೆ/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'send_order',
      patterns: [
        /order\s*kaluhisi/iu,
        /ಆರ್ಡರ್\s*ಕಳುಹಿಸಿ/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'build_order_list',
      patterns: [
        /order\s*(list|patti)\s*madi/iu,
        /ಆರ್ಡರ್\s*ಪಟ್ಟಿ\s*ಮಾಡಿ/iu,
        /ಪಟ್ಟಿ\s*ಸಿದ್ಧಪಡಿಸಿ/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'order_item',
      patterns: [
        /(saraku|item)\s*(order|tharisiri)/iu,
        /ಆರ್ಡರ್\s*ಮಾಡಿ/iu,
        /ಸರಕು\s*ಆರ್ಡರ್\s*ಮಾಡಿ/iu,
      ],
      confidence: 0.92,
    },
    {
      intent: 'recent_transactions',
      patterns: [
        /(ittechina|koneya|ಇತ್ತೀಚಿನ|ಕೊನೆಯ)\s*(\d+)?\s*(vyavaharagalu|lekkagalu|ವಹಿವಾಟುಗಳು|ವಹಿವಾಟು)/iu,
        /ಇತ್ತೀಚಿನ\s*ವಹಿವಾಟುಗಳು/iu,
        /ಕೊನೆಯ\s*ವಹಿವಾಟು/iu,
      ],
      confidence: 0.95,
      extractCount: true,
    },
    {
      intent: 'monthly_credit_summary',
      patterns: [
        /(thingala|maasika|ತಿಂಗಳ|ಮಾಸಿಕ)\s*(lekka|summary|ಲೆಕ್ಕ|ಸಾರಾಂಶ)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'top_debtors',
      patterns: [
        /(hecchina|top|ಹೆಚ್ಚು|ಟಾಪ್)\s*(baaki|saala|ಬಾಕಿ|ಸಾಲಿಗರು)/iu,
        /ಯಾರಿಗೆ\s*ಹೆಚ್ಚು\s*ಬಾಕಿ\s*ಇದೆ/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'show_customer_ledger',
      patterns: [
        /(khaathe|ledger|lekkagalu)\s*(thereyiri|thorisi)/iu,
        /(ಖಾತೆ|ಲೆಡ್ಜರ್)\s*(ತೆರೆಯಿರಿ|ತೋರಿಸಿ)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'next',
      patterns: [/(?:^|[^\p{L}])(munde|next|ಮುಂದೆ)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'previous',
      patterns: [/(?:^|[^\p{L}])(hindina|prev|ಹಿಂದಿನ)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'repeat',
      patterns: [/(?:^|[^\p{L}])(matte heli|innomme|ಮತ್ತೆ\s*ಹೇಳಿ)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'back',
      patterns: [/(?:^|[^\p{L}])(hindakke|hinde|ಹಿಂದಕ್ಕೆ)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'close',
      patterns: [/(?:^|[^\p{L}])(mucchi|mucchiri|ಮುಚ್ಚಿ)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'today',
      patterns: [/(?:^|[^\p{L}])(indu|indina|ಇಂದು|ಇಂದಿನ)(?:$|[^\p{L}])/iu],
      timeframe: 'today',
      confidence: 0.92,
    },
    {
      intent: 'yesterday',
      patterns: [/(?:^|[^\p{L}])(ninne|ninnina|ನಿನ್ನೆ)(?:$|[^\p{L}])/iu],
      timeframe: 'yesterday',
      confidence: 0.92,
    },
    {
      intent: 'this_week',
      patterns: [/(?:^|[^\p{L}])(ee vaara|ಈ\s*ವಾರ)(?:$|[^\p{L}])/iu],
      timeframe: 'this_week',
      confidence: 0.92,
    },
    {
      intent: 'open_bill_scan',
      patterns: [
        /bill\s*(scan|photo)/iu,
        /ಬಿಲ್\s*ಸ್ಕ್ಯಾನ್\s*ಮಾಡಿ/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_stock',
      patterns: [
        /stock\s*thereyiri/iu,
        /ಸ್ಟಾಕ್\s*ತೆರೆಯಿರಿ/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_ledger',
      patterns: [
        /ledger\s*thereyiri/iu,
        /ಲೆಡ್ಜರ್\s*ತೆರೆಯಿರಿ/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_today',
      patterns: [
        /indina\s*lekka/iu,
        /ಇಂದಿನ\s*ಲೆಕ್ಕ\s*ತೆರೆಯಿರಿ/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'play_proof',
      patterns: [
        /dhwani\s*keli/iu,
        /(ಧ್ವನಿ|ರೆಕಾರ್ಡಿಂಗ್)\s*ಕೇಳಿ/iu,
      ],
      confidence: 0.95,
    },
  ],
};

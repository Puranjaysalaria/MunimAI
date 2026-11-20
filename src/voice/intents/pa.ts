import { LanguagePhraseTable } from '../types';

export const paIntents: LanguagePhraseTable = {
  language: 'pa',
  yesKeywords: ['haan', 'aaho', 'theek hai', 'sahi hai', 'ਹਾਂ', 'ਆਹੋ', 'ਠੀਕ ਹੈ', 'ਸਹੀ ਹੈ'],
  noKeywords: ['nahi', 'naa', 'galat', 'ਨਹੀਂ', 'ਨਾ', 'ਗ਼ਲਤ'],
  undoKeywords: ['wapas karo', 'hatao', 'mukaao', 'ਵਾਪਸ ਕਰੋ', 'ਹਟਾਓ', 'ਮਿਟਾਓ'],
  intents: [
    {
      intent: 'show_low_stock',
      patterns: [
        /(ghatt|kam)\s*(stock|maal|saaman)/iu,
        /ਕਿਹੜਾ\s*(ਸਟਾਕ|ਮਾਲ)\s*ਮੁੱਕ\s*ਗਿਆ/iu,
        /(ਘੱਟ|ਮੁੱਕਦਾ)\s*(ਸਟਾਕ|ਮਾਲ)/iu,
        /ਘੱਟ\s*ਸਟਾਕ/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'send_order',
      patterns: [
        /order\s*bhejo/iu,
        /ਆਰਡਰ\s*ਭੇਜੋ/iu,
        /ਆਰਡਰ\s*ਭੇਜ\s*ਦਿਓ/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'build_order_list',
      patterns: [
        /order\s*(list|soochi)\s*banao/iu,
        /ਆਰਡਰ\s*ਲਿਸਟ\s*ਬਣਾਓ/iu,
        /(ਲਿਸਟ|ਸੂਚੀ)\s*ਤਿਆਰ\s*ਕਰੋ/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'order_item',
      patterns: [
        /(saaman|maal)\s*(order|mangaao)/iu,
        /ਆਰਡਰ\s*(ਕਰੋ|ਮੰਗਾਓ)/iu,
        /ਸਾਮਾਨ\s*ਆਰਡਰ\s*ਕਰੋ/iu,
      ],
      confidence: 0.92,
    },
    {
      intent: 'recent_transactions',
      patterns: [
        /(pichhle|aakhri|ਪਿਛਲੇ|ਤਾਜ਼ਾ)\s*(\d+)?\s*(hisaab|lain dain|len den|ਲੈਣ-ਦੇਣ|ਲੈਣ\s*ਦੇਣ|ਐਂਟਰੀਆਂ)/iu,
        /ਪਿਛਲੇ\s*(ਲੈਣ-ਦੇਣ|ਲੈਣ\s*ਦੇਣ)/iu,
        /ਤਾਜ਼ਾ\s*ਐਂਟਰੀਆਂ/iu,
      ],
      confidence: 0.95,
      extractCount: true,
    },
    {
      intent: 'monthly_credit_summary',
      patterns: [
        /(mahine|maheeney|ਮਹੀਨੇ|ਪੂਰੇ\s*ਮਹੀਨੇ)\s*da\s*(hisaab|summary)/iu,
        /(ਮਹੀਨੇ|ਪੂਰੇ\s*ਮਹੀਨੇ)\s*ਦਾ\s*(ਹਿਸਾਬ|ਵਿਕਰੀ|ਸੰਖੇਪ)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'top_debtors',
      patterns: [
        /(sabh to vadh|top)\s*(udhaar|baaki)/iu,
        /ਸਭ\s*ਤੋਂ\s*ਵੱਧ\s*(ਉਧਾਰ|ਬਾਕੀ)/iu,
        /(ਕਿਸਦਾ\s*ਸਭ\s*ਤੋਂ\s*ਵੱਧ|ਟਾਪ\s*ਉਧਾਰ)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'show_customer_ledger',
      patterns: [
        /(khata|ledger)\s*(kholo|dikhao)/iu,
        /(ਖਾਤਾ|ਲੈਜ਼ਰ)\s*(ਖੋਲ੍ਹੋ|ਦਿਖਾਓ)?/iu,
        /(ਦਾ|ਦੀ)\s*(ਖਾਤਾ|ਲੈਜ਼ਰ)/iu,
        /ਲੈਜ਼ਰ\s*ਖੋਲ੍ਹੋ/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'next',
      patterns: [/(?:^|[^\p{L}])(agge|next|ਅੱਗੇ)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'previous',
      patterns: [/(?:^|[^\p{L}])(pichhe|prev|ਪਿੱਛੇ)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'repeat',
      patterns: [/(?:^|[^\p{L}])(dubaara|fir to|ਦੁਬਾਰਾ\s*ਬੋਲੋ|ਮੁੜ\s*ਬੋਲੋ|ਦੁਬਾਰਾ)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'back',
      patterns: [/(?:^|[^\p{L}])(vaapas|pichhe jao|ਵਾਪਸ|ਵਾਪਸ\s*ਜਾਓ)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'close',
      patterns: [/(?:^|[^\p{L}])(band karo|hataao|ਬੰਦ\s*ਕਰੋ|ਹਟਾਓ)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'today',
      patterns: [/(?:^|[^\p{L}])(ajj|ajj da|ਅੱਜ|ਅੱਜ\s*ਦਾ)(?:$|[^\p{L}])/iu],
      timeframe: 'today',
      confidence: 0.92,
    },
    {
      intent: 'yesterday',
      patterns: [/(?:^|[^\p{L}])(kall|kall da|ਕੱਲ੍ਹ|ਕੱਲ੍ਹ\s*ਦਾ)(?:$|[^\p{L}])/iu],
      timeframe: 'yesterday',
      confidence: 0.92,
    },
    {
      intent: 'this_week',
      patterns: [/(?:^|[^\p{L}])(is hafte|ਇਸ\s*ਹਫ਼ਤੇ|ਇਸ\s*ਹਫ਼ਤੇ\s*ਦਾ)(?:$|[^\p{L}])/iu],
      timeframe: 'this_week',
      confidence: 0.92,
    },
    {
      intent: 'open_bill_scan',
      patterns: [
        /bill\s*(scan|photo)/iu,
        /ਬਿੱਲ\s*(ਸਕੈਨ|ਦੀ\s*ਫੋਟੋ|ਫੋਟੋ)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_stock',
      patterns: [
        /stock\s*kholo/iu,
        /ਸਟਾਕ\s*(ਖੋਲ੍ਹੋ|ਦਿਖਾਓ)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_ledger',
      patterns: [
        /ledger\s*kholo/iu,
        /ਲੈਜ਼ਰ\s*(ਖੋਲ੍ਹੋ|ਦਿਖਾਓ)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_today',
      patterns: [
        /ajj\s*da\s*hisaab/iu,
        /ਅੱਜ\s*ਦਾ\s*ਹਿਸਾਬ\s*(ਖੋਲ੍ਹੋ|ਦਿਖਾਓ)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'play_proof',
      patterns: [
        /awaaz\s*sunaao/iu,
        /(ਆਵਾਜ਼|ਸਬੂਤ)\s*(ਸੁਣਾਓ|ਸੁਣੋ)/iu,
      ],
      confidence: 0.95,
    },
  ],
};

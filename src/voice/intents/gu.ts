import { LanguagePhraseTable } from '../types';

export const guIntents: LanguagePhraseTable = {
  language: 'gu',
  yesKeywords: ['haa', 'ha', 'barabar', 'sacho', 'હા', 'બરાબર', 'સાચું'],
  noKeywords: ['na', 'nahi', 'khoto', 'ના', 'નહીં', 'ખોટું'],
  undoKeywords: ['paachhu lo', 'kadhi nakho', 'undo', 'પાછું લો', 'કાઢી નાખો', 'પાછું'],
  intents: [
    {
      intent: 'show_low_stock',
      patterns: [
        /(ochho|kam|khatam)\s*(stock|maal)/iu,
        /ઓછો\s*સ્ટોક/iu,
        /કયો\s*માલ\s*ઓછો\s*છે/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'send_order',
      patterns: [
        /order\s*moklo/iu,
        /ઓર્ડર\s*મોકલો/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'build_order_list',
      patterns: [
        /order\s*(list|yaadi)\s*banavo/iu,
        /ઓર્ડર\s*લિસ્ટ\s*બનાવો/iu,
        /યાદી\s*તૈયાર\s*કરો/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'order_item',
      patterns: [
        /(maal|item)\s*(order|mangavo)/iu,
        /ઓર્ડર\s*કરો/iu,
        /માલ\s*ઓર્ડર\s*કરો/iu,
      ],
      confidence: 0.92,
    },
    {
      intent: 'recent_transactions',
      patterns: [
        /(chhellaa|pachhla|છેલ્લા|તાજા)\s*(\d+)?\s*(hisaab|vyavahar|વ્યવહારો|વ્યવહાર)/iu,
        /છેલ્લા\s*વ્યવહારો/iu,
        /તાજા\s*વ્યવહાર/iu,
      ],
      confidence: 0.95,
      extractCount: true,
    },
    {
      intent: 'monthly_credit_summary',
      patterns: [
        /(mahinaano|maasik|મહિનાનો|માસિક)\s*(hisaab|summary|હિસાબ)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'top_debtors',
      patterns: [
        /(sauthi vadhu|top|સૌથી\s*વધુ|ટોપ)\s*(baaki|udhaar|બાકી|બાકીદારો)/iu,
        /કોની\s*સૌથી\s*વધુ\s*બાકી/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'show_customer_ledger',
      patterns: [
        /(khaatu|ledger|hisaab)\s*(kholo|batavo)/iu,
        /(ખાતું|લેજર|હિસાબ)\s*(ખોલો|બતાવો)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'next',
      patterns: [/(?:^|[^\p{L}])(aagal|next|આગળ)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'previous',
      patterns: [/(?:^|[^\p{L}])(paachhal|prev|પાછળ)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'repeat',
      patterns: [/(?:^|[^\p{L}])(farithi bolo|fari bolo|ફરીથી\s*બોલો|ફરી\s*બોલો)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'back',
      patterns: [/(?:^|[^\p{L}])(paachha|paachha jao|પાછા|પાછા\s*જાઓ)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'close',
      patterns: [/(?:^|[^\p{L}])(bandh karo|hataavo|બંધ\s*કરો|હટાવો)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'today',
      patterns: [/(?:^|[^\p{L}])(aaje|aajno|આજે|આજનો)(?:$|[^\p{L}])/iu],
      timeframe: 'today',
      confidence: 0.92,
    },
    {
      intent: 'yesterday',
      patterns: [/(?:^|[^\p{L}])(gai kaale|ગઈકાલે)(?:$|[^\p{L}])/iu],
      timeframe: 'yesterday',
      confidence: 0.92,
    },
    {
      intent: 'this_week',
      patterns: [/(?:^|[^\p{L}])(aa athvaadiye|આ\s*અઠવાડિયે)(?:$|[^\p{L}])/iu],
      timeframe: 'this_week',
      confidence: 0.92,
    },
    {
      intent: 'open_bill_scan',
      patterns: [
        /bill\s*(scan|photo)/iu,
        /બિલ\s*સ્કેન\s*કરો/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_stock',
      patterns: [
        /stock\s*kholo/iu,
        /સ્ટોક\s*ખોલો/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_ledger',
      patterns: [
        /ledger\s*kholo/iu,
        /લેજર\s*ખોલો/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_today',
      patterns: [
        /aajno\s*hisaab/iu,
        /આજનો\s*હિસાબ\s*ખોલો/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'play_proof',
      patterns: [
        /avaaj\s*sambhalo/iu,
        /(અવાજ|રેકોર્ડિંગ)\s*સાંભળો/iu,
      ],
      confidence: 0.95,
    },
  ],
};

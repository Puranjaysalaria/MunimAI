import { LanguagePhraseTable } from '../types';

export const mrIntents: LanguagePhraseTable = {
  language: 'mr',
  yesKeywords: ['ho', 'hoy', 'barobar', 'theek', 'हो', 'बरोबर', 'ठीक आहे'],
  noKeywords: ['nahi', 'nako', 'chook', 'नाही', 'नको', 'चूक'],
  undoKeywords: ['mage ghya', 'radda kara', 'undo', 'मागे घ्या', 'रद्द करा'],
  intents: [
    {
      intent: 'show_low_stock',
      patterns: [
        /(kami|sampat alela)\s*(stock|maal)/iu,
        /कमी\s*स्टॉक/iu,
        /कोणता\s*माल\s*संपत\s*आलेला\s*आहे/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'send_order',
      patterns: [
        /order\s*pathva/iu,
        /ऑर्डर\s*पाठवा/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'build_order_list',
      patterns: [
        /order\s*(list|yaadi)\s*banva/iu,
        /ऑर्डर\s*यादी\s*बनवा/iu,
        /यादी\s*तयार\s*करा/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'order_item',
      patterns: [
        /(maal|item)\s*(order|magva)/iu,
        /ऑर्डर\s*करा/iu,
        /माल\s*मागवा/iu,
      ],
      confidence: 0.92,
    },
    {
      intent: 'recent_transactions',
      patterns: [
        /(alikadil|shevatche|अलीकडील|शेवटचे)\s*(\d+)?\s*(hishob|vyavahar|व्यवहार)/iu,
        /अलीकडील\s*व्यवहार/iu,
        /शेवटचे\s*व्यवहार/iu,
      ],
      confidence: 0.95,
      extractCount: true,
    },
    {
      intent: 'monthly_credit_summary',
      patterns: [
        /(mahinyacha|maasik|महिन्याचा|मासिक)\s*(hishob|summary|हिशोब|विक्री)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'top_debtors',
      patterns: [
        /(sarvat jaast|top|सर्वात\s*जास्त|टॉप)\s*(baaki|udhari|बाकी|उधारी)/iu,
        /कोणाची\s*सर्वात\s*जास्त\s*बाकी/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'show_customer_ledger',
      patterns: [
        /(khaate|ledger|hishob)\s*(ughada|dakhva)/iu,
        /(खाते|लेजर|हिशोब)\s*(उघडा|दाखवा)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'next',
      patterns: [/(?:^|[^\p{L}])(pudhe|next|पुढे)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'back',
      patterns: [/(?:^|[^\p{L}])(mage jya|parata|मागे\s*जा)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'previous',
      patterns: [/(?:^|[^\p{L}])(mage|prev|मागे)(?:$|[^\p{L}])/iu],
      confidence: 0.94,
    },
    {
      intent: 'repeat',
      patterns: [/(?:^|[^\p{L}])(punha sanga|punha bola|पुन्हा\s*सांगा|पुन्हा\s*बोला)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'close',
      patterns: [/(?:^|[^\p{L}])(band kara|thambva|बंद\s*करा|थांबवा)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'today',
      patterns: [/(?:^|[^\p{L}])(aaj|aajcha|आज|आजचा)(?:$|[^\p{L}])/iu],
      timeframe: 'today',
      confidence: 0.92,
    },
    {
      intent: 'yesterday',
      patterns: [/(?:^|[^\p{L}])(kaal|kaalcha|काल|कालचा)(?:$|[^\p{L}])/iu],
      timeframe: 'yesterday',
      confidence: 0.92,
    },
    {
      intent: 'this_week',
      patterns: [/(?:^|[^\p{L}])(ya aathavadyat|या\s*आठवड्यात)(?:$|[^\p{L}])/iu],
      timeframe: 'this_week',
      confidence: 0.92,
    },
    {
      intent: 'open_bill_scan',
      patterns: [
        /bill\s*(scan|photo)/iu,
        /बिल\s*स्कॅन\s*करा/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_stock',
      patterns: [
        /stock\s*ughada/iu,
        /स्टॉक\s*उघडा/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_ledger',
      patterns: [
        /ledger\s*ughada/iu,
        /लेजर\s*उघडा/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_today',
      patterns: [
        /aajcha\s*hishob/iu,
        /आजचा\s*हिशोब\s*उघडा/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'play_proof',
      patterns: [
        /aawaj\s*aika/iu,
        /(आवाज|रेकॉर्डिंग)\s*ऐका/iu,
      ],
      confidence: 0.95,
    },
  ],
};

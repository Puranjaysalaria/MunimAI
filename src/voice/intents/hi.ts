import { LanguagePhraseTable } from '../types';

export const hiIntents: LanguagePhraseTable = {
  language: 'hi',
  yesKeywords: ['haan', 'ha', 'sahi', 'theek', 'theek hai', 'yes', 'हाँ', 'सही', 'ठीक है', 'हां'],
  noKeywords: ['nahi', 'na', 'galat', 'mat', 'no', 'नहीं', 'गलत', 'ना'],
  undoKeywords: ['wapas karo', 'hatao', 'undo', 'cancel', 'वापस करो', 'हटाओ'],
  intents: [
    {
      intent: 'build_order_list',
      patterns: [
        /(?:कम\s*स्टॉक|खत्म\s*स्टॉक|kam\s*stock|low\s*stock|low\s*r[ui]n+ing)\s*.*(?:order|आर्डर|ऑर्डर|बनाओ|list|लिस्ट)/iu,
        /(?:order|आर्डर|ऑर्डर)\s*.*(?:कम\s*स्टॉक|खत्म\s*स्टॉक|kam\s*stock|low\s*stock|low\s*r[ui]n+ing)/iu,
        /order\s*(list|suchi|parcha)\s*(banao|tayyar)/iu,
        /(ऑर्डर|आर्डर)\s*(लिस्ट|सूची|पर्चा)\s*(बनाओ|तैयार)/iu,
        /(सप्लायर|समान)\s*का?\s*(आर्डर|ऑर्डर)\s*(बनाओ|लिस्ट)/iu,
        /list\s*banao/iu,
      ],
      confidence: 0.96,
    },
    {
      intent: 'show_low_stock',
      patterns: [
        /(kam|low|khatam|kamti)\s*(stock|maal|samana?|item)/iu,
        /(stock|maal|saman|सामान|माल|स्टॉक)\s*.*(kam|low|khatam|कम|खत्म)/iu,
        /कौनसा?\s*(माल|सामान|स्टॉक)\s*(कम|खत्म)/iu,
        /(कम|खत्म)\s*(स्टॉक|माल|सामान)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'send_order',
      patterns: [
        /order\s*(bhej|send|bhejo|kar do)/iu,
        /(ऑर्डर|आर्डर)\s*(भेज दो|भेजो|सेंड करो)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'order_item',
      patterns: [
        /(maal|item|saman|सामान|सप्लायर)\s*.*(order|mangwao|mangao|आर्डर|ऑर्डर)/iu,
        /order\s*(karo|karna|chahiye)/iu,
        /(ऑर्डर|आर्डर)\s*(करो|मंगवाओ|मंगाओ)/iu,
      ],
      confidence: 0.9,
    },
    {
      intent: 'recent_transactions',
      patterns: [
        /(aakhri|pichhle|recent|पिछले|आखरी|हाल)\s*(\d+)?\s*(hisab|entry|transactions?|len den|लेन-देन|लेन\s*देन|हिसाब)/iu,
        /हाल\s*के?\s*(लेन-देन|हिसाब)/iu,
        /(पिछले|आखरी)\s*(लेन-देन|लेन\s*देन|हिसाब)/iu,
      ],
      confidence: 0.95,
      extractCount: true,
    },
    {
      intent: 'monthly_credit_summary',
      patterns: [
        /(mahine|month|monthly|महीने|मासिक)\s*(ka|ki|की|का)?\s*(hisab|summary|udhaar|bikri|बिक्री|हिसाब|उधार)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'top_debtors',
      patterns: [
        /(sabse\s*(jyada|zyada|bada)|top|टॉप|सबसे\s*(ज़्यादा|ज्यादा|बड़ा))\s*(udhaar|baaki|denedar|उधार|बाकी|देनदार)/iu,
        /kiska\s*(sabse\s*jyada|jyada)\s*udhaar/iu,
        /किसका\s*(सबसे\s*ज़्यादा|ज़्यादा|ज्यादा)\s*उधार/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'today',
      patterns: [/(?:^|[^\p{L}])(aaj|aaj ka|today|आज|आज\s*का)(?:$|[^\p{L}])/iu],
      timeframe: 'today',
      confidence: 0.9,
    },
    {
      intent: 'yesterday',
      patterns: [/(?:^|[^\p{L}])(kal|kal ka|yesterday|कल|कल\s*का|बीता\s*कल)(?:$|[^\p{L}])/iu],
      timeframe: 'yesterday',
      confidence: 0.9,
    },
    {
      intent: 'this_week',
      patterns: [/(?:^|[^\p{L}])(is hafte|hafta|this week|इस\s*हफ्ते|हफ्ते\s*का)(?:$|[^\p{L}])/iu],
      timeframe: 'this_week',
      confidence: 0.9,
    },
    {
      intent: 'show_customer_ledger',
      patterns: [
        /(khata|ledger|passbook|खाता|लेजर|पासबुक)\s*(kholo|dikhao|dekho|खोलो|दिखाओ|देखें)/iu,
        /(ग्राहक|customer)\s*का?\s*(लेजर|खाता)/iu,
        /(?!(?:aaj|kal|aakhri|pichhle|mahine|is\s*hafte|आज|कल|आखरी|पिछले|महीने|इस\s*हफ्ते|कुल|दिन|sabse|top)\b)([a-zA-Z\u0900-\u097F]+)\s*(?:ka|ki|ke|का|की|के)?\s*(?:khata|ledger|record|passbook|खाता|लेजर|रिकॉर्ड|पासबुक)/iu,
        /(?:khata|ledger|record|खाता|लेजर|रिकॉर्ड)\s*(?:dikhao|kholo|dekho|दिखाओ|खोलो|देखें)/iu,
      ],
      confidence: 0.92,
    },
    {
      intent: 'next',
      patterns: [/(?:^|[^\p{L}])(aage|agla|next|आगे|अगला)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'previous',
      patterns: [/(?:^|[^\p{L}])(peeche|pichhla|previous|पीछे|पिछला)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'repeat',
      patterns: [/(?:^|[^\p{L}])(fir se|dobara|repeat|फिर\s*से|दोबारा)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'back',
      patterns: [/(?:^|[^\p{L}])(wapas|wapas jao|peeche jao|back|वापस|वापस\s*जाओ)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'close',
      patterns: [/(?:^|[^\p{L}])(band karo|hatao|close|बंद\s*करो|हटाओ|स्क्रीन\s*बंद)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'open_bill_scan',
      patterns: [
        /(?:scan|स्कैन|फोटो|photo|camera|कैमरा|खींचो|kheecho)\s*(?:the\s*|a\s*|का\s*|की\s*)?(?:bill|receipt|invoice|बिल|पर्चा|रसीद)/iu,
        /(?:bill|receipt|invoice|बिल|पर्चा|रसीद)\s*(?:का\s*|की\s*|को\s*)?(?:scan|स्कैन|photo|फोटो|खींचो|kheecho|camera|कैमरा)/iu,
        /bill\s*(scan|kheecho|photo|camera)/iu,
        /बिल\s*(स्कैन|फोटो|खींचो)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_stock',
      patterns: [
        /(stock|inventory|godam|स्टॉक)\s*(kholo|dikhao|खोलो|दिखाओ|स्क्रीन)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_ledger',
      patterns: [
        /(ledger|khata book|customer list|लेजर)\s*(kholo|dikhao|खोलो|दिखाओ)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_today',
      patterns: [
        /aaj\s*ka\s*(hisab|page|screen)\s*(kholo|dikhao)/iu,
        /आज\s*का\s*(हिसाब|स्क्रीन)\s*(खोलो|दिखाओ)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'play_proof',
      patterns: [
        /(awaaz|proof|recording|voice)\s*(sunao|play|chalao)/iu,
        /(आवाज़|रिकॉर्डिंग|प्रूफ)\s*(सुनाओ|चलाओ|सुनें)/iu,
      ],
      confidence: 0.95,
    },
  ],
};

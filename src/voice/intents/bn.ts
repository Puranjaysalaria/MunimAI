import { LanguagePhraseTable } from '../types';

export const bnIntents: LanguagePhraseTable = {
  language: 'bn',
  yesKeywords: ['hyan', 'theek', 'shothik', 'হ্যাঁ', 'ঠিক আছে', 'সঠিক'],
  noKeywords: ['na', 'vul', 'noy', 'না', 'ভুল', 'নয়'],
  undoKeywords: ['ferot nao', 'bad dao', 'undo', 'ফেরত নাও', 'বাতিল করো', 'বাদ দাও', 'ফেরত'],
  intents: [
    {
      intent: 'show_low_stock',
      patterns: [
        /(kom|shes)\s*(stock|maal|jinish)/iu,
        /কম\s*স্টক/iu,
        /কোন\s*মাল\s*শেষ\s*হয়ে\s*গেছে/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'send_order',
      patterns: [
        /order\s*pathan/iu,
        /অর্ডার\s*পাঠান/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'build_order_list',
      patterns: [
        /order\s*(list|talika)\s*tairi/iu,
        /অর্ডার\s*তালিকা\s*তৈরি\s*করুন/iu,
        /তালিকা\s*বানান/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'order_item',
      patterns: [
        /(maal|item)\s*(order|pathao)/iu,
        /অর্ডার\s*করুন/iu,
        /পণ্য\s*অর্ডার\s*করুন/iu,
      ],
      confidence: 0.92,
    },
    {
      intent: 'recent_transactions',
      patterns: [
        /(shomprotik|sesh|সাম্প্রতিক|শেষ)\s*(\d+)?\s*(hishab|lenden|লেনদেন)/iu,
        /সাম্প্রতিক\s*লেনদেন/iu,
        /শেষ\s*লেনদেন/iu,
      ],
      confidence: 0.95,
      extractCount: true,
    },
    {
      intent: 'monthly_credit_summary',
      patterns: [
        /(masher|mashik|মাসের|মাসিক)\s*(hishab|summary|হিসাব|সারাংশ)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'top_debtors',
      patterns: [
        /(shobcheye beshi|top|সবচেয়ে\s*বেশি|টপ)\s*(baki|dhar|বাকি|বাকিদার)/iu,
        /কার\s*সবচেয়ে\s*বেশি\s*বাকি/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'show_customer_ledger',
      patterns: [
        /(khata|ledger|hishab)\s*(kholun|dekhun)/iu,
        /(খাতা|লেজার|হিসাব)\s*(খুলুন|দেখান)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'next',
      patterns: [/(?:^|[^\p{L}])(poroborti|next|পরবর্তী|সামনে)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'previous',
      patterns: [/(?:^|[^\p{L}])(purboborti|prev|পূর্ববর্তী|পেছনে)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'repeat',
      patterns: [/(?:^|[^\p{L}])(aabar bolun|aarekbar|আবার\s*বলুন)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'back',
      patterns: [/(?:^|[^\p{L}])(fire jao|pechhone|ফিরে\s*যাও|ফিরে)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'close',
      patterns: [/(?:^|[^\p{L}])(bondho korun|bondho|বন্ধ\s*করুন|বন্ধ)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'today',
      patterns: [/(?:^|[^\p{L}])(aaj|aajke|আজ|আজকের)(?:$|[^\p{L}])/iu],
      timeframe: 'today',
      confidence: 0.92,
    },
    {
      intent: 'yesterday',
      patterns: [/(?:^|[^\p{L}])(gotokal|গতকাল|গতকালের)(?:$|[^\p{L}])/iu],
      timeframe: 'yesterday',
      confidence: 0.92,
    },
    {
      intent: 'this_week',
      patterns: [/(?:^|[^\p{L}])(ei shoptahe|এই\s*সপ্তাহে)(?:$|[^\p{L}])/iu],
      timeframe: 'this_week',
      confidence: 0.92,
    },
    {
      intent: 'open_bill_scan',
      patterns: [
        /bill\s*(scan|photo)/iu,
        /বিল\s*স্ক্যান\s*করুন/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_stock',
      patterns: [
        /stock\s*kholun/iu,
        /স্টক\s*খুলুন/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_ledger',
      patterns: [
        /ledger\s*kholun/iu,
        /লেজার\s*খুলুন/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_today',
      patterns: [
        /aajker\s*hishab/iu,
        /আজকের\s*হিসাব\s*খুলুন/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'play_proof',
      patterns: [
        /shobdo\s*shonun/iu,
        /(রেকর্ডিং|আওয়াজ)\s*শোনান/iu,
      ],
      confidence: 0.95,
    },
  ],
};

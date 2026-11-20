import { LanguagePhraseTable } from '../types';

export const taIntents: LanguagePhraseTable = {
  language: 'ta',
  yesKeywords: ['aam', 'sari', 'seri', 'unmai', 'ஆம்', 'சரி', 'உண்மை'],
  noKeywords: ['illai', 'illa', 'thavaru', 'இல்லை', 'தவறு', 'வேண்டாம்'],
  undoKeywords: ['thirumba sei', 'thavirthu vidu', 'undo', 'திரும்ப செய்', 'ரத்து செய்'],
  intents: [
    {
      intent: 'show_low_stock',
      patterns: [
        /(kuraivaana|kammi)\s*(stock|porul)/iu,
        /குறைந்த\s*இருப்பு/iu,
        /எந்த\s*பொருள்\s*குறைவாக\s*உள்ளது/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'send_order',
      patterns: [
        /order\s*anuppu/iu,
        /ஆர்டர்\s*அனுப்பு/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'build_order_list',
      patterns: [
        /order\s*(list|pattiyal)\s*uruvakku/iu,
        /ஆர்டர்\s*பட்டியல்\s*உருவாக்கு/iu,
        /பட்டியல்\s*தயார்\s*செய்/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'order_item',
      patterns: [
        /(porul|item)\s*(order|vaangu)/iu,
        /ஆர்டர்\s*செய்/iu,
        /பொருள்\s*ஆர்டர்\s*செய்/iu,
      ],
      confidence: 0.92,
    },
    {
      intent: 'recent_transactions',
      patterns: [
        /(sameebathiya|kadisi|சமீபத்திய|கடைசி)\s*(\d+)?\s*(kanakku|parivarthanai|பரிவர்த்தனை|பரிவர்த்தனைகள்)/iu,
        /சமீபத்திய\s*பரிவர்த்தனைகள்/iu,
        /கடைசி\s*பரிவர்த்தனை/iu,
      ],
      confidence: 0.95,
      extractCount: true,
    },
    {
      intent: 'monthly_credit_summary',
      patterns: [
        /(maatha|maadham|மாத|மாதாந்திர)\s*(kanakku|summary|கணக்கு|அறிக்கை)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'top_debtors',
      patterns: [
        /(athika|top|அதிக|டாப்)\s*(paakki|kadan|பாக்கி|கடனாளிகள்)/iu,
        /யாருக்கு\s*அதிக\s*பாக்கி/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'show_customer_ledger',
      patterns: [
        /(kanakku|ledger|passbook)\s*(thira|kaattu)/iu,
        /(கணக்கு|லெட்ஜர்)\s*(திற|காட்டு)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'next',
      patterns: [/(?:^|[^\p{L}])(aduthu|next|அடுத்து)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'previous',
      patterns: [/(?:^|[^\p{L}])(munthaiya|prev|முந்தைய)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'repeat',
      patterns: [/(?:^|[^\p{L}])(meendum sol|marubadiyum|மீண்டும்\s*சொல்|மீண்டும்)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'back',
      patterns: [/(?:^|[^\p{L}])(thirumbu|pinnal|திரும்பு)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'close',
      patterns: [/(?:^|[^\p{L}])(moodu|moodavum|மூடு)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'today',
      patterns: [/(?:^|[^\p{L}])(indru|indraiya|இன்று|இன்றைய)(?:$|[^\p{L}])/iu],
      timeframe: 'today',
      confidence: 0.92,
    },
    {
      intent: 'yesterday',
      patterns: [/(?:^|[^\p{L}])(netru|netraya|நேற்று)(?:$|[^\p{L}])/iu],
      timeframe: 'yesterday',
      confidence: 0.92,
    },
    {
      intent: 'this_week',
      patterns: [/(?:^|[^\p{L}])(intha vaaram|இந்த\s*வாரம்)(?:$|[^\p{L}])/iu],
      timeframe: 'this_week',
      confidence: 0.92,
    },
    {
      intent: 'open_bill_scan',
      patterns: [
        /bill\s*(scan|photo)/iu,
        /பில்\s*ஸ்கேன்\s*செய்/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_stock',
      patterns: [
        /stock\s*thira/iu,
        /இருப்பு\s*திற/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_ledger',
      patterns: [
        /ledger\s*thira/iu,
        /லெட்ஜர்\s*திற/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_today',
      patterns: [
        /indraiya\s*kanakku/iu,
        /இன்றைய\s*கணக்கு\s*திற/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'play_proof',
      patterns: [
        /kural\s*kel/iu,
        /(குரல்|பதிவை)\s*கேள்/iu,
      ],
      confidence: 0.95,
    },
  ],
};

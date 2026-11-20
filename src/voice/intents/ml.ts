import { LanguagePhraseTable } from '../types';

export const mlIntents: LanguagePhraseTable = {
  language: 'ml',
  yesKeywords: ['athe', 'shari', 'theerchayayi', 'അതെ', 'ശരി', 'തീർച്ചയായും'],
  noKeywords: ['alla', 'illa', 'venda', 'thettu', 'അല്ല', 'ഇല്ല', 'വേണ്ട', 'തെറ്റ്'],
  undoKeywords: ['thirike edukka', 'cancel cheyyuka', 'undo', 'റദ്ദാക്കുക', 'തിരികെ എടുക്കുക', 'റദ്ദാ'],
  intents: [
    {
      intent: 'show_low_stock',
      patterns: [
        /(kuranja|theeraaraaya)\s*(stock|saadhanam)/iu,
        /കുറഞ്ഞ\s*സ്റ്റോക്ക്/iu,
        /ഏത്\s*സാധനമാണ്\s*തീർന്നത്/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'send_order',
      patterns: [
        /order\s*ayakkuka/iu,
        /ഓർഡർ\s*അയക്കുക/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'build_order_list',
      patterns: [
        /order\s*(list|pattika)\s*undaakkuka/iu,
        /ഓർഡർ\s*ലിസ്റ്റ്\s*ഉണ്ടാക്കുക/iu,
        /പട്ടിക\s*(തയ്യാറാക്കുക|ഉണ്ടാക്കുക)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'order_item',
      patterns: [
        /(saadhanam|item)\s*(order|varuthuka)/iu,
        /ഓർഡർ\s*ചെയ്യുക/iu,
        /സാധനങ്ങൾ\s*ഓർഡർ\s*ചെയ്യുക/iu,
      ],
      confidence: 0.92,
    },
    {
      intent: 'recent_transactions',
      patterns: [
        /(sameepakaala|oduvil|സമീപകാല|അവസാന)\s*(\d+)?\s*(idapadukal|kanakkukal|ഇടപാടുകൾ|ഇടപാട്)/iu,
        /സമീപകാല\s*ഇടപാടുകൾ/iu,
        /അവസാന\s*ഇടപാട്/iu,
      ],
      confidence: 0.95,
      extractCount: true,
    },
    {
      intent: 'monthly_credit_summary',
      patterns: [
        /(maasa|maasathe|മാസ|മാസാന്ത്യ)\s*(kanakku|summary|കണക്ക്|റിപ്പോർട്ട്)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'top_debtors',
      patterns: [
        /(kooduthal|top|കൂടുതൽ|ടോപ്പ്)\s*(baakki|kadam|ബാക്കി|കടക്കാർ)/iu,
        /ആർക്കാണ്\s*കൂടുതൽ\s*ബാക്കി/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'show_customer_ledger',
      patterns: [
        /(khaatha|ledger|kanakkukal)\s*(thurakkuka|kaaanikkuka)/iu,
        /(ഖാത്ത|ലെഡ്ജർ)\s*(തുറക്കുക|കാണിക്കുക)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'next',
      patterns: [/(?:^|[^\p{L}])(aduthath|next|അടുത്തത്)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'previous',
      patterns: [/(?:^|[^\p{L}])(mumbathe|prev|മുമ്പത്തെ)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'repeat',
      patterns: [/(?:^|[^\p{L}])(veendum parayuka|onnukoodi|വീണ്ടും\s*പറയുക)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'back',
      patterns: [/(?:^|[^\p{L}])(thirike|pinnilekku|തിരികെ)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'close',
      patterns: [/(?:^|[^\p{L}])(adaykkuka|nirthuka|അടയ്ക്കുക)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'today',
      patterns: [/(?:^|[^\p{L}])(innu|innathe|ഇന്ന്|ഇന്നത്തെ)(?:$|[^\p{L}])/iu],
      timeframe: 'today',
      confidence: 0.92,
    },
    {
      intent: 'yesterday',
      patterns: [/(?:^|[^\p{L}])(innale|innalathe|ഇന്നലെ)(?:$|[^\p{L}])/iu],
      timeframe: 'yesterday',
      confidence: 0.92,
    },
    {
      intent: 'this_week',
      patterns: [/(?:^|[^\p{L}])(ee aazhcha|ഈ\s*ആഴ്ച)(?:$|[^\p{L}])/iu],
      timeframe: 'this_week',
      confidence: 0.92,
    },
    {
      intent: 'open_bill_scan',
      patterns: [
        /bill\s*(scan|photo)/iu,
        /ബിൽ\s*സ്കാൻ\s*ചെയ്യുക/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_stock',
      patterns: [
        /stock\s*thurakkuka/iu,
        /സ്റ്റോക്ക്\s*തുറക്കുക/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_ledger',
      patterns: [
        /ledger\s*thurakkuka/iu,
        /ലെഡ്ജർ\s*തുറക്കുക/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_today',
      patterns: [
        /innathe\s*kanakku/iu,
        /ഇന്നത്തെ\s*കണക്ക്\s*തുറക്കുക/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'play_proof',
      patterns: [
        /shabdam\s*kelkkuka/iu,
        /(ശബ്ദം|റെക്കോർഡിംഗ്)\s*കേൾക്കുക/iu,
      ],
      confidence: 0.95,
    },
  ],
};

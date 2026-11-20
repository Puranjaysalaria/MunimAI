import { LanguagePhraseTable } from '../types';

export const teIntents: LanguagePhraseTable = {
  language: 'te',
  yesKeywords: ['avunu', 'sare', 'nijam', 'correct', 'అవును', 'సరే', 'నిజం'],
  noKeywords: ['kaadu', 'vaddu', 'thappu', 'కాదు', 'వద్దు', 'తప్పు'],
  undoKeywords: ['raddu cheyi', 'venakki teesuko', 'undo', 'రద్దు చేయి', 'వెనక్కి తీసుకో'],
  intents: [
    {
      intent: 'show_low_stock',
      patterns: [
        /(thakkuva|ayipoina)\s*(stock|saraku)/iu,
        /తక్కువ\s*స్టాక్/iu,
        /ఏ\s*సరకు\s*తక్కువగా\s*ఉంది/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'send_order',
      patterns: [
        /order\s*pampu/iu,
        /ఆర్డర్\s*పంపు/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'build_order_list',
      patterns: [
        /order\s*(list|jaabitha)\s*thayaaru/iu,
        /ఆర్డర్\s*లిస్ట్\s*తయారు\s*చేయి/iu,
        /జాబితా\s*చేయి/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'order_item',
      patterns: [
        /(saraku|item)\s*(order|theppinchu)/iu,
        /ఆర్డర్\s*చేయండి/iu,
        /సరుకులు\s*ఆర్డర్\s*చేయి/iu,
      ],
      confidence: 0.92,
    },
    {
      intent: 'recent_transactions',
      patterns: [
        /(iteevali|chivari|ఇటీవలి|చివరి)\s*(\d+)?\s*(laavaadeveelu|lekkalu|లావాదేవీలు|లావాదేవీ)/iu,
        /ఇటీవలి\s*లావాదేవీలు/iu,
        /చివరి\s*లావాదేవీలు/iu,
      ],
      confidence: 0.95,
      extractCount: true,
    },
    {
      intent: 'monthly_credit_summary',
      patterns: [
        /(nela|nelavari|నెలవారీ|నెల)\s*(lekkalu|summary|అమ్మకాలు|లెక్క)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'top_debtors',
      patterns: [
        /(ekkuva|top|అత్యధిక|టాప్)\s*(baaki|appu|బాకీ|బాకీదారుల|అప్పు)/iu,
        /ఎవరికి\s*ఎక్కువ\s*బాకీ\s*ఉంది/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'show_customer_ledger',
      patterns: [
        /(khaatha|ledger|lekkalu)\s*(theruvu|choopinchu)/iu,
        /(ఖాతా|లెడ్జర్)\s*(తెరువు|చూపించు)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'next',
      patterns: [/(?:^|[^\p{L}])(tharuvaatha|next|తరువాత)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'previous',
      patterns: [/(?:^|[^\p{L}])(munupati|prev|మునుపటి)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'repeat',
      patterns: [/(?:^|[^\p{L}])(malli cheppu|maro saari|మళ్ళీ\s*చెప్పు|మళ్ళీ)(?:$|[^\p{L}])/iu],
      confidence: 0.95,
    },
    {
      intent: 'back',
      patterns: [/(?:^|[^\p{L}])(venakki|venuka|వెనుకకు)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'close',
      patterns: [/(?:^|[^\p{L}])(moosiveyi|aapu|మూసివేయి)(?:$|[^\p{L}])/iu],
      confidence: 0.92,
    },
    {
      intent: 'today',
      patterns: [/(?:^|[^\p{L}])(ee roju|eroju|ఈ\s*రోజు)(?:$|[^\p{L}])/iu],
      timeframe: 'today',
      confidence: 0.92,
    },
    {
      intent: 'yesterday',
      patterns: [/(?:^|[^\p{L}])(ninna|ninnati|నిన్న)(?:$|[^\p{L}])/iu],
      timeframe: 'yesterday',
      confidence: 0.92,
    },
    {
      intent: 'this_week',
      patterns: [/(?:^|[^\p{L}])(ee vaaram|ఈ\s*వారం)(?:$|[^\p{L}])/iu],
      timeframe: 'this_week',
      confidence: 0.92,
    },
    {
      intent: 'open_bill_scan',
      patterns: [
        /bill\s*(scan|photo)/iu,
        /బిల్\s*స్కాన్\s*చేయి/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_stock',
      patterns: [
        /stock\s*theruvu/iu,
        /స్టాక్\s*తెరువు/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_ledger',
      patterns: [
        /ledger\s*theruvu/iu,
        /లెడ్జర్\s*తెరువు/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'open_today',
      patterns: [
        /ee\s*roju\s*lekkalu/iu,
        /ఈ\s*రోజు\s*లెక్కలు\s*తెరువు/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'play_proof',
      patterns: [
        /voice\s*vinu/iu,
        /(వాయిస్|రికార్డింగ్)\s*విను/iu,
      ],
      confidence: 0.95,
    },
  ],
};

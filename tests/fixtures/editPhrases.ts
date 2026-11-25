import { LanguageCode } from '../../src/i18n/types';

export type EditIntentGroup =
  | 'pending_correction'
  | 'edit_entry'
  | 'change_amount'
  | 'change_item'
  | 'change_customer'
  | 'change_quantity'
  | 'change_date'
  | 'edit_note'
  | 'domain_edits';

export interface EditPhraseFixture {
  phrase: string;
  group: EditIntentGroup;
  reviewStatus: 'needs native review';
  heldOut?: boolean;
}

export type FixtureLocaleKey = LanguageCode | 'hinglish';

function makeFixtures(
  group: EditIntentGroup,
  phrases: string[],
  heldOutTail: number = 5
): EditPhraseFixture[] {
  return phrases.map((phrase, idx) => ({
    phrase,
    group,
    reviewStatus: 'needs native review',
    heldOut: idx >= phrases.length - heldOutTail,
  }));
}

function build30Variants(
  bases: string[],
  prefixes: string[],
  suffixes: string[],
  targetCount: number = 30
): string[] {
  const out = new Set<string>(bases);
  for (const b of bases) {
    for (const p of prefixes) {
      if (out.size >= targetCount) break;
      out.add(`${p} ${b}`.trim());
    }
    for (const s of suffixes) {
      if (out.size >= targetCount) break;
      out.add(`${b} ${s}`.trim());
    }
  }
  return Array.from(out).slice(0, Math.max(targetCount, bases.length));
}

// Stage 1: hi, en, hinglish, pa (>= 30 phrases per intent group)
const hiFixtures: EditPhraseFixture[] = [
  ...makeFixtures(
    'pending_correction',
    build30Variants(
      [
        'नहीं, 600', '600 नहीं 500', 'नहीं 750', 'रमेश कुमार वाला', 'सुनीता वाला',
        'चीनी नहीं आटा', 'आटा नहीं चावल', 'दो किलो नहीं पाँच', '200 और जोड़ो',
        '100 कम करो', 'दोगुना कर दो', 'आधा कर दो', 'थोड़ा कम करो', 'आज नहीं कल',
      ],
      ['अरे', 'सुनो'],
      ['कर दो', 'लिखो']
    )
  ),
  ...makeFixtures(
    'edit_entry',
    build30Variants(
      ['पिछली एंट्री बदलो', 'एंट्री सुधारो', 'आखिरी लेन-देन बदलो', 'हिसाब सही करो', 'गलत एंट्री सुधारो'],
      ['अरे', 'भैया', 'जरा', 'प्लीज', 'सुनो'],
      ['अभी', 'तुरंत']
    )
  ),
  ...makeFixtures(
    'change_amount',
    build30Variants(
      ['रकम बदलो 600', 'अमाउंट बदल दो 700', 'पैसे सुधारो 500', 'रुपये बदलो 450', 'अमाउंट सही करो 800'],
      ['जरा', 'भैया', 'सुनो', 'प्लीज', 'अरे'],
      ['कर दो', 'अभी']
    )
  ),
  ...makeFixtures(
    'change_item',
    build30Variants(
      ['सामान बदलो', 'चीज़ बदल दो', 'आइटम बदलो', 'सामान सुधारो', 'आइटम चेंज करो'],
      ['जरा', 'भैया', 'सुनो', 'प्लीज', 'अरे'],
      ['अभी', 'तुरंत']
    )
  ),
  ...makeFixtures(
    'change_customer',
    build30Variants(
      ['ग्राहक बदलो', 'नाम बदल दो', 'कस्टमर बदलो', 'ग्राहक सही करो', 'नाम सुधारो'],
      ['जरा', 'भैया', 'सुनो', 'प्लीज', 'अरे'],
      ['अभी', 'तुरंत']
    )
  ),
  ...makeFixtures(
    'change_quantity',
    build30Variants(
      ['मात्रा बदलो 5', 'क्वांटिटी बदल दो', 'वजन बदलो 3 किलो', 'मात्रा बढ़ाओ', 'क्वांटिटी सुधारो'],
      ['जरा', 'भैया', 'सुनो', 'प्लीज', 'अरे'],
      ['अभी', 'कर दो']
    )
  ),
  ...makeFixtures(
    'change_date',
    build30Variants(
      ['तारीख बदलो', 'तारीख़ बदल दो', 'डेट बदलो', 'दिन बदल दो', 'तारीख सही करो'],
      ['जरा', 'भैया', 'सुनो', 'प्लीज', 'अरे'],
      ['अभी', 'कल की']
    )
  ),
  ...makeFixtures(
    'edit_note',
    build30Variants(
      ['नोट बदलो', 'नोट जोड़ो', 'टिप्पणी बदलो', 'रिमार्क एडिट करो', 'नोट सुधारो'],
      ['जरा', 'भैया', 'सुनो', 'प्लीज', 'अरे'],
      ['अभी', 'इस पर']
    )
  ),
  ...makeFixtures(
    'domain_edits',
    build30Variants(
      ['चीनी का स्टॉक 25 किलो कर दो', 'फर्म टोन करो', 'यूपीआई हटाओ', 'आटा हटाओ', 'फ़ोन नंबर 9876543210 कर दो'],
      ['जरा', 'सुनो', 'भैया', 'प्लीज', 'अरे'],
      ['अभी', 'तुरंत']
    )
  ),
];

const enFixtures: EditPhraseFixture[] = [
  ...makeFixtures(
    'pending_correction',
    build30Variants(
      [
        'no, 600', '600 not 500', 'no 850', 'Ramesh Kumar', 'Sunita',
        'not sugar, flour', 'flour not rice', '2 kilo not 5', 'add 200',
        'subtract 100', 'double it', 'half it', 'slightly less', 'yesterday',
      ],
      ['sorry', 'wait'],
      ['please', 'now']
    )
  ),
  ...makeFixtures(
    'edit_entry',
    build30Variants(
      ['edit the last entry', 'change previous transaction', 'fix recent entry', 'update the entry', 'modify last bill'],
      ['please', 'hey', 'can you', 'kindly', 'just'],
      ['now', 'please']
    )
  ),
  ...makeFixtures(
    'change_amount',
    build30Variants(
      ['change the amount to 600', 'edit amount 700', 'update total 500', 'fix amount 450', 'correct rupees 800'],
      ['please', 'kindly', 'hey', 'just', 'can you'],
      ['now', 'please']
    )
  ),
  ...makeFixtures(
    'change_item',
    build30Variants(
      ['change the item', 'replace item', 'update product', 'edit item', 'switch the item'],
      ['please', 'kindly', 'hey', 'just', 'can you'],
      ['now', 'please']
    )
  ),
  ...makeFixtures(
    'change_customer',
    build30Variants(
      ['change the customer', 'update customer', 'edit buyer name', 'switch customer', 'fix customer name'],
      ['please', 'kindly', 'hey', 'just', 'can you'],
      ['now', 'please']
    )
  ),
  ...makeFixtures(
    'change_quantity',
    build30Variants(
      ['change quantity to 5', 'edit qty 3', 'update weight 4', 'adjust quantity 6', 'fix kilos 2'],
      ['please', 'kindly', 'hey', 'just', 'can you'],
      ['now', 'please']
    )
  ),
  ...makeFixtures(
    'change_date',
    build30Variants(
      ['change the date', 'update date', 'edit day', 'fix the date', 'correct date'],
      ['please', 'kindly', 'hey', 'just', 'can you'],
      ['to yesterday', 'now']
    )
  ),
  ...makeFixtures(
    'edit_note',
    build30Variants(
      ['edit the note', 'add note', 'update remark', 'change comment', 'fix memo'],
      ['please', 'kindly', 'hey', 'just', 'can you'],
      ['now', 'please']
    )
  ),
  ...makeFixtures(
    'domain_edits',
    build30Variants(
      ['update sugar stock to 25', 'firm tone English', 'remove UPI link', 'remove flour', 'phone number 9876543210'],
      ['please', 'kindly', 'hey', 'just', 'can you'],
      ['now', 'please']
    )
  ),
];

const hinglishFixtures: EditPhraseFixture[] = [
  ...makeFixtures(
    'pending_correction',
    build30Variants(
      [
        'nahi, 600', '600 nahi 500', 'nahi 900', 'Ramesh Kumar wala', 'Sunita wala',
        'chini nahi aata', 'aata nahi chawal', 'do kilo nahi paanch', '200 aur jodo',
        '100 kam karo', 'double kar do', 'aadha kar do', 'thoda kam karo', 'aaj nahi kal',
      ],
      ['arre', 'bhaiya'],
      ['kar do', 'likho']
    )
  ),
  ...makeFixtures(
    'edit_entry',
    build30Variants(
      ['pichhli entry badlo', 'last entry edit karo', 'entry sudharo', 'aakhri hisab badal do', 'galat entry sahi karo'],
      ['arre', 'bhaiya', 'please', 'jara', 'suno'],
      ['abhi', 'turant']
    )
  ),
  ...makeFixtures(
    'change_amount',
    build30Variants(
      ['amount badlo 600', 'raqam badal do 700', 'paise sudharo 500', 'rupaye change karo 450', 'amount theek karo 800'],
      ['arre', 'bhaiya', 'please', 'jara', 'suno'],
      ['kar do', 'abhi']
    )
  ),
  ...makeFixtures(
    'change_item',
    build30Variants(
      ['samaan badlo', 'item badal do', 'saaman change karo', 'item sudharo', 'samaan theek karo'],
      ['arre', 'bhaiya', 'please', 'jara', 'suno'],
      ['abhi', 'kar do']
    )
  ),
  ...makeFixtures(
    'change_customer',
    build30Variants(
      ['customer badlo', 'grahak badal do', 'naam change karo', 'customer sudharo', 'naam sahi karo'],
      ['arre', 'bhaiya', 'please', 'jara', 'suno'],
      ['abhi', 'kar do']
    )
  ),
  ...makeFixtures(
    'change_quantity',
    build30Variants(
      ['quantity badlo 5', 'qty badal do 3', 'maatra change karo', 'wazan badlo 4', 'quantity sudharo'],
      ['arre', 'bhaiya', 'please', 'jara', 'suno'],
      ['abhi', 'kar do']
    )
  ),
  ...makeFixtures(
    'change_date',
    build30Variants(
      ['tarikh badlo', 'date badal do', 'taarikh change karo', 'date sudharo', 'tarikh sahi karo'],
      ['arre', 'bhaiya', 'please', 'jara', 'suno'],
      ['abhi', 'kal ki']
    )
  ),
  ...makeFixtures(
    'edit_note',
    build30Variants(
      ['note edit karo', 'note badal do', 'remark jodo', 'tippani badlo', 'note update karo'],
      ['arre', 'bhaiya', 'please', 'jara', 'suno'],
      ['abhi', 'ispar']
    )
  ),
  ...makeFixtures(
    'domain_edits',
    build30Variants(
      ['chini ka stock 25 kilo kar do', 'firm tone English UPI hatao', 'aata hatao', 'chini 15 kilo kar do', 'phone number 9876543210 kar do'],
      ['arre', 'bhaiya', 'please', 'jara', 'suno'],
      ['abhi', 'turant']
    )
  ),
];

const paFixtures: EditPhraseFixture[] = [
  ...makeFixtures(
    'pending_correction',
    build30Variants(
      [
        'nahi, 600', '600 nahi 500', 'Ramesh Kumar wala', 'Sunita wala',
        'chini nahi aata', '2 kilo nahi 5', '200 ਹੋਰ ਜੋੜੋ', '100 ਘਟਾਓ',
        'ਦੁੱਗਣਾ ਕਰੋ', 'ਅੱਧਾ ਕਰੋ', 'ਥੋੜ੍ਹਾ ਘੱਟ ਕਰੋ', '200 aur jodo', 'double kar do', 'kal',
      ],
      ['ਵੀਰ', 'ਹਾਂਜੀ'],
      ['ਕਰ ਦਿਓ', 'ਹੁਣੇ']
    )
  ),
  ...makeFixtures(
    'edit_entry',
    build30Variants(
      ['ਐਂਟਰੀ ਬਦਲੋ', 'ਪਿਛਲੀ ਐਂਟਰੀ ਸੁਧਾਰੋ', 'ਲੈਣ-ਦੇਣ ਠੀਕ ਕਰੋ', 'ਹਿਸਾਬ ਬਦਲ ਦਿਓ', 'ਆਖਰੀ ਐਂਟਰੀ ਐਡਿਟ ਕਰੋ'],
      ['ਵੀਰ', 'ਕਿਰਪਾ ਕਰਕੇ', 'ਜ਼ਰਾ', 'ਸੁਣੋ', 'ਭਾਈ'],
      ['ਹੁਣੇ', 'ਕਰ ਦਿਓ']
    )
  ),
  ...makeFixtures(
    'change_amount',
    build30Variants(
      ['ਰਕਮ ਬਦਲੋ', 'ਪੈਸੇ ਸੁਧਾਰੋ', 'ਰਕਮ ਠੀਕ ਕਰੋ', 'ਰੁਪਏ ਬਦਲ ਦਿਓ', 'ਰਕਮ ਬਦਲ ਦਿਓ 600'],
      ['ਵੀਰ', 'ਕਿਰਪਾ ਕਰਕੇ', 'ਜ਼ਰਾ', 'ਸੁਣੋ', 'ਭਾਈ'],
      ['ਹੁਣੇ', 'ਕਰ ਦਿਓ']
    )
  ),
  ...makeFixtures(
    'change_item',
    build30Variants(
      ['ਸਾਮਾਨ ਬਦਲੋ', 'ਚੀਜ਼ ਬਦਲ ਦਿਓ', 'ਆਈਟਮ ਬਦਲੋ', 'ਸਾਮਾਨ ਠੀਕ ਕਰੋ', 'ਚੀਜ਼ ਬਦਲੋ'],
      ['ਵੀਰ', 'ਕਿਰਪਾ ਕਰਕੇ', 'ਜ਼ਰਾ', 'ਸੁਣੋ', 'ਭਾਈ'],
      ['ਹੁਣੇ', 'ਕਰ ਦਿਓ']
    )
  ),
  ...makeFixtures(
    'change_customer',
    build30Variants(
      ['ਗਾਹਕ ਬਦਲੋ', 'ਨਾਮ ਬਦਲ ਦਿਓ', 'ਗਾਹਕ ਬਦਲ ਦਿਓ', 'ਨਾਮ ਬਦਲੋ', 'ਗਾਹਕ ਠੀਕ ਕਰੋ'],
      ['ਵੀਰ', 'ਕਿਰਪਾ ਕਰਕੇ', 'ਜ਼ਰਾ', 'ਸੁਣੋ', 'ਭਾਈ'],
      ['ਹੁਣੇ', 'ਕਰ ਦਿਓ']
    )
  ),
  ...makeFixtures(
    'change_quantity',
    build30Variants(
      ['ਮਾਤਰਾ ਬਦਲੋ', 'ਕਿਲੋ ਵਧਾਓ', 'ਵਜ਼ਨ ਬਦਲੋ', 'ਮਾਤਰਾ ਬਦਲ ਦਿਓ', 'ਕਿਲੋ ਘਟਾਓ'],
      ['ਵੀਰ', 'ਕਿਰਪਾ ਕਰਕੇ', 'ਜ਼ਰਾ', 'ਸੁਣੋ', 'ਭਾਈ'],
      ['ਹੁਣੇ', 'ਕਰ ਦਿਓ']
    )
  ),
  ...makeFixtures(
    'change_date',
    build30Variants(
      ['ਤਾਰੀਖ਼ ਬਦਲੋ', 'ਦਿਨ ਬਦਲ ਦਿਓ', 'ਤਾਰੀਖ ਬਦਲ ਦਿਓ', 'ਤਾਰੀਖ਼ ਠੀਕ ਕਰੋ', 'ਦਿਨ ਬਦਲੋ'],
      ['ਵੀਰ', 'ਕਿਰਪਾ ਕਰਕੇ', 'ਜ਼ਰਾ', 'ਸੁਣੋ', 'ਭਾਈ'],
      ['ਹੁਣੇ', 'ਕੱਲ੍ਹ ਦੀ']
    )
  ),
  ...makeFixtures(
    'edit_note',
    build30Variants(
      ['ਨੋਟ ਬਦਲੋ', 'ਨੋਟ ਜੋੜੋ', 'ਟਿੱਪਣੀ ਲਿਖੋ', 'ਨੋਟ ਐਡਿਟ ਕਰੋ', 'ਨੋਟ ਲਿਖੋ'],
      ['ਵੀਰ', 'ਕਿਰਪਾ ਕਰਕੇ', 'ਜ਼ਰਾ', 'ਸੁਣੋ', 'ਭਾਈ'],
      ['ਹੁਣੇ', 'ਇਸ ’ਤੇ']
    )
  ),
  ...makeFixtures(
    'domain_edits',
    build30Variants(
      ['ਚੀਨੀ ਸਟਾਕ 25 ਕਿਲੋ ਕਰੋ', 'ਫਰਮ ਟੋਨ ਕਰੋ', 'UPI ਹਟਾਓ', 'ਆਟਾ ਹਟਾਓ', 'ਫ਼ੋਨ ਨੰਬਰ 9876543210 ਕਰੋ'],
      ['ਵੀਰ', 'ਕਿਰਪਾ ਕਰਕੇ', 'ਜ਼ਰਾ', 'ਸੁਣੋ', 'ਭਾਈ'],
      ['ਹੁਣੇ', 'ਕਰ ਦਿਓ']
    )
  ),
];

// Stage 2: gu, mr, bn, ta, te, kn, ml (>= 10 phrases per intent group)
function buildStage2Fixtures(spec: {
  pending: string[];
  editEntry: string[];
  amount: string[];
  item: string[];
  customer: string[];
  qty: string[];
  date: string[];
  note: string[];
  domain: string[];
}): EditPhraseFixture[] {
  return [
    ...makeFixtures('pending_correction', build30Variants(spec.pending, ['please'], ['now'], 10), 2),
    ...makeFixtures('edit_entry', build30Variants(spec.editEntry, ['please', 'now'], ['immediately'], 10), 2),
    ...makeFixtures('change_amount', build30Variants(spec.amount, ['please', 'now'], ['immediately'], 10), 2),
    ...makeFixtures('change_item', build30Variants(spec.item, ['please', 'now'], ['immediately'], 10), 2),
    ...makeFixtures('change_customer', build30Variants(spec.customer, ['please', 'now'], ['immediately'], 10), 2),
    ...makeFixtures('change_quantity', build30Variants(spec.qty, ['please', 'now'], ['immediately'], 10), 2),
    ...makeFixtures('change_date', build30Variants(spec.date, ['please', 'now'], ['immediately'], 10), 2),
    ...makeFixtures('edit_note', build30Variants(spec.note, ['please', 'now'], ['immediately'], 10), 2),
    ...makeFixtures('domain_edits', build30Variants(spec.domain, ['please', 'now'], ['immediately'], 10), 2),
  ];
}

export const STAGED_EDIT_PHRASE_FIXTURES: Record<FixtureLocaleKey, EditPhraseFixture[]> = {
  hi: hiFixtures,
  en: enFixtures,
  hinglish: hinglishFixtures,
  pa: paFixtures,
  gu: buildStage2Fixtures({
    pending: ['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '200 વધારો', '100 ઓછું', 'બમણું', 'અડધું', 'થોડું ઓછું', 'Sunita'],
    editEntry: ['એન્ટ્રી બદલો', 'વ્યવહાર સુધારો', 'હિસાબ એડિટ કરો', 'એન્ટ્રી સુધારો'],
    amount: ['રકમ બદલો', 'પૈસા સુધારો', 'રૂપિયા બદલો', 'રકમ કરો'],
    item: ['સામાન બદલો', 'વસ્તુ સુધારો', 'સામાન સુધારો', 'વસ્તુ બદલો'],
    customer: ['ગ્રાહક બદલો', 'નામ સુધારો', 'ગ્રાહક સુધારો', 'નામ બદલો'],
    qty: ['જથ્થો બદલો', 'માત્રા વધારો', 'કિલો ઘટાડો', 'જથ્થો સુધારો'],
    date: ['તારીખ બદલો', 'દિવસ સુધારો', 'તારીખ સુધારો', 'દિવસ બદલો'],
    note: ['નોંધ બદલો', 'નોટ ઉમેરો', 'નોંધ સુધારો', 'નોટ બદલો'],
    domain: ['sugar stock 25', 'firm tone Gujarati', 'remove UPI', 'remove flour', 'phone number 9876543210'],
  }),
  mr: buildStage2Fixtures({
    pending: ['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '200 वाढवा', '100 कमी करा', 'दुप्पट', 'अर्धा', 'थोडं कमी', 'Sunita'],
    editEntry: ['व्यवहार बदला', 'एंट्री सुधारा', 'हिशोब एडिट करा', 'नोंद बदला'],
    amount: ['रक्कम बदला', 'पैसे सुधारा', 'रुपये बदला', 'रक्कम करा'],
    item: ['वस्तू बदला', 'सामान सुधारा', 'वस्तू सुधारा', 'सामान बदला'],
    customer: ['ग्राहक बदला', 'नाव सुधारा', 'ग्राहक सुधारा', 'नाव बदला'],
    qty: ['प्रमाण बदला', 'वजन वाढवा', 'किलो कमी करा', 'प्रमाण सुधारा'],
    date: ['तारीख बदला', 'दिवस सुधारा', 'तारीख सुधारा', 'दिवस बदला'],
    note: ['नोंद बदला', 'टीप जोडा', 'नोट सुधारा', 'टीप बदला'],
    domain: ['sugar stock 25', 'firm tone Marathi', 'remove UPI', 'remove flour', 'phone number 9876543210'],
  }),
  bn: buildStage2Fixtures({
    pending: ['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '200 যোগ', '100 কমাও', 'দ্বিগুণ', 'অর্ধেক', 'একটু কম', 'Sunita'],
    editEntry: ['এন্ট্রি বদলাও', 'লেনদেন ঠিক করো', 'হিসাব এডিট করো', 'এন্ট্রি পরিবর্তন করো'],
    amount: ['টাকা বদলাও', 'পরিমাণ পরিবর্তন করো', 'দাম ঠিক করো', 'টাকা ঠিক করো'],
    item: ['জিনিস বদলাও', 'পণ্য পরিবর্তন করো', 'সওদা বদলাও', 'জিনিস পরিবর্তন করো'],
    customer: ['গ্রাহক বদলাও', 'নাম পরিবর্তন করো', 'ক্রেতা বদলাও', 'নাম বদলাও'],
    qty: ['ওজন বদলাও', 'কেজি বাড়াও', 'পরিমাণ কমাও', 'পরিমাণ বদলাও'],
    date: ['তারিখ বদলাও', 'দিন পরিবর্তন করো', 'তারিখ পরিবর্তন করো', 'দিন বদলাও'],
    note: ['নোট বদলাও', 'মন্তব্য যোগ করো', 'নোট এডিট করো', 'মন্তব্য বদলাও'],
    domain: ['sugar stock 25', 'firm tone Bengali', 'remove UPI', 'remove flour', 'phone number 9876543210'],
  }),
  ta: buildStage2Fixtures({
    pending: ['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '200 கூட்டு', '100 குறை', 'இரட்டிப்பு', 'பாதி', 'கொஞ்சம் குறை', 'Sunita'],
    editEntry: ['பதிவு மாற்று', 'பரிவர்த்தனை திருத்து', 'கணக்கு மாற்று', 'பதிவு திருத்து'],
    amount: ['தொகை மாற்று', 'பணம் திருத்து', 'விலை மாற்று', 'தொகை திருத்து'],
    item: ['பொருள் மாற்று', 'சரக்கு திருத்து', 'பொருள் திருத்து', 'சரக்கு மாற்று'],
    customer: ['வாடிக்கையாளர் மாற்று', 'பெயர் திருத்து', 'வாடிக்கையாளர் திருத்து', 'பெயர் மாற்று'],
    qty: ['அளவு மாற்று', 'எடை திருத்து', 'கிலோ மாற்று', 'அளவு திருத்து'],
    date: ['தேதி மாற்று', 'நாள் திருத்து', 'தேதி திருத்து', 'நாள் மாற்று'],
    note: ['குறிப்பு மாற்று', 'நோட் சேர்', 'குறிப்பு திருத்து', 'நோட் மாற்று'],
    domain: ['sugar stock 25', 'firm tone Tamil', 'remove UPI', 'remove flour', 'phone number 9876543210'],
  }),
  te: buildStage2Fixtures({
    pending: ['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '200 కలుపు', '100 తగ్గించు', 'రెట్టింపు', 'సగం', 'కొంచెం తగ్గించు', 'Sunita'],
    editEntry: ['ఎంట్రీ మార్చు', 'లావాదేవీ సరిచేయు', 'లెక్క మార్చు', 'ఎంట్రీ సరిచేయు'],
    amount: ['మొత్తం మార్చు', 'డబ్బు సరిచేయు', 'ధర మార్చు', 'మొత్తం సరిచేయు'],
    item: ['వస్తువు మార్చు', 'సరుకు సరిచేయు', 'వస్తువు సరిచేయు', 'సరుకు మార్చు'],
    customer: ['కస్టమర్ మార్చు', 'పేరు సరిచేయు', 'కస్టమర్ సరిచేయు', 'పేరు మార్చు'],
    qty: ['పరిమాణం మార్చు', 'బరువు సరిచేయు', 'కిలో మార్చు', 'పరిమాణం సరిచేయు'],
    date: ['తేదీ మార్చు', 'రోజు సరిచేయు', 'తేదీ సరిచేయు', 'రోజు మార్చు'],
    note: ['నోట్ మార్చు', 'గమనిక చేర్చు', 'నోట్ సరిచేయు', 'గమనిక మార్చు'],
    domain: ['sugar stock 25', 'firm tone Telugu', 'remove UPI', 'remove flour', 'phone number 9876543210'],
  }),
  kn: buildStage2Fixtures({
    pending: ['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '200 ಸೇರಿಸಿ', '100 ಕಡಿಮೆ', 'ಎರಡು ಪಟ್ಟು', 'ಅರ್ಧ', 'ಸ್ವಲ್ಪ ಕಡಿಮೆ', 'Sunita'],
    editEntry: ['ಎಂಟ್ರಿ ಬದಲಾಯಿಸಿ', 'ವಹಿವಾಟು ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ಲೆಕ್ಕ ಬದಲಾಯಿಸಿ', 'ಎಂಟ್ರಿ ತಿದ್ದುಪಡಿ ಮಾಡಿ'],
    amount: ['ಮೊತ್ತ ಬದಲಾಯಿಸಿ', 'ಹಣ ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ಬೆಲೆ ಬದಲಾಯಿಸಿ', 'ಮೊತ್ತ ತಿದ್ದುಪಡಿ ಮಾಡಿ'],
    item: ['ವಸ್ತು ಬದಲಾಯಿಸಿ', 'ಸಾಮಾನು ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ವಸ್ತು ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ಸಾಮಾನು ಬದಲಾಯಿಸಿ'],
    customer: ['ಗ್ರಾಹಕ ಬದಲಾಯಿಸಿ', 'ಹೆಸರು ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ಗ್ರಾಹಕ ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ಹೆಸರು ಬದಲಾಯಿಸಿ'],
    qty: ['ಪ್ರಮಾಣ ಬದಲಾಯಿಸಿ', 'ತೂಕ ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ಕಿಲೋ ಬದಲಾಯಿಸಿ', 'ಪ್ರಮಾಣ ತಿದ್ದುಪಡಿ ಮಾಡಿ'],
    date: ['ದಿನಾಂಕ ಬದಲಾಯಿಸಿ', 'ದಿನ ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ದಿನಾಂಕ ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ದಿನ ಬದಲಾಯಿಸಿ'],
    note: ['ಟಿಪ್ಪಣಿ ಬದಲಾಯಿಸಿ', 'ನೋಟ್ ಸೇರಿಸಿ', 'ಟಿಪ್ಪಣಿ ಸೇರಿಸಿ', 'ನೋಟ್ ಬದಲಾಯಿಸಿ'],
    domain: ['sugar stock 25', 'firm tone Kannada', 'remove UPI', 'remove flour', 'phone number 9876543210'],
  }),
  ml: buildStage2Fixtures({
    pending: ['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '200 കൂട്ടൂ', '100 കുറയ്ക്കൂ', 'ഇരട്ടി', 'പകുതി', 'കുറച്ച് കുറയ്ക്കൂ', 'Sunita'],
    editEntry: ['എൻട്രി മാറ്റുക', 'ഇടപാട് തിരുത്തുക', 'കണക്ക് മാറ്റുക', 'എൻട്രി തിരുത്തുക'],
    amount: ['തുക മാറ്റുക', 'പണം തിരുത്തുക', 'വില മാറ്റുക', 'തുക തിരുത്തുക'],
    item: ['സാധനം മാറ്റുക', 'വസ്തു തിരുത്തുക', 'സാധനം തിരുത്തുക', 'വസ്തു മാറ്റുക'],
    customer: ['ഉപഭോക്താവ് മാറ്റുക', 'പേര് തിരുത്തുക', 'ഉപഭോക്താവ് തിരുത്തുക', 'പേര് മാറ്റുക'],
    qty: ['അളവ് മാറ്റുക', 'തൂക്കം തിരുത്തുക', 'കിലോ മാറ്റുക', 'അളവ് തിരുത്തുക'],
    date: ['തീയതി മാറ്റുക', 'ദിവസം തിരുത്തുക', 'തീയതി തിരുത്തുക', 'ദിവസം മാറ്റുക'],
    note: ['കുറിപ്പ് മാറ്റുക', 'നോട്ട് ചേർക്കുക', 'കുറിപ്പ് തിരുത്തുക', 'നോട്ട് മാറ്റുക'],
    domain: ['sugar stock 25', 'firm tone Malayalam', 'remove UPI', 'remove flour', 'phone number 9876543210'],
  }),
};

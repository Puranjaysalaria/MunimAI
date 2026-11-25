import { describe, it, expect } from 'vitest';
import { LanguageCode } from '../src/i18n/types';
import { parsePendingCorrection } from '../src/voice/pendingCorrectionParser';
import { routeVoiceIntent } from '../src/voice/intentRouter';
import { resolveTargetEntry } from '../src/voice/entryResolver';
import { buildAppendOnlyCorrection, getEffectiveTransactions } from '../src/lib/correctionService';
import { analyzeEditSideEffects } from '../src/voice/sideEffectAnalyzer';
import { evaluateEditSafetyTier, canCompleteByVoiceConfirm } from '../src/voice/safetyTiers';
import {
  parseReminderPreviewEdit,
  parseSupplierOrderEdit,
  parseStockCountEdit,
  parseCustomerDetailEdit,
} from '../src/voice/domainEditParser';
import { INITIAL_CUSTOMERS, INITIAL_ITEMS } from '../src/data/mockData';
import { PendingConfirmation } from '../src/components/ConfirmationCard/ConfirmationCard';
import { Transaction, User } from '../src/types/schema';

const ALL_LANGUAGES: LanguageCode[] = ['hi', 'en', 'pa', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml'];

const basePending: PendingConfirmation = {
  intent: 'credit',
  customer: INITIAL_CUSTOMERS[0],
  customerName: INITIAL_CUSTOMERS[0].name,
  amount: 500,
  item: INITIAL_ITEMS[0],
  itemName: INITIAL_ITEMS[0].name,
  quantity: 2,
  unit: 'kilo',
  rawText: 'Ramesh Sharma 500 udhaar',
};

const ownerUser: User = {
  id: 'usr-1',
  shop_id: 'shop-1',
  phone: '+919876543210',
  name: 'Madan Lal Sharma',
  role: 'owner',
};

// 30+ correction phrases per language across intent groups (pending slot corrections, relative edits, saved-entry edits)
const MULTILINGUAL_CORRECTION_PHRASES: Record<LanguageCode, Array<{ phrase: string; kind: 'pending' | 'saved_edit'; expected?: string }>> = {
  hi: [
    ...['nahi, 600', '600 nahi 500', 'nahi 800', '1000 nahi 900', 'Ramesh Kumar wala', 'Sunita wala', 'chini nahi aata', 'aata nahi chawal', 'do kilo nahi paanch', '2 kilo nahi 4 kilo', '200 aur jodo', '100 kam karo', 'double kar do', 'aadha kar do', 'thoda kam karo', 'aaj nahi kal'].map((p) => ({ phrase: p, kind: 'pending' as const })),
    ...['रकम बदलो 600', 'अमाउंट बदल दो 700', 'पैसे सुधारो 500', 'सामान बदलो', 'चीज़ बदल दो', 'आइटम बदलो', 'ग्राहक बदलो', 'नाम बदल दो', 'मात्रा बदलो 5', 'क्वांटिटी बदल दो', 'तारीख बदलो', 'डेट बदल दो', 'नोट बदलो', 'पिछली एंट्री बदलो', 'एंट्री सुधारो'].map((p) => ({ phrase: p, kind: 'saved_edit' as const })),
  ],
  en: [
    ...['no, 600', '600 not 500', 'no 850', '1000 not 900', 'Ramesh Kumar', 'Sunita', 'not sugar, flour', 'flour not rice', '2 kilo not 5', 'add 200', 'subtract 100', 'double it', 'half it', 'slightly less', 'yesterday', 'note: urgent'].map((p) => ({ phrase: p, kind: 'pending' as const })),
    ...['change the amount to 600', 'edit amount 700', 'update total 500', 'change the item', 'replace item', 'change the customer', 'update customer', 'change quantity to 5', 'edit qty 3', 'change the date', 'update date', 'edit the note', 'add note', 'edit the last entry', 'fix previous transaction'].map((p) => ({ phrase: p, kind: 'saved_edit' as const })),
  ],
  pa: [
    ...['nahi, 600', '600 nahi 500', 'Ramesh Kumar wala', 'chini nahi aata', '2 kilo nahi 5', '200 ਹੋਰ ਜੋੜੋ', '100 ਘਟਾਓ', 'ਦੁੱਗਣਾ ਕਰੋ', 'ਅੱਧਾ ਕਰੋ', 'ਥੋੜ੍ਹਾ ਘੱਟ ਕਰੋ', '200 aur jodo', 'double kar do', 'aadha kar do', 'thoda kam karo', 'kal'].map((p) => ({ phrase: p, kind: 'pending' as const })),
    ...['ਰਕਮ ਬਦਲੋ', 'ਪੈਸੇ ਸੁਧਾਰੋ', 'ਰਕਮ ਠੀਕ ਕਰੋ', 'ਸਾਮਾਨ ਬਦਲੋ', 'ਚੀਜ਼ ਬਦਲ ਦਿਓ', 'ਗਾਹਕ ਬਦਲੋ', 'ਨਾਮ ਬਦਲ ਦਿਓ', 'ਮਾਤਰਾ ਬਦਲੋ', 'ਕਿਲੋ ਵਧਾਓ', 'ਤਾਰੀਖ਼ ਬਦਲੋ', 'ਦਿਨ ਬਦਲ ਦਿਓ', 'ਨੋਟ ਬਦਲੋ', 'ਨੋਟ ਜੋੜੋ', 'ਐਂਟਰੀ ਬਦਲੋ', 'ਪਿਛਲੀ ਐਂਟਰੀ ਸੁਧਾਰੋ'].map((p) => ({ phrase: p, kind: 'saved_edit' as const })),
  ],
  gu: [
    ...['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '2 kilo nahi 5', '200 વધારો', '100 ઓછું', 'બમણું', 'અડધું', 'થોડું ઓછું', 'add 200', 'double', 'half', 'yesterday', 'Sunita'].map((p) => ({ phrase: p, kind: 'pending' as const })),
    ...['રકમ બદલો', 'પૈસા સુધારો', 'રૂપિયા બદલો', 'સામાન બદલો', 'વસ્તુ સુધારો', 'ગ્રાહક બદલો', 'નામ સુધારો', 'જથ્થો બદલો', 'માત્રા વધારો', 'તારીખ બદલો', 'દિવસ સુધારો', 'નોંધ બદલો', 'નોટ ઉમેરો', 'એન્ટ્રી બદલો', 'વ્યવહાર સુધારો'].map((p) => ({ phrase: p, kind: 'saved_edit' as const })),
  ],
  mr: [
    ...['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '2 kilo nahi 5', '200 वाढवा', '100 कमी करा', 'दुप्पट', 'अर्धा', 'थोडं कमी', 'add 200', 'double', 'half', 'yesterday', 'Sunita'].map((p) => ({ phrase: p, kind: 'pending' as const })),
    ...['रक्कम बदला', 'पैसे सुधारा', 'रुपये बदला', 'वस्तू बदला', 'सामान सुधारा', 'ग्राहक बदला', 'नाव सुधारा', 'प्रमाण बदला', 'वजन वाढवा', 'तारीख बदला', 'दिवस सुधारा', 'नोंद बदला', 'टीप जोडा', 'व्यवहार बदला', 'एंट्री सुधारा'].map((p) => ({ phrase: p, kind: 'saved_edit' as const })),
  ],
  bn: [
    ...['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '2 kilo nahi 5', '200 যোগ', '100 কমাও', 'দ্বিগুণ', 'অর্ধেক', 'একটু কম', 'add 200', 'double', 'half', 'yesterday', 'Sunita'].map((p) => ({ phrase: p, kind: 'pending' as const })),
    ...['টাকা বদলাও', 'পরিমাণ পরিবর্তন করো', 'দাম ঠিক করো', 'জিনিস বদলাও', 'পণ্য পরিবর্তন করো', 'গ্রাহক বদলাও', 'নাম পরিবর্তন করো', 'ওজন বদলাও', 'কেজি বাড়াও', 'তারিখ বদলাও', 'দিন পরিবর্তন করো', 'নোট বদলাও', 'মন্তব্য যোগ করো', 'এন্ট্রি বদলাও', 'লেনদেন ঠিক করো'].map((p) => ({ phrase: p, kind: 'saved_edit' as const })),
  ],
  ta: [
    ...['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '2 kilo nahi 5', '200 கூட்டு', '100 குறை', 'இரட்டிப்பு', 'பாதி', 'கொஞ்சம் குறை', 'add 200', 'double', 'half', 'yesterday', 'Sunita'].map((p) => ({ phrase: p, kind: 'pending' as const })),
    ...['தொகை மாற்று', 'பணம் திருத்து', 'விலை மாற்று', 'பொருள் மாற்று', 'சரக்கு திருத்து', 'வாடிக்கையாளர் மாற்று', 'பெயர் திருத்து', 'அளவு மாற்று', 'எடை திருத்து', 'தேதி மாற்று', 'நாள் திருத்து', 'குறிப்பு மாற்று', 'நோட் சேர்', 'பதிவு மாற்று', 'பரிவர்த்தனை திருத்து'].map((p) => ({ phrase: p, kind: 'saved_edit' as const })),
  ],
  te: [
    ...['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '2 kilo nahi 5', '200 కలుపు', '100 తగ్గించు', 'రెట్టింపు', 'సగం', 'కొంచెం తగ్గించు', 'add 200', 'double', 'half', 'yesterday', 'Sunita'].map((p) => ({ phrase: p, kind: 'pending' as const })),
    ...['మొత్తం మార్చు', 'డబ్బు సరిచేయు', 'ధర మార్చు', 'వస్తువు మార్చు', 'సరుకు సరిచేయు', 'కస్టమర్ మార్చు', 'పేరు సరిచేయు', 'పరిమాణం మార్చు', 'బరువు సరిచేయు', 'తేదీ మార్చు', 'రోజు సరిచేయు', 'నోట్ మార్చు', 'గమనిక చేర్చు', 'ఎంట్రీ మార్చు', 'లావాదేవీ సరిచేయు'].map((p) => ({ phrase: p, kind: 'saved_edit' as const })),
  ],
  kn: [
    ...['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '2 kilo nahi 5', '200 ಸೇರಿಸಿ', '100 ಕಡಿಮೆ', 'ಎರಡು ಪಟ್ಟು', 'ಅರ್ಧ', 'ಸ್ವಲ್ಪ ಕಡಿಮೆ', 'add 200', 'double', 'half', 'yesterday', 'Sunita'].map((p) => ({ phrase: p, kind: 'pending' as const })),
    ...['ಮೊತ್ತ ಬದಲಾಯಿಸಿ', 'ಹಣ ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ಬೆಲೆ ಬದಲಾಯಿಸಿ', 'ವಸ್ತು ಬದಲಾಯಿಸಿ', 'ಸಾಮಾನು ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ಗ್ರಾಹಕ ಬದಲಾಯಿಸಿ', 'ಹೆಸರು ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ಪ್ರಮಾಣ ಬದಲಾಯಿಸಿ', 'ತೂಕ ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ದಿನಾಂಕ ಬದಲಾಯಿಸಿ', 'ದಿನ ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ಟಿಪ್ಪಣಿ ಬದಲಾಯಿಸಿ', 'ನೋಟ್ ಸೇರಿಸಿ', 'ಎಂಟ್ರಿ ಬದಲಾಯಿಸಿ', 'ವಹಿವಾಟು ತಿದ್ದುಪಡಿ ಮಾಡಿ'].map((p) => ({ phrase: p, kind: 'saved_edit' as const })),
  ],
  ml: [
    ...['nahi, 600', '600 nahi 500', 'Ramesh Kumar', 'chini nahi aata', '2 kilo nahi 5', '200 കൂട്ടൂ', '100 കുറയ്ക്കൂ', 'ഇരട്ടി', 'പകുതി', 'കുറച്ച് കുറയ്ക്കൂ', 'add 200', 'double', 'half', 'yesterday', 'Sunita'].map((p) => ({ phrase: p, kind: 'pending' as const })),
    ...['തുക മാറ്റുക', 'പണം തിരുത്തുക', 'വില മാറ്റുക', 'സാധനം മാറ്റുക', 'വസ്തു തിരുത്തുക', 'ഉപഭോക്താവ് മാറ്റുക', 'പേര് തിരുത്തുക', 'അളവ് മാറ്റുക', 'തൂക്കം തിരുത്തുക', 'തീയതി മാറ്റുക', 'ദിവസം തിരുത്തുക', 'കുറിപ്പ് മാറ്റുക', 'നോട്ട് ചേർക്കുക', 'എൻട്രി മാറ്റുക', 'ഇടപാട് തിരുത്തുക'].map((p) => ({ phrase: p, kind: 'saved_edit' as const })),
  ],
};

describe('Part 9: Comprehensive Voice-First Editing & Correction Suite', () => {
  it.each(ALL_LANGUAGES)(
    'parses >= 30 correction phrases across pending & saved-entry intent groups in %s',
    async (lang) => {
      const phrases = MULTILINGUAL_CORRECTION_PHRASES[lang];
      expect(phrases.length).toBeGreaterThanOrEqual(30);

      for (const { phrase, kind } of phrases) {
        if (kind === 'pending') {
          const res = parsePendingCorrection(phrase, basePending, {
            language: lang,
            customers: INITIAL_CUSTOMERS,
            items: INITIAL_ITEMS,
          });
          expect(res.type, `phrase="${phrase}"`).toBe('update_slots');
        } else {
          const routed = await routeVoiceIntent(phrase, {
            language: lang,
            customers: INITIAL_CUSTOMERS,
            items: INITIAL_ITEMS,
          });
          expect([
            'edit_entry',
            'change_amount',
            'change_item',
            'change_customer',
            'change_quantity',
            'change_date',
            'edit_note',
          ]).toContain(routed.intent);
        }
      }
    }
  );

  it('handles customer name collision (2 customers named Ramesh) & ambiguous target entries without guessing', () => {
    const pendingRes = parsePendingCorrection('Ramesh wala', basePending, {
      language: 'hi',
      customers: INITIAL_CUSTOMERS,
      items: INITIAL_ITEMS,
    });
    expect(pendingRes.type).toBe('update_slots');
    if (pendingRes.type === 'update_slots') {
      expect(pendingRes.ambiguousCustomers?.length).toBe(2);
    }

    const txs: Transaction[] = [
      {
        id: 'tx-a',
        shop_id: 'shop-1',
        type: 'credit',
        amount: 500,
        customer_id: INITIAL_CUSTOMERS[0].id,
        created_at: new Date().toISOString(),
        confirmed_by_voice: true,
      },
      {
        id: 'tx-b',
        shop_id: 'shop-1',
        type: 'credit',
        amount: 700,
        customer_id: INITIAL_CUSTOMERS[1].id,
        created_at: new Date(Date.now() - 5000).toISOString(),
        confirmed_by_voice: true,
      },
    ];

    const resolved = resolveTargetEntry({ rawText: 'Ramesh ki entry badlo' }, txs, INITIAL_CUSTOMERS, 'hi');
    expect(resolved.status).toBe('ambiguous');
    if (resolved.status === 'ambiguous') {
      expect(resolved.candidates.length).toBe(2);
    }
  });

  it('verifies append-only edits never overwrite originals and balances & stock stay consistent after edit and undo', () => {
    let customerBalance = 1000;
    let chiniStock = 20;

    const originalTx: Transaction = {
      id: 'tx-orig-consist',
      shop_id: 'shop-1',
      type: 'credit',
      amount: 500,
      customer_id: INITIAL_CUSTOMERS[0].id,
      items: [{ name: 'chini', quantity: 2, unit: 'kilo', price: 500 }],
      created_at: new Date().toISOString(),
      confirmed_by_voice: true,
    };

    const corr = buildAppendOnlyCorrection(
      originalTx,
      { amount: 800, items: [{ name: 'chini', quantity: 5, unit: 'kilo', price: 800 }] },
      { shopId: 'shop-1', actor: ownerUser, source: 'voice' }
    );

    // Original never overwritten
    expect(originalTx.amount).toBe(500);
    expect(originalTx.items?.[0].quantity).toBe(2);

    // Apply edit deltas
    for (const d of corr.customerBalanceDeltas) customerBalance += d.delta;
    for (const s of corr.itemStockDeltas) chiniStock -= s.quantityDelta;
    expect(customerBalance).toBe(1300); // 1000 + (800 - 500)
    expect(chiniStock).toBe(17); // 20 - (5 - 2)

    // Audit log written
    expect(corr.auditLog.action).toBe('edit');
    expect(corr.auditLog.before_value.amount).toBe(500);
    expect(corr.auditLog.after_value.amount).toBe(800);

    // Undo restores exact pre-edit balance & stock
    for (const d of corr.undoRecord.customerBalanceDeltas) customerBalance -= d.delta;
    for (const s of corr.undoRecord.itemStockDeltas) chiniStock += s.quantityDelta;
    expect(customerBalance).toBe(1000);
    expect(chiniStock).toBe(20);

    // Effective transactions only include non-superseded active entries
    const active = getEffectiveTransactions([
      corr.correctionTx,
      corr.reversalTx,
      { ...originalTx, superseded_by: corr.correctionTx.id },
    ]);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(corr.correctionTx.id);
  });

  it('blocks voice completion for deletes, over-threshold edits, and edits with proof or sent reminders', () => {
    const proofTx: Transaction = {
      id: 'tx-proof',
      shop_id: 'shop-1',
      type: 'credit',
      amount: 500,
      customer_id: INITIAL_CUSTOMERS[0].id,
      proof_clip_path: 'proof-clips/1.webm',
      has_sent_reminder: true,
      created_at: new Date().toISOString(),
      confirmed_by_voice: true,
    };
    const sideEffects = analyzeEditSideEffects(proofTx, { amount: 600 }, INITIAL_CUSTOMERS, INITIAL_ITEMS);
    expect(sideEffects.hasProofClip).toBe(true);
    expect(sideEffects.proofOriginalAmount).toBe(500);
    expect(sideEffects.hasSentReminder).toBe(true);

    const proofSafety = evaluateEditSafetyTier(proofTx, { amount: 600 }, sideEffects);
    expect(proofSafety.requiresTapOnly).toBe(true);
    expect(canCompleteByVoiceConfirm({ isPillActive: true, isCardShowing: true, safetyTier: proofSafety })).toBe(false);

    // Over-threshold
    const bigTx: Transaction = { ...proofTx, proof_clip_path: null, has_sent_reminder: false, amount: 500 };
    const bigEffects = analyzeEditSideEffects(bigTx, { amount: 5000 }, INITIAL_CUSTOMERS, INITIAL_ITEMS);
    const bigSafety = evaluateEditSafetyTier(bigTx, { amount: 5000 }, bigEffects, { edit_rupee_threshold: 2000 });
    expect(bigSafety.requiresTapOnly).toBe(true);
    expect(canCompleteByVoiceConfirm({ isPillActive: true, isCardShowing: true, safetyTier: bigSafety })).toBe(false);

    // Delete always blocked by voice
    expect(canCompleteByVoiceConfirm({ isPillActive: true, isCardShowing: true, isDeleteAction: true })).toBe(false);
  });

  it('parses domain voice edits for reminder previews, supplier orders, stock counts, and customer details', () => {
    expect(parseReminderPreviewEdit('firm tone English UPI hatao')).toEqual({
      tone: 'firm',
      language: 'en',
      includeUpi: false,
    });
    expect(parseSupplierOrderEdit('chini 15 kilo kar do', INITIAL_ITEMS)).toMatchObject({
      action: 'set_qty',
      itemName: 'chini',
      quantity: 15,
    });
    expect(parseSupplierOrderEdit('aata hatao', INITIAL_ITEMS)).toEqual({
      action: 'remove',
      itemName: 'aata',
    });
    expect(parseStockCountEdit('chini ka stock 25 kilo kar do', INITIAL_ITEMS)).toEqual({
      itemName: 'chini',
      newStock: 25,
    });
    expect(parseCustomerDetailEdit('phone number 9876543210 kar do')).toEqual({
      field: 'phone',
      value: '9876543210',
    });
  });
});

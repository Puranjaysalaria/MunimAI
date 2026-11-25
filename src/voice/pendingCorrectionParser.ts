import { LanguageCode } from '../i18n/types';
import { Customer, Item } from '../types/schema';
import { parseMultilingualNumber, parseMultilingualQuantityAndUnit } from './multilingualNumbers';
import { resolveCrossScriptCustomer, resolveCrossScriptItem } from './crossScriptMatcher';
import { findMentionedItems } from '../parser/synonyms';
import { transliterateIndicToLatin } from '../parser/indicNormalizer';
import { PendingConfirmation } from '../components/ConfirmationCard/ConfirmationCard';

export type CorrectionSlot = 'amount' | 'customer' | 'item' | 'quantity' | 'unit' | 'date' | 'note';

export type PendingCorrectionAction =
  | { type: 'confirm_yes' }
  | { type: 'cancel' }
  | { type: 'pause' }
  | {
      type: 'update_slots';
      updatedFields: CorrectionSlot[];
      newAmount?: number;
      newCustomer?: Customer | null;
      newCustomerName?: string | null;
      ambiguousCustomers?: Customer[];
      newItem?: Item | null;
      newItemName?: string | null;
      newQuantity?: number | null;
      newUnit?: string | null;
      newDate?: string | null;
      newNote?: string | null;
      spokenReadback: string;
    }
  | { type: 'no_match' };

export interface PendingCorrectionOptions {
  language?: LanguageCode;
  customers?: Customer[];
  items?: Item[];
}

const PAUSE_REGEX =
  /^(?:ruko|wait|thairo|thehro|ek\s*minute|one\s*minute|hold\s*on|pause|रुको|ठहरो|एक\s*मिनट|ਰੁਕੋ|ਠਹਿਰੋ|રોકાઓ|थांबा|দাঁড়াও|நில்|ఆగు|ತಡಿ|നിൽക്കൂ)[\s.!।]*$/iu;

const PURE_CANCEL_REGEX =
  /^(?:nahi|nahin|na|no|nope|cancel(?:\s*(?:it|this|that|karo|kar\s*do))?|remove(?:\s*(?:it|this|that))?|delete(?:\s*(?:it|this|that))?|discard(?:\s*(?:it|this|that))?|stop(?:\s*(?:it|this|that))?|band\s*karo|hatao|hata\s*do|ise\s*hatao|isko\s*hatao|mat\s*likho|mat\s*karo|chhad\s*do|radd\s*karo|रद्द(?:\s*करो)?|कैंसिल(?:\s*करो)?|हटाओ|हटा\s*दो|बंद\s*करो|मत\s*लिखो|मत\s*करो|नहीं|ना|ਨਹੀਂ|ਨਾ|ਰੱਦ(?:\s*ਕਰੋ)?|ਹਟਾਓ|না|বাতিল|நஹி|இல்லை|வேண்டாம்|వద్దు|కాదు|ಬೇಡ|വേണ്ട|नाही|नको|ના)[\s.!।]*$/iu;

const PURE_YES_REGEX =
  /^(?:haan|ha|haa|haanji|ji\s*haan|aaho|yes|yeah|yup|yep|ok|okay|confirm|save|done|correct|right|likh\s*do|likh\s*deo|theek\s*hai|theek|sahi\s*hai|हाँ|हां|हाँजी|जी\s*हाँ|लिख\s*दो|कर\s*दो|ठीक\s*है|सही\s*है|ਹਾਂ|ਹਾਂਜੀ|ਆਹੋ|ਲਿਖ\s*ਦਿਓ|ਠੀਕ\s*ਹੈ|હા|होय|हो|হ্যাঁ|ஆம்|சரி|అవును|సరే|ಹೌದು|ಅതെ)[\s.!।]*$/iu;

const LEADING_NEGATION_REGEX =
  /^(?:nahi|nahin|na|no|nope|not|galat|नहीं|ना|गलत|ਨਹੀਂ|ਨਾ|ਗਲਤ|ના|नाही|नको|না|இல்லை|కాదు|ಇಲ್ಲ|അല്ല)[\s,।:;-]+/iu;

const ADD_KEYWORDS =
  /\b(aur\s*jodo|jodo|jod\s*do|add|plus|badhao|badha\s*do|increase|more|jyada|zyada)\b|जोड़ो|जोड़\s*दो|बढ़ाओ|बढ़ा\s*दो|और|ਜੋੜੋ|ਵਧਾਓ|વધારો|वाढवा|যোগ|கூட்டு|కలుపు|ಸೇರಿಸಿ|കൂട്ടൂ/iu;

const SUBTRACT_KEYWORDS =
  /\b(kam\s*karo|kam\s*kar\s*do|ghatao|ghata\s*do|subtract|minus|less|reduce|nikalo|hatao)\b|कम\s*करो|घटाओ|घटा\s*दो|निकालो|ਘਟਾਓ|ਘੱਟ\s*ਕਰੋ|ઓછું|कमी\s*करा|কমাও|குறை|తగ్గించు|ಕಡಿಮೆ|കുറയ്ക്കൂ/iu;

const DOUBLE_KEYWORDS =
  /\b(double|dugna|doguna|duguna|twice|2x)\b|दोगुना|दुगना|डबल|ਦੁੱਗਣਾ|ਡਬਲ|બમણું|दुप्पट|দ্বিগুণ|இரட்டிப்பு|రెట్టింపు|ಎರಡು\s*ಪಟ್ಟು|ഇരട്ടി/iu;

const HALF_KEYWORDS =
  /\b(aadha|adha|half|adh|50%)\b|आधा|अर्धा|ਅੱਧਾ|અડધું|অর্ধেক|பாதி|సగం|ಅರ್ಧ|പകുതി/iu;

const SLIGHT_LESS_KEYWORDS_GU = /થોડ[\u0AC1\u0AC2\u0A82]+\s*ઓછ[\u0AC1\u0AC2\u0A82]+/iu;

const SLIGHT_LESS_KEYWORDS =
  /\b(thoda\s*kam|thoda\s*ghatao|slightly\s*less|little\s*less|thoda\s*chhota)\b|थोड़ा\s*कम|ਥੋੜ੍ਹਾ\s*ਘੱਟ|થੋડું\s*ઓછું|थोडं\s*कमी|একটু\s*কম|கொஞ்சம்\s*குறை|కొంచెం\s*తగ్గించు|ಸ್ವಲ್ಪ\s*ಕಡಿಮೆ|കുറച്ച്\s*കുറയ്ക്കൂ/iu;

const SLIGHT_MORE_KEYWORDS =
  /\b(thoda\s*(?:zyada|jyada|badhao|aur)|slightly\s*more|little\s*more)\b|थोड़ा\s*(?:ज़्यादा|ज्यादा|बढ़ाओ)|ਥੋੜ੍ਹਾ\s*(?:ਵੱਧ|ਵਧਾਓ)/iu;

function extractReplacementAfterNahi(rawText: string): string | null {
  // Matches "X nahi Y" / "X नहीं Y" / "X nahi, Y" / "not X, Y"
  const nahiSplit = rawText.split(
    /\s+(?:nahi|nahin|na|not|नहीं|ना|ਨਹੀਂ|ਨਾ|ના|नाही|না|இல்லை|కాదు|ಇಲ್ಲ|അല്ല)\s*[,।:;-]?\s*/iu
  );
  if (nahiSplit.length >= 2 && nahiSplit[nahiSplit.length - 1].trim().length > 0) {
    return nahiSplit[nahiSplit.length - 1].trim();
  }
  return null;
}

function buildLocalizedSlotReadback(
  lang: LanguageCode,
  fields: CorrectionSlot[],
  details: {
    amount?: number;
    customerName?: string | null;
    itemName?: string | null;
    quantity?: number | null;
    unit?: string | null;
    dateLabel?: string | null;
    note?: string | null;
  }
): string {
  const parts: string[] = [];

  if (fields.includes('amount') && details.amount !== undefined) {
    const val = `₹${details.amount}`;
    switch (lang) {
      case 'en': parts.push(`Amount updated to ${val}`); break;
      case 'pa': parts.push(`ਰਕਮ ${val} ਕਰ ਦਿੱਤੀ ਗਈ`); break;
      case 'gu': parts.push(`રકમ ${val} કરી દીધી`); break;
      case 'mr': parts.push(`रक्कम ${val} केली`); break;
      case 'bn': parts.push(`টাকা ${val} করা হয়েছে`); break;
      case 'ta': parts.push(`தொகை ${val} ஆக மாற்றப்பட்டது`); break;
      case 'te': parts.push(`మొత్తం ${val} కు మార్చబడింది`); break;
      case 'kn': parts.push(`ಮೊತ್ತ ${val} ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ`); break;
      case 'ml': parts.push(`തുക ${val} ആക്കി മാറ്റി`); break;
      default: parts.push(`रकम ${val} कर दी गई`); break;
    }
  }

  if (fields.includes('customer') && details.customerName) {
    const c = details.customerName;
    switch (lang) {
      case 'en': parts.push(`Customer changed to ${c}`); break;
      case 'pa': parts.push(`ਗਾਹਕ ${c} ਕਰ ਦਿੱਤਾ ਗਿਆ`); break;
      case 'gu': parts.push(`ગ્રાહક ${c} કર્યા`); break;
      case 'mr': parts.push(`ग्राहक ${c} केले`); break;
      case 'bn': parts.push(`গ্রাহক ${c} করা হয়েছে`); break;
      case 'ta': parts.push(`வாடிக்கையாளர் ${c} ஆக மாற்றப்பட்டது`); break;
      case 'te': parts.push(`కస్టమర్ ${c} కు మార్చబడింది`); break;
      case 'kn': parts.push(`ಗ್ರಾಹಕ ${c} ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ`); break;
      case 'ml': parts.push(`ഉപഭോക്താവ് ${c} ആക്കി മാറ്റി`); break;
      default: parts.push(`ग्राहक ${c} कर दिया गया`); break;
    }
  }

  if (fields.includes('item') && details.itemName) {
    const it = details.itemName;
    switch (lang) {
      case 'en': parts.push(`Item changed to ${it}`); break;
      case 'pa': parts.push(`ਸਾਮਾਨ ${it} ਕਰ ਦਿੱਤਾ ਗਿਆ`); break;
      case 'gu': parts.push(`સામાન ${it} કર્યો`); break;
      case 'mr': parts.push(`वस्तू ${it} केली`); break;
      case 'bn': parts.push(`জিনিস ${it} করা হয়েছে`); break;
      case 'ta': parts.push(`பொருள் ${it} ஆக மாற்றப்பட்டது`); break;
      case 'te': parts.push(`వస్తువు ${it} కు మార్చబడింది`); break;
      case 'kn': parts.push(`ವಸ್ತು ${it} ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ`); break;
      case 'ml': parts.push(`സാധനം ${it} ആക്കി മാറ്റി`); break;
      default: parts.push(`सामान ${it} कर दिया गया`); break;
    }
  }

  if (fields.includes('quantity') && details.quantity !== undefined && details.quantity !== null) {
    const q = `${details.quantity}${details.unit ? ' ' + details.unit : ''}`;
    switch (lang) {
      case 'en': parts.push(`Quantity updated to ${q}`); break;
      case 'pa': parts.push(`ਮਾਤਰਾ ${q} ਕਰ ਦਿੱਤੀ ਗਈ`); break;
      case 'gu': parts.push(`જથ્થો ${q} કર્યો`); break;
      case 'mr': parts.push(`प्रमाण ${q} केले`); break;
      case 'bn': parts.push(`পরিমাণ ${q} করা হয়েছে`); break;
      case 'ta': parts.push(`அளவு ${q} ஆக மாற்றப்பட்டது`); break;
      case 'te': parts.push(`పరిమాణం ${q} కు మార్చబడింది`); break;
      case 'kn': parts.push(`ಪ್ರಮಾಣ ${q} ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ`); break;
      case 'ml': parts.push(`അളവ് ${q} ആക്കി മാറ്റി`); break;
      default: parts.push(`मात्रा ${q} कर दी गई`); break;
    }
  }

  if (fields.includes('date') && details.dateLabel) {
    switch (lang) {
      case 'en': parts.push(`Date updated to ${details.dateLabel}`); break;
      case 'pa': parts.push(`ਤਾਰੀਖ਼ ${details.dateLabel} ਕਰ ਦਿੱਤੀ ਗਈ`); break;
      default: parts.push(`तारीख ${details.dateLabel} कर दी गई`); break;
    }
  }

  if (fields.includes('note') && details.note) {
    switch (lang) {
      case 'en': parts.push(`Note updated`); break;
      case 'pa': parts.push(`ਨੋਟ ਅੱਪਡੇਟ ਕੀਤਾ ਗਿਆ`); break;
      default: parts.push(`नोट अपडेट कर दिया गया`); break;
    }
  }

  return parts.join('. ') + (lang === 'en' ? '.' : '।');
}

/**
 * Parses spoken corrections while a PendingConfirmation card is open,
 * supporting slot overrides ("nahi, 600", "600 nahi 500", "chini nahi aata",
 * "do kilo nahi paanch", "Ramesh Kumar wala") and relative changes
 * ("200 aur jodo", "double kar do", "thoda kam karo") without restarting.
 */
export function parsePendingCorrection(
  rawText: string,
  pending: PendingConfirmation,
  options: PendingCorrectionOptions = {}
): PendingCorrectionAction {
  const language: LanguageCode = options.language || 'hi';
  const customers = options.customers || [];
  const items = options.items || [];
  const trimmed = rawText.trim();

  if (!trimmed) return { type: 'no_match' };

  // 1. Pause ("ruko" / "wait") - pauses without discarding or saving
  if (PAUSE_REGEX.test(trimmed)) {
    return { type: 'pause' };
  }

  // 2. Pure Cancel ("nahi" / "cancel" alone) - discards without saving
  if (PURE_CANCEL_REGEX.test(trimmed)) {
    return { type: 'cancel' };
  }

  // 3. Pure Confirm Yes ("haan" / "yes" alone)
  if (PURE_YES_REGEX.test(trimmed)) {
    return { type: 'confirm_yes' };
  }

  // Prepare cleaned target text:
  // If user said "600 nahi 500" or "chini nahi aata", take the replacement side ("500" / "aata").
  // Else if user started with "nahi, 600", strip leading negation.
  const replacementSide = extractReplacementAfterNahi(trimmed);
  const effectiveText = replacementSide
    ? replacementSide
    : trimmed.replace(LEADING_NEGATION_REGEX, '').trim();
  const latinEffective = transliterateIndicToLatin(effectiveText).toLowerCase();
  const latinFull = transliterateIndicToLatin(trimmed).toLowerCase();

  // 4. Relative Amount Adjustments (computed from pending.amount)
  const baseAmount = Number(pending.amount || 0);
  if (DOUBLE_KEYWORDS.test(latinEffective) || DOUBLE_KEYWORDS.test(effectiveText)) {
    const newAmount = Math.max(0, baseAmount * 2);
    return {
      type: 'update_slots',
      updatedFields: ['amount'],
      newAmount,
      spokenReadback: buildLocalizedSlotReadback(language, ['amount'], { amount: newAmount }),
    };
  }

  if (HALF_KEYWORDS.test(latinEffective) || HALF_KEYWORDS.test(effectiveText)) {
    const newAmount = Math.max(1, Math.round(baseAmount / 2));
    return {
      type: 'update_slots',
      updatedFields: ['amount'],
      newAmount,
      spokenReadback: buildLocalizedSlotReadback(language, ['amount'], { amount: newAmount }),
    };
  }

  if (SLIGHT_LESS_KEYWORDS.test(latinEffective) || SLIGHT_LESS_KEYWORDS.test(effectiveText) || SLIGHT_LESS_KEYWORDS_GU.test(effectiveText)) {
    const step = baseAmount >= 500 ? Math.max(50, Math.round((baseAmount * 0.1) / 10) * 10) : Math.max(10, Math.round(baseAmount * 0.1));
    const newAmount = Math.max(1, baseAmount - step);
    return {
      type: 'update_slots',
      updatedFields: ['amount'],
      newAmount,
      spokenReadback: buildLocalizedSlotReadback(language, ['amount'], { amount: newAmount }),
    };
  }

  if (SLIGHT_MORE_KEYWORDS.test(latinEffective) || SLIGHT_MORE_KEYWORDS.test(effectiveText)) {
    const step = baseAmount >= 500 ? Math.max(50, Math.round((baseAmount * 0.1) / 10) * 10) : Math.max(10, Math.round(baseAmount * 0.1));
    const newAmount = baseAmount + step;
    return {
      type: 'update_slots',
      updatedFields: ['amount'],
      newAmount,
      spokenReadback: buildLocalizedSlotReadback(language, ['amount'], { amount: newAmount }),
    };
  }

  const parsedNum = parseMultilingualNumber(effectiveText);
  if (parsedNum !== null && parsedNum > 0 && (ADD_KEYWORDS.test(latinEffective) || ADD_KEYWORDS.test(effectiveText))) {
    const newAmount = baseAmount + parsedNum;
    return {
      type: 'update_slots',
      updatedFields: ['amount'],
      newAmount,
      spokenReadback: buildLocalizedSlotReadback(language, ['amount'], { amount: newAmount }),
    };
  }

  if (parsedNum !== null && parsedNum > 0 && (SUBTRACT_KEYWORDS.test(latinEffective) || SUBTRACT_KEYWORDS.test(effectiveText))) {
    const newAmount = Math.max(0, baseAmount - parsedNum);
    return {
      type: 'update_slots',
      updatedFields: ['amount'],
      newAmount,
      spokenReadback: buildLocalizedSlotReadback(language, ['amount'], { amount: newAmount }),
    };
  }

  // 5. Date Correction ("aaj nahi kal" / "kal" / "yesterday")
  if (/(?:^|\s)(?:kal|yesterday|beeta\s*kal|कल|ਬੀਤਾ\s*ਕੱਲ੍ਹ)(?:$|\s)/iu.test(effectiveText) && !parsedNum) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return {
      type: 'update_slots',
      updatedFields: ['date'],
      newDate: d.toISOString(),
      spokenReadback: buildLocalizedSlotReadback(language, ['date'], {
        dateLabel: language === 'en' ? 'Yesterday' : 'कल',
      }),
    };
  }

  // 6. Customer Correction ("Ramesh Kumar wala" / "Ramesh nahi Suresh")
  const customerQuery = effectiveText
    .replace(/\b(wala|wali|wale|customer|grahak|name|naam|arre|suno|bhaiya|please|kar\s*do|likho)\b/gi, ' ')
    .replace(/(वाला|वाली|वाले|ग्राहक|नाम|अरे|सुनो|भैया|कर\s*दो|लिखो)/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const custResolution = resolveCrossScriptCustomer(customerQuery || effectiveText, customers);
  if (custResolution.matchedCustomer) {
    return {
      type: 'update_slots',
      updatedFields: ['customer'],
      newCustomer: custResolution.matchedCustomer,
      newCustomerName: custResolution.matchedCustomer.name,
      spokenReadback: buildLocalizedSlotReadback(language, ['customer'], {
        customerName: custResolution.matchedCustomer.name,
      }),
    };
  }
  if (custResolution.ambiguousCustomers.length > 1) {
    return {
      type: 'update_slots',
      updatedFields: ['customer'],
      ambiguousCustomers: custResolution.ambiguousCustomers,
      newCustomerName: customerQuery || effectiveText,
      spokenReadback:
        language === 'en'
          ? 'Which customer?'
          : language === 'pa'
          ? 'ਕਿਹੜਾ ਗਾਹਕ?'
          : 'कौनसा ग्राहक?',
    };
  }

  // 7. Item Correction ("chini nahi aata" / "aata")
  const mentioned = findMentionedItems(effectiveText, items);
  const crossItem = resolveCrossScriptItem(effectiveText, items);
  if (mentioned.length > 0 || crossItem.matchedItem) {
    const matchedItemObj =
      crossItem.matchedItem ||
      items.find((i) => i.name.toLowerCase() === mentioned[0].canonical.toLowerCase()) ||
      null;
    const itemName = matchedItemObj?.name || mentioned[0]?.canonical || null;
    const updatedFields: CorrectionSlot[] = ['item'];

    const { quantity, unit } = parseMultilingualQuantityAndUnit(effectiveText);
    let newAmount: number | undefined;
    if (quantity && quantity > 0) {
      updatedFields.push('quantity');
      if (matchedItemObj && matchedItemObj.selling_price > 0) {
        newAmount = Math.round(quantity * matchedItemObj.selling_price);
        updatedFields.push('amount');
      }
    }

    return {
      type: 'update_slots',
      updatedFields,
      newItem: matchedItemObj,
      newItemName: itemName,
      newQuantity: quantity || pending.quantity,
      newUnit: unit || matchedItemObj?.unit || pending.unit,
      newAmount,
      spokenReadback: buildLocalizedSlotReadback(language, updatedFields, {
        itemName,
        quantity,
        unit: unit || matchedItemObj?.unit || pending.unit,
        amount: newAmount,
      }),
    };
  }

  // 8. Quantity Correction ("do kilo nahi paanch" / "5 kilo" / "qty 5")
  const { quantity: parsedQty, unit: parsedUnit } = parseMultilingualQuantityAndUnit(effectiveText);
  const hasQtyContext =
    parsedQty !== null &&
    (parsedUnit !== null ||
      /\b(kilo|kg|litre|packet|piece|qty|quantity|मात्रा|किलो|ਕਿਲੋ)\b/i.test(latinFull) ||
      (pending.quantity !== null && pending.quantity !== undefined && pending.itemName && parsedQty <= 50 && !/\b(rupaye|rupees|rs|amount|रुपये)\b/i.test(latinEffective)));

  if (hasQtyContext && parsedQty !== null && parsedQty > 0) {
    const updatedFields: CorrectionSlot[] = ['quantity'];
    let newAmount: number | undefined;
    const targetUnit = parsedUnit || pending.unit;
    if (parsedUnit && parsedUnit !== pending.unit) {
      updatedFields.push('unit');
    }

    // Proportionally adjust amount if item selling price is known or previous qty was tracked
    if (pending.item && pending.item.selling_price > 0) {
      newAmount = Math.round(parsedQty * pending.item.selling_price);
      updatedFields.push('amount');
    } else if (pending.quantity && pending.quantity > 0 && pending.amount > 0) {
      const unitRate = pending.amount / pending.quantity;
      newAmount = Math.round(parsedQty * unitRate);
      updatedFields.push('amount');
    }

    return {
      type: 'update_slots',
      updatedFields,
      newQuantity: parsedQty,
      newUnit: targetUnit,
      newAmount,
      spokenReadback: buildLocalizedSlotReadback(language, updatedFields, {
        quantity: parsedQty,
        unit: targetUnit,
        amount: newAmount,
      }),
    };
  }

  // 9. Amount Correction ("nahi, 600" / "600 nahi 500" / "paanch sau")
  if (parsedNum !== null && parsedNum > 0) {
    return {
      type: 'update_slots',
      updatedFields: ['amount'],
      newAmount: parsedNum,
      spokenReadback: buildLocalizedSlotReadback(language, ['amount'], { amount: parsedNum }),
    };
  }

  // 10. Note Correction ("note: ...")
  const noteMatch = effectiveText.match(/^(?:note|tippani|नोट|ਨੋਟ)\s*[:\-]?\s*(.+)$/iu);
  if (noteMatch && noteMatch[1]) {
    return {
      type: 'update_slots',
      updatedFields: ['note'],
      newNote: noteMatch[1].trim(),
      spokenReadback: buildLocalizedSlotReadback(language, ['note'], { note: noteMatch[1].trim() }),
    };
  }

  return { type: 'no_match' };
}

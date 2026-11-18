import { ValidatedParseResult } from './types';
import { extractAmount, extractQuantityAndUnit } from './numbers';
import { findMentionedItems } from './synonyms';
import { transliterateIndicToLatin } from './indicNormalizer';
import { Customer, Item } from '../types/schema';

export interface RuleParserContext {
  customers: Customer[];
  items?: Item[];
}

/**
 * High-performance deterministic rule parser for Munim AI
 * Handles Hindi, Punjabi, and Hinglish kirana shop inputs offline.
 */
export function parseWithRules(
  rawText: string,
  context: RuleParserContext = { customers: [] }
): ValidatedParseResult {
  // 1. Language Detection from original script & markers
  let detectedLang: 'hi' | 'pa' | 'en' = 'hi';
  const hasGurmukhi = /[\u0A00-\u0A7F]/.test(rawText);
  const punjabiMarkers = ['nu', ' da ', ' di ', 'vechi', 'vech', 'kite', 'kinna', 'kinni', 'aaho', 'ditta', 'to vadh', 'hovega', 'sat sri akal'];
  const englishMarkers = ['credit', 'payment', 'sale', 'sold', 'received', 'sugar', 'milk', 'stock', 'summary'];

  if (hasGurmukhi || punjabiMarkers.some((m) => rawText.toLowerCase().includes(m))) {
    detectedLang = 'pa';
  } else if (englishMarkers.filter((m) => rawText.toLowerCase().includes(m)).length >= 2) {
    detectedLang = 'en';
  }

  // 2. Short / Noise / Silence check
  const rawTrimmed = rawText.trim();
  if (rawTrimmed.length < 2 || /^(\.|\?|\!|\s)+$/.test(rawTrimmed)) {
    return {
      intent: 'unknown',
      confidence: 0.1,
      language: detectedLang,
      rawText: rawTrimmed,
      spokenReply: detectedLang === 'pa' ? 'ਆਵਾਜ਼ ਸਾਫ਼ ਨਹੀਂ ਆਈ, ਮੁੜ ਬੋਲੋ' : 'आवाज़ साफ़ नहीं आई, फिर से बोलिए',
      questionToAsk: 'Awaaz saaf nahi aayi, phir se boliye',
    };
  }

  // Normalize Indic script (Devanagari / Gurmukhi) into Latin phonetic tokens for deterministic matching
  const text = transliterateIndicToLatin(rawTrimmed);
  const lower = text.toLowerCase();

  // Extract amount & quantity early to distinguish command types
  const amount = extractAmount(text);
  const qtyInfo = extractQuantityAndUnit(text);
  const mentionedItems = findMentionedItems(text, context.items);
  const firstItem = mentionedItems.length > 0 ? mentionedItems[0].canonical : null;

  // 3. Undo: "Wapas karo" / "Undo"
  // Note: "<amount> wapis kite" or "ne wapis diye" is PAYMENT, not undo!
  const isPaymentReturn = /\b(wapis\s*kite|wapas\s*diye|wapis\s*diye|lauta\s*diye)\b/i.test(lower);
  if (!isPaymentReturn && /\b(wapas\s*karo|wapis\s*karo|undo|mod\s*do|galat\s*ho\s*gaya|cancel\s*last)\b/i.test(lower)) {
    return {
      intent: 'undo',
      confidence: 0.98,
      language: detectedLang,
      rawText: text,
      spokenReply: detectedLang === 'pa' ? 'ਪਿਛਲਾ ਸੌਦਾ ਰੱਦ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ' : 'पिछला लेन-देन वापस किया जा रहा है',
    };
  }

  // Check if sentence is an active transaction request (has udhaar, khate mein, sale, payment keywords)
  const isCreditPhrase = /\b(udhaar|udhar|khate\s*mein|khate\s*me|naame|udharaan)\b/i.test(lower);
  const isPaymentPhrase = /\b(diye|diya|jama|lauta\s*diye|de\s*ditta|wapis\s*kite|pay\s*kitta)\b/i.test(lower);

  // Confirmation YES: "Haan" / "Haan likh do" / "Aaho" (only if not an explicit credit entry or item/customer present)
  const hasCustomerMarker = /\b(ko|ne|nu|ke\s*khate)\b/i.test(lower);
  if (!isCreditPhrase && !isPaymentPhrase && !amount && !firstItem && !hasCustomerMarker) {
    if (/\b(haan|ha|haa|aaho|yes|likh\s*do|likh\s*deo|theek\s*hai|save\s*kar\s*do|kar\s*do|bilkul)\b/i.test(lower) && !/\b(nahi|nahin|na|mat|no)\b/i.test(lower)) {
      return {
        intent: 'confirm_yes',
        confidence: 0.98,
        language: detectedLang,
        rawText: text,
        spokenReply: detectedLang === 'pa' ? 'ਹਾਂ, ਸੌਦਾ ਲਿਖ ਦਿੱਤਾ ਗਿਆ ਹੈ' : 'हाँ, खाता सुरक्षित कर दिया गया है',
      };
    }
  }

  // Confirmation NO: "Nahi" / "Ruko" / "Cancel"
  if (/\b(nahi|nahin|ruko|cancel|mat likho|mat karo|chhad do|na karo|no)\b/i.test(lower) && !isCreditPhrase && !isPaymentPhrase) {
    return {
      intent: 'confirm_no',
      confidence: 0.98,
      language: detectedLang,
      rawText: text,
      spokenReply: detectedLang === 'pa' ? 'ਰੱਦ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ' : 'रद्द कर दिया गया है',
    };
  }

  // Proof Intent: "Customer se bulwayein"
  if (/\b(customer se bulwayein|proof|audio recording|saboot|awaaz record|grahak di awaaz)\b/i.test(lower)) {
    return {
      intent: 'proof',
      confidence: 0.95,
      language: detectedLang,
      rawText: text,
      spokenReply: detectedLang === 'pa' ? 'ਗਾਹਕ ਦੀ ਆਵਾਜ਼ ਰਿਕਾਰਡ ਕਰੋ' : 'ग्राहक की आवाज़ रिकॉर्ड करें',
    };
  }

  // Summary Intent: "Aaj kitni kamai hui?" / "Aj da kul hisaab"
  if (/\b(kamai|kamayi|hisaab|hisab|kitni kamai|total sale|kul bikri|summary|din bhar ka|din bhar ki)\b/i.test(lower)) {
    return {
      intent: 'summary',
      confidence: 0.95,
      language: detectedLang,
      rawText: text,
      spokenReply: detectedLang === 'pa' ? 'ਅੱਜ ਦਾ ਕੁੱਲ ਹਿਸਾਬ ਦਿਖਾਇਆ ਜਾ ਰਿਹਾ ਹੈ' : 'आज की कमाई और हिसाब दिखाया जा रहा है',
    };
  }

  // Ordering Intent: "Agle hafte ka samaan mangwana hai" / "Supplier order"
  if (/\b(samaan mangwana|maal mangwana|order karna|order banao|supplier|agle hafte ka|order list|order bana|saman mangwa)\b/i.test(lower)) {
    return {
      intent: 'ordering',
      confidence: 0.95,
      language: detectedLang,
      rawText: text,
      spokenReply: detectedLang === 'pa' ? 'ਸਪਲਾਇਰ ਆਰਡਰ ਸੂਚੀ ਤਿਆਰ ਹੈ' : 'सप्लायर के लिए सामान की लिस्ट तैयार है',
    };
  }

  // Recovery Intent: "Jinka 1000 se zyada baaki hai, unko yaad dilao"
  if (/\b(yaad dilao|tagada|remind|reminders|paise mangwao|yaad karao|wapis mangwao|to vadh)\b/i.test(lower)) {
    const recoveryAmount = amount || 1000;
    return {
      intent: 'recovery',
      amount: recoveryAmount,
      confidence: 0.95,
      language: detectedLang,
      rawText: text,
      spokenReply:
        detectedLang === 'pa'
          ? `${recoveryAmount} ਤੋਂ ਵੱਧ ਵਾਲੇ ਗਾਹਕਾਂ ਨੂੰ ਯਾਦ-ਪੱਤਰ ਭੇਜਣਾ ਹੈ?`
          : `${recoveryAmount} से ज़्यादा बाकी वाले ग्राहकों को याद दिलाएं?`,
    };
  }

  // Stock Inquiry Intent: "Doodh khatam hone wala hai?" / "Chini kitni bachi hai?" / "bachi hai" / "bache hain"
  if (/\b(khatam|khatam hone wala|bacha hai|bachi hai|bache hain|stock|kinna hai|kinni bachi|kitna bacha|kitni bachi|mukk gaya|stock kitna)\b/i.test(lower)) {
    const itemName = firstItem;
    return {
      intent: 'stock',
      item: itemName,
      confidence: 0.92,
      language: detectedLang,
      rawText: text,
      spokenReply: itemName
        ? `${itemName} का स्टॉक चेक किया जा रहा है`
        : 'स्टॉक की जानकारी',
    };
  }

  // 4. Match Customer in Context
  let matchedCustomerName: string | null = null;

  // Check known customers
  // First check exact full names
  for (const cust of context.customers) {
    if (lower.includes(cust.name.toLowerCase())) {
      matchedCustomerName = cust.name;
      break;
    }
  }

  // If not full name, check first names or customer markers
  if (!matchedCustomerName) {
    const custPattern = /(?:^|\s)([a-zA-Z\u0900-\u097F]+)\s+(?:ko|ne|nu|ke\s*khate)\b/i;
    const match = text.match(custPattern);
    if (match) {
      const candidate = match[1].trim();
      if (!['aaj', 'kal', 'subah', 'sham', 'aj', 'unko'].includes(candidate.toLowerCase())) {
        matchedCustomerName = candidate;
      }
    }
  }

  // Check if candidate matches any known customer in context
  if (matchedCustomerName) {
    const candidateLower = matchedCustomerName.toLowerCase();
    for (const cust of context.customers) {
      const parts = cust.name.toLowerCase().split(' ');
      if (parts.includes(candidateLower) || cust.name.toLowerCase().includes(candidateLower)) {
        const firstName = cust.name.split(' ')[0];
        const hasMultiple = context.customers.filter((c) =>
          c.name.toLowerCase().startsWith(firstName.toLowerCase())
        ).length > 1;

        if (hasMultiple && parts[0] === candidateLower) {
          matchedCustomerName = firstName;
        } else {
          matchedCustomerName = cust.name;
        }
        break;
      }
    }
  }

  // 5. Payment Received Intent: "Ramesh Sharma ne 200 diye" / "diye" / "jama" / "wapis kite"
  if (isPaymentPhrase || isPaymentReturn) {
    const conf = amount ? 0.95 : 0.65;
    return {
      intent: 'payment',
      customer: matchedCustomerName,
      amount: amount,
      item: firstItem,
      quantity: qtyInfo.quantity,
      unit: qtyInfo.unit,
      confidence: conf,
      language: detectedLang,
      rawText: text,
      spokenReply: amount && matchedCustomerName
        ? `${matchedCustomerName} से ${amount} रुपये जमा लिख दूँ?`
        : 'जमा रकम दर्ज करें?',
      questionToAsk: !amount ? 'Kitne rupaye jama kiye?' : null,
    };
  }

  // 6. Credit Intent: "Ramesh ko 500 ka udhaar, aata aur chini" / "likh do" / "baaki"
  if (isCreditPhrase || (matchedCustomerName && /\b(likh do|likh deo|likh lo)\b/i.test(lower))) {
    // Calculate total price if amount was not explicitly spoken in currency
    let finalAmount = amount;
    if (!finalAmount && mentionedItems.length > 0 && context.items) {
      let total = 0;
      for (let i = 0; i < mentionedItems.length; i++) {
        const m = mentionedItems[i];
        const it = context.items.find((item) => item.name.toLowerCase() === m.canonical.toLowerCase());
        const price = it?.selling_price || 40;
        const prevIdx = i === 0 ? 0 : mentionedItems[i - 1].index + mentionedItems[i - 1].canonical.length;
        const segment = text.substring(prevIdx, m.index);
        const itemQty = extractQuantityAndUnit(segment).quantity || (i === 0 ? qtyInfo.quantity : null) || 1;
        total += itemQty * price;
      }
      if (total > 0) finalAmount = total;
    }

    const conf = (finalAmount || firstItem) ? 0.95 : 0.6;
    const itemsSummary = mentionedItems.length > 1
      ? mentionedItems.map((m) => m.canonical).join(', ')
      : firstItem;

    return {
      intent: 'credit',
      customer: matchedCustomerName,
      amount: finalAmount,
      item: itemsSummary,
      quantity: qtyInfo.quantity,
      unit: qtyInfo.unit,
      confidence: conf,
      language: detectedLang,
      rawText: rawText,
      spokenReply: matchedCustomerName && finalAmount
        ? `${matchedCustomerName}, ${itemsSummary ? itemsSummary + ' (कुल ₹' + finalAmount + ')' : finalAmount + ' रुपये'} उधार। लिख दूँ?`
        : matchedCustomerName
        ? `${matchedCustomerName} का कितना उधार लिखना है?`
        : 'उधार खाता दर्ज करें?',
      questionToAsk: !finalAmount ? 'Kitne rupaye ka udhaar likhna hai?' : null,
    };
  }

  // 7. Sale Intent: "Aaj 5 kilo chini bechi" / "becha" / "vechi" / "bika"
  if (/\b(bechi|becha|bika|biki|vechi|vech|sale|cash sale|becho)\b/i.test(lower) || (firstItem && qtyInfo.quantity)) {
    const conf = (amount || (firstItem && qtyInfo.quantity)) ? 0.95 : 0.7;
    const spokenAmount = amount ? `${amount} रुपये` : '';
    const spokenItem = firstItem ? `${qtyInfo.quantity ? qtyInfo.quantity + ' ' : ''}${qtyInfo.unit || ''} ${firstItem}` : '';

    return {
      intent: 'sale',
      customer: null,
      amount: amount || (firstItem ? 50 : 0),
      item: firstItem,
      quantity: qtyInfo.quantity || (firstItem ? 1 : null),
      unit: qtyInfo.unit || 'kilo',
      confidence: conf,
      language: detectedLang,
      rawText: text,
      spokenReply: `${spokenItem} ${spokenAmount} नकद बिक्री। लिख दूँ?`.trim(),
    };
  }

  // 8. Fallback if customer and amount detected without explicit keyword (e.g. "Ramesh 500")
  if (matchedCustomerName && amount) {
    return {
      intent: 'credit',
      customer: matchedCustomerName,
      amount: amount,
      item: firstItem,
      quantity: qtyInfo.quantity,
      unit: qtyInfo.unit,
      confidence: 0.85,
      language: detectedLang,
      rawText: text,
      spokenReply: `${matchedCustomerName}, ${amount} रुपये उधार लिख दूँ?`,
    };
  }

  // 9. Low Confidence / Unknown
  return {
    intent: 'unknown',
    confidence: 0.5,
    language: detectedLang,
    rawText: text,
    spokenReply: detectedLang === 'pa' ? 'ਆਵਾਜ਼ ਸਾਫ਼ ਨਹੀਂ ਆਈ, ਫਿਰ ਤੋਂ ਬੋਲੋ' : 'आवाज़ साफ़ नहीं आई, फिर से बोलिए',
    questionToAsk: 'Awaaz saaf nahi aayi, phir se boliye',
  };
}

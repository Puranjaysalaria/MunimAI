import { extractAmount, extractQuantityAndUnit } from './numbers';
import { findMentionedItems } from './synonyms';
import { transliterateIndicToLatin } from './indicNormalizer';
import { Customer, Item, ParseResult } from '../types/schema';

export interface RuleParserContext {
  customers: Customer[];
  items?: Item[];
  preferredLanguage?: string;
  activeItem?: Item | null;
}

/**
 * High-performance deterministic rule parser for Munim AI
 * Handles Hindi, Punjabi, and Hinglish kirana shop inputs offline.
 */
export function parseWithRules(
  rawText: string,
  context: RuleParserContext = { customers: [] }
): ParseResult {
  // 1. Language Detection from original script & markers
  let detectedLang: 'hi' | 'pa' | 'en' =
    context.preferredLanguage === 'pa' || context.preferredLanguage === 'en'
      ? (context.preferredLanguage as 'pa' | 'en')
      : 'hi';
  const hasGurmukhi = /[\u0A00-\u0A7F]/.test(rawText);
  const punjabiMarkers = ['nu', ' da ', ' di ', 'vechi', 'vech', 'kite', 'kinna', 'kinni', 'aaho', 'ditta', 'to vadh', 'hovega', 'sat sri akal'];
  const englishMarkers = ['credit', 'payment', 'sale', 'sold', 'received', 'sugar', 'milk', 'stock', 'summary'];

  if (hasGurmukhi || punjabiMarkers.some((m) => rawText.toLowerCase().includes(m))) {
    detectedLang = 'pa';
  } else if (context.preferredLanguage === 'en') {
    detectedLang = 'en';
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
      spokenReply:
        detectedLang === 'en'
          ? 'Voice was not clear, please speak again'
          : detectedLang === 'pa'
          ? 'ਆਵਾਜ਼ ਸਾਫ਼ ਨਹੀਂ ਆਈ, ਮੁੜ ਬੋਲੋ'
          : 'आवाज़ साफ़ नहीं आई, फिर से बोलिए',
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
      spokenReply:
        detectedLang === 'en'
          ? 'Undoing last transaction'
          : detectedLang === 'pa'
          ? 'ਪਿਛਲਾ ਸੌਦਾ ਰੱਦ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ'
          : 'पिछला लेन-देन वापस किया जा रहा है',
    };
  }

  // Check if sentence is an active transaction request (has udhaar, khate mein, sale, payment keywords)
  const isCreditPhrase = /\b(udhaar|udhar|khate\s*mein|khate\s*me|naame|udharaan|loan|loans|credit|borrow|borrowed|lent|lend|on\s*credit|due)\b/i.test(lower);
  const isPaymentPhrase = /\b(diye|diya|jama|lauta\s*diye|de\s*ditta|wapis\s*kite|pay\s*kitta|paid|pay|payment|repaid|repay|returned|received|cleared|settled|given|gave|give|gives|has\s+given|have\s+given|handed|sent|deposited|transferred)\b/i.test(lower) ||
    /(दिए|दिया|जमा|वापिस|ਲੌਟਾ|ਦਿੱਤੇ|ਦਿੱਤਾ|ਜਮ੍ਹਾ)/.test(lower);
  const isSalePhrase = /\b(bechi|becha|bika|biki|vechi|vech|sale|sales|cash\s*sale|becho|sold|sell|selling)\b/i.test(lower);

  // Multi-lingual & multi-script Yes / No recognition
  const isYesWord = (t: string) =>
    /\b(haan|ha|haa|aaho|yes|yeah|yup|yep|sure|ok|okay|confirm|save|done|correct|right|likh\s*do|likh\s*deo|theek\s*hai|theek|save\s*kar\s*do|kar\s*do|bilkul|ho|sari|aam|avunu|haudu|athe)\b/i.test(t) ||
    /(?:^|\s|[^\p{L}\p{N}])(हाँ|हां|हाँजी|जी\s*हाँ|लिख\s*दो|लिख\s*लो|कर\s*दो|ठीक\s*है|सही\s*है|ਹਾਂ|ਹਾਂਜੀ|ਜੀ\s*ਹਾਂ|ਆਹੋ|ਲਿਖ\s*ਦਿਓ|ਠੀਕ\s*ਹੈ|હા|होय|हो|হ্যাঁ|ஆம்|சரி|అవును|సరే|ಹೌದು|ಅതെ)(?:$|\s|[^\p{L}\p{N}])/u.test(t);

  const isNoWord = (t: string) =>
    /\b(nahi|nahin|na|no|nope|nah|cancel|stop|ruko|discard|back|mat\s*likho|mat\s*karo|chhad\s*do|na\s*karo|don't|dont|nakko|venda|beda|illai|vaddu|wait)\b/i.test(t) ||
    /(?:^|\s|[^\p{L}\p{N}])(नहीं|ना|मत\s*लिखो|मत\s*करो|रद्द|कैंसिल|रुको|रहने\s*दो|ਨਹੀਂ|ਨਾ|ਨਾ\s*ਕਰੋ|ਛੱਡ\s*ਦਿਓ|ਰੱਦ|ਰੱਦ\s*ਕਰੋ|ਨਾਹੀ|नाही|नको|না|বাতিল|இல்லை|வேண்டாம்|వద్దు|కాదు|ಬೇಡ|വേണ്ട)(?:$|\s|[^\p{L}\p{N}])/u.test(t);

  // Confirmation YES: "Haan" / "Haan likh do" / "Aaho" / "हाँ" (only if not an explicit credit entry or item/customer present)
  const hasCustomerMarker = /\b(ko|ne|nu|ke\s*khate)\b/i.test(lower) || /(को|ने|ਨੂੰ)/.test(lower) || /(को|ने|ਨੂੰ)/.test(rawTrimmed);
  const isQueryPhrase = /\b(ledger|khata|record|records|statement|details|passbook|bill|scan|stock|order|list|show|open|view|check|dikhao|kholo)\b/i.test(lower);
  if (!isCreditPhrase && !isPaymentPhrase && !amount && !firstItem && !hasCustomerMarker && !isQueryPhrase) {
    if ((isYesWord(lower) || isYesWord(rawTrimmed)) && !isNoWord(lower) && !isNoWord(rawTrimmed)) {
      return {
        intent: 'confirm_yes',
        confidence: 0.98,
        language: detectedLang,
        rawText: text,
        spokenReply:
          detectedLang === 'en'
            ? 'Yes, transaction recorded'
            : detectedLang === 'pa'
            ? 'ਹਾਂ, ਸੌਦਾ ਲਿਖ ਦਿੱਤਾ ਗਿਆ ਹੈ'
            : 'हाँ, खाता सुरक्षित कर दिया गया है',
      };
    }
  }

  // Confirmation NO: "Nahi" / "Ruko" / "Cancel" / "नहीं"
  if ((isNoWord(lower) || isNoWord(rawTrimmed)) && !isCreditPhrase && !isPaymentPhrase) {
    return {
      intent: 'confirm_no',
      confidence: 0.98,
      language: detectedLang,
      rawText: text,
      spokenReply:
        detectedLang === 'en'
          ? 'Cancelled'
          : detectedLang === 'pa'
          ? 'ਰੱਦ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ'
          : 'रद्द कर दिया गया है',
    };
  }

  // 3b. Saved-Entry Edit Intents (edit_entry, change_amount, change_item, change_customer, change_quantity, change_date, edit_note)
  const isEditVerb =
    /\b(badlo|badal\s*do|change|edit|update|sudharo|sahi\s*karo|theek\s*karo|modify|fix|correct)\b/i.test(lower) ||
    /(बदलो|बदल\s*दो|सुधारो|सही\s*करो|एडिट|चेंज|ਬਦਲੋ|ਸੁਧਾਰੋ|ਬਦਲ\s*ਦਿਓ)/.test(rawTrimmed);

  const isRateOrPriceEdit =
    /\b(rate|bhav|mul|selling\s*price|cost\s*price|khareed|kharid)\b/i.test(lower) ||
    /(रेत|रेट|खरीद|ਰੇਟ|ਖਰੀਦ)/.test(rawTrimmed);

  if (isEditVerb && !isRateOrPriceEdit) {
    let editIntent: ParseResult['intent'] | null = null;
    if (/\b(amount|raqam|paisa|paise|rupaye|total)\b/i.test(lower) || /(रकम|अमाउंट|पैसे|ਰਕਮ)/.test(rawTrimmed)) {
      editIntent = 'change_amount';
    } else if (/\b(item|samaan|saaman|product)\b/i.test(lower) || /(सामान|आइटम|ਸਾਮਾਨ)/.test(rawTrimmed)) {
      editIntent = 'change_item';
    } else if (/\b(customer|grahak|naam|buyer)\b/i.test(lower) || /(ग्राहक|नाम|ਗਾਹਕ)/.test(rawTrimmed)) {
      editIntent = 'change_customer';
    } else if (/\b(quantity|qty|maatra|wazan|weight)\b/i.test(lower) || /(मात्रा|क्वांटिटी|ਮਾਤਰਾ)/.test(rawTrimmed)) {
      editIntent = 'change_quantity';
    } else if (/\b(date|taarikh|tarikh|day)\b/i.test(lower) || /(तारीख|तारीख़|ਤਾਰੀਖ਼)/.test(rawTrimmed)) {
      editIntent = 'change_date';
    } else if (/\b(note|remark|comment|tippani)\b/i.test(lower) || /(नोट|टिप्पणी|ਨੋਟ)/.test(rawTrimmed)) {
      editIntent = 'edit_note';
    } else if (/\b(entry|transaction|hisab|hisaab|record|len\s*den)\b/i.test(lower) || /(एंट्री|लेन-देन|हिसाब|ਐਂਟਰੀ)/.test(rawTrimmed)) {
      editIntent = 'edit_entry';
    }

    if (editIntent) {
      return {
        intent: editIntent,
        amount,
        item: firstItem,
        quantity: qtyInfo.quantity,
        unit: qtyInfo.unit,
        confidence: 0.94,
        language: detectedLang,
        rawText: rawTrimmed,
      };
    }
  }

  // Proof Intent: "Customer se bulwayein"
  if (/\b(customer se bulwayein|proof|audio recording|saboot|awaaz record|grahak di awaaz)\b/i.test(lower)) {
    return {
      intent: 'proof',
      confidence: 0.95,
      language: detectedLang,
      rawText: text,
      spokenReply:
        detectedLang === 'en'
          ? 'Record customer voice proof'
          : detectedLang === 'pa'
          ? 'ਗਾਹਕ ਦੀ ਆਵਾਜ਼ ਰਿਕਾਰਡ ਕਰੋ'
          : 'ग्राहक की आवाज़ रिकॉर्ड करें',
    };
  }

  // Navigation: Open Bill Scan ("Bill scan karo", "Scan the bill", "Scan a bill", "Bill se price update karo", "Bill ki photo lagani hai")
  if (
    /\b(?:scan|scanner|photo|picture|pic|camera|upload|take\s*(?:a\s*)?(?:photo|pic|picture)\s*of|kheencho|kheenchiye|click)\s*(?:the\s*|a\s*|this\s*|my\s*)?(?:bill|receipt|invoice|slip|parcha|voucher)\b/i.test(lower) ||
    /\b(?:bill|receipt|invoice|slip|parcha|voucher)\s*(?:ko\s*)?(?:the\s*)?(?:scan|scanner|photo|picture|pic|camera|upload|kheencho|kheenchiye|lagao|lagani|update|dekho)\b/i.test(lower) ||
    /\b(bill\s*scan|scan\s*bill|bill\s*se\s*price|bill\s*ki\s*photo|bill\s*di\s*photo|bill\s*photo|parcha\s*scan|photo\s*of\s*bill|scan\s*invoice|invoice\s*scan|bill\s*se\s*rate|bill\s*camera|camera\s*bill|open\s*bill\s*camera|bill\s*kheencho)\b/i.test(lower) ||
    /(ਬਿੱਲ\s*ਸਕੈਨ|ਬਿੱਲ\s*ਦੀ\s*ਫੋਟੋ|ਬਿਲ\s*ਸਕੈਨ)/.test(rawTrimmed) ||
    /(बिल\s*स्कैन|बिल\s*की\s*फोटो|बिल\s*से\s*रेट|बिल\s*से\s*प्राइस|पर्चा\s*स्कैन)/.test(rawTrimmed)
  ) {
    return {
      intent: 'open_bill_scan',
      targetTab: 'bill_scan',
      confidence: 0.98,
      language: detectedLang,
      rawText: text,
      spokenReply:
        detectedLang === 'en'
          ? 'Please take a photo of the bill'
          : detectedLang === 'pa'
          ? 'ਬਿੱਲ ਦੀ ਫੋਟੋ ਖਿੱਚੋ'
          : 'बिल की फोटो खींचिए',
    };
  }

  // Navigation: Open Stock Inventory ("Stock kholo", "Stock dikhao", "Dukaan ka stock")
  if (
    /\b(stock\s*kholo|stock\s*dikhao|dukaan\s*ka\s*stock|dukan\s*da\s*stock|open\s*stock|show\s*stock|open\s*inventory|show\s*inventory|go\s*to\s*stock|stock\s*screen|stock\s*tab)\b/i.test(lower) ||
    /(ਸਟਾਕ\s*ਖੋਲ੍ਹੋ|ਸਟਾਕ\s*ਦਿਖਾਓ|ਦੁਕਾਨ\s*ਦਾ\s*ਸਟਾਕ)/.test(rawTrimmed) ||
    /(स्टॉक\s*खोलो|स्टॉक\s*दिखाओ|दुकान\s*का\s*स्टॉक)/.test(rawTrimmed)
  ) {
    return {
      intent: 'open_stock',
      targetTab: 'stock',
      confidence: 0.98,
      language: detectedLang,
      rawText: text,
      spokenReply:
        detectedLang === 'en'
          ? 'Opening stock inventory'
          : detectedLang === 'pa'
          ? 'ਸਟਾਕ ਖੋਲ੍ਹਿਆ ਗਿਆ'
          : 'स्टॉक खोला गया',
    };
  }

  // Navigation: Open Customer Ledger ("Ledger kholo", "Khata kholo", "Udhaar khata dikhao")
  const hasCustomerQualifier =
    /\b(?:of|for|ka|ki|ke|da|di|de)\s+[a-zA-Z\u0900-\u097F]+/i.test(lower) ||
    context.customers.some((c) => {
      const first = c.name.split(/\s+/)[0].toLowerCase();
      return first.length >= 2 && new RegExp(`(^|\\s)${first}(\\s|$)`, 'i').test(lower);
    });

  if (
    !hasCustomerQualifier && (
    /\b(ledger\s*kholo|khata\s*kholo|udhaar\s*khata\s*dikhao|udhaar\s*khata\s*kholo|udhar\s*khata\s*dikhao|udhar\s*khata\s*kholo|bahi\s*khata\s*kholo|bahi\s*khata\s*open|open\s*(?:customer\s*)?ledger|show\s*(?:customer\s*)?ledger|go\s*to\s*(?:customer\s*)?ledger|go\s*to\s*khata|show\s*khata|open\s*khata|ledger\s*screen|ledger\s*tab)\b/i.test(lower) ||
    /(ਖਾਤਾ\s*ਖੋਲ੍ਹੋ|ਬਹੀ[- ]?ਖਾਤਾ\s*ਖੋਲ੍ਹੋ|ਉਧਾਰ\s*ਖਾਤਾ\s*ਦਿਖਾਓ|ਉਧਾਰ\s*ਖਾਤਾ\s*ਖੋਲ੍ਹੋ)/.test(rawTrimmed) ||
    /(खाता\s*खोलो|बही[- ]?खाता\s*खोलो|उधार\s*खाता\s*दिखाओ|उधार\s*खाता\s*खोलो|लेजर\s*खोलो)/.test(rawTrimmed)
    )
  ) {
    return {
      intent: 'open_ledger',
      targetTab: 'ledger',
      confidence: 0.98,
      language: detectedLang,
      rawText: text,
      spokenReply:
        detectedLang === 'en'
          ? 'Opening customer ledger'
          : detectedLang === 'pa'
          ? 'ਬਹੀ-ਖਾਤਾ ਖੋਲ੍ਹਿਆ ਗਿਆ'
          : 'खाता खोला गया',
    };
  }

  // Supplier Orders / Low Running Items: "Order low running items", "Order low stock", "Low running items", "Kam stock order karo", "Which item is running low"
  const isOrderAction = /\b(order|reorder|buy|build|create|list|supplier|sheet|bhejo|mangwao|mangwana|mangwa do|mangwa)\b/i.test(lower);
  const isLowStockInquiry =
    /\b(?:order|reorder|buy|get|list|create|build|generate)?\s*(?:the\s*)?(?:low\s*r[ui]n+ing|r[ui]n+ing\s*low|r[ui]n+ing\s*out|low\s*stock|out\s*of\s*stock|critical\s*stock|kam\s*stock|ghatt\s*stock|khatam\s*stock)\s*(?:items?|stock|maal|goods|products?|list)?\b/i.test(lower) ||
    /\b(?:low\s*r[ui]n+ing|r[ui]n+ing\s*low|r[ui]n+ing\s*out)\s*(?:items?|stock|goods|products?)?\b/i.test(lower) ||
    /\b(?:which|what|kaunsa|konsa|kihda|keda)\s+(?:items?|products?|goods|stock|saman|saaman|maal)\s+(?:is|are|chal\s*raha)?\s*(?:running\s*)?(?:low|short|out|kam|ghatt|khatam)\b/i.test(lower) ||
    /\b(?:items?|products?|saman|saaman|maal)\s+(?:running\s*)?(?:low|kam|ghatt|khatam)\b/i.test(lower);

  if (!firstItem && isLowStockInquiry) {
    const isOrdering = /\b(order\s*banao|order\s*bana)\b/i.test(lower);
    return {
      intent: isOrdering ? 'ordering' : isOrderAction ? 'build_order_list' : 'show_low_stock',
      targetTab: 'stock',
      confidence: 0.98,
      language: detectedLang,
      rawText: text,
      spokenReply: isOrdering || isOrderAction
        ? (detectedLang === 'en'
            ? 'Building supplier order list for low stock items'
            : detectedLang === 'pa'
            ? 'ਘੱਟ ਸਟਾਕ ਦਾ ਆਰਡਰ ਤਿਆਰ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ'
            : 'कम स्टॉक का सप्लायर ऑर्डर तैयार किया जा रहा है')
        : (detectedLang === 'en'
            ? 'Showing low stock items'
            : detectedLang === 'pa'
            ? 'ਘੱਟ ਸਟਾਕ ਦਿਖਾਇਆ ਜਾ ਰਿਹਾ ਹੈ'
            : 'कम स्टॉक वाले सामान दिखाए जा रहे हैं'),
    };
  }

  // Specific Item Order: "Order doodh", "Doodh order karo", "Order 10 litre doodh", "Aata mangwao"
  const hasKnownCustomerName = context.customers.some((c) =>
    new RegExp(`(^|\\s)${c.name.trim().split(/\\s+/)[0].replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(\\s|$)`, 'i').test(lower)
  );
  if (firstItem && isOrderAction && !isCreditPhrase && !isPaymentPhrase && !isSalePhrase && !hasCustomerMarker && !hasKnownCustomerName) {
    return {
      intent: 'order_item',
      item: firstItem,
      quantity: qtyInfo.quantity,
      unit: qtyInfo.unit,
      targetTab: 'stock',
      confidence: 0.95,
      language: detectedLang,
      rawText: text,
      spokenReply:
        detectedLang === 'en'
          ? `Preparing order for ${firstItem}`
          : detectedLang === 'pa'
          ? `${firstItem} ਲਈ ਆਰਡਰ ਤਿਆਰ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ`
          : `${firstItem} का आर्डर तैयार किया जा रहा है`,
    };
  }

  // Navigation: Open Today's Summary ("Today kholo", "Aaj ka hisaab", "Open today", "Today screen")
  if (
    /\b(today\s*kholo|today\s*screen|today\s*tab|open\s*today|show\s*today|go\s*to\s*today|open\s*today\s*summary|today\s*summary)\b/i.test(lower) ||
    /\b(aaj\s*ka\s*hisaab|aj\s*da\s*hisaab|aaj\s*ka\s*page|aj\s*da\s*page|aaj\s*ka\s*din)\b/i.test(lower) ||
    /(ਅੱਜ\s*ਦਾ\s*ਹਿਸਾਬ|ਅੱਜ\s*ਦਾ\s*ਪੇਜ|ਅੱਜ\s*ਦਾ\s*ਦਿਨ)/.test(rawTrimmed) ||
    /(आज\s*का\s*हिसाब|आज\s*का\s*पेज|टुडे\s*खोलो)/.test(rawTrimmed)
  ) {
    return {
      intent: 'open_today',
      targetTab: 'today',
      confidence: 0.98,
      language: detectedLang,
      rawText: text,
      spokenReply:
        detectedLang === 'en'
          ? "Opening today's summary"
          : detectedLang === 'pa'
          ? 'ਅੱਜ ਦਾ ਹਿਸਾਬ ਖੋਲ੍ਹਿਆ ਗਿਆ'
          : 'आज का हिसाब खोला गया',
    };
  }

  // Summary Intent: "Aaj kitni kamai hui?" / "Aj da kul hisaab"
  if (/\b(kamai|kamayi|kitni kamai|total sale|kul bikri|summary|din bhar ka|din bhar ki)\b/i.test(lower) || /\b(kul hisaab|hisab kitna|hisaab kitna)\b/i.test(lower)) {
    return {
      intent: 'summary',
      confidence: 0.95,
      language: detectedLang,
      rawText: text,
      spokenReply:
        detectedLang === 'en'
          ? "Showing today's business summary"
          : detectedLang === 'pa'
          ? 'ਅੱਜ ਦਾ ਕੁੱਲ ਹਿਸਾਬ ਦਿਖਾਇਆ ਜਾ ਰਿਹਾ ਹੈ'
          : 'आज की कमाई और हिसाब दिखाया जा रहा है',
    };
  }

  // Ordering Intent: "Agle hafte ka samaan mangwana hai" / "Supplier order"
  if (/\b(samaan mangwana|maal mangwana|order karna|order banao|supplier|agle hafte ka|order list|order bana|saman mangwa)\b/i.test(lower)) {
    return {
      intent: 'ordering',
      confidence: 0.95,
      language: detectedLang,
      rawText: text,
      spokenReply:
        detectedLang === 'en'
          ? 'Supplier order list is ready'
          : detectedLang === 'pa'
          ? 'ਸਪਲਾਇਰ ਆਰਡਰ ਸੂਚੀ ਤਿਆਰ ਹੈ'
          : 'सप्लायर के लिए सामान की लिस्ट तैयार है',
    };
  }

  // Reminder Settings Intent: "Reminder settings" / "Tagada settings" / "तगादा सेटिंग्स" / "ਯਾਦ-ਪੱਤਰ ਸੈਟਿੰਗਾਂ"
  if (
    /\b(reminder\s*settings?|tagada\s*settings?)\b/i.test(lower) ||
    (/\b(settings?)\b/i.test(lower) && /\b(reminder|tagada|udhaar|baaki)\b/i.test(lower)) ||
    /(तगादा|रिमाइंडर|उधारी)\s*सेटिंग/i.test(rawTrimmed) ||
    /ਯਾਦ[- ]?ਪੱਤਰ\s*ਸੈਟਿੰਗ/i.test(rawTrimmed)
  ) {
    return {
      intent: 'reminder_settings',
      confidence: 0.98,
      language: detectedLang,
      rawText: text,
      spokenReply:
        detectedLang === 'en'
          ? 'Opening reminder settings'
          : detectedLang === 'pa'
          ? 'ਯਾਦ-ਪੱਤਰ ਸੈਟਿੰਗਾਂ ਖੋਲ੍ਹੀਆਂ ਜਾ ਰਹੀਆਂ ਹਨ'
          : 'तगादा सेटिंग्स खोली जा रही हैं',
    };
  }

  // Price Actions: set_cost_price and set_selling_price
  const hasWord = (str: string, word: string) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`(?:^|\\s|[^\\p{L}\\p{N}])${escaped}(?:$|\\s|[^\\p{L}\\p{N}])`, 'u').test(str);
  };

  const explicitlyMatchedItem = context.items?.find((it) => {
    const clean = it.name.toLowerCase();
    if (hasWord(lower, clean)) return true;
    return it.synonyms?.some((s) => hasWord(lower, s.toLowerCase()));
  });

  const isDeicticOrSelected =
    /\b(this|this\s*item|selected|selected\s*item|current|current\s*item|iska|iski|iske|isda|isdi|isde|ehda|ehdi|eh|is\s*item|iss|ye|yeh|aa|idu|ithu)\b/i.test(lower) ||
    /(ਇਸਦਾ|ਇਹਦਾ|ਇਹ|ਇਸ|ਇਸਦੀ|ਇਸਦੇ|ਇਸ\s*ਸਾਮਾਨ|इसका|इसकी|इस|यह|इस\s*सामान)/.test(rawTrimmed);

  const matchedItemForPrice =
    explicitlyMatchedItem ||
    (isDeicticOrSelected && context.activeItem ? context.activeItem : null) ||
    (!explicitlyMatchedItem && context.activeItem ? context.activeItem : null) ||
    (firstItem ? context.items?.find((it) => it.name.toLowerCase() === firstItem.toLowerCase()) : null);

  const targetItemName = matchedItemForPrice?.name || firstItem;

  const isCostKeyword =
    /\b(khareed\s*rate|kharid\s*rate|cost\s*price|cost|buy\s*price|purchase\s*price|khareed\s*mul|kharid\s*mul|khareed\s*bhav|kharid\s*bhav|me\s*khareeda|vich\s*khareedya|vich\s*khareed|buy\s*rate|buying\s*price)\b/i.test(lower) ||
    /(ਖਰੀਦ|खरीद)/.test(rawTrimmed);

  const isPriceKeyword =
    /\b(rate|bhav|mul|selling\s*price|sell\s*price|sale\s*price|bechna|vechna|set\s*karo|kardo|kar\s*deo|set\s*price|change\s*price|update\s*price|selling)\b/i.test(lower) ||
    /(ਰੇਟ|रेट|सेलिंग|ਵੇਚਣਾ|बेचना)/.test(rawTrimmed);

  if (
    targetItemName &&
    amount &&
    !isCreditPhrase &&
    !isPaymentPhrase &&
    !hasCustomerMarker &&
    (isCostKeyword || isPriceKeyword)
  ) {
    const unit = qtyInfo.unit || matchedItemForPrice?.unit || 'litre';

    if (isCostKeyword) {
      const oldPrice = matchedItemForPrice ? matchedItemForPrice.cost_price : null;
      return {
        intent: 'set_cost_price',
        item: targetItemName,
        matchedItem: matchedItemForPrice || undefined,
        amount,
        unit,
        oldPrice,
        confidence: 0.96,
        language: detectedLang,
        rawText: text,
        spokenReply:
          detectedLang === 'en'
            ? `Set ${targetItemName} cost price to ₹${amount} per ${unit}?`
            : detectedLang === 'pa'
            ? `${targetItemName} ਦਾ ਖਰੀਦ ਰੇਟ ₹${amount}/${unit} ਸੈੱਟ ਕਰੀਏ?`
            : `${targetItemName} का खरीद रेट ₹${amount}/${unit} सेट करें?`,
      };
    } else {
      const oldPrice = matchedItemForPrice ? matchedItemForPrice.selling_price : null;
      return {
        intent: 'set_selling_price',
        item: targetItemName,
        matchedItem: matchedItemForPrice || undefined,
        amount,
        unit,
        oldPrice,
        confidence: 0.96,
        language: detectedLang,
        rawText: text,
        spokenReply:
          detectedLang === 'en'
            ? `Set ${targetItemName} selling price to ₹${amount} per ${unit}?`
            : detectedLang === 'pa'
            ? `${targetItemName} ਦਾ ਰੇਟ ₹${amount}/${unit} ਸੈੱਟ ਕਰੀਏ?`
            : `${targetItemName} का सेलिंग रेट ₹${amount}/${unit} सेट करें?`,
      };
    }
  }

  // Price Action without amount inquiry
  if (
    targetItemName &&
    !amount &&
    !isCreditPhrase &&
    !isPaymentPhrase &&
    !hasCustomerMarker &&
    (isCostKeyword || isPriceKeyword)
  ) {
    const isCost = isCostKeyword;
    const oldPrice = matchedItemForPrice
      ? (isCost ? matchedItemForPrice.cost_price : matchedItemForPrice.selling_price)
      : null;
    return {
      intent: isCost ? 'set_cost_price' : 'set_selling_price',
      item: targetItemName,
      matchedItem: matchedItemForPrice || undefined,
      amount: 0,
      unit: matchedItemForPrice?.unit || 'kilo',
      oldPrice,
      confidence: 0.9,
      language: detectedLang,
      rawText: text,
      questionToAsk:
        detectedLang === 'en'
          ? `What is the new ${isCost ? 'cost' : 'selling'} price for ${targetItemName}?`
          : detectedLang === 'pa'
          ? `${targetItemName} ਦਾ ਨਵਾਂ ${isCost ? 'ਖਰੀਦ ' : ''}ਰੇਟ ਕਿੰਨਾ ਲਗਾਉਣਾ ਹੈ?`
          : `${targetItemName} का नया ${isCost ? 'खरीद ' : 'सेलिंग '}रेट कितना लगाना है?`,
      spokenReply:
        detectedLang === 'en'
          ? `What is the new ${isCost ? 'cost' : 'selling'} price for ${targetItemName}?`
          : detectedLang === 'pa'
          ? `${targetItemName} ਦਾ ਨਵਾਂ ${isCost ? 'ਖਰੀਦ ' : ''}ਰੇਟ ਕਿੰਨਾ ਲਗਾਉਣਾ ਹੈ?`
          : `${targetItemName} का नया ${isCost ? 'खरीद ' : 'सेलिंग '}रेट कितना लगाना है?`,
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
        detectedLang === 'en'
          ? `Remind customers owing more than ₹${recoveryAmount}?`
          : detectedLang === 'pa'
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
      spokenReply:
        detectedLang === 'en'
          ? (itemName ? `Checking stock for ${itemName}` : 'Checking inventory stock')
          : detectedLang === 'pa'
          ? (itemName ? `${itemName} ਦਾ ਸਟਾਕ ਚੈੱਕ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ` : 'ਸਟਾਕ ਦੀ ਜਾਣਕਾਰੀ')
          : (itemName ? `${itemName} का स्टॉक चेक किया जा रहा है` : 'स्टॉक की जानकारी'),
    };
  }

  // 4. Match Customer in Context
  let matchedCustomerName: string | null = null;

  // First check exact full names of known customers
  for (const cust of context.customers) {
    if (new RegExp(`(^|\\s)${cust.name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(\\s|$)`, 'i').test(lower)) {
      matchedCustomerName = cust.name;
      break;
    }
  }

  // Next check customer markers: Hindi/Punjabi (ko/ne/nu/ke khate)
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

  // Next check English prepositions: for/to/from/by/of/about <name>
  if (!matchedCustomerName) {
    const prepPattern = /(?:^|\s)(?:for|to|from|by|of|about)\s+(?:customer\s+|user\s+)?([a-zA-Z\u0900-\u097F]+)\b/i;
    const match = text.match(prepPattern);
    if (match) {
      const candidate = match[1].trim();
      if (!['aaj', 'kal', 'today', 'cash', 'loan', 'credit', 'me', 'him', 'her', 'store', 'the', 'bill', 'receipt', 'item', 'items', 'ledger', 'record', 'records'].includes(candidate.toLowerCase())) {
        matchedCustomerName = candidate;
      }
    }
  }

  // Next check ledger inquiry with customer name: "show <name> ledger", "<name> ledger", "<name> record", "<name> ka khata", "ledger of <name>", "record of <name>"
  if (!matchedCustomerName) {
    const ledgerCustPattern = /(?:(?:show|open|view|check|dikhao|kholo|dekho)?\s*(?:ledger|khata|record|records|statement|details|passbook|hisab)\s*(?:of|for|ka|ki|ke|da|di|de)?\s+([a-zA-Z\u0900-\u097F]+)|([a-zA-Z\u0900-\u097F]+)(?:'s|s)?\s*(?:ka|ki|ke|da|di|de)?\s*(?:ledger|khata|record|records|statement|details|passbook|hisab))/i;
    const match = text.trim().match(ledgerCustPattern);
    if (match) {
      const candidate = (match[1] || match[2] || '').trim();
      if (candidate && !['the', 'a', 'any', 'my', 'all', 'customer', 'user', 'grahak', 'gaahak', 'show', 'open', 'view', 'check', 'record', 'ledger'].includes(candidate.toLowerCase())) {
        matchedCustomerName = candidate;
      }
    }
  }

  // Next check English Subject + Verb pattern: e.g. "Ankit has given 500", "Ankit gave 500", "Ankit paid 500", "Ankit gave me 500"
  if (!matchedCustomerName) {
    const subjectVerbPattern = /^([a-zA-Z\u0900-\u097F]+)\s+(?:has\s+given|have\s+given|gave|gives|given|has\s+paid|have\s+paid|paid|pays|paying|handed|sent|deposited|transferred|took|taken|has\s+taken|borrowed|has\s+borrowed)(?:\s+me)?\b/i;
    const match = text.trim().match(subjectVerbPattern);
    if (match) {
      const candidate = match[1].trim();
      if (!['add', 'record', 'nava', 'new', 'send', 'aaj', 'kal', 'today', 'total', 'sale', 'cash', 'me', 'him', 'her', 'the', 'please', 'customer', 'supplier'].includes(candidate.toLowerCase())) {
        matchedCustomerName = candidate;
      }
    }
  }

  // Next check leading name pattern: "<Name> <amount> <intent>" e.g. "Ankit 900 loan", "Sunita 350 payment"
  if (!matchedCustomerName) {
    const leadingNamePattern = /^([a-zA-Z\u0900-\u097F]+)\s+(?:\d+|pachaas|fifty|sau|hundred)/i;
    const match = text.trim().match(leadingNamePattern);
    if (match) {
      const candidate = match[1].trim();
      if (!['add', 'record', 'nava', 'new', 'send', 'aaj', 'kal', 'total', 'sale', 'cash'].includes(candidate.toLowerCase())) {
        matchedCustomerName = candidate;
      }
    }
  }

  // Next check if any known customer's first name is present as a standalone word
  if (!matchedCustomerName) {
    for (const cust of context.customers) {
      const firstName = cust.name.trim().split(/\s+/)[0];
      if (firstName.length >= 2 && new RegExp(`(^|\\s)${firstName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(\\s|$)`, 'i').test(lower)) {
        const count = context.customers.filter((c) =>
          c.name.toLowerCase().startsWith(firstName.toLowerCase())
        ).length;
        matchedCustomerName = count > 1 ? firstName : cust.name;
        break;
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

  // 4b. Customer Ledger Inquiry: e.g. "Ramesh ka khata", "Show Ramesh ledger", "Ramesh record", "Open Ramesh account"
  const isLedgerInquiry =
    /\b(?:ledger|khata|bahi\s*khata|account|record|records|statement|details|passbook|history|entries|transactions?|hisab|hisaab)\b/i.test(lower) ||
    /\b(?:show|open|view|check|dikhao|kholo|dekho)\b/i.test(lower) ||
    /(ਖਾਤਾ|ਬਹੀ[- ]?ਖਾਤਾ|ਲੈਜ਼ਰ|ਰਿਕਾਰਡ|ਵੇਰਵੇ|ਵੇਖੋ|ਖੋਲ੍ਹੋ)/.test(rawTrimmed) ||
    /(खाता|बही[- ]?खाता|लेजर|रिकॉर्ड|विवरण|हिसाब|पासबुक|दिखाओ|खोलो|देखें)/.test(rawTrimmed);

  if (matchedCustomerName && isLedgerInquiry && !isPaymentPhrase && !isCreditPhrase && !isSalePhrase && !amount) {
    return {
      intent: 'show_customer_ledger',
      customer: matchedCustomerName,
      targetTab: 'ledger',
      confidence: 0.98,
      language: detectedLang,
      rawText: text,
      spokenReply:
        detectedLang === 'en'
          ? `Opening ${matchedCustomerName}'s ledger`
          : detectedLang === 'pa'
          ? `${matchedCustomerName} ਦਾ ਖਾਤਾ ਖੋਲ੍ਹਿਆ ਗਿਆ`
          : `${matchedCustomerName} का खाता खोला गया`,
    };
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
        ? detectedLang === 'en'
          ? `Record ₹${amount} payment from ${matchedCustomerName}?`
          : detectedLang === 'pa'
          ? `${matchedCustomerName} ਤੋਂ ${amount} ਰੁਪਏ ਜਮ੍ਹਾ ਲਿਖ ਦਿਆਂ?`
          : `${matchedCustomerName} से ${amount} रुपये जमा लिख दूँ?`
        : detectedLang === 'en'
        ? 'Record received payment?'
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
        ? detectedLang === 'en'
          ? `${matchedCustomerName}, ₹${finalAmount} credit loan. Record it?`
          : detectedLang === 'pa'
          ? `${matchedCustomerName}, ${itemsSummary ? itemsSummary + ' (ਕੁੱਲ ₹' + finalAmount + ')' : finalAmount + ' ਰੁਪਏ'} ਉਧਾਰ। ਲਿਖ ਦਿਆਂ?`
          : `${matchedCustomerName}, ${itemsSummary ? itemsSummary + ' (कुल ₹' + finalAmount + ')' : finalAmount + ' रुपये'} उधार। लिख दूँ?`
        : matchedCustomerName
        ? detectedLang === 'en'
          ? `How much credit for ${matchedCustomerName}?`
          : `${matchedCustomerName} का कितना उधार लिखना है?`
        : detectedLang === 'en'
        ? 'Record credit transaction?'
        : 'उधार खाता दर्ज करें?',
      questionToAsk: !finalAmount ? 'Kitne rupaye ka udhaar likhna hai?' : null,
    };
  }

  // 7. Sale Intent: "Aaj 5 kilo chini bechi" / "becha" / "vechi" / "bika" / "sold" / "cash sale"
  if (isSalePhrase || (firstItem && qtyInfo.quantity)) {
    const conf = (amount || (firstItem && qtyInfo.quantity)) ? 0.95 : 0.7;
    const spokenAmount = amount
      ? detectedLang === 'en'
        ? `₹${amount}`
        : detectedLang === 'pa'
        ? `${amount} ਰੁਪਏ`
        : `${amount} रुपये`
      : '';
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
      spokenReply:
        detectedLang === 'en'
          ? `${spokenItem} ₹${amount || 50} cash sale. Record it?`.trim()
          : detectedLang === 'pa'
          ? `${spokenItem} ${spokenAmount} ਨਕਦ ਵਿਕਰੀ। ਲਿਖ ਦਿਆਂ?`.trim()
          : `${spokenItem} ${spokenAmount} नकद बिक्री। लिख दूँ?`.trim(),
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
      spokenReply:
        detectedLang === 'en'
          ? `${matchedCustomerName}, record ₹${amount} credit?`
          : detectedLang === 'pa'
          ? `${matchedCustomerName}, ${amount} ਰੁਪਏ ਉਧਾਰ ਲਿਖ ਦਿਆਂ?`
          : `${matchedCustomerName}, ${amount} रुपये उधार लिख दूँ?`,
    };
  }

  // 9. Low Confidence / Unknown
  return {
    intent: 'unknown',
    confidence: 0.5,
    language: detectedLang,
    rawText: text,
    spokenReply:
      detectedLang === 'en'
        ? 'Voice was not clear, please speak again'
        : detectedLang === 'pa'
        ? 'ਆਵਾਜ਼ ਸਾਫ਼ ਨਹੀਂ ਆਈ, ਫਿਰ ਤੋਂ ਬੋਲੋ'
        : 'आवाज़ साफ़ नहीं आई, फिर से बोलिए',
    questionToAsk: 'Awaaz saaf nahi aayi, phir se boliye',
  };
}

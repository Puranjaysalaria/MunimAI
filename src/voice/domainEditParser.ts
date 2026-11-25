import { CustomerLanguage, Item, ReminderTone } from '../types/schema';
import { LanguageCode } from '../i18n/types';
import { findMentionedItems } from '../parser/synonyms';
import { parseMultilingualNumber, parseMultilingualQuantityAndUnit } from './multilingualNumbers';
import { transliterateIndicToLatin } from '../parser/indicNormalizer';

export interface ReminderPreviewEditPatch {
  tone?: ReminderTone;
  language?: LanguageCode;
  includeUpi?: boolean;
}

/**
 * Parses voice edits to a reminder preview before tapping Send:
 * - Tone: polite / standard / firm (e.g. "naram tone", "firm karo", "sakht bhasha")
 * - Language: hi, en, pa, gu, mr, bn, ta, te, kn, ml
 * - UPI details: "UPI hatao", "remove UPI", "UPI jodo", "add UPI"
 */
export function parseReminderPreviewEdit(rawText: string): ReminderPreviewEditPatch | null {
  const lower = transliterateIndicToLatin(rawText).toLowerCase();
  const patch: ReminderPreviewEditPatch = {};

  if (/\b(polite|naram|soft|pyaar|meetha|विनम्र|नरम|ਨਰਮ)\b/iu.test(rawText) || /\b(polite|naram|soft)\b/i.test(lower)) {
    patch.tone = 'polite';
  } else if (/\b(firm|sakht|strict|kadak|दृढ़|सख्त|ਸਖ਼ਤ)\b/iu.test(rawText) || /\b(firm|sakht|strict)\b/i.test(lower)) {
    patch.tone = 'firm';
  } else if (/\b(standard|normal|regular|saadharan|सामान्य|ਆਮ)\b/iu.test(rawText) || /\b(standard|normal|regular)\b/i.test(lower)) {
    patch.tone = 'standard';
  }

  if (/\b(upi|link|payment\s*details?)\b/i.test(lower)) {
    if (/\b(remove|hatao|hata\s*do|band|no|without|bina|mat|हटाओ|हटा\s*दो|ਹਟਾਓ)\b/iu.test(rawText)) {
      patch.includeUpi = false;
    } else if (/\b(add|jodo|lagao|include|with|shamil|जोड़ो|लगाओ|ਜੋੜੋ)\b/iu.test(rawText)) {
      patch.includeUpi = true;
    }
  }

  const langMap: Array<[RegExp, LanguageCode]> = [
    [/\b(hindi|हिंदी|हिन्दी|ਹਿੰਦੀ)\b/iu, 'hi'],
    [/\b(english|angrezi|अंग्रेज़ी|अंग्रेजी|ਅੰਗਰੇਜ਼ੀ)\b/iu, 'en'],
    [/\b(punjabi|ਪੰਜਾਬੀ|पंजाबी)\b/iu, 'pa'],
    [/\b(gujarati|ગુજરાતી|गुजराती)\b/iu, 'gu'],
    [/\b(marathi|मराठी)\b/iu, 'mr'],
    [/\b(bengali|bangla|বাংলা|बंगाली)\b/iu, 'bn'],
    [/\b(tamil|தமிழ்|तमिल)\b/iu, 'ta'],
    [/\b(telugu|తెలుగు|तेलुगु)\b/iu, 'te'],
    [/\b(kannada|ಕನ್ನಡ|कन्नड़)\b/iu, 'kn'],
    [/\b(malayalam|മലയാളം|मलयालम)\b/iu, 'ml'],
  ];
  for (const [rx, code] of langMap) {
    if (rx.test(rawText)) {
      patch.language = code;
      break;
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

export interface SupplierOrderEditCommand {
  action: 'add' | 'remove' | 'set_qty';
  itemName: string;
  quantity?: number;
  unit?: string | null;
}

/**
 * Parses voice edits to a supplier order list:
 * - Remove: "chini hatao", "remove sugar"
 * - Add: "20 kilo chawal jodo", "add 10 packet maggi"
 * - Quantity change: "chini 15 kilo kar do", "milk quantity 20"
 */
export function parseSupplierOrderEdit(rawText: string, items: Item[] = []): SupplierOrderEditCommand | null {
  const lower = transliterateIndicToLatin(rawText).toLowerCase();
  const mentioned = findMentionedItems(rawText, items);
  if (mentioned.length === 0) return null;

  const itemName = mentioned[0].canonical;
  const { quantity, unit } = parseMultilingualQuantityAndUnit(rawText);
  const num = quantity ?? parseMultilingualNumber(rawText);

  if (/\b(remove|hatao|hata\s*do|delete|nikalo|cancel|हटाओ|निकालो|ਹਟਾਓ)\b/iu.test(rawText) || /\b(remove|hatao|nikalo)\b/i.test(lower)) {
    return { action: 'remove', itemName };
  }

  if (/\b(add|jodo|jod\s*do|shamil|extra|aur|जोड़ो|शामिल|ਜੋੜੋ)\b/iu.test(rawText) || /\b(add|jodo)\b/i.test(lower)) {
    return { action: 'add', itemName, quantity: num || 10, unit };
  }

  if (num !== null && num > 0) {
    return { action: 'set_qty', itemName, quantity: num, unit };
  }

  return null;
}

export interface StockCountEditCommand {
  itemName: string;
  newStock: number;
}

/**
 * Parses voice edits to stock count:
 * - "chini ka stock 25 kilo kar do"
 * - "update milk stock to 30"
 */
export function parseStockCountEdit(rawText: string, items: Item[] = [], activeItem?: Item | null): StockCountEditCommand | null {
  const lower = transliterateIndicToLatin(rawText).toLowerCase();
  if (!/\b(stock|inventory|ginti|count|स्टॉक|गिनती|ਸਟਾਕ)\b/iu.test(rawText) && !/\b(stock|count)\b/i.test(lower)) {
    return null;
  }

  const mentioned = findMentionedItems(rawText, items);
  const itemName = mentioned[0]?.canonical || activeItem?.name;
  if (!itemName) return null;

  const { quantity } = parseMultilingualQuantityAndUnit(rawText);
  const num = quantity ?? parseMultilingualNumber(rawText);
  if (num === null || num < 0) return null;

  return { itemName, newStock: num };
}

export interface CustomerDetailEditCommand {
  field: 'name' | 'phone' | 'preferred_language';
  value: string;
}

/**
 * Parses voice edits to customer details:
 * - Phone: "phone number 9876543210 kar do"
 * - Language: "customer language Punjabi kar do"
 * - Name spelling: "naam Ramesh Kumar Verma kar do"
 */
export function parseCustomerDetailEdit(rawText: string): CustomerDetailEditCommand | null {
  const phoneMatch = rawText.match(/(?:phone|mobile|number|फ़ोन|मोबाइल|नंबर|ਫ਼ੋਨ)\s*(?:number)?\s*(?:is|to|kar\s*do|कर\s*दो)?\s*([+\d\s-]{8,15})/iu);
  if (phoneMatch && phoneMatch[1]) {
    const digits = phoneMatch[1].replace(/[^\d+]/g, '');
    if (digits.length >= 8) {
      return { field: 'phone', value: digits };
    }
  }

  if (/\b(language|bhasha|boli|भाषा|बोली|ਭਾਸ਼ਾ)\b/iu.test(rawText)) {
    const rem = parseReminderPreviewEdit(rawText);
    if (rem?.language) {
      return { field: 'preferred_language', value: rem.language as CustomerLanguage };
    }
  }

  const nameMatch = rawText.match(/(?:name|naam|spelling|नाम|ਸਪੈਲਿੰਗ|ਨਾਮ)\s*(?:to|is|badal\s*kar|कर\s*दो|बदलो)?\s*([a-zA-Z\u0900-\u097F\u0A00-\u0A7F\s]{2,40})/iu);
  if (nameMatch && nameMatch[1]) {
    const cleaned = nameMatch[1].replace(/\b(kar\s*do|rakho|set|karo|कर\s*दो|बदलो)\b/gi, '').trim();
    if (cleaned.length >= 2) {
      return { field: 'name', value: cleaned };
    }
  }

  return null;
}

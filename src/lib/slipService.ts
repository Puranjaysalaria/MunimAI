import { LanguageCode, locales } from '../i18n';
import { resolveMessageLanguage } from './reminderService';

export { resolveMessageLanguage };

/**
 * Normalizes phone number for WhatsApp wa.me links:
 * - Digits only
 * - Country code (defaults to 91 for Indian 10-digit numbers)
 */
export function formatWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Normalizes phone number for SMS links:
 * - Uses +91XXXXXXXXXX for Indian 10-digit numbers
 */
export function formatSMSPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+91${digits}`;
  if (phone.startsWith('+')) return phone.replace(/[^\d+]/g, '');
  return `+${digits}`;
}

/**
 * Generates an SMS URL ensuring compatibility across Android & iOS:
 * sms:+91XXXXXXXXXX?&body=<encodeURIComponent(msg)>
 */
export function buildSMSLink(phone: string, message: string): string {
  const formattedPhone = formatSMSPhone(phone);
  return `sms:${formattedPhone}?&body=${encodeURIComponent(message)}`;
}

/**
 * Generates a WhatsApp deep link:
 * https://wa.me/91XXXXXXXXXX?text=<encodeURIComponent(msg)>
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Safe translation lookup helper with runtime warning for missing keys
 */
export function getSlipTranslation(
  lang: LanguageCode,
  key: keyof typeof locales.en.slips
): string {
  const locale = locales[lang] || locales.hi;
  if (!locale.slips || !locale.slips[key]) {
    console.warn(`[i18n] Missing slip translation key "${String(key)}" in language "${lang}"`);
    return locales.hi.slips[key] || locales.en.slips[key] || String(key);
  }
  return locale.slips[key];
}

export interface PurchaseSlipParams {
  shopName: string;
  customerName: string;
  date?: Date | string;
  items?: Array<{ name: string; quantity: number; unit?: string; price?: number }>;
  totalAmount: number;
  paidAmount?: number;
  balanceOwed: number;
  language: LanguageCode;
}

/**
 * Generates a clean, fully-localized purchase slip message for WhatsApp/SMS
 * Always uses Western numerals (₹500) and pulls all labels directly from i18n
 */
export function generatePurchaseSlipMessage(params: PurchaseSlipParams): string {
  const {
    shopName,
    customerName,
    date = new Date(),
    items = [],
    totalAmount,
    paidAmount = 0,
    balanceOwed,
    language,
  } = params;

  const validLang: LanguageCode = locales[language] ? language : 'hi';
  const tSlip = (k: keyof typeof locales.en.slips) => getSlipTranslation(validLang, k);

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const title = `🧾 *${shopName || tSlip('shopName')} - ${tSlip('slipTitle')}*`;
  const meta = `📅 ${tSlip('date')}: ${formattedDate}\n👤 ${tSlip('customer')}: ${customerName}`;
  const divider = '-----------------------------';

  let itemsSection = '';
  if (items && items.length > 0) {
    const itemList = items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.name} - ${it.quantity} ${it.unit || ''}${
            it.price !== undefined ? ` (₹${it.price})` : ''
          }`
      )
      .join('\n');
    itemsSection = `\n🛍️ *${tSlip('items')}:*\n${itemList}\n${divider}`;
  }

  const totals = [
    `💰 *${tSlip('total')}: ₹${totalAmount}*`,
    paidAmount > 0 ? `🟢 ${tSlip('paid')}: ₹${paidAmount}` : null,
    `🔴 *${tSlip('balance')}: ₹${balanceOwed}*`,
  ]
    .filter(Boolean)
    .join('\n');

  const footer = `\n\n🙏 ${tSlip('thankYou')}`;

  return `${title}\n${meta}\n${divider}${itemsSection}\n${totals}${footer}`;
}

export interface SupplierOrderSlipParams {
  shopName: string;
  supplierName: string;
  date?: Date | string;
  items: Array<{ name: string; quantity: number; unit: string; unitCost: number; totalCost: number }>;
  totalEstimatedCost: number;
  language: LanguageCode;
}

/**
 * Generates a localized purchase order slip for suppliers
 */
export function generateSupplierOrderSlip(params: SupplierOrderSlipParams): string {
  const {
    shopName,
    supplierName,
    date = new Date(),
    items = [],
    totalEstimatedCost,
    language,
  } = params;

  const validLang: LanguageCode = locales[language] ? language : 'hi';
  const tSlip = (k: keyof typeof locales.en.slips) => getSlipTranslation(validLang, k);

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  const header = `📦 *${shopName} - ${tSlip('orderTitle')} (${formattedDate})*\n${tSlip('supplierLabel')}: ${supplierName}\n-----------------------------\n`;

  const itemsList = items
    .map(
      (it, idx) =>
        `${idx + 1}. ${it.name}: *${it.quantity} ${it.unit}* (@ ₹${it.unitCost} = ₹${it.totalCost})`
    )
    .join('\n');

  const footer = `\n-----------------------------\n*${tSlip('totalEstimatedAmount')}: ₹${totalEstimatedCost}*\n\n${tSlip('dispatchPrompt')} ${tSlip('orderThankYou')}`;

  return header + itemsList + footer;
}

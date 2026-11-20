import { describe, it, expect, vi } from 'vitest';
import {
  formatWhatsAppPhone,
  formatSMSPhone,
  buildWhatsAppLink,
  buildSMSLink,
  getSlipTranslation,
  generatePurchaseSlipMessage,
  generateSupplierOrderSlip,
} from '../src/lib/slipService';
import {
  resolveMessageLanguage,
  generateReminderMessage,
} from '../src/lib/reminderService';
import { LanguageCode } from '../src/i18n';

describe('Slip & Message Localization Service', () => {
  describe('1. Language Resolution Priority Order', () => {
    it('prioritizes customer preferred language over shop language and Hindi fallback', () => {
      // Customer preferred takes precedence
      expect(resolveMessageLanguage('pa', 'hi')).toBe('pa');
      expect(resolveMessageLanguage('gu', 'en')).toBe('gu');
      expect(resolveMessageLanguage('ta', 'mr')).toBe('ta');
    });

    it('falls back to shop language when customer preferred language is unset or undefined', () => {
      expect(resolveMessageLanguage(undefined, 'pa')).toBe('pa');
      expect(resolveMessageLanguage(null as any, 'gu')).toBe('gu');
      expect(resolveMessageLanguage(undefined, 'bn')).toBe('bn');
      expect(resolveMessageLanguage(undefined, 'mr')).toBe('mr');
    });

    it('falls back to Hindi when both customer and shop languages are unset or invalid', () => {
      expect(resolveMessageLanguage(undefined, undefined)).toBe('hi');
      expect(resolveMessageLanguage(null as any, null as any)).toBe('hi');
      expect(resolveMessageLanguage('invalid' as any, 'unknown' as any)).toBe('hi');
    });

    it('immediately changes output message when customer or shop language changes', () => {
      const msgPa = generateReminderMessage({
        customerName: 'Gurpreet Singh',
        shopName: 'Kalgidhar Store',
        amount: 2500,
        language: resolveMessageLanguage('pa', 'hi'),
      });

      const msgGu = generateReminderMessage({
        customerName: 'Manoj Tiwari',
        shopName: 'Kalgidhar Store',
        amount: 2500,
        language: resolveMessageLanguage('gu', 'hi'),
      });

      const msgEn = generateReminderMessage({
        customerName: 'Ankit',
        shopName: 'Kalgidhar Store',
        amount: 2500,
        language: resolveMessageLanguage('en', 'hi'),
      });

      expect(msgPa).not.toEqual(msgGu);
      expect(msgGu).not.toEqual(msgEn);
      expect(msgPa).toContain('ਬਾਕੀ');
      expect(msgGu).toContain('બાકી');
      expect(msgEn).toContain('balance');
    });
  });

  describe('2. Phone Formatting & Deep Link Construction', () => {
    it('formats WhatsApp phone with country code (91) and digits only', () => {
      expect(formatWhatsAppPhone('9811100001')).toBe('919811100001');
      expect(formatWhatsAppPhone('+91 98111 00001')).toBe('919811100001');
      expect(formatWhatsAppPhone('09811100001')).toBe('09811100001');
      expect(formatWhatsAppPhone('')).toBe('');
      expect(formatWhatsAppPhone(undefined)).toBe('');
    });

    it('formats SMS phone with +91 country prefix', () => {
      expect(formatSMSPhone('9811100001')).toBe('+919811100001');
      expect(formatSMSPhone('+91 98111 00001')).toBe('+919811100001');
      expect(formatSMSPhone('')).toBe('');
      expect(formatSMSPhone(undefined)).toBe('');
    });

    it('constructs wa.me URL with digits-only phone and full encodeURIComponent', () => {
      const msg = 'नमस्ते! आपका बकाया ₹500 है।\nधन्यवाद!';
      const link = buildWhatsAppLink('+91 98111-00001', msg);

      expect(link).toBe(
        `https://wa.me/919811100001?text=${encodeURIComponent(msg)}`
      );
      expect(link).toContain('%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%87'); // "नमस्ते"
      expect(link).toContain('%E2%82%B9500'); // ₹500
    });

    it('constructs SMS URL with sms:+91XXXXXXXXXX?&body=<encodeURIComponent(msg)>', () => {
      const msg = 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਬਾਕੀ ਰਕਮ ₹1,200 ਹੈ।';
      const link = buildSMSLink('9811100001', msg);

      expect(link).toBe(
        `sms:+919811100001?&body=${encodeURIComponent(msg)}`
      );
      expect(link.startsWith('sms:+919811100001?&body=')).toBe(true);
      expect(link).toContain('%E0%A8%B8%E0%A8%A4%E0%A8%BF'); // "ਸਤਿ"
    });
  });

  describe('3. Purchase Slip Localization & Script-Range Verification', () => {
    const nonHindiScripts: Array<{
      lang: LanguageCode;
      name: string;
      range: RegExp;
    }> = [
      { lang: 'pa', name: 'Punjabi', range: /[\u0A00-\u0A7F]/ },     // Gurmukhi
      { lang: 'gu', name: 'Gujarati', range: /[\u0A80-\u0AFF]/ },    // Gujarati
      { lang: 'bn', name: 'Bengali', range: /[\u0980-\u09FF]/ },     // Bengali
      { lang: 'ta', name: 'Tamil', range: /[\u0B80-\u0BFF]/ },       // Tamil
      { lang: 'te', name: 'Telugu', range: /[\u0C00-\u0C7F]/ },      // Telugu
      { lang: 'kn', name: 'Kannada', range: /[\u0C80-\u0CFF]/ },     // Kannada
      { lang: 'ml', name: 'Malayalam', range: /[\u0D00-\u0D7F]/ },   // Malayalam
    ];

    const devanagariRegex = /[\u0900-\u097F]/;

    nonHindiScripts.forEach(({ lang, name, range }) => {
      it(`renders Purchase Slip in ${name} (${lang}) containing native script and NO Devanagari`, () => {
        const slip = generatePurchaseSlipMessage({
          shopName: 'Dukaan',
          customerName: 'Test Customer',
          totalAmount: 1500,
          paidAmount: 500,
          balanceOwed: 1000,
          language: lang,
          items: [{ name: 'Item A', quantity: 2, price: 500 }],
        });

        // Must contain characters in native script range
        expect(range.test(slip)).toBe(true);
        // Non-Hindi languages must NOT contain any Devanagari characters
        expect(devanagariRegex.test(slip)).toBe(false);
        // Western digits must be preserved
        expect(slip).toContain('₹1500');
        expect(slip).toContain('₹500');
        expect(slip).toContain('₹1000');
      });
    });

    it('renders English Purchase Slip containing Latin script and NO Devanagari', () => {
      const slip = generatePurchaseSlipMessage({
        shopName: 'Dukaan',
        customerName: 'Test Customer',
        totalAmount: 2000,
        paidAmount: 1000,
        balanceOwed: 1000,
        language: 'en',
      });

      expect(slip).toContain('Purchase Slip');
      expect(slip).toContain('Total: ₹2000');
      expect(slip).toContain('Paid: ₹1000');
      expect(slip).toContain('Balance Owed: ₹1000');
      expect(devanagariRegex.test(slip)).toBe(false);
    });

    it('distinguishes Marathi (mr) and Hindi (hi) by language-specific vocabulary', () => {
      const hindiSlip = generatePurchaseSlipMessage({
        shopName: 'शर्मा किराना',
        customerName: 'रमेश',
        totalAmount: 1000,
        paidAmount: 400,
        balanceOwed: 600,
        language: 'hi',
      });

      const marathiSlip = generatePurchaseSlipMessage({
        shopName: 'शर्मा किराना',
        customerName: 'रमेश',
        totalAmount: 1000,
        paidAmount: 400,
        balanceOwed: 600,
        language: 'mr',
      });

      // Both use Devanagari
      expect(devanagariRegex.test(hindiSlip)).toBe(true);
      expect(devanagariRegex.test(marathiSlip)).toBe(true);

      // Hindi specific labels
      expect(hindiSlip).toContain('खरीद रसीद (पर्ची)');
      expect(hindiSlip).toContain('बकाया उधार');
      expect(hindiSlip).toContain('जमा रकम');

      // Marathi specific labels
      expect(marathiSlip).toContain('खरेदी पावती');
      expect(marathiSlip).toContain('बाकी उधारी');
      expect(marathiSlip).toContain('जमा');
      expect(marathiSlip).toContain('आपल्या खरेदीबद्दल मनःपूर्वक धन्यवाद!');
    });
  });

  describe('4. Western Digits & Numerals Uniformity', () => {
    const allLangs: LanguageCode[] = [
      'en', 'hi', 'pa', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml',
    ];

    allLangs.forEach((lang) => {
      it(`uses standard Western digits for ₹500 in ${lang}`, () => {
        const slip = generatePurchaseSlipMessage({
          shopName: 'Test Store',
          customerName: 'Customer',
          totalAmount: 500,
          paidAmount: 200,
          balanceOwed: 300,
          language: lang,
        });

        expect(slip).toContain('₹500');
        expect(slip).toContain('₹200');
        expect(slip).toContain('₹300');

        // Confirm absence of non-Western Arabic-Indic / Bengali / Gurmukhi numerals for the numbers
        // e.g. Gurmukhi ੫੦੦, Devanagari ५००, Bengali ৫০০
        expect(slip).not.toContain('५००');
        expect(slip).not.toContain('੫੦੦');
        expect(slip).not.toContain('૫૦૦');
        expect(slip).not.toContain('৫০০');
      });
    });
  });

  describe('5. Supplier Order Slips Localization', () => {
    it('generates localized purchase order message for suppliers in Telugu', () => {
      const order = generateSupplierOrderSlip({
        shopName: 'Sri Balaji Store',
        supplierName: 'Lakshmi Wholesale',
        totalEstimatedCost: 4500,
        language: 'te',
        items: [
          {
            name: 'Aashirvaad Atta 10kg',
            quantity: 10,
            unit: 'bags',
            unitCost: 400,
            totalCost: 4000,
          },
          {
            name: 'Sugar 1kg',
            quantity: 10,
            unit: 'packets',
            unitCost: 50,
            totalCost: 500,
          },
        ],
      });

      // Contains Telugu script range
      expect(/[\u0C00-\u0C7F]/.test(order)).toBe(true);
      // No Devanagari
      expect(/[\u0900-\u097F]/.test(order)).toBe(false);
      expect(order).toContain('₹4500');
      expect(order).toContain('Sri Balaji Store');
    });
  });

  describe('6. Fallback & Warning on Missing Translations', () => {
    it('logs console.warn when translation key is missing and falls back gracefully', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = getSlipTranslation('pa', 'nonExistentKey' as any);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[i18n] Missing slip translation key "nonExistentKey" in language "pa"')
      );
      expect(result).toBeDefined();

      warnSpy.mockRestore();
    });
  });
});

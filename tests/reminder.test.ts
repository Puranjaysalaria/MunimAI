import { describe, it, expect } from 'vitest';
import {
  generateReminderMessage,
  isQuietHours,
  hasSentReminderToday,
  evaluateCustomerReminderEligibility,
  buildDraftReminders,
  DEFAULT_REMINDER_SETTINGS,
  NATIVE_REVIEW_LANGUAGES,
} from '../src/lib/reminderService';
import { Customer, Shop } from '../src/types/schema';

const mockShop: Shop = {
  id: 'shop-1',
  name: 'Sharma General Store',
  owner_phone: '+919811100000',
  upi_id: 'sharma@okaxis',
  settings: {
    reminder_settings: {
      ...DEFAULT_REMINDER_SETTINGS,
    },
  },
};

const baseCustomer: Customer = {
  id: 'cust-1',
  shop_id: 'shop-1',
  name: 'Ramesh Sharma',
  phone: '+919811100001',
  preferred_language: 'hi',
  credit_limit: 5000,
  balance_owed: 1500,
  trust_score: 80,
};

describe('Reminder Service - Safety Rules & Template Engine', () => {
  describe('1. Threshold Filtering', () => {
    it('includes customers owing balance >= threshold', () => {
      const customers: Customer[] = [
        { ...baseCustomer, id: 'c1', balance_owed: 500 },
        { ...baseCustomer, id: 'c2', balance_owed: 1200 },
        { ...baseCustomer, id: 'c3', balance_owed: 2500 },
      ];

      const drafts = buildDraftReminders(customers, mockShop, 1000);
      expect(drafts.map((d) => d.customer.id)).toEqual(['c3', 'c2']);
    });

    it('respects custom threshold (e.g. ₹500)', () => {
      const customers: Customer[] = [
        { ...baseCustomer, id: 'c1', balance_owed: 400 },
        { ...baseCustomer, id: 'c2', balance_owed: 500 },
        { ...baseCustomer, id: 'c3', balance_owed: 800 },
      ];

      const drafts = buildDraftReminders(customers, mockShop, 500);
      expect(drafts.map((d) => d.customer.id)).toEqual(['c3', 'c2']);
    });
  });

  describe('2. VIP / High-Trust Exemption', () => {
    it('exempts customers with trust score >= 90 when toggle is ON', () => {
      const vipCustomer: Customer = {
        ...baseCustomer,
        id: 'vip-1',
        trust_score: 95,
        balance_owed: 2000,
      };

      const regularCustomer: Customer = {
        ...baseCustomer,
        id: 'reg-1',
        trust_score: 80,
        balance_owed: 2000,
      };

      const settings = {
        ...DEFAULT_REMINDER_SETTINGS,
        auto_filter_high_trust: true,
      };

      const resVip = evaluateCustomerReminderEligibility(vipCustomer, settings, 1000);
      expect(resVip.eligible).toBe(false);
      expect(resVip.reason).toBe('high_trust_exempt');

      const resReg = evaluateCustomerReminderEligibility(regularCustomer, settings, 1000);
      expect(resReg.eligible).toBe(true);
    });

    it('never exempts customers with missing or undefined trust score', () => {
      const noScoreCustomer: Customer = {
        ...baseCustomer,
        id: 'noscore-1',
        trust_score: undefined,
        balance_owed: 2000,
      };

      const settings = {
        ...DEFAULT_REMINDER_SETTINGS,
        auto_filter_high_trust: true,
      };

      const res = evaluateCustomerReminderEligibility(noScoreCustomer, settings, 1000);
      expect(res.eligible).toBe(true);
    });
  });

  describe('3. Do-Not-Remind Flag', () => {
    it('strictly excludes customers with do_not_remind = true', () => {
      const dndCustomer: Customer = {
        ...baseCustomer,
        id: 'dnd-1',
        balance_owed: 5000,
        do_not_remind: true,
      };

      const res = evaluateCustomerReminderEligibility(
        dndCustomer,
        DEFAULT_REMINDER_SETTINGS,
        1000
      );
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('do_not_remind');
    });
  });

  describe('4. Daily Cap (One reminder per customer per day)', () => {
    it('blocks re-sending on the same calendar day', () => {
      const today = new Date('2026-11-20T14:30:00Z');
      const sentEarlierToday = '2026-11-20T08:15:00Z';

      expect(hasSentReminderToday(sentEarlierToday, today)).toBe(true);

      const customerSentToday: Customer = {
        ...baseCustomer,
        last_reminded_at: sentEarlierToday,
      };

      const res = evaluateCustomerReminderEligibility(
        customerSentToday,
        DEFAULT_REMINDER_SETTINGS,
        1000,
        today
      );
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe('sent_today');
    });

    it('allows sending if last reminder was on a previous calendar day', () => {
      const today = new Date('2026-11-20T14:30:00Z');
      const sentYesterday = '2026-11-19T18:00:00Z';

      expect(hasSentReminderToday(sentYesterday, today)).toBe(false);

      const customerYesterday: Customer = {
        ...baseCustomer,
        last_reminded_at: sentYesterday,
      };

      const res = evaluateCustomerReminderEligibility(
        customerYesterday,
        DEFAULT_REMINDER_SETTINGS,
        1000,
        today
      );
      expect(res.eligible).toBe(true);
    });
  });

  describe('5. Quiet Hours (9 PM to 8 AM Configurable)', () => {
    it('detects night quiet hours across midnight (21:00 to 08:00)', () => {
      const lateNight = new Date();
      lateNight.setHours(22, 30, 0, 0); // 10:30 PM
      expect(isQuietHours(lateNight, '21:00', '08:00')).toBe(true);

      const earlyMorning = new Date();
      earlyMorning.setHours(6, 45, 0, 0); // 6:45 AM
      expect(isQuietHours(earlyMorning, '21:00', '08:00')).toBe(true);

      const daytime = new Date();
      daytime.setHours(15, 0, 0, 0); // 3:00 PM
      expect(isQuietHours(daytime, '21:00', '08:00')).toBe(false);
    });
  });

  describe('6. UPI On/Off & Missing UPI ID Fallback', () => {
    it('uses with_upi template when toggle is ON and UPI ID is present', () => {
      const drafts = buildDraftReminders(
        [baseCustomer],
        { ...mockShop, upi_id: 'sharma@okaxis' },
        1000,
        { include_upi_link: true }
      );

      expect(drafts[0].upiLink).toContain('upi://pay');
      expect(drafts[0].messageText).toContain('upi://pay?pa=sharma@okaxis');
    });

    it('uses without_upi template when toggle is OFF', () => {
      const drafts = buildDraftReminders(
        [baseCustomer],
        { ...mockShop, upi_id: 'sharma@okaxis' },
        1000,
        { include_upi_link: false }
      );

      expect(drafts[0].upiLink).toBeNull();
      expect(drafts[0].messageText).not.toContain('upi://pay');
      expect(drafts[0].messageText).toContain('दुकान');
    });

    it('falls back to without_upi template if shop upi_id is empty or missing', () => {
      const drafts = buildDraftReminders(
        [baseCustomer],
        { ...mockShop, upi_id: '' }, // empty UPI ID
        1000,
        { include_upi_link: true }
      );

      expect(drafts[0].upiLink).toBeNull();
      expect(drafts[0].messageText).not.toContain('upi://pay');
    });
  });

  describe('7. Per-Customer Tone Override', () => {
    it('prioritizes customer tone override over shop-wide tone', () => {
      const custWithOverride: Customer = {
        ...baseCustomer,
        id: 'override-1',
        reminder_tone_override: 'firm',
      };

      // Shop is configured as 'polite'
      const drafts = buildDraftReminders(
        [custWithOverride],
        mockShop,
        1000,
        { message_tone: 'polite' }
      );

      expect(drafts[0].tone).toBe('firm');
      // Firm Hindi wording contains "बहीखाते के अनुसार" and "लंबित"
      expect(drafts[0].messageText).toContain('बहीखाते');
      expect(drafts[0].messageText).toContain('लंबित');
    });
  });

  describe('8. Respectful "Firm (दृढ़)" Tone', () => {
    it('firm messages are factual and respectful without threats or shaming', () => {
      const hindiMsg = generateReminderMessage({
        customerName: 'अंकित',
        shopName: 'शर्मा किराना',
        amount: 2500,
        tone: 'firm',
        language: 'hi',
      });

      expect(hindiMsg).toContain('2500');
      expect(hindiMsg).toContain('बहीखाते');
      expect(hindiMsg).toContain('सहयोग के लिए धन्यवाद');
      expect(hindiMsg).not.toContain('चेतावनी');
      expect(hindiMsg).not.toContain('पुलिस');
      expect(hindiMsg).not.toContain('कानूनी');

      const englishMsg = generateReminderMessage({
        customerName: 'Ankit',
        shopName: 'Sharma Kirana',
        amount: 2500,
        tone: 'firm',
        language: 'en',
      });

      expect(englishMsg).toContain('outstanding balance');
      expect(englishMsg).toContain('2500');
      expect(englishMsg).toContain('Thank you for your cooperation');
      expect(englishMsg).not.toContain('threat');
      expect(englishMsg).not.toContain('legal action');
      expect(englishMsg).not.toContain('final warning');
    });
  });

  describe('9. Multi-Language Coverage (All 10 Languages)', () => {
    const allLangs = ['hi', 'pa', 'en', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml'];

    it('generates non-empty messages with and without UPI across all 10 languages and 3 tones', () => {
      for (const lang of allLangs) {
        for (const tone of ['polite', 'standard', 'firm'] as const) {
          const withUpi = generateReminderMessage({
            customerName: 'Customer',
            shopName: 'Store',
            amount: 500,
            upiLink: 'upi://pay?pa=test@upi',
            language: lang,
            tone,
          });
          expect(withUpi).toContain('500');
          expect(withUpi).toContain('upi://pay');

          const withoutUpi = generateReminderMessage({
            customerName: 'Customer',
            shopName: 'Store',
            amount: 500,
            language: lang,
            tone,
          });
          expect(withoutUpi).toContain('500');
          expect(withoutUpi).not.toContain('upi://pay');
        }
      }
    });

    it('documents languages requiring local native review', () => {
      expect(NATIVE_REVIEW_LANGUAGES).toEqual(['gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml']);
    });
  });

  describe('10. Punjabi & Indic Localization Completeness', () => {
    it('provides Gurmukhi translations in Punjabi without Hindi fallback words', async () => {
      const { pa } = await import('../src/i18n/pa');
      const paReminders = pa.reminders;

      // Verify specific buttons flagged in user screenshot
      expect(paReminders.pauseReminders).toBe('ਤਗਾਦਾ ਰੋਕੋ');
      expect(paReminders.resumeReminders).toBe('ਤਗਾਦਾ ਸ਼ੁਰੂ ਕਰੋ');
      expect(paReminders.viewMessage).toBe('ਵੇਖੋ');
      expect(paReminders.hideMessage).toBe('ਲੁਕਾਓ');
      expect(paReminders.sentTodayTapToResend).toBe('ਭੇਜਿਆ ਗਿਆ (ਮੁੜ ਭੇਜੋ)');
      expect(paReminders.sendSmsButton).toBe('SMS ਭੇਜੋ');
      expect(paReminders.withoutUpiLink).toBe('ਬਿਨਾਂ UPI ਲਿੰਕ');
      expect(paReminders.noPhone).toBe('ਫ਼ੋਨ ਨੰਬਰ ਨਹੀਂ ਹੈ');

      // None of the Punjabi reminder strings should have Devanagari Hindi characters
      const hindiDevanagariRegex = /[\u0900-\u097F]/;
      expect(hindiDevanagariRegex.test(paReminders.pauseReminders)).toBe(false);
      expect(hindiDevanagariRegex.test(paReminders.resumeReminders)).toBe(false);
      expect(hindiDevanagariRegex.test(paReminders.viewMessage)).toBe(false);
      expect(hindiDevanagariRegex.test(paReminders.hideMessage)).toBe(false);
      expect(hindiDevanagariRegex.test(paReminders.sentTodayTapToResend)).toBe(false);
      expect(hindiDevanagariRegex.test(paReminders.withoutUpiLink)).toBe(false);
      expect(hindiDevanagariRegex.test(paReminders.noPhone)).toBe(false);
    });
  });

  describe('11. Indic Speech Synthesis Transliteration Fallback', () => {
    it('transliterates Gurmukhi text to Devanagari for Hindi TTS fallback', async () => {
      const { gurmukhiToDevanagari } = await import('../src/tts/speechSynthesizer');
      const input = 'ਰਮੇਸ਼ ਕੁਮਾਰ ਲਈ WhatsApp ਯਾਦ-ਪੱਤਰ ਖੋਲ੍ਹਿਆ ਜਾ ਰਿਹਾ ਹੈ।';
      const output = gurmukhiToDevanagari(input);

      // Must be in Devanagari script so Microsoft Kalpana / Google Hindi voice can speak it naturally
      expect(output).toContain('रमेश कुमार');
      expect(output).toContain('लई');
      expect(output).toContain('WhatsApp');
      expect(output).toContain('याद-पत्तर');
      expect(output).toContain('जा रिहा है');
    });

    it('transliterates Gujarati text to Devanagari for Hindi TTS fallback', async () => {
      const { gujaratiToDevanagari } = await import('../src/tts/speechSynthesizer');
      const input = 'રમેશ કુમાર માટે WhatsApp રીમાઇન્ડર';
      const output = gujaratiToDevanagari(input);

      expect(output).toContain('रमेश कुमार');
      expect(output).toContain('माटे');
    });

    it('transliterates Bengali, Telugu, Kannada, Malayalam, Tamil for Indic TTS fallback', async () => {
      const { indicToDevanagari } = await import('../src/tts/speechSynthesizer');

      const bn = indicToDevanagari('রমেশ কুমারের জন্য WhatsApp তাগাদা', 'bn');
      expect(bn).toContain('रमेश कुमारेर');

      const te = indicToDevanagari('అంకిత్ కొరకు వాట్సాప్', 'te');
      expect(te).toContain('अंकित्');

      const kn = indicToDevanagari('ಅಂಕಿತ್ ಅವರಿಗಾಗಿ', 'kn');
      expect(kn).toContain('अंकित्');

      const ml = indicToDevanagari('അങ്കിതിനായി', 'ml');
      expect(ml).toContain('अङ्कितिनायि');

      const ta = indicToDevanagari('அங்கித் க்கான', 'ta');
      expect(ta).toContain('अङ्कित्');
    });

    it('transliterates Indic scripts to Roman phonetics for English/Indian-English voices (Heera/Ravi)', async () => {
      const { indicToRomanPhonetic } = await import('../src/tts/speechSynthesizer');

      // Punjabi: Gurmukhi -> Roman phonetics
      const paSpoken = indicToRomanPhonetic('ਅੰਕਿਤ ਲਈ WhatsApp ਖੋਲ੍ਹਿਆ ਗਿਆ। ਕਤਾਰ ਵਿੱਚ 2 ਬਾਕੀ ਹਨ।', 'pa');
      expect(paSpoken).toContain('WhatsApp');
      expect(paSpoken).toContain('layi');
      expect(paSpoken).toContain('kholya gaya');
      expect(paSpoken).toContain('kataar vich');
      expect(paSpoken).toContain('baaki han');
      // Must not contain Gurmukhi or Devanagari characters
      expect(/[\u0900-\u0D7F]/.test(paSpoken)).toBe(false);

      // Gujarati: Gujarati script -> Roman phonetics
      const guSpoken = indicToRomanPhonetic('અંકિત માટે WhatsApp ખુલ્યું. કતારમાં 2 બાકી છે।', 'gu');
      expect(guSpoken).toContain('WhatsApp');
      expect(guSpoken).toContain('maate');
      expect(guSpoken).toContain('khulyu');
      expect(guSpoken).toContain('baaki chhe');
      expect(/[\u0900-\u0D7F]/.test(guSpoken)).toBe(false);

      // Tamil: Tamil script -> Roman phonetics
      const taSpoken = indicToRomanPhonetic('அங்கித் க்காக WhatsApp திறக்கப்பட்டது. வரிசையில் 2 பேர் உள்ளனர்.', 'ta');
      expect(taSpoken).toContain('WhatsApp');
      expect(taSpoken).toContain('kkaaga');
      expect(taSpoken).toContain('thirakkappattathu');
      expect(taSpoken).toContain('varisaiyil');
      expect(/[\u0900-\u0D7F]/.test(taSpoken)).toBe(false);

      // Telugu: Telugu script -> Roman phonetics
      const teSpoken = indicToRomanPhonetic('అంకిత్ కోసం WhatsApp తెరవబడింది. క్యూలో 2 మంది మిగిలి ఉన్నారు.', 'te');
      expect(teSpoken).toContain('WhatsApp');
      expect(teSpoken).toContain('koraku');
      expect(teSpoken).toContain('theruvabadindi');
      expect(teSpoken).toContain('queue lo');
      expect(/[\u0900-\u0D7F]/.test(teSpoken)).toBe(false);

      // Hindi: Devanagari -> Roman phonetics
      const hiSpoken = indicToRomanPhonetic('अंकित के लिए WhatsApp खोला गया। कतार में 2 बाकी हैं।', 'hi');
      expect(hiSpoken).toContain('WhatsApp');
      expect(hiSpoken).toContain('ke liye');
      expect(hiSpoken).toContain('khola gaya');
      expect(hiSpoken).toContain('kataar mein');
      expect(hiSpoken).toContain('baaki hain');
      expect(/[\u0900-\u0D7F]/.test(hiSpoken)).toBe(false);
    });

    it('selects mode "roman" when client only has English/Indian-English voices installed', async () => {
      const { SpeechSynthesizer } = await import('../src/tts/speechSynthesizer');
      const synth = new SpeechSynthesizer();

      // Mock installed voices on Windows (Heera, Ravi, David, Zira - no Indic voices)
      const mockVoices = [
        { name: 'Microsoft Heera - English (India)', lang: 'en-IN' },
        { name: 'Microsoft Ravi - English (India)', lang: 'en-IN' },
        { name: 'Microsoft David - English (United States)', lang: 'en-US' },
        { name: 'Microsoft Zira - English (United States)', lang: 'en-US' },
      ] as SpeechSynthesisVoice[];

      (synth as any).loadVoices = () => mockVoices;

      const paRes = synth.resolveBestVoice('pa');
      expect(paRes.mode).toBe('roman');
      expect(paRes.voice?.name).toContain('Heera');

      const guRes = synth.resolveBestVoice('gu');
      expect(guRes.mode).toBe('roman');

      const taRes = synth.resolveBestVoice('ta');
      expect(taRes.mode).toBe('roman');

      const teRes = synth.resolveBestVoice('te');
      expect(teRes.mode).toBe('roman');

      const hiRes = synth.resolveBestVoice('hi');
      expect(hiRes.mode).toBe('roman');

      const enRes = synth.resolveBestVoice('en');
      expect(enRes.mode).toBe('native');
    });
  });
});

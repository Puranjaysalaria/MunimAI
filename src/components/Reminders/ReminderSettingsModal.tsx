import React, { useState } from 'react';
import {
  Shop,
  ReminderSettings,
  ReminderTone,
  ReminderSchedule,
  ReminderChannel,
  DEFAULT_REMINDER_SETTINGS,
} from '../../types/schema';
import { generateReminderMessage, generateUPILink } from '../../lib/reminderService';
import { LanguageCode, useI18n } from '../../i18n';
import {
  X,
  Sliders,
  Clock,
  ShieldCheck,
  CreditCard,
  Check,
  Sparkles,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { triggerHaptic } from '../../lib/sound';

interface ReminderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  onSave: (settings: ReminderSettings) => void;
}

export const ReminderSettingsModal: React.FC<ReminderSettingsModalProps> = ({
  isOpen,
  onClose,
  shop,
  onSave,
}) => {
  const { language } = useI18n();

  const currentSettings: ReminderSettings = {
    ...DEFAULT_REMINDER_SETTINGS,
    ...(shop.settings?.reminder_settings || {}),
  };

  const [threshold, setThreshold] = useState<number>(currentSettings.default_threshold);
  const [tone, setTone] = useState<ReminderTone>(currentSettings.message_tone);
  const [schedule, setSchedule] = useState<ReminderSchedule>(currentSettings.schedule);
  const [channel, setChannel] = useState<ReminderChannel>(currentSettings.send_channel);
  const [quietStart, setQuietStart] = useState<string>(currentSettings.quiet_hours_start);
  const [quietEnd, setQuietEnd] = useState<string>(currentSettings.quiet_hours_end);
  const [exemptHighTrust, setExemptHighTrust] = useState<boolean>(currentSettings.auto_filter_high_trust);
  const [includeUpiLink, setIncludeUpiLink] = useState<boolean>(currentSettings.include_upi_link);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  if (!isOpen) return null;

  const thresholdPresets = [500, 1000, 2000, 5000];

  // Dynamic preview message
  const previewUpiLink =
    includeUpiLink && shop.upi_id?.trim()
      ? generateUPILink(shop.upi_id, shop.name || 'Sharma Kirana', 1450)
      : null;

  const previewMessage = generateReminderMessage({
    customerName: language === 'en' ? 'Ramesh Kumar' : 'रमेश कुमार',
    amount: 1450,
    shopName: shop.name || (language === 'en' ? 'Sharma Kirana' : 'शर्मा किराना स्टोर'),
    upiLink: previewUpiLink,
    language: (language as LanguageCode) || 'hi',
    tone,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('success');
    const updatedSettings: ReminderSettings = {
      default_threshold: Math.max(1, Number(threshold) || 1000),
      message_tone: tone,
      send_channel: channel,
      schedule,
      quiet_hours_start: quietStart,
      quiet_hours_end: quietEnd,
      auto_filter_high_trust: exemptHighTrust,
      include_upi_link: includeUpiLink,
    };
    onSave(updatedSettings);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-app-text">
                {language === 'en' ? 'Reminder Settings' : language === 'pa' ? 'ਯਾਦ-ਪੱਤਰ ਸੈਟਿੰਗਾਂ' : 'तगादा व रिमाइंडर सेटिंग्स'}
              </h2>
              <p className="text-xs text-app-muted">
                {language === 'en'
                  ? 'Configure recovery rules, tone & safe dispatch'
                  : language === 'pa'
                  ? 'ਉਧਾਰੀ ਰਿਕਵਰੀ ਨਿਯਮ, ਲਹਿਜ਼ਾ ਅਤੇ ਸੁਰੱਖਿਅਤ ਸਮਾਂ'
                  : 'उधारी वसूली के नियम, संदेश का लहज़ा और समय'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="touch-target-64 p-2 text-gray-400 hover:text-gray-700 active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-5 py-4 pr-1">
          {/* Requirement 1: Explicit No-Auto-Send Safety Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start space-x-2.5 text-xs text-amber-900 shadow-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">
                {language === 'en'
                  ? 'Manual Shopkeeper Confirmation Required'
                  : language === 'pa'
                  ? 'ਦੁਕਾਨਦਾਰ ਦੀ ਪ੍ਰਵਾਨਗੀ ਲਾਜ਼ਮੀ ਹੈ'
                  : 'दुकानदार की पुष्टि अनिवार्य है (कोई ऑटो-सेंड नहीं)'}
              </p>
              <p className="mt-0.5 leading-relaxed text-amber-900">
                {language === 'en'
                  ? 'Schedule options only create an in-app prompt ("N reminders ready for review"). Messages are NEVER sent automatically without your explicit tap.'
                  : language === 'pa'
                  ? 'ਸਮਾਂ-ਸੂਚੀ ਸਿਰਫ਼ ਐਪ ਵਿੱਚ ਸਮੀਖਿਆ ਲਈ ਤਿਆਰ ਰਿਮਾਈਂਡਰ ਦਿਖਾਉਂਦੀ ਹੈ। ਤੁਹਾਡੇ ਵੱਲੋਂ ਬਟਨ ਦਬਾਏ ਬਿਨਾਂ ਕੋਈ ਵੀ ਸੁਨੇਹਾ ਆਪਣੇ ਆਪ ਨਹੀਂ ਭੇਜਿਆ ਜਾਂਦਾ।'
                  : 'शेड्यूल विकल्प केवल ऐप में समीक्षा कार्ड तैयार करते हैं ("N तगादे तैयार हैं")। आपके बटन दबाए बिना कोई भी संदेश अपने आप कभी नहीं भेजा जाता।'}
              </p>
            </div>
          </div>

          {/* Section 1: Minimum Due Threshold */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">
              {language === 'en'
                ? 'Minimum Balance Threshold'
                : language === 'pa'
                ? 'ਘੱਟੋ-ਘੱਟ ਬਕਾਇਆ ਸੀਮਾ'
                : 'न्यूनतम बकाया सीमा (थ्रेशोल्ड)'}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {thresholdPresets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setThreshold(amt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    threshold === amt
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">₹</span>
              <input
                type="number"
                min={1}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="1000"
              />
            </div>
            <p className="text-[11px] text-app-muted mt-1">
              {language === 'en'
                ? `Only customers owing ₹${threshold || 0} or more will be suggested for reminders.`
                : language === 'pa'
                ? `ਕੇਵਲ ₹${threshold || 0} ਜਾਂ ਵੱਧ ਬਕਾਇਆ ਵਾਲੇ ਗਾਹਕਾਂ ਦੇ ਨਾਮ ਹੀ ਦਿਖਾਏ ਜਾਣਗੇ।`
                : `केवल ₹${threshold || 0} या अधिक बकाया वाले ग्राहक ही तगादा सूची में आएंगे।`}
            </p>
          </div>

          {/* Section 2: Tone Selection with "Firm (दृढ़)" */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">
              {language === 'en' ? 'Default Reminder Tone' : language === 'pa' ? 'ਯਾਦ-ਪੱਤਰ ਦਾ ਲਹਿਜ਼ਾ' : 'तगादा का लहज़ा (टोन)'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'polite', labelEn: 'Polite', labelHi: 'Polite (विनम्र)', desc: 'Friendly & soft' },
                  { id: 'standard', labelEn: 'Standard', labelHi: 'Standard (सामान्य)', desc: 'Clear & regular' },
                  { id: 'firm', labelEn: 'Firm (दृढ़)', labelHi: 'Firm (दृढ़)', desc: 'Factual & respectful' },
                ] as const
              ).map((tOpt) => (
                <button
                  key={tOpt.id}
                  type="button"
                  onClick={() => setTone(tOpt.id)}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                    tone === tOpt.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 bg-surface text-app-text hover:bg-gray-50'
                  }`}
                >
                  <p className="font-bold text-xs">
                    {language === 'en' ? tOpt.labelEn : tOpt.labelHi}
                  </p>
                  <p className="text-[10px] text-app-muted mt-0.5">{tOpt.desc}</p>
                </button>
              ))}
            </div>

            {/* Live Message Preview */}
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-2xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted flex items-center">
                  <Sparkles className="w-3 h-3 mr-1 text-primary" />
                  {language === 'en' ? 'Live Message Preview' : language === 'pa' ? 'ਸੁਨੇਹਾ ਪੂਰਵਦਰਸ਼ਨ' : 'मैसेज का लाइव प्रीव्यू'}
                </span>
                <span className="text-[10px] font-mono text-gray-500">
                  {tone === 'firm' ? 'Firm (दृढ़)' : tone === 'polite' ? 'Polite' : 'Standard'}
                </span>
              </div>
              <p className="text-xs text-app-text whitespace-pre-wrap leading-relaxed font-sans bg-white p-2.5 rounded-xl border border-gray-100">
                {previewMessage}
              </p>
              <p className="text-[10px] text-app-muted mt-1.5 italic">
                {language === 'en'
                  ? 'Note: Per-customer tone override takes priority if set on customer profile.'
                  : language === 'pa'
                  ? 'ਨੋਟ: ਗਾਹਕ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚ ਚੁਣਿਆ ਵੱਖਰਾ ਲਹਿਜ਼ਾ ਇਸ ਉੱਤੇ ਪਹਿਲ ਲਵੇਗਾ।'
                  : 'नोट: ग्राहक प्रोफ़ाइल में चुना गया विशिष्ट लहज़ा इस मुख्य सेटिंग से पहले लागू होगा।'}
              </p>
            </div>
          </div>

          {/* Section 3: Channel Selection (WhatsApp first, SMS fallback) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">
              {language === 'en' ? 'Primary Channel' : language === 'pa' ? 'ਭੇਜਣ ਦਾ ਤਰੀਕਾ' : 'मैसेज भेजने का माध्यम'}
            </label>
            <div className="space-y-2">
              {(
                [
                  {
                    id: 'whatsapp_first_sms_fallback',
                    title: language === 'en' ? 'WhatsApp first, SMS fallback' : language === 'pa' ? 'WhatsApp ਪਹਿਲਾਂ, SMS ਬਦਲ' : 'WhatsApp पहले, SMS विकल्प',
                    badge: language === 'en' ? 'Recommended' : language === 'pa' ? 'ਸਿਫ਼ਾਰਿਸ਼ ਕੀਤਾ' : 'अनुशंसित',
                    desc: language === 'en'
                      ? 'Sends via WhatsApp primary; SMS available as fallback. Never sends twice.'
                      : language === 'pa'
                      ? 'ਪਹਿਲਾਂ WhatsApp ਰਾਹੀਂ; SMS ਬਦਲ ਵਜੋਂ ਉਪਲਬਧ। ਕਦੇ ਵੀ ਦੋ ਵਾਰ ਨਹੀਂ ਭੇਜਿਆ ਜਾਂਦਾ।'
                      : 'पहले WhatsApp खुलेगा; ज़रूरत पड़ने पर SMS। कभी दोहरा मैसेज नहीं जाता।',
                  },
                  {
                    id: 'whatsapp',
                    title: 'WhatsApp Only',
                    badge: null,
                    desc: language === 'en' ? 'Dispatch exclusively via WhatsApp' : language === 'pa' ? 'ਸਿਰਫ਼ WhatsApp' : 'केवल WhatsApp द्वारा भेजें',
                  },
                  {
                    id: 'sms',
                    title: 'SMS Only',
                    badge: null,
                    desc: language === 'en' ? 'Dispatch exclusively via native SMS' : language === 'pa' ? 'ਸਿਰਫ਼ SMS' : 'केवल सामान्य SMS द्वारा भेजें',
                  },
                ] as const
              ).map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannel(ch.id)}
                  className={`w-full p-3 rounded-2xl border-2 text-left flex items-start justify-between transition-all ${
                    channel === ch.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 bg-surface text-app-text hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-xs">{ch.title}</span>
                      {ch.badge && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          {ch.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-app-muted mt-0.5">{ch.desc}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                      channel === ch.id ? 'border-primary bg-primary' : 'border-gray-300'
                    }`}
                  >
                    {channel === ch.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Schedule Frequency Prompt */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-primary" />
              {language === 'en' ? 'Review Schedule (In-App Prompts Only)' : language === 'pa' ? 'ਸਮੀਖਿਆ ਸਮਾਂ-ਸੂਚੀ' : 'समीक्षा शेड्यूल (केवल इन-ऐप प्रॉम्प्ट)'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  { id: 'manual', label: language === 'en' ? 'Manual (When needed)' : language === 'pa' ? 'ਮੈਨੂਅਲ (ਜਦੋਂ ਲੋੜ ਹੋਵੇ)' : 'मैन्युअल (जब ज़रूरत हो)' },
                  { id: 'weekly_sunday', label: language === 'en' ? 'Weekly (Sundays)' : language === 'pa' ? 'ਹਰ ਐਤਵਾਰ' : 'हर रविवार (साप्ताहिक)' },
                  { id: 'biweekly', label: language === 'en' ? 'Twice a Month' : language === 'pa' ? 'ਮਹੀਨੇ ਵਿੱਚ ਦੋ ਵਾਰ' : 'महीने में 2 बार (15 दिन)' },
                  { id: 'monthly_1st', label: language === 'en' ? 'Monthly (1st)' : language === 'pa' ? 'ਹਰ ਮਹੀਨੇ 1 ਤਾਰੀਖ' : 'हर महीने की 1 तारीख' },
                  { id: 'overdue_15d', label: language === 'en' ? 'Overdue 15+ Days' : language === 'pa' ? '15+ ਦਿਨ ਪੁਰਾਣਾ ਬਕਾਇਆ' : '15+ दिन से लंबित उधारी' },
                ] as const
              ).map((sch) => (
                <button
                  key={sch.id}
                  type="button"
                  onClick={() => setSchedule(sch.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    schedule === sch.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {sch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Quiet Hours */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs font-bold text-app-text">
                  {language === 'en' ? 'Quiet Hours Protection' : language === 'pa' ? 'ਸ਼ਾਂਤ ਸਮਾਂ (ਕੋਈ ਤਗਾਦਾ ਨਹੀਂ)' : 'शांत समय सुरक्षा (नो-डिस्टर्ब)'}
                </p>
                <p className="text-[11px] text-app-muted">
                  {language === 'en'
                    ? 'Disables dispatch late at night or early morning'
                    : language === 'pa'
                    ? 'ਰਾਤ ਵੇਲੇ ਜਾਂ ਸਵੇਰੇ ਸੁਨੇਹਾ ਭੇਜਣ ਤੋਂ ਰੋਕਦਾ ਹੈ'
                    : 'देर रात या अलसुबह तगादा भेजने से रोकता है'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  {language === 'en' ? 'Start (e.g. 21:00 / 9 PM)' : language === 'pa' ? 'ਸ਼ੁਰੂ (ਰਾਤ 9 ਵਜੇ)' : 'प्रारंभ (रात 9 बजे)'}
                </label>
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  {language === 'en' ? 'End (e.g. 08:00 / 8 AM)' : language === 'pa' ? 'ਸਮਾਪਤ (ਸਵੇਰੇ 8 ਵਜੇ)' : 'समाप्त (सुबह 8 बजे)'}
                </label>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 6: VIP High-Trust Exemption Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-2xl">
            <div className="pr-2">
              <p className="text-xs font-bold text-app-text flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                {language === 'en' ? 'Exempt High-Trust VIPs (Score ≥ 90)' : language === 'pa' ? 'ਭਰੋਸੇਮੰਦ VIP ਗਾਹਕਾਂ ਨੂੰ ਛੋਟ (ਸਕੋਰ ≥ 90)' : 'विश्वसनीय VIP ग्राहकों को छूट (स्कोर ≥ 90)'}
              </p>
              <p className="text-[11px] text-app-muted mt-0.5">
                {language === 'en'
                  ? 'Exempts trusted regulars with score 90+. Customers with no score are never exempt.'
                  : language === 'pa'
                  ? '90+ ਸਕੋਰ ਵਾਲੇ ਭਰੋਸੇਯੋਗ ਗਾਹਕਾਂ ਨੂੰ ਛੋਟ। ਜਿਨ੍ਹਾਂ ਦਾ ਸਕੋਰ ਨਹੀਂ ਹੈ, ਉਹ ਛੋਟ ਦੇ ਯੋਗ ਨਹੀਂ ਹਨ।'
                  : '90+ स्कोर वाले नियमित ग्राहकों को तगादा सूची से अलग रखता है। बिना स्कोर वाले ग्राहकों को छूट नहीं मिलती।'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExemptHighTrust(!exemptHighTrust)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                exemptHighTrust ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  exemptHighTrust ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Section 7: UPI Payment Link Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-2xl">
            <div className="pr-2">
              <p className="text-xs font-bold text-app-text flex items-center">
                <CreditCard className="w-4 h-4 mr-1.5 text-primary" />
                {language === 'en' ? 'Include Instant UPI Payment Link' : language === 'pa' ? 'ਤੁਰੰਤ UPI ਭੁਗਤਾਨ ਲਿੰਕ ਸ਼ਾਮਲ ਕਰੋ' : 'तुरंत UPI भुगतान लिंक शामिल करें'}
              </p>
              <div className="text-[11px] text-app-muted mt-0.5">
                {shop.upi_id?.trim() ? (
                  <span>
                    {language === 'en' ? 'Using shop UPI: ' : language === 'pa' ? 'ਦੁਕਾਨ ਦੀ UPI: ' : 'दुकान का UPI: '}
                    <span className="font-mono font-bold text-primary">{shop.upi_id}</span>
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold">
                    {language === 'en'
                      ? '⚠️ No shop UPI ID configured yet (messages will omit link)'
                      : language === 'pa'
                      ? '⚠️ ਕੋਈ UPI ID ਦਰਜ ਨਹੀਂ ਹੈ'
                      : '⚠️ दुकान की UPI ID सेट नहीं है (बिना लिंक वाला संदेश जाएगा)'}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIncludeUpiLink(!includeUpiLink)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                includeUpiLink ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  includeUpiLink ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="touch-target-64 w-full bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              {savedNotice ? (
                <>
                  <Check className="w-5 h-5 text-accent" />
                  <span>{language === 'en' ? 'Settings Saved!' : language === 'pa' ? 'ਸੈਟਿੰਗਾਂ ਸੁਰੱਖਿਅਤ ਕੀਤੀਆਂ ਗਈਆਂ!' : 'सेटिंग्स सहेज ली गईं!'}</span>
                </>
              ) : (
                <span>{language === 'en' ? 'Save Reminder Settings' : language === 'pa' ? 'ਸੈਟਿੰਗਾਂ ਸੇਵ ਕਰੋ' : 'तगादा सेटिंग्स सहेजें'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

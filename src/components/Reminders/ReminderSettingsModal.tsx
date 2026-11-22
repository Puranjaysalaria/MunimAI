import React, { useState } from 'react';
import {
  Shop,
  ReminderSettings,
  ReminderTone,
  ReminderSchedule,
  ReminderChannel,
  DEFAULT_REMINDER_SETTINGS,
} from '../../types/schema';
import { generateReminderMessage, generatePaymentPageLink } from '../../lib/reminderService';
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
  const { t, language } = useI18n();

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
  const previewPaymentUrl =
    includeUpiLink && shop.upi_id?.trim()
      ? generatePaymentPageLink({
          upiId: shop.upi_id,
          shopName: shop.name || 'Sharma Kirana',
          amount: 1450,
          language: (language as LanguageCode) || 'hi',
        })
      : null;

  const previewMessage = generateReminderMessage({
    customerName: language === 'en' ? 'Ramesh Kumar' : language === 'pa' ? 'ਰਮੇਸ਼ ਕੁਮਾਰ' : 'रमेश कुमार',
    amount: 1450,
    shopName: shop.name || (language === 'en' ? 'Sharma Kirana' : language === 'pa' ? 'ਸ਼ਰਮਾ ਕਿਰਾਨਾ ਸਟੋਰ' : 'शर्मा किराना स्टोर'),
    upiId: includeUpiLink ? shop.upi_id : null,
    upiLink: previewPaymentUrl,
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

  const toneOptions = [
    {
      id: 'polite' as const,
      label: t.reminders.tonePoliteLabel || 'Polite',
      desc: t.reminders.tonePoliteDesc || 'Friendly & soft',
    },
    {
      id: 'standard' as const,
      label: t.reminders.toneStandardLabel || 'Standard',
      desc: t.reminders.toneStandardDesc || 'Clear & regular',
    },
    {
      id: 'firm' as const,
      label: t.reminders.toneFirmLabel || 'Firm (दृढ़)',
      desc: t.reminders.toneFirmDesc || 'Factual & respectful',
    },
  ];

  const channelOptions = [
    {
      id: 'whatsapp_first_sms_fallback' as const,
      title: t.reminders.channelWhatsAppSms || 'WhatsApp first, SMS fallback',
      badge: t.reminders.recommendedBadge || 'Recommended',
      desc: t.reminders.channelWhatsAppSmsDesc || 'Sends via WhatsApp primary; SMS available as fallback. Never sends twice.',
    },
    {
      id: 'whatsapp' as const,
      title: t.reminders.channelWhatsAppOnly || 'WhatsApp Only',
      badge: null,
      desc: t.reminders.channelWhatsAppOnlyDesc || 'Dispatch exclusively via WhatsApp',
    },
    {
      id: 'sms' as const,
      title: t.reminders.channelSmsOnly || 'SMS Only',
      badge: null,
      desc: t.reminders.channelSmsOnlyDesc || 'Dispatch exclusively via native SMS',
    },
  ];

  const scheduleOptions = [
    { id: 'manual' as const, label: t.reminders.scheduleManual || 'Manual (When needed)' },
    { id: 'weekly_sunday' as const, label: t.reminders.scheduleWeekly || 'Weekly (Sundays)' },
    { id: 'biweekly' as const, label: t.reminders.scheduleBiweekly || 'Twice a Month' },
    { id: 'monthly_1st' as const, label: t.reminders.scheduleMonthly || 'Monthly (1st)' },
    { id: 'overdue_15d' as const, label: t.reminders.scheduleOverdue15d || 'Overdue 15+ Days' },
  ];

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
                {t.reminders.settingsTitle || 'Reminder Settings'}
              </h2>
              <p className="text-xs text-app-muted">
                {t.reminders.settingsSub || 'Configure recovery rules, tone & safe dispatch'}
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
                {t.reminders.noAutoSendDisclaimerTitle || 'Manual Shopkeeper Confirmation Required'}
              </p>
              <p className="mt-0.5 leading-relaxed text-amber-900">
                {t.reminders.noAutoSendDisclaimerDesc || 'Schedule options only create an in-app prompt ("N reminders ready for review"). Messages are NEVER sent automatically without your explicit tap.'}
              </p>
            </div>
          </div>

          {/* Section 1: Minimum Due Threshold */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">
              {t.reminders.minThresholdLabel || 'Minimum Balance Threshold'}
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
              {(t.reminders.thresholdDesc || 'Only customers owing ₹{amount} or more will be suggested for reminders.')
                .replace('{amount}', String(threshold || 0))}
            </p>
          </div>

          {/* Section 2: Tone Selection with "Firm (दृढ़)" */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">
              {t.reminders.toneLabel || 'Default Reminder Tone'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {toneOptions.map((tOpt) => (
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
                  <p className="font-bold text-xs">{tOpt.label}</p>
                  <p className="text-[10px] text-app-muted mt-0.5">{tOpt.desc}</p>
                </button>
              ))}
            </div>

            {/* Live Message Preview */}
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-2xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted flex items-center">
                  <Sparkles className="w-3 h-3 mr-1 text-primary" />
                  {t.reminders.livePreviewLabel || 'Live Message Preview'}
                </span>
                <span className="text-[10px] font-mono text-gray-500">
                  {tone === 'firm'
                    ? (t.reminders.toneFirmLabel || 'Firm (दृढ़)')
                    : tone === 'polite'
                    ? (t.reminders.tonePoliteLabel || 'Polite')
                    : (t.reminders.toneStandardLabel || 'Standard')}
                </span>
              </div>
              <p className="text-xs text-app-text whitespace-pre-wrap break-words [word-break:break-word] leading-relaxed font-sans bg-white p-3 rounded-xl border border-gray-100">
                {previewMessage}
              </p>
              <p className="text-[10px] text-app-muted mt-1.5 italic">
                {t.reminders.toneOverrideNote || 'Note: Per-customer tone override takes priority if set on customer profile.'}
              </p>
            </div>
          </div>

          {/* Section 3: Channel Selection (WhatsApp first, SMS fallback) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2">
              {t.reminders.channelLabel || 'Primary Channel'}
            </label>
            <div className="space-y-2">
              {channelOptions.map((ch) => (
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
              {t.reminders.scheduleLabel || 'Review Schedule (In-App Prompts Only)'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scheduleOptions.map((sch) => (
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
                  {t.reminders.quietHoursTitle || 'Quiet Hours Protection'}
                </p>
                <p className="text-[11px] text-app-muted">
                  {t.reminders.quietHoursSub || 'Disables dispatch late at night or early morning'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  {t.reminders.quietHoursStartLabel || 'Start (e.g. 21:00 / 9 PM)'}
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
                  {t.reminders.quietHoursEndLabel || 'End (e.g. 08:00 / 8 AM)'}
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
                {t.reminders.vipExemptLabel || 'Exempt High-Trust VIPs (Score ≥ 90)'}
              </p>
              <p className="text-[11px] text-app-muted mt-0.5">
                {t.reminders.vipExemptSub || 'Exempts trusted regulars with score 90+. Customers with no score are never exempt.'}
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
                {t.reminders.upiToggleLabel || 'Include Instant UPI Payment Link'}
              </p>
              <div className="text-[11px] text-app-muted mt-0.5">
                {shop.upi_id?.trim() ? (
                  <span>
                    {t.reminders.upiUsingShop || 'Using shop UPI: '}
                    <span className="font-mono font-bold text-primary">{shop.upi_id}</span>
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold">
                    {t.reminders.upiMissingNotice || '⚠️ No shop UPI ID configured yet (messages will omit link)'}
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
                  <span>{t.reminders.settingsSavedNotice || 'Settings Saved!'}</span>
                </>
              ) : (
                <span>{t.reminders.saveSettingsBtn || 'Save Reminder Settings'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

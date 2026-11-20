import React, { useState } from 'react';
import { Customer, ReminderTone, Shop, DEFAULT_REMINDER_SETTINGS } from '../../types/schema';
import { DraftReminder, buildDraftReminders, isQuietHours } from '../../lib/reminderService';
import { getLocalizedCustomerName } from '../../lib/nameTranslation';
import { formatINR } from '../../lib/utils';
import { triggerHaptic, playAudioCue } from '../../lib/sound';
import { speechSynthesizer } from '../../tts/speechSynthesizer';
import { LanguageCode, useI18n } from '../../i18n';
import {
  X,
  Bell,
  MessageCircle,
  Share2,
  CheckCircle,
  Phone,
  Send,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Sliders,
  Clock,
  BellOff,
  RotateCw,
  ArrowRight,
} from 'lucide-react';

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  shop: Shop;
  thresholdAmount?: number;
  language: LanguageCode;
  onReminderSent?: (reminder: DraftReminder) => void;
  onOpenSettings?: () => void;
  onUpdateCustomer?: (customerId: string, updates: Partial<Customer>) => void;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  isOpen,
  onClose,
  customers,
  shop,
  thresholdAmount,
  language,
  onReminderSent,
  onOpenSettings,
  onUpdateCustomer,
}) => {
  const { t } = useI18n();
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reminderSettings = {
    ...DEFAULT_REMINDER_SETTINGS,
    ...(shop.settings?.reminder_settings || {}),
  };

  const effectiveThreshold =
    thresholdAmount !== undefined ? thresholdAmount : reminderSettings.default_threshold;

  const now = new Date();
  const inQuietHours = isQuietHours(
    now,
    reminderSettings.quiet_hours_start,
    reminderSettings.quiet_hours_end
  );

  const draftReminders = React.useMemo(() => {
    return buildDraftReminders(customers, shop, effectiveThreshold, undefined, now);
  }, [customers, shop, effectiveThreshold]);

  if (!isOpen) return null;

  // Filter actionable customers (not yet sent today, and reminders not paused)
  const actionableReminders = draftReminders.filter(
    (d) => !sentMap[d.customer.id] && !d.isSentToday && !d.isDoNotRemind
  );

  const sentCount = draftReminders.filter(
    (d) => Boolean(sentMap[d.customer.id] || d.isSentToday)
  ).length;

  const totalCount = draftReminders.length;

  // Total recoverable amount remains steady across eligible customers; it only decreases when payment is recorded by owner
  const totalOwed = draftReminders.reduce((sum, d) => sum + Number(d.amount), 0);

  const markCustomerReminded = (draft: DraftReminder) => {
    setSentMap((prev) => ({ ...prev, [draft.customer.id]: true }));
    const nowIso = new Date().toISOString();
    if (onUpdateCustomer) {
      onUpdateCustomer(draft.customer.id, { last_reminded_at: nowIso });
    }
    if (onReminderSent) {
      onReminderSent({
        ...draft,
        isSentToday: true,
      });
    }
  };

  // Single customer send via WhatsApp (with voice confirmation)
  const handleSendWhatsApp = (draft: DraftReminder, fromQueue: boolean = false) => {
    triggerHaptic('start');
    playAudioCue('success');

    const customerLocalized = getLocalizedCustomerName(draft.customer.name, language);

    // Provide voice confirmation feedback when triggered individually (matching queue voice)
    if (!fromQueue) {
      const remainingAfterThis = actionableReminders.filter(
        (d) => d.customer.id !== draft.customer.id
      ).length;
      const confirmVoice =
        remainingAfterThis > 0
          ? (t.reminders.queueNextVoice || 'Opening WhatsApp for {name}. {remaining} remaining.')
              .replace('{name}', customerLocalized)
              .replace('{remaining}', String(remainingAfterThis))
          : (t.reminders.queueCompleteVoice || 'Opening WhatsApp for {name}. All complete.')
              .replace('{name}', customerLocalized);
      speechSynthesizer.speak(confirmVoice, language);
    }

    const phone = draft.customer.phone?.replace(/[^0-9]/g, '') || '';
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(draft.messageText)}`;

    // Slight delay so the audio chime and voice speech initialize before window blur
    setTimeout(() => {
      window.open(url, '_blank');
    }, 350);

    markCustomerReminded(draft);
  };

  // Single customer send via SMS (fallback or direct, with voice confirmation)
  const handleSendSMS = (draft: DraftReminder) => {
    triggerHaptic('start');
    playAudioCue('success');

    const customerLocalized = getLocalizedCustomerName(draft.customer.name, language);
    const remainingAfterThis = actionableReminders.filter(
      (d) => d.customer.id !== draft.customer.id
    ).length;
    const confirmVoice =
      remainingAfterThis > 0
        ? (t.reminders.queueNextVoice || 'Opening SMS for {name}. {remaining} remaining.')
            .replace('{name}', customerLocalized)
            .replace('{remaining}', String(remainingAfterThis))
            .replace('WhatsApp', 'SMS')
        : (t.reminders.queueCompleteVoice || 'Opening SMS for {name}. All complete.')
            .replace('{name}', customerLocalized)
            .replace('WhatsApp', 'SMS');
    speechSynthesizer.speak(confirmVoice, language);

    const phone = draft.customer.phone?.replace(/[^0-9]/g, '') || '';
    const smsUrl = `sms:${phone}?body=${encodeURIComponent(draft.messageText)}`;

    setTimeout(() => {
      window.location.href = smsUrl;
    }, 350);

    markCustomerReminded(draft);
  };

  // Toggle per-customer "Do Not Remind" flag
  const handleToggleDoNotRemind = (draft: DraftReminder) => {
    triggerHaptic('start');
    const updatedVal = !draft.customer.do_not_remind;
    if (onUpdateCustomer) {
      onUpdateCustomer(draft.customer.id, { do_not_remind: updatedVal });
    }
  };

  // Cycle tone override: polite -> standard -> firm -> default (null)
  const handleCycleTone = (draft: DraftReminder) => {
    triggerHaptic('start');
    const current = draft.customer.reminder_tone_override;
    let next: ReminderTone | null = null;
    if (!current) next = 'polite';
    else if (current === 'polite') next = 'standard';
    else if (current === 'standard') next = 'firm';
    else next = null;

    if (onUpdateCustomer) {
      onUpdateCustomer(draft.customer.id, { reminder_tone_override: next });
    }
  };

  // Guided Queue Send: Dispatches the next pending customer in order
  const handleSendNextInQueue = () => {
    if (actionableReminders.length === 0) return;

    triggerHaptic('success');
    playAudioCue('success');

    const nextTarget = actionableReminders[0];
    const customerLocalized = getLocalizedCustomerName(nextTarget.customer.name, language);

    const remainingAfterThis = actionableReminders.length - 1;
    const confirmVoice =
      remainingAfterThis > 0
        ? (t.reminders.queueNextVoice || 'Opening WhatsApp for {name}. {remaining} remaining.')
            .replace('{name}', customerLocalized)
            .replace('{remaining}', String(remainingAfterThis))
        : (t.reminders.queueCompleteVoice || 'Opening WhatsApp for {name}. All complete.')
            .replace('{name}', customerLocalized);

    speechSynthesizer.speak(confirmVoice, language);
    handleSendWhatsApp(nextTarget, true);
  };

  const nextUpCustomer = actionableReminders[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface w-full max-w-md sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-red-100 text-owed">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-app-text">
                {t.reminders.title}
              </h2>
              <p className="text-xs text-app-muted">
                {t.reminders.eligibleCountSuffix
                  .replace('{amount}', String(effectiveThreshold))
                  .replace('{count}', String(totalCount))}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="touch-target-64 p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-xl transition-all active:scale-95"
                title="Reminder Settings"
                aria-label="Reminder Settings"
              >
                <Sliders className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="touch-target-64 p-2 text-gray-400 hover:text-gray-700 active:scale-95"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quiet Hours Warning Banner */}
        {inQuietHours && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 my-2 flex items-start space-x-2 text-xs text-amber-900 flex-shrink-0">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {(t.reminders.quietHoursActiveTitle || 'Quiet Hours Active ({start} - {end})')
                  .replace('{start}', reminderSettings.quiet_hours_start)
                  .replace('{end}', reminderSettings.quiet_hours_end)}
              </p>
              <p className="mt-0.5 text-amber-800 leading-snug">
                {t.reminders.quietHoursNotice || t.reminders.quietHoursActive}
              </p>
            </div>
          </div>
        )}

        {/* Hero Recovery Badge */}
        <div className="bg-red-50/60 border border-red-200 rounded-2xl p-3 my-2 flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-owed tracking-wider">
              {t.reminders.totalRecoverable}
            </span>
            <p className="text-2xl font-black text-owed mt-0.5">
              {formatINR(totalOwed)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs bg-white px-2.5 py-1 rounded-full font-bold text-gray-700 shadow-xs border border-gray-100">
              {sentCount}/{totalCount} {t.reminders.sentLabel}
            </span>
          </div>
        </div>

        {/* Customer Reminders List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
          {totalCount === 0 ? (
            <div className="text-center py-12 text-app-muted text-xs">
              {t.reminders.allSettled}
            </div>
          ) : (
            draftReminders.map((draft) => {
              const isSent = Boolean(sentMap[draft.customer.id] || draft.isSentToday);
              const isExpanded = expandedId === draft.customer.id;
              const isBlocked = Boolean(draft.isDoNotRemind);

              return (
                <div
                  key={draft.customer.id}
                  className={`bg-surface border rounded-2xl p-3.5 shadow-xs transition-all ${
                    isBlocked
                      ? 'border-gray-200 bg-gray-50/70 opacity-75'
                      : isSent
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Top Customer Info Row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="font-bold text-base text-app-text">
                          {getLocalizedCustomerName(draft.customer.name, language)}
                        </h4>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-mono font-bold bg-gray-100 text-gray-600">
                          {draft.language}
                        </span>

                        {/* Tone Override / Current Tone Badge */}
                        <button
                          type="button"
                          onClick={() => handleCycleTone(draft)}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center transition-all ${
                            draft.customer.reminder_tone_override
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Click to cycle tone override"
                        >
                          <RotateCw className="w-2.5 h-2.5 mr-1" />
                          {draft.tone === 'firm'
                            ? (t.reminders.toneFirmLabel || 'Firm (दृढ़)')
                            : draft.tone === 'standard'
                            ? (t.reminders.toneStandardLabel || 'Standard')
                            : (t.reminders.tonePoliteLabel || 'Polite')}
                          {draft.customer.reminder_tone_override && ' • Set'}
                        </button>

                        {/* VIP High-Trust Badge */}
                        {draft.customer.trust_score !== undefined &&
                          draft.customer.trust_score !== null &&
                          draft.customer.trust_score >= 90 && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                              ⭐ VIP {draft.customer.trust_score}
                            </span>
                          )}

                        {/* Daily Cap Sent Today Badge */}
                        {isSent && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full flex items-center">
                            <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                            {t.reminders.sentToday}
                          </span>
                        )}

                        {/* Do Not Remind Badge */}
                        {isBlocked && (
                          <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded-full flex items-center">
                            <BellOff className="w-2.5 h-2.5 mr-0.5" />
                            {t.reminders.doNotRemind}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-app-muted flex items-center mt-1">
                        <Phone className="w-3 h-3 mr-1 text-gray-400" />
                        {draft.customer.phone || t.reminders.noPhone}
                        {draft.customer.address_note && ` • ${draft.customer.address_note}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-owed">
                        {formatINR(draft.amount)}
                      </span>
                    </div>
                  </div>

                  {/* UPI Link indicator & Expand message */}
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-app-muted flex items-center">
                      <CreditCard className="w-3 h-3 mr-1 text-primary" />
                      {draft.upiLink ? t.reminders.upiIncluded : t.reminders.withoutUpiLink}
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleDoNotRemind(draft)}
                        className={`text-[11px] font-bold ${
                          isBlocked ? 'text-emerald-700 hover:underline' : 'text-gray-400 hover:text-owed'
                        }`}
                      >
                        {isBlocked ? t.reminders.resumeReminders : t.reminders.pauseReminders}
                      </button>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : draft.customer.id)}
                        className="text-primary font-bold text-xs flex items-center space-x-0.5"
                      >
                        <span>
                          {isExpanded ? t.reminders.hideMessage : t.reminders.viewMessage}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Message Preview */}
                  {isExpanded && (
                    <div className="mt-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono whitespace-pre-line text-gray-700">
                      {draft.messageText}
                    </div>
                  )}

                  {/* Quick Send Action Buttons (WhatsApp first, SMS fallback) */}
                  <div className="mt-3 flex items-center space-x-2">
                    {/* Primary Button: WhatsApp */}
                    {reminderSettings.send_channel !== 'sms' && (
                      <button
                        disabled={isBlocked}
                        onClick={() => handleSendWhatsApp(draft)}
                        className={`touch-target-64 flex-1 py-2 px-3 rounded-xl text-xs font-black shadow-xs active:scale-95 flex items-center justify-center space-x-1.5 ${
                          isBlocked
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : isSent
                            ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isSent ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-700" />
                            <span>{t.reminders.sentTodayTapToResend}</span>
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-4 h-4" />
                            <span>{t.reminders.sendWhatsApp}</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Secondary Fallback Button: SMS (Never sends twice) */}
                    {(reminderSettings.send_channel === 'whatsapp_first_sms_fallback' ||
                      reminderSettings.send_channel === 'sms') && (
                      <button
                        disabled={isBlocked}
                        onClick={() => handleSendSMS(draft)}
                        className={`touch-target-64 py-2 px-3 rounded-xl font-bold text-xs active:scale-95 flex items-center justify-center space-x-1 ${
                          reminderSettings.send_channel === 'sms'
                            ? 'flex-1 bg-primary text-white hover:bg-primary-dark shadow-xs'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        } ${isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                        title="SMS Fallback"
                      >
                        <Share2 className="w-4 h-4" />
                        {reminderSettings.send_channel === 'sms' && (
                          <span>{t.reminders.sendSmsButton}</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Actions: Guided Queue Dispatch */}
        {totalCount > 0 && (
          <div className="pt-3 border-t border-gray-100 mt-2 space-y-2 flex-shrink-0">
            {actionableReminders.length > 0 ? (
              <button
                onClick={handleSendNextInQueue}
                className="touch-target-64 w-full py-3 bg-accent hover:bg-accent-hover text-app-text font-black text-sm rounded-2xl shadow-md active:scale-95 flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>
                  {(t.reminders.dispatchNext || 'Dispatch Next: {name} ({amount})')
                    .replace('{name}', nextUpCustomer.customer.name)
                    .replace('{amount}', formatINR(nextUpCustomer.amount))}
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <div className="py-2.5 px-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                <p className="text-xs font-bold text-emerald-800 flex items-center justify-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>
                    {(t.reminders.allRemindersCompleted || 'All {count} reminders completed today!')
                      .replace('{count}', String(totalCount))}
                  </span>
                </p>
              </div>
            )}
            <p className="text-[11px] text-center text-app-muted">
              {t.reminders.manualNoticeFooter}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

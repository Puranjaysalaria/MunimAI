import React, { useState } from 'react';
import { Customer, Shop } from '../../types/schema';
import { DraftReminder, buildDraftReminders } from '../../lib/reminderService';
import { formatINR } from '../../lib/utils';
import { triggerHaptic, playAudioCue } from '../../lib/sound';
import { speechSynthesizer } from '../../tts/speechSynthesizer';
import { LanguageCode } from '../../i18n';
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
} from 'lucide-react';

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  shop: Shop;
  thresholdAmount?: number;
  language: LanguageCode;
  onReminderSent?: (reminder: DraftReminder) => void;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  isOpen,
  onClose,
  customers,
  shop,
  thresholdAmount = 1000,
  language,
  onReminderSent,
}) => {
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const draftReminders = React.useMemo(() => {
    return buildDraftReminders(customers, shop, thresholdAmount);
  }, [customers, shop, thresholdAmount]);

  if (!isOpen) return null;

  // Single customer send via WhatsApp
  const handleSendWhatsApp = (draft: DraftReminder) => {
    triggerHaptic('start');
    const phone = draft.customer.phone?.replace(/[^0-9]/g, '') || '';
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(draft.messageText)}`;
    window.open(url, '_blank');
    setSentMap((prev) => ({ ...prev, [draft.customer.id]: true }));
    if (onReminderSent) onReminderSent(draft);
  };

  // Single customer send via SMS
  const handleSendSMS = (draft: DraftReminder) => {
    triggerHaptic('start');
    const phone = draft.customer.phone?.replace(/[^0-9]/g, '') || '';
    const smsUrl = `sms:${phone}?body=${encodeURIComponent(draft.messageText)}`;
    window.location.href = smsUrl;
    setSentMap((prev) => ({ ...prev, [draft.customer.id]: true }));
    if (onReminderSent) onReminderSent(draft);
  };

  // Send to all (batch trigger)
  const handleSendAll = () => {
    triggerHaptic('success');
    playAudioCue('success');

    const newSentMap = { ...sentMap };
    draftReminders.forEach((d) => {
      newSentMap[d.customer.id] = true;
      if (onReminderSent) onReminderSent(d);
    });
    setSentMap(newSentMap);

    // Speak confirmation
    const confirmVoice =
      language === 'pa'
        ? `ਕੁੱਲ ${draftReminders.length} ਗਾਹਕਾਂ ਨੂੰ ਯਾਦ-ਪੱਤਰ ਭੇਜ ਦਿੱਤਾ ਗਿਆ ਹੈ`
        : `कुल ${draftReminders.length} ग्राहकों को तगादा मैसेज भेज दिया गया है`;
    speechSynthesizer.speak(confirmVoice, language);

    // If on first customer, open WhatsApp for quick dispatch
    if (draftReminders.length > 0) {
      handleSendWhatsApp(draftReminders[0]);
    }
  };

  const totalOwed = draftReminders.reduce((sum, d) => sum + Number(d.amount), 0);
  const sentCount = Object.keys(sentMap).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-0 sm:p-4">
      <div className="bg-surface w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-red-100 text-owed">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-app-text">
                उधार तगादा (Reminders)
              </h2>
              <p className="text-xs text-app-muted">
                ₹{thresholdAmount} से अधिक बाकी वाले {draftReminders.length} ग्राहक
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

        {/* Hero Badge */}
        <div className="bg-red-50/60 border border-red-200 rounded-2xl p-3 my-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-owed tracking-wider">
              कुल वसूली योग्य रकम
            </span>
            <p className="text-2xl font-black text-owed mt-0.5">
              {formatINR(totalOwed)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs bg-white px-2.5 py-1 rounded-full font-bold text-gray-700 shadow-xs">
              {sentCount}/{draftReminders.length} भेजे गए
            </span>
          </div>
        </div>

        {/* Customer Reminders List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {draftReminders.length === 0 ? (
            <div className="text-center py-12 text-app-muted text-xs">
              ₹{thresholdAmount} से अधिक किसी ग्राहक का उधार बाकी नहीं है। बहुत बढ़िया!
            </div>
          ) : (
            draftReminders.map((draft) => {
              const isSent = sentMap[draft.customer.id];
              const isExpanded = expandedId === draft.customer.id;

              return (
                <div
                  key={draft.customer.id}
                  className={`bg-surface border rounded-2xl p-3.5 shadow-xs transition-all ${
                    isSent ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h4 className="font-bold text-base text-app-text">
                          {draft.customer.name}
                        </h4>
                        <span className="text-[10px] uppercase px-1.5 py-0.2 rounded font-mono font-bold bg-gray-100 text-gray-600">
                          {draft.language}
                        </span>
                      </div>
                      <p className="text-xs text-app-muted flex items-center mt-0.5">
                        <Phone className="w-3 h-3 mr-1 text-gray-400" />
                        {draft.customer.phone || 'फोन नंबर नहीं है'}
                        {draft.customer.address_note && ` • ${draft.customer.address_note}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-owed">
                        {formatINR(draft.amount)}
                      </span>
                    </div>
                  </div>

                  {/* UPI Link indicator */}
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-app-muted flex items-center">
                      <CreditCard className="w-3 h-3 mr-1 text-primary" />
                      UPI लिंक संलग्न है
                    </span>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : draft.customer.id)}
                      className="text-primary font-bold text-xs flex items-center space-x-0.5"
                    >
                      <span>{isExpanded ? 'संदेश छुपाएं' : 'संदेश देखें'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Message Preview */}
                  {isExpanded && (
                    <div className="mt-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono whitespace-pre-line text-gray-700">
                      {draft.messageText}
                    </div>
                  )}

                  {/* Quick Send Action Buttons */}
                  <div className="mt-3 flex items-center space-x-2">
                    <button
                      onClick={() => handleSendWhatsApp(draft)}
                      className={`touch-target-64 flex-1 py-2 px-3 rounded-xl text-xs font-black shadow-xs active:scale-95 flex items-center justify-center space-x-1.5 ${
                        isSent
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isSent ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-700" />
                          <span>भेज दिया गया</span>
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp पर भेजें</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleSendSMS(draft)}
                      className="touch-target-64 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs active:scale-95 flex items-center justify-center"
                      title="SMS भेजें"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Actions */}
        {draftReminders.length > 0 && (
          <div className="pt-3 border-t border-gray-100 mt-2 space-y-2">
            <button
              onClick={handleSendAll}
              className="touch-target-64 w-full py-3 bg-accent hover:bg-accent-hover text-app-text font-black text-sm rounded-2xl shadow-md active:scale-95 flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>सभी {draftReminders.length} ग्राहकों को भेजें (Send All)</span>
            </button>
            <p className="text-[11px] text-center text-app-muted">
              आवाज़ से भेजने के लिए बोलें: <strong>"भेज दो"</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

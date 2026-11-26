import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X, RotateCcw } from 'lucide-react';
import { Customer, Transaction } from '../../types/schema';
import { LanguageCode } from '../../i18n/types';
import { formatINR } from '../../lib/utils';
import { speechSynthesizer } from '../../tts/speechSynthesizer';
import { createSTTProvider, STTProvider } from '../../stt';
import { triggerHaptic, playAudioCue } from '../../lib/sound';

interface UndoConfirmModalProps {
  transaction: Transaction | null;
  customers: Customer[];
  language: LanguageCode;
  onConfirm: () => void;
  onCancel: () => void;
}

export const UndoConfirmModal: React.FC<UndoConfirmModalProps> = ({
  transaction,
  customers,
  language,
  onConfirm,
  onCancel,
}) => {
  const sttRef = useRef<STTProvider | null>(null);

  useEffect(() => {
    if (!transaction) {
      if (sttRef.current) {
        try { sttRef.current.stopListening(); } catch {}
        sttRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const typeLabel =
      transaction.type === 'sale'
        ? language === 'en' ? 'sale' : 'नकद बिक्री'
        : transaction.type === 'credit'
        ? language === 'en' ? 'credit' : 'उधार'
        : transaction.type === 'payment'
        ? language === 'en' ? 'payment' : 'जमा'
        : language === 'en' ? 'expense' : 'खर्च';

    const warningMsg =
      language === 'en'
        ? `Warning: Are you sure you want to undo the ${typeLabel} transaction of ₹${transaction.amount}? Say Yes to confirm or Cancel.`
        : language === 'pa'
        ? `ਚੇਤਾਵਨੀ: ਕੀ ਤੁਸੀਂ ₹${transaction.amount} ਦਾ ${typeLabel} ਸੌਦਾ ਵਾਪਸ ਲੈਣਾ ਚਾਹੁੰਦੇ ਹੋ? ਪੁਸ਼ਟੀ ਲਈ ਹਾਂ ਕਹੋ।`
        : `सावधान: क्या आप ₹${transaction.amount} का ${typeLabel} लेन-देन वापस लेना चाहते हैं? पुष्टि के लिए हाँ बोलें या दबाएँ।`;

    speechSynthesizer.speak(warningMsg, language).then(() => {
      if (cancelled) return;
      const provider = createSTTProvider(undefined, { language, cloudSpeechEnabled: true });
      if (!provider.isSupported) return;
      sttRef.current = provider;
      provider.startListening(
        { language, continuous: false, interimResults: false },
        {
          onResult: (res) => {
            if (!res.isFinal) return;
            const lower = res.transcript.trim().toLowerCase();
            if (/\b(yes|haan|ha|confirm|undo|ok|theek|sure|remove|delete)\b/i.test(lower) || /(हाँ|ठीक|ਹਾਂ)/.test(res.transcript)) {
              onConfirm();
            } else if (/\b(no|nahi|cancel|keep|stop)\b/i.test(lower) || /(नहीं|रद्द|ਨਹੀਂ)/.test(res.transcript)) {
              onCancel();
            }
          },
          onError: () => {},
          onStateChange: () => {},
        }
      );
    });

    return () => {
      cancelled = true;
      if (sttRef.current) {
        try { sttRef.current.stopListening(); } catch {}
        sttRef.current = null;
      }
    };
  }, [transaction?.id, language]);

  if (!transaction) return null;

  const customerName = transaction.customer_id
    ? customers.find((c) => c.id === transaction.customer_id)?.name
    : undefined;

  const typeBadge =
    transaction.type === 'sale'
      ? 'Cash Sale'
      : transaction.type === 'credit'
      ? 'Credit (Udhaar)'
      : transaction.type === 'payment'
      ? 'Payment Received'
      : 'Expense';

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-rose-200 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-app-text">
                {language === 'en'
                  ? 'Confirm Undo Transaction?'
                  : language === 'pa'
                  ? 'ਸੌਦਾ ਵਾਪਸ ਲੈਣਾ ਹੈ?'
                  : 'लेन-देन वापस लेना है?'}
              </h3>
              <p className="text-xs text-rose-700 font-semibold">
                {language === 'en'
                  ? 'This will reverse the entry and update balances.'
                  : 'यह एंट्री हटाकर बैलेंस और स्टॉक वापस कर देगा।'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              speechSynthesizer.stop();
              onCancel();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>{typeBadge}</span>
            <span>{new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="text-2xl font-black text-rose-700">{formatINR(transaction.amount)}</div>
          {customerName && (
            <div className="text-xs font-bold text-slate-700">Customer: {customerName}</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('stop');
              speechSynthesizer.stop();
              onCancel();
            }}
            className="h-12 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold text-sm text-slate-700"
          >
            {language === 'en' ? 'Keep Entry' : 'नहीं, रहने दें'}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('warning');
              playAudioCue('cancel');
              speechSynthesizer.stop();
              onConfirm();
            }}
            className="h-12 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-sm text-white flex items-center justify-center space-x-1.5 shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{language === 'en' ? 'Yes, Undo' : 'हाँ, वापस लें'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

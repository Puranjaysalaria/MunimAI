import React, { useEffect } from 'react';
import { Customer, Item, ParsedIntent } from '../../types/schema';
import { useI18n } from '../../i18n';
import { formatINR } from '../../lib/utils';
import { amountToWords } from '../../tts/numberToWords';
import { speechSynthesizer } from '../../tts/speechSynthesizer';
import {
  Check,
  X,
  User,
  ShoppingBag,
  Volume2,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
} from 'lucide-react';
import { triggerHaptic } from '../../lib/sound';

export interface PendingConfirmation {
  intent: ParsedIntent;
  customer?: Customer | null;
  customerName?: string | null;
  amount: number;
  item?: Item | null;
  itemName?: string | null;
  quantity?: number | null;
  unit?: string | null;
  rawText: string;
  spokenReply?: string;
  questionToAsk?: string | null;
}

interface ConfirmationCardProps {
  pending: PendingConfirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
  isListeningForReply?: boolean;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  pending,
  onConfirm,
  onCancel,
  isListeningForReply = false,
}) => {
  const { language, t } = useI18n();

  if (!pending) return null;

  const isCredit = pending.intent === 'credit';
  const isPayment = pending.intent === 'payment';
  const isSale = pending.intent === 'sale';

  const amountInWords = amountToWords(
    pending.amount,
    language === 'pa' ? 'pa' : language === 'en' ? 'en' : 'hi'
  );

  // Spoken sentence formulated for natural speech
  const spokenPrompt =
    pending.spokenReply ||
    (isCredit && pending.customerName
      ? `${pending.customerName}, ${amountInWords} (${pending.amount}) रुपये उधार। लिख दूँ?`
      : isPayment && pending.customerName
      ? `${pending.customerName} से ${amountInWords} (${pending.amount}) रुपये जमा लिख दूँ?`
      : isSale && pending.itemName
      ? `${pending.quantity ? pending.quantity + ' ' : ''}${pending.unit || ''} ${pending.itemName}, ${amountInWords} रुपये नकद बिक्री। लिख दूँ?`
      : `रुपये ${pending.amount} का लेन-देन। लिख दूँ?`);

  // Speak out loud on mount so shopkeeper hears it
  useEffect(() => {
    speechSynthesizer.speak(spokenPrompt, language === 'pa' ? 'pa' : language === 'en' ? 'en' : 'hi');
  }, [pending, language]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-0 backdrop-blur-xs select-none">
      <div className="bg-surface w-full max-w-md rounded-t-3xl p-6 shadow-sheet animate-slideUp border-t-4 border-primary pb-8">
        {/* Header tag */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div
              className={`p-2 rounded-xl flex items-center justify-center ${
                isCredit
                  ? 'bg-red-100 text-owed'
                  : isPayment
                  ? 'bg-emerald-100 text-received'
                  : 'bg-emerald-100 text-primary'
              }`}
            >
              {isCredit ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : isPayment ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-app-muted block">
                {t.confirmCard.title}
              </span>
              <h2 className="text-base font-black text-app-text">
                {isCredit
                  ? t.confirmCard.creditConfirm
                  : isPayment
                  ? t.confirmCard.paymentConfirm
                  : isSale
                  ? t.confirmCard.saleConfirm
                  : t.confirmCard.expenseConfirm}
              </h2>
            </div>
          </div>

          {/* Voice Prompt Playback Button */}
          <button
            onClick={() =>
              speechSynthesizer.speak(
                spokenPrompt,
                language === 'pa' ? 'pa' : language === 'en' ? 'en' : 'hi'
              )
            }
            className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-primary active:scale-95"
            title="Repeat voice prompt"
            aria-label="Repeat voice prompt"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        {/* Central Amount Display (>=32px per design guidelines) */}
        <div className="py-5 text-center bg-gray-50/80 rounded-2xl my-4 border border-gray-100">
          <span className="text-xs uppercase tracking-wider text-app-muted font-bold block mb-1">
            {t.confirmCard.amountLabel}
          </span>
          <div
            className={`amount-hero tracking-tight ${
              isCredit ? 'text-owed' : 'text-received'
            }`}
          >
            {formatINR(pending.amount)}
          </div>
          <p className="text-sm font-bold text-gray-600 mt-1 capitalize">
            "{amountInWords}"
          </p>
        </div>

        {/* Key Fields Breakdown */}
        <div className="space-y-2.5 text-sm mb-6">
          {/* Customer field if present */}
          {(pending.customer || pending.customerName) && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-xs font-bold text-app-muted flex items-center">
                <User className="w-4 h-4 mr-1 text-gray-500" />
                {t.confirmCard.customerLabel}:
              </span>
              <div className="text-right">
                <span className="font-extrabold text-app-text text-base">
                  {pending.customer?.name || pending.customerName}
                </span>
                {pending.customer?.address_note && (
                  <span className="text-xs text-app-muted block">
                    {pending.customer.address_note}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Item details if present */}
          {pending.itemName && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-xs font-bold text-app-muted flex items-center">
                <ShoppingBag className="w-4 h-4 mr-1 text-gray-500" />
                {t.confirmCard.itemsLabel}:
              </span>
              <span className="font-bold text-app-text capitalize">
                {pending.quantity ? `${pending.quantity} ${pending.unit || ''} ` : ''}
                {pending.itemName}
              </span>
            </div>
          )}

          {/* Balance adjustment preview for Credit or Payment */}
          {pending.customer && (isCredit || isPayment) && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
              <span className="font-bold text-app-muted">
                {isPayment ? 'बकाया उधार (Balance):' : 'नया कुल उधार:'}
              </span>
              <div className="text-right">
                <span className="text-gray-500 line-through mr-2">
                  {formatINR(pending.customer.balance_owed)}
                </span>
                <span
                  className={`font-black text-sm ${
                    isPayment ? 'text-received' : 'text-owed'
                  }`}
                >
                  {formatINR(
                    Math.max(
                      0,
                      Number(pending.customer.balance_owed) +
                        (isCredit ? pending.amount : -pending.amount)
                    )
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Credit Limit Warning if exceeding limit */}
          {isCredit &&
            pending.customer &&
            Number(pending.customer.balance_owed) + pending.amount >
              pending.customer.credit_limit && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  चेतावनी: ग्राहक की कुल उधारी ₹
                  {Number(pending.customer.balance_owed) + pending.amount} हो जाएगी
                  (सीमा ₹{pending.customer.credit_limit})
                </span>
              </div>
            )}
        </div>

        {/* Voice Response Hint */}
        <div className="text-center mb-4">
          <p className="text-xs font-bold text-app-muted">
            {t.confirmCard.speechPrompt}{' '}
            {isListeningForReply && (
              <span className="text-listening font-extrabold animate-pulse">
                (सुन रहे हैं...)
              </span>
            )}
          </p>
        </div>

        {/* Primary 64px Tap Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* Nahi (Cancel) Button */}
          <button
            onClick={() => {
              triggerHaptic('stop');
              speechSynthesizer.stop();
              onCancel();
            }}
            className="touch-target-64 bg-red-50 hover:bg-red-100 border-2 border-red-200 text-owed font-black text-lg rounded-2xl transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-xs"
          >
            <X className="w-6 h-6 text-owed stroke-[3]" />
            <span>{t.confirmCard.nahiButton}</span>
          </button>

          {/* Haan (Confirm & Save) Button */}
          <button
            onClick={() => {
              triggerHaptic('success');
              speechSynthesizer.stop();
              onConfirm();
            }}
            className="touch-target-64 bg-primary hover:bg-primary-dark text-white font-black text-lg rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 border-2 border-primary-dark"
          >
            <Check className="w-6 h-6 text-accent stroke-[3]" />
            <span>{t.confirmCard.haanButton}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Customer, Item, ParsedIntent } from '../../types/schema';
import { useI18n } from '../../i18n';
import { formatINR } from '../../lib/utils';
import { amountToWords } from '../../tts/numberToWords';
import { speechSynthesizer } from '../../tts/speechSynthesizer';
import {
  Check,
  X,
  ShoppingBag,
  Volume2,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic, playAudioCue } from '../../lib/sound';
import { CustomerAvatar } from '../CustomerAvatar';

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

  const isCredit = pending?.intent === 'credit';
  const isPayment = pending?.intent === 'payment';
  const isSale = pending?.intent === 'sale';

  const amountInWords = pending
    ? amountToWords(
        pending.amount,
        language === 'pa' ? 'pa' : language === 'en' ? 'en' : 'hi'
      )
    : '';

  // Spoken sentence formulated for natural speech
  const spokenPrompt = pending
    ? pending.spokenReply ||
      (isCredit && pending.customerName
        ? `${pending.customerName}, ${amountInWords} (${pending.amount}) रुपये उधार। लिख दूँ?`
        : isPayment && pending.customerName
        ? `${pending.customerName} से ${amountInWords} (${pending.amount}) रुपये जमा लिख दूँ?`
        : isSale && pending.itemName
        ? `${pending.quantity ? pending.quantity + ' ' : ''}${pending.unit || ''} ${pending.itemName}, ${amountInWords} रुपये नकद बिक्री। लिख दूँ?`
        : `रुपये ${pending.amount} का लेन-देन। लिख दूँ?`)
    : '';

  // Speak out loud on mount so shopkeeper hears it
  useEffect(() => {
    if (pending && spokenPrompt) {
      speechSynthesizer.speak(
        spokenPrompt,
        language === 'pa' ? 'pa' : language === 'en' ? 'en' : 'hi'
      );
    }
  }, [pending, spokenPrompt, language]);

  return (
    <AnimatePresence>
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
          {/* Backdrop blur with fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              triggerHaptic('stop');
              playAudioCue('cancel');
              speechSynthesizer.stop();
              onCancel();
            }}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm"
          />

          {/* Slide-Up Bottom Sheet Card with Swipe-to-Dismiss */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) {
                triggerHaptic('stop');
                playAudioCue('cancel');
                speechSynthesizer.stop();
                onCancel();
              }
            }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="relative z-10 bg-white w-full max-w-md rounded-t-[36px] p-6 shadow-sheet border-t-4 border-primary pb-8 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Top Sheet Drag Indicator Pill */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing" />

            {/* Header tag */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                    isCredit
                      ? 'bg-rose-100 text-owed'
                      : isPayment
                      ? 'bg-emerald-100 text-received'
                      : 'bg-emerald-100 text-primary'
                  }`}
                >
                  {isCredit ? (
                    <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
                  ) : isPayment ? (
                    <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
                  ) : (
                    <ShoppingBag className="w-6 h-6 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-black text-slate-400 block">
                    {t.confirmCard.title}
                  </span>
                  <h2 className="text-base font-black text-slate-900 leading-tight">
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
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  triggerHaptic('light');
                  speechSynthesizer.speak(
                    spokenPrompt,
                    language === 'pa' ? 'pa' : language === 'en' ? 'en' : 'hi'
                  );
                }}
                className="p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-primary shadow-xs transition-colors flex items-center space-x-1"
                title="Repeat voice prompt"
                aria-label="Repeat voice prompt"
              >
                <Volume2 className="w-5 h-5 stroke-[2.4]" />
              </motion.button>
            </div>

            {/* Central Hero Amount Display (>=32px per design guidelines) */}
            <div
              className={`py-5 px-4 text-center rounded-3xl my-4 border relative overflow-hidden ${
                isCredit
                  ? 'bg-gradient-to-b from-rose-50/90 to-white border-rose-200/90'
                  : 'bg-gradient-to-b from-emerald-50/90 to-white border-emerald-200/90'
              }`}
            >
              <span className="text-xs uppercase tracking-wider text-slate-500 font-black block mb-1">
                {t.confirmCard.amountLabel}
              </span>
              <div
                className={`amount-hero tracking-tight font-black ${
                  isCredit ? 'text-owed' : 'text-received'
                }`}
              >
                {formatINR(pending.amount)}
              </div>
              <p className="text-sm font-bold text-slate-700 mt-1 capitalize">
                "{amountInWords}"
              </p>
            </div>

            {/* Key Fields Breakdown */}
            <div className="space-y-2.5 text-sm mb-5">
              {/* Customer field if present */}
              {(pending.customer || pending.customerName) && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100 shadow-xs">
                  <div className="flex items-center space-x-3">
                    <CustomerAvatar
                      name={pending.customer?.name || pending.customerName || 'Customer'}
                      size="md"
                      trustScore={pending.customer?.trust_score}
                      showBadge
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-400 block">
                        {t.confirmCard.customerLabel}
                      </span>
                      <span className="font-black text-slate-900 text-base leading-tight block">
                        {pending.customer?.name || pending.customerName}
                      </span>
                    </div>
                  </div>

                  {pending.customer?.address_note && (
                    <span className="text-xs text-slate-500 font-semibold bg-white px-2.5 py-1 rounded-xl border border-gray-200">
                      {pending.customer.address_note}
                    </span>
                  )}
                </div>
              )}

              {/* Item details if present */}
              {pending.itemName && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-xs font-bold text-slate-500 flex items-center">
                    <ShoppingBag className="w-4 h-4 mr-1.5 text-slate-400" />
                    {t.confirmCard.itemsLabel}:
                  </span>
                  <span className="font-black text-slate-900 capitalize text-sm">
                    {pending.quantity ? `${pending.quantity} ${pending.unit || ''} ` : ''}
                    {pending.itemName}
                  </span>
                </div>
              )}

              {/* Balance adjustment preview for Credit or Payment */}
              {pending.customer && (isCredit || isPayment) && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">
                    {isPayment ? 'बकाया हिसाब (Balance):' : 'नया कुल उधार:'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 line-through font-bold">
                      {formatINR(pending.customer.balance_owed)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span
                      className={`font-black text-base ${
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
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center space-x-2.5 shadow-xs">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span className="font-semibold leading-snug">
                      चेतावनी: ग्राहक की कुल उधारी ₹
                      {Number(pending.customer.balance_owed) + pending.amount} हो जाएगी
                      (तय सीमा ₹{pending.customer.credit_limit})
                    </span>
                  </div>
                )}
            </div>

            {/* Voice Response Hint */}
            <div className="text-center mb-4">
              <p className="text-xs font-bold text-slate-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-accent" />
                <span>{t.confirmCard.speechPrompt}</span>
                {isListeningForReply && (
                  <span className="text-blue-600 font-black ml-1 animate-pulse">
                    (सुन रहे हैं...)
                  </span>
                )}
              </p>
            </div>

            {/* Primary 64px Tap Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Nahi (Cancel) Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => {
                  triggerHaptic('stop');
                  playAudioCue('cancel');
                  speechSynthesizer.stop();
                  onCancel();
                }}
                className="touch-target-64 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-owed font-black text-lg rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-xs"
              >
                <X className="w-6 h-6 text-owed stroke-[3]" />
                <span>{t.confirmCard.nahiButton}</span>
              </motion.button>

              {/* Haan (Confirm & Save) Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => {
                  triggerHaptic('success');
                  playAudioCue('success');
                  speechSynthesizer.stop();
                  onConfirm();
                }}
                className="touch-target-64 bg-gradient-to-r from-primary to-emerald-700 hover:from-emerald-800 hover:to-emerald-900 text-white font-black text-lg rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 border-2 border-emerald-900"
              >
                <Check className="w-6 h-6 text-accent stroke-[3]" />
                <span>{t.confirmCard.haanButton}</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

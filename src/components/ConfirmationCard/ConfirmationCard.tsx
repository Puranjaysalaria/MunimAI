import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Customer, Item, ParsedIntent, Transaction } from '../../types/schema';
import { SideEffectAnalysis } from '../../voice/sideEffectAnalyzer';
import { SafetyTierEvaluation } from '../../voice/safetyTiers';
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
  Mic,
  Tag,
  Pencil,
} from 'lucide-react';
import { triggerHaptic, playAudioCue } from '../../lib/sound';
import { CustomerAvatar } from '../CustomerAvatar';
import { getLocalizedCustomerName, formatItemName, formatUnit } from '../../lib/nameTranslation';

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
  oldPrice?: number | null;
  priceType?: 'selling' | 'cost' | null;
  date?: string | null;
  note?: string | null;
  isPaused?: boolean;
  lastCorrectionReadback?: string | null;
  changedFields?: string[];
  // Diff Confirmation, Side-Effect Warnings & Safety Tiers (Parts 4, 5, 6)
  editTargetTx?: Transaction | null;
  editBefore?: {
    amount: number;
    customerName?: string | null;
    itemName?: string | null;
    quantity?: number | null;
    unit?: string | null;
    date?: string | null;
    note?: string | null;
  } | null;
  sideEffects?: SideEffectAnalysis | null;
  safetyTier?: SafetyTierEvaluation | null;
  editSource?: 'voice' | 'tap';
}

interface ConfirmationCardProps {
  pending: PendingConfirmation | null;
  onConfirm: (source?: 'voice' | 'tap') => void;
  onCancel: () => void;
  onManualUpdate?: (updates: Partial<PendingConfirmation>) => void;
  onRerecordProof?: (tx: Transaction, customer?: Customer | null) => void;
  isListeningForReply?: boolean;
  onStartListeningForReply?: () => void;
  onStopListeningForReply?: () => void;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  pending,
  onConfirm,
  onCancel,
  onManualUpdate,
  onRerecordProof,
  isListeningForReply = false,
  onStartListeningForReply,
  onStopListeningForReply,
}) => {
  const { language, t } = useI18n();
  const [isManualEditing, setIsManualEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editIntent, setEditIntent] = useState<ParsedIntent>('credit');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editNote, setEditNote] = useState('');

  useEffect(() => {
    setIsManualEditing(false);
    if (pending) {
      setEditAmount(String(pending.amount ?? ''));
      setEditIntent(pending.intent);
      setEditCustomerName(pending.customerName || pending.customer?.name || '');
      setEditNote(pending.note || '');
    }
  }, [pending?.rawText, pending?.intent, pending?.amount]);

  const isEditDiff = Boolean(pending?.editTargetTx);
  const isTapOnly = Boolean(pending?.safetyTier?.requiresTapOnly);
  const isCredit = pending?.intent === 'credit';
  const isPayment = pending?.intent === 'payment';
  const isSale = pending?.intent === 'sale';
  const isPriceAction = pending?.intent === 'set_selling_price' || pending?.intent === 'set_cost_price';
  const isCostPrice = pending?.intent === 'set_cost_price';

  const custDisplayName = pending
    ? getLocalizedCustomerName(pending.customerName || pending.customer?.name, language)
    : '';

  const localizedItemName = pending?.itemName
    ? formatItemName(pending.itemName, language)
    : pending?.item?.name
    ? formatItemName(pending.item.name, language)
    : '';

  const localizedUnit = pending?.unit
    ? formatUnit(pending.unit, language)
    : '';

  const priceConfirmTemplate = isCostPrice
    ? t.priceAction.costPriceConfirm
    : t.priceAction.sellingPriceConfirm;

  const priceActionTitle = priceConfirmTemplate
    ? priceConfirmTemplate
        .replace('{item}', localizedItemName || t.confirmCard.itemsLabel)
        .replace('{price}', String(pending?.amount ?? ''))
        .replace('{unit}', localizedUnit || '')
    : '';

  const amountInWords = pending
    ? amountToWords(pending.amount, language)
    : '';

  // Spoken sentence formulated for natural speech across all 10 languages
  const diffSpokenPrompt =
    pending && isEditDiff && pending.editBefore
      ? t.editing.diffSpeakPrompt
          .replace('{before}', `₹${pending.editBefore.amount}`)
          .replace('{after}', `₹${pending.amount}`) +
        (isTapOnly ? ` ${t.editing.tapConfirmVoiceNotice}` : '')
      : '';

  const spokenPrompt = pending
    ? isEditDiff && diffSpokenPrompt
      ? diffSpokenPrompt
      : isPriceAction
      ? (pending.spokenReply
          ? pending.spokenReply
              .replace('{item}', localizedItemName)
              .replace('{price}', String(pending.amount))
              .replace('{unit}', localizedUnit)
          : (language === 'en'
            ? `Set ${localizedItemName} ${isCostPrice ? 'cost' : 'selling'} price to ₹${pending.amount}${localizedUnit ? ' per ' + localizedUnit : ''}?`
            : language === 'pa'
            ? `${localizedItemName} ਦਾ ${isCostPrice ? 'ਖਰੀਦ ' : ''}ਰੇਟ ₹${pending.amount} ${localizedUnit} ਸੈੱਟ ਕਰਨਾ ਹੈ?`
            : `${localizedItemName} का ${isCostPrice ? 'खरीद ' : ''}रेट ₹${pending.amount} ${localizedUnit} सेट करना है?`))
      : language === 'en'
      ? isCredit && custDisplayName
        ? `${custDisplayName}, ${amountInWords} (₹${pending.amount}) credit loan. Should I record it?`
        : isPayment && custDisplayName
        ? `Record ${amountInWords} (₹${pending.amount}) payment from ${custDisplayName}?`
        : isSale && pending.itemName
        ? `Record ${pending.quantity ? pending.quantity + ' ' : ''}${pending.unit || ''} ${pending.itemName}, ${amountInWords} cash sale?`
        : `Record ₹${pending.amount} transaction?`
      : language === 'pa'
      ? isCredit && custDisplayName
        ? `${custDisplayName}, ${amountInWords} (${pending.amount}) ਰੁਪਏ ਉਧਾਰ। ਲਿਖ ਦਿਆਂ?`
        : isPayment && custDisplayName
        ? `${custDisplayName} ਤੋਂ ${amountInWords} (${pending.amount}) ਰੁਪਏ ਜਮ੍ਹਾ ਲਿਖ ਦਿਆਂ?`
        : isSale && pending.itemName
        ? `${pending.quantity ? pending.quantity + ' ' : ''}${pending.unit || ''} ${pending.itemName}, ${amountInWords} ਨਕਦ ਵਿਕਰੀ। ਲਿਖ ਦਿਆਂ?`
        : `₹${pending.amount} ਦਾ ਲੈਣ-ਦੇਣ ਲਿਖ ਦਿਆਂ?`
      : language === 'gu'
      ? isCredit && custDisplayName
        ? `${custDisplayName}, ${amountInWords} (${pending.amount}) રૂપિયા ઉધાર. નોંધી લઉં?`
        : isPayment && custDisplayName
        ? `${custDisplayName} પાસેથી ${amountInWords} (${pending.amount}) રૂપિયા જમા. નોંધી લઉં?`
        : isSale && pending.itemName
        ? `${pending.quantity ? pending.quantity + ' ' : ''}${pending.unit || ''} ${pending.itemName}, ${amountInWords} રોકડ વેચાણ. નોંધી લઉં?`
        : `₹${pending.amount} નો વ્યવહાર નોંધી લઉં?`
      : language === 'mr'
      ? isCredit && custDisplayName
        ? `${custDisplayName}, ${amountInWords} (${pending.amount}) रुपये उधार. लिहू का?`
        : isPayment && custDisplayName
        ? `${custDisplayName} कडून ${amountInWords} (${pending.amount}) रुपये जमा. लिहू का?`
        : isSale && pending.itemName
        ? `${pending.quantity ? pending.quantity + ' ' : ''}${pending.unit || ''} ${pending.itemName}, ${amountInWords} रोख विक्री. लिहू का?`
        : `₹${pending.amount} चा व्यवहार लिहू का?`
      : language === 'bn'
      ? isCredit && custDisplayName
        ? `${custDisplayName}, ${amountInWords} (${pending.amount}) টাকা বাকি। লিখে রাখব?`
        : isPayment && custDisplayName
        ? `${custDisplayName} এর থেকে ${amountInWords} (${pending.amount}) টাকা জমা। লিখে রাখব?`
        : isSale && pending.itemName
        ? `${pending.quantity ? pending.quantity + ' ' : ''}${pending.unit || ''} ${pending.itemName}, ${amountInWords} নগদ বিক্রি। লিখে রাখব?`
        : `₹${pending.amount} টাকার লেনদেন লিখে রাখব?`
      : language === 'ta'
      ? isCredit && custDisplayName
        ? `${custDisplayName}, ${amountInWords} (${pending.amount}) ரூபாய் கடன். பதிவு செய்யவா?`
        : isPayment && custDisplayName
        ? `${custDisplayName} இடமிருந்து ${amountInWords} (${pending.amount}) ரூபாய் வரவு. பதிவு செய்யவா?`
        : isSale && pending.itemName
        ? `${pending.quantity ? pending.quantity + ' ' : ''}${pending.unit || ''} ${pending.itemName}, ${amountInWords} ரொக்க விற்பனை. பதிவு செய்யவா?`
        : `₹${pending.amount} பரிவர்த்தனையை பதிவு செய்யவா?`
      : language === 'te'
      ? isCredit && custDisplayName
        ? `${custDisplayName}, ${amountInWords} (${pending.amount}) రూపాయల అప్పు. రాయమంటారా?`
        : isPayment && custDisplayName
        ? `${custDisplayName} నుండి ${amountInWords} (${pending.amount}) రూపాయల జమ. రాయమంటారా?`
        : isSale && pending.itemName
        ? `${pending.quantity ? pending.quantity + ' ' : ''}${pending.unit || ''} ${pending.itemName}, ${amountInWords} నగదు అమ్మకం. రాయమంటారా?`
        : `₹${pending.amount} లావాదేవీని రాయమంటారా?`
      : language === 'kn'
      ? isCredit && custDisplayName
        ? `${custDisplayName}, ${amountInWords} (${pending.amount}) ರೂಪಾಯಿ ಸಾಲ. ಬರೆಯಲೇ?`
        : isPayment && custDisplayName
        ? `${custDisplayName} ಅವರಿಂದ ${amountInWords} (${pending.amount}) ರೂಪಾಯಿ ಜಮೆ. ಬರೆಯಲೇ?`
        : isSale && pending.itemName
        ? `${pending.quantity ? pending.quantity + ' ' : ''}${pending.unit || ''} ${pending.itemName}, ${amountInWords} ನಗದು ಮಾರಾಟ. ಬರೆಯಲೇ?`
        : `₹${pending.amount} ವಹಿವಾಟು ಬರೆಯಲೇ?`
      : language === 'ml'
      ? isCredit && custDisplayName
        ? `${custDisplayName}, ${amountInWords} (${pending.amount}) രൂപ കടം. എഴുതട്ടെ?`
        : isPayment && custDisplayName
        ? `${custDisplayName} ൽ നിന്ന് ${amountInWords} (${pending.amount}) രൂപ വരവ്. എഴുതട്ടെ?`
        : isSale && pending.itemName
        ? `${pending.quantity ? pending.quantity + ' ' : ''}${pending.unit || ''} ${pending.itemName}, ${amountInWords} പണ വിൽപ്പന. എഴുതട്ടെ?`
        : `₹${pending.amount} ഇടപാട് എഴുതട്ടെ?`
      : pending.spokenReply ||
        (isCredit && custDisplayName
          ? `${custDisplayName}, ${amountInWords} (${pending.amount}) रुपये उधार। लिख दूँ?`
          : isPayment && custDisplayName
          ? `${custDisplayName} से ${amountInWords} (${pending.amount}) रुपये जमा लिख दूँ?`
          : isSale && pending.itemName
          ? `${pending.quantity ? pending.quantity + ' ' : ''}${pending.unit || ''} ${pending.itemName}, ${amountInWords} रुपये नकद बिक्री। लिख दूँ?`
          : `रुपये ${pending.amount} का लेन-देन। लिख दूँ?`)
    : '';

  const pendingKey = pending
    ? `${pending.intent}_${pending.amount}_${pending.customer?.id || pending.customerName || ''}_${pending.itemName || ''}_${pending.quantity || ''}_${pending.unit || ''}_${pending.date || ''}_${pending.note || ''}_${pending.rawText}`
    : null;

  const onStartListeningRef = useRef(onStartListeningForReply);
  onStartListeningRef.current = onStartListeningForReply;

  const onStopListeningRef = useRef(onStopListeningForReply);
  onStopListeningRef.current = onStopListeningForReply;

  const spokenPromptRef = useRef(spokenPrompt);
  spokenPromptRef.current = pending?.lastCorrectionReadback || spokenPrompt;

  const isPausedRef = useRef(Boolean(pending?.isPaused));
  isPausedRef.current = Boolean(pending?.isPaused);

  const languageRef = useRef(language);
  languageRef.current = language;

  const lastSpokenKeyRef = useRef<string | null>(null);

  // Speak out loud once per pending transaction, then automatically start listening for "Haan" or "Nahi"
  useEffect(() => {
    if (!pendingKey) {
      lastSpokenKeyRef.current = null;
      speechSynthesizer.stop();
      onStopListeningRef.current?.();
      return;
    }

    if (lastSpokenKeyRef.current === pendingKey) {
      return;
    }

    lastSpokenKeyRef.current = pendingKey;
    let active = true;

    speechSynthesizer.speak(spokenPromptRef.current, languageRef.current).then(() => {
      if (active && lastSpokenKeyRef.current === pendingKey && !isPausedRef.current) {
        onStartListeningRef.current?.();
      }
    });

    return () => {
      active = false;
    };
  }, [pendingKey]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      speechSynthesizer.stop();
      onStopListeningRef.current?.();
    };
  }, []);

  return (
    <AnimatePresence>
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
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

          {/* Slide-Up Bottom Sheet Card on Mobile, Centered Dialog on Laptop/Desktop */}
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
            className="relative z-10 bg-white w-full max-w-md sm:max-w-lg rounded-t-[36px] sm:rounded-3xl p-6 shadow-sheet sm:shadow-2xl border-t-4 border-primary pb-8 sm:pb-6 overflow-hidden max-h-[90vh] sm:max-h-[85vh] overflow-y-auto"
          >
            {/* Top Sheet Drag Indicator Pill (Mobile only) */}
            <div className="sm:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing" />

            {/* Header tag */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                    isPriceAction
                      ? 'bg-amber-100 text-amber-700'
                      : isCredit
                      ? 'bg-rose-100 text-owed'
                      : isPayment
                      ? 'bg-emerald-100 text-received'
                      : 'bg-emerald-100 text-primary'
                  }`}
                >
                  {isPriceAction ? (
                    <Tag className="w-6 h-6 stroke-[2.5]" />
                  ) : isCredit ? (
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
                    {isEditDiff
                      ? t.editing.diffTitle
                      : isPriceAction
                      ? priceActionTitle
                      : isCredit
                      ? t.confirmCard.creditConfirm
                      : isPayment
                      ? t.confirmCard.paymentConfirm
                      : isSale
                      ? t.confirmCard.saleConfirm
                      : t.confirmCard.expenseConfirm}
                  </h2>
                </div>
              </div>

              {/* Voice Prompt Playback + Manual Edit Fallback */}
              <div className="flex items-center space-x-2">
                {onManualUpdate && !isPriceAction && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      triggerHaptic('light');
                      setIsManualEditing((prev) => !prev);
                    }}
                    className={`p-3 rounded-2xl shadow-xs transition-colors flex items-center space-x-1 ${
                      isManualEditing
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-slate-700'
                    }`}
                    title="Edit manually"
                    aria-label="Edit manually"
                  >
                    <Pencil className="w-4 h-4 stroke-[2.4]" />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    triggerHaptic('light');
                    onStopListeningRef.current?.();
                    speechSynthesizer.speak(
                      spokenPrompt,
                      language
                    ).then(() => {
                      onStartListeningRef.current?.();
                    });
                  }}
                  className="p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-primary shadow-xs transition-colors flex items-center space-x-1"
                  title="Repeat voice prompt"
                  aria-label="Repeat voice prompt"
                >
                  <Volume2 className="w-5 h-5 stroke-[2.4]" />
                </motion.button>
              </div>
            </div>

              {/* Inline Manual Edit Fallback Form */}
              {isManualEditing && onManualUpdate && (
                <div className="p-3.5 rounded-2xl my-3 bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Type
                      </label>
                      <select
                        value={editIntent}
                        onChange={(e) => setEditIntent(e.target.value as ParsedIntent)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900"
                      >
                        <option value="credit">Credit (Udhaar)</option>
                        <option value="payment">Payment Received</option>
                        <option value="sale">Cash Sale</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Customer
                      </label>
                      <input
                        type="text"
                        value={editCustomerName}
                        onChange={(e) => setEditCustomerName(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Note
                      </label>
                      <input
                        type="text"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="Optional note"
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsManualEditing(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const num = Number(editAmount);
                        onManualUpdate({
                          amount: Number.isFinite(num) && num >= 0 ? num : pending.amount,
                          intent: editIntent,
                          customerName: editCustomerName.trim() || null,
                          note: editNote.trim() || null,
                        });
                        setIsManualEditing(false);
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-dark"
                    >
                      Apply Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Central Hero Amount Display (>=32px per design guidelines) */}
              {isEditDiff && pending.editBefore ? (
                <div className="p-4 rounded-3xl my-4 border-2 border-amber-200 bg-gradient-to-b from-amber-50/70 to-white space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-2xl bg-white border border-gray-200">
                      <span className="text-[11px] font-black uppercase text-slate-400 block">
                        {t.editing.beforeLabel}
                      </span>
                      <span className="text-xl font-black text-slate-500 line-through block mt-1">
                        {formatINR(pending.editBefore.amount)}
                      </span>
                      {pending.editBefore.itemName && (
                        <span className="text-xs text-slate-500 block mt-0.5">
                          {pending.editBefore.quantity || ''} {pending.editBefore.itemName}
                        </span>
                      )}
                      {pending.editBefore.customerName && (
                        <span className="text-xs text-slate-500 block">
                          {pending.editBefore.customerName}
                        </span>
                      )}
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-300">
                      <span className="text-[11px] font-black uppercase text-emerald-700 block">
                        {t.editing.afterLabel}
                      </span>
                      <span className="text-2xl font-black text-emerald-800 block mt-1">
                        {formatINR(pending.amount)}
                      </span>
                      {pending.itemName && (
                        <span className="text-xs font-bold text-emerald-800 block mt-0.5">
                          {pending.quantity || ''} {formatItemName(pending.itemName, language)}
                        </span>
                      )}
                      {custDisplayName && (
                        <span className="text-xs font-bold text-emerald-800 block">
                          {custDisplayName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
            <div
              className={`py-5 px-4 text-center rounded-3xl my-4 border relative overflow-hidden ${
                isPriceAction
                  ? 'bg-gradient-to-b from-amber-50/90 to-white border-amber-200/90'
                  : isCredit
                  ? 'bg-gradient-to-b from-rose-50/90 to-white border-rose-200/90'
                  : 'bg-gradient-to-b from-emerald-50/90 to-white border-emerald-200/90'
              }`}
            >
              <span className="text-xs uppercase tracking-wider text-slate-500 font-black block mb-1">
                {isPriceAction
                  ? (isCostPrice ? t.stock.costPrice : t.stock.sellingPrice)
                  : t.confirmCard.amountLabel}
              </span>
              <div
                className={`amount-hero tracking-tight font-black ${
                  isPriceAction
                    ? 'text-amber-800'
                    : isCredit
                    ? 'text-owed'
                    : 'text-received'
                }`}
              >
                {formatINR(pending.amount)}
                {isPriceAction && pending.unit ? ` / ${localizedUnit || pending.unit}` : ''}
              </div>
              {isPriceAction && pending.oldPrice !== null && pending.oldPrice !== undefined ? (
                <p className="text-sm font-bold text-slate-700 mt-1">
                  ₹{pending.oldPrice} ➔ ₹{pending.amount}
                </p>
              ) : (
                <p className="text-sm font-bold text-slate-700 mt-1 capitalize">
                  "{amountInWords}"
                </p>
              )}
            </div>
              )}

            {/* Key Fields Breakdown */}
            <div className="space-y-2.5 text-sm mb-5">
              {/* Customer field if present */}
              {(pending.customer || pending.customerName) && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100 shadow-xs">
                  <div className="flex items-center space-x-3">
                    <CustomerAvatar
                      name={custDisplayName || 'Customer'}
                      size="md"
                      trustScore={pending.customer?.trust_score}
                      showBadge
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-400 block">
                        {t.confirmCard.customerLabel}
                      </span>
                      <span className="font-black text-slate-900 text-base leading-tight block">
                        {custDisplayName}
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
                    {pending.quantity ? `${pending.quantity} ${formatUnit(pending.unit, language)} ` : ''}
                    {formatItemName(pending.itemName, language)}
                  </span>
                </div>
              )}

              {/* Optional Date / Note / Paused chips */}
              {(pending.date || pending.note || pending.isPaused) && (
                <div className="flex flex-wrap gap-2">
                  {pending.date && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                      📅 {new Date(pending.date).toLocaleDateString()}
                    </span>
                  )}
                  {pending.note && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                      📝 {pending.note}
                    </span>
                  )}
                  {pending.isPaused && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
                      ⏸ {language === 'en' ? 'Paused' : 'रुका हुआ'}
                    </span>
                  )}
                </div>
              )}

              {/* Balance adjustment preview for Credit or Payment */}
              {pending.customer && (isCredit || isPayment) && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">
                    {isPayment ? t.confirmCard.balancePreview : t.confirmCard.newTotalUdhaar}
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
                      {t.confirmCard.creditLimitWarning
                        .replace('{projected}', String(Number(pending.customer.balance_owed) + pending.amount))
                        .replace('{limit}', String(pending.customer.credit_limit))}
                    </span>
                  </div>
                )}

              {/* Part 5: Side-Effect Warnings (Proof Clip, Sent Reminder, Stock & Profit Delta) */}
              {pending.sideEffects?.hasProofClip && pending.editTargetTx && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-2">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span className="font-bold leading-snug">
                      {t.editing.proofWarning.replace(
                        '{amount}',
                        String(pending.sideEffects.proofOriginalAmount ?? pending.editTargetTx.amount)
                      )}
                    </span>
                  </div>
                  {onRerecordProof && (
                    <button
                      type="button"
                      onClick={() => onRerecordProof(pending.editTargetTx!, pending.customer)}
                      className="w-full py-2 px-3 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-black text-xs transition-colors"
                    >
                      {t.editing.rerecordProofBtn}
                    </button>
                  )}
                </div>
              )}

              {pending.sideEffects?.hasSentReminder && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span className="font-bold leading-snug">{t.editing.reminderWarning}</span>
                </div>
              )}

              {pending.sideEffects && (pending.sideEffects.stockEffects.length > 0 || pending.sideEffects.profitDelta !== 0) && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                  {pending.sideEffects.stockEffects.map((se) => (
                    <div key={se.itemName} className="flex justify-between font-semibold">
                      <span>{t.editing.stockImpactLabel} ({formatItemName(se.itemName, language)}):</span>
                      <span>{se.oldQty} ➔ {se.newQty}</span>
                    </div>
                  ))}
                  {pending.sideEffects.profitDelta !== 0 && (
                    <div className="flex justify-between font-semibold">
                      <span>{t.editing.profitImpactLabel}:</span>
                      <span className={pending.sideEffects.profitDelta > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {pending.sideEffects.profitDelta > 0 ? '+' : ''}{formatINR(pending.sideEffects.profitDelta)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Part 6: Safety Tier Tap-Only Enforcement Banner */}
              {isTapOnly && (
                <div className="p-3 rounded-2xl bg-slate-900 text-amber-300 text-xs font-black flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{t.editing.tapConfirmRequired}</span>
                </div>
              )}
            </div>

            {/* Interactive Voice Response Pill with live mic feedback */}
            <div className="flex flex-col items-center justify-center mb-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  triggerHaptic('light');
                  if (isListeningForReply) {
                    onStopListeningForReply?.();
                  } else {
                    speechSynthesizer.stop();
                    onStartListeningForReply?.();
                  }
                }}
                className={`px-4 py-2 rounded-2xl flex items-center space-x-2.5 border transition-all ${
                  isListeningForReply
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs'
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-slate-700'
                }`}
                title={isListeningForReply ? 'Tap to pause microphone' : 'Tap to speak reply'}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    isListeningForReply
                      ? 'bg-emerald-500 text-white animate-pulse shadow-xs'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <Mic className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="text-left">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-black">
                      {isListeningForReply
                        ? (t.confirmCard.listeningStatus || (language === 'en' ? 'Listening...' : language === 'pa' ? 'ਸੁਣ ਰਹੇ ਹਾਂ...' : 'सुन रहे हैं...'))
                        : (t.confirmCard.speechPrompt || (language === 'en' ? 'Voice Confirmation' : language === 'pa' ? 'ਆਵਾਜ਼ ਨਾਲ ਪੁਸ਼ਟੀ' : 'आवाज़ से पुष्टि'))}
                    </span>
                    {isListeningForReply && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold block">
                    {t.confirmCard.speechPrompt}
                  </span>
                </div>
              </motion.button>
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
                  onConfirm('tap');
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

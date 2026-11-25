import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Customer, Transaction } from '../../types/schema';
import { useI18n } from '../../i18n';
import { formatINR, formatRelativeTime } from '../../lib/utils';
import { getLocalizedCustomerName } from '../../lib/nameTranslation';
import { FileEdit, X, Mic } from 'lucide-react';
import { triggerHaptic } from '../../lib/sound';

interface EntryDisambiguationModalProps {
  candidates: Transaction[];
  customers: Customer[];
  question?: string;
  onSelect: (tx: Transaction) => void;
  onCancel: () => void;
}

export const EntryDisambiguationModal: React.FC<EntryDisambiguationModalProps> = ({
  candidates,
  customers,
  question,
  onSelect,
  onCancel,
}) => {
  const { language, t } = useI18n();

  if (candidates.length <= 1) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm"
        />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="relative z-10 bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t-4 border-amber-500 max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
                <FileEdit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {question || (language === 'en' ? 'Which entry do you want to edit?' : 'कौनसी एंट्री बदलनी है?')}
                </h3>
                <p className="text-xs text-slate-500 font-medium flex items-center mt-0.5">
                  <Mic className="w-3 h-3 mr-1 text-emerald-600" />
                  {t.disambiguation.voiceHint}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 rounded-full hover:bg-gray-100 text-slate-400"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2.5 mt-4">
            {candidates.map((tx, idx) => {
              const cust = tx.customer_id
                ? customers.find((c) => c.id === tx.customer_id)
                : null;
              const custName = cust
                ? getLocalizedCustomerName(cust.name, language)
                : tx.type.toUpperCase();
              const itemsText =
                tx.items && tx.items.length > 0
                  ? tx.items.map((it) => `${it.quantity || ''} ${it.name}`.trim()).join(', ')
                  : tx.voice_transcript || tx.type;

              return (
                <button
                  key={tx.id}
                  onClick={() => {
                    triggerHaptic('success');
                    onSelect(tx);
                  }}
                  className="w-full touch-target-64 text-left p-3.5 rounded-2xl border-2 border-gray-100 hover:border-amber-400 hover:bg-amber-50/40 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <span className="w-7 h-7 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-black text-sm text-slate-900 truncate">{custName}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {itemsText} • {formatRelativeTime(tx.created_at, language)}
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-base text-slate-900 ml-3 flex-shrink-0">
                    {formatINR(tx.amount)}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Customer } from '../../types/schema';
import { useI18n } from '../../i18n';
import { formatINR } from '../../lib/utils';
import { MapPin, X, Users, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../../lib/sound';
import { CustomerAvatar } from '../CustomerAvatar';

interface DisambiguationModalProps {
  isOpen: boolean;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onCancel: () => void;
}

export const DisambiguationModal: React.FC<DisambiguationModalProps> = ({
  isOpen,
  customers,
  onSelectCustomer,
  onCancel,
}) => {
  const { t } = useI18n();

  if (!isOpen || customers.length === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            triggerHaptic('start');
            onCancel();
          }}
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm"
        />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="relative z-10 bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-sheet max-h-[85vh] overflow-y-auto border-t-4 border-amber-500"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shadow-xs">
                <Users className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 leading-tight">
                  {t.disambiguation.title}
                </h2>
                <p className="text-xs text-slate-500 font-medium">{t.disambiguation.subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => {
                triggerHaptic('start');
                onCancel();
              }}
              className="p-2 rounded-full hover:bg-gray-100 text-slate-400 active:scale-95"
              aria-label="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Customer Choice Cards */}
          <p className="text-xs font-black text-slate-500 mt-4 mb-2.5">
            {t.disambiguation.selectPrompt}
          </p>

          <div className="space-y-2.5">
            {customers.map((cust, idx) => (
              <motion.button
                key={cust.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  triggerHaptic('start');
                  onSelectCustomer(cust);
                }}
                className="touch-target-64 w-full p-3.5 bg-gray-50/80 hover:bg-emerald-50/60 border-2 border-gray-200/80 hover:border-primary rounded-2xl text-left transition-all shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <CustomerAvatar name={cust.name} size="sm" trustScore={cust.trust_score} />
                  <div>
                    <span className="text-base font-black text-slate-900 block leading-tight">
                      {cust.name}
                    </span>
                    {cust.address_note && (
                      <p className="text-xs text-slate-500 flex items-center mt-0.5 font-medium">
                        <MapPin className="w-3 h-3 mr-0.5 text-slate-400 flex-shrink-0" />
                        <span>{cust.address_note}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-sm font-black text-owed block">
                    {formatINR(cust.balance_owed)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">{t.ledger.customerBalanceOwed}</span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Spoken voice prompt hint */}
          <p className="text-xs text-center text-slate-500 mt-5 font-semibold flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-accent" />
            <span>{t.disambiguation.voiceHint}</span>
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React from 'react';
import { Customer } from '../../types/schema';
import { useI18n } from '../../i18n';
import { formatINR } from '../../lib/utils';
import { MapPin, ShieldCheck, X, Users } from 'lucide-react';
import { triggerHaptic } from '../../lib/sound';

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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs select-none">
      <div className="bg-surface w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-sheet max-h-[85vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-app-text">{t.disambiguation.title}</h2>
              <p className="text-xs text-app-muted">{t.disambiguation.subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('start');
              onCancel();
            }}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 active:scale-95"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Choice Cards */}
        <p className="text-xs font-bold text-app-muted mt-3 mb-2">
          {t.disambiguation.selectPrompt}
        </p>

        <div className="space-y-3">
          {customers.map((cust, idx) => (
            <button
              key={cust.id}
              onClick={() => {
                triggerHaptic('start');
                onSelectCustomer(cust);
              }}
              className="touch-target-64 w-full p-4 bg-gray-50 hover:bg-primary-light/40 border-2 border-gray-200 hover:border-primary rounded-2xl text-left transition-all active:scale-[0.98] shadow-xs flex items-center justify-between"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-base font-bold text-app-text">{cust.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center">
                    <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                    {cust.trust_score}%
                  </span>
                </div>

                {cust.address_note && (
                  <p className="text-xs text-app-muted flex items-center mt-1 ml-8">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400 flex-shrink-0" />
                    <span>{cust.address_note}</span>
                  </p>
                )}
              </div>

              <div className="text-right flex-shrink-0 ml-2">
                <span className="text-sm font-bold text-owed block">
                  {formatINR(cust.balance_owed)}
                </span>
                <span className="text-[10px] text-gray-400">उधार बाकी</span>
              </div>
            </button>
          ))}
        </div>

        {/* Spoken voice prompt hint */}
        <p className="text-xs text-center text-app-muted mt-4 italic">
          आप बोल भी सकते हैं: "पहला वाला" या "शर्मा जी"
        </p>
      </div>
    </div>
  );
};

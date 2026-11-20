import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LastPriceChange } from '../../types/schema';
import { useI18n } from '../../i18n';
import { RotateCcw, Eye, X, Tag } from 'lucide-react';
import { triggerHaptic } from '../../lib/sound';

interface PriceChangeToastProps {
  priceChange: LastPriceChange | null;
  showViewButton?: boolean;
  onView: () => void;
  onUndo: () => void;
  onDismiss: () => void;
}

export const PriceChangeToast: React.FC<PriceChangeToastProps> = ({
  priceChange,
  showViewButton = false,
  onView,
  onUndo,
  onDismiss,
}) => {
  const { t } = useI18n();
  const [secondsRemaining, setSecondsRemaining] = useState(10);

  useEffect(() => {
    if (!priceChange) return;

    setSecondsRemaining(10);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [priceChange, onDismiss]);

  if (!priceChange) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto select-none pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 350 }}
          className="pointer-events-auto bg-slate-950/95 backdrop-blur-xl text-white rounded-2xl p-3.5 shadow-dock flex items-center justify-between border border-emerald-500/40"
        >
          {/* Info */}
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl flex-shrink-0">
              <Tag className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-black text-white capitalize truncate">
                  {priceChange.item.name}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded">
                  {priceChange.priceType === 'cost' ? 'Cost' : 'Sell'}
                </span>
              </div>
              <p className="text-[11px] text-amber-300 font-bold mt-0.5">
                ₹{priceChange.oldPrice} ➔ ₹{priceChange.newPrice} /{priceChange.item.unit}
              </p>
            </div>
          </div>

          {/* Action Buttons: "Dekhein" (if staying put) & "Wapas karo" (Undo, for 10s) */}
          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            {showViewButton && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  triggerHaptic('light');
                  onView();
                }}
                className="touch-target-64 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs flex items-center space-x-1 border border-emerald-400 active:scale-95"
                title={t.priceAction.viewButton}
              >
                <Eye className="w-3.5 h-3.5 stroke-[2.4]" />
                <span>{t.priceAction.viewButton}</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                triggerHaptic('stop');
                onUndo();
              }}
              className="touch-target-64 px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center space-x-1.5 border border-amber-300 active:scale-95"
              title={t.priceAction.undoButton}
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.4]" />
              <span>{t.priceAction.undoButton}</span>
              <span className="text-[10px] opacity-75 font-mono">({secondsRemaining}s)</span>
            </motion.button>

            <button
              onClick={onDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg active:scale-95"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

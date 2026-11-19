import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction } from '../../types/schema';
import { useI18n } from '../../i18n';
import { formatINR } from '../../lib/utils';
import { RotateCcw, CheckCircle2, X } from 'lucide-react';
import { triggerHaptic } from '../../lib/sound';

interface UndoToastProps {
  lastTransaction: Transaction | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  lastTransaction,
  onUndo,
  onDismiss,
}) => {
  const { t } = useI18n();

  if (!lastTransaction) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto select-none pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 350 }}
          className="pointer-events-auto bg-slate-950/95 backdrop-blur-xl text-white rounded-2xl p-3.5 shadow-dock flex items-center justify-between border border-slate-700/60"
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-white truncate">
                {formatINR(lastTransaction.amount)} ({t.confirmCard.saved})
              </p>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {lastTransaction.voice_transcript || lastTransaction.type}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                triggerHaptic('stop');
                onUndo();
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center space-x-1.5 border border-amber-300"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.4]" />
              <span>{t.confirmCard.undoButton}</span>
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

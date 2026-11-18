import React from 'react';
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
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto animate-bounce-short select-none">
      <div className="bg-zinc-900 text-white rounded-2xl p-3.5 shadow-sheet flex items-center justify-between border border-zinc-700">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-gray-200 truncate">
              {formatINR(lastTransaction.amount)} दर्ज हुआ
            </p>
            <p className="text-[10px] text-gray-400 truncate">
              {lastTransaction.voice_transcript || lastTransaction.type}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
          <button
            onClick={() => {
              triggerHaptic('stop');
              onUndo();
            }}
            className="px-3 py-2 bg-accent hover:bg-accent-hover text-zinc-950 font-black text-xs rounded-xl shadow-xs active:scale-95 flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.confirmCard.undoButton}</span>
          </button>

          <button
            onClick={onDismiss}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg active:scale-95"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

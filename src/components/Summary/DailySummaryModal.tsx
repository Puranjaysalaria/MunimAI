import React from 'react';
import { DailySummaryMetrics } from '../../lib/stockAnalytics';
import { formatINR } from '../../lib/utils';
import { triggerHaptic } from '../../lib/sound';
import { speechSynthesizer } from '../../tts/speechSynthesizer';
import { LanguageCode } from '../../i18n';
import {
  X,
  Volume2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Share2,
  Award,
} from 'lucide-react';

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: DailySummaryMetrics;
  spokenText: string;
  language: LanguageCode;
}

export const DailySummaryModal: React.FC<DailySummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
  spokenText,
  language,
}) => {
  if (!isOpen) return null;

  const handleSpeak = () => {
    triggerHaptic('start');
    speechSynthesizer.speak(spokenText, language);
  };

  const handleShare = () => {
    triggerHaptic('start');
    const today = new Date().toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const shareText = `📊 *मुनीम AI - आज का हिसाब (${today})*\n\n` +
      `💰 कुल नकद बिक्री: ${formatINR(summary.totalSales)}\n` +
      `🔴 नया उधार दिया: ${formatINR(summary.creditGiven)}\n` +
      `🟢 पुराना उधार मिला: ${formatINR(summary.cashCollected)}\n` +
      `🧾 दुकान का खर्च: ${formatINR(summary.expenses)}\n` +
      `✨ *अनुमानित मुनाफ़ा: ${formatINR(summary.estimatedProfit)}*\n\n` +
      `कुल सौदे: ${summary.transactionCount}`;

    if (navigator.share) {
      navigator.share({
        title: 'आज का दैनिक हिसाब',
        text: shareText,
      }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-0 sm:p-4">
      <div className="bg-surface w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-slide-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Award className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-black text-app-text">
                आज का पूरा हिसाब
              </h2>
              <p className="text-xs text-app-muted">
                {summary.transactionCount} लेन-देन दर्ज हुए
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="touch-target-64 p-2 text-gray-400 hover:text-gray-700 active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Profit Card */}
        <div className="bg-primary text-white rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
              दैनिक शुद्ध मुनाफ़ा
            </span>
            <button
              onClick={handleSpeak}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold flex items-center space-x-1 active:scale-95"
            >
              <Volume2 className="w-3.5 h-3.5 text-accent" />
              <span>सुनें</span>
            </button>
          </div>
          <div className="text-3xl font-black mt-1 text-white">
            {formatINR(summary.estimatedProfit)}
          </div>
          <p className="text-[11px] text-emerald-100 mt-1">
            लागत घटाने और 15% अनुमानित मार्जिन के बाद
          </p>
        </div>

        {/* 4 Financial Grid Boxes */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Total Sales */}
          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
            <div className="flex items-center justify-between text-xs text-app-muted font-bold">
              <span>नकद बिक्री</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-700 mt-1">
              {formatINR(summary.totalSales)}
            </p>
          </div>

          {/* Credit Given */}
          <div className="bg-red-50/50 rounded-2xl p-3 border border-red-100">
            <div className="flex items-center justify-between text-xs text-app-muted font-bold">
              <span>उधार दिया</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-owed" />
            </div>
            <p className="text-xl font-black text-owed mt-1">
              {formatINR(summary.creditGiven)}
            </p>
          </div>

          {/* Cash Collected */}
          <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100">
            <div className="flex items-center justify-between text-xs text-app-muted font-bold">
              <span>उधार लौटा</span>
              <ArrowDownLeft className="w-3.5 h-3.5 text-received" />
            </div>
            <p className="text-xl font-black text-received mt-1">
              {formatINR(summary.cashCollected)}
            </p>
          </div>

          {/* Expenses */}
          <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100">
            <div className="flex items-center justify-between text-xs text-app-muted font-bold">
              <span>दुकान खर्च</span>
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-xl font-black text-amber-700 mt-1">
              {formatINR(summary.expenses)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex space-x-2">
          <button
            onClick={handleSpeak}
            className="touch-target-64 flex-1 py-3 bg-accent hover:bg-accent-hover text-app-text font-black text-xs rounded-xl shadow-md active:scale-95 flex items-center justify-center space-x-2"
          >
            <Volume2 className="w-4 h-4" />
            <span>फिर से बोलें (Voice)</span>
          </button>

          <button
            onClick={handleShare}
            className="touch-target-64 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl active:scale-95 flex items-center justify-center space-x-1"
          >
            <Share2 className="w-4 h-4" />
            <span>साझा करें</span>
          </button>
        </div>
      </div>
    </div>
  );
};

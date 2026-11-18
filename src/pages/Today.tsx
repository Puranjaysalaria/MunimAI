import React from 'react';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { formatINR, formatRelativeTime } from '../lib/utils';
import {
  TrendingUp,
  Volume2,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Award,
} from 'lucide-react';
import { triggerHaptic } from '../lib/sound';

interface TodayProps {
  onSpeakSummary: () => void;
}

export const Today: React.FC<TodayProps> = ({ onSpeakSummary }) => {
  const { transactions, customers } = useShop();
  const { t, language } = useI18n();

  // Filter today's transactions
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTxs = transactions.filter((t) => new Date(t.created_at) >= todayStart);

  // Financial aggregations
  const totalSales = todayTxs
    .filter((t) => t.type === 'sale')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const creditGiven = todayTxs
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const cashCollected = todayTxs
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenses = todayTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Estimated gross profit: ~14% average margin on Kirana groceries
  const estimatedProfit = Math.round((totalSales + creditGiven) * 0.15 - expenses);

  const handleSpeakClick = () => {
    triggerHaptic('start');
    onSpeakSummary();
  };

  return (
    <div className="pb-28 px-4 pt-3 max-w-md mx-auto space-y-4">
      {/* Top Hero: Estimated Profit Card */}
      <div className="bg-primary text-white rounded-3xl p-5 shadow-card relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider flex items-center">
            <Award className="w-4 h-4 mr-1 text-accent" />
            {t.today.title}
          </span>
          <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">
            {todayTxs.length} सौदे
          </span>
        </div>

        <div className="mt-3">
          <p className="text-xs text-emerald-100">{t.today.estimatedProfit}</p>
          <div className="text-4xl font-black tracking-tight text-white mt-1">
            {formatINR(Math.max(0, estimatedProfit))}
          </div>
        </div>

        {/* Speak Summary Button */}
        <div className="mt-5 pt-3 border-t border-emerald-700/60 flex items-center justify-between">
          <p className="text-xs text-emerald-100">दिन भर का पूरा हिसाब</p>
          <button
            onClick={handleSpeakClick}
            className="touch-target-64 px-4 py-2 bg-accent hover:bg-accent-hover text-app-text font-black text-xs rounded-xl shadow-md active:scale-95 flex items-center space-x-2"
          >
            <Volume2 className="w-4 h-4 text-zinc-900" />
            <span>{t.today.voiceSummaryButton}</span>
          </button>
        </div>
      </div>

      {/* 4-Box Financial Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cash Sales */}
        <div className="bg-surface rounded-2xl p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between text-app-muted text-xs font-semibold">
            <span>{t.today.totalSales}</span>
            <div className="p-1 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {formatINR(totalSales)}
          </div>
          <p className="text-[10px] text-app-muted mt-0.5">नकद बिक्री</p>
        </div>

        {/* Udhaar Given */}
        <div className="bg-surface rounded-2xl p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between text-app-muted text-xs font-semibold">
            <span>{t.today.creditGiven}</span>
            <div className="p-1 rounded-full bg-red-50 text-owed">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-owed mt-2">
            {formatINR(creditGiven)}
          </div>
          <p className="text-[10px] text-app-muted mt-0.5">खाते में लिखा</p>
        </div>

        {/* Cash Collected on Old Udhaar */}
        <div className="bg-surface rounded-2xl p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between text-app-muted text-xs font-semibold">
            <span>{t.today.cashCollected}</span>
            <div className="p-1 rounded-full bg-emerald-50 text-received">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-received mt-2">
            {formatINR(cashCollected)}
          </div>
          <p className="text-[10px] text-app-muted mt-0.5">पुराना उधार लौटा</p>
        </div>

        {/* Expenses */}
        <div className="bg-surface rounded-2xl p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between text-app-muted text-xs font-semibold">
            <span>{t.today.expenses}</span>
            <div className="p-1 rounded-full bg-amber-50 text-amber-600">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            {formatINR(expenses)}
          </div>
          <p className="text-[10px] text-app-muted mt-0.5">दुकान का खर्च</p>
        </div>
      </div>

      {/* Today's Transactions Timeline */}
      <div className="bg-surface rounded-2xl p-4 shadow-card border border-gray-100">
        <h3 className="font-bold text-sm text-app-text mb-3">
          आज के सभी लेन-देन ({todayTxs.length})
        </h3>

        {todayTxs.length === 0 ? (
          <p className="text-xs text-app-muted text-center py-6">
            आज अभी तक कोई सौदा दर्ज नहीं हुआ है
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {todayTxs.map((tx) => {
              const customer = customers.find((c) => c.id === tx.customer_id);
              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-app-text">
                      {customer?.name || (tx.type === 'sale' ? 'नकद बिक्री' : 'खर्चा')}
                    </p>
                    <p className="text-xs text-app-muted">
                      {tx.voice_transcript || tx.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-base font-bold ${
                        tx.type === 'credit'
                          ? 'text-owed'
                          : tx.type === 'payment'
                          ? 'text-received'
                          : 'text-app-text'
                      }`}
                    >
                      {tx.type === 'credit' ? '+' : tx.type === 'payment' ? '-' : ''}
                      {formatINR(tx.amount)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {formatRelativeTime(tx.created_at, language === 'pa' ? 'pa' : language === 'en' ? 'en' : 'hi')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

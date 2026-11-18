import React from 'react';
import { motion } from 'framer-motion';
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
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { triggerHaptic } from '../lib/sound';
import { CustomerAvatar } from '../components/CustomerAvatar';

interface TodayProps {
  onSpeakSummary: () => void;
}

export const Today: React.FC<TodayProps> = ({ onSpeakSummary }) => {
  const { transactions, customers, user } = useShop();
  const { t, language } = useI18n();
  const isOwner = user?.role !== 'staff';

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

  // Estimated gross profit: ~15% average margin on Kirana groceries
  const estimatedProfit = Math.round((totalSales + creditGiven) * 0.15 - expenses);

  const handleSpeakClick = () => {
    triggerHaptic('start');
    onSpeakSummary();
  };

  return (
    <div className="pb-32 px-4 pt-3 max-w-md mx-auto space-y-4 select-none">
      {/* Top Hero: Estimated Profit Card */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-950 via-primary to-emerald-900 text-white rounded-3xl p-6 shadow-card relative overflow-hidden border border-emerald-800/40"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-emerald-200 uppercase tracking-wider flex items-center">
            <Award className="w-4 h-4 mr-1 text-accent" />
            {t.today.title}
          </span>
          <span className="text-xs bg-white/15 px-3 py-1 rounded-full font-black border border-white/20">
            {todayTxs.length} कुल सौदे
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs text-emerald-200 font-semibold">{t.today.estimatedProfit}</p>
          <div className="text-4xl font-black tracking-tight text-white mt-1">
            {isOwner ? formatINR(Math.max(0, estimatedProfit)) : '••••••'}
          </div>
          {!isOwner ? (
            <p className="text-[11px] text-emerald-300 mt-1">
              (स्टाफ मोड: शुद्ध मुनाफा केवल दुकान मालिक को दिखता है)
            </p>
          ) : (
            <p className="text-[11px] text-emerald-300 mt-1 font-semibold flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-accent" />
              किराना औसत मुनाफ़ा ~15% मार्जिन
            </p>
          )}
        </div>

        {/* Speak Summary Button */}
        <div className="mt-5 pt-3.5 border-t border-emerald-800/60 flex items-center justify-between">
          <p className="text-xs text-emerald-200 font-semibold">दिन भर का पूरा हिसाब सुनें</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={handleSpeakClick}
            className="touch-target-64 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-md flex items-center space-x-2 border border-amber-300"
          >
            <Volume2 className="w-4 h-4 text-slate-950" />
            <span>{t.today.voiceSummaryButton}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* 4-Box Financial Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cash Sales */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-3xl p-4 shadow-card border border-emerald-100 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>{t.today.totalSales}</span>
            <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-3 tracking-tight">
            {formatINR(totalSales)}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">नकद बिक्री</p>
        </motion.div>

        {/* Udhaar Given */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-3xl p-4 shadow-card border border-rose-100 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>{t.today.creditGiven}</span>
            <div className="p-1.5 rounded-xl bg-rose-50 text-owed">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-owed mt-3 tracking-tight">
            {formatINR(creditGiven)}
          </div>
          <p className="text-[11px] text-rose-600 font-semibold mt-0.5">नया उधार दिया</p>
        </motion.div>

        {/* Cash Collected on Old Udhaar */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-3xl p-4 shadow-card border border-emerald-100 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>{t.today.cashCollected}</span>
            <div className="p-1.5 rounded-xl bg-emerald-50 text-received">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-received mt-3 tracking-tight">
            {formatINR(cashCollected)}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">पुराना उधार लौटा</p>
        </motion.div>

        {/* Expenses */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-3xl p-4 shadow-card border border-amber-100 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>{t.today.expenses}</span>
            <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-3 tracking-tight">
            {formatINR(expenses)}
          </div>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">दुकान का खर्चा</p>
        </motion.div>
      </div>

      {/* Today's Transactions Timeline */}
      <div className="bg-white rounded-3xl p-5 shadow-card border border-gray-100">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-black text-sm text-slate-900">
            आज के सभी लेन-देन ({todayTxs.length})
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-gray-100 px-2 py-0.5 rounded-full">
            समय अनुसार
          </span>
        </div>

        {todayTxs.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-600">आज अभी तक कोई सौदा दर्ज नहीं हुआ</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {todayTxs.map((tx) => {
              const customer = customers.find((c) => c.id === tx.customer_id);
              const isOwed = tx.type === 'credit';
              const isPayment = tx.type === 'payment';

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {customer ? (
                      <CustomerAvatar
                        name={customer.name}
                        size="sm"
                        trustScore={customer.trust_score}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                        🛒
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {customer?.name || (tx.type === 'sale' ? 'नकद बिक्री' : 'दुकान खर्चा')}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        {tx.voice_transcript || tx.type}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-base font-black ${
                        isOwed
                          ? 'text-owed'
                          : isPayment
                          ? 'text-received'
                          : 'text-slate-900'
                      }`}
                    >
                      {isOwed ? '+' : isPayment ? '-' : ''}
                      {formatINR(tx.amount)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {formatRelativeTime(
                        tx.created_at,
                        language === 'pa' ? 'pa' : language === 'en' ? 'en' : 'hi'
                      )}
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

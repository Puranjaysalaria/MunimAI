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
  CircleDollarSign,
} from 'lucide-react';
import { triggerHaptic, playAudioCue } from '../lib/sound';
import { CustomerAvatar } from '../components/CustomerAvatar';
import { getLocalizedCustomerName, getLocalizedTransactionDesc } from '../lib/nameTranslation';

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

  const totalInflow = totalSales + cashCollected;
  const cashRatio = totalInflow + creditGiven > 0
    ? Math.round((totalInflow / (totalInflow + creditGiven)) * 100)
    : 100;

  const handleSpeakClick = () => {
    triggerHaptic('start');
    playAudioCue('start');
    onSpeakSummary();
  };

  const ProfitHero = (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-emerald-950 via-primary to-emerald-900 text-white rounded-3xl p-6 shadow-card relative overflow-hidden border border-emerald-800/40 card-hover-elevate"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-emerald-200 uppercase tracking-wider flex items-center">
          <Award className="w-4 h-4 mr-1.5 text-accent" />
          {t.today.title}
        </span>
        <span className="text-xs bg-white/15 px-3 py-1 rounded-full font-black border border-white/20">
          {todayTxs.length} {t.today.totalDeals}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-xs text-emerald-200 font-semibold">{t.today.estimatedProfit}</p>
        <div className="text-4xl sm:text-5xl font-black tracking-tight text-white mt-1">
          {isOwner ? formatINR(Math.max(0, estimatedProfit)) : '••••••'}
        </div>
        {!isOwner ? (
          <p className="text-[11px] text-emerald-300 mt-1">
            {t.today.staffMarginNotice}
          </p>
        ) : (
          <p className="text-[11px] text-emerald-300 mt-1 font-semibold flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-accent" />
            {t.today.groceriesMargin}
          </p>
        )}
      </div>

      {/* Speak Summary Button */}
      <div className="mt-5 pt-3.5 border-t border-emerald-800/60 flex items-center justify-between">
        <p className="text-xs text-emerald-200 font-semibold">{t.today.listenDaySummary}</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={handleSpeakClick}
          className="touch-target-64 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-md flex items-center space-x-2 border border-amber-300"
        >
          <Volume2 className="w-4 h-4 text-slate-950" />
          <span>{t.today.voiceSummaryButton}</span>
        </motion.button>
      </div>
    </motion.div>
  );

  const CashflowMeter = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-3xl p-5 shadow-card border border-gray-100 space-y-3 card-hover-elevate"
    >
      <div className="flex items-center justify-between text-xs font-black text-slate-700">
        <span className="flex items-center">
          <CircleDollarSign className="w-4 h-4 mr-1.5 text-emerald-600" />
          {t.today.storeHealth}: {cashRatio}% {t.today.cashRatio}
        </span>
        <span className="text-[11px] font-bold text-slate-500">
          {cashRatio >= 70 ? t.today.greatHealth : t.today.highUdhaar}
        </span>
      </div>
      <div className="w-full bg-rose-100 rounded-full h-3 overflow-hidden flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${cashRatio}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="h-full bg-emerald-500 rounded-full"
        />
      </div>
      <div className="flex justify-between text-[11px] text-slate-500 font-bold px-0.5">
        <span className="text-emerald-700">{t.today.cashCounter} ({cashRatio}%)</span>
        <span className="text-rose-600">{t.today.udhaarShare} ({100 - cashRatio}%)</span>
      </div>
    </motion.div>
  );

  const FinancialGrid = (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {/* Cash Sales */}
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-white rounded-3xl p-4 sm:p-5 shadow-card border border-emerald-100 flex flex-col justify-between card-hover-elevate"
      >
        <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
          <span>{t.today.totalSales}</span>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-3 tracking-tight">
          {formatINR(totalSales)}
        </div>
        <p className="text-[11px] sm:text-xs text-emerald-600 font-semibold mt-0.5">{t.today.cashSaleLabel}</p>
      </motion.div>

      {/* Udhaar Given */}
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-white rounded-3xl p-4 sm:p-5 shadow-card border border-rose-100 flex flex-col justify-between card-hover-elevate"
      >
        <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
          <span>{t.today.creditGiven}</span>
          <div className="p-2 rounded-xl bg-rose-50 text-owed">
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-owed mt-3 tracking-tight">
          {formatINR(creditGiven)}
        </div>
        <p className="text-[11px] sm:text-xs text-rose-600 font-semibold mt-0.5">{t.today.newUdhaarGiven}</p>
      </motion.div>

      {/* Cash Collected on Old Udhaar */}
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-white rounded-3xl p-4 sm:p-5 shadow-card border border-emerald-100 flex flex-col justify-between card-hover-elevate"
      >
        <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
          <span>{t.today.cashCollected}</span>
          <div className="p-2 rounded-xl bg-emerald-50 text-received">
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-received mt-3 tracking-tight">
          {formatINR(cashCollected)}
        </div>
        <p className="text-[11px] sm:text-xs text-emerald-600 font-semibold mt-0.5">{t.today.oldUdhaarReceived}</p>
      </motion.div>

      {/* Expenses */}
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-white rounded-3xl p-4 sm:p-5 shadow-card border border-amber-100 flex flex-col justify-between card-hover-elevate"
      >
        <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
          <span>{t.today.expenses}</span>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <Receipt className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-3 tracking-tight">
          {formatINR(expenses)}
        </div>
        <p className="text-[11px] sm:text-xs text-amber-600 font-semibold mt-0.5">{t.today.shopExpenseLabel}</p>
      </motion.div>
    </div>
  );

  const TransactionsTimeline = (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-card border border-gray-100">
      <div className="flex items-center justify-between mb-3.5 px-1">
        <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
          {t.today.allTransactionsToday} ({todayTxs.length})
        </h3>
        <span className="text-xs font-bold text-slate-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
          {t.today.byTime}
        </span>
      </div>

      {todayTxs.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600">{t.today.noDealsToday}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto">
          {todayTxs.map((tx, idx) => {
            const customer = customers.find((c) => c.id === tx.customer_id);
            const isOwed = tx.type === 'credit';
            const isPayment = tx.type === 'payment';

            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.2 }}
                className="py-3.5 flex items-center justify-between hover:bg-gray-50/60 rounded-xl px-1.5 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {customer ? (
                    <CustomerAvatar
                      name={getLocalizedCustomerName(customer.name, language)}
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
                      {customer ? getLocalizedCustomerName(customer.name, language) : (tx.type === 'sale' ? t.today.cashSaleLabel : t.today.shopExpenseLabel)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {getLocalizedTransactionDesc(tx, customer?.name, language)}
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
                    {formatRelativeTime(tx.created_at, language)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="pb-32 md:pb-12 px-4 sm:px-6 lg:px-8 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto space-y-6 pt-3 select-none">
      {/* Responsive Grid for Laptop / Desktop (lg:) */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Profit Hero & Cashflow Meter */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
          {ProfitHero}
          {CashflowMeter}
        </div>

        {/* Right Column: 4-Box Grid & Transactions Feed */}
        <div className="lg:col-span-7 space-y-5">
          {FinancialGrid}
          {TransactionsTimeline}
        </div>
      </div>

      {/* Mobile Flow (< lg) */}
      <div className="lg:hidden space-y-4">
        {ProfitHero}
        {FinancialGrid}
        {CashflowMeter}
        {TransactionsTimeline}
      </div>
    </div>
  );
};

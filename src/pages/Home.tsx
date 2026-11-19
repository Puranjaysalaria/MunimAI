import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { formatINR, formatRelativeTime } from '../lib/utils';
import {
  Mic,
  TrendingUp,
  AlertTriangle,
  Send,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingBag,
  Volume2,
  RotateCcw,
  Clock,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { triggerHaptic, playAudioCue } from '../lib/sound';
import { LiveWaveform } from '../components/Voice/LiveWaveform';
import { CustomerAvatar } from '../components/CustomerAvatar';

interface HomeProps {
  onStartVoice: () => void;
  onTextSubmit: (text: string) => void;
  isListening: boolean;
  voiceState: 'idle' | 'listening' | 'thinking' | 'success' | 'error';
  liveTranscript: string;
  errorMessage: string | null;
  onRetryVoice: () => void;
  onSelectCustomerSuggestion: (name: string) => void;
}

export const Home: React.FC<HomeProps> = ({
  onStartVoice,
  onTextSubmit,
  isListening,
  voiceState,
  liveTranscript,
  errorMessage,
  onRetryVoice,
  onSelectCustomerSuggestion,
}) => {
  const { customers, items, transactions } = useShop();
  const { t, language } = useI18n();
  const [manualText, setManualText] = useState('');

  // Calculate quick stats
  const totalUdhaar = customers.reduce((sum, c) => sum + Number(c.balance_owed), 0);
  const lowStockItems = items.filter((it) => it.current_stock <= it.min_threshold);

  // Today transactions
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTxs = transactions.filter((t) => new Date(t.created_at) >= todayStart);
  const todaySales = todayTxs
    .filter((t) => t.type === 'sale')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualText.trim()) {
      triggerHaptic('start');
      playAudioCue('start');
      onTextSubmit(manualText.trim());
      setManualText('');
    }
  };

  const handleMicClick = () => {
    triggerHaptic('start');
    playAudioCue('start');
    onStartVoice();
  };

  // Curated quick voice prompts
  const quickPrompts = [
    { icon: '⚡', label: 'रमेश को ₹500 उधार', prompt: 'रमेश को 500 का उधार लिख दो' },
    { icon: '🥛', label: '2 पैकेट दूध और चीनी', prompt: '2 पैकेट दूध और 1 किलो चीनी नकद' },
    { icon: '💰', label: 'सुनीता से ₹350 जमा', prompt: 'सुनीता ने 350 रुपये जमा किए' },
    { icon: '📊', label: 'आज की कुल कमाई', prompt: 'आज की कमाई बताओ' },
    { icon: '📦', label: 'स्टॉक चेक करें', prompt: 'स्टॉक दिखाओ' },
  ];

  // Recent 6 transactions
  const recentTxs = transactions.slice(0, 6);

  // Sub-components for flexible responsive ordering
  const MetricCards = (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {/* Today's Sales Card */}
      <motion.div
        whileHover={{ y: -3, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border border-emerald-200/80 shadow-card flex flex-col justify-between card-hover-elevate cursor-pointer"
      >
        <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
          <span>{t.today.totalSales}</span>
          <div className="w-8 h-8 rounded-2xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center shadow-xs">
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="mt-3 sm:mt-4">
          <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight block">
            {formatINR(todaySales)}
          </span>
          <span className="text-[11px] sm:text-xs text-emerald-600/90 font-semibold flex items-center mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 inline-block animate-pulse" />
            {t.home.todaysSales}
          </span>
        </div>
      </motion.div>

      {/* Market Udhaar Owed Card */}
      <motion.div
        whileHover={{ y: -3, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-rose-50 via-white to-rose-50/50 border border-rose-200/80 shadow-card flex flex-col justify-between card-hover-elevate cursor-pointer"
      >
        <div className="flex items-center justify-between text-xs font-bold text-rose-800">
          <span>{t.ledger.totalOwed}</span>
          <div className="w-8 h-8 rounded-2xl bg-rose-100/90 text-owed flex items-center justify-center shadow-xs">
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="mt-3 sm:mt-4">
          <span className="text-2xl sm:text-3xl font-black text-owed tracking-tight block">
            {formatINR(totalUdhaar)}
          </span>
          <span className="text-[11px] sm:text-xs text-rose-600/90 font-semibold flex items-center mt-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5 inline-block" />
            {t.home.marketUdhaar}
          </span>
        </div>
      </motion.div>
    </div>
  );

  const StockAlert = lowStockItems.length > 0 && (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-2xl p-3.5 flex items-center justify-between shadow-xs card-hover-elevate"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs flex-shrink-0 animate-pulse">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-black text-amber-950">
            {lowStockItems[0].name.toUpperCase()} {t.stock.lowStockNotice}
          </p>
          <p className="text-[11px] text-amber-800 font-medium">
            {lowStockItems[0].current_stock} {lowStockItems[0].unit} ({lowStockItems[0].days_stock_left} {t.home.daysLeftRemaining})
          </p>
        </div>
      </div>
      <span className="text-[11px] font-black text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-lg border border-amber-300">
        {t.home.supplierList}
      </span>
    </motion.div>
  );

  const VoiceCenterpiece = (
    <div className="relative rounded-[32px] p-6 bg-gradient-to-b from-white via-white to-gray-50/80 border border-emerald-900/10 shadow-float text-center overflow-hidden">
      {/* Atmospheric ambient glow */}
      {isListening ? (
        <div className="absolute inset-0 bg-gradient-to-b from-blue-100/50 via-indigo-50/30 to-transparent pointer-events-none transition-opacity duration-500" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/30 via-transparent to-transparent pointer-events-none" />
      )}

      <div className="relative z-10 flex flex-col items-center">
        {/* Status Capsule Badge */}
        <motion.div
          layout
          className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-black mb-3 border shadow-xs"
          style={{
            backgroundColor:
              voiceState === 'listening'
                ? 'rgba(239, 246, 255, 0.95)'
                : voiceState === 'thinking'
                ? 'rgba(254, 243, 199, 0.95)'
                : voiceState === 'success'
                ? 'rgba(209, 250, 229, 0.95)'
                : 'rgba(243, 244, 246, 0.95)',
            borderColor:
              voiceState === 'listening'
                ? 'rgba(147, 197, 253, 0.7)'
                : voiceState === 'thinking'
                ? 'rgba(252, 211, 77, 0.7)'
                : voiceState === 'success'
                ? 'rgba(110, 231, 183, 0.7)'
                : 'rgba(229, 231, 235, 0.8)',
          }}
        >
          {voiceState === 'listening' ? (
            <span className="text-blue-600 flex items-center">
              <Volume2 className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
              {t.voice.listening}
            </span>
          ) : voiceState === 'thinking' ? (
            <span className="text-amber-700 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              {t.voice.thinking}
            </span>
          ) : voiceState === 'success' ? (
            <span className="text-emerald-700 flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              {t.voice.success}
            </span>
          ) : (
            <span className="text-slate-800 flex items-center">
              <Zap className="w-3.5 h-3.5 mr-1.5 text-accent fill-accent" />
              {t.voice.tapToSpeak}
            </span>
          )}
        </motion.div>

        {/* Living Microphone Orb with Staggered Soundwave Rings */}
        <div className="relative my-4 flex items-center justify-center">
          {isListening ? (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-blue-400 pointer-events-none"
                initial={{ scale: 1, opacity: 0.9 }}
                animate={{ scale: 1.65, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-indigo-400 pointer-events-none"
                initial={{ scale: 1, opacity: 0.9 }}
                animate={{ scale: 2.1, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.35 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-cyan-400 pointer-events-none"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 2.6, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.7 }}
              />
            </>
          ) : (
            <motion.div
              animate={{
                scale: [1, 1.14, 1],
                opacity: [0.35, 0.65, 0.35],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -inset-4 rounded-full bg-gradient-to-r from-amber-400/30 via-yellow-400/30 to-amber-500/30 blur-lg pointer-events-none"
            />
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            animate={!isListening ? { y: [0, -3, 0] } : {}}
            transition={{
              y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
              type: 'spring',
              stiffness: 400,
              damping: 20,
            }}
            onClick={handleMicClick}
            className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 relative z-10 border-4 border-white select-none ${
              isListening
                ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white shadow-listening ring-4 ring-blue-300/60'
                : 'bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-mic-hero'
            }`}
            style={{
              boxShadow: isListening
                ? '0 0 50px rgba(59, 130, 246, 0.6), inset 0 2px 6px rgba(255, 255, 255, 0.5)'
                : '0 16px 40px -4px rgba(245, 158, 11, 0.5), inset 0 2px 6px rgba(255, 255, 255, 0.6)',
            }}
            aria-label={t.voice.tapToSpeak}
          >
            <Mic
              className={`w-12 h-12 transition-all ${
                isListening
                  ? 'scale-110 text-white animate-pulse stroke-[2.6]'
                  : 'text-slate-950 stroke-[2.5]'
              }`}
            />
          </motion.button>
        </div>

        {/* Live Soundwave Frequency Bars */}
        <LiveWaveform isListening={isListening} />

        {/* Live Transcript / Feedback Banner */}
        <div className="mt-2 min-h-[50px] flex items-center justify-center w-full px-1">
          <AnimatePresence mode="wait">
            {liveTranscript ? (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full bg-gradient-to-r from-blue-50/95 to-indigo-50/95 py-3 px-4 rounded-2xl border border-blue-200/90 shadow-xs"
              >
                <p className="text-sm font-black text-slate-800 leading-snug">
                  "{liveTranscript}"
                </p>
              </motion.div>
            ) : errorMessage ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-rose-50/90 border border-rose-200 py-2.5 px-4 rounded-2xl flex items-center justify-between w-full shadow-xs"
              >
                <div className="text-left pr-2">
                  <p className="text-xs font-bold text-owed">{errorMessage}</p>
                  <p className="text-[10px] text-rose-600 font-medium">साफ़ आवाज़ में दोबारा बोलें</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    triggerHaptic('start');
                    onRetryVoice();
                  }}
                  className="px-3.5 py-1.5 bg-owed text-white rounded-xl text-xs font-black flex items-center space-x-1 shadow-xs flex-shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.voice.retry}</span>
                </motion.button>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-slate-500 font-medium leading-relaxed"
              >
                {t.home.speakExample}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  const QuickPrompts = (
    <div>
      <div className="flex items-center justify-between mb-2.5 px-1">
        <span className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-accent" />
          {t.home.quickActionsTitle}
        </span>
        <span className="text-[11px] font-bold text-primary">{t.home.tapHere} ⚡</span>
      </div>

      <div className="flex space-x-2.5 overflow-x-auto pb-1.5 no-scrollbar">
        {quickPrompts.map((item, idx) => (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              triggerHaptic('start');
              playAudioCue('start');
              onTextSubmit(item.prompt);
            }}
            className={`flex-shrink-0 px-4 py-2.5 rounded-2xl bg-white hover:bg-emerald-50/60 border border-gray-200/90 text-xs font-bold text-slate-800 shadow-xs flex items-center space-x-2 transition-all active:border-primary card-hover-elevate ${
              idx === 0 ? 'border-primary/40 ring-2 ring-primary/10' : ''
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="whitespace-nowrap font-black">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );

  const KeyboardForm = (
    <form
      onSubmit={handleManualSubmit}
      className="bg-white rounded-2xl p-1.5 pl-3.5 shadow-xs border border-gray-200/90 flex items-center focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all"
    >
      <input
        type="text"
        value={manualText}
        onChange={(e) => setManualText(e.target.value)}
        placeholder={t.voice.typePlaceholder}
        className="flex-1 py-2 text-sm text-slate-800 bg-transparent placeholder:text-slate-400 focus:outline-none font-medium"
      />
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        type="submit"
        disabled={!manualText.trim()}
        className="p-2.5 bg-primary hover:bg-emerald-800 disabled:opacity-30 text-white rounded-xl shadow-xs transition-all flex-shrink-0"
        title={t.home.submitEntry}
      >
        <Send className="w-4 h-4" />
      </motion.button>
    </form>
  );

  const CustomerChips = customers.length > 0 && (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
          {t.voice.recentSuggestions}
        </span>
        <span className="text-[11px] font-bold text-slate-400">{t.home.customerKhata}</span>
      </div>

      <div className="flex space-x-2.5 overflow-x-auto pb-1 no-scrollbar">
        {customers.slice(0, 8).map((cust) => (
          <motion.button
            key={cust.id}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              triggerHaptic('start');
              playAudioCue('start');
              onSelectCustomerSuggestion(cust.name);
            }}
            className="flex-shrink-0 px-3.5 py-2.5 bg-white hover:bg-emerald-50/40 border border-gray-200 rounded-2xl text-xs font-bold text-slate-800 shadow-xs flex items-center space-x-2.5 card-hover-elevate"
          >
            <CustomerAvatar name={cust.name} size="sm" trustScore={cust.trust_score} />
            <div className="text-left">
              <span className="block leading-tight font-black">{cust.name}</span>
              {cust.balance_owed > 0 ? (
                <span className="text-[10px] font-black text-owed block mt-0.5">
                  ₹{cust.balance_owed} {t.ledger.customerBalanceOwed}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-emerald-600 block mt-0.5">
                  {t.ledger.accountSettled}
                </span>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );

  const RecentFeed = (
    <div className="bg-white rounded-[28px] p-5 shadow-card border border-gray-100">
      <div className="flex items-center justify-between mb-3.5 px-1">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-primary flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <h2 className="text-sm font-black text-slate-900">{t.home.recentActivity}</h2>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
          {recentTxs.length} {t.today.totalDeals}
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {recentTxs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            {t.home.noActivity}
          </div>
        ) : (
          recentTxs.map((tx, idx) => {
            const customer = customers.find((c) => c.id === tx.customer_id);
            const isOwed = tx.type === 'credit';
            const isPayment = tx.type === 'payment';
            const isSale = tx.type === 'sale';

            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.25 }}
                className="py-3 flex items-center justify-between group hover:bg-gray-50/60 rounded-xl px-1 transition-colors"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  {customer ? (
                    <CustomerAvatar
                      name={customer.name}
                      size="md"
                      trustScore={customer.trust_score}
                      showBadge
                    />
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                        isOwed
                          ? 'bg-rose-100 text-owed'
                          : isPayment
                          ? 'bg-emerald-100 text-received'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {isOwed ? (
                        <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                      ) : isPayment ? (
                        <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                      )}
                    </div>
                  )}

                  <div className="truncate">
                    <p className="text-sm font-black text-slate-900 truncate">
                      {customer ? customer.name : isSale ? t.today.cashSaleLabel : t.today.shopExpenseLabel}
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-[170px] sm:max-w-xs mt-0.5 font-medium">
                      {tx.voice_transcript ||
                        (tx.items?.map((i) => i.name).join(', ') ?? t.today.txCount)}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 pl-2">
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
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="pb-32 md:pb-12 px-4 sm:px-6 lg:px-8 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto pt-3 select-none">
      {/* 
        Mobile Layout (< lg): Natural vertical linear flow as seen in mobile phones
        Desktop Layout (>= lg): Balanced 2-column Executive Dashboard
      */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column on Laptop (Voice Command Hub) */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
          {StockAlert}
          {VoiceCenterpiece}
          {QuickPrompts}
          {KeyboardForm}
        </div>

        {/* Right Column on Laptop (Financial Stats & Feed) */}
        <div className="lg:col-span-7 space-y-5">
          {MetricCards}
          {CustomerChips}
          {RecentFeed}
        </div>
      </div>

      {/* Mobile & Tablet Flow (< lg) */}
      <div className="lg:hidden space-y-4">
        {MetricCards}
        {StockAlert}
        {VoiceCenterpiece}
        {QuickPrompts}
        {KeyboardForm}
        {CustomerChips}
        {RecentFeed}
      </div>
    </div>
  );
};

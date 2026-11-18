import React, { useState } from 'react';
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
} from 'lucide-react';
import { triggerHaptic } from '../lib/sound';
import { LiveWaveform } from '../components/Voice/LiveWaveform';

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
      onTextSubmit(manualText.trim());
      setManualText('');
    }
  };

  const handleMicClick = () => {
    triggerHaptic('start');
    onStartVoice();
  };

  // Recent 3 transactions
  const recentTxs = transactions.slice(0, 4);

  return (
    <div className="pb-28 px-4 pt-3 max-w-md mx-auto space-y-4">
      {/* Quick Summary Banners */}
      <div className="grid grid-cols-2 gap-3">
        {/* Today's Sales */}
        <div className="bg-surface rounded-2xl p-4 shadow-card border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-app-muted text-xs font-semibold">
            <span>{t.today.totalSales}</span>
            <div className="p-1 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-700 tracking-tight">
              {formatINR(todaySales)}
            </span>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">आज की नकद कमाई</p>
          </div>
        </div>

        {/* Total Udhaar Due */}
        <div className="bg-surface rounded-2xl p-4 shadow-card border border-red-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-app-muted text-xs font-semibold">
            <span>{t.ledger.totalOwed}</span>
            <div className="p-1 rounded-full bg-red-50 text-owed">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-owed tracking-tight">
              {formatINR(totalUdhaar)}
            </span>
            <p className="text-[11px] text-red-500 font-medium mt-0.5">बाजार में बाकी</p>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Alert if any */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-xl flex-shrink-0 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                {lowStockItems[0].name.toUpperCase()} {t.stock.lowStockNotice}
              </p>
              <p className="text-[11px] text-amber-700">
                सिर्फ {lowStockItems[0].current_stock} {lowStockItems[0].unit} बाकी ({lowStockItems[0].days_stock_left} दिन)
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-200/60 px-2.5 py-1 rounded-lg">
            आर्डर करें
          </span>
        </div>
      )}

      {/* Voice Assistant Centerpiece */}
      <div className="bg-surface rounded-3xl p-6 shadow-card border border-gray-100 text-center relative overflow-hidden">
        {/* Ambient background glow when listening */}
        {isListening && (
          <div className="absolute inset-0 bg-blue-50/50 pointer-events-none transition-opacity" />
        )}

        <div className="relative z-10 flex flex-col items-center">
          {/* Status Label */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 bg-gray-100 text-app-text">
            {voiceState === 'listening' ? (
              <span className="text-listening animate-pulse flex items-center">
                <Volume2 className="w-3.5 h-3.5 mr-1" />
                {t.voice.listening}
              </span>
            ) : voiceState === 'thinking' ? (
              <span className="text-amber-600 flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1 animate-spin" />
                {t.voice.thinking}
              </span>
            ) : voiceState === 'success' ? (
              <span className="text-received font-bold">{t.voice.success}</span>
            ) : (
              <span>{t.voice.tapToSpeak}</span>
            )}
          </div>

          {/* Large Saffron Mic Button (Bottom center hero) */}
          <div className="relative my-2">
            {/* Pulsing ring for listening */}
            {isListening && (
              <div className="absolute inset-0 rounded-full animate-pulse-mic" />
            )}

            <button
              onClick={handleMicClick}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-mic active:scale-90 select-none ${
                isListening
                  ? 'bg-listening text-white ring-8 ring-blue-200'
                  : 'bg-accent hover:bg-accent-hover text-app-text'
              }`}
              aria-label={t.voice.tapToSpeak}
            >
              <Mic
                className={`w-11 h-11 transition-transform ${
                  isListening ? 'scale-110 text-white animate-pulse' : 'text-zinc-900'
                }`}
              />
            </button>
          </div>

          {/* Live Waveform when listening */}
          <LiveWaveform isListening={isListening} />

          {/* Live Transcript or Example Prompts */}
          <div className="mt-4 min-h-[44px] flex items-center justify-center w-full px-2">
            {liveTranscript ? (
              <p className="text-base font-bold text-app-text bg-gray-50 py-2 px-3 rounded-xl border border-gray-200 animate-fadeIn">
                "{liveTranscript}"
              </p>
            ) : errorMessage ? (
              <div className="space-y-1">
                <p className="text-xs font-bold text-owed">{errorMessage}</p>
                <button
                  onClick={onRetryVoice}
                  className="text-xs font-bold text-primary underline"
                >
                  {t.voice.retry}
                </button>
              </div>
            ) : (
              <p className="text-xs text-app-muted italic">
                बोलें: "रमेश को 500 का उधार" या "आज 5 किलो चीनी बेची"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Text-Box Fallback */}
      <form onSubmit={handleManualSubmit} className="bg-surface rounded-2xl p-2.5 shadow-xs border border-gray-200 flex items-center">
        <input
          type="text"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder={t.voice.typePlaceholder}
          className="flex-1 px-3 py-2 text-sm text-app-text bg-transparent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!manualText.trim()}
          className="p-2.5 bg-primary hover:bg-primary-dark disabled:opacity-30 text-white rounded-xl transition-all active:scale-95 flex-shrink-0"
          title="Submit entry"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Quick Customer Chips (suggestions) */}
      <div>
        <p className="text-xs font-bold text-app-muted mb-2 px-1">
          {t.voice.recentSuggestions}
        </p>
        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {customers.slice(0, 5).map((cust) => (
            <button
              key={cust.id}
              onClick={() => {
                triggerHaptic('start');
                onSelectCustomerSuggestion(cust.name);
              }}
              className="flex-shrink-0 px-3 py-2 bg-surface hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-app-text shadow-xs active:scale-95 flex items-center space-x-1"
            >
              <span>{cust.name}</span>
              {cust.balance_owed > 0 && (
                <span className="text-[10px] text-owed">₹{cust.balance_owed}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Ledger Activity */}
      <div className="bg-surface rounded-2xl p-4 shadow-card border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-app-text">हाल के सौदे (Recent Activity)</h2>
          <span className="text-xs text-app-muted">{recentTxs.length} लेन-देन</span>
        </div>

        <div className="divide-y divide-gray-100">
          {recentTxs.map((tx) => {
            const customer = customers.find((c) => c.id === tx.customer_id);
            const isOwed = tx.type === 'credit';
            const isPayment = tx.type === 'payment';
            const isSale = tx.type === 'sale';

            return (
              <div key={tx.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isOwed
                        ? 'bg-red-50 text-owed'
                        : isPayment
                        ? 'bg-emerald-50 text-received'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {isOwed ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : isPayment ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ShoppingBag className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-app-text">
                      {customer ? customer.name : isSale ? 'नकद बिक्री' : 'खर्चा'}
                    </p>
                    <p className="text-xs text-app-muted truncate max-w-[180px]">
                      {tx.voice_transcript || (tx.items?.map((i) => i.name).join(', ') ?? 'लेन-देन')}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-base font-bold ${
                      isOwed ? 'text-owed' : isPayment ? 'text-received' : 'text-app-text'
                    }`}
                  >
                    {isOwed ? '+' : isPayment ? '-' : ''}
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
      </div>
    </div>
  );
};

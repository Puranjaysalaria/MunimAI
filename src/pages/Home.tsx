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
import { getLocalizedCustomerName, getLocalizedTransactionDesc } from '../lib/nameTranslation';

interface HomeProps {
  onStartVoice: () => void;
  onTextSubmit: (text: string) => void;
  isListening: boolean;
  voiceState: 'idle' | 'listening' | 'thinking' | 'success' | 'error';
  liveTranscript: string;
  errorMessage: string | null;
  onRetryVoice: () => void;
  onSelectCustomerSuggestion: (name: string) => void;
  onOpenSupplierOrders?: () => void;
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
  onOpenSupplierOrders,
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

  // Curated quick voice prompts localized dynamically
  const quickPrompts = React.useMemo(() => {
    if (language === 'en') {
      return [
        { icon: '⚡', label: 'Ramesh ₹500 Udhaar', prompt: 'Ramesh ko 500 ka udhaar likh do' },
        { icon: '🥛', label: '2 Packets Milk & Sugar', prompt: '2 packet doodh aur 1 kilo chini cash' },
        { icon: '💰', label: 'Sunita ₹350 Payment', prompt: 'Sunita ne 350 rupaye jama kiye' },
        { icon: '📊', label: "Today's Total Sales", prompt: 'Aaj ki kamai batao' },
        { icon: '📦', label: 'Check Stock', prompt: 'Stock dikhao' },
      ];
    }
    if (language === 'pa') {
      return [
        { icon: '⚡', label: 'ਰਮੇਸ਼ ਨੂੰ ₹500 ਉਧਾਰ', prompt: 'ਰਮੇਸ਼ ਨੂੰ 500 ਰੁਪਏ ਉਧਾਰ ਲਿਖ ਦਿਓ' },
        { icon: '🥛', label: '2 ਪੈਕੇਟ ਦੁੱਧ ਤੇ ਖੰਡ', prompt: '2 ਪੈਕੇਟ ਦੁੱਧ ਅਤੇ 1 ਕਿਲੋ ਖੰਡ ਨਕਦ' },
        { icon: '💰', label: 'ਸੁਨੀਤਾ ਤੋਂ ₹350 ਜਮ੍ਹਾ', prompt: 'ਸੁਨੀਤਾ ਨੇ 350 ਰੁਪਏ ਜਮ੍ਹਾ ਕਰਵਾਏ' },
        { icon: '📊', label: 'ਅੱਜ ਦੀ ਕੁੱਲ ਕਮਾਈ', prompt: 'ਅੱਜ ਦੀ ਕਮਾਈ ਦੱਸੋ' },
        { icon: '📦', label: 'ਸਟਾਕ ਚੈੱਕ ਕਰੋ', prompt: 'ਸਟਾਕ ਦਿਖਾਓ' },
      ];
    }
    if (language === 'gu') {
      return [
        { icon: '⚡', label: 'રમેશને ₹500 ઉધાર', prompt: 'રમેશને 500 નું ઉધાર લખી દો' },
        { icon: '🥛', label: '2 પેકેટ દૂધ અને ખાંડ', prompt: '2 પેકેટ દૂધ અને 1 કિલો ખાંડ રોકડ' },
        { icon: '💰', label: 'સુનીતા પાસેથી ₹350 જમા', prompt: 'સુનીતાએ 350 રૂપિયા જમા કર્યા' },
        { icon: '📊', label: 'આજની કમાણી', prompt: 'આજની કમાણી બતાવો' },
        { icon: '📦', label: 'સ્ટોક તપાસો', prompt: 'સ્ટોક બતાવો' },
      ];
    }
    if (language === 'mr') {
      return [
        { icon: '⚡', label: 'रमेशला ₹500 उधार', prompt: 'रमेशला 500 रुपये उधार लिहून घ्या' },
        { icon: '🥛', label: '2 पॅकेट दूध आणि साखर', prompt: '2 पॅकेट दूध आणि 1 किलो साखर रोख' },
        { icon: '💰', label: 'सुनीताकडून ₹350 जमा', prompt: 'सुनीताने 350 रुपये जमा केले' },
        { icon: '📊', label: 'आजची एकूण कमाई', prompt: 'आजची कमाई सांगा' },
        { icon: '📦', label: 'स्टॉक तपासा', prompt: 'स्टॉक दाखवा' },
      ];
    }
    if (language === 'bn') {
      return [
        { icon: '⚡', label: 'রমেশকে ₹500 বাকি', prompt: 'রমেশের নামে ৫০০ টাকা বাকি লিখুন' },
        { icon: '🥛', label: '২ প্যাকেট দুধ ও চিনি', prompt: '২ প্যাকেট দুধ ও ১ কেজি চিনি নগদ' },
        { icon: '💰', label: 'সুনীতা ₹350 জমা', prompt: 'সুনীতা ৩৫০ টাকা জমা দিয়েছেন' },
        { icon: '📊', label: 'আজকের মোট বিক্রি', prompt: 'আজকের মোট বিক্রি কত' },
        { icon: '📦', label: 'মজুদ স্টক দেখুন', prompt: 'স্টক দেখাও' },
      ];
    }
    if (language === 'ta') {
      return [
        { icon: '⚡', label: 'ரமேஷ் ₹500 கடன்', prompt: 'ரமேஷுக்கு 500 ரூபாய் கடன் எழுது' },
        { icon: '🥛', label: '2 பாக்கெட் பால் & சர்க்கரை', prompt: '2 பாக்கெட் பால் 1 கிலோ சர்க்கரை ரொக்கம்' },
        { icon: '💰', label: 'சுனிதா ₹350 வரவு', prompt: 'சுனிதா 350 ரூபாய் கொடுத்தார்' },
        { icon: '📊', label: 'இன்றைய விற்பனை', prompt: 'இன்றைய விற்பனை எவ்வளவு' },
        { icon: '📦', label: 'இருப்பு சரிபார்', prompt: 'ஸ்டாக் காட்டு' },
      ];
    }
    if (language === 'te') {
      return [
        { icon: '⚡', label: 'రమేష్ ₹500 అప్పు', prompt: 'రమేష్‌కు 500 రూపాయల అప్పు రాయి' },
        { icon: '🥛', label: '2 ప్యాకెట్ల పాలు & చక్కెర', prompt: '2 ప్యాకెట్ల పాలు 1 కిలో చక్కెర నగదు' },
        { icon: '💰', label: 'సునీత ₹350 జమ', prompt: 'సునీత 350 రూపాయలు చెల్లించింది' },
        { icon: '📊', label: 'నేటి మొత్తం అమ్మకాలు', prompt: 'నేటి అమ్మకాలు ఎంత' },
        { icon: '📦', label: 'స్టాక్ చూడండి', prompt: 'స్టాక్ చూపించు' },
      ];
    }
    if (language === 'kn') {
      return [
        { icon: '⚡', label: 'ರಮೇಶ್ ₹500 ಸಾಲ', prompt: 'ರಮೇಶ್‌ಗೆ 500 ರೂಪಾಯಿ ಸಾಲ ಬರೆ' },
        { icon: '🥛', label: '2 ಪ್ಯಾಕೆಟ್ ಹಾಲು & ಸಕ್ಕರೆ', prompt: '2 ಪ್ಯಾಕೆಟ್ ಹಾಲು 1 ಕೆಜಿ ಸಕ್ಕರೆ ನಗದು' },
        { icon: '💰', label: 'ಸುನೀತಾ ₹350 ಜಮೆ', prompt: 'ಸುನೀತಾ 350 ರೂಪಾಯಿ ಜಮೆ ಮಾಡಿದರು' },
        { icon: '📊', label: 'ಇಂದಿನ ಒಟ್ಟು ಗಳಿಕೆ', prompt: 'ಇಂದಿನ ಗಳಿಕೆ ಎಷ್ಟು' },
        { icon: '📦', label: 'ಸ್ಟಾಕ್ ಪರಿಶೀಲಿಸಿ', prompt: 'ಸ್ಟಾಕ್ ತೋರಿಸಿ' },
      ];
    }
    if (language === 'ml') {
      return [
        { icon: '⚡', label: 'രമേശ് ₹500 കടം', prompt: 'രമേശിന് 500 രൂപ കടം എഴുതുക' },
        { icon: '🥛', label: '2 പാക്കറ്റ് പാൽ & പഞ്ചസാര', prompt: '2 പാക്കറ്റ് പാലും 1 കിലോ പഞ്ചസാരയും ക്യാഷ്' },
        { icon: '💰', label: 'സുനിത ₹350 അടച്ചു', prompt: 'സുനിത 350 രൂപ അടച്ചു' },
        { icon: '📊', label: 'ഇന്നത്തെ വിൽപ്പന', prompt: 'ഇന്നത്തെ വരുമാനം പറയൂ' },
        { icon: '📦', label: 'സ്റ്റോക്ക് പരിശോധിക്കുക', prompt: 'സ്റ്റോക്ക് കാണിക്കുക' },
      ];
    }
    // Hindi default
    return [
      { icon: '⚡', label: 'रमेश को ₹500 उधार', prompt: 'रमेश को 500 का उधार लिख दो' },
      { icon: '🥛', label: '2 पैकेट दूध और चीनी', prompt: '2 पैकेट दूध और 1 किलो चीनी नकद' },
      { icon: '💰', label: 'सुनीता से ₹350 जमा', prompt: 'सुनीता ने 350 रुपये जमा किए' },
      { icon: '📊', label: 'आज की कुल कमाई', prompt: 'आज की कमाई बताओ' },
      { icon: '📦', label: 'स्टॉक चेक करें', prompt: 'स्टॉक दिखाओ' },
    ];
  }, [language]);

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

  const daysLeftEstimated =
    lowStockItems[0]?.days_stock_left !== undefined
      ? lowStockItems[0].days_stock_left
      : lowStockItems[0]?.daily_avg_sales
      ? Number((lowStockItems[0].current_stock / lowStockItems[0].daily_avg_sales).toFixed(1))
      : 1.0;

  const StockAlert = lowStockItems.length > 0 && (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => {
        triggerHaptic('light');
        onOpenSupplierOrders?.();
      }}
      className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-2xl p-3.5 flex items-center justify-between shadow-xs card-hover-elevate cursor-pointer"
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
            {lowStockItems[0].current_stock} {lowStockItems[0].unit} ({daysLeftEstimated} {t.home.daysLeftRemaining})
          </p>
        </div>
      </div>
      <span className="text-[11px] font-black text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-lg border border-amber-300">
        {t.home.supplierList}
      </span>
    </motion.div>
  );

  const isListeningNow = isListening || voiceState === 'listening';

  const VoiceCenterpiece = (
    <div className="relative rounded-[32px] p-6 bg-gradient-to-b from-white via-white to-gray-50/80 border border-emerald-900/10 shadow-float text-center overflow-hidden">
      {/* Atmospheric ambient glow */}
      {isListeningNow ? (
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
              isListeningNow
                ? 'rgba(239, 246, 255, 0.95)'
                : voiceState === 'thinking'
                ? 'rgba(254, 243, 199, 0.95)'
                : voiceState === 'success'
                ? 'rgba(209, 250, 229, 0.95)'
                : 'rgba(243, 244, 246, 0.95)',
            borderColor:
              isListeningNow
                ? 'rgba(147, 197, 253, 0.7)'
                : voiceState === 'thinking'
                ? 'rgba(252, 211, 77, 0.7)'
                : voiceState === 'success'
                ? 'rgba(110, 231, 183, 0.7)'
                : 'rgba(229, 231, 235, 0.8)',
          }}
        >
          {isListeningNow ? (
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

        {/* Living Floating Microphone Orb with Bubble Ripples & Levitation */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Ground Reflection Shadow (expands & contracts inversely with vertical levitation) */}
          <div
            className={`animate-mic-shadow absolute -bottom-2 w-24 h-3.5 rounded-full blur-xs pointer-events-none ${
              isListeningNow ? 'bg-blue-600/35' : 'bg-amber-950/20'
            }`}
          />

          {/* Floating Levitation Rig */}
          <div className="animate-mic-float relative flex items-center justify-center w-32 h-32">
            {isListeningNow ? (
              <>
                {/* Listening Acoustic Glow Aura */}
                <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-blue-500/35 via-cyan-400/35 to-indigo-600/25 blur-md pointer-events-none animate-pulse" />

                {/* Acoustic Bubble Ripple 1 (Tight & compact, never wide) */}
                <div className="animate-mic-bubble-1 absolute w-28 h-28 rounded-full border-2 border-cyan-400/80 bg-cyan-400/15 shadow-sm pointer-events-none" />

                {/* Acoustic Bubble Ripple 2 */}
                <div className="animate-mic-bubble-2 absolute w-28 h-28 rounded-full border border-blue-400/60 bg-blue-500/10 pointer-events-none" />
              </>
            ) : (
              <>
                {/* Idle Golden Breathing Aura */}
                <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-amber-400/35 via-yellow-400/35 to-amber-500/25 blur-md pointer-events-none animate-pulse" />

                {/* Concentric Radiating Bubble Ring 1 (Compact & snug, max 1.26x) */}
                <div className="animate-mic-bubble-1 absolute w-28 h-28 rounded-full border-2 border-amber-400/50 bg-amber-400/10 shadow-xs pointer-events-none" />

                {/* Concentric Radiating Bubble Ring 2 (max 1.38x) */}
                <div className="animate-mic-bubble-2 absolute w-28 h-28 rounded-full border border-amber-300/40 bg-amber-300/5 pointer-events-none" />
              </>
            )}

            {/* Central Hero Button */}
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleMicClick}
              className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 relative z-10 border-4 border-white select-none ${
                isListeningNow
                  ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white shadow-listening ring-4 ring-blue-300/70 animate-pulse'
                  : 'bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-mic-hero'
              }`}
              style={{
                boxShadow: isListeningNow
                  ? '0 0 45px rgba(59, 130, 246, 0.6), inset 0 2px 6px rgba(255, 255, 255, 0.6)'
                  : '0 14px 35px -4px rgba(245, 158, 11, 0.5), inset 0 2px 6px rgba(255, 255, 255, 0.7)',
              }}
              aria-label={t.voice.tapToSpeak}
            >
              <Mic
                className={`w-12 h-12 transition-all ${
                  isListeningNow
                    ? 'scale-110 text-white stroke-[2.6]'
                    : 'text-slate-950 stroke-[2.5]'
                }`}
              />
            </motion.button>
          </div>
        </div>

        {/* Live Soundwave Frequency Bars (ALWAYS visible when listening) */}
        <LiveWaveform isListening={isListeningNow} />

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
                  <p className="text-[10px] text-rose-600 font-medium">{t.home.speakClearlyAgain}</p>
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
            <CustomerAvatar name={getLocalizedCustomerName(cust.name, language)} size="sm" trustScore={cust.trust_score} />
            <div className="text-left">
              <span className="block leading-tight font-black">{getLocalizedCustomerName(cust.name, language)}</span>
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
                      name={getLocalizedCustomerName(customer.name, language)}
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
                      {customer ? getLocalizedCustomerName(customer.name, language) : isSale ? t.today.cashSaleLabel : t.today.shopExpenseLabel}
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-[170px] sm:max-w-xs mt-0.5 font-medium">
                      {getLocalizedTransactionDesc(tx, customer?.name, language)}
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

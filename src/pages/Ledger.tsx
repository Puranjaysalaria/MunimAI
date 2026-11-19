import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { Customer, Transaction } from '../types/schema';
import { formatINR, formatRelativeTime } from '../lib/utils';
import { exportLedgerToCSV, printCustomerStatement } from '../lib/exportService';
import { calculateCustomerTrustScore } from '../lib/trustScore';
import { firePaymentConfetti } from '../lib/celebration';
import {
  Search,
  UserCheck,
  BellRing,
  Volume2,
  PhoneCall,
  PlusCircle,
  MinusCircle,
  MapPin,
  Mic,
  Calendar,
  X,
  Play,
  Pause,
  Trash2,
  FileSpreadsheet,
  Printer,
  Share2,
} from 'lucide-react';
import { triggerHaptic, playAudioCue } from '../lib/sound';
import { CustomerAvatar } from '../components/CustomerAvatar';

interface LedgerProps {
  onSelectCustomer: (customer: Customer) => void;
  onOpenRecovery: () => void;
  onPlayProof: (clipPath: string) => void;
  onQuickAction: (customer: Customer, action: 'credit' | 'payment') => void;
  onRecordProofForTransaction?: (transaction: Transaction, customer: Customer) => void;
}

export const Ledger: React.FC<LedgerProps> = ({
  onOpenRecovery,
  onPlayProof,
  onQuickAction,
  onRecordProofForTransaction,
}) => {
  const { customers, transactions, shop, attachProofClip } = useShop();
  const { t, language } = useI18n();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'owed' | 'settled'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [playingTxId, setPlayingTxId] = useState<string | null>(null);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address_note?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);

    if (!matchesSearch) return false;
    if (filter === 'owed') return c.balance_owed > 0;
    if (filter === 'settled') return c.balance_owed === 0;
    return true;
  });

  const totalOwed = customers.reduce((sum, c) => sum + Number(c.balance_owed), 0);
  const over1000Count = customers.filter((c) => c.balance_owed >= 1000).length;

  const handlePlayProof = (tx: Transaction) => {
    triggerHaptic('start');
    playAudioCue('start');
    if (playingTxId === tx.id) {
      setPlayingTxId(null);
    } else {
      setPlayingTxId(tx.id);
      onPlayProof(tx.proof_clip_path || '');
      // Auto reset playing indicator after 5 seconds
      setTimeout(() => setPlayingTxId(null), 5000);
    }
  };

  const handleDeleteProof = (txId: string) => {
    if (confirm('क्या आप ग्राहक की यह आवाज़ रिकॉर्डिंग हटाना चाहते हैं?')) {
      triggerHaptic('stop');
      playAudioCue('cancel');
      attachProofClip(txId, '');
      setPlayingTxId(null);
    }
  };

  const handlePaymentAction = (cust: Customer) => {
    triggerHaptic('success');
    playAudioCue('success');
    firePaymentConfetti();
    onQuickAction(cust, 'payment');
  };

  const handleCreditAction = (cust: Customer) => {
    triggerHaptic('start');
    playAudioCue('start');
    onQuickAction(cust, 'credit');
  };

  return (
    <div className="pb-32 px-4 pt-3 max-w-md mx-auto space-y-4 select-none">
      {/* Top Ledger Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[30px] p-5 bg-gradient-to-br from-rose-50 via-white to-rose-50/50 border border-rose-200/80 shadow-card flex items-center justify-between card-hover-elevate"
      >
        <div>
          <span className="text-xs font-black text-rose-800 uppercase tracking-wider block">
            {t.ledger.totalOwed}
          </span>
          <div className="amount-hero text-owed mt-1 tracking-tight">
            {formatINR(totalOwed)}
          </div>
          <p className="text-xs text-rose-600 font-semibold mt-0.5">
            {customers.filter((c) => c.balance_owed > 0).length} ग्राहकों पर बाकी
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* CSV Export */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              triggerHaptic('start');
              playAudioCue('start');
              exportLedgerToCSV(transactions, customers, shop.name);
            }}
            className="touch-target-64 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-primary border border-emerald-200 rounded-2xl font-black text-xs flex flex-col items-center justify-center space-y-1 shadow-xs"
            title="Excel CSV डाउनलोड करें"
          >
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <span>CSV पर्ची</span>
          </motion.button>

          {/* Recovery Reminder Alert */}
          {over1000Count > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('start');
                playAudioCue('start');
                onOpenRecovery();
              }}
              className="touch-target-64 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-2xl shadow-md text-xs flex flex-col items-center justify-center space-y-1 border border-amber-400"
            >
              <BellRing className="w-5 h-5 text-slate-950 animate-bounce" />
              <span>तगादा ({over1000Count})</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Search and Filter Pills */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.ledger.searchPlaceholder}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-2">
          {(['all', 'owed', 'settled'] as const).map((mode) => (
            <motion.button
              key={mode}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('light');
                setFilter(mode);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filter === mode
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {mode === 'all'
                ? t.ledger.filterAll
                : mode === 'owed'
                ? t.ledger.filterOwed
                : t.ledger.filterSettled}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Customer Khata Cards */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-400 border border-gray-200 shadow-xs">
            <UserCheck className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-sm text-slate-700">कोई ग्राहक नहीं मिला</p>
            <p className="text-xs text-slate-400 mt-1">नया नाम बोलकर खाता शुरू करें</p>
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const hasBalance = cust.balance_owed > 0;
            const recentProofTx = transactions.find(
              (tx) => tx.customer_id === cust.id && tx.proof_clip_path
            );
            const recentUdhaarTx = transactions.find(
              (tx) => tx.customer_id === cust.id && tx.type === 'credit'
            );

            return (
              <motion.div
                key={cust.id}
                whileHover={{ y: -2 }}
                className="bg-white rounded-[28px] p-4 shadow-card border border-gray-100/90 space-y-3 hover:border-gray-200 transition-colors card-hover-elevate"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <CustomerAvatar
                      name={cust.name}
                      size="md"
                      trustScore={cust.trust_score}
                      showBadge
                    />

                    <div>
                      <h3
                        onClick={() => {
                          triggerHaptic('start');
                          playAudioCue('start');
                          setSelectedCustomer(cust);
                        }}
                        className="font-black text-lg text-slate-900 cursor-pointer hover:text-primary active:scale-[0.98] leading-tight flex items-center space-x-1.5"
                      >
                        <span>{cust.name}</span>
                      </h3>

                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          भरोसा: {cust.trust_score}%
                        </span>

                        {cust.address_note && (
                          <span className="text-xs text-slate-500 flex items-center font-medium">
                            <MapPin className="w-3 h-3 mr-0.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[130px]">
                              {cust.address_note}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Balance Display (>=32px per design tokens) */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`amount-card font-black ${
                        hasBalance ? 'text-owed' : 'text-received'
                      }`}
                    >
                      {formatINR(cust.balance_owed)}
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider block mt-0.5 ${
                        hasBalance ? 'text-rose-500' : 'text-emerald-600'
                      }`}
                    >
                      {hasBalance ? 'उधार बाकी' : 'हिसाब चुकता'}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-xs">
                  <div className="flex items-center space-x-2">
                    {/* Phone button */}
                    {cust.phone && (
                      <motion.a
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        href={`tel:${cust.phone}`}
                        className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-700 shadow-xs"
                        title="Call Customer"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </motion.a>
                    )}

                    {/* Audio Proof Playback Button with Animated Wave Equalizer */}
                    {recentProofTx?.proof_clip_path ? (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handlePlayProof(recentProofTx)}
                        className={`px-3 py-1.5 rounded-xl font-black flex items-center space-x-1.5 border shadow-xs transition-all ${
                          playingTxId === recentProofTx.id
                            ? 'bg-blue-600 text-white border-blue-700 shadow-listening'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                        title="Play Voice Proof"
                      >
                        {playingTxId === recentProofTx.id ? (
                          <div className="flex items-center space-x-0.5 h-3.5">
                            <span className="w-1 bg-white rounded-full soundbar-anim" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 bg-white rounded-full soundbar-anim" style={{ animationDelay: '200ms' }} />
                            <span className="w-1 bg-white rounded-full soundbar-anim" style={{ animationDelay: '400ms' }} />
                          </div>
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>
                          {playingTxId === recentProofTx.id
                            ? 'बज रहा है...'
                            : 'सबूत सुनें'}
                        </span>
                      </motion.button>
                    ) : (
                      hasBalance &&
                      recentUdhaarTx &&
                      onRecordProofForTransaction && (
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={() => {
                            triggerHaptic('start');
                            playAudioCue('start');
                            onRecordProofForTransaction(recentUdhaarTx, cust);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 hover:bg-amber-100 font-black flex items-center space-x-1 border border-amber-200 text-[11px] shadow-xs"
                          title="Record Customer Proof"
                        >
                          <Mic className="w-3 h-3 text-amber-700" />
                          <span>सबूत रिकॉर्ड</span>
                        </motion.button>
                      )
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleCreditAction(cust)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-owed font-black border border-rose-200 flex items-center space-x-1 shadow-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{t.ledger.giveCredit}</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handlePaymentAction(cust)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-received font-black border border-emerald-200 flex items-center space-x-1 shadow-xs"
                    >
                      <MinusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{t.ledger.recordPayment}</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Customer Passbook Detail Drawer / Modal with Bahi-Khata Styling */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs"
            />

            <motion.div
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  setSelectedCustomer(null);
                }
              }}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative z-10 bg-white w-full max-w-md rounded-t-[36px] sm:rounded-3xl p-6 shadow-sheet max-h-[85vh] overflow-y-auto border-t-4 border-primary"
            >
              {/* Sheet Drag Indicator */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3 cursor-grab" />

              {/* Traditional Bahi-Khata Auspicious Header Banner */}
              <div className="text-center py-1 bg-amber-50 rounded-xl border border-amber-200/80 mb-3 text-[11px] font-black text-amber-900 tracking-wider">
                ॥ शुभ लाभ ॥ डिजिटल बही-खाता रजिस्टर
              </div>

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <CustomerAvatar
                    name={selectedCustomer.name}
                    size="md"
                    trustScore={selectedCustomer.trust_score}
                    showBadge
                  />
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-tight">
                      {selectedCustomer.name}
                    </h2>
                    <p className="text-xs text-slate-500 flex items-center mt-0.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {selectedCustomer.address_note || 'स्थानीय ग्राहक'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 rounded-full hover:bg-gray-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Balance and Limits Grid */}
              <div className="grid grid-cols-2 gap-3 my-4">
                <div className="p-3.5 bg-gradient-to-br from-rose-50 to-white rounded-2xl border border-rose-200">
                  <span className="text-[11px] font-black text-rose-700 block">
                    कुल उधार बकाया
                  </span>
                  <span className="text-2xl font-black text-owed block mt-1 tracking-tight">
                    {formatINR(selectedCustomer.balance_owed)}
                  </span>
                </div>
                <div className="p-3.5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200">
                  <span className="text-[11px] font-black text-slate-500 block">
                    उधार सीमा (Limit)
                  </span>
                  <span className="text-xl font-black text-slate-800 block mt-1">
                    {formatINR(selectedCustomer.credit_limit)}
                  </span>
                  <div className="mt-1">
                    {(() => {
                      const trust = calculateCustomerTrustScore(
                        selectedCustomer,
                        transactions
                      );
                      return (
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${trust.badgeColor}`}
                        >
                          {trust.tierLabelHi} ({trust.score}%)
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Action Buttons: WhatsApp Reminder & Print */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                {/* WhatsApp Reminder Button */}
                {selectedCustomer.balance_owed > 0 && (
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    href={`https://wa.me/${selectedCustomer.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(
                      `नमस्ते ${selectedCustomer.name} जी! ${shop.name} पर आपका ₹${selectedCustomer.balance_owed} का उधार बाकी है। कृपया UPI या दुकान पर आकर जमा करा दें। धन्यवाद!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="touch-target-64 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl flex items-center justify-center space-x-1.5 shadow-xs"
                  >
                    <Share2 className="w-4 h-4 text-emerald-100" />
                    <span>WhatsApp तगादा</span>
                  </motion.a>
                )}

                {/* Print Slip Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    printCustomerStatement(selectedCustomer, transactions, shop)
                  }
                  className={`touch-target-64 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-slate-800 font-black text-xs rounded-2xl flex items-center justify-center space-x-1.5 border border-gray-200 shadow-xs ${
                    selectedCustomer.balance_owed > 0 ? '' : 'col-span-2'
                  }`}
                >
                  <Printer className="w-4 h-4 text-slate-700" />
                  <span>पर्ची प्रिंट करें</span>
                </motion.button>
              </div>

              {/* Customer's Individual Transactions History */}
              <div className="mt-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  खाते का लेन-देन इतिहास (Ledger Passbook)
                </h4>

                <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50">
                  {transactions
                    .filter((tx) => tx.customer_id === selectedCustomer.id)
                    .map((tx) => {
                      const isCredit = tx.type === 'credit';
                      return (
                        <div
                          key={tx.id}
                          className="p-3 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-black text-slate-900">
                              {tx.voice_transcript ||
                                (isCredit ? 'सामान का उधार' : 'रकम जमा')}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center mt-0.5 font-medium">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatRelativeTime(
                                tx.created_at,
                                language === 'pa'
                                  ? 'pa'
                                  : language === 'en'
                                  ? 'en'
                                  : 'hi'
                              )}
                            </p>
                          </div>

                          <div className="text-right flex items-center space-x-2">
                            <span
                              className={`text-sm font-black ${
                                isCredit ? 'text-owed' : 'text-received'
                              }`}
                            >
                              {isCredit ? '+' : '-'}
                              {formatINR(tx.amount)}
                            </span>

                            {/* Play button if proof clip exists */}
                            {tx.proof_clip_path && (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handlePlayProof(tx)}
                                  className={`p-1.5 rounded-lg ${
                                    playingTxId === tx.id
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                  title="Play Proof Audio"
                                >
                                  {playingTxId === tx.id ? (
                                    <Pause className="w-3.5 h-3.5" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5 ml-0.5" />
                                  )}
                                </button>

                                <button
                                  onClick={() => handleDeleteProof(tx.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-owed"
                                  title="Delete Audio Proof"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Bottom Quick Action Buttons */}
              <div className="mt-5 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    handleCreditAction(selectedCustomer);
                  }}
                  className="touch-target-64 bg-rose-50 text-owed hover:bg-rose-100 font-black rounded-2xl border border-rose-200"
                >
                  + नया उधार दें
                </button>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    handlePaymentAction(selectedCustomer);
                  }}
                  className="touch-target-64 bg-emerald-50 text-received hover:bg-emerald-100 font-black rounded-2xl border border-emerald-200"
                >
                  - रकम जमा करें
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

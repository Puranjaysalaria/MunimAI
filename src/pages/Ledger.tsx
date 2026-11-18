import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { Customer, Transaction } from '../types/schema';
import { formatINR, formatRelativeTime } from '../lib/utils';
import {
  Search,
  UserCheck,
  BellRing,
  Volume2,
  ShieldCheck,
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
} from 'lucide-react';
import { triggerHaptic } from '../lib/sound';

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
  const { customers, transactions, attachProofClip } = useShop();
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
      attachProofClip(txId, '');
      setPlayingTxId(null);
    }
  };

  return (
    <div className="pb-28 px-4 pt-3 max-w-md mx-auto space-y-4 select-none">
      {/* Top Ledger Stats Card */}
      <div className="bg-surface rounded-2xl p-4 shadow-card border border-gray-100 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-app-muted uppercase tracking-wider">
            {t.ledger.totalOwed}
          </span>
          <div className="amount-hero text-owed mt-0.5">{formatINR(totalOwed)}</div>
          <p className="text-xs text-app-muted">
            {customers.filter((c) => c.balance_owed > 0).length} ग्राहकों पर बाकी
          </p>
        </div>

        {over1000Count > 0 && (
          <button
            onClick={() => {
              triggerHaptic('start');
              onOpenRecovery();
            }}
            className="touch-target-64 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md text-xs font-bold active:scale-95 flex flex-col items-center justify-center space-y-1"
          >
            <BellRing className="w-5 h-5 text-white animate-bounce" />
            <span>तगादा ({over1000Count})</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.ledger.searchPlaceholder}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-surface text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-2">
          {(['all', 'owed', 'settled'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                filter === mode
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface text-app-muted border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {mode === 'all'
                ? t.ledger.filterAll
                : mode === 'owed'
                ? t.ledger.filterOwed
                : t.ledger.filterSettled}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Khata Cards */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="bg-surface rounded-2xl p-8 text-center text-app-muted border border-gray-200">
            <UserCheck className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="font-semibold text-sm">कोई ग्राहक नहीं मिला</p>
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
              <div
                key={cust.id}
                className="bg-surface rounded-2xl p-4 shadow-card border border-gray-100 space-y-3 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3
                      onClick={() => {
                        triggerHaptic('start');
                        setSelectedCustomer(cust);
                      }}
                      className="font-bold text-lg text-app-text flex items-center cursor-pointer hover:text-primary active:scale-[0.98]"
                    >
                      <span>{cust.name}</span>
                      <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center">
                        <ShieldCheck className="w-3 h-3 mr-0.5" />
                        {cust.trust_score}%
                      </span>
                    </h3>

                    {cust.address_note && (
                      <p className="text-xs text-app-muted flex items-center mt-0.5">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400 flex-shrink-0" />
                        <span>{cust.address_note}</span>
                      </p>
                    )}
                  </div>

                  {/* Balance Display (>=32px per design tokens) */}
                  <div className="text-right">
                    <div
                      className={`amount-card ${
                        hasBalance ? 'text-owed' : 'text-received'
                      }`}
                    >
                      {formatINR(cust.balance_owed)}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        hasBalance ? 'text-red-500' : 'text-emerald-600'
                      }`}
                    >
                      {hasBalance ? 'उधार बाकी' : 'हिसाब चुकता'}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <div className="flex items-center space-x-2">
                    {/* Phone button */}
                    {cust.phone && (
                      <a
                        href={`tel:${cust.phone}`}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 active:scale-95"
                        title="Call Customer"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Audio Proof Playback Button */}
                    {recentProofTx?.proof_clip_path ? (
                      <button
                        onClick={() => handlePlayProof(recentProofTx)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 border active:scale-95 transition-all ${
                          playingTxId === recentProofTx.id
                            ? 'bg-blue-600 text-white border-blue-700 animate-pulse'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                        title="Play Voice Proof"
                      >
                        {playingTxId === recentProofTx.id ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>{playingTxId === recentProofTx.id ? 'बज रहा है...' : 'सबूत सुनें'}</span>
                      </button>
                    ) : (
                      hasBalance &&
                      recentUdhaarTx &&
                      onRecordProofForTransaction && (
                        <button
                          onClick={() => {
                            triggerHaptic('start');
                            onRecordProofForTransaction(recentUdhaarTx, cust);
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold flex items-center space-x-1 border border-amber-200 active:scale-95 text-[11px]"
                          title="Record Customer Proof"
                        >
                          <Mic className="w-3 h-3 text-amber-700" />
                          <span>सबूत रिकॉर्ड करें</span>
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onQuickAction(cust, 'credit')}
                      className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-owed font-bold active:scale-95 flex items-center space-x-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{t.ledger.giveCredit}</span>
                    </button>

                    <button
                      onClick={() => onQuickAction(cust, 'payment')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-received font-bold active:scale-95 flex items-center space-x-1"
                    >
                      <MinusCircle className="w-3.5 h-3.5" />
                      <span>{t.ledger.recordPayment}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-surface w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-sheet max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-app-text">{selectedCustomer.name}</h2>
                <p className="text-xs text-app-muted flex items-center mt-0.5">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                  {selectedCustomer.address_note || 'पता दर्ज नहीं'}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Balance and Limits Grid */}
            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                <span className="text-[11px] font-bold text-red-600 block">कुल उधार</span>
                <span className="text-2xl font-black text-owed block mt-0.5">
                  {formatINR(selectedCustomer.balance_owed)}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[11px] font-bold text-app-muted block">उधार सीमा (Limit)</span>
                <span className="text-xl font-bold text-app-text block mt-0.5">
                  {formatINR(selectedCustomer.credit_limit)}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">
                  भरोसा: {selectedCustomer.trust_score}%
                </span>
              </div>
            </div>

            {/* Customer's Individual Transactions History */}
            <div className="mt-4">
              <h4 className="text-xs font-bold text-app-muted uppercase tracking-wider mb-2">
                खाते का लेन-देन इतिहास
              </h4>

              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
                {transactions
                  .filter((tx) => tx.customer_id === selectedCustomer.id)
                  .map((tx) => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <div key={tx.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-app-text">
                            {tx.voice_transcript || (isCredit ? 'उधार सामान' : 'जमा रकम')}
                          </p>
                          <p className="text-[10px] text-gray-400 flex items-center mt-0.5">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatRelativeTime(
                              tx.created_at,
                              language === 'pa' ? 'pa' : language === 'en' ? 'en' : 'hi'
                            )}
                          </p>
                        </div>

                        <div className="text-right flex items-center space-x-2">
                          <span
                            className={`text-sm font-bold ${
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

                              {/* Right to delete clip */}
                              <button
                                onClick={() => handleDeleteProof(tx.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-owed"
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

            <div className="mt-5 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  onQuickAction(selectedCustomer, 'credit');
                }}
                className="touch-target-64 bg-red-50 text-owed hover:bg-red-100 font-bold rounded-xl"
              >
                + नया उधार दें
              </button>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  onQuickAction(selectedCustomer, 'payment');
                }}
                className="touch-target-64 bg-emerald-50 text-received hover:bg-emerald-100 font-bold rounded-xl"
              >
                - रकम जमा करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

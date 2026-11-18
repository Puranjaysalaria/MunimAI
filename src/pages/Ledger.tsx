import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { Customer } from '../types/schema';
import { formatINR } from '../lib/utils';
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
} from 'lucide-react';
import { triggerHaptic } from '../lib/sound';

interface LedgerProps {
  onSelectCustomer: (customer: Customer) => void;
  onOpenRecovery: () => void;
  onPlayProof: (clipPath: string) => void;
  onQuickAction: (customer: Customer, action: 'credit' | 'payment') => void;
}

export const Ledger: React.FC<LedgerProps> = ({
  onSelectCustomer,
  onOpenRecovery,
  onPlayProof,
  onQuickAction,
}) => {
  const { customers, transactions } = useShop();
  const { t } = useI18n();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'owed' | 'settled'>('all');

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

  return (
    <div className="pb-28 px-4 pt-3 max-w-md mx-auto space-y-4">
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
            // Check if there is a recent transaction with proof audio
            const recentProofTx = transactions.find(
              (tx) => tx.customer_id === cust.id && tx.proof_clip_path
            );

            return (
              <div
                key={cust.id}
                className="bg-surface rounded-2xl p-4 shadow-card border border-gray-100 space-y-3 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3
                      onClick={() => onSelectCustomer(cust)}
                      className="font-bold text-lg text-app-text flex items-center cursor-pointer hover:text-primary"
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
                    {recentProofTx?.proof_clip_path && (
                      <button
                        onClick={() => {
                          triggerHaptic('start');
                          onPlayProof(recentProofTx.proof_clip_path!);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold flex items-center space-x-1 border border-blue-200 active:scale-95"
                        title="Play Voice Proof"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>सबूत सुनें</span>
                      </button>
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
    </div>
  );
};

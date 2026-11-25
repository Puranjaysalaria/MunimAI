import React, { useState } from 'react';
import { Customer, Transaction, TransactionItem } from '../../types/schema';
import { useI18n } from '../../i18n';
import { TransactionCorrectionPatch } from '../../lib/correctionService';
import { getLocalizedCustomerName } from '../../lib/nameTranslation';
import { X, FileEdit, ArrowRight } from 'lucide-react';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  customers: Customer[];
  onClose: () => void;
  onReviewEdit: (tx: Transaction, patch: TransactionCorrectionPatch) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  customers,
  onClose,
  onReviewEdit,
}) => {
  const { t, language } = useI18n();

  const [amount, setAmount] = useState<string>(() =>
    transaction ? String(transaction.amount) : ''
  );
  const [customerId, setCustomerId] = useState<string>(() =>
    transaction?.customer_id || ''
  );
  const [itemName, setItemName] = useState<string>(() =>
    transaction?.items?.[0]?.name || ''
  );
  const [itemQty, setItemQty] = useState<string>(() =>
    transaction?.items?.[0]?.quantity ? String(transaction.items[0].quantity) : ''
  );
  const [dateStr, setDateStr] = useState<string>(() =>
    transaction ? transaction.created_at.slice(0, 10) : ''
  );
  const [note, setNote] = useState<string>(() => transaction?.note || '');

  React.useEffect(() => {
    if (transaction) {
      setAmount(String(transaction.amount));
      setCustomerId(transaction.customer_id || '');
      setItemName(transaction.items?.[0]?.name || '');
      setItemQty(transaction.items?.[0]?.quantity ? String(transaction.items[0].quantity) : '');
      setDateStr(transaction.created_at.slice(0, 10));
      setNote(transaction.note || '');
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) return;

    const patch: TransactionCorrectionPatch = {
      amount: parsedAmount,
      customer_id: customerId || null,
      note: note.trim() || null,
    };

    if (dateStr && dateStr !== transaction.created_at.slice(0, 10)) {
      patch.created_at = new Date(dateStr + 'T12:00:00').toISOString();
    }

    if (itemName.trim()) {
      const qtyNum = Number(itemQty) || 1;
      const updatedItem: TransactionItem = {
        ...(transaction.items?.[0] || {}),
        name: itemName.trim(),
        quantity: qtyNum,
        unit: transaction.items?.[0]?.unit || 'kilo',
        price: parsedAmount,
      };
      patch.items = [updatedItem, ...(transaction.items?.slice(1) || [])];
    }

    onReviewEdit(transaction, patch);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <FileEdit className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900">
              {t.editing.editEntryBtn}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-slate-400"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              {t.confirmCard.amountLabel} (₹)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-black text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {(transaction.type === 'credit' || transaction.type === 'payment') && (
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                {t.confirmCard.customerLabel}
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-bold text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">--</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getLocalizedCustomerName(c.name, language)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                {t.confirmCard.itemsLabel}
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Qty
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              {t.ledger.date}
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 font-semibold text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 font-semibold text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full touch-target-64 bg-primary hover:bg-emerald-800 text-white font-black rounded-2xl shadow-md flex items-center justify-center space-x-2"
          >
            <span>{t.editing.saveEditBtn}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

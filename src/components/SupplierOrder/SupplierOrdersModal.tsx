import React, { useState } from 'react';
import { SupplierOrderDraft } from '../../lib/stockAnalytics';
import { formatINR } from '../../lib/utils';
import { triggerHaptic, playAudioCue } from '../../lib/sound';
import { speechSynthesizer } from '../../tts/speechSynthesizer';
import { LanguageCode, useI18n } from '../../i18n';
import {
  generateSupplierOrderSlip,
  resolveMessageLanguage,
  buildWhatsAppLink,
  buildSMSLink,
} from '../../lib/slipService';
import {
  X,
  Truck,
  Plus,
  Minus,
  MessageCircle,
  Share2,
  CheckCircle,
  Phone,
} from 'lucide-react';

interface SupplierOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: SupplierOrderDraft[];
  shopName: string;
  language: LanguageCode;
  onConfirmOrder: (order: SupplierOrderDraft) => void;
}

export const SupplierOrdersModal: React.FC<SupplierOrdersModalProps> = ({
  isOpen,
  onClose,
  drafts: initialDrafts,
  shopName,
  language,
  onConfirmOrder,
}) => {
  const { t } = useI18n();
  const [drafts, setDrafts] = useState<SupplierOrderDraft[]>(initialDrafts);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    initialDrafts[0]?.supplier.id || ''
  );
  const [orderSentMap, setOrderSentMap] = useState<Record<string, boolean>>({});

  // Sync drafts when initialDrafts changes
  React.useEffect(() => {
    setDrafts(initialDrafts);
    if (!selectedSupplierId && initialDrafts.length > 0) {
      setSelectedSupplierId(initialDrafts[0].supplier.id);
    }
  }, [initialDrafts]);

  if (!isOpen) return null;

  const currentDraft = drafts.find((d) => d.supplier.id === selectedSupplierId) || drafts[0];

  // Adjust item quantity
  const handleUpdateQty = (itemId: string, delta: number) => {
    triggerHaptic('light');
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.supplier.id !== currentDraft?.supplier.id) return draft;

        const updatedItems = draft.items.map((it) => {
          if (it.item.id === itemId) {
            const newQty = Math.max(1, it.suggestedQty + delta);
            return {
              ...it,
              suggestedQty: newQty,
              totalCost: newQty * it.unitCost,
            };
          }
          return it;
        });

        const newTotalCost = updatedItems.reduce((sum, it) => sum + it.totalCost, 0);

        return {
          ...draft,
          items: updatedItems,
          totalEstimatedCost: newTotalCost,
        };
      })
    );
  };

  // Format message for WhatsApp / SMS using i18n slip builder
  const generateOrderMessage = (draft: SupplierOrderDraft): string => {
    const targetLang = resolveMessageLanguage(
      (draft.supplier as any).preferred_language,
      language
    );

    return generateSupplierOrderSlip({
      shopName,
      supplierName: draft.supplier.name,
      items: draft.items.map((it) => ({
        name: it.item.name,
        quantity: it.suggestedQty,
        unit: it.unit,
        unitCost: it.unitCost,
        totalCost: it.totalCost,
      })),
      totalEstimatedCost: draft.totalEstimatedCost,
      language: targetLang,
    });
  };

  // Share via WhatsApp
  const handleShareWhatsApp = (draft: SupplierOrderDraft) => {
    triggerHaptic('start');
    const msg = generateOrderMessage(draft);
    const url = buildWhatsAppLink(draft.supplier.phone || '', msg);
    window.open(url, '_blank');
    setOrderSentMap((prev) => ({ ...prev, [draft.supplier.id]: true }));
    onConfirmOrder(draft);
  };

  // Share via SMS / Native Share
  const handleShareSMS = (draft: SupplierOrderDraft) => {
    triggerHaptic('start');
    const msg = generateOrderMessage(draft);
    const smsUrl = buildSMSLink(draft.supplier.phone || '', msg);
    window.location.href = smsUrl;
    setOrderSentMap((prev) => ({ ...prev, [draft.supplier.id]: true }));
    onConfirmOrder(draft);
  };

  // Confirm order in app
  const handleConfirmInApp = (draft: SupplierOrderDraft) => {
    triggerHaptic('success');
    playAudioCue('success');
    setOrderSentMap((prev) => ({ ...prev, [draft.supplier.id]: true }));
    onConfirmOrder(draft);

    const voiceMsg =
      language === 'pa'
        ? `${draft.supplier.name} ਦਾ ਆਰਡਰ ਸੇਵ ਕਰ ਲਿਆ ਗਿਆ ਹੈ`
        : language === 'en'
        ? `Order for ${draft.supplier.name} worth ₹${draft.totalEstimatedCost} has been recorded.`
        : `${draft.supplier.name} का ₹${draft.totalEstimatedCost} का आर्डर दर्ज कर लिया गया है`;
    speechSynthesizer.speak(voiceMsg, language);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface w-full max-w-md sm:max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-app-text">
                {t.stock.supplierOrderList}
              </h2>
              <p className="text-xs text-app-muted">
                {t.stock.forecastSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="touch-target-64 p-2 text-gray-400 hover:text-gray-700 active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Supplier Switcher Tabs */}
        <div className="flex space-x-2 my-3 overflow-x-auto pb-1">
          {drafts.map((d) => {
            const isSelected = d.supplier.id === selectedSupplierId;
            const isSent = orderSentMap[d.supplier.id];
            return (
              <button
                key={d.supplier.id}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedSupplierId(d.supplier.id);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-gray-100 text-app-muted hover:bg-gray-200'
                }`}
              >
                <span>{d.supplier.name.split(' ')[0]}</span>
                {isSent ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {d.items.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Current Supplier Details */}
        {currentDraft && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="bg-primary/5 rounded-2xl p-3 border border-primary/20 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-app-text">
                  {currentDraft.supplier.name}
                </h3>
                <p className="text-xs text-app-muted flex items-center mt-0.5">
                  <Phone className="w-3 h-3 mr-1 text-primary" />
                  {currentDraft.supplier.phone}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-app-muted">{t.stock.totalEstimatedCost}</span>
                <p className="text-base font-black text-primary">
                  {formatINR(currentDraft.totalEstimatedCost)}
                </p>
              </div>
            </div>

            {/* Items to Order List */}
            <div className="space-y-2.5">
              {currentDraft.items.length === 0 ? (
                <div className="text-center py-8 text-app-muted text-xs">
                  {t.stock.allStockSufficient}
                </div>
              ) : (
                currentDraft.items.map((it) => (
                  <div
                    key={it.item.id}
                    className="bg-surface border border-gray-100 rounded-2xl p-3 flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <h4 className="font-bold text-sm capitalize text-app-text">
                        {it.item.name}
                      </h4>
                      <p className="text-xs text-app-muted">
                        {t.stock.costPrefix}: {formatINR(it.unitCost)} /{it.unit} • {t.stock.stockPrefix}: {it.item.current_stock}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Quantity Stepper (64px accessible padding) */}
                      <div className="flex items-center bg-gray-100 rounded-xl p-1">
                        <button
                          onClick={() => handleUpdateQty(it.item.id, -1)}
                          className="touch-target-64 w-8 h-8 rounded-lg bg-surface shadow-xs flex items-center justify-center text-gray-700 active:scale-95"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-12 text-center text-xs font-black text-app-text">
                          {it.suggestedQty} {it.unit}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(it.item.id, 1)}
                          className="touch-target-64 w-8 h-8 rounded-lg bg-surface shadow-xs flex items-center justify-center text-gray-700 active:scale-95"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-16 text-right">
                        <p className="text-xs font-bold text-app-text">
                          {formatINR(it.totalCost)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {currentDraft && currentDraft.items.length > 0 && (
          <div className="pt-3 border-t border-gray-100 mt-2 space-y-2">
            <div className="flex space-x-2">
              <button
                onClick={() => handleShareWhatsApp(currentDraft)}
                className="touch-target-64 flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md active:scale-95 flex items-center justify-center space-x-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t.stock.sendWhatsApp}</span>
              </button>

              <button
                onClick={() => handleShareSMS(currentDraft)}
                className="touch-target-64 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-2xl active:scale-95 flex items-center justify-center space-x-1"
                title="SMS"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => handleConfirmInApp(currentDraft)}
              className="touch-target-64 w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl active:scale-95 flex items-center justify-center space-x-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{t.stock.confirmOrder}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

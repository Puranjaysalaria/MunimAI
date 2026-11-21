import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShop } from './context/ShopContext';
import { Header } from './components/Navigation/Header';
import { BottomTabBar, TabKey } from './components/Navigation/BottomTabBar';
import { Home } from './pages/Home';
import { Ledger } from './pages/Ledger';
import { Stock } from './pages/Stock';
import { Today } from './pages/Today';
import { Auth } from './pages/Auth';
import { PinLock } from './pages/PinLock';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmationCard } from './components/ConfirmationCard/ConfirmationCard';
import { DisambiguationModal } from './components/DisambiguationModal/DisambiguationModal';
import { UndoToast } from './components/Voice/UndoToast';
import { ProofRecorderModal } from './components/ProofRecorder/ProofRecorderModal';
import { PrivacyModal } from './components/PrivacyModal';
import { SupplierOrdersModal } from './components/SupplierOrder/SupplierOrdersModal';
import { DailySummaryModal } from './components/Summary/DailySummaryModal';
import { RecoveryModal } from './components/Reminders/RecoveryModal';
import { ReminderSettingsModal } from './components/Reminders/ReminderSettingsModal';
import { BillScanModal } from './components/BillScan/BillScanModal';
import { PriceChangeToast } from './components/Voice/PriceChangeToast';
import { GlobalVoicePill } from './components/Voice/GlobalVoicePill';
import { PWAInstallPrompt } from './components/PWA/PWAInstallPrompt';
import { useVoiceController } from './hooks/useVoiceController';
import { Customer, Transaction, LastPriceChange, Item } from './types/schema';
import { speechSynthesizer } from './tts/speechSynthesizer';
import { getPlayableProofUrl } from './storage/proofStorage';
import {
  compute14DayStockAnalysis,
  groupOrdersBySupplier,
  computeDailySummary,
  generateDailySummaryVoice,
  findSupplierForItem,
} from './lib/stockAnalytics';
import { useI18n } from './i18n';
import { Mic } from 'lucide-react';
import { triggerHaptic } from './lib/sound';
import { webSpeechWakeWordProvider } from './voice/wakeWord/webSpeechWakeWordProvider';

export const AppContent: React.FC = () => {
  const {
    shop,
    isLoggedIn,
    isLocked,
    customers,
    items,
    suppliers,
    transactions,
    lastTransaction,
    offlinePendingCount,
    addTransaction,
    undoLastTransaction,
    attachProofClip,
    syncOfflineData,
    updateCustomer,
    updateShopSettings,
    updateItemPrice,
    undoLastPriceChange,
  } = useShop();

  const { language, t } = useI18n();

  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isSupplierOrdersOpen, setIsSupplierOrdersOpen] = useState(false);
  const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryThreshold, setRecoveryThreshold] = useState(1000);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [selectedLedgerCustomerId, setSelectedLedgerCustomerId] = useState<string | null>(null);
  const [selectedCustomerTrigger, setSelectedCustomerTrigger] = useState<number>(0);
  const [supplierOrdersTargetSupplierId, setSupplierOrdersTargetSupplierId] = useState<string | null>(null);

  // Bill Scan & Voice Price Navigation States
  const [isBillScanOpen, setIsBillScanOpen] = useState(false);
  const [highlightedStockItemId, setHighlightedStockItemId] = useState<string | null>(null);
  const [selectedStockItem, setSelectedStockItem] = useState<Item | null>(null);
  const [priceChangeInfo, setPriceChangeInfo] = useState<LastPriceChange | null>(null);
  const [showPriceToast, setShowPriceToast] = useState(false);
  const [priceToastShowView, setPriceToastShowView] = useState(false);

  // Customer Proof Recording States
  const [proofTargetTx, setProofTargetTx] = useState<Transaction | null>(null);
  const [proofTargetCustomer, setProofTargetCustomer] = useState<Customer | null>(null);
  const [showProofPrompt, setShowProofPrompt] = useState(false);

  // Dynamic Stock & Supplier Analytics
  const stockAnalyses = React.useMemo(() => {
    return compute14DayStockAnalysis(items, transactions);
  }, [items, transactions]);

  const supplierDrafts = React.useMemo(() => {
    return groupOrdersBySupplier(stockAnalyses, suppliers);
  }, [stockAnalyses, suppliers]);

  const dailySummary = React.useMemo(() => {
    return computeDailySummary(transactions);
  }, [transactions]);

  const dailySummaryVoiceText = React.useMemo(() => {
    return generateDailySummaryVoice(dailySummary, language);
  }, [dailySummary, language]);

  // Monitor online / offline network state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show Undo toast whenever a new transaction is recorded
  useEffect(() => {
    if (lastTransaction) {
      setShowUndoToast(true);

      // If credit transaction, offer to record voice proof ("Customer se bulwayein")
      if (lastTransaction.type === 'credit') {
        const cust = customers.find((c) => c.id === lastTransaction.customer_id) || null;
        setProofTargetTx(lastTransaction);
        setProofTargetCustomer(cust);
        setShowProofPrompt(true);
      }

      const timer = setTimeout(() => {
        setShowUndoToast(false);
        setShowProofPrompt(false);
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [lastTransaction, customers]);

  // Track activeTab and unfinished flow states in refs for voice price action callback
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const isUnfinishedFlow =
    isSupplierOrdersOpen ||
    isDailySummaryOpen ||
    isRecoveryOpen ||
    isSettingsOpen ||
    isReminderSettingsOpen ||
    showProofPrompt ||
    isBillScanOpen ||
    selectedLedgerCustomerId !== null;
  const isUnfinishedFlowRef = useRef(isUnfinishedFlow);
  isUnfinishedFlowRef.current = isUnfinishedFlow;

  // Voice Flow Controller Hook
  const voice = useVoiceController({
    customers,
    items,
    suppliers,
    transactions,
    isOnline,
    activeStockItem: activeTab === 'stock' ? selectedStockItem : null,
    onSaveTransaction: (txData) => {
      const savedTx = addTransaction(txData);
      return savedTx;
    },
    onUndoLast: () => {
      const res = undoLastTransaction();
      setShowUndoToast(false);
      setShowProofPrompt(false);
      return res;
    },
    onNavigateTab: (tab) => setActiveTab(tab),
    onOpenSupplierOrders: (supplierId) => {
      setSupplierOrdersTargetSupplierId(supplierId || null);
      setIsSupplierOrdersOpen(true);
    },
    onOpenDailySummary: () => setIsDailySummaryOpen(true),
    onOpenRecovery: (threshold) => {
      setRecoveryThreshold(threshold);
      setIsRecoveryOpen(true);
    },
    onOpenReminderSettings: () => setIsReminderSettingsOpen(true),
    onOpenBillScan: () => setIsBillScanOpen(true),
    onUpdateItemPrice: updateItemPrice,
    onPriceActionConfirmed: (change) => {
      const priceRecord: LastPriceChange = {
        item: change.item,
        priceType: change.priceType,
        oldPrice: change.oldPrice,
        newPrice: change.newPrice,
        timestamp: Date.now(),
      };
      setPriceChangeInfo(priceRecord);

      const isHomeOrStock = activeTabRef.current === 'home' || activeTabRef.current === 'stock';
      const inUnfinished = isUnfinishedFlowRef.current;

      if (isHomeOrStock && !inUnfinished) {
        // Navigate to stock screen, scroll to item & highlight for 2 seconds
        setActiveTab('stock');
        setHighlightedStockItemId(change.item.id);
        setShowPriceToast(true);
        setPriceToastShowView(false);

        setTimeout(() => {
          setHighlightedStockItemId(null);
        }, 2000);
      } else {
        // In the middle of another flow or screen: stay put and show toast with "Dekhein" button
        setShowPriceToast(true);
        setPriceToastShowView(true);
      }
    },
    onSelectCustomer: (customerId) => {
      setSelectedLedgerCustomerId(customerId);
      setSelectedCustomerTrigger(Date.now());
      setActiveTab('ledger');
    },
    onCloseModals: () => {
      setIsBillScanOpen(false);
      setIsSupplierOrdersOpen(false);
      setIsDailySummaryOpen(false);
      setIsRecoveryOpen(false);
      setIsSettingsOpen(false);
      setIsReminderSettingsOpen(false);
      setIsPrivacyOpen(false);
      setShowProofPrompt(false);
    },
    onPlayProofClip: () => {
      const recentProof = transactions.find((tx) => tx.proof_clip_path);
      if (recentProof && recentProof.proof_clip_path) {
        const audio = new Audio(recentProof.proof_clip_path);
        audio.play().catch(() => {});
      }
    },
  });

  // Hands-free "Munim" wake word detection when enabled in shop settings
  React.useEffect(() => {
    if (shop.settings?.wake_word_enabled && !voice.isListening) {
      const wakeLang = language === 'pa' ? 'pa-IN' : language === 'en' ? 'en-IN' : 'hi-IN';
      webSpeechWakeWordProvider.startListening({ language: wakeLang }, () => {
        triggerHaptic('start');
        voice.startListening();
      });
    } else {
      webSpeechWakeWordProvider.stopListening();
    }

    return () => {
      webSpeechWakeWordProvider.stopListening();
    };
  }, [shop.settings?.wake_word_enabled, voice.isListening, language]);

  if (!isLoggedIn) {
    return <Auth />;
  }

  if (isLocked) {
    return <PinLock />;
  }

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedLedgerCustomerId(customer.id);
    setSelectedCustomerTrigger(Date.now());
    setActiveTab('ledger');
  };

  const handleQuickCustomerAction = (customer: Customer, action: 'credit' | 'payment') => {
    voice.processInput(
      action === 'credit'
        ? `${customer.name} ko 500 ka udhaar`
        : `${customer.name} ne 500 diye`
    );
  };

  const handleSpeakTodaySummary = () => {
    setIsDailySummaryOpen(true);
    speechSynthesizer.speak(dailySummaryVoiceText, language);
  };

  const handleOpenProofRecorder = (transaction: Transaction, customer: Customer) => {
    setProofTargetTx(transaction);
    setProofTargetCustomer(customer);
  };

  const handleSaveProofClip = (txId: string, proofPath: string) => {
    attachProofClip(txId, proofPath);
    setProofTargetTx(null);
    setProofTargetCustomer(null);
    setShowProofPrompt(false);
  };

  const handlePlayProofAudio = async (clipPath: string) => {
    triggerHaptic('start');
    const localUrl = await getPlayableProofUrl('', clipPath);
    const sampleProofText =
      language === 'en'
        ? 'Yes, write 500 rupees to my udhaar account'
        : language === 'pa'
        ? 'ਹਾਂ, 500 ਰੁਪਏ ਮੇਰੇ ਨਾਮ ਲਿਖ ਦਿਓ'
        : 'हाँ, 500 रुपये मेरे नाम लिख दो';
    if (localUrl) {
      const audio = new Audio(localUrl);
      audio.play().catch(() => {
        // Fallback simulated voice proof
        speechSynthesizer.speak(sampleProofText, language);
      });
    } else {
      speechSynthesizer.speak(sampleProofText, language);
    }
  };

  return (
    <div className="h-full flex flex-col bg-ambient-canvas relative overflow-y-auto font-sans">
      {/* Sticky Top Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOnline={isOnline}
        pendingSyncCount={offlinePendingCount}
        onTriggerSync={syncOfflineData}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Tab Screen Content with Animated Page Transitions */}
      <main className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Home
                onStartVoice={voice.startListening}
                onTextSubmit={voice.processInput}
                isListening={voice.isListening}
                voiceState={voice.voiceState}
                liveTranscript={voice.liveTranscript}
                errorMessage={voice.errorMessage}
                onRetryVoice={voice.startListening}
                onSelectCustomerSuggestion={(customerId) => {
                  setSelectedLedgerCustomerId(customerId);
                  setSelectedCustomerTrigger(Date.now());
                  setActiveTab('ledger');
                }}
                onOpenSupplierOrders={() => {
                  setSupplierOrdersTargetSupplierId(null);
                  setIsSupplierOrdersOpen(true);
                }}
              />
            </motion.div>
          )}

          {activeTab === 'ledger' && (
            <motion.div
              key="ledger"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Ledger
                selectedCustomerId={selectedLedgerCustomerId}
                selectedCustomerTrigger={selectedCustomerTrigger}
                onSelectCustomer={handleSelectCustomer}
                onOpenRecovery={() => {
                  setRecoveryThreshold(1000);
                  setIsRecoveryOpen(true);
                }}
                onPlayProof={handlePlayProofAudio}
                onQuickAction={handleQuickCustomerAction}
                onRecordProofForTransaction={handleOpenProofRecorder}
              />
            </motion.div>
          )}

          {activeTab === 'stock' && (
            <motion.div
              key="stock"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Stock
                onOpenSupplierOrders={() => {
                  setSupplierOrdersTargetSupplierId(null);
                  setIsSupplierOrdersOpen(true);
                }}
                onQuickStockOrder={(item) => {
                  const sup = findSupplierForItem(item, suppliers);
                  setSupplierOrdersTargetSupplierId(sup?.id || null);
                  setIsSupplierOrdersOpen(true);
                }}
                highlightedItemId={highlightedStockItemId}
                priceChangeInfo={priceChangeInfo}
                selectedItemId={selectedStockItem?.id}
                onSelectItem={(item) => {
                  setSelectedStockItem((prev) => (prev?.id === item.id ? null : item));
                }}
              />
            </motion.div>
          )}

          {activeTab === 'today' && (
            <motion.div
              key="today"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Today onSpeakSummary={handleSpeakTodaySummary} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* "Customer se bulwayein" Post-Credit Voice Proof Button */}
      <AnimatePresence>
        {showProofPrompt && proofTargetTx && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 350 }}
            className="fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto select-none"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                triggerHaptic('start');
                setShowProofPrompt(false);
              }}
              className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black py-3.5 px-4 rounded-2xl shadow-mic-hero flex items-center justify-between border-2 border-amber-300"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-950/15 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-slate-950 animate-pulse stroke-[2.4]" />
                </div>
                <div className="text-left">
                  <span className="text-sm block leading-tight">{t.proofModal.bannerTitle}</span>
                  <span className="text-[11px] text-amber-950/80 font-bold">{t.proofModal.bannerSubtitle}</span>
                </div>
              </div>
              <span className="text-xs bg-slate-950 text-white font-black px-2.5 py-1.5 rounded-xl shadow-xs">
                {t.proofModal.record5SecBtn}
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Slide-up Confirmation Card */}
      <ConfirmationCard
        pending={voice.pendingConfirmation}
        onConfirm={voice.handleConfirmSave}
        onCancel={voice.handleCancelConfirmation}
        isListeningForReply={voice.isListening}
        onStartListeningForReply={voice.startListeningForReply}
        onStopListeningForReply={voice.stopListening}
      />

      {/* Disambiguation Modal ("Kaunsa Ramesh?") */}
      <DisambiguationModal
        isOpen={voice.disambiguationCustomers.length > 0}
        customers={voice.disambiguationCustomers}
        onSelectCustomer={voice.handleSelectDisambiguatedCustomer}
        onCancel={voice.handleCancelConfirmation}
      />

      {/* Proof Recorder Modal (5-second customer audio clip) */}
      <ProofRecorderModal
        isOpen={Boolean(proofTargetTx && !showProofPrompt)}
        transaction={proofTargetTx}
        customer={proofTargetCustomer}
        shopId={shop.id}
        onSaveProof={handleSaveProofClip}
        onClose={() => {
          setProofTargetTx(null);
          setProofTargetCustomer(null);
        }}
      />

      {/* Privacy Policy Modal */}
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

      {/* Supplier Orders Modal */}
      <SupplierOrdersModal
        isOpen={isSupplierOrdersOpen}
        onClose={() => {
          setIsSupplierOrdersOpen(false);
          setSupplierOrdersTargetSupplierId(null);
        }}
        drafts={supplierDrafts}
        shopName={shop.name}
        language={language}
        initialSupplierId={supplierOrdersTargetSupplierId}
        onConfirmOrder={(_order) => {
          // Order confirmed in app
        }}
      />

      {/* Daily Financial Summary Modal */}
      <DailySummaryModal
        isOpen={isDailySummaryOpen}
        onClose={() => setIsDailySummaryOpen(false)}
        summary={dailySummary}
        spokenText={dailySummaryVoiceText}
        language={language}
      />

      {/* Recovery Reminders Modal with UPI Links */}
      <RecoveryModal
        isOpen={isRecoveryOpen}
        onClose={() => setIsRecoveryOpen(false)}
        customers={customers}
        shop={shop}
        thresholdAmount={recoveryThreshold}
        language={language}
        onOpenSettings={() => setIsReminderSettingsOpen(true)}
        onUpdateCustomer={(id, updates) => updateCustomer(id, updates)}
        onReminderSent={(_draft) => {
          // Record reminder sent
        }}
      />

      {/* Reminder Settings Modal */}
      <ReminderSettingsModal
        isOpen={isReminderSettingsOpen}
        onClose={() => setIsReminderSettingsOpen(false)}
        shop={shop}
        onSave={(newSettings) =>
          updateShopSettings({
            settings: {
              ...(shop.settings || {}),
              reminder_settings: newSettings,
            },
          })
        }
      />

      {/* Bill Scan Modal (Voice-driven photo OCR for bill prices) */}
      <BillScanModal
        isOpen={isBillScanOpen}
        onClose={() => setIsBillScanOpen(false)}
        onPricesExtracted={(extracted) => {
          if (extracted && extracted.length > 0) {
            let lastUpdatedItem: Item | undefined;

            extracted.forEach((item) => {
              const res = updateItemPrice(item.name, {
                [item.priceType === 'cost' ? 'cost_price' : 'selling_price']: item.price,
              });
              if (res.updatedItem) {
                lastUpdatedItem = res.updatedItem;
              }
            });

            // Spoken voice feedback
            const voiceMsg = t.billScan.billUpdatedVoice.replace('{count}', String(extracted.length));
            speechSynthesizer.speak(voiceMsg, language);

            // Close modal & navigate to stock screen
            setIsBillScanOpen(false);
            setActiveTab('stock');

            if (lastUpdatedItem) {
              setHighlightedStockItemId(lastUpdatedItem.id);
              setTimeout(() => setHighlightedStockItemId(null), 2500);
            }
          }
        }}
      />

      {/* Price Change Toast Notification (10-second undo & view) */}
      <PriceChangeToast
        priceChange={showPriceToast ? priceChangeInfo : null}
        showViewButton={priceToastShowView}
        onView={() => {
          setActiveTab('stock');
          if (priceChangeInfo) {
            setHighlightedStockItemId(priceChangeInfo.item.id);
            setTimeout(() => setHighlightedStockItemId(null), 2000);
          }
          setPriceToastShowView(false);
        }}
        onUndo={() => {
          undoLastPriceChange();
          setShowPriceToast(false);
        }}
        onDismiss={() => setShowPriceToast(false)}
      />

      {/* PWA Home Screen Install Prompt Banner */}
      <PWAInstallPrompt />

      {/* Undo Toast Notification */}
      {showUndoToast && lastTransaction && (
        <UndoToast
          lastTransaction={lastTransaction}
          onUndo={() => {
            const res = undoLastTransaction();
            speechSynthesizer.speak(res.message, language);
            setShowUndoToast(false);
            setShowProofPrompt(false);
          }}
          onDismiss={() => setShowUndoToast(false)}
        />
      )}

      {/* Global Floating Voice Pill (All screens except Home, Wispr Flow style) */}
      <GlobalVoicePill
        visible={
          activeTab !== 'home' &&
          !voice.pendingConfirmation &&
          !isBillScanOpen &&
          !isSupplierOrdersOpen &&
          !isDailySummaryOpen &&
          !isRecoveryOpen &&
          !isSettingsOpen &&
          !isReminderSettingsOpen &&
          !isPrivacyOpen &&
          !showProofPrompt &&
          !proofTargetTx
        }
        isListening={voice.isListening}
        voiceState={voice.voiceState}
        liveTranscript={voice.liveTranscript}
        errorMessage={voice.errorMessage}
        onStartListening={voice.startListening}
        onStopListening={voice.stopListening}
      />

      {/* Fixed Bottom Tab Navigation */}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenReminderSettings={() => {
          setIsSettingsOpen(false);
          setIsReminderSettingsOpen(true);
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;

import React, { useState, useEffect } from 'react';
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
import { PWAInstallPrompt } from './components/PWA/PWAInstallPrompt';
import { useVoiceController } from './hooks/useVoiceController';
import { Customer, Transaction } from './types/schema';
import { speechSynthesizer } from './tts/speechSynthesizer';
import { getPlayableProofUrl } from './storage/proofStorage';
import {
  compute14DayStockAnalysis,
  groupOrdersBySupplier,
  computeDailySummary,
  generateDailySummaryVoice,
} from './lib/stockAnalytics';
import { useI18n } from './i18n';
import { Mic } from 'lucide-react';
import { triggerHaptic } from './lib/sound';

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
  } = useShop();

  const { language, t } = useI18n();

  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isSupplierOrdersOpen, setIsSupplierOrdersOpen] = useState(false);
  const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryThreshold, setRecoveryThreshold] = useState(1000);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUndoToast, setShowUndoToast] = useState(false);

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

  // Voice Flow Controller Hook
  const voice = useVoiceController({
    customers,
    items,
    transactions,
    isOnline,
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
    onOpenSupplierOrders: () => setIsSupplierOrdersOpen(true),
    onOpenDailySummary: () => setIsDailySummaryOpen(true),
    onOpenRecovery: (threshold) => {
      setRecoveryThreshold(threshold);
      setIsRecoveryOpen(true);
    },
  });

  if (!isLoggedIn) {
    return <Auth />;
  }

  if (isLocked) {
    return <PinLock />;
  }

  const handleSelectCustomer = (_customer: Customer) => {
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
                onSelectCustomerSuggestion={(name) =>
                  voice.processInput(`${name} ko 500 ka udhaar`)
                }
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
                onOpenSupplierOrders={() => setIsSupplierOrdersOpen(true)}
                onQuickStockOrder={(_item) => setIsSupplierOrdersOpen(true)}
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
        onClose={() => setIsSupplierOrdersOpen(false)}
        drafts={supplierDrafts}
        shopName={shop.name}
        language={language}
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
        onReminderSent={(_draft) => {
          // Can record to reminder history if needed
        }}
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

      {/* Fixed Bottom Tab Navigation */}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;

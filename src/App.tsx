import React, { useState, useEffect } from 'react';
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
import { useVoiceController } from './hooks/useVoiceController';
import { Customer } from './types/schema';
import { speechSynthesizer } from './tts/speechSynthesizer';
import { useI18n } from './i18n';

export const AppContent: React.FC = () => {
  const {
    isLoggedIn,
    isLocked,
    customers,
    items,
    lastTransaction,
    addTransaction,
    undoLastTransaction,
  } = useShop();

  const { language } = useI18n();

  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUndoToast, setShowUndoToast] = useState(false);

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
      const timer = setTimeout(() => setShowUndoToast(false), 9000);
      return () => clearTimeout(timer);
    }
  }, [lastTransaction]);

  // Voice Flow Controller Hook
  const voice = useVoiceController({
    customers,
    items,
    isOnline,
    onSaveTransaction: (txData) => {
      const savedTx = addTransaction(txData);
      return savedTx;
    },
    onUndoLast: () => {
      const res = undoLastTransaction();
      setShowUndoToast(false);
      return res;
    },
    onNavigateTab: (tab) => setActiveTab(tab),
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
    voice.processInput('aaj kitni kamai hui');
  };

  return (
    <div className="h-full flex flex-col bg-background relative overflow-y-auto font-sans">
      {/* Sticky Top Header */}
      <Header onOpenSettings={() => setIsSettingsOpen(true)} isOnline={isOnline} />

      {/* Main Tab Screen Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'home' && (
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
        )}

        {activeTab === 'ledger' && (
          <Ledger
            onSelectCustomer={handleSelectCustomer}
            onOpenRecovery={() => voice.processInput('jinka 1000 se zyada baaki hai unko yaad dilao')}
            onPlayProof={(_clipPath) => {
              speechSynthesizer.speak('ग्राहक की सहमति का सबूत: हाँ, 500 रुपये मेरे नाम लिख दो', language);
            }}
            onQuickAction={handleQuickCustomerAction}
          />
        )}

        {activeTab === 'stock' && (
          <Stock
            onOpenSupplierOrders={() => voice.processInput('agle hafte ka samaan mangwana hai')}
            onQuickStockOrder={(item) =>
              voice.processInput(`${item.name} ka order banao`)
            }
          />
        )}

        {activeTab === 'today' && (
          <Today onSpeakSummary={handleSpeakTodaySummary} />
        )}
      </main>

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

      {/* Undo Toast Notification */}
      {showUndoToast && lastTransaction && (
        <UndoToast
          lastTransaction={lastTransaction}
          onUndo={() => {
            const res = undoLastTransaction();
            speechSynthesizer.speak(res.message, language);
            setShowUndoToast(false);
          }}
          onDismiss={() => setShowUndoToast(false)}
        />
      )}

      {/* Fixed Bottom Tab Navigation */}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;

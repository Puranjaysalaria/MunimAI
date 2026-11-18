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
import { Customer } from './types/schema';

export const AppContent: React.FC = () => {
  const { isLoggedIn, isLocked } = useShop();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  // Voice placeholder states (will be wired in Phase 2 & 3)
  const [isListening, setIsListening] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'success' | 'error'>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLoggedIn) {
    return <Auth />;
  }

  if (isLocked) {
    return <PinLock />;
  }

  const handleStartVoice = () => {
    if (isListening) {
      setIsListening(false);
      setVoiceState('idle');
    } else {
      setIsListening(true);
      setVoiceState('listening');
      setErrorMessage(null);
      // Demo simulated prompt if mic is tapped before Phase 2/3 full wiring
      setLiveTranscript('सुन रहे हैं... बोलिए');
      setTimeout(() => {
        setIsListening(false);
        setVoiceState('idle');
        setLiveTranscript('');
      }, 3000);
    }
  };

  const handleTextSubmit = (text: string) => {
    setLiveTranscript(text);
    setVoiceState('thinking');
    setTimeout(() => {
      setVoiceState('idle');
    }, 1000);
  };

  const handleSelectCustomer = (_customer: Customer) => {
    setActiveTab('ledger');
  };

  return (
    <div className="h-full flex flex-col bg-background relative overflow-y-auto font-sans">
      {/* Sticky Top Header */}
      <Header onOpenSettings={() => setIsSettingsOpen(true)} isOnline={isOnline} />

      {/* Main Tab Screen Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'home' && (
          <Home
            onStartVoice={handleStartVoice}
            onTextSubmit={handleTextSubmit}
            isListening={isListening}
            voiceState={voiceState}
            liveTranscript={liveTranscript}
            errorMessage={errorMessage}
            onRetryVoice={handleStartVoice}
            onSelectCustomerSuggestion={(name) => handleTextSubmit(`${name} ko 500 ka udhaar`)}
          />
        )}

        {activeTab === 'ledger' && (
          <Ledger
            onSelectCustomer={handleSelectCustomer}
            onOpenRecovery={() => alert('तगादा फीचर: 1000+ वालों को रिमाइंडर')}
            onPlayProof={(clipPath) => alert(`आवाज का सबूत: ${clipPath}`)}
            onQuickAction={(customer, action) =>
              handleTextSubmit(
                action === 'credit'
                  ? `${customer.name} ko 500 ka udhaar`
                  : `${customer.name} ne 500 diye`
              )
            }
          />
        )}

        {activeTab === 'stock' && (
          <Stock
            onOpenSupplierOrders={() => alert('सप्लायर आर्डर लिस्ट')}
            onQuickStockOrder={(item) =>
              alert(`${item.name} का आर्डर सप्लायर को तैयार किया गया`)
            }
          />
        )}

        {activeTab === 'today' && (
          <Today onSpeakSummary={() => alert('आज की कुल कमाई बोलकर सुनाई जा रही है')} />
        )}
      </main>

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

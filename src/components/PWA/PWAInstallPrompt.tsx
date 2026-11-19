import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '../../lib/sound';
import { useI18n } from '../../i18n';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Check if user dismissed recently
      const dismissedTime = localStorage.getItem('munim_pwa_dismissed');
      if (!dismissedTime || Date.now() - Number(dismissedTime) > 24 * 3600000) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    triggerHaptic('start');
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    triggerHaptic('stop');
    setShowBanner(false);
    localStorage.setItem('munim_pwa_dismissed', String(Date.now()));
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto animate-slide-up select-none">
      <div className="bg-primary text-white p-3.5 rounded-2xl shadow-xl border-2 border-emerald-600 flex items-center justify-between space-x-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-accent text-zinc-950 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <h3 className="font-bold text-sm text-white leading-tight">
                {t.pwa.installApp}
              </h3>
              <CheckCircle className="w-3.5 h-3.5 text-accent" />
            </div>
            <p className="text-[11px] text-emerald-100">
              {t.pwa.worksOffline}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={handleInstallClick}
            className="touch-target-64 px-3.5 py-2 bg-accent hover:bg-accent-hover text-app-text font-black text-xs rounded-xl shadow-md active:scale-95 flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.pwa.installBtn}</span>
          </button>

          <button
            onClick={handleDismiss}
            className="p-2 text-emerald-200 hover:text-white active:scale-95"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useShop } from '../../context/ShopContext';
import { useI18n } from '../../i18n';
import { Lock, Globe, Store, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  isOnline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, isOnline = true }) => {
  const { shop, lockApp, hasPin } = useShop();
  const { language, setLanguage, availableLanguages } = useI18n();

  return (
    <header className="bg-primary text-white px-4 py-3 shadow-md flex items-center justify-between select-none z-30 sticky top-0">
      <div className="flex items-center space-x-2.5 overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-accent">
          <Store className="w-6 h-6" />
        </div>
        <div className="truncate">
          <h1 className="font-bold text-lg leading-tight truncate">{shop.name}</h1>
          <div className="flex items-center space-x-2 text-xs text-emerald-100">
            <span className="flex items-center">
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 mr-1 text-emerald-300" />
                  <span>ऑनलाइन</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1 text-amber-300" />
                  <span className="text-amber-200">ऑफलाइन</span>
                </>
              )}
            </span>
            <span>•</span>
            <span className="font-mono text-emerald-200">{shop.owner_phone}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 flex-shrink-0">
        {/* Quick Language Toggle */}
        <button
          onClick={() => {
            const nextIndex = (availableLanguages.findIndex((l) => l.code === language) + 1) % availableLanguages.length;
            setLanguage(availableLanguages[nextIndex].code);
          }}
          className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-transform flex items-center space-x-1 text-xs font-semibold"
          title="Change Language"
          aria-label="Change Language"
        >
          <Globe className="w-4 h-4 text-accent" />
          <span className="uppercase text-white text-xs">{language}</span>
        </button>

        {/* Lock App (if PIN set) */}
        {hasPin && (
          <button
            onClick={lockApp}
            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-transform"
            title="Lock Ledger"
            aria-label="Lock Ledger"
          >
            <Lock className="w-4 h-4 text-emerald-100" />
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-transform font-bold text-sm"
          title="Settings"
          aria-label="Settings"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
};

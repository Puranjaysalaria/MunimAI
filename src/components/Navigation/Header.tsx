import React from 'react';
import { motion } from 'framer-motion';
import { useShop } from '../../context/ShopContext';
import { useI18n } from '../../i18n';
import { Lock, Globe, Store, Wifi, WifiOff, Cloud, RefreshCw, Settings } from 'lucide-react';
import { triggerHaptic } from '../../lib/sound';

interface HeaderProps {
  onOpenSettings: () => void;
  isOnline?: boolean;
  pendingSyncCount?: number;
  onTriggerSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  isOnline = true,
  pendingSyncCount = 0,
  onTriggerSync,
}) => {
  const { shop, lockApp, hasPin } = useShop();
  const { language, setLanguage, availableLanguages } = useI18n();

  return (
    <header className="bg-gradient-to-r from-emerald-950 via-primary to-emerald-900 text-white px-4 py-3 shadow-md flex items-center justify-between select-none z-30 sticky top-0 border-b border-emerald-800/40 backdrop-blur-xl">
      <div className="flex items-center space-x-3 overflow-hidden">
        {/* Animated Store Emblem */}
        <motion.div
          whileHover={{ scale: 1.05, rotate: 2 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 border border-white/20 flex items-center justify-center flex-shrink-0 text-accent shadow-xs"
        >
          <Store className="w-5 h-5 text-accent stroke-[2.2]" />
        </motion.div>

        <div className="truncate">
          <div className="flex items-center space-x-2">
            <h1 className="font-black text-base leading-tight truncate tracking-tight text-white">
              {shop.name}
            </h1>
            <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md bg-accent/20 text-accent border border-accent/30 tracking-wider">
              PRO
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-emerald-200/90 mt-0.5">
            {/* Live radar status dot */}
            <span className="flex items-center space-x-1">
              {isOnline ? (
                <>
                  <span className="relative flex h-2 w-2 mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <Wifi className="w-3 h-3 text-emerald-300" />
                  <span className="font-semibold">ऑनलाइन</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400 mr-0.5" />
                  <WifiOff className="w-3 h-3 text-amber-300" />
                  <span className="text-amber-200 font-semibold">ऑफलाइन</span>
                </>
              )}
            </span>

            <span>•</span>

            {/* Offline Sync Status Indicator */}
            {pendingSyncCount > 0 ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  triggerHaptic('start');
                  onTriggerSync?.();
                }}
                className="flex items-center bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 px-2 py-0.5 rounded-md text-[11px] font-bold border border-amber-400/30"
                title="Tap to sync pending transactions"
              >
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                <span>{pendingSyncCount} सिंक बाकी</span>
              </motion.button>
            ) : isOnline ? (
              <span className="flex items-center text-emerald-200 font-medium">
                <Cloud className="w-3.5 h-3.5 mr-0.5 text-emerald-300" />
                <span>क्लाउड सुरक्षित</span>
              </span>
            ) : (
              <span className="text-gray-300">फोन में सुरक्षित</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 flex-shrink-0">
        {/* Quick Language Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic('light');
            const nextIndex =
              (availableLanguages.findIndex((l) => l.code === language) + 1) %
              availableLanguages.length;
            setLanguage(availableLanguages[nextIndex].code);
          }}
          className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10 flex items-center space-x-1.5 text-xs font-bold text-white transition-colors"
          title="Change Language"
          aria-label="Change Language"
        >
          <Globe className="w-3.5 h-3.5 text-accent" />
          <span className="uppercase text-[11px] tracking-wider">{language}</span>
        </motion.button>

        {/* Lock App (if PIN set) */}
        {hasPin && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              triggerHaptic('start');
              lockApp();
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10 text-emerald-100"
            title="Lock Ledger"
            aria-label="Lock Ledger"
          >
            <Lock className="w-4 h-4" />
          </motion.button>
        )}

        {/* Settings Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic('light');
            onOpenSettings();
          }}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10 text-emerald-100"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4 text-emerald-100" />
        </motion.button>
      </div>
    </header>
  );
};

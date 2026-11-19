import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShop } from '../../context/ShopContext';
import { useI18n } from '../../i18n';
import {
  Lock,
  Globe,
  Store,
  Wifi,
  WifiOff,
  Cloud,
  RefreshCw,
  Settings,
  Home,
  BookOpen,
  Package,
  TrendingUp,
  X,
  Check,
} from 'lucide-react';
import { triggerHaptic } from '../../lib/sound';
import { TabKey } from './BottomTabBar';

interface HeaderProps {
  onOpenSettings: () => void;
  isOnline?: boolean;
  pendingSyncCount?: number;
  onTriggerSync?: () => void;
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  isOnline = true,
  pendingSyncCount = 0,
  onTriggerSync,
  activeTab,
  onTabChange,
}) => {
  const { shop, lockApp, hasPin } = useShop();
  const { language, setLanguage, availableLanguages, t } = useI18n();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const navTabs: { key: TabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'home', label: t.tabs.home, icon: Home },
    { key: 'ledger', label: t.tabs.ledger, icon: BookOpen },
    { key: 'stock', label: t.tabs.stock, icon: Package },
    { key: 'today', label: t.tabs.today, icon: TrendingUp },
  ];

  return (
    <>
      <header className="bg-gradient-to-r from-emerald-950 via-primary to-emerald-900 text-white shadow-md select-none z-30 sticky top-0 border-b border-emerald-800/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          {/* Brand & Store Info */}
          <div className="flex items-center space-x-3 overflow-hidden">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 border border-white/20 flex items-center justify-center flex-shrink-0 text-accent shadow-xs"
            >
              <Store className="w-5 h-5 text-accent stroke-[2.2]" />
            </motion.div>

            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h1 className="font-black text-base sm:text-lg leading-tight truncate tracking-tight text-white">
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
                      <span className="font-semibold">{t.header.online}</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-amber-400 mr-0.5" />
                      <WifiOff className="w-3 h-3 text-amber-300" />
                      <span className="text-amber-200 font-semibold">{t.header.offline}</span>
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
                    <span>{pendingSyncCount} {t.header.syncPending}</span>
                  </motion.button>
                ) : isOnline ? (
                  <span className="flex items-center text-emerald-200 font-medium">
                    <Cloud className="w-3.5 h-3.5 mr-0.5 text-emerald-300" />
                    <span>{t.header.cloudSecured}</span>
                  </span>
                ) : (
                  <span className="text-gray-300">{t.header.allSynced}</span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on Mobile, Clean on Laptop) */}
          {activeTab && onTabChange && (
            <nav className="hidden md:flex items-center space-x-1 bg-black/20 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      triggerHaptic('light');
                      onTabChange(tab.key);
                    }}
                    className={`relative px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all focus:outline-none ${
                      isActive ? 'text-slate-900' : 'text-emerald-100 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="desktopHeaderTabPill"
                        className="absolute inset-0 bg-white rounded-xl shadow-md"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <Icon
                      className={`relative z-10 w-4 h-4 ${
                        isActive ? 'text-primary stroke-[2.5]' : 'text-emerald-200'
                      }`}
                    />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Header Right Actions */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {/* Quick Language Picker Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                triggerHaptic('light');
                setIsLangModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10 flex items-center space-x-1.5 text-xs font-bold text-white transition-colors"
              title={t.header.changeLanguage}
              aria-label={t.header.changeLanguage}
            >
              <Globe className="w-3.5 h-3.5 text-accent" />
              <span className="uppercase text-[11px] tracking-wider font-mono">{language}</span>
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
        </div>
      </header>

      {/* Language Selector Modal Popup */}
      <AnimatePresence>
        {isLangModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLangModalOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            {/* Language Selection Card */}
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative z-10 bg-white w-full max-w-md sm:max-w-lg rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl border-t-4 sm:border border-primary sm:border-slate-200 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-primary flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-tight">
                      {t.header.selectLanguageModalTitle}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">10 Indian Commercial Languages</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLangModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Language Grid */}
              <div className="grid grid-cols-2 gap-2.5 my-5 max-h-[60vh] overflow-y-auto pr-1">
                {availableLanguages.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <motion.button
                      key={lang.code}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        triggerHaptic('success');
                        setLanguage(lang.code);
                        setIsLangModalOpen(false);
                      }}
                      className={`p-3 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-emerald-50/80 shadow-xs ring-2 ring-primary/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-slate-900 tracking-tight">
                          {lang.nativeLabel}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="mt-1">
                        <p className="text-xs font-semibold text-slate-600 truncate">{lang.label}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{lang.region}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

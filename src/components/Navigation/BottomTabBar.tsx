import React from 'react';
import { useI18n } from '../../i18n';
import { Home, BookOpen, Package, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { triggerHaptic } from '../../lib/sound';

export type TabKey = 'home' | 'ledger' | 'stock' | 'today';

interface BottomTabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabChange }) => {
  const { t } = useI18n();

  const tabs: { key: TabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'home', label: t.tabs.home, icon: Home },
    { key: 'ledger', label: t.tabs.ledger, icon: BookOpen },
    { key: 'stock', label: t.tabs.stock, icon: Package },
    { key: 'today', label: t.tabs.today, icon: TrendingUp },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 pointer-events-none select-none">
      <nav
        className="max-w-md mx-auto pointer-events-auto rounded-3xl glass-panel shadow-dock border border-white/70 p-1.5 flex items-center justify-around"
        role="navigation"
        aria-label="Main Navigation"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => {
                triggerHaptic('light');
                onTabChange(tab.key);
              }}
              className="relative flex-1 py-2 px-1 flex flex-col items-center justify-center rounded-2xl transition-all active:scale-95 touch-target-64 focus:outline-none"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Animated Floating Pill Background */}
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}

              {/* Icon Container with Spring Animation */}
              <motion.div
                animate={{
                  scale: isActive ? 1.15 : 1,
                  y: isActive ? -2 : 0,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                className={`relative z-10 flex items-center justify-center ${
                  isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </motion.div>

              {/* Tab Label */}
              <span
                className={`relative z-10 text-[11px] font-bold mt-1 tracking-tight transition-colors ${
                  isActive ? 'text-primary font-black' : 'text-gray-500 font-medium'
                }`}
              >
                {tab.label}
              </span>

              {/* Tiny glowing dot under active tab */}
              {isActive && (
                <motion.span
                  layoutId="activeTabDot"
                  className="absolute -bottom-0.5 w-1.5 h-1.5 bg-primary rounded-full shadow-sm"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

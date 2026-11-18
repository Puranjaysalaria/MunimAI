import React from 'react';
import { useI18n } from '../../i18n';
import { Home, BookOpen, Package, TrendingUp } from 'lucide-react';

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
    <nav
      className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-200/80 shadow-sheet z-40 pb-[env(safe-area-inset-bottom)] select-none"
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`touch-target-64 flex flex-col items-center justify-center relative transition-colors duration-200 active:scale-95 ${
                isActive ? 'text-primary' : 'text-app-muted hover:text-app-text'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={`relative flex items-center justify-center p-1.5 rounded-full transition-all ${
                  isActive ? 'bg-primary-light text-primary' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span
                className={`text-[11px] font-semibold mt-0.5 tracking-tight ${
                  isActive ? 'text-primary font-bold' : 'text-app-muted'
                }`}
              >
                {tab.label}
              </span>

              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-primary rounded-b-full shadow-sm" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

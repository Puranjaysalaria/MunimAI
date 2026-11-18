import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { Lock, Delete, LogOut } from 'lucide-react';
import { triggerHaptic } from '../lib/sound';

export const PinLock: React.FC = () => {
  const { unlockWithPin, logout, shop } = useShop();
  const { t } = useI18n();

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDigit = (digit: string) => {
    triggerHaptic('start');
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);

      if (nextPin.length === 4) {
        // Auto check
        setTimeout(() => {
          const success = unlockWithPin(nextPin);
          if (!success) {
            triggerHaptic('error');
            setError(t.auth.invalidPin);
            setPin('');
          } else {
            triggerHaptic('success');
          }
        }, 120);
      }
    }
  };

  const handleDelete = () => {
    triggerHaptic('start');
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col justify-between p-6 select-none max-w-md mx-auto">
      {/* Top Header */}
      <div className="pt-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-3">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-app-text">{shop.name}</h2>
        <p className="text-sm text-app-muted mt-1">{t.auth.enterPinSubtitle}</p>

        {/* PIN Indicators */}
        <div className="flex justify-center space-x-4 mt-8">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                pin.length > index
                  ? 'bg-primary scale-125'
                  : 'bg-gray-300 border border-gray-400'
              }`}
            />
          ))}
        </div>

        {error ? (
          <p className="text-owed text-sm font-semibold mt-4 animate-bounce">{error}</p>
        ) : (
          <p className="text-xs text-gray-400 mt-4">डिफ़ॉल्ट पिन: 1234</p>
        )}
      </div>

      {/* 64px Numpad */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigit(digit)}
            className="touch-target-64 bg-surface hover:bg-gray-100 active:scale-90 active:bg-primary/10 rounded-2xl shadow-sm border border-gray-200 text-2xl font-bold text-app-text transition-transform flex items-center justify-center"
          >
            {digit}
          </button>
        ))}

        {/* Bottom row: Logout, 0, Backspace */}
        <button
          onClick={logout}
          className="touch-target-64 text-app-muted hover:text-owed flex items-center justify-center text-xs font-semibold"
          title="Logout"
        >
          <LogOut className="w-5 h-5 mr-1" />
          <span>लॉगआउट</span>
        </button>

        <button
          onClick={() => handleDigit('0')}
          className="touch-target-64 bg-surface hover:bg-gray-100 active:scale-90 active:bg-primary/10 rounded-2xl shadow-sm border border-gray-200 text-2xl font-bold text-app-text transition-transform flex items-center justify-center"
        >
          0
        </button>

        <button
          onClick={handleDelete}
          className="touch-target-64 text-app-muted active:scale-90 hover:text-app-text flex items-center justify-center"
          title="Delete"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

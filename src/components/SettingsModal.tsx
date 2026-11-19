import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { LanguageCode } from '../i18n/types';
import { X, Globe, Lock, Shield, LogOut, Check, Store, UserCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrivacy?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenPrivacy }) => {
  const { shop, user, updateShopSettings, setShopPin, setUserRole, logout } = useShop();
  const { language, setLanguage, availableLanguages, t } = useI18n();

  const [shopName, setShopName] = useState(shop.name);
  const [upiId, setUpiId] = useState(shop.upi_id || '');
  const [pinInput, setPinInput] = useState(shop.pin_hash || '');
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateShopSettings({
      name: shopName,
      upi_id: upiId,
    });
    if (pinInput.length === 4) {
      setShopPin(pinInput);
    }
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
      <div className="bg-surface w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-sheet max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-app-text flex items-center">
            <Store className="w-5 h-5 mr-2 text-primary" />
            {t.settings.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 pt-4">
          {/* Language Selection */}
          <div>
            <label className="block text-sm font-bold text-app-text mb-2 flex items-center">
              <Globe className="w-4 h-4 mr-1.5 text-primary" />
              {t.settings.language}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code as LanguageCode)}
                  className={`touch-target-64 flex flex-col items-center justify-center rounded-xl border-2 transition-all p-2 ${
                    language === lang.code
                      ? 'border-primary bg-primary-light text-primary font-bold'
                      : 'border-gray-200 bg-gray-50 text-app-text hover:bg-gray-100'
                  }`}
                >
                  <span className="text-sm font-bold">{lang.nativeLabel}</span>
                  <span className="text-[11px] text-app-muted">{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shop Details */}
          <div>
            <label className="block text-sm font-bold text-app-text mb-1">
              {t.settings.shopNameLabel}
            </label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* UPI ID */}
          <div>
            <label className="block text-sm font-bold text-app-text mb-1">
              {t.settings.upiIdLabel}
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="sharma@okaxis"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-app-muted mt-1">
              {t.settings.upiHelpText}
            </p>
          </div>

          {/* 4-Digit Quick PIN */}
          <div>
            <label className="block text-sm font-bold text-app-text mb-1 flex items-center">
              <Lock className="w-4 h-4 mr-1.5 text-primary" />
              {t.settings.appLockPin}
            </label>
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 font-mono text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* User Role Switcher */}
          <div>
            <label className="block text-sm font-bold text-app-text mb-2 flex items-center">
              <UserCheck className="w-4 h-4 mr-1.5 text-primary" />
              {t.settings.userRole}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUserRole('owner')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  user?.role !== 'staff'
                    ? 'border-primary bg-primary text-white shadow-xs'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              >
                {t.settings.ownerRole}
              </button>
              <button
                type="button"
                onClick={() => setUserRole('staff')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  user?.role === 'staff'
                    ? 'border-primary bg-primary text-white shadow-xs'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              >
                {t.settings.staffRole}
              </button>
            </div>
            {user?.role === 'staff' && (
              <p className="text-[11px] text-amber-700 mt-1">
                {t.settings.staffModeActive}
              </p>
            )}
          </div>

          {/* Staff role note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
            <span className="font-bold">ℹ️ {t.settings.staffRoleNotice}</span>
          </div>

          {/* Privacy Note */}
          <div
            onClick={onOpenPrivacy}
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-3 text-xs text-app-muted flex items-start space-x-2 cursor-pointer active:scale-[0.98] transition-all"
          >
            <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-app-text">{t.settings.viewPrivacyPolicy}</p>
              <p className="mt-0.5">
                {t.settings.privacySub}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="touch-target-64 w-full bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              {savedNotice ? (
                <>
                  <Check className="w-5 h-5 text-accent" />
                  <span>{t.settings.savedNotice}</span>
                </>
              ) : (
                <span>{t.settings.saveSettings}</span>
              )}
            </button>

            <button
              type="button"
              onClick={logout}
              className="touch-target-64 w-full border border-owed/30 text-owed hover:bg-owed/5 font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
            >
              <LogOut className="w-5 h-5" />
              <span>{t.settings.logout}</span>
            </button>
          </div>

          <div className="text-center text-[11px] text-gray-400 pt-1">
            {t.settings.appVersion}
          </div>
        </form>
      </div>
    </div>
  );
};

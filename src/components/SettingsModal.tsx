import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { LanguageCode } from '../i18n/types';
import { X, Globe, Lock, Shield, LogOut, Check, Store, UserCheck, Bell, ChevronRight, Mic, AlertTriangle, Volume2 } from 'lucide-react';
import { isValidUPI } from '../lib/reminderService';
import { DEFAULT_EDIT_RUPEE_THRESHOLD, DEFAULT_EDIT_AGE_DAYS_THRESHOLD } from '../voice/safetyTiers';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrivacy?: () => void;
  onOpenReminderSettings?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenPrivacy, onOpenReminderSettings }) => {
  const { shop, user, updateShopSettings, setShopPin, setUserRole, logout } = useShop();
  const { language, setLanguage, availableLanguages, t } = useI18n();

  const [shopName, setShopName] = useState(shop.name);
  const [upiId, setUpiId] = useState(shop.upi_id || '');
  const [pinInput, setPinInput] = useState(shop.pin_hash || '');
  const [wakeWordEnabled, setWakeWordEnabled] = useState(shop.settings?.wake_word_enabled ?? true);
  const [cloudSpeechEnabled, setCloudSpeechEnabled] = useState(shop.settings?.cloud_speech_enabled ?? true);
  const [editRupeeThreshold, setEditRupeeThreshold] = useState<string>(
    String(shop.settings?.edit_rupee_threshold ?? DEFAULT_EDIT_RUPEE_THRESHOLD)
  );
  const [editAgeDaysThreshold, setEditAgeDaysThreshold] = useState<string>(
    String(shop.settings?.edit_age_days_threshold ?? DEFAULT_EDIT_AGE_DAYS_THRESHOLD)
  );
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateShopSettings({
      name: shopName,
      upi_id: upiId,
      settings: {
        ...shop.settings,
        wake_word_enabled: wakeWordEnabled,
        cloud_speech_enabled: cloudSpeechEnabled,
        ...(cloudSpeechEnabled && !shop.settings?.cloud_speech_consent_at
          ? { cloud_speech_consent_at: new Date().toISOString() }
          : {}),
        edit_rupee_threshold: Math.max(0, Number(editRupeeThreshold) || DEFAULT_EDIT_RUPEE_THRESHOLD),
        edit_age_days_threshold: Math.max(0, Number(editAgeDaysThreshold) || DEFAULT_EDIT_AGE_DAYS_THRESHOLD),
      },
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

          {/* UPI ID with validation, saved display, and double-check note */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-bold text-app-text">
                {t.settings.upiIdLabel}
              </label>
              {shop.upi_id && (
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {t.settings.savedUpiLabel}: {shop.upi_id}
                </span>
              )}
            </div>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="sharma@okaxis"
              className={`w-full px-4 py-3 rounded-xl border font-mono focus:outline-none focus:ring-2 transition-all ${
                upiId.trim().length > 0
                  ? isValidUPI(upiId)
                    ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/20'
                    : 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                  : 'border-gray-300 focus:ring-primary'
              }`}
            />
            {/* Format validation feedback */}
            {upiId.trim().length > 0 && (
              <p
                className={`text-xs mt-1 font-semibold flex items-center ${
                  isValidUPI(upiId) ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {isValidUPI(upiId) ? `✓ ${t.settings.validUpiFormat}` : `⚠️ ${t.settings.invalidUpiFormat}`}
              </p>
            )}
            <p className="text-xs text-app-muted mt-1">
              {t.settings.upiHelpText}
            </p>
            {/* Double-Check Warning Callout */}
            <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{t.settings.doubleCheckUpiNote}</span>
            </div>
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

          {/* Hands-free "Munim" Wake Word Toggle */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-primary text-white">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-app-text text-sm">
                  {language === 'pa' ? '"ਮੁਨੀਮ" ਆਵਾਜ਼ ਜਾਗਰੂਕਤਾ' : language === 'en' ? 'Hands-Free "Munim" Wake Word' : '"मुनीम" हैंड्स-फ्री वेक वर्ड'}
                </p>
                <p className="mt-0.5 text-xs text-app-muted">
                  {language === 'pa' ? 'ਬਿਨਾਂ ਛੂਹੇ "ਮੁਨੀਮ" ਬੋਲ ਕੇ ਮਾਈਕ ਚਾਲੂ ਕਰੋ' : language === 'en' ? 'Say "Munim" to start listening hands-free' : '"मुनीम" बोलकर बिना छुए आवाज़ शुरू करें'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !wakeWordEnabled;
                setWakeWordEnabled(next);
                if (next && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
                  navigator.mediaDevices.getUserMedia({ audio: true })
                    .then((stream) => stream.getTracks().forEach((track) => track.stop()))
                    .catch(() => {});
                }
              }}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                wakeWordEnabled ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  wakeWordEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Payment Reminders Settings */}
          {onOpenReminderSettings && (
            <div
              onClick={onOpenReminderSettings}
              className="bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs text-app-muted flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-primary text-white">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-app-text text-sm">
                    {t.settings.reminderSettingsRow || 'Payment Reminder Settings'}
                  </p>
                  <p className="mt-0.5 text-xs text-app-muted">
                    {t.settings.reminderSettingsSub || 'Tone, threshold, safe dispatch & quiet hours'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          )}

          {/* Edit Safety Tier Thresholds */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-3">
            <p className="text-xs font-black text-amber-950">
              {t.editing.tapConfirmRequired}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Max Voice Edit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={editRupeeThreshold}
                  onChange={(e) => setEditRupeeThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm font-black text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Max Entry Age (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editAgeDaysThreshold}
                  onChange={(e) => setEditAgeDaysThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm font-black text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Cloud Speech Toggle (Phase 4) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 pr-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-app-text text-sm">Cloud speech</p>
                <p className="text-[11px] text-app-muted">
                  When off, forces browser recognition and device voice only.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={cloudSpeechEnabled}
              onClick={() => setCloudSpeechEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                cloudSpeechEnabled ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  cloudSpeechEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
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

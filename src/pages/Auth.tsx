import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { KeyRound, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export const Auth: React.FC = () => {
  const { loginWithPhone, loginDemo } = useShop();
  const { t } = useI18n();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(null);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError(t.auth.invalidPhone);
      return;
    }
    setError(null);
    setStep('otp');
    // Pre-fill demo OTP in helper text
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError(t.auth.invalidOtp);
      return;
    }
    const success = loginWithPhone(`+91${phone}`, otp);
    if (!success) {
      setError(t.auth.invalidOtp);
    }
  };

  return (
    <div className="min-h-full bg-background flex flex-col justify-between p-5 max-w-md mx-auto">
      {/* Top Hero */}
      <div className="pt-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary text-white shadow-xl mb-4">
          <span className="text-3xl font-extrabold tracking-tight">मु</span>
        </div>
        <h1 className="text-2xl font-black text-app-text">{t.auth.loginTitle}</h1>
        <p className="text-app-muted text-sm mt-1">{t.auth.loginSubtitle}</p>
      </div>

      {/* Main Login Form */}
      <div className="bg-surface rounded-2xl p-6 shadow-card border border-gray-100 my-6">
        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-app-text mb-2">
                {t.auth.phoneLabel}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 font-bold text-gray-500 text-base">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ''));
                    setError(null);
                  }}
                  placeholder={t.auth.phonePlaceholder}
                  className="w-full pl-14 pr-4 py-3.5 text-lg font-bold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50/50"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <p className="text-owed text-sm font-medium animate-pulse">{error}</p>
            )}

            <button
              type="submit"
              className="touch-target-64 w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <span>{t.auth.getOtp}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-app-text">
                  {t.auth.otpTitle}
                </label>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  {t.auth.switchUser}
                </button>
              </div>
              <input
                type="number"
                maxLength={4}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.slice(0, 4));
                  setError(null);
                }}
                placeholder="1234"
                className="w-full text-center tracking-[0.5em] text-2xl font-black py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50/50"
                autoFocus
              />
              <p className="text-xs text-app-muted mt-2 text-center">
                डेमो के लिए OTP दर्ज करें: <span className="font-mono font-bold text-primary">1234</span>
              </p>
            </div>

            {error && (
              <p className="text-owed text-sm font-medium text-center">{error}</p>
            )}

            <button
              type="submit"
              className="touch-target-64 w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <KeyRound className="w-5 h-5 mr-1" />
              <span>{t.auth.verifyOtp}</span>
            </button>
          </form>
        )}
      </div>

      {/* 1-Tap Demo Login Button */}
      <div className="space-y-3 pb-6">
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-xs font-semibold text-gray-500 uppercase">
            या तुरंत चलाकर देखें
          </span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <button
          onClick={loginDemo}
          className="touch-target-64 w-full bg-accent hover:bg-accent-hover text-app-text font-black text-base rounded-2xl shadow-mic transition-all active:scale-[0.98] flex items-center justify-center space-x-2 border-2 border-amber-500/20"
        >
          <Sparkles className="w-5 h-5 text-amber-900" />
          <span>{t.auth.demoLogin}</span>
        </button>

        <div className="flex items-center justify-center space-x-1.5 text-xs text-app-muted pt-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>सुरक्षित और निजी • आपकी दुकान का डेटा सिर्फ आपके पास</span>
        </div>
      </div>
    </div>
  );
};

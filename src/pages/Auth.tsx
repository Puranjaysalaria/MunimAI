import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { KeyRound, Sparkles, ArrowRight, ShieldCheck, Mail, Lock, Store, User, Loader2, Eye, EyeOff } from 'lucide-react';

export const Auth: React.FC = () => {
  const { loginWithSupabase, signUpWithSupabase, loginDemo } = useShop();
  const { t, language } = useI18n();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('shopkeeper@munimai.com');
  const [password, setPassword] = useState('MunimStore123!');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t.auth.errEmailPasswordRequired);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await loginWithSupabase(email, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || t.auth.errInvalidCredentials);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !shopName) {
      setError(t.auth.errRegisterRequired);
      return;
    }
    if (password.length < 6) {
      setError(t.auth.errPasswordMinLength);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await signUpWithSupabase(email, password, shopName, ownerName);
    setLoading(false);

    if (!res.success) {
      setError(res.error || t.auth.errRegisterFailed);
    }
  };

  const handleQuickDemo = async () => {
    setLoading(true);
    setError(null);
    await loginDemo();
    setLoading(false);
  };

  const fillDemoCreds = () => {
    setEmail('shopkeeper@munimai.com');
    setPassword('MunimStore123!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-ambient-canvas flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-md lg:max-w-3xl bg-surface rounded-3xl shadow-float border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Compact Kirana Branding Banner */}
        <div className="lg:col-span-5 bg-gradient-to-br from-primary-dark via-primary to-emerald-900 text-white p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
          {/* Ambient decorative backdrop rings */}
          <div className="absolute -top-16 -left-16 w-44 h-44 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-52 h-52 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand identity */}
          <div className="relative z-10 text-center lg:text-left">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg mb-2.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {language === 'en' ? 'M' : 'मु'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{t.auth.loginTitle}</h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 font-medium">{t.auth.loginSubtitle}</p>
          </div>

          {/* Value Propositions: Compact cards on desktop */}
          <div className="hidden lg:flex flex-col space-y-2.5 my-5 relative z-10">
            <div className="flex items-start space-x-3 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{t.auth.voiceFirstHighlight}</h4>
                <p className="text-[11px] text-emerald-100/90 mt-0.5">{t.auth.voiceFirstSub}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{t.auth.cloudSecurityHighlight}</h4>
                <p className="text-[11px] text-emerald-100/90 mt-0.5">{t.auth.cloudSecuritySub}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{t.auth.offlineSyncHighlight}</h4>
                <p className="text-[11px] text-emerald-100/90 mt-0.5">{t.auth.offlineSyncSub}</p>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="relative z-10 pt-2.5 border-t border-white/15 text-[11px] text-emerald-200/80 text-center lg:text-left hidden lg:block">
            <span>{t.auth.dedicatedFootnote}</span>
          </div>
        </div>

        {/* Right Column: Compact Login & Registration Form */}
        <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between bg-surface">
          <div>
            {/* Tab Toggle: Sign In vs Sign Up */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 text-sm font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  if (!email) setEmail('shopkeeper@munimai.com');
                  if (!password) setPassword('MunimStore123!');
                }}
                className={`flex-1 py-2.5 rounded-xl transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-primary shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {t.auth.signInTab}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  if (email === 'shopkeeper@munimai.com') setEmail('');
                  if (password === 'MunimStore123!') setPassword('');
                }}
                className={`flex-1 py-2.5 rounded-xl transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-primary shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {t.auth.registerTab}
              </button>
            </div>

            {/* Main Form Body */}
            {mode === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.auth.emailLabel}
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="shopkeeper@munimai.com"
                      className="w-full pl-11 pr-4 py-3 text-base font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.auth.passwordLabel}
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-11 py-3 text-base font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Quick Demo Credential Pill */}
                <div className="flex items-center justify-between text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
                  <div>
                    <span className="font-bold">{t.auth.demoCredsLabel} </span>
                    <span className="font-mono font-medium">shopkeeper@munimai.com</span>
                  </div>
                  <button
                    type="button"
                    onClick={fillDemoCreds}
                    className="text-primary font-black hover:underline ml-2"
                  >
                    {t.auth.fillDemoBtn}
                  </button>
                </div>

                {error && (
                  <p className="text-owed text-sm font-bold bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="touch-target-64 w-full bg-primary hover:bg-primary-dark text-white font-black text-base rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t.auth.authenticating}</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-5 h-5" />
                      <span>{t.auth.liveLoginBtn}</span>
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    {t.auth.shopNameLabel}
                  </label>
                  <div className="relative flex items-center">
                    <Store className="absolute left-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder={t.auth.shopNamePlaceholder}
                      className="w-full pl-11 pr-4 py-2.5 text-base font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    {t.auth.ownerNameLabel}
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder={t.auth.ownerNamePlaceholder}
                      className="w-full pl-11 pr-4 py-2.5 text-base font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    {t.auth.emailLabel}
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@example.com"
                      className="w-full pl-11 pr-4 py-2.5 text-base font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    {t.auth.passwordLabel}
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-11 py-2.5 text-base font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-owed text-sm font-bold bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="touch-target-64 w-full bg-primary hover:bg-primary-dark text-white font-black text-base rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t.auth.creatingAccount}</span>
                    </>
                  ) : (
                    <>
                      <Store className="w-5 h-5" />
                      <span>{t.auth.createShopBtn}</span>
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* 1-Tap Instant Live Cloud Login Button & Security Badges */}
          <div className="space-y-3 pt-6 mt-4 border-t border-slate-100">
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t.auth.orInstantOpen}
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              onClick={handleQuickDemo}
              disabled={loading}
              className="touch-target-64 w-full bg-accent hover:bg-accent-hover text-app-text font-black text-base rounded-2xl shadow-mic-hero transition-all active:scale-[0.98] flex items-center justify-center space-x-2 border-2 border-amber-500/40"
            >
              <Sparkles className="w-5 h-5 text-amber-950" />
              <span>{t.auth.instantDemoBtn}</span>
            </button>

            <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t.auth.securityBadge}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

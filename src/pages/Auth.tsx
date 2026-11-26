import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  KeyRound,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Mail,
  Lock,
  Store,
  User,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

export const Auth: React.FC = () => {
  const { loginWithSupabase, signUpWithSupabase } = useShop();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleModeSwitch = (nextMode: 'signin' | 'signup') => {
    setMode(nextMode);
    setError(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await loginWithSupabase(email, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Invalid email or password.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !email.trim() || !password) {
      setError('Please fill in shop name, email, and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await signUpWithSupabase(email, password, shopName.trim(), ownerName.trim());
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Could not create account. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-ambient-canvas flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-md lg:max-w-3xl bg-surface rounded-2xl sm:rounded-3xl shadow-float border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 my-auto">
        {/* Left Column: Compact Branding Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-primary-dark via-primary to-emerald-900 text-white p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-14 -left-14 w-40 h-40 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center lg:block gap-3.5 text-left">
            <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-md shrink-0 lg:mb-3">
              <span className="text-xl sm:text-2xl font-black tracking-tight">M</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight">
                Munim AI
              </h1>
              <p className="text-emerald-100/90 text-xs sm:text-sm mt-0.5 font-medium">
                Voice-first khata &amp; smart shop ledger
              </p>
            </div>
          </div>

          <div className="hidden lg:flex flex-col space-y-2.5 my-5 relative z-10">
            <div className="flex items-start space-x-2.5 bg-white/10 p-2.5 rounded-xl border border-white/10">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Voice-First Entries</h4>
                <p className="text-[11px] text-emerald-100/85 mt-0.5 leading-snug">
                  Speak naturally in your language to record udhaar, payments, and bills.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 bg-white/10 p-2.5 rounded-xl border border-white/10">
              <div className="w-7 h-7 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Private Shop Ledger</h4>
                <p className="text-[11px] text-emerald-100/85 mt-0.5 leading-snug">
                  Your shop data stays isolated and encrypted in your own account.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 bg-white/10 p-2.5 rounded-xl border border-white/10">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                <Store className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Offline + Cloud Sync</h4>
                <p className="text-[11px] text-emerald-100/85 mt-0.5 leading-snug">
                  Works even without internet and syncs automatically when back online.
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-2.5 border-t border-white/15 text-[11px] text-emerald-200/80 hidden lg:block">
            Built for Indian shopkeepers &amp; kirana stores
          </div>
        </div>

        {/* Right Column: Compact Responsive Auth Form */}
        <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-center bg-surface">
          {/* Segmented Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-5 text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => handleModeSwitch('signin')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-white text-primary shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('signup')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white text-primary shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/60"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/60"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-rose-700 text-xs font-semibold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-center">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl shadow-sm transition-all active:scale-[0.99] flex items-center justify-center space-x-2 disabled:opacity-60 mt-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Shop Name
                  </label>
                  <div className="relative flex items-center">
                    <Store className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Gupta General Store"
                      className="w-full pl-9 pr-3 py-2.5 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/60"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Owner Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Your name"
                      className="w-full pl-9 pr-3 py-2.5 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/60"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/60"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50/60"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-rose-700 text-xs font-semibold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-center">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl shadow-sm transition-all active:scale-[0.99] flex items-center justify-center space-x-2 disabled:opacity-60 mt-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <Store className="w-4 h-4" />
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-500 pt-4 mt-4 border-t border-slate-100">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>100% private cloud ledger • Starts clean with your own data</span>
          </div>
        </div>
      </div>
    </div>
  );
};

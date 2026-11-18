import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useI18n } from '../i18n';
import { KeyRound, Sparkles, ArrowRight, ShieldCheck, Mail, Lock, Store, User, Loader2, Eye, EyeOff } from 'lucide-react';

export const Auth: React.FC = () => {
  const { loginWithSupabase, signUpWithSupabase, loginDemo } = useShop();
  const { t } = useI18n();

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
      setError('कृपया ईमेल और पासवर्ड दोनों दर्ज करें');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await loginWithSupabase(email, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'गलत ईमेल या पासवर्ड। कृपया दोबारा जांचें।');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !shopName) {
      setError('कृपया दुकान का नाम, ईमेल और पासवर्ड दर्ज करें');
      return;
    }
    if (password.length < 6) {
      setError('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await signUpWithSupabase(email, password, shopName, ownerName);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'पंजीकरण विफल। कृपया दोबारा प्रयास करें।');
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
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Top Header & Branding */}
      <div className="pt-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary text-white shadow-xl mb-3">
          <span className="text-3xl font-extrabold tracking-tight">मु</span>
        </div>
        <h1 className="text-2xl font-black text-app-text">{t.auth.loginTitle}</h1>
        <p className="text-app-muted text-sm mt-1">किराना दुकान का लाइव क्लाउड बही-खाता</p>

        {/* Tab Toggle: Sign In vs Sign Up */}
        <div className="flex bg-gray-200/80 p-1 rounded-xl mt-5 text-sm font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-white text-primary shadow-sm font-black'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            लॉगिन करें (Sign In)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-white text-primary shadow-sm font-black'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            नया खाता (Register)
          </button>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="bg-surface rounded-2xl p-6 shadow-card border border-gray-100 my-4">
        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                ईमेल (Email)
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shopkeeper@munimai.com"
                  className="w-full pl-11 pr-4 py-3 text-base font-semibold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                पासवर्ड (Password)
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 text-base font-semibold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Credential Pill */}
            <div className="flex items-center justify-between text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-2.5">
              <div>
                <span className="font-bold">डेमो क्रेडेंशियल: </span>
                <span className="font-mono">shopkeeper@munimai.com</span>
              </div>
              <button
                type="button"
                onClick={fillDemoCreds}
                className="text-primary font-bold hover:underline ml-2"
              >
                भरें
              </button>
            </div>

            {error && (
              <p className="text-owed text-sm font-bold bg-red-50 border border-red-200 rounded-lg p-2.5 animate-pulse text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="touch-target-64 w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>प्रमाणीकरण हो रहा है...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  <span>लाइव लॉगिन करें</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                दुकान का नाम (Shop Name)
              </label>
              <div className="relative flex items-center">
                <Store className="absolute left-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="उदा. गुप्ता किराना स्टोर"
                  className="w-full pl-11 pr-4 py-2.5 text-base font-semibold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                दुकानदार का नाम (Owner Name)
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="उदा. राजेश गुप्ता"
                  className="w-full pl-11 pr-4 py-2.5 text-base font-semibold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                ईमेल (Email)
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full pl-11 pr-4 py-2.5 text-base font-semibold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                पासवर्ड (Password)
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="कम से कम 6 अक्षर"
                  className="w-full pl-11 pr-11 py-2.5 text-base font-semibold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-owed text-sm font-bold bg-red-50 border border-red-200 rounded-lg p-2.5 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="touch-target-64 w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>खाता बनाया जा रहा है...</span>
                </>
              ) : (
                <>
                  <Store className="w-5 h-5" />
                  <span>दुकान का खाता बनाएं</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* 1-Tap Instant Live Cloud Login Button */}
      <div className="space-y-2.5 pb-4">
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-3 text-xs font-bold text-gray-500 uppercase">
            या 1-क्लिक में लाइव क्लाउड खोलें
          </span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <button
          onClick={handleQuickDemo}
          disabled={loading}
          className="touch-target-64 w-full bg-accent hover:bg-accent-hover text-app-text font-black text-base rounded-2xl shadow-mic transition-all active:scale-[0.98] flex items-center justify-center space-x-2 border-2 border-amber-500/30"
        >
          <Sparkles className="w-5 h-5 text-amber-900" />
          <span>⚡ शर्मा किराना (लाइव Supabase) तुरंत खोलें</span>
        </button>

        <div className="flex items-center justify-center space-x-1.5 text-xs text-app-muted pt-1">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Supabase Auth 256-bit एन्क्रिप्शन • RLS डेटा सुरक्षा</span>
        </div>
      </div>
    </div>
  );
};

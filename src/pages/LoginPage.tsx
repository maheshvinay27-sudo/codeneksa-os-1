import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  Send,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { requestPasscodeDispatch, getMasterAccessConfig } from '../services/masterAuthService';

export const LoginPage: React.FC = () => {
  const { loginWithMasterCredentials, loginWithPasscode } = useAuth();
  const { success, error } = useNotification();

  const [authMethod, setAuthMethod] = useState<'credentials' | 'passcode'>('credentials');

  // Credentials state
  const [username, setUsername] = useState('9182029334');
  const [password, setPassword] = useState('Vinay@143');
  const [showPassword, setShowPassword] = useState(false);

  // Passcode state
  const [targetEmail, setTargetEmail] = useState('vurukurthisriramavinay@gmail.com');
  const [passcode, setPasscode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load configured owner email & username on mount
  useEffect(() => {
    getMasterAccessConfig()
      .then((cfg) => {
        if (cfg.passcodeEmail) setTargetEmail(cfg.passcodeEmail);
        if (cfg.username) setUsername(cfg.username);
      })
      .catch((err) => console.warn('Could not prefill master config', err));
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Credentials Submit
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setAuthError('Please provide both username and password.');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      await loginWithMasterCredentials(username, password);
      success('Access Granted', 'Welcome to Codeneksa OS Operations.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials.';
      setAuthError(msg);
      error('Authentication Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Request Passcode
  const handleSendPasscode = async () => {
    setIsSendingCode(true);
    setAuthError(null);

    try {
      const res = await requestPasscodeDispatch();
      setCodeSent(true);
      setCooldown(60);
      setTargetEmail(res.targetEmail);
      if (res.devPasscode) {
        setDevCode(res.devPasscode);
      }
      success('Passcode Dispatched', res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send passcode.';
      setAuthError(msg);
      error('Passcode Error', msg);
    } finally {
      setIsSendingCode(false);
    }
  };

  // Handle Passcode Submit
  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError('Please enter the 6-digit passcode.');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      await loginWithPasscode(passcode);
      success('Identity Verified', 'Welcome, Owner Vinay.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Passcode verification failed.';
      setAuthError(msg);
      error('Authentication Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-2xl border border-slate-700/60 p-2 mb-3.5 transition-transform hover:scale-105">
            <img
              src="/codeneksa_logo.jpg"
              alt="Codeneksa Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-widest text-slate-100 uppercase">
              CODENEKSA
            </h1>
            <span className="text-xs uppercase font-black tracking-widest px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/40">
              OS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
            <span>Enhancing Intelligence</span>
            <span className="text-orange-500">✈</span>
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Card Header & Access Badge */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-100">Owner Access Portal</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Restricted authorization for system administrator
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-orange-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Authentication Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('credentials');
                setAuthError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                authMethod === 'credentials'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Credentials</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('passcode');
                setAuthError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                authMethod === 'passcode'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Passcode</span>
            </button>
          </div>

          {/* Error Alert */}
          {authError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed break-words">{authError}</p>
            </div>
          )}

          {/* MODE 1: Credentials Form (Username + Password) */}
          {authMethod === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Master Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="9182029334"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:border-orange-500 focus:outline-none placeholder:text-slate-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Master Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:border-orange-500 focus:outline-none placeholder:text-slate-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full bg-orange-600 hover:bg-orange-500 border-none shadow-md shadow-orange-600/20"
                  isLoading={isLoading}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Authenticate & Launch OS
                </Button>
              </div>
            </form>
          )}

          {/* MODE 2: Email Passcode Form */}
          {authMethod === 'passcode' && (
            <form onSubmit={handlePasscodeSubmit} className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Target Email:</span>
                  <span className="font-mono font-semibold text-orange-400 truncate max-w-[220px]">
                    {targetEmail}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Click below to dispatch a secure 6-digit one-time code to your registered email.
                </p>

                <button
                  type="button"
                  onClick={handleSendPasscode}
                  disabled={isSendingCode || cooldown > 0}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingCode ? 'animate-pulse' : ''}`} />
                  <span>
                    {isSendingCode
                      ? 'Dispatching Passcode...'
                      : cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : codeSent
                      ? 'Resend Passcode'
                      : 'Send Passcode to Email'}
                  </span>
                </button>
              </div>

              {/* Dev Passcode Display Banner (if fallback active) */}
              {devCode && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Passcode: <strong className="font-mono text-xs">{devCode}</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPasscode(devCode)}
                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold"
                  >
                    Insert Code
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Enter 6-Digit Passcode
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 582914"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-center font-mono font-bold text-base tracking-[0.3em] focus:border-orange-500 focus:outline-none placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-normal placeholder:text-xs transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full bg-orange-600 hover:bg-orange-500 border-none shadow-md shadow-orange-600/20"
                  isLoading={isLoading}
                  disabled={passcode.length !== 6}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Verify & Launch OS
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Credentials and passcode email can be customized anytime inside <strong>Settings</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-orange-400/80" />
            Confidential Owner Console • Codeneksa EdTech Operations
          </p>
        </div>
      </div>
    </div>
  );
};

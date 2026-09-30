import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../utils/api';

export default function LoginView({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoAccounts, setDemoAccounts] = useState([]);

  useEffect(() => {
    // Load available demo accounts for quick testing
    api.getDemoAccounts()
      .then(res => {
        if (res.success && res.accounts) {
          setDemoAccounts(res.accounts);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e, customId = null, customPass = null) => {
    if (e) e.preventDefault();

    const targetId = customId || identifier;
    const targetPass = customPass || password;

    if (!targetId.trim()) {
      setError('Please enter your Employee Code or Email.');
      return;
    }
    if (!targetPass) {
      setError('Please enter your Password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await api.login(targetId, targetPass);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Login connection failed. Please ensure server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (acc) => {
    setIdentifier(acc.employee_code);
    setPassword(acc.password_hint);
    handleLogin(null, acc.employee_code, acc.password_hint);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/30 text-white mb-4">
            <Wallet className="w-8 h-8" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Bright Flowers
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Trading LLC
            </span>
          </div>
          <p className="text-sm font-medium text-slate-400 mt-1">
            Purchase & Petty Cash Management
          </p>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Zoho Books Secure Portal</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100/90 text-slate-800">
          <div className="mb-6">
            <h2 className="text-lg font-black text-slate-900">Employee Login</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your credentials to access your petty cash account
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Identifier (Email or Employee Code) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Employee Code or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. EMP-002 or david.m@company.com"
                  autoFocus
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to My Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy Note */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center space-x-2 text-[11px] text-slate-400 font-medium justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Employees access only their personal petty cash records</span>
          </div>
        </div>

        {/* Demo Fast Login Switcher Cards */}
        {demoAccounts.length > 0 && (
          <div className="mt-6 bg-slate-900/60 backdrop-blur-md rounded-3xl p-5 border border-slate-800 text-left">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>One-Click Test Accounts</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => handleQuickLogin(acc)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 hover:border-blue-500/50 border border-slate-700/60 transition group flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center ${
                      acc.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {acc.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-blue-300 transition">
                        {acc.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {acc.employee_code} • {acc.email}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      acc.role === 'admin'
                        ? 'bg-purple-900/50 text-purple-300 border border-purple-700/50'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {acc.role === 'admin' ? 'Admin' : 'Employee'}
                    </span>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      Pass: {acc.password_hint}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

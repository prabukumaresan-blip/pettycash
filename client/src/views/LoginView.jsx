import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Lock,
  ArrowRight,
  ShieldCheck,
  User,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { api } from '../utils/api';

export default function LoginView({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();

    if (!identifier.trim()) {
      setError('Please enter your Employee Code or Email.');
      return;
    }
    if (!password) {
      setError('Please enter your Password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await api.login(identifier, password);
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Subtle corporate ambient structure */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg p-2.5 mb-4 border border-slate-700">
            <img src="/logo-192.png" alt="Bright Flowers Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Bright Flowers
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Trading LLC
            </span>
          </div>
          <p className="text-xs font-normal text-slate-400 mt-1">
            Enterprise Petty Cash & Purchase Management
          </p>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-slate-300 border border-slate-800 text-[11px] font-medium mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Zoho Books Financial Portal</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-slate-200 text-slate-800">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Account Authentication</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your corporate credentials to access your ledger
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Identifier (Email or Employee Code) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  placeholder="e.g. EMP-002 or finance@brightflowers.com"
                  autoFocus
                  required
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
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
                  placeholder="Enter account password"
                  required
                  className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
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
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-900 text-white font-semibold text-xs border border-slate-800 shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center space-x-1.5 text-[11px] text-slate-500 font-medium justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Authenticated session encrypted with Zoho Books & Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Wifi,
  WifiOff,
  Download,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { formatOMR } from '../utils/currency';

export default function Navbar({
  currentUser,
  onLogout,
  zohoStatus,
  isOnline,
  offlineCount,
  activeTab,
  setActiveTab
}) {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3.5 cursor-pointer select-none" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs">
              <img src="/logo-192.png" alt="Bright Flowers Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-base tracking-tight">Bright Flowers</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Trading LLC
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                <span>Petty Cash Financial Portal</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/70 p-1 rounded-lg border border-slate-200/60">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'reports'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {isAdmin ? 'All Reports' : 'My Expense Reports'}
            </button>

            {/* Admin only views */}
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('employees')}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                    activeTab === 'employees'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  Employees
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                    activeTab === 'settings'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  Zoho Integration
                </button>
              </>
            )}
          </nav>

          {/* Right Action Badges & Logged-in User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Install PWA Prompt Button */}
            {installPrompt && (
              <button
                onClick={handleInstallApp}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Install</span>
              </button>
            )}

            {/* Online / Offline indicator */}
            {!isOnline ? (
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Offline ({offlineCount} queued)</span>
              </div>
            ) : (
              <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                <span>System Online</span>
              </div>
            )}

            {/* Logged in Employee Profile Pill */}
            {currentUser && (
              <div className="flex items-center space-x-2.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white shadow-xs">
                <div className={`w-6 h-6 rounded font-semibold text-[11px] flex items-center justify-center ${
                  isAdmin ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}>
                  {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium capitalize flex items-center space-x-1">
                    <span className="text-slate-600 font-medium">
                      {currentUser.role}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-slate-500">{currentUser.employee_code}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLogout();
              }}
              title="Sign Out"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

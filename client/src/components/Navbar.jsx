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
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold text-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">Bright Flowers</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Trading LLC</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Petty Cash Management</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'reports'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              {isAdmin ? 'All Reports' : 'My Expense Reports'}
            </button>

            {/* Admin only views */}
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('employees')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'employees'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  User Management
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'settings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
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
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
            )}

            {/* Online / Offline indicator */}
            {!isOnline ? (
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline ({offlineCount} queued)</span>
              </div>
            ) : (
              <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Wifi className="w-3.5 h-3.5" />
                <span>Online</span>
              </div>
            )}

            {/* Logged in Employee Profile Pill */}
            {currentUser && (
              <div className="flex items-center space-x-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
                <div className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center ${
                  isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium capitalize flex items-center space-x-1">
                    <span className={isAdmin ? 'text-purple-600 font-bold' : 'text-blue-600 font-semibold'}>
                      {currentUser.role}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-slate-600">{currentUser.employee_code}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              title="Sign Out"
              className="flex items-center space-x-1 px-2.5 py-1.5 sm:px-3 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 text-xs font-bold transition shadow-xs active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

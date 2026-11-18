import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Wifi,
  WifiOff,
  Download,
  LogOut,
  User,
  ShieldCheck,
  Building2
} from 'lucide-react';

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

  // Compute initials for corporate user avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 safe-top shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15">
          {/* Brand Identity */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shadow-2xs">
              <img src="/logo-192.png" alt="Bright Flowers" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight uppercase">
                  Bright Flowers
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  LLC
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                <span>Petty Cash Financial Portal</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition ${
                activeTab === 'reports'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {isAdmin ? 'All Reports' : 'Expense Reports'}
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('employees')}
                  className={`px-3.5 py-1.5 rounded-md font-semibold transition ${
                    activeTab === 'employees'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Employees
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3.5 py-1.5 rounded-md font-semibold transition ${
                    activeTab === 'settings'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Zoho Integration
                </button>
              </>
            )}
          </nav>

          {/* Right Section: Status, User Chip & Sign Out */}
          <div className="flex items-center space-x-2.5">
            {/* Install PWA Prompt */}
            {installPrompt && (
              <button
                onClick={handleInstallApp}
                className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Install</span>
              </button>
            )}

            {/* Offline Alert */}
            {!isOnline && (
              <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Offline ({offlineCount})</span>
              </div>
            )}

            {/* Corporate User Chip */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs font-mono shrink-0">
                {getInitials(currentUser?.name)}
              </div>
              <div className="hidden lg:block text-left text-xs">
                <span className="font-semibold text-slate-900 block truncate max-w-[130px] leading-tight">
                  {currentUser?.name || 'User'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {currentUser?.employee_code || (isAdmin ? 'Admin' : 'Staff')}
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import {
  Wallet,
  FileSpreadsheet,
  Plus,
  Users,
  Settings,
  LogOut,
  RefreshCw
} from 'lucide-react';

export default function MobileBottomNav({
  activeTab,
  setActiveTab,
  onOpenLogModal,
  currentUser,
  onLogout,
  onSyncNow,
  isSyncing
}) {
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 safe-bottom shadow-lg">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {/* Dashboard / Wallet */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wallet className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] mt-1 font-medium">Wallet</span>
          </button>

          {/* Sync Zoho */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-blue-600 active:scale-95 transition disabled:opacity-50"
            title="Sync Zoho Books"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-blue-600' : 'stroke-2'}`} />
            <span className="text-[10px] mt-1 font-medium">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Center Floating Action Button (FAB) */}
          <div className="flex items-center justify-center -mt-6">
            <button
              onClick={onOpenLogModal}
              aria-label="Log New Expense"
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </button>
          </div>

          {/* Reports */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'reports' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className={`w-5 h-5 ${activeTab === 'reports' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] mt-1 font-medium">Reports</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center py-1 text-rose-500 hover:text-rose-700 active:scale-95 transition"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 stroke-2" />
            <span className="text-[10px] mt-1 font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 safe-bottom shadow-lg">
      <div className="grid grid-cols-6 h-16 items-center px-1">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[9px] mt-1 font-medium">Wallet</span>
        </button>

        {/* Reports */}
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'reports' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className={`w-5 h-5 ${activeTab === 'reports' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[9px] mt-1 font-medium">Reports</span>
        </button>

        {/* Center Floating Action Button (FAB) */}
        <div className="flex items-center justify-center -mt-5">
          <button
            onClick={onOpenLogModal}
            aria-label="Log New Expense"
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all focus:outline-none"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Team / Employees */}
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'employees' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className={`w-5 h-5 ${activeTab === 'employees' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[9px] mt-1 font-medium">Team</span>
        </button>

        {/* Zoho Settings */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'settings' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[9px] mt-1 font-medium">Zoho</span>
        </button>

        {/* Sign Out */}
        <button
          onClick={onLogout}
          className="flex flex-col items-center justify-center py-1 text-rose-500 hover:text-rose-700 active:scale-95 transition"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5 stroke-2" />
          <span className="text-[9px] mt-1 font-medium">Exit</span>
        </button>
      </div>
    </div>
  );
}


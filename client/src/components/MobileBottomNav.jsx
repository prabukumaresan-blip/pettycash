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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-bottom shadow-[0_-1px_3px_0_rgba(15,23,42,0.05)]">
        <div className="grid grid-cols-4 h-15 items-center px-3">
          {/* Dashboard / Wallet */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'dashboard' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wallet className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] mt-1 font-medium">Ledger</span>
          </button>

          {/* Center Floating Action Button (FAB) */}
          <div className="flex items-center justify-center -mt-5">
            <button
              onClick={onOpenLogModal}
              aria-label="Log New Expense"
              className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-slate-800 active:bg-slate-900 transition-all border border-slate-800"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Reports */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'reports' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className={`w-5 h-5 ${activeTab === 'reports' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] mt-1 font-medium">Reports</span>
          </button>

          {/* Sign Out */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLogout();
            }}
            className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-900 active:scale-95 transition cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 stroke-2" />
            <span className="text-[10px] mt-1 font-medium">Exit</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-bottom shadow-[0_-1px_3px_0_rgba(15,23,42,0.05)]">
      <div className="grid grid-cols-6 h-15 items-center px-1">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'dashboard' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[9px] mt-1 font-medium">Ledger</span>
        </button>

        {/* Reports */}
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'reports' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
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
            className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-slate-800 active:bg-slate-900 transition-all border border-slate-800"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Team / Employees */}
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'employees' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className={`w-5 h-5 ${activeTab === 'employees' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[9px] mt-1 font-medium">Staff</span>
        </button>

        {/* Zoho Settings */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'settings' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[9px] mt-1 font-medium">Zoho</span>
        </button>

        {/* Sign Out */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLogout();
          }}
          className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-900 active:scale-95 transition cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5 stroke-2" />
          <span className="text-[9px] mt-1 font-medium">Exit</span>
        </button>
      </div>
    </div>
  );
}


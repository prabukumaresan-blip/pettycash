import React from 'react';
import {
  Wallet,
  FileSpreadsheet,
  Plus,
  Users,
  Settings,
  LogOut
} from 'lucide-react';

export default function MobileBottomNav({
  activeTab,
  setActiveTab,
  onOpenLogModal,
  currentUser,
  onLogout
}) {
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-bottom shadow-md">
        <div className="grid grid-cols-4 h-14 items-center px-2">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'dashboard' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Ledger</span>
          </button>

          {/* Center Floating Plus Button */}
          <div className="flex items-center justify-center -mt-4">
            <button
              onClick={onOpenLogModal}
              aria-label="Log New Expense"
              className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-slate-800 active:bg-slate-900 transition border border-slate-800"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Reports */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'reports' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Reports</span>
          </button>

          {/* Sign Out */}
          <button
            type="button"
            onClick={onLogout}
            className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-slate-700 transition"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Exit</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-bottom shadow-md">
      <div className="grid grid-cols-6 h-14 items-center px-1">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'dashboard' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">Ledger</span>
        </button>

        {/* Reports */}
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'reports' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">Reports</span>
        </button>

        {/* Center Floating Plus Button */}
        <div className="flex items-center justify-center -mt-4">
          <button
            onClick={onOpenLogModal}
            aria-label="Log New Expense"
            className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-slate-800 transition border border-slate-800"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Employees */}
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'employees' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">Staff</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'settings' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">Zoho</span>
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={onLogout}
          className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-slate-700 transition"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">Exit</span>
        </button>
      </div>
    </div>
  );
}

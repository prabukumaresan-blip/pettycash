import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  TrendingDown,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Sparkles,
  BookOpen,
  Briefcase,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import ExpenseCard from '../components/ExpenseCard';
import { formatOMR } from '../utils/currency';

export default function DashboardView({
  currentEmployee,
  expenses = [],
  onOpenLogModal,
  onEditExpense,
  onDeleteExpense,
  onRetrySync,
  onSyncNow,
  isSyncing
}) {
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'synced', 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Filter expenses for current employee (or show all if admin is viewing whole company)
  const employeeExpenses = expenses.filter(
    (e) => !currentEmployee || currentEmployee.role === 'admin' || e.employee_id === currentEmployee.id
  );

  const currentBal = parseFloat(currentEmployee?.current_balance || 0);

  const totalSpent = employeeExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const syncedCount = employeeExpenses.filter((e) => e.sync_status === 'synced').length;
  const pendingCount = employeeExpenses.filter((e) => e.sync_status === 'pending').length;

  // Filter list
  const filteredList = employeeExpenses.filter((e) => {
    if (filterTab === 'synced' && e.sync_status !== 'synced') return false;
    if (filterTab === 'pending' && e.sync_status !== 'pending') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = e.description && e.description.toLowerCase().includes(q);
      const matchCat = e.category_name && e.category_name.toLowerCase().includes(q);
      const matchProj = e.project_name && e.project_name.toLowerCase().includes(q);
      return matchDesc || matchCat || matchProj;
    }
    return true;
  });
  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Hero / Petty Cash Account Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-8 text-white shadow-xl">
        {/* Glow ambient background effects */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 rounded-full bg-purple-500/15 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Dedicated Petty Cash Account</span>
              <span>•</span>
              <span className="text-slate-300 font-mono">
                {currentEmployee?.petty_cash_account_name || 'Zoho Linked Account'}
              </span>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                Petty Cash Ending Balance
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mt-1">
                {formatOMR(currentBal)}
              </h1>
            </div>

            {/* Account Status Badge */}
            <div className="flex items-center space-x-3 text-xs text-blue-200/90 pt-1 flex-wrap gap-y-1">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Zoho Books Ending Balance Active</span>
              </span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="text-slate-300 font-medium">Credited from employee cash account</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
            {currentEmployee?.role === 'admin' && onSyncNow && (
              <button
                onClick={onSyncNow}
                disabled={isSyncing}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-sm border border-white/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
                title="Sync Zoho Books balance and transactions"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-400' : 'text-slate-300'}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Zoho'}</span>
              </button>
            )}
            <button
              onClick={onOpenLogModal}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:scale-95 text-white font-bold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center space-x-2 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Log Expense</span>
            </button>
          </div>
        </div>

        {/* Floating Mini Tags */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-4 text-xs text-slate-300 flex-wrap">
          <div className="flex items-center space-x-1.5">
            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
            <span>Default Project: <strong>{currentEmployee?.default_project_name || 'General Operations'}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zoho Account ID: <strong>{currentEmployee?.petty_cash_account_id || 'Auto-Provisioned'}</strong></span>
          </div>
        </div>
      </div>

      {/* KPI Metric Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Spent</span>
            <TrendingDown className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            {formatOMR(totalSpent)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {employeeExpenses.length} transactions
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Synced to Zoho</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2">
            {syncedCount}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5 font-medium">
            Active Journal Entries
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Sync</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-2">
            {pendingCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Queued for next cycle
          </div>
        </div>
      </div>

      {/* Expense Ledger Header & Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Recent Petty Cash Activity</h2>
            <p className="text-xs text-slate-500">Every logged item automatically balances Zoho Books journals</p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses, projects..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex-shrink-0 ${
              filterTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Activity ({employeeExpenses.length})
          </button>
          <button
            onClick={() => setFilterTab('synced')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex-shrink-0 ${
              filterTab === 'synced'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Zoho Synced ({syncedCount})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex-shrink-0 ${
              filterTab === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Pending ({pendingCount})
          </button>
        </div>
      </div>

      {/* Expenses List */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No expenses found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Log an expense to automatically create balanced journal entries in Zoho Books.
          </p>
          <button
            onClick={onOpenLogModal}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 transition"
          >
            + Log First Expense
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedList.map((exp) => (
            <ExpenseCard
              key={exp.id}
              expense={exp}
              onEdit={onEditExpense}
              onDelete={onDeleteExpense}
              onRetrySync={onRetrySync}
            />
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 pb-2">
              <span className="text-xs text-slate-500 font-medium">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredList.length)} of {filteredList.length} expenses
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                >
                  Previous
                </button>
                <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

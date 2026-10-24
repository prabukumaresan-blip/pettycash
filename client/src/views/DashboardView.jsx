import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingDown,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Sparkles,
  BookOpen,
  Briefcase,
  AlertCircle,
  RefreshCw,
  Scale,
  FileCheck,
  FileSpreadsheet,
  CheckSquare,
  Square,
  X,
  Lock,
  RotateCcw
} from 'lucide-react';
import ExpenseCard from '../components/ExpenseCard';
import { formatOMR, getSettlementStatus } from '../utils/currency';

export default function DashboardView({
  currentEmployee,
  currentUser,
  expenses = [],
  onOpenLogModal,
  onEditExpense,
  onDeleteExpense,
  onRetrySync,
  onSyncNow,
  isSyncing,
  onUpdateReportStatus,
  onNavigateToReports,
  onRequestRecall,
  onApproveRecall,
  onRejectRecall
}) {
  const effectiveUser = currentUser || currentEmployee;
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'in_report', 'unreported', 'synced', 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState(new Set());
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);
  const itemsPerPage = 25;

  // Filter expenses for current employee (or show all if admin is viewing whole company)
  const employeeExpenses = expenses.filter(
    (e) => !currentEmployee ||
      currentEmployee.role === 'admin' ||
      e.employee_id === currentEmployee.id ||
      (e.employee_name && currentEmployee.name && e.employee_name.toLowerCase().trim() === currentEmployee.name.toLowerCase().trim())
  );

  const currentBal = parseFloat(currentEmployee?.current_balance || 0);
  const settlement = getSettlementStatus(currentBal, currentEmployee?.name || 'You');

  const totalSpent = employeeExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const syncedCount = employeeExpenses.filter((e) => e.sync_status === 'synced').length;
  const pendingCount = employeeExpenses.filter((e) => e.sync_status === 'pending').length;
  const inReportCount = employeeExpenses.filter((e) => e.added_to_report).length;
  const unreportedCount = employeeExpenses.filter((e) => !e.added_to_report).length;
  const exportedCount = employeeExpenses.filter((e) => e.is_exported).length;
  const pendingRecallCount = employeeExpenses.filter((e) => e.recall_status === 'pending').length;

  // Filter list
  const filteredList = employeeExpenses.filter((e) => {
    if (filterTab === 'synced' && e.sync_status !== 'synced') return false;
    if (filterTab === 'pending' && e.sync_status !== 'pending') return false;
    if (filterTab === 'in_report' && !e.added_to_report) return false;
    if (filterTab === 'unreported' && e.added_to_report) return false;
    if (filterTab === 'exported' && !e.is_exported) return false;
    if (filterTab === 'recalls' && e.recall_status !== 'pending') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = e.description && e.description.toLowerCase().includes(q);
      const matchCat = e.category_name && e.category_name.toLowerCase().includes(q);
      const matchProj = e.project_name && e.project_name.toLowerCase().includes(q);
      const matchInv = e.invoice_number && e.invoice_number.toLowerCase().includes(q);
      return matchDesc || matchCat || matchProj || matchInv;
    }
    return true;
  });
  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedExpenseIds(new Set());
  }, [filterTab, searchQuery]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Selection handlers
  const handleToggleSelect = (id) => {
    setSelectedExpenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedExpenseIds.size === paginatedList.length && paginatedList.length > 0) {
      setSelectedExpenseIds(new Set());
    } else {
      setSelectedExpenseIds(new Set(paginatedList.map(e => e.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedExpenseIds(new Set());
  };

  const handleBulkReportStatus = async (addedToReport) => {
    if (!onUpdateReportStatus || selectedExpenseIds.size === 0) return;
    setIsUpdatingReport(true);
    try {
      await onUpdateReportStatus(Array.from(selectedExpenseIds), addedToReport);
      setSelectedExpenseIds(new Set());
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleSingleReportStatus = async (id, currentStatus) => {
    if (!onUpdateReportStatus) return;
    await onUpdateReportStatus([id], !currentStatus);
  };

  const selectedTotal = employeeExpenses
    .filter(e => selectedExpenseIds.has(e.id))
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Executive Hero / Account Statement Card */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-7 text-white shadow-sm">
        {/* Subtle executive geometric gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/90 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-900/10 to-transparent pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-4">
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Account Standing • {effectiveUser?.name || 'Petty Cash'}
                </span>
                <div className="flex items-baseline space-x-3 mt-1">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
                    {settlement.formattedAmount}
                  </h1>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    OMR
                  </span>
                </div>
              </div>
            </div>

            {/* Structured Corporate Settlement Status Bar */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              settlement.isEmployeeOwing
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-100'
                : settlement.isCompanyOwing
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-100'
                : 'bg-slate-800/60 border-slate-700 text-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                  settlement.isEmployeeOwing
                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                    : settlement.isCompanyOwing
                    ? 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                    : 'bg-slate-700 text-slate-300 border border-slate-600'
                }`}>
                  {settlement.isEmployeeOwing ? (
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  ) : settlement.isCompanyOwing ? (
                    <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className={settlement.isEmployeeOwing ? 'text-emerald-300' : settlement.isCompanyOwing ? 'text-amber-300' : 'text-slate-200'}>
                      {settlement.accountingLabel}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-black/20 text-slate-200 border border-white/10">
                      {settlement.badgeText}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300/90 mt-0.5 font-normal leading-relaxed">
                    {settlement.explanation}
                  </p>
                </div>
              </div>
              <div className="sm:text-right pl-12 sm:pl-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">Settlement Balance</span>
                <span className="text-base sm:text-lg font-bold tracking-tight text-white font-mono">
                  {settlement.formattedAmount} {settlement.accountingSideShort}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-center shrink-0">
            {currentEmployee?.role === 'admin' && onSyncNow && (
              <button
                onClick={onSyncNow}
                disabled={isSyncing}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center space-x-2 transition disabled:opacity-50"
                title="Sync Zoho Books balance and transactions"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Zoho'}</span>
              </button>
            )}
            <button
              onClick={onOpenLogModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs border border-blue-500 shadow-xs flex items-center justify-center space-x-2 transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Log Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Corporate KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Spent */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Spent</span>
            <TrendingDown className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            {formatOMR(totalSpent)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {employeeExpenses.length} transactions
          </div>
        </div>

        {/* Settlement Due */}
        <div className={`p-4 rounded-xl border shadow-xs ${
          settlement.isEmployeeOwing
            ? 'bg-emerald-50/50 border-emerald-200'
            : settlement.isCompanyOwing
            ? 'bg-amber-50/50 border-amber-200'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              settlement.isEmployeeOwing
                ? 'text-emerald-800'
                : settlement.isCompanyOwing
                ? 'text-amber-800'
                : 'text-slate-500'
            }`}>
              {settlement.shortLabel}
            </span>
            {settlement.isEmployeeOwing ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            ) : settlement.isCompanyOwing ? (
              <ArrowDownLeft className="w-4 h-4 text-amber-600 stroke-[2.5]" />
            ) : (
              <Scale className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className={`text-xl font-bold mt-2 font-mono ${
            settlement.isEmployeeOwing
              ? 'text-emerald-900'
              : settlement.isCompanyOwing
              ? 'text-amber-900'
              : 'text-slate-900'
          }`}>
            {settlement.formattedAmount}
          </div>
          <div className={`text-[11px] mt-0.5 font-medium truncate ${
            settlement.isEmployeeOwing
              ? 'text-emerald-700'
              : settlement.isCompanyOwing
              ? 'text-amber-700'
              : 'text-slate-500'
          }`}>
            {settlement.badgeText}
          </div>
        </div>

        {/* Synced to Zoho */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Synced to Zoho</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            {syncedCount}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">
            Active Journal Entries
          </div>
        </div>

        {/* Pending Sync */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Sync</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            {pendingCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Queued for next cycle
          </div>
        </div>
      </div>

      {/* Admin Call Back Approval Alert Banner */}
      {effectiveUser.role === 'admin' && pendingRecallCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 border border-amber-200">
              <RotateCcw className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
                Report Call Back Requests ({pendingRecallCount})
              </span>
              <p className="text-xs font-medium text-slate-700">
                {pendingRecallCount} expense{pendingRecallCount > 1 ? 's have' : ' has'} requested to be called back / unlocked from exported reports.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterTab('recalls')}
              className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs shadow-xs active:bg-amber-900 transition"
            >
              Review Requests ({pendingRecallCount})
            </button>
          </div>
        </div>
      )}

      {/* Expense Ledger Header & Search */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Petty Cash Transactions</h2>
            <p className="text-xs text-slate-500">Official expense ledger synchronized with Zoho Books journals</p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, project, invoice..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
            />
          </div>
        </div>

        {/* Corporate Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 bg-slate-100/70 p-1 rounded-lg border border-slate-200/60">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex-shrink-0 ${
              filterTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            All Activity ({employeeExpenses.length})
          </button>
          <button
            onClick={() => setFilterTab('in_report')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex-shrink-0 flex items-center space-x-1.5 ${
              filterTab === 'in_report'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>In Report ({inReportCount})</span>
          </button>
          <button
            onClick={() => setFilterTab('unreported')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex-shrink-0 ${
              filterTab === 'unreported'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Unreported ({unreportedCount})
          </button>
          <button
            onClick={() => setFilterTab('exported')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center space-x-1.5 flex-shrink-0 ${
              filterTab === 'exported'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Exported ({exportedCount})</span>
          </button>
          {pendingRecallCount > 0 && (
            <button
              onClick={() => setFilterTab('recalls')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center space-x-1.5 flex-shrink-0 ${
                filterTab === 'recalls'
                  ? 'bg-amber-100 text-amber-900 shadow-xs border border-amber-300 font-bold'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>Call Back Requests ({pendingRecallCount})</span>
            </button>
          )}
          <button
            onClick={() => setFilterTab('synced')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex-shrink-0 ${
              filterTab === 'synced'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Synced ({syncedCount})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex-shrink-0 ${
              filterTab === 'pending'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Pending ({pendingCount})
          </button>
        </div>
      </div>

      {/* Bulk Action Bar for Selected Expenses */}
      {selectedExpenseIds.size > 0 && (
        <div className="sticky top-20 z-20 p-3.5 sm:p-4 rounded-2xl bg-indigo-950 text-white shadow-xl border border-indigo-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {selectedExpenseIds.size} expense{selectedExpenseIds.size > 1 ? 's' : ''} selected
              </span>
              <span className="text-[11px] text-indigo-200 font-mono">
                Total: {formatOMR(selectedTotal)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <button
              onClick={() => handleBulkReportStatus(true)}
              disabled={isUpdatingReport}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Selected to Report</span>
            </button>

            <button
              onClick={() => handleBulkReportStatus(false)}
              disabled={isUpdatingReport}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-xs border border-white/20 flex items-center space-x-1 transition disabled:opacity-50 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Remove from Report</span>
            </button>

            {onNavigateToReports && (
              <button
                onClick={onNavigateToReports}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Open Report</span>
              </button>
            )}

            <button
              onClick={handleClearSelection}
              className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Select All Visible Quick Control */}
      {paginatedList.length > 0 && (
        <div className="flex items-center justify-between text-xs px-2 text-slate-500 font-medium">
          <button
            onClick={handleSelectAllVisible}
            className="flex items-center space-x-1.5 hover:text-blue-600 font-bold transition cursor-pointer"
          >
            {selectedExpenseIds.size === paginatedList.length && paginatedList.length > 0 ? (
              <>
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <span>Deselect All on Page</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4 text-slate-400" />
                <span>Select All on Page ({paginatedList.length})</span>
              </>
            )}
          </button>
          {selectedExpenseIds.size > 0 && (
            <span className="text-indigo-600 font-semibold">{selectedExpenseIds.size} of {paginatedList.length} selected</span>
          )}
        </div>
      )}

      {/* Expenses List */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No expenses found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filterTab === 'in_report'
              ? 'No expenses have been added to the report yet. Switch to "Not in Report" to select and add expenses.'
              : 'Log an expense to automatically create balanced journal entries in Zoho Books.'}
          </p>
          {filterTab === 'in_report' ? (
            <button
              onClick={() => setFilterTab('unreported')}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 transition"
            >
              Browse Unreported Expenses
            </button>
          ) : (
            <button
              onClick={onOpenLogModal}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 transition"
            >
              + Log First Expense
            </button>
          )}
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
              isSelected={selectedExpenseIds.has(exp.id)}
              onToggleSelect={handleToggleSelect}
              onToggleReportStatus={handleSingleReportStatus}
              currentUser={effectiveUser}
              onRequestRecall={onRequestRecall}
              onApproveRecall={onApproveRecall}
              onRejectRecall={onRejectRecall}
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

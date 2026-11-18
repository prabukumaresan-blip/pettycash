import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  FileCheck,
  FileSpreadsheet,
  CheckSquare,
  Square,
  X,
  Lock,
  RotateCcw,
  Paperclip,
  Printer,
  Download,
  AlertTriangle,
  Edit2,
  Trash2
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
  onRejectRecall,
  onViewReceipt,
  onMarkSelectedExported
}) {
  const effectiveUser = currentUser || currentEmployee;
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'not_exported', 'exported', 'recalls'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState(new Set());
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);
  const itemsPerPage = 25;

  // Filter expenses for current employee (or show all if admin is viewing whole company)
  const employeeExpenses = expenses.filter(
    (e) =>
      !currentEmployee ||
      currentEmployee.role === 'admin' ||
      e.employee_id === currentEmployee.id ||
      (e.employee_name &&
        currentEmployee.name &&
        e.employee_name.toLowerCase().trim() === currentEmployee.name.toLowerCase().trim())
  );

  const currentBal = parseFloat(currentEmployee?.current_balance || 0);
  const settlement = getSettlementStatus(currentBal, currentEmployee?.name || 'Petty Cash');

  const totalSpent = employeeExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const notExportedExpenses = employeeExpenses.filter((e) => !e.is_exported);
  const notExportedAmount = notExportedExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const exportedExpenses = employeeExpenses.filter((e) => e.is_exported);
  const exportedAmount = exportedExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const pendingRecallCount = employeeExpenses.filter((e) => e.recall_status === 'pending').length;

  // Filter list
  const filteredList = employeeExpenses.filter((e) => {
    if (filterTab === 'not_exported' && e.is_exported) return false;
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

  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedExpenseIds(new Set());
  }, [filterTab, searchQuery]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleToggleSelect = (id) => {
    setSelectedExpenseIds((prev) => {
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
      setSelectedExpenseIds(new Set(paginatedList.map((e) => e.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedExpenseIds(new Set());
  };

  const handleBulkMarkExported = async () => {
    if (selectedExpenseIds.size === 0) return;
    setIsUpdatingReport(true);
    try {
      if (onMarkSelectedExported) {
        await onMarkSelectedExported(Array.from(selectedExpenseIds));
      }
      setSelectedExpenseIds(new Set());
    } finally {
      setIsUpdatingReport(false);
    }
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

  const selectedTotal = employeeExpenses
    .filter((e) => selectedExpenseIds.has(e.id))
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* 1. Corporate Executive Account Standing Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 text-white shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Account Details & Balance */}
          <div className="space-y-3 flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Petty Cash Account • {effectiveUser?.name || 'Bright Flowers'}
              </span>
              {currentEmployee?.petty_cash_account_name && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  {currentEmployee.petty_cash_account_name}
                </span>
              )}
            </div>

            <div className="flex items-baseline space-x-3">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
                {settlement.formattedAmount}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                OMR
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                  settlement.isEmployeeOwing
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    : settlement.isCompanyOwing
                    ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {settlement.accountingLabel}
              </span>
            </div>

            {/* Explanatory Standing Note */}
            <p className="text-xs text-slate-300 font-normal leading-relaxed max-w-2xl">
              {settlement.explanation}
            </p>
          </div>

          {/* Corporate Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center shrink-0">
            {currentEmployee?.role === 'admin' && onSyncNow && (
              <button
                onClick={onSyncNow}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                title="Synchronize live balances with Zoho Books"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Zoho'}</span>
              </button>
            )}

            {onNavigateToReports && (
              <button
                onClick={onNavigateToReports}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center space-x-1.5 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                <span>Reports</span>
              </button>
            )}

            <button
              onClick={onOpenLogModal}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs border border-blue-500 shadow-xs flex items-center justify-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Log Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Corporate KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Spent */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Total Spent</span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            {formatOMR(totalSpent)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {employeeExpenses.length} total transaction{employeeExpenses.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Not Exported */}
        <div
          onClick={() => setFilterTab('not_exported')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:border-slate-300 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Not Exported</span>
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            {formatOMR(notExportedAmount)}
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5 font-medium">
            {notExportedExpenses.length} expense{notExportedExpenses.length === 1 ? '' : 's'} awaiting export
          </div>
        </div>

        {/* Exported */}
        <div
          onClick={() => setFilterTab('exported')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:border-slate-300 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Exported</span>
            <Lock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            {formatOMR(exportedAmount)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">
            {exportedExpenses.length} locked in official reports
          </div>
        </div>

        {/* Account Standing */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Account Standing</span>
            {settlement.isEmployeeOwing ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            ) : settlement.isCompanyOwing ? (
              <ArrowDownLeft className="w-4 h-4 text-amber-600 stroke-[2.5]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            {settlement.formattedAmount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
            {settlement.accountingLabel}
          </div>
        </div>
      </div>

      {/* Admin Call Back Review Banner */}
      {effectiveUser.role === 'admin' && pendingRecallCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 border border-amber-200">
              <RotateCcw className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
                Exported Report Unlock Requests ({pendingRecallCount})
              </span>
              <p className="text-xs font-medium text-slate-700">
                Staff member has requested to unlock {pendingRecallCount} exported expense voucher(s) for correction.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterTab('recalls')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs shadow-xs transition"
          >
            Review Requests ({pendingRecallCount})
          </button>
        </div>
      )}

      {/* 3. Transaction Ledger Controls & Filter Tabs */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Petty Cash Transactions</h2>
            <p className="text-xs text-slate-500">Official expense ledger synchronized with Zoho Books vouchers</p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, invoice, project..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
            />
          </div>
        </div>

        {/* Corporate Segmented Filter Tabs: Only All Activity with Exported / Not Exported */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-md font-semibold transition shrink-0 ${
              filterTab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            All Activity ({employeeExpenses.length})
          </button>

          <button
            onClick={() => setFilterTab('not_exported')}
            className={`px-3.5 py-1.5 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              filterTab === 'not_exported'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Not Exported ({notExportedExpenses.length})</span>
          </button>

          <button
            onClick={() => setFilterTab('exported')}
            className={`px-3.5 py-1.5 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              filterTab === 'exported'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-slate-700" />
            <span>Exported ({exportedExpenses.length})</span>
          </button>

          {pendingRecallCount > 0 && (
            <button
              onClick={() => setFilterTab('recalls')}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
                filterTab === 'recalls'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-amber-800 hover:bg-white/60'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>Review Requests ({pendingRecallCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Bulk Action Bar for Selected Rows */}
      {selectedExpenseIds.size > 0 && (
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900 text-white shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {selectedExpenseIds.size} expense{selectedExpenseIds.size > 1 ? 's' : ''} selected
              </span>
              <span className="text-[11px] text-slate-300 font-mono">
                Total: {formatOMR(selectedTotal)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {/* Mark Selected as Exported */}
            <button
              onClick={handleBulkMarkExported}
              disabled={isUpdatingReport}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
              title="Mark selected expenses as exported and lock them"
            >
              <Lock className="w-3.5 h-3.5 text-slate-700" />
              <span>Mark as Exported</span>
            </button>

            {onNavigateToReports && (
              <button
                onClick={onNavigateToReports}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-1 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Open Reports View</span>
              </button>
            )}

            <button
              onClick={handleClearSelection}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Select All Visible Control */}
      {paginatedList.length > 0 && (
        <div className="flex items-center justify-between text-xs px-1 text-slate-500 font-medium">
          <button
            onClick={handleSelectAllVisible}
            className="flex items-center space-x-1.5 hover:text-slate-900 font-semibold transition cursor-pointer"
          >
            {selectedExpenseIds.size === paginatedList.length && paginatedList.length > 0 ? (
              <>
                <CheckSquare className="w-4 h-4 text-slate-900" />
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
            <span className="text-slate-700 font-semibold">
              {selectedExpenseIds.size} of {paginatedList.length} selected
            </span>
          )}
        </div>
      )}

      {/* 5. Corporate Expense Ledger View */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No transactions found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filterTab === 'not_exported'
              ? 'All current expenses have been exported into official statements.'
              : filterTab === 'exported'
              ? 'No exported expenses found under current filter.'
              : 'Log an expense to record transactions against your petty cash float.'}
          </p>
          <button
            onClick={onOpenLogModal}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
          >
            + Log First Expense
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Corporate Data Table (visible sm and up) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={selectedExpenseIds.size === paginatedList.length && paginatedList.length > 0}
                      onChange={handleSelectAllVisible}
                      className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-400 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 w-24">Date</th>
                  <th className="py-3 px-3 w-28">Ref / Inv #</th>
                  <th className="py-3 px-3">Description & Category</th>
                  <th className="py-3 px-3 w-40">Project</th>
                  <th className="py-3 px-3 w-28 text-right">Amount</th>
                  <th className="py-3 px-3 w-32 text-center">Status</th>
                  <th className="py-3 px-3 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {paginatedList.map((exp) => {
                  const isExpSelected = selectedExpenseIds.has(exp.id);
                  const isExported = Boolean(exp.is_exported);
                  const hasReceipt = Boolean(exp.receipt_url || exp.receipt_file_name);
                  const receiptUrl =
                    exp.receipt_url ||
                    (exp.receipt_file_name ? `/uploads/${exp.receipt_file_name}` : null);
                  const receiptName = exp.receipt_file_name || 'Receipt Document';

                  return (
                    <tr
                      key={exp.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isExpSelected ? 'bg-slate-50/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5">
                        <input
                          type="checkbox"
                          checked={isExpSelected}
                          onChange={() => handleToggleSelect(exp.id)}
                          className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-400 cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {exp.expense_date}
                      </td>

                      {/* Invoice / Reference */}
                      <td className="py-3 px-3">
                        {exp.invoice_number ? (
                          <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {exp.invoice_number}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Description & Category */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 leading-snug line-clamp-1">
                          {exp.description}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-1.5">
                          <span>{exp.category_name || 'Petty Cash Purchases'}</span>
                          {hasReceipt && (
                            <button
                              type="button"
                              onClick={() => onViewReceipt && onViewReceipt(receiptUrl, receiptName)}
                              className="text-slate-500 hover:text-slate-800 inline-flex items-center space-x-0.5"
                              title="View receipt attachment"
                            >
                              <Paperclip className="w-3 h-3 text-slate-400" />
                              <span className="underline text-[10px]">Doc</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Project */}
                      <td className="py-3 px-3 text-slate-600 text-xs">
                        <span className="line-clamp-1" title={exp.project_name || 'Company Operations'}>
                          {exp.project_name || 'General Operations'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatOMR(exp.amount)}
                      </td>

                      {/* Status: Exported / Not Exported */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isExported ? (
                          <span
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                            title={exp.exported_at ? `Exported: ${new Date(exp.exported_at).toLocaleDateString()}` : 'Exported'}
                          >
                            <Lock className="w-3 h-3 text-emerald-600" />
                            <span>Exported</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>Not Exported</span>
                          </span>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          {isExported ? (
                            <button
                              onClick={() => onRequestRecall && onRequestRecall(exp)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                              title={currentUser?.role === 'admin' ? 'Admin Direct Unlock' : 'Request Unlock'}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <>
                              {onEditExpense && (
                                <button
                                  onClick={() => onEditExpense(exp)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                  title="Edit Expense"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteExpense && (
                                <button
                                  onClick={() => onDeleteExpense(exp.id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Delete Expense"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (visible under md) */}
          <div className="md:hidden space-y-2.5">
            {paginatedList.map((exp) => (
              <ExpenseCard
                key={exp.id}
                expense={exp}
                onEdit={onEditExpense}
                onDelete={onDeleteExpense}
                onRetrySync={onRetrySync}
                isSelected={selectedExpenseIds.has(exp.id)}
                onToggleSelect={handleToggleSelect}
                currentUser={effectiveUser}
                onRequestRecall={onRequestRecall}
                onApproveRecall={onApproveRecall}
                onRejectRecall={onRejectRecall}
                onViewReceipt={onViewReceipt}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-500 font-medium">
              <span>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredList.length)} of {filteredList.length}{' '}
                transactions
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                >
                  Previous
                </button>
                <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
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

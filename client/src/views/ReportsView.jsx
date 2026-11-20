import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  FileCheck,
  CheckSquare,
  Square,
  Plus,
  X,
  AlertCircle,
  Lock,
  RotateCcw,
  Paperclip,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { api } from '../utils/api';
import { formatOMR, getSettlementStatus } from '../utils/currency';

export default function ReportsView({
  expenses: allExpenses = [],
  employees = [],
  projects = [],
  currentUser,
  onUpdateReportStatus,
  onMarkSelectedExported,
  onRequestRecall,
  onApproveRecall,
  onRejectRecall,
  onRefreshData,
  onViewReceipt
}) {
  const isAdmin = currentUser?.role === 'admin';
  const [activeReportTab, setActiveReportTab] = useState('report'); // 'report' (Official to export), 'exported' (Archive), 'unreported' (Add items), 'all' (All Audit)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    !isAdmin && currentUser?.id ? currentUser.id : ''
  );
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [syncStatusFilter, setSyncStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Fetch report
  const fetchReport = async (resync = false) => {
    setIsLoading(true);
    try {
      let isExportedFilter = undefined;
      let addedToReportFilter = undefined;

      if (activeReportTab === 'report') {
        addedToReportFilter = 'true';
        isExportedFilter = 'false';
      } else if (activeReportTab === 'exported') {
        isExportedFilter = 'true';
      } else if (activeReportTab === 'unreported') {
        addedToReportFilter = 'false';
        isExportedFilter = 'false';
      }

      const filters = {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        employee_id: selectedEmployeeId || undefined,
        project_id: selectedProjectId || undefined,
        sync_status: syncStatusFilter || undefined,
        added_to_report: addedToReportFilter,
        is_exported: isExportedFilter,
        search: search || undefined,
        resync: resync ? 'true' : undefined
      };
      const res = await api.getReport(filters);
      if (res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setIsLoading(false);
      setIsResyncing(false);
    }
  };

  useEffect(() => {
    fetchReport();
    setSelectedRowIds(new Set());
  }, [startDate, endDate, selectedEmployeeId, selectedProjectId, syncStatusFilter, activeReportTab]);

  // Quick Date Range Presets
  const setPresetRange = (preset) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      setStartDate(`${yyyy}-${mm}-01`);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const past = new Date(Date.now() - 30 * 86400000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'ytd') {
      setStartDate(`${yyyy}-01-01`);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Export to CSV & automatically mark exported (Condition 2)
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const filters = {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        employee_id: selectedEmployeeId || undefined,
        project_id: selectedProjectId || undefined,
        sync_status: syncStatusFilter || undefined,
        added_to_report: activeReportTab === 'unreported' ? 'false' : (activeReportTab === 'report' ? 'true' : undefined),
        is_exported: activeReportTab === 'exported' ? 'true' : (activeReportTab === 'report' ? 'false' : undefined),
        mark_exported: 'true'
      };

      const targetExpenses = selectedRowIds.size > 0
        ? expenses.filter((e) => selectedRowIds.has(e.id))
        : expenses;

      const exportedIds = targetExpenses.map((e) => e.id);

      if (exportedIds.length > 0) {
        filters.expense_ids = exportedIds.join(',');
      }

      await api.downloadCsvReport(filters, targetExpenses);
      
      // Update exported status across client app immediately
      if (onMarkSelectedExported && exportedIds.length > 0) {
        await onMarkSelectedExported(exportedIds);
      } else if (api.addExportedIds && exportedIds.length > 0) {
        api.addExportedIds(exportedIds);
      }

      setSelectedRowIds(new Set());
      setActionFeedback({
        type: 'success',
        msg: activeReportTab === 'exported'
          ? 'Exported statement CSV downloaded successfully.'
          : `Expense report exported! ${exportedIds.length} expense log(s) marked as Exported.`
      });
      setTimeout(() => setActionFeedback(null), 4000);

      // Immediately refresh data to reflect exported state
      await fetchReport();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setActionFeedback({ type: 'error', msg: `Download failed: ${err.message}` });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Export to PDF & automatically mark exported (Condition 2)
  const handleExportPdf = async () => {
    if ((activeReportTab === 'report' || activeReportTab === 'exported') && (!expenses || expenses.length === 0)) {
      setActionFeedback({
        type: 'error',
        msg: activeReportTab === 'exported'
          ? 'No exported expenses match the current filter.'
          : 'No expenses currently marked for export in this view.'
      });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }

    setIsExportingPdf(true);
    try {
      const filters = {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        employee_id: selectedEmployeeId || undefined,
        project_id: selectedProjectId || undefined,
        sync_status: syncStatusFilter || undefined,
        added_to_report: activeReportTab === 'unreported' ? 'false' : 'true',
        is_exported: activeReportTab === 'exported' ? 'true' : (activeReportTab === 'report' ? 'false' : undefined),
        mark_exported: 'true'
      };

      const targetExpenses = selectedRowIds.size > 0
        ? expenses.filter((e) => selectedRowIds.has(e.id))
        : expenses;

      const exportedIds = targetExpenses.map((e) => e.id);

      if (exportedIds.length > 0) {
        filters.expense_ids = exportedIds.join(',');
      }

      await api.downloadPdfReport(filters, targetExpenses);

      // Update exported status across client app immediately
      if (onMarkSelectedExported && exportedIds.length > 0) {
        await onMarkSelectedExported(exportedIds);
      } else if (api.addExportedIds && exportedIds.length > 0) {
        api.addExportedIds(exportedIds);
      }

      setSelectedRowIds(new Set());
      setActionFeedback({
        type: 'success',
        msg: activeReportTab === 'exported'
          ? 'Re-print PDF statement downloaded successfully.'
          : `Official Statement exported! ${exportedIds.length} expense log(s) marked as Exported.`
      });
      setTimeout(() => setActionFeedback(null), 4500);

      // Immediately refresh data so newly exported items move to Exported Archive
      await fetchReport();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setActionFeedback({ type: 'error', msg: `Download failed: ${err.message}` });
      setTimeout(() => setActionFeedback(null), 5000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Re-print or print a single expense statement
  const handlePrintSingleExpense = async (exp) => {
    try {
      setIsExportingPdf(true);
      const isExp = Boolean(exp.is_exported);
      const filters = {
        employee_id: exp.employee_id,
        expense_ids: exp.id,
        is_reprint: isExp ? 'true' : 'false',
        mark_exported: isExp ? 'false' : 'true'
      };
      await api.downloadPdfReport(filters, [exp]);
      setActionFeedback({
        type: 'success',
        msg: isExp
          ? `Re-printed official PDF statement for voucher #${exp.invoice_number || exp.id}.`
          : `Printed statement for voucher #${exp.invoice_number || exp.id}.`
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Print single expense error:', err);
      setActionFeedback({ type: 'error', msg: `Print failed: ${err.message}` });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Mark Selected Expenses as Exported explicitly
  const handleMarkSelectedAsExported = async () => {
    if (selectedRowIds.size === 0) return;
    setIsUpdatingReport(true);
    const count = selectedRowIds.size;
    const ids = Array.from(selectedRowIds);
    try {
      if (onMarkSelectedExported) {
        await onMarkSelectedExported(ids);
      } else {
        if (api.addExportedIds) api.addExportedIds(ids);
        await api.markExpensesAsExported(ids);
      }
      setSelectedRowIds(new Set());
      await fetchReport();
      if (onRefreshData) onRefreshData();
      setActionFeedback({
        type: 'success',
        msg: `Successfully marked and locked ${count} expense log(s) as Exported!`
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setActionFeedback({ type: 'error', msg: err.message });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleManualResync = () => {
    setIsResyncing(true);
    fetchReport(true);
  };

  const handleBulkUpdateReportStatus = async (addedToReport) => {
    if (selectedRowIds.size === 0) return;
    setIsUpdatingReport(true);
    const count = selectedRowIds.size;
    try {
      if (onUpdateReportStatus) {
        await onUpdateReportStatus(Array.from(selectedRowIds), addedToReport);
      } else {
        await api.updateExpensesReportStatus(Array.from(selectedRowIds), addedToReport);
      }
      setSelectedRowIds(new Set());
      await fetchReport();
      setActionFeedback({
        type: 'success',
        msg: addedToReport
          ? `Added ${count} expense(s) to the Official Expense Report.`
          : `Removed ${count} expense(s) from the Official Expense Report.`
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setActionFeedback({ type: 'error', msg: err.message });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Live client-derived expenses from allExpenses (guarantees marked items show up instantly!)
  const clientFilteredExpenses = React.useMemo(() => {
    if (!allExpenses || allExpenses.length === 0) return [];
    return allExpenses.filter((e) => {
      // 1. Tab filter
      if (activeReportTab === 'report') {
        if (!e.added_to_report || e.is_exported) return false;
      } else if (activeReportTab === 'exported') {
        if (!e.is_exported) return false;
      } else if (activeReportTab === 'unreported') {
        if (e.added_to_report || e.is_exported) return false;
      }

      // 2. Employee filter
      const effectiveEmpId = selectedEmployeeId || (!isAdmin && currentUser?.id ? currentUser.id : '');
      if (effectiveEmpId) {
        const emp = employees.find((x) => x.id === effectiveEmpId);
        const empName = emp?.name?.toLowerCase().trim();
        const matchesId = e.employee_id === effectiveEmpId;
        const matchesName = empName && e.employee_name && e.employee_name.toLowerCase().trim() === empName;
        if (!matchesId && !matchesName) return false;
      }

      // 3. Project filter
      if (selectedProjectId && String(e.project_id) !== String(selectedProjectId)) {
        return false;
      }

      // 4. Sync status filter
      if (syncStatusFilter && e.sync_status !== syncStatusFilter) {
        return false;
      }

      // 5. Date filters
      if (startDate && e.expense_date && e.expense_date < startDate) return false;
      if (endDate && e.expense_date && e.expense_date > endDate) return false;

      // 6. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const mDesc = e.description && e.description.toLowerCase().includes(q);
        const mCat = e.category_name && e.category_name.toLowerCase().includes(q);
        const mProj = e.project_name && e.project_name.toLowerCase().includes(q);
        const mInv = e.invoice_number && e.invoice_number.toLowerCase().includes(q);
        const mEmp = e.employee_name && e.employee_name.toLowerCase().includes(q);
        const mZoho = (e.zoho_journal_number && e.zoho_journal_number.toLowerCase().includes(q)) || (e.zoho_journal_id && String(e.zoho_journal_id).includes(q));
        if (!mDesc && !mCat && !mProj && !mInv && !mEmp && !mZoho) return false;
      }

      return true;
    });
  }, [allExpenses, activeReportTab, selectedEmployeeId, isAdmin, currentUser, employees, selectedProjectId, syncStatusFilter, startDate, endDate, search]);

  const expenses = React.useMemo(() => {
    const serverList = reportData?.expenses || [];
    if (clientFilteredExpenses.length === 0) return serverList;
    if (serverList.length === 0) return clientFilteredExpenses;

    const map = new Map();
    // Start with server list
    serverList.forEach((e) => map.set(e.id, e));
    // Overlay client expenses (which reflect real-time user actions)
    clientFilteredExpenses.forEach((e) => map.set(e.id, e));

    return Array.from(map.values()).sort((a, b) => {
      const dateA = a.expense_date || '';
      const dateB = b.expense_date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [clientFilteredExpenses, reportData]);

  const meta = React.useMemo(() => {
    const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const syncedCount = expenses.filter((e) => e.sync_status === 'synced').length;
    const pendingCount = expenses.filter((e) => e.sync_status === 'pending' || e.sync_status === 'failed').length;
    return {
      total_records: expenses.length,
      total_amount: totalAmount,
      synced_count: syncedCount,
      pending_count: pendingCount,
      ...(reportData?.meta || {})
    };
  }, [expenses, reportData]);

  const handleSelectAllRows = () => {
    if (selectedRowIds.size === expenses.length && expenses.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(expenses.map((e) => e.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedRowIds(new Set());
  };

  const selectedTotal = expenses
    .filter((e) => selectedRowIds.has(e.id))
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* 1. Header & Primary Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Expense Reports & Audit Statements
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate and export official petty cash expense claims synchronized with Zoho Books vouchers
          </p>
        </div>

        {/* Corporate Export Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={handleManualResync}
            disabled={isResyncing}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition flex items-center space-x-1.5 shadow-2xs"
            title="Refresh transactions from Zoho Books"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isResyncing ? 'animate-spin' : ''}`} />
            <span>{isResyncing ? 'Syncing...' : 'Sync Zoho'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition flex items-center space-x-1.5 disabled:opacity-50 shadow-2xs cursor-pointer"
            title={activeReportTab === 'exported' ? "Re-export CSV spreadsheet of archived statements" : "Download CSV spreadsheet and mark active expenses as exported"}
          >
            <Download className={`w-3.5 h-3.5 text-slate-500 ${isExportingCsv ? 'animate-bounce' : ''}`} />
            <span>{isExportingCsv ? 'Exporting...' : activeReportTab === 'exported' ? 'Re-export CSV' : 'Export to CSV'}</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 active:bg-slate-900 text-white shadow-xs border border-slate-800 transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            title={activeReportTab === 'exported' ? "Re-print official PDF statement for exported transactions" : "Download audit PDF statement and mark active expenses as exported"}
          >
            <Printer className={`w-3.5 h-3.5 text-slate-300 ${isExportingPdf ? 'animate-spin' : ''}`} />
            <span>{isExportingPdf ? 'Generating...' : activeReportTab === 'exported' ? 'Re-print PDF Statement' : 'Download PDF Statement'}</span>
          </button>
        </div>
      </div>

      {/* 2. Corporate Filter Matrix */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        {/* Date Presets */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider mr-1">Presets:</span>
          {['month', '30days', 'ytd', 'all'].map((preset) => (
            <button
              key={preset}
              onClick={() => setPresetRange(preset)}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              {preset === 'month' ? 'This Month' : preset === '30days' ? 'Last 30 Days' : preset === 'ytd' ? 'Year to Date' : 'All Dates'}
            </button>
          ))}
        </div>

        {/* Dynamic Form Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              {isAdmin ? 'Employee Filter' : 'Account Holder'}
            </label>
            {isAdmin ? (
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-1 focus:ring-slate-400 focus:border-slate-400 truncate"
              >
                <option value="">All Team Members</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_code})
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold truncate flex items-center justify-between text-xs">
                <span>{currentUser?.name || 'My Profile'}</span>
                <span className="text-slate-500 font-mono text-[11px]">{currentUser?.employee_code}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Zoho Books Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-1 focus:ring-slate-400 focus:border-slate-400 truncate"
            >
              <option value="">All Projects</option>
              {projects.map((proj) => (
                <option key={proj.project_id} value={proj.project_id}>
                  {proj.project_name} {proj.project_code ? `(${proj.project_code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Live Statement Totals Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Claim Amount
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatOMR(meta.total_amount)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Records Count
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {meta.total_records || 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Zoho Synced
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {meta.synced_count || 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Pending Sync
          </span>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1">
            {meta.pending_count || 0}
          </div>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fade-in ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback.msg}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Report Mode Sub-Tabs & Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-5 pt-2.5 bg-slate-50 flex-wrap gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto text-xs">
            <button
              onClick={() => {
                setActiveReportTab('report');
                setSelectedRowIds(new Set());
              }}
              className={`px-3.5 py-2 font-semibold border-b-2 transition flex items-center space-x-2 ${
                activeReportTab === 'report'
                  ? 'border-slate-900 text-slate-900 bg-white font-bold rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Ready to Export (Marked)</span>
              {activeReportTab === 'report' && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-mono text-[10px]">
                  {expenses.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveReportTab('exported');
                setSelectedRowIds(new Set());
              }}
              className={`px-3.5 py-2 font-semibold border-b-2 transition flex items-center space-x-2 ${
                activeReportTab === 'exported'
                  ? 'border-slate-900 text-slate-900 bg-white font-bold rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exported Statements</span>
              {activeReportTab === 'exported' && (
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono text-[10px]">
                  {expenses.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveReportTab('all');
                setSelectedRowIds(new Set());
              }}
              className={`px-3.5 py-2 font-semibold border-b-2 transition flex items-center space-x-2 ${
                activeReportTab === 'all'
                  ? 'border-slate-900 text-slate-900 bg-white font-bold rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>All Activity Log</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 pb-2">
            {activeReportTab === 'report' && (
              <span className="bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded border border-blue-200 font-medium">
                Only marked expenses from Petty Cash Transactions are displayed here and can be exported
              </span>
            )}
            {activeReportTab === 'exported' && (
              <div className="mt-2 bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2.5 sm:p-3 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fade-in shadow-2xs">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Printer className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold">Exported Statements Archive</span>
                    <span className="text-emerald-700 text-[11px] block sm:inline sm:ml-2">
                      ({expenses.length} archived record{expenses.length === 1 ? '' : 's'}) — Select items to re-print or re-print all.
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf || expenses.length === 0}
                  className="px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shrink-0 flex items-center space-x-1.5 shadow-2xs transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                  title="Re-print all currently visible exported transactions"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Re-print All ({expenses.length})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Action Toolbar for Checked Items */}
        {selectedRowIds.size > 0 && (
          <div className="p-3 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 animate-fade-in text-xs">
            <div className="flex items-center space-x-3">
              <CheckSquare className="w-4 h-4 text-slate-400" />
              <div>
                <span className="font-bold text-white">
                  {selectedRowIds.size} expense log{selectedRowIds.size > 1 ? 's' : ''} selected
                </span>
                <span className="text-slate-300 font-mono ml-2">
                  Total: {formatOMR(selectedTotal)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              {/* Direct Export / Re-print Selected */}
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold transition disabled:opacity-50 cursor-pointer"
                title={activeReportTab === 'exported' ? "Re-print PDF statement of selected items" : "Download PDF statement of selected items and mark exported"}
              >
                <Printer className="w-3.5 h-3.5 text-slate-700 inline mr-1" />
                <span>{activeReportTab === 'exported' ? 'Re-print Selected (PDF)' : 'Export Selected (PDF)'}</span>
              </button>

              <button
                onClick={handleExportCsv}
                disabled={isExportingCsv}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold transition disabled:opacity-50 cursor-pointer"
                title={activeReportTab === 'exported' ? "Re-export CSV spreadsheet of selected items" : "Download CSV spreadsheet of selected items"}
              >
                <Download className="w-3.5 h-3.5 text-slate-700 inline mr-1" />
                <span>{activeReportTab === 'exported' ? 'Re-export Selected (CSV)' : 'Export Selected (CSV)'}</span>
              </button>

              {activeReportTab === 'report' && (
                <button
                  onClick={handleMarkSelectedAsExported}
                  disabled={isUpdatingReport}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition disabled:opacity-50 cursor-pointer"
                  title="Lock selected expenses as exported without download"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400 inline mr-1" />
                  <span>Mark as Exported</span>
                </button>
              )}

              {activeReportTab === 'report' && (
                <button
                  onClick={() => handleBulkUpdateReportStatus(false)}
                  disabled={isUpdatingReport}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition disabled:opacity-50 cursor-pointer"
                  title="Remove from export staging back to unexported ledger"
                >
                  <X className="w-3.5 h-3.5 text-slate-400 inline mr-1" />
                  <span>Remove from Export</span>
                </button>
              )}

              <button
                onClick={handleClearSelection}
                className="p-1.5 text-slate-400 hover:text-white rounded transition cursor-pointer"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 5. Corporate Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={selectedRowIds.size === expenses.length && expenses.length > 0}
                    onChange={handleSelectAllRows}
                    className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-400 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-24">Date</th>
                <th className="py-3 px-3 w-28">Ref / Inv #</th>
                <th className="py-3 px-3">Description & Category</th>
                <th className="py-3 px-3 w-40">Project</th>
                <th className="py-3 px-3 w-32">Employee</th>
                <th className="py-3 px-3 w-28 text-right">Amount</th>
                <th className="py-3 px-3 w-28 text-center">Zoho Sync</th>
                <th className="py-3 px-3 w-28 text-center">Status</th>
                <th className="py-3 px-3 w-20 text-center">Receipt</th>
                <th className="py-3 px-3 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto text-center py-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                        <FileCheck className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm">No expenses marked for export</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {activeReportTab === 'report'
                          ? 'Only expenses marked from Petty Cash Transactions appear here. Go to Petty Cash Transactions, select the expenses you wish to export, and click "Mark for Export".'
                          : 'No expenses match the selected filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const isSelected = selectedRowIds.has(exp.id);
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
                        isSelected ? 'bg-slate-50/60' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(exp.id)}
                          className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-400 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {exp.expense_date}
                      </td>

                      <td className="py-3 px-3">
                        {exp.invoice_number ? (
                          <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {exp.invoice_number}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {exp.description}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {exp.category_name || 'Petty Cash Purchases'}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <span className="line-clamp-1" title={exp.project_name || 'General Operations'}>
                          {exp.project_name || 'General Operations'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {exp.employee_name || 'N/A'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatOMR(exp.amount)}
                      </td>

                      {/* Zoho Sync */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {exp.sync_status === 'synced' ? (
                          <span
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                            title={`Zoho Books Synced${exp.zoho_journal_number && exp.zoho_journal_number !== 'N/A' ? ` • Voucher #${exp.zoho_journal_number}` : (exp.zoho_journal_id ? ` • ID: ${exp.zoho_journal_id}` : '')}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{exp.zoho_journal_number && exp.zoho_journal_number !== 'N/A' ? `#${exp.zoho_journal_number}` : 'Zoho Synced'}</span>
                          </span>
                        ) : exp.sync_status === 'pending' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Pending Sync</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Sync Failed</span>
                          </span>
                        )}
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

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {hasReceipt ? (
                          <button
                            type="button"
                            onClick={() => onViewReceipt && onViewReceipt(receiptUrl, receiptName)}
                            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition inline-flex items-center"
                            title="View receipt"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Re-print / Print Voucher Action */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isExported ? (
                          <button
                            type="button"
                            onClick={() => handlePrintSingleExpense(exp)}
                            disabled={isExportingPdf}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition shadow-2xs cursor-pointer group"
                            title="Re-print official PDF statement for this expense"
                          >
                            <Printer className="w-3 h-3 text-slate-500 group-hover:text-slate-900" />
                            <span>Re-print</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePrintSingleExpense(exp)}
                            disabled={isExportingPdf}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Print draft PDF statement"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Print</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

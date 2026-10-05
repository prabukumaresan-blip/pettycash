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
  User,
  ExternalLink,
  Printer,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  FileCheck,
  CheckSquare,
  Square,
  Plus,
  X,
  AlertCircle,
  Lock,
  RotateCcw,
  Check
} from 'lucide-react';
import { api } from '../utils/api';
import { formatOMR, getSettlementStatus } from '../utils/currency';

export default function ReportsView({
  employees = [],
  projects = [],
  currentUser,
  onUpdateReportStatus,
  onRequestRecall,
  onApproveRecall,
  onRejectRecall,
  onRefreshData
}) {
  const isAdmin = currentUser?.role === 'admin';
  const [activeReportTab, setActiveReportTab] = useState('report'); // 'report' (Official Expense Report), 'unreported' (Select & Add), 'all' (All Expenses)
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

  // Fetch report
  const fetchReport = async (resync = false) => {
    setIsLoading(true);
    try {
      const filters = {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        employee_id: selectedEmployeeId || undefined,
        project_id: selectedProjectId || undefined,
        sync_status: syncStatusFilter || undefined,
        added_to_report: activeReportTab === 'report' ? 'true' : (activeReportTab === 'unreported' ? 'false' : undefined),
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

  const handleExportCsv = () => {
    const filters = {
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      employee_id: selectedEmployeeId || undefined,
      project_id: selectedProjectId || undefined,
      sync_status: syncStatusFilter || undefined,
      added_to_report: activeReportTab === 'report' ? 'true' : (activeReportTab === 'unreported' ? 'false' : undefined)
    };
    window.open(api.getCsvExportUrl(filters), '_blank');
    setTimeout(() => {
      fetchReport();
      if (onRefreshData) onRefreshData();
    }, 1000);
  };

  const handleExportPdf = () => {
    const filters = {
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      employee_id: selectedEmployeeId || undefined,
      project_id: selectedProjectId || undefined,
      sync_status: syncStatusFilter || undefined,
      added_to_report: activeReportTab === 'report' ? 'true' : (activeReportTab === 'unreported' ? 'false' : undefined)
    };
    window.open(api.getPdfExportUrl(filters), '_blank');
    setTimeout(() => {
      fetchReport();
      if (onRefreshData) onRefreshData();
    }, 1000);
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
          ? `Successfully added ${count} expense(s) to the Expense Report!`
          : `Removed ${count} expense(s) from the Expense Report.`
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setActionFeedback({ type: 'error', msg: err.message });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleSingleRowReportStatus = async (expId, addedToReport) => {
    setIsUpdatingReport(true);
    try {
      if (onUpdateReportStatus) {
        await onUpdateReportStatus([expId], addedToReport);
      } else {
        await api.updateExpensesReportStatus([expId], addedToReport);
      }
      await fetchReport();
      setActionFeedback({
        type: 'success',
        msg: addedToReport ? 'Expense added to Expense Report!' : 'Expense removed from Expense Report.'
      });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      setActionFeedback({ type: 'error', msg: err.message });
      setTimeout(() => setActionFeedback(null), 3000);
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expenses = reportData?.expenses || [];
  const meta = reportData?.meta || {};

  const handleSelectAllRows = () => {
    if (selectedRowIds.size === expenses.length && expenses.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(expenses.map(e => e.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedRowIds(new Set());
  };

  const selectedTotal = expenses
    .filter(e => selectedRowIds.has(e.id))
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Petty Cash Audit & Reports</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate and export synchronized statements mapped directly to Zoho Books accounts
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={handleManualResync}
            disabled={isResyncing}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isResyncing ? 'animate-spin' : ''}`} />
            <span>{isResyncing ? 'Re-syncing...' : 'Re-sync from Zoho'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Download Audit PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Matrix Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        {/* Quick Date Presets */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-bold">
          <span className="text-slate-400 mr-1 text-[11px] uppercase tracking-wider">Presets:</span>
          <button
            onClick={() => setPresetRange('month')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition"
          >
            This Month
          </button>
          <button
            onClick={() => setPresetRange('30days')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setPresetRange('ytd')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition"
          >
            Year to Date
          </button>
          <button
            onClick={() => setPresetRange('all')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition"
          >
            All Dates
          </button>
        </div>

        {/* Dynamic Filters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Start Date */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              {isAdmin ? 'Filter Employee' : 'Employee Account'}
            </label>
            {isAdmin ? (
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 truncate"
              >
                <option value="">All Team Members</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_code})
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100/90 text-slate-800 font-bold truncate flex items-center justify-between text-xs">
                <span>{currentUser?.name || 'My Profile'}</span>
                <span className="text-blue-600 font-mono text-[11px]">{currentUser?.employee_code}</span>
              </div>
            )}
          </div>

          {/* Zoho Project Filter */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Zoho Books Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 truncate"
            >
              <option value="">All Zoho Projects</option>
              {projects.map((proj) => (
                <option key={proj.project_id} value={proj.project_id}>
                  {proj.project_name} {proj.project_code ? `(${proj.project_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sync Status */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Zoho Sync Status</label>
            <select
              value={syncStatusFilter}
              onChange={(e) => setSyncStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="synced">Synced Only</option>
              <option value="pending">Pending Sync</option>
              <option value="failed">Failed Sync</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Specific Settlement Card if an employee is filtered */}
      {(() => {
        const emp = employees.find((e) => e.id === selectedEmployeeId);
        if (!emp) return null;
        const bal = parseFloat(emp.current_balance || 0);
        const settlement = getSettlementStatus(bal, emp.name || 'He');
        return (
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            settlement.isEmployeeOwing
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : settlement.isCompanyOwing
              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                settlement.isEmployeeOwing
                  ? 'bg-emerald-200 text-emerald-800'
                  : settlement.isCompanyOwing
                  ? 'bg-amber-200 text-amber-800'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {settlement.isEmployeeOwing ? (
                  <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                ) : settlement.isCompanyOwing ? (
                  <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                )}
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider flex items-center space-x-2">
                  <span>{emp.name} — {settlement.accountingLabel}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white border border-current">
                    {settlement.badgeText}
                  </span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {settlement.explanation}
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 block">Settlement Balance</span>
              <span className="text-lg font-black font-mono">
                {settlement.formattedAmount} {settlement.accountingSideShort}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Live Financial Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Spend</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatOMR(meta.total_amount)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Records</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {meta.total_records || 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Zoho Synced</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {meta.synced_count || 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Sync</span>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
            {meta.pending_count || 0}
          </div>
        </div>
      </div>



      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-fade-in ${
          actionFeedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
            : 'bg-red-50 text-red-900 border-red-300'
        }`}>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionFeedback.msg}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Expense Report Data Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Report Mode Sub-Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 pt-3 bg-slate-50/60 flex-wrap gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
            <button
              onClick={() => { setActiveReportTab('report'); setSelectedRowIds(new Set()); }}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
                activeReportTab === 'report'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <span>Official Expense Report</span>
              {activeReportTab === 'report' && (
                <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-mono">
                  {expenses.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveReportTab('unreported'); setSelectedRowIds(new Set()); }}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
                activeReportTab === 'unreported'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Select & Add Expenses</span>
              {activeReportTab === 'unreported' && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px] font-mono">
                  {expenses.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveReportTab('all'); setSelectedRowIds(new Set()); }}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
                activeReportTab === 'all'
                  ? 'border-slate-800 text-slate-900 bg-white shadow-2xs rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              <span>All Expenses Audit</span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 pb-2 flex items-center space-x-1.5">
            {activeReportTab === 'report' && (
              <span className="text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                Only selected and added items appear in this report
              </span>
            )}
            {activeReportTab === 'unreported' && (
              <span className="text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                Check items below and click &quot;Add Selected to Report&quot;
              </span>
            )}
          </div>
        </div>

        {/* Bulk Action Bar for Selected Rows */}
        {selectedRowIds.size > 0 && (
          <div className="p-3 sm:p-4 bg-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800 animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {selectedRowIds.size} expense{selectedRowIds.size > 1 ? 's' : ''} selected
                </span>
                <span className="text-[11px] text-indigo-200 font-mono">
                  Total Selected: {formatOMR(selectedTotal)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <button
                onClick={() => handleBulkUpdateReportStatus(true)}
                disabled={isUpdatingReport}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Selected to Expense Report</span>
              </button>

              <button
                onClick={() => handleBulkUpdateReportStatus(false)}
                disabled={isUpdatingReport}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-xs border border-white/20 flex items-center space-x-1 transition disabled:opacity-50 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove from Report</span>
              </button>

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

        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-extrabold text-slate-900">
              {activeReportTab === 'report' ? 'Official Expense Report Items' : activeReportTab === 'unreported' ? 'Available Unreported Expenses' : 'All Expense Line Items'} ({expenses.length})
            </h3>
            {activeReportTab === 'report' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 font-mono">
                {formatOMR(meta.total_amount)}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">
            Zoho Books Chart of Accounts & Projects Tagged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/60">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedRowIds.size === expenses.length && expenses.length > 0}
                    onChange={handleSelectAllRows}
                    disabled={expenses.length === 0}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                    title={selectedRowIds.size === expenses.length ? 'Deselect all' : 'Select all'}
                  />
                </th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3 text-right">Amount (OMR)</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-3">Report Status</th>
                <th className="py-3 px-3">Zoho ID</th>
                <th className="py-3 px-3">Sync</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {activeReportTab === 'report'
                          ? 'No items currently in this Expense Report'
                          : 'No expenses matching current filters'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {activeReportTab === 'report'
                          ? 'Only selected items can be added to the expense report. Switch to "Select & Add Expenses" to choose expenses to include.'
                          : 'Try changing your date filters or project selection.'}
                      </p>
                      {activeReportTab === 'report' && (
                        <button
                          onClick={() => { setActiveReportTab('unreported'); setSelectedRowIds(new Set()); }}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md transition"
                        >
                          + Select & Add Expenses
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className={`hover:bg-slate-50/70 transition ${
                      selectedRowIds.has(exp.id) ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.has(exp.id)}
                        onChange={() => handleToggleRow(exp.id)}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        aria-label={`Select expense ${exp.description}`}
                      />
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {exp.expense_date}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-800">{exp.employee_name || 'Team Member'}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-slate-600">
                        {exp.project_name || projects.find(p => String(p.project_id) === String(exp.project_id) || (exp.customer_id && String(p.customer_id) === String(exp.customer_id)))?.project_name || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap font-mono">
                      {formatOMR(exp.amount)}
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate" title={exp.description}>
                      {exp.description}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {exp.is_exported ? (
                        exp.recall_status === 'pending' ? (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-2xs animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                            <span>Call Back Pending</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                            <Lock className="w-3 h-3 text-purple-600 stroke-[2.5]" />
                            <span>Exported in Report</span>
                          </span>
                        )
                      ) : exp.added_to_report ? (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                          <FileCheck className="w-3 h-3 text-indigo-600 stroke-[2.5]" />
                          <span>Added to Report</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                          <span>Not in Report</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {exp.zoho_journal_number ? (
                        <span className="font-mono text-sky-700 font-bold text-[11px]">
                          {exp.zoho_journal_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {exp.sync_status === 'synced' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Synced</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-amber-700 font-bold text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {exp.is_exported ? (
                        exp.recall_status === 'pending' ? (
                          isAdmin ? (
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={async () => {
                                  if (onApproveRecall) await onApproveRecall(exp.id);
                                  fetchReport();
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center space-x-1 transition active:scale-95"
                                title="Approve Call Back and unlock expense from report"
                              >
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                <span>Approve Recall</span>
                              </button>
                              <button
                                onClick={async () => {
                                  if (onRejectRecall) await onRejectRecall(exp.id);
                                  fetchReport();
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition"
                                title="Reject Call Back request"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-700 font-semibold px-2 py-0.5 bg-amber-50 rounded-lg border border-amber-200">
                              Pending Approval
                            </span>
                          )
                        ) : (
                          <button
                            onClick={async () => {
                              if (onRequestRecall) await onRequestRecall(exp);
                              fetchReport();
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 shadow-2xs transition active:scale-95 flex items-center space-x-1 ml-auto"
                            title={isAdmin ? "Admin: Call back and unlock expense from exported report" : "Request Admin approval to call back expense from exported report"}
                          >
                            <RotateCcw className="w-3 h-3 text-amber-700" />
                            <span>Call Back</span>
                          </button>
                        )
                      ) : exp.added_to_report ? (
                        <button
                          onClick={() => handleSingleRowReportStatus(exp.id, false)}
                          disabled={isUpdatingReport}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition"
                          title="Remove from Expense Report"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSingleRowReportStatus(exp.id, true)}
                          disabled={isUpdatingReport}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-2xs transition active:scale-95"
                          title="Add this expense to the official report"
                        >
                          + Add to Report
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Print Only Signature Block */}
        <div className="hidden print:flex mt-16 px-8 justify-between items-end pb-8">
          <div className="flex flex-col items-center">
            <div className="w-48 border-b-2 border-slate-900 mb-2"></div>
            <span className="text-sm font-bold text-slate-800">Employee Signature</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-48 border-b-2 border-slate-900 mb-2"></div>
            <span className="text-sm font-bold text-slate-800">Authorised By Signature</span>
          </div>
        </div>

      </div>
    </div>
  );
}

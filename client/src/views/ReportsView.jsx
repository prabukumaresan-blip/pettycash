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
  ArrowDownLeft,
  ChevronDown,
  ChevronRight,
  Layers,
  FolderOpen,
  FileText,
  Trash2
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
  onDeleteExpense,
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
  const [selectedReportIds, setSelectedReportIds] = useState(new Set());
  const [expandedReportIds, setExpandedReportIds] = useState(new Set());
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
    setSelectedReportIds(new Set());
    setExpandedReportIds(new Set());
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

  // 1. Client-derived live expenses from allExpenses (instant reflection of user actions)
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
    const serverList = (reportData?.expenses || []).filter((e) => {
      if (activeReportTab === 'report') return e.added_to_report && !e.is_exported;
      if (activeReportTab === 'exported') return e.is_exported;
      if (activeReportTab === 'unreported') return !e.added_to_report && !e.is_exported;
      return true;
    });

    const map = new Map();
    serverList.forEach((e) => map.set(e.id, e));
    // Client-derived expenses take precedence for instant reactivity on mark/unmark
    clientFilteredExpenses.forEach((e) => map.set(e.id, e));

    let list = Array.from(map.values());
    if (activeReportTab === 'report') {
      list = list.filter((e) => e.added_to_report && !e.is_exported);
    } else if (activeReportTab === 'exported') {
      list = list.filter((e) => e.is_exported);
    } else if (activeReportTab === 'unreported') {
      list = list.filter((e) => !e.added_to_report && !e.is_exported);
    }

    return list.sort((a, b) => {
      const dateA = a.expense_date || '';
      const dateB = b.expense_date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [clientFilteredExpenses, reportData, activeReportTab]);

  // 2. Group filtered expenses into formal Report objects (Claim Statements & Exported Archives)
  const reports = React.useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    const reportMap = new Map();

    expenses.forEach((exp) => {
      const empId = exp.employee_id || 'general';
      const empName = exp.employee_name || 'General Account';
      const empCode = exp.employee_code || (employees.find((x) => x.id === empId)?.employee_code) || '';
      const expDate = exp.expense_date || '';
      const monthKey = expDate ? expDate.substring(0, 7) : '2026-11';
      const isExp = Boolean(exp.is_exported);

      let groupKey;
      let title;
      let reportNumber;
      let status;

      const cleanCode = empCode.replace(/[^a-zA-Z0-9]/g, '') || empName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'EMP';
      const cleanMonth = monthKey.replace('-', '');

      if (activeReportTab === 'exported' || isExp) {
        // Exported archive grouped by employee and export date/batch
        const batchDate = exp.exported_at ? exp.exported_at.substring(0, 10).replace(/-/g, '') : cleanMonth;
        groupKey = `EXP_${empId}_${batchDate}`;
        reportNumber = `REP-${cleanCode}-${batchDate}`;
        title = `Petty Cash Statement - ${empName}`;
        status = 'exported';
      } else if (activeReportTab === 'report' || exp.added_to_report) {
        // Ready to export claim package
        groupKey = `CLAIM_${empId}_${cleanMonth}`;
        reportNumber = `CLM-${cleanCode}-${cleanMonth}`;
        title = `Petty Cash Claim - ${empName}`;
        status = 'ready';
      } else {
        // Unreported / general statement
        groupKey = `STMT_${empId}_${cleanMonth}`;
        reportNumber = `STMT-${cleanCode}-${cleanMonth}`;
        title = `Petty Cash Statement - ${empName}`;
        status = 'draft';
      }

      if (!reportMap.has(groupKey)) {
        reportMap.set(groupKey, {
          id: groupKey,
          reportNumber,
          title,
          employee_id: empId,
          employee_name: empName,
          employee_code: empCode,
          status,
          exported_at: exp.exported_at || null,
          minDate: expDate,
          maxDate: expDate,
          expenses: [],
          totalAmount: 0,
          syncedCount: 0,
          pendingCount: 0,
          hasReceiptsCount: 0
        });
      }

      const rep = reportMap.get(groupKey);
      rep.expenses.push(exp);
      rep.totalAmount += parseFloat(exp.amount || 0);
      if (exp.sync_status === 'synced') rep.syncedCount += 1;
      else rep.pendingCount += 1;
      if (exp.receipt_url || exp.receipt_file_name) rep.hasReceiptsCount += 1;
      if (expDate && (!rep.minDate || expDate < rep.minDate)) rep.minDate = expDate;
      if (expDate && (!rep.maxDate || expDate > rep.maxDate)) rep.maxDate = expDate;
      if (exp.exported_at && !rep.exported_at) rep.exported_at = exp.exported_at;
    });

    return Array.from(reportMap.values()).sort((a, b) => {
      const dateA = a.maxDate || '';
      const dateB = b.maxDate || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return a.reportNumber.localeCompare(b.reportNumber);
    });
  }, [expenses, activeReportTab, employees]);

  const selectedReports = React.useMemo(() => {
    return reports.filter((r) => selectedReportIds.has(r.id));
  }, [reports, selectedReportIds]);

  const selectedTotal = React.useMemo(() => {
    return selectedReports.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [selectedReports]);

  const selectedExpensesCount = React.useMemo(() => {
    return selectedReports.reduce((sum, r) => sum + r.expenses.length, 0);
  }, [selectedReports]);

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

  // Report Selection Handlers
  const handleToggleSelectReport = (reportId) => {
    setSelectedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  };

  const handleSelectAllReports = () => {
    if (selectedReportIds.size === reports.length && reports.length > 0) {
      setSelectedReportIds(new Set());
    } else {
      setSelectedReportIds(new Set(reports.map((r) => r.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedReportIds(new Set());
  };

  const toggleExpandReport = (reportId) => {
    setExpandedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  };

  const handleExpandAllReports = () => {
    if (expandedReportIds.size === reports.length && reports.length > 0) {
      setExpandedReportIds(new Set());
    } else {
      setExpandedReportIds(new Set(reports.map((r) => r.id)));
    }
  };

  // Export to CSV & automatically mark exported
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const targetExpenses = selectedReportIds.size > 0
        ? selectedReports.flatMap((r) => r.expenses)
        : reports.flatMap((r) => r.expenses);

      if (targetExpenses.length === 0) {
        setActionFeedback({ type: 'error', msg: 'No expense reports to export.' });
        setTimeout(() => setActionFeedback(null), 4000);
        return;
      }

      const exportedIds = targetExpenses.map((e) => e.id);
      const isExp = activeReportTab === 'exported';

      const filters = {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        employee_id: selectedEmployeeId || undefined,
        project_id: selectedProjectId || undefined,
        sync_status: syncStatusFilter || undefined,
        is_reprint: isExp ? 'true' : 'false',
        mark_exported: isExp ? 'false' : 'true',
        expense_ids: exportedIds.join(',')
      };

      await api.downloadCsvReport(filters, targetExpenses);
      
      // Update exported status across client app immediately if newly exported
      if (!isExp) {
        if (onMarkSelectedExported && exportedIds.length > 0) {
          await onMarkSelectedExported(exportedIds);
        } else if (api.addExportedIds && exportedIds.length > 0) {
          api.addExportedIds(exportedIds);
        }
      }

      setSelectedReportIds(new Set());
      setActionFeedback({
        type: 'success',
        msg: isExp
          ? 'Exported statement CSV downloaded successfully.'
          : `Expense reports exported! ${exportedIds.length} expense log(s) marked as Exported.`
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

  // Export to PDF & automatically mark exported
  const handleExportPdf = async () => {
    const targetExpenses = selectedReportIds.size > 0
      ? selectedReports.flatMap((r) => r.expenses)
      : reports.flatMap((r) => r.expenses);

    if (targetExpenses.length === 0) {
      setActionFeedback({
        type: 'error',
        msg: activeReportTab === 'exported'
          ? 'No exported statement reports match the current filter.'
          : 'No reports currently marked for export in this view.'
      });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }

    setIsExportingPdf(true);
    try {
      const exportedIds = targetExpenses.map((e) => e.id);
      const isExp = activeReportTab === 'exported';

      const filters = {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        employee_id: selectedEmployeeId || undefined,
        project_id: selectedProjectId || undefined,
        sync_status: syncStatusFilter || undefined,
        is_reprint: isExp ? 'true' : 'false',
        mark_exported: isExp ? 'false' : 'true',
        expense_ids: exportedIds.join(',')
      };

      await api.downloadPdfReport(filters, targetExpenses);

      // Update exported status across client app immediately if newly exported
      if (!isExp) {
        if (onMarkSelectedExported && exportedIds.length > 0) {
          await onMarkSelectedExported(exportedIds);
        } else if (api.addExportedIds && exportedIds.length > 0) {
          api.addExportedIds(exportedIds);
        }
      }

      setSelectedReportIds(new Set());
      setActionFeedback({
        type: 'success',
        msg: isExp
          ? `Re-printed PDF for ${selectedReportIds.size > 0 ? selectedReportIds.size : reports.length} statement report(s).`
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

  // Download / Re-print an entire single Report
  const handleDownloadSingleReport = async (report) => {
    try {
      setIsExportingPdf(true);
      const isExp = report.status === 'exported';
      const filters = {
        employee_id: report.employee_id,
        expense_ids: report.expenses.map((e) => e.id).join(','),
        is_reprint: isExp ? 'true' : 'false',
        mark_exported: isExp ? 'false' : 'true'
      };
      await api.downloadPdfReport(filters, report.expenses);

      if (!isExp) {
        const ids = report.expenses.map((e) => e.id);
        if (onMarkSelectedExported && ids.length > 0) {
          await onMarkSelectedExported(ids);
        } else if (api.addExportedIds && ids.length > 0) {
          api.addExportedIds(ids);
        }
      }

      setActionFeedback({
        type: 'success',
        msg: isExp
          ? `Re-printed official PDF for ${report.reportNumber} (${report.expenses.length} logs).`
          : `Exported official statement ${report.reportNumber} (${report.expenses.length} logs).`
      });
      setTimeout(() => setActionFeedback(null), 4500);

      await fetchReport();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to download report:', err);
      setActionFeedback({ type: 'error', msg: `Download failed: ${err.message}` });
      setTimeout(() => setActionFeedback(null), 4500);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Download CSV for a single Report
  const handleDownloadReportCsv = async (report) => {
    try {
      setIsExportingCsv(true);
      const isExp = report.status === 'exported';
      const filters = {
        employee_id: report.employee_id,
        expense_ids: report.expenses.map((e) => e.id).join(','),
        mark_exported: isExp ? 'false' : 'true'
      };
      await api.downloadCsvReport(filters, report.expenses);

      if (!isExp) {
        const ids = report.expenses.map((e) => e.id);
        if (onMarkSelectedExported && ids.length > 0) {
          await onMarkSelectedExported(ids);
        } else if (api.addExportedIds && ids.length > 0) {
          api.addExportedIds(ids);
        }
      }

      setActionFeedback({
        type: 'success',
        msg: `Downloaded CSV for ${report.reportNumber}.`
      });
      setTimeout(() => setActionFeedback(null), 4000);

      await fetchReport();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setActionFeedback({ type: 'error', msg: `CSV export failed: ${err.message}` });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Re-print or print a single expense voucher inside report
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

  // Mark Selected Reports as Exported explicitly
  const handleMarkSelectedAsExported = async () => {
    if (selectedReportIds.size === 0) return;
    setIsUpdatingReport(true);
    const targetExpenses = selectedReports.flatMap((r) => r.expenses);
    const ids = targetExpenses.map((e) => e.id);
    try {
      if (onMarkSelectedExported) {
        await onMarkSelectedExported(ids);
      } else {
        if (api.addExportedIds) api.addExportedIds(ids);
        await api.markExpensesAsExported(ids);
      }
      setSelectedReportIds(new Set());
      await fetchReport();
      if (onRefreshData) onRefreshData();
      setActionFeedback({
        type: 'success',
        msg: `Successfully marked and locked ${ids.length} expense log(s) across ${selectedReportIds.size} report(s) as Exported!`
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setActionFeedback({ type: 'error', msg: err.message });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleManualResync = async () => {
    setIsResyncing(true);
    try {
      if (api.triggerZohoSync) {
        await api.triggerZohoSync();
      }
      await fetchReport(true);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      console.warn('Sync notice:', err.message);
    } finally {
      setIsResyncing(false);
    }
  };

  const handleBulkUpdateReportStatus = async (addedToReport) => {
    if (selectedReportIds.size === 0) return;
    setIsUpdatingReport(true);
    const targetExpenses = selectedReports.flatMap((r) => r.expenses);
    const ids = targetExpenses.map((e) => e.id);
    try {
      if (onUpdateReportStatus) {
        await onUpdateReportStatus(ids, addedToReport);
      } else {
        await api.updateExpensesReportStatus(ids, addedToReport);
      }
      setSelectedReportIds(new Set());
      await fetchReport();
      setActionFeedback({
        type: 'success',
        msg: addedToReport
          ? `Added ${ids.length} expense(s) to the Official Expense Report.`
          : `Removed ${ids.length} expense(s) from the Official Expense Report.`
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setActionFeedback({ type: 'error', msg: err.message });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsUpdatingReport(false);
    }
  };

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
            Generate, audit, and re-print official petty cash claim packages containing synchronized Zoho Books expense logs
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
            title={activeReportTab === 'exported' ? "Re-export CSV spreadsheet of archived statement reports" : "Download CSV spreadsheet and mark active statement reports as exported"}
          >
            <Download className={`w-3.5 h-3.5 text-slate-500 ${isExportingCsv ? 'animate-bounce' : ''}`} />
            <span>{isExportingCsv ? 'Exporting...' : activeReportTab === 'exported' ? 'Re-export CSV' : 'Export to CSV'}</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 active:bg-slate-900 text-white shadow-xs border border-slate-800 transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            title={activeReportTab === 'exported' ? "Re-print official PDF statements for exported reports" : "Download audit PDF statement and mark active claim reports as exported"}
          >
            <Printer className={`w-3.5 h-3.5 text-slate-300 ${isExportingPdf ? 'animate-spin' : ''}`} />
            <span>{isExportingPdf ? 'Generating...' : activeReportTab === 'exported' ? 'Re-print PDF Statements' : 'Download PDF Statements'}</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
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

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Search Reports & Logs</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Report #, employee, invoice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
              />
            </div>
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
            Reports Count
          </span>
          <div className="text-xl font-bold font-mono text-blue-700 mt-1">
            {reports.length} <span className="text-xs text-slate-400 font-normal">Statements</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Contained Expense Logs
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {meta.total_records || 0} <span className="text-xs text-slate-400 font-normal">Vouchers</span>
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

      {/* 4. Report Mode Sub-Tabs & Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Navigation Sub-Tabs & View Toggles */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-5 pt-2.5 bg-slate-50 flex-wrap gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto text-xs">
            <button
              onClick={() => {
                setActiveReportTab('report');
                setSelectedReportIds(new Set());
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
                  {reports.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveReportTab('exported');
                setSelectedReportIds(new Set());
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
                  {reports.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveReportTab('all');
                setSelectedReportIds(new Set());
              }}
              className={`px-3.5 py-2 font-semibold border-b-2 transition flex items-center space-x-2 ${
                activeReportTab === 'all'
                  ? 'border-slate-900 text-slate-900 bg-white font-bold rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>All Statements</span>
              {activeReportTab === 'all' && (
                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-800 rounded font-mono text-[10px]">
                  {reports.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-2 pb-2">
            <button
              type="button"
              onClick={handleExpandAllReports}
              disabled={reports.length === 0}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition shadow-2xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-40"
              title="Expand or collapse all contained expense logs"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {expandedReportIds.size === reports.length && reports.length > 0
                  ? 'Collapse All Vouchers'
                  : 'Expand All Vouchers'}
              </span>
            </button>
          </div>
        </div>

        {/* Informational Guidance Banner */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500">
          {activeReportTab === 'report' && (
            <span className="bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded border border-blue-200 font-medium inline-block">
              Each row below is an official Petty Cash Report containing all marked vouchers for that claim period. Click any report to view its contained vouchers.
            </span>
          )}
          {activeReportTab === 'exported' && (
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2.5 sm:p-3 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Printer className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold">Exported Statements Archive</span>
                  <span className="text-emerald-700 text-[11px] block sm:inline sm:ml-2">
                    ({reports.length} archived statement report{reports.length === 1 ? '' : 's'} containing {meta.total_records} vouchers) — Re-print individual statements or re-print all.
                  </span>
                </div>
              </div>
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf || reports.length === 0}
                className="px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shrink-0 flex items-center space-x-1.5 shadow-2xs transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                title="Re-print all currently visible exported reports"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Re-print All Statements ({reports.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Bulk Action Toolbar for Checked Reports */}
        {selectedReportIds.size > 0 && (
          <div className="p-3 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 animate-fade-in text-xs">
            <div className="flex items-center space-x-3">
              <CheckSquare className="w-4 h-4 text-slate-400" />
              <div>
                <span className="font-bold text-white">
                  {selectedReportIds.size} report{selectedReportIds.size > 1 ? 's' : ''} selected
                </span>
                <span className="text-slate-300 font-mono ml-2">
                  ({selectedExpensesCount} total expense logs • Total: {formatOMR(selectedTotal)})
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold transition disabled:opacity-50 cursor-pointer"
                title={activeReportTab === 'exported' ? "Re-print official PDF statements of selected reports" : "Download PDF statements of selected reports and mark exported"}
              >
                <Printer className="w-3.5 h-3.5 text-slate-700 inline mr-1" />
                <span>{activeReportTab === 'exported' ? 'Re-print Selected (PDF)' : 'Export Selected (PDF)'}</span>
              </button>

              <button
                onClick={handleExportCsv}
                disabled={isExportingCsv}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold transition disabled:opacity-50 cursor-pointer"
                title={activeReportTab === 'exported' ? "Re-export CSV spreadsheet of selected reports" : "Download CSV spreadsheet of selected reports"}
              >
                <Download className="w-3.5 h-3.5 text-slate-700 inline mr-1" />
                <span>{activeReportTab === 'exported' ? 'Re-export Selected (CSV)' : 'Export Selected (CSV)'}</span>
              </button>

              {activeReportTab === 'report' && (
                <button
                  onClick={handleMarkSelectedAsExported}
                  disabled={isUpdatingReport}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition disabled:opacity-50 cursor-pointer"
                  title="Lock selected reports and vouchers as exported"
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
                  title="Remove selected reports back to unexported transactions"
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

        {/* 5. Corporate Reports Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={selectedReportIds.size === reports.length && reports.length > 0}
                    onChange={handleSelectAllReports}
                    className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-400 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-44">Report #</th>
                <th className="py-3 px-3">Statement Title & Claim Period</th>
                <th className="py-3 px-3 w-36">Employee</th>
                <th className="py-3 px-3 w-36 text-center">Contained Vouchers</th>
                <th className="py-3 px-3 w-32 text-right">Total Amount</th>
                <th className="py-3 px-3 w-28 text-center">Zoho Sync</th>
                <th className="py-3 px-3 w-28 text-center">Status</th>
                <th className="py-3 px-3 w-40 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto text-center py-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                        <FileCheck className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm">No reports available</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {activeReportTab === 'report'
                          ? 'Only expense logs marked from Petty Cash Transactions are bundled into export reports. Mark the expense logs you wish to export in Petty Cash Transactions to compile them into a report here.'
                          : 'No reports match the current filter selection.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const isSelected = selectedReportIds.has(report.id);
                  const isExpanded = expandedReportIds.has(report.id);
                  const isExported = report.status === 'exported';

                  return (
                    <React.Fragment key={report.id}>
                      {/* Top-level Report Row */}
                      <tr
                        className={`hover:bg-slate-50/80 transition cursor-pointer select-none ${
                          isSelected ? 'bg-blue-50/40' : isExpanded ? 'bg-slate-50/60' : ''
                        }`}
                        onClick={(e) => {
                          // Prevent toggling if user clicked directly on checkbox or action button
                          if (['INPUT', 'BUTTON', 'A', 'SVG', 'PATH'].includes(e.target.tagName)) return;
                          toggleExpandReport(report.id);
                        }}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectReport(report.id)}
                            className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-400 cursor-pointer"
                          />
                        </td>

                        {/* Report Number with expand toggle */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandReport(report.id);
                              }}
                              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition"
                              title={isExpanded ? 'Collapse vouchers' : 'Expand vouchers'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-700" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <span className="font-mono font-bold text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {report.reportNumber}
                            </span>
                          </div>
                        </td>

                        {/* Statement Title & Claim Period */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-xs">
                            {report.title}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5 font-mono">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {report.minDate} {report.minDate !== report.maxDate ? `— ${report.maxDate}` : ''}
                            </span>
                            {report.exported_at && (
                              <span className="text-emerald-700 ml-2 font-sans font-medium text-[10px]">
                                (Exported: {new Date(report.exported_at).toLocaleDateString()})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Employee */}
                        <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{report.employee_name}</div>
                          {report.employee_code && (
                            <div className="text-[10px] text-slate-400 font-mono">{report.employee_code}</div>
                          )}
                        </td>

                        {/* Contained Vouchers Pill */}
                        <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleExpandReport(report.id)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition cursor-pointer"
                            title="Click to view contained expense logs"
                          >
                            <FileText className="w-3 h-3 text-slate-500" />
                            <span>{report.expenses.length} Log{report.expenses.length === 1 ? '' : 's'}</span>
                            {report.hasReceiptsCount > 0 && (
                              <Paperclip className="w-3 h-3 text-blue-600 ml-0.5" title={`${report.hasReceiptsCount} receipt(s) attached`} />
                            )}
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3 ml-0.5 text-slate-600" />
                            ) : (
                              <ChevronRight className="w-3 h-3 ml-0.5 text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatOMR(report.totalAmount)}
                        </td>

                        {/* Zoho Sync */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {report.syncedCount === report.expenses.length ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{report.syncedCount} / {report.expenses.length} Synced</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{report.syncedCount} / {report.expenses.length} Synced</span>
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isExported ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Exported</span>
                            </span>
                          ) : report.status === 'ready' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />
                              <span>Ready to Export</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <span>Draft Statement</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleReport(report)}
                              disabled={isExportingPdf}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition shadow-2xs cursor-pointer group"
                              title={isExported ? "Re-print official statement PDF" : "Download official statement PDF"}
                            >
                              <Printer className="w-3 h-3 text-slate-500 group-hover:text-slate-900" />
                              <span>{isExported ? 'Re-print' : 'PDF'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadReportCsv(report)}
                              disabled={isExportingCsv}
                              className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition shadow-2xs cursor-pointer"
                              title="Export CSV spreadsheet for this report"
                            >
                              <Download className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleExpandReport(report.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                              title={isExpanded ? 'Collapse vouchers' : 'Expand vouchers'}
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Child Drawer: Contained Expense Logs */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={9} className="p-3 sm:p-4">
                            <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                              {/* Drawer Header */}
                              <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center space-x-2">
                                  <FolderOpen className="w-4 h-4 text-slate-600" />
                                  <span className="font-bold text-slate-800 text-xs">
                                    Contained Expense Logs in {report.reportNumber}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    ({report.expenses.length} voucher{report.expenses.length === 1 ? '' : 's'} totaling {formatOMR(report.totalAmount)})
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleDownloadSingleReport(report)}
                                    disabled={isExportingPdf}
                                    className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-200 shadow-2xs transition flex items-center space-x-1"
                                  >
                                    <Printer className="w-3 h-3 text-slate-500" />
                                    <span>{report.status === 'exported' ? 'Re-print Statement' : 'Export Statement PDF'}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Contained Expenses Table */}
                              <table className="w-full text-left text-xs text-slate-700">
                                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                  <tr>
                                    <th className="py-2 px-3 w-24">Date</th>
                                    <th className="py-2 px-3 w-28">Ref / Inv #</th>
                                    <th className="py-2 px-3">Description & Category</th>
                                    <th className="py-2 px-3 w-36">Project</th>
                                    <th className="py-2 px-3 w-28 text-right">Amount</th>
                                    <th className="py-2 px-3 w-28 text-center">Zoho Sync</th>
                                    <th className="py-2 px-3 w-16 text-center">Receipt</th>
                                    <th className="py-2 px-3 w-24 text-center">Voucher</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-normal">
                                  {report.expenses.map((exp) => {
                                    const hasReceipt = Boolean(exp.receipt_url || exp.receipt_file_name);
                                    const receiptUrl =
                                      exp.receipt_url ||
                                      (exp.receipt_file_name ? `/uploads/${exp.receipt_file_name}` : null);
                                    const receiptName = exp.receipt_file_name || 'Receipt Document';

                                    return (
                                      <tr key={exp.id} className="hover:bg-slate-50/60 transition">
                                        <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                                          {exp.expense_date}
                                        </td>
                                        <td className="py-2 px-3">
                                          {exp.invoice_number ? (
                                            <span className="font-mono text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                              {exp.invoice_number}
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 text-[11px]">—</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="font-semibold text-slate-900 line-clamp-1">
                                            {exp.description}
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                            {exp.category_name || 'Petty Cash Purchases'}
                                          </div>
                                        </td>
                                        <td className="py-2 px-3 text-slate-600">
                                          <span className="line-clamp-1">
                                            {exp.project_name || 'General Operations'}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                          {formatOMR(exp.amount)}
                                        </td>
                                        <td className="py-2 px-3 text-center whitespace-nowrap">
                                          {exp.sync_status === 'synced' ? (
                                            <span
                                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                              title={`Zoho Books Synced${exp.zoho_journal_number && exp.zoho_journal_number !== 'N/A' ? ` • Voucher #${exp.zoho_journal_number}` : ''}`}
                                            >
                                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                              <span>
                                                {exp.zoho_journal_number && exp.zoho_journal_number !== 'N/A'
                                                  ? `#${exp.zoho_journal_number}`
                                                  : 'Synced'}
                                              </span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                              <span>Pending</span>
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-center whitespace-nowrap">
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
                                        <td className="py-2 px-3 text-center whitespace-nowrap">
                                          <div className="flex items-center justify-center space-x-1">
                                            <button
                                              type="button"
                                              onClick={() => handlePrintSingleExpense(exp)}
                                              disabled={isExportingPdf}
                                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                                              title={exp.is_exported ? 'Re-print voucher PDF' : 'Print voucher PDF'}
                                            >
                                              <Printer className="w-3 h-3 text-slate-500" />
                                              <span>{exp.is_exported ? 'Re-print' : 'Print'}</span>
                                            </button>
                                            {onDeleteExpense && (
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  await onDeleteExpense(exp.id);
                                                  await fetchReport();
                                                  if (onRefreshData) onRefreshData();
                                                }}
                                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                                title="Delete voucher from records and Zoho Books"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

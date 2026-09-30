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
  Briefcase,
  User,
  ExternalLink,
  Printer,
  ChevronDown
} from 'lucide-react';
import { api } from '../utils/api';
import { formatOMR } from '../utils/currency';

export default function ReportsView({
  employees = [],
  projects = [],
  currentUser
}) {
  const isAdmin = currentUser?.role === 'admin';
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
  }, [startDate, endDate, selectedEmployeeId, selectedProjectId, syncStatusFilter]);

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
      sync_status: syncStatusFilter || undefined
    };
    window.open(api.getCsvExportUrl(filters), '_blank');
  };

  const handleExportPdf = () => {
    const filters = {
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      employee_id: selectedEmployeeId || undefined,
      project_id: selectedProjectId || undefined,
      sync_status: syncStatusFilter || undefined
    };
    window.open(api.getPdfExportUrl(filters), '_blank');
  };

  const handleManualResync = () => {
    setIsResyncing(true);
    fetchReport(true);
  };

  const expenses = reportData?.expenses || [];
  const meta = reportData?.meta || {};
  const projectBreakdown = reportData?.analytics?.project_breakdown || {};
  const categoryBreakdown = reportData?.analytics?.category_breakdown || {};

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

      {/* Project Breakdown */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            <span>Spend by Zoho Project</span>
          </h3>
          <div className="space-y-2.5">
            {Object.keys(projectBreakdown).length === 0 ? (
              <p className="text-xs text-slate-400">No project allocations in range</p>
            ) : (
              Object.entries(projectBreakdown).map(([proj, amt]) => {
                const pct = meta.total_amount > 0 ? (amt / meta.total_amount) * 100 : 0;
                return (
                  <div key={proj} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate max-w-[200px]">{proj}</span>
                      <span>{formatOMR(amt)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Expense Report Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900">
            Statement Line Items ({expenses.length})
          </h3>
          <span className="text-xs text-slate-400">
            Zoho Books Chart of Accounts & Projects Tagged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/60">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4 text-right">Amount (OMR)</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4">Zoho ID</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No expense records found matching current filters.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {exp.expense_date}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800">{exp.employee_name || 'Team Member'}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-slate-600">{exp.project_name || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                      {formatOMR(exp.amount)}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate" title={exp.description}>
                      {exp.description}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {exp.zoho_journal_number ? (
                        <span className="font-mono text-sky-700 font-bold text-[11px]">
                          {exp.zoho_journal_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
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

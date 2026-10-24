import React from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  KeyRound,
  Mail,
  Hash,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { formatOMR, getSettlementStatus } from '../utils/currency';

export default function EmployeesView({
  employees = [],
  onOpenEmployeeModal,
  onDeleteEmployee,
  onCreateZohoAccount,
  onRefresh
}) {
  const totalHeOwesCompany = employees.reduce((sum, e) => {
    const bal = parseFloat(e.current_balance || 0);
    return sum + (bal > 0.0005 ? bal : 0);
  }, 0);

  const totalCompanyOwesHim = employees.reduce((sum, e) => {
    const bal = parseFloat(e.current_balance || 0);
    return sum + (bal < -0.0005 ? Math.abs(bal) : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold border border-slate-200">
              <Users className="w-4 h-4 text-slate-700" />
            </div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">Staff Accounts & Petty Cash Ledgers</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Administration
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Configure employee accounts, authorization privileges, and linked Zoho Books petty cash sub-accounts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center justify-center space-x-1.5 transition"
              title="Refresh Team List"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          <button
            onClick={() => onOpenEmployeeModal(null)}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-900 text-white font-semibold text-xs shadow-xs border border-slate-800 flex items-center justify-center space-x-1.5 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Company Settlement Summary Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Staff</span>
            <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{employees.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Active profiles</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
              <span>Employee Payable to Company</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 text-[10px] font-mono">Dr</span>
            </span>
            <div className="text-xl font-bold text-emerald-800 mt-1 font-mono">
              {formatOMR(totalHeOwesCompany)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Debit receivable balance</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
              <span>Company Reimbursement Due</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 text-[10px] font-mono">Cr</span>
            </span>
            <div className="text-xl font-bold text-amber-800 mt-1 font-mono">
              {formatOMR(totalCompanyOwesHim)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Credit payable balance</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => {
          const currentBal = parseFloat(emp.current_balance || 0);
          const isAdmin = emp.role === 'admin';

          return (
            <div
              key={emp.id}
              className={`bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between ${emp.is_active === false ? 'opacity-60 grayscale-[0.3]' : ''}`}
            >
              <div>
                {/* Employee / User Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center text-white ${
                      isAdmin
                        ? 'bg-slate-900 border border-slate-800'
                        : 'bg-slate-700 border border-slate-600'
                    }`}>
                      {(emp.name || 'User')
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0].toUpperCase())
                        .join('') || 'U'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span>{emp.name}</span>
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold ${
                          isAdmin
                            ? 'bg-slate-100 text-slate-800 border border-slate-200'
                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {isAdmin ? 'Admin' : 'Staff'}
                        </span>
                        {emp.is_active === false && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Inactive
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono flex items-center space-x-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{emp.email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onOpenEmployeeModal(emp)}
                      title="Edit User & Password"
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteEmployee(emp.id, emp.is_active === false)}
                      title={emp.is_active === false ? "Permanently Delete User" : "Deactivate User"}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Login Credentials Badge */}
                <div className={`mt-3 px-3 py-1.5 rounded-lg border flex items-center justify-between text-xs ${emp.is_active === false ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center space-x-1.5 text-slate-600">
                    <Hash className={`w-3.5 h-3.5 ${emp.is_active === false ? 'text-rose-400' : 'text-slate-400'}`} />
                    <span className="text-[11px]">Code:</span>
                    <span className="font-mono font-semibold text-slate-900 text-xs">{emp.employee_code}</span>
                  </div>
                  <div className={`flex items-center space-x-1 font-medium text-[11px] ${emp.is_active === false ? 'text-rose-700' : 'text-slate-600'}`}>
                    <KeyRound className={`w-3 h-3 ${emp.is_active === false ? 'text-rose-500' : 'text-slate-400'}`} />
                    <span>{emp.is_active === false ? 'Deactivated' : 'Authorized'}</span>
                  </div>
                </div>

                {/* Petty Cash Account Ending Balance & Settlement Card */}
                {(() => {
                  const settlement = getSettlementStatus(currentBal, emp.name || 'He');
                  return (
                    <div className={`mt-3 p-3.5 rounded-xl border transition-all ${
                      settlement.isEmployeeOwing
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : settlement.isCompanyOwing
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium text-[11px]">Petty Cash Balance:</span>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-sm text-slate-900 font-mono">
                            {settlement.formattedAmount}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded font-mono uppercase ${
                            settlement.isEmployeeOwing
                              ? 'bg-emerald-100 text-emerald-800'
                              : settlement.isCompanyOwing
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {settlement.accountingSideShort}
                          </span>
                        </div>
                      </div>

                      {/* Explicit Settlement Status Banner */}
                      <div className={`mt-2 px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-semibold border ${
                        settlement.isEmployeeOwing
                          ? 'bg-emerald-100/70 border-emerald-200 text-emerald-950'
                          : settlement.isCompanyOwing
                          ? 'bg-amber-100/70 border-amber-200 text-amber-950'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}>
                        <div className="flex items-center space-x-1.5 min-w-0 pr-1">
                          {settlement.isEmployeeOwing ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5] shrink-0" />
                          ) : settlement.isCompanyOwing ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-amber-700 stroke-[2.5] shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 stroke-[2.5] shrink-0" />
                          )}
                          <span className="truncate text-[11px]">
                            {settlement.accountingLabel}
                          </span>
                        </div>
                        <span className="font-bold font-mono text-[11px] shrink-0">
                          {settlement.formattedAmount} {settlement.accountingSideShort}
                        </span>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span className="inline-flex items-center space-x-1 text-slate-600">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Zoho Sub-Account</span>
                        </span>
                        <span className="text-slate-400 font-mono">{emp.petty_cash_account_id || 'acc-pc-auto'}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Zoho Account Mapping Tag */}
                <div className="mt-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 flex items-center space-x-1 shrink-0">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Zoho Books Account:</span>
                    </span>
                    {emp.petty_cash_account_id ? (
                      <button
                        onClick={() => onOpenEmployeeModal(emp)}
                        className="font-semibold text-slate-800 text-[11px] truncate max-w-[190px] sm:max-w-[210px] hover:text-blue-600 hover:underline text-right"
                        title={`${emp.petty_cash_account_name || emp.petty_cash_account_id} (Click to change)`}
                      >
                        {emp.petty_cash_account_name || emp.petty_cash_account_id}
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenEmployeeModal(emp)}
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center space-x-0.5 shrink-0"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Link Account</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-slate-500">
                    <span className="flex items-center space-x-1 shrink-0">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>Default Project:</span>
                    </span>
                    <span className="font-medium text-slate-700 text-[11px] truncate max-w-[190px] sm:max-w-[210px] text-right">
                      {emp.default_project_name || 'General Operations'}
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenEmployeeModal(emp)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center justify-center space-x-1.5 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Manage Account</span>
                  </button>
                  <button
                    onClick={() => onDeleteEmployee(emp.id)}
                    title="Deactivate User"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

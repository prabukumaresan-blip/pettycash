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
  Wallet
} from 'lucide-react';
import { formatOMR, getSettlementStatus } from '../utils/currency';

export default function EmployeesView({
  employees = [],
  onOpenEmployeeModal,
  onDeleteEmployee,
  onCreateZohoAccount
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">User Management</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
                Administrator Portal
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xl">
            Create and manage individual employee logins, system access roles, passwords, and linked Zoho Books petty cash accounts.
          </p>
        </div>

        <button
          onClick={() => onOpenEmployeeModal(null)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 transition"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Company Settlement Summary Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Team Users</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{employees.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active team members</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center space-x-1">
              <span>They have to pay to Company</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-200/80 text-emerald-900 text-[10px] font-mono">Dr</span>
            </span>
            <div className="text-2xl font-black text-emerald-950 mt-1 font-mono">
              {formatOMR(totalHeOwesCompany)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Debit balances (unspent cash in hand)
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-200/80 text-emerald-800 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center space-x-1">
              <span>Company needs to pay to Them</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 text-[10px] font-mono">Cr</span>
            </span>
            <div className="text-2xl font-black text-amber-950 mt-1 font-mono">
              {formatOMR(totalCompanyOwesHim)}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5">
              Credit balances (out-of-pocket reimbursements)
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
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
              className={`bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${emp.is_active === false ? 'opacity-60 grayscale-[0.3]' : ''}`}
            >
              <div>
                {/* Employee / User Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-11 h-11 rounded-2xl font-black text-sm flex items-center justify-center shadow-md text-white ${
                      isAdmin
                        ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-500/20'
                        : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20'
                    }`}>
                      {emp.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span>{emp.name}</span>
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                          isAdmin
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {isAdmin ? 'Admin' : 'Employee'}
                        </span>
                        {emp.is_active === false && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700 border border-red-200">
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
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteEmployee(emp.id, emp.is_active === false)}
                      title={emp.is_active === false ? "Permanently Delete User" : "Deactivate User"}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Login Credentials Badge */}
                <div className={`mt-3 px-3 py-2 rounded-xl border flex items-center justify-between text-xs ${emp.is_active === false ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200/70'}`}>
                  <div className="flex items-center space-x-1.5 text-slate-600">
                    <Hash className={`w-3.5 h-3.5 ${emp.is_active === false ? 'text-red-400' : 'text-slate-400'}`} />
                    <span>Login Code:</span>
                    <span className="font-mono font-bold text-slate-900">{emp.employee_code}</span>
                  </div>
                  <div className={`flex items-center space-x-1 font-semibold text-[11px] ${emp.is_active === false ? 'text-red-600' : 'text-emerald-700'}`}>
                    <KeyRound className={`w-3 h-3 ${emp.is_active === false ? 'text-red-500' : 'text-emerald-600'}`} />
                    <span>{emp.is_active === false ? 'Access Revoked' : 'Active Login'}</span>
                  </div>
                </div>

                {/* Petty Cash Account Ending Balance & Settlement Card */}
                {(() => {
                  const settlement = getSettlementStatus(currentBal, emp.name || 'He');
                  return (
                    <div className={`mt-3.5 p-4 rounded-2xl border transition-all ${
                      settlement.isEmployeeOwing
                        ? 'bg-gradient-to-br from-emerald-50/70 to-slate-50 border-emerald-200'
                        : settlement.isCompanyOwing
                        ? 'bg-gradient-to-br from-amber-50/80 to-orange-50/40 border-amber-200'
                        : 'bg-gradient-to-br from-slate-50 to-blue-50/40 border-slate-200/80'
                    }`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Petty Cash Ending Balance:</span>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-base text-slate-900 font-mono">
                            {settlement.formattedAmount}
                          </span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded font-mono uppercase ${
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
                      <div className={`mt-2.5 px-3 py-2 rounded-xl flex items-center justify-between text-xs font-bold border ${
                        settlement.isEmployeeOwing
                          ? 'bg-emerald-100/90 border-emerald-300 text-emerald-950 shadow-2xs'
                          : settlement.isCompanyOwing
                          ? 'bg-amber-100/90 border-amber-300 text-amber-950 shadow-2xs'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}>
                        <div className="flex items-center space-x-1.5 min-w-0 pr-1">
                          {settlement.isEmployeeOwing ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-700 stroke-[2.5] shrink-0" />
                          ) : settlement.isCompanyOwing ? (
                            <ArrowDownLeft className="w-4 h-4 text-amber-700 stroke-[2.5] shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-slate-500 stroke-[2.5] shrink-0" />
                          )}
                          <span className="truncate">
                            {settlement.accountingLabel}
                          </span>
                        </div>
                        <span className="font-black font-mono text-xs shrink-0">
                          {settlement.formattedAmount} {settlement.accountingSideShort}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                        <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Zoho Ending Balance</span>
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">{emp.petty_cash_account_id || 'acc-pc-auto'}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Zoho Account Mapping Tag */}
                <div className="mt-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center space-x-1">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Zoho Books Account:</span>
                    </span>
                    {emp.petty_cash_account_id ? (
                      <button
                        onClick={() => onOpenEmployeeModal(emp)}
                        className="font-semibold text-slate-800 text-[11px] truncate max-w-[140px] hover:text-blue-600 hover:underline text-right"
                        title={`${emp.petty_cash_account_name || emp.petty_cash_account_id} (Click to change)`}
                      >
                        {emp.petty_cash_account_name || emp.petty_cash_account_id}
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenEmployeeModal(emp)}
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center space-x-0.5"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Link Account</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>Default Project:</span>
                    </span>
                    <span className="font-medium text-slate-700 text-[11px] truncate max-w-[140px]">
                      {emp.default_project_name || 'General Operations'}
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenEmployeeModal(emp)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Profile & Accounts</span>
                  </button>
                  <button
                    onClick={() => onDeleteEmployee(emp.id)}
                    title="Deactivate User"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
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

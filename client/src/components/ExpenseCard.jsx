import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  Briefcase,
  Edit2,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { formatOMR } from '../utils/currency';

export default function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  onRetrySync
}) {
  const isSynced = expense.sync_status === 'synced';
  const isFailed = expense.sync_status === 'failed';
  const isPending = expense.sync_status === 'pending';

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        {/* Left: Category Icon & Main Info */}
        <div className="flex items-start space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold border border-blue-100">
            <FileText className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {expense.category_name || 'Petty Cash Purchases'}
              </span>

              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Paid Through: {expense.paid_through_account_name || `Petty Cash - ${expense.employee_name}`}
              </span>

              {/* Zoho Sync Status Pill */}
              {isSynced && (
                <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{expense.zoho_journal_number || 'Synced to Zoho'}</span>
                </span>
              )}

              {isPending && (
                <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                  <span>Pending Sync</span>
                </span>
              )}

              {isFailed && (
                <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  <span>Sync Failed</span>
                </span>
              )}
            </div>

            {/* Description */}
            <h4 className="text-sm font-bold text-slate-800 mt-1.5 line-clamp-2">
              {expense.description}
            </h4>

            {/* Meta details: Employee, Project, Date */}
            <div className="flex items-center space-x-3 mt-2 text-xs text-slate-500 flex-wrap gap-y-1">
              <span className="font-semibold text-slate-700">{expense.employee_name || 'Employee'}</span>
              <span>•</span>
              <span>{expense.expense_date}</span>
              {expense.project_name && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center space-x-1 text-slate-600">
                    <Briefcase className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[130px]">{expense.project_name}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Amount & Action Dropdown */}
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="text-base sm:text-lg font-black text-slate-900">
            {formatOMR(expense.amount)}
          </span>

          {/* Quick Action buttons */}
          <div className="flex items-center space-x-1 mt-2">
            {!isSynced && onRetrySync && (
              <button
                onClick={() => onRetrySync(expense.id)}
                title="Retry Zoho Sync"
                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onEdit(expense)}
              title="Edit Expense"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(expense.id)}
              title="Delete Expense"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

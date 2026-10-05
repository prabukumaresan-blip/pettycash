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
  ExternalLink,
  FileCheck,
  Plus,
  Lock,
  RotateCcw,
  Check,
  X
} from 'lucide-react';
import { formatOMR } from '../utils/currency';

export default function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  onRetrySync,
  isSelected,
  onToggleSelect,
  onToggleReportStatus,
  onRequestRecall,
  onApproveRecall,
  onRejectRecall,
  currentUser
}) {
  const isSynced = expense.sync_status === 'synced';
  const isFailed = expense.sync_status === 'failed';
  const isPending = expense.sync_status === 'pending';
  const isExported = Boolean(expense.is_exported);
  const isReported = Boolean(expense.added_to_report);
  const isAdmin = currentUser?.role === 'admin';
  // ONLY exported expenses require admin to delete. Unexported items can be deleted even if in report!
  const isLockedFromDelete = isExported && !isAdmin;

  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all ${
      isSelected
        ? 'border-blue-400 bg-blue-50/20 shadow-sm'
        : 'border-slate-200/90 shadow-xs hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between gap-3">
        {/* Left: Checkbox + Category Icon & Main Info */}
        <div className="flex items-start space-x-3 min-w-0">
          {onToggleSelect && (
            <div className="pt-2.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={Boolean(isSelected)}
                onChange={() => onToggleSelect(expense.id)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                aria-label={`Select expense ${expense.description}`}
              />
            </div>
          )}

          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold border border-blue-100">
            <FileText className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {expense.category_name || 'Petty Cash Purchases'}
              </span>

              {/* Expense Report Status Pill */}
              {isExported ? (
                expense.recall_status === 'pending' ? (
                  <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-2xs animate-pulse">
                    <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                    <span>Call Back Pending Admin Approval</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                    <Lock className="w-3 h-3 text-purple-600 stroke-[2.5]" />
                    <span>Exported in Report</span>
                  </span>
                )
              ) : isReported ? (
                <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                  <FileCheck className="w-3 h-3 text-indigo-600 stroke-[2.5]" />
                  <span>Added to Report</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  <span>Not in Report</span>
                </span>
              )}

              {/* Call Back Approved Note if recently unlocked */}
              {!isExported && expense.recall_status === 'approved' && (
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <RotateCcw className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Called Back</span>
                </span>
              )}

              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Paid: {expense.paid_through_account_name || `Petty Cash - ${expense.employee_name}`}
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
              {(expense.project_name || expense.customer_name) && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center space-x-1 text-slate-600">
                    <Briefcase className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[150px]">{expense.project_name || expense.customer_name}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Amount & Action Dropdown */}
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {formatOMR(expense.amount)}
          </span>

          {/* Quick Action buttons */}
          <div className="flex items-center space-x-1 mt-2 flex-wrap justify-end gap-y-1">
            {/* Call Back & Report Actions */}
            {isExported ? (
              expense.recall_status === 'pending' ? (
                isAdmin ? (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onApproveRecall && onApproveRecall(expense.id)}
                      title="Approve Call Back and unlock expense from report"
                      className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs flex items-center space-x-1 transition"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Approve Recall</span>
                    </button>
                    <button
                      onClick={() => onRejectRecall && onRejectRecall(expense.id)}
                      title="Reject Call Back request"
                      className="p-1 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span
                    title="Call back requested. Waiting for Administrator approval."
                    className="px-2.5 py-1 rounded-xl text-xs font-bold border bg-amber-50 text-amber-800 border-amber-300 flex items-center space-x-1 cursor-default select-none"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    <span className="hidden sm:inline">Pending Approval</span>
                  </span>
                )
              ) : (
                <button
                  onClick={() => onRequestRecall && onRequestRecall(expense)}
                  title={
                    isAdmin
                      ? 'Admin: Call back and unlock this expense from the exported report'
                      : 'Request Admin approval to call back / unlock this expense from the exported report'
                  }
                  className="px-2.5 py-1 rounded-xl text-xs font-bold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 active:scale-95 transition flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Call Back</span>
                </button>
              )
            ) : onToggleReportStatus ? (
              <button
                onClick={() => onToggleReportStatus(expense.id, expense.added_to_report)}
                title={expense.added_to_report ? 'Remove from Expense Report' : 'Add this item to Expense Report'}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1 border ${
                  expense.added_to_report
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 active:scale-95'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 active:scale-95'
                }`}
              >
                {expense.added_to_report ? (
                  <>
                    <FileCheck className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                    <span className="hidden sm:inline">In Report</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-slate-500 stroke-[2.5]" />
                    <span>Add to Report</span>
                  </>
                )}
              </button>
            ) : null}

            {!isSynced && onRetrySync && (
              <button
                onClick={() => onRetrySync(expense.id)}
                title="Retry Zoho Sync"
                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            {isExported && !isAdmin ? (
              <button
                type="button"
                disabled
                title="Locked: Exported in official report. Only an Administrator can edit."
                className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-300" />
              </button>
            ) : (
              <button
                onClick={() => onEdit(expense)}
                title="Edit Expense"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {isLockedFromDelete ? (
              <button
                type="button"
                disabled
                title={
                  isExported
                    ? 'Locked: Exported in official report. Only an Administrator can delete this expense.'
                    : 'Locked: Included in Expense Report. Only an Administrator can delete this expense.'
                }
                className="p-1.5 rounded-lg text-slate-400 bg-slate-100/80 border border-slate-200 cursor-not-allowed transition"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
              </button>
            ) : (
              <button
                onClick={() => onDelete(expense.id)}
                title={
                  isAdmin && (isExported || isReported)
                    ? 'Delete Expense (Admin Action: Item is in official report)'
                    : 'Delete Expense'
                }
                className={`p-1.5 rounded-lg transition ${
                  isAdmin && (isExported || isReported)
                    ? 'text-red-500 hover:text-red-700 hover:bg-red-50 ring-1 ring-red-200'
                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

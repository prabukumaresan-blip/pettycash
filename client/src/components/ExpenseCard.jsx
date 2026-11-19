import React from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  RotateCcw,
  Paperclip,
  Edit2,
  Trash2,
  ExternalLink
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
  onViewReceipt,
  currentUser
}) {
  const isSynced = expense.sync_status === 'synced';
  const isFailed = expense.sync_status === 'failed';
  const isPending = expense.sync_status === 'pending';
  const isExported = Boolean(expense.is_exported);
  const isAdmin = currentUser?.role === 'admin';
  const hasReceipt = Boolean(expense.receipt_url || expense.receipt_file_name);

  const receiptUrl = expense.receipt_url || (expense.receipt_file_name ? `/uploads/${expense.receipt_file_name}` : null);
  const receiptName = expense.receipt_file_name || 'Receipt Document';

  return (
    <div
      className={`bg-white rounded-lg p-3 sm:p-4 border transition-all ${
        isSelected
          ? 'border-slate-800 bg-slate-50/40 shadow-xs ring-1 ring-slate-800/10'
          : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Checkbox & Info */}
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          {onToggleSelect && (
            <div className="pt-1 shrink-0">
              <input
                type="checkbox"
                checked={Boolean(isSelected)}
                onChange={() => onToggleSelect(expense.id)}
                className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-400 cursor-pointer"
                aria-label={`Select expense ${expense.description}`}
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Top Badge Strip */}
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 text-xs">
              <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                {expense.category_name || 'Petty Cash Purchases'}
              </span>

              {/* Export Status Badge: Exported / Not Exported */}
              {isExported ? (
                expense.recall_status === 'pending' ? (
                  <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                    <span>Call Back Pending</span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                    title={expense.exported_at ? `Exported on ${new Date(expense.exported_at).toLocaleString()}` : 'Exported'}
                  >
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>Exported</span>
                  </span>
                )
              ) : expense.added_to_report ? (
                <button
                  type="button"
                  onClick={() => onToggleReportStatus && onToggleReportStatus(expense)}
                  className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                  title="Marked for Export - Tap to unmark"
                >
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  <span>Marked for Export</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleReportStatus && onToggleReportStatus(expense)}
                  className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                  title="Not Exported - Tap to mark for Export"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>Not Exported</span>
                </button>
              )}

              {/* Zoho Sync Badge */}
              {isSynced && (
                <span
                  className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shadow-2xs"
                  title={`Zoho Books Synced${expense.zoho_journal_number && expense.zoho_journal_number !== 'N/A' ? ` • Voucher #${expense.zoho_journal_number}` : (expense.zoho_journal_id ? ` • ID: ${expense.zoho_journal_id}` : '')}`}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{expense.zoho_journal_number && expense.zoho_journal_number !== 'N/A' ? `Zoho #${expense.zoho_journal_number}` : 'Zoho Synced'}</span>
                </span>
              )}

              {isPending && (
                <button
                  type="button"
                  onClick={() => onRetrySync && onRetrySync(expense.id)}
                  className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition cursor-pointer"
                  title="Pending Zoho Sync • Tap to sync now"
                >
                  <Clock className="w-3 h-3 text-amber-600 animate-pulse shrink-0" />
                  <span>Pending Sync</span>
                </button>
              )}

              {isFailed && (
                <button
                  type="button"
                  onClick={() => onRetrySync && onRetrySync(expense.id)}
                  className="inline-flex items-center space-x-1 text-[11px] font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded border border-rose-200 transition cursor-pointer"
                  title={`Sync Failed: ${expense.sync_error || 'Error'} • Tap to retry`}
                >
                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                  <span>Sync Failed</span>
                </button>
              )}

              {/* Invoice / Reference Badge */}
              {expense.invoice_number && (
                <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  <span>Ref: {expense.invoice_number}</span>
                </span>
              )}

              {/* Receipt File Pill */}
              {hasReceipt && (
                <button
                  type="button"
                  onClick={() => onViewReceipt && onViewReceipt(receiptUrl, receiptName)}
                  className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition"
                  title="View attached receipt document"
                >
                  <Paperclip className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-[120px] font-mono">{receiptName}</span>
                </button>
              )}
            </div>

            {/* Description */}
            <h4 className="text-xs font-semibold text-slate-900 mt-1.5 leading-snug">
              {expense.description}
            </h4>

            {/* Meta Row: Date, Employee, Project */}
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1 flex-wrap gap-y-0.5">
              <span>{expense.expense_date}</span>
              {expense.project_name && (
                <>
                  <span>•</span>
                  <span className="text-slate-600 font-medium truncate max-w-[200px]">
                    {expense.project_name}
                  </span>
                </>
              )}
              {expense.employee_name && (
                <>
                  <span>•</span>
                  <span>{expense.employee_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Amount & Action Controls */}
        <div className="flex flex-col items-end justify-between shrink-0 pl-2">
          {/* Amount */}
          <div className="text-right">
            <span className="text-sm sm:text-base font-bold font-mono text-slate-900 tracking-tight">
              {formatOMR(expense.amount)}
            </span>
          </div>

          {/* Action Icons */}
          <div className="flex items-center space-x-1 mt-2">
            {isFailed && onRetrySync && (
              <button
                onClick={() => onRetrySync(expense.id)}
                className="p-1 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition"
                title="Retry Zoho Books Sync"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
            )}

            {isExported && (
              <button
                onClick={() => onRequestRecall && onRequestRecall(expense)}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition flex items-center space-x-1"
                title={isAdmin ? 'Admin Direct Unlock' : 'Request Unlock / Recall'}
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>{isAdmin ? 'Unlock' : 'Recall'}</span>
              </button>
            )}

            {!isExported && onEdit && (
              <button
                onClick={() => onEdit(expense)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title="Edit Expense"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {(!isExported || isAdmin) && onDelete && (
              <button
                onClick={() => onDelete(expense.id)}
                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Delete Expense"
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

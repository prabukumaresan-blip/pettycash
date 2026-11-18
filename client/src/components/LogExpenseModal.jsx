import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  Tag,
  Briefcase,
  FileText,
  AlertCircle,
  Hash,
  Lock
} from 'lucide-react';
import { formatOMR } from '../utils/currency';
import { api } from '../utils/api';

export default function LogExpenseModal({
  isOpen,
  onClose,
  currentEmployee,
  categories = [],
  projects = [],
  onExpenseSaved,
  editExpense = null
}) {
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [zohoProjects, setZohoProjects] = useState(projects || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fixed default category: Other Expenses (not editable)
  const defaultCategory =
    categories.find(
      (c) => c.account_name && c.account_name.toLowerCase().includes('other expense')
    ) ||
    categories.find((c) => c.account_id === '3095712000000000460') ||
    categories[0] || {
      account_id: '3095712000000000460',
      account_name: 'Other Expenses'
    };

  // Sync projects with Zoho Books
  useEffect(() => {
    if (projects && projects.length > 0) {
      setZohoProjects(projects);
    } else if (isOpen) {
      api.getZohoProjects()
        .then((res) => {
          if (res.success && res.projects) {
            setZohoProjects(res.projects);
          }
        })
        .catch((err) => console.warn('Could not fetch Zoho projects:', err));
    }
  }, [projects, isOpen]);

  // Populate form on open
  useEffect(() => {
    if (!isOpen) return;

    if (editExpense) {
      setAmount(editExpense.amount ? String(editExpense.amount) : '');
      setExpenseDate(editExpense.expense_date || new Date().toISOString().split('T')[0]);
      setInvoiceNumber(editExpense.invoice_number || '');
      setDescription(editExpense.description || '');
      setProjectId(editExpense.project_id || '');
    } else {
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setInvoiceNumber('');
      setDescription('');
      const defaultProj = currentEmployee?.default_project_id || (zohoProjects.length > 0 ? zohoProjects[0].project_id : '');
      setProjectId(defaultProj);
    }
    setErrorMessage('');
  }, [isOpen, editExpense?.id]);

  useEffect(() => {
    if (!projectId && zohoProjects.length > 0) {
      setProjectId(currentEmployee?.default_project_id || zohoProjects[0].project_id);
    }
  }, [zohoProjects, currentEmployee, projectId]);

  // Handle amount formatting (supports up to 3 decimals for OMR)
  const handleAmountChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,3}$/.test(val)) {
      setAmount(val);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount greater than 0');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please enter an expense description or purpose');
      return;
    }

    const employeeId = currentEmployee?.id;
    if (!employeeId) {
      setErrorMessage('Employee account not identified. Please try logging in again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedProj = zohoProjects.find((p) => String(p.project_id) === String(projectId));
      const paidThroughAccId = currentEmployee?.petty_cash_account_id || '';
      const paidThroughAccName =
        currentEmployee?.petty_cash_account_name || `Petty Cash - ${currentEmployee?.name}`;

      const formData = new FormData();
      formData.append('employee_id', employeeId);
      formData.append('expense_date', expenseDate);
      formData.append('amount', parsedAmount);
      // Fixed non-editable category: Other Expenses
      formData.append('category_id', defaultCategory.account_id);
      formData.append('category_name', defaultCategory.account_name);
      formData.append('paid_through_account_id', paidThroughAccId);
      formData.append('paid_through_account_name', paidThroughAccName);
      formData.append('description', description.trim());
      formData.append('invoice_number', invoiceNumber.trim());
      // When newly logged, it is recorded in Petty Cash Transactions (unmarked for export until user marks it)
      const isMarked = editExpense ? String(Boolean(editExpense.added_to_report)) : 'false';
      formData.append('added_to_report', isMarked);

      if (projectId) {
        formData.append('project_id', projectId);
        if (selectedProj) {
          formData.append('project_name', selectedProj.project_name || '');
          if (selectedProj.customer_id) {
            formData.append('customer_id', selectedProj.customer_id);
            formData.append('customer_name', selectedProj.customer_name || '');
          }
        }
      }

      await onExpenseSaved(formData, editExpense ? editExpense.id : null);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to record expense voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentBal = parseFloat(currentEmployee?.current_balance || 0);
  const enteredAmt = parseFloat(amount || 0);
  const remainingBal = currentBal - enteredAmt;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-slide-up">
        {/* Corporate Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {editExpense ? 'Edit Petty Cash Transaction' : 'Record Petty Cash Expense'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Petty Cash Account: {currentEmployee?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Amount Card (Corporate Financial Input) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Expense Amount (OMR) *
              </label>
              <span className="text-[11px] text-slate-400 font-medium">3 decimal precision</span>
            </div>

            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-slate-400 font-mono">OMR</span>
              <input
                id="expense-amount-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.000"
                className="w-full text-2xl sm:text-3xl font-bold bg-transparent text-slate-900 focus:outline-none placeholder-slate-300 font-mono"
                autoFocus
              />
            </div>

            {/* Quick preset chips */}
            <div className="flex items-center space-x-1.5 mt-3 pt-2.5 border-t border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
              {[5, 10, 20, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toFixed(3))}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition"
                >
                  +{preset} OMR
                </button>
              ))}
            </div>

            {/* Remaining Balance Impact */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <span>Account Balance Impact:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatOMR(currentBal)} → {formatOMR(remainingBal)}
              </span>
            </div>
          </div>

          {/* 2-Column Grid: Date & Invoice Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Expense Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date of Expense *</span>
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
              />
            </div>

            {/* Invoice / Reference Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Invoice / Bill Reference</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-1048 or Bill #830"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Description / Business Purpose *</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fuel for company delivery van / hardware fittings"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
            />
          </div>

          {/* 2-Column Grid: Project & Expense Category Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Project */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>Zoho Books Project</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:ring-1 focus:ring-slate-400 focus:border-slate-400 truncate"
              >
                <option value="">None / General Company Overheads</option>
                {zohoProjects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.project_name} {p.project_code ? `(${p.project_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Expense Category Account (Default Other Expenses, Non-Editable) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Expense Category Account</span>
              </label>
              <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-between">
                <span>{defaultCategory.account_name || 'Other Expenses'}</span>
                <span className="inline-flex items-center space-x-1 text-[10px] text-slate-500 font-mono">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Default</span>
                </span>
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-900 text-white font-semibold text-xs border border-slate-800 shadow-xs flex items-center space-x-2 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving & Syncing...</span>
                </>
              ) : (
                <span>{editExpense ? 'Update Transaction' : 'Record Expense & Sync'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  Tag,
  Briefcase,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
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
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [zohoProjects, setZohoProjects] = useState(projects || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  // Initialize or populate form only once when modal opens or editExpense changes
  useEffect(() => {
    if (!isOpen) return;

    if (editExpense) {
      setAmount(editExpense.amount ? String(editExpense.amount) : '');
      setExpenseDate(editExpense.expense_date || new Date().toISOString().split('T')[0]);
      setCategoryId(editExpense.category_id || '');
      setDescription(editExpense.description || '');
      setProjectId(editExpense.project_id || '');
    } else {
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      const defaultExp = categories.find(c => c.account_name.toLowerCase() === 'other expenses') || categories[0];
      setCategoryId(defaultExp ? defaultExp.account_id : '3095712000000000460');
      setDescription('');
      const defaultProj = currentEmployee?.default_project_id || (zohoProjects.length > 0 ? zohoProjects[0].project_id : '');
      setProjectId(defaultProj);
    }
    setErrorMessage('');
  }, [isOpen, editExpense, categories]);

  // Set default project if projects finish loading later and projectId is still empty
  useEffect(() => {
    if (!projectId && zohoProjects.length > 0) {
      setProjectId(currentEmployee?.default_project_id || zohoProjects[0].project_id);
    }
  }, [zohoProjects, currentEmployee, projectId]);

  // Handle amount typing safely (supports OMR 3-decimal Baisa)
  const handleAmountChange = (e) => {
    const val = e.target.value;
    // Allow empty, or positive number with max 3 decimal places
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

    setIsSubmitting(true);

    const employeeId = currentEmployee?.id;
    if (!employeeId) {
      setErrorMessage('Employee account not identified. Please try logging in again.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Determine selected expense account
      const selectedExp = categories.find(c => c.account_id === categoryId) ||
        categories.find(c => c.account_name.toLowerCase() === 'other expenses') ||
        categories[0] || {
          account_id: '3095712000000000460',
          account_name: 'Other Expenses'
        };
      const selectedProj = zohoProjects.find(p => p.project_id === projectId);
      const paidThroughAccId = currentEmployee?.petty_cash_account_id || '';
      const paidThroughAccName = currentEmployee?.petty_cash_account_name || `Petty Cash - ${currentEmployee?.name}`;

      const formData = new FormData();
      formData.append('employee_id', employeeId);
      formData.append('expense_date', expenseDate);
      formData.append('amount', parsedAmount);
      formData.append('category_id', selectedExp.account_id);
      formData.append('category_name', selectedExp.account_name);
      formData.append('paid_through_account_id', paidThroughAccId);
      formData.append('paid_through_account_name', paidThroughAccName);
      formData.append('description', description);
      if (projectId && selectedProj) {
        formData.append('project_id', projectId);
        formData.append('project_name', selectedProj.project_name || '');
        if (selectedProj.customer_id) {
          formData.append('customer_id', selectedProj.customer_id);
          formData.append('customer_name', selectedProj.customer_name || '');
        }
      }

      await onExpenseSaved(formData, editExpense ? editExpense.id : null);

      // Trigger celebratory confetti on new expense creation
      if (!editExpense) {
        try {
          confetti({
            particleCount: 60,
            spread: 55,
            origin: { y: 0.7 }
          });
        } catch {
          // ignore if canvas blocked
        }
      }

      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentBal = parseFloat(currentEmployee?.current_balance || 0);
  const enteredAmt = parseFloat(amount || 0);
  const remainingBal = currentBal - enteredAmt;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-slide-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {editExpense ? 'Edit Petty Cash Expense' : 'Log Petty Cash Expense'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Pushes journal entry to Zoho Books under {currentEmployee?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Amount Field (Large Touch-Friendly Display) */}
          <div
            onClick={() => document.getElementById('expense-amount-input')?.focus()}
            className="bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-4 rounded-2xl border border-blue-100/80 cursor-text"
          >
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">
              Expense Amount (OMR)
            </label>
            <div className="relative flex items-center">
              <span className="text-xl sm:text-2xl font-black text-blue-600 mr-2.5 tracking-tight">OMR</span>
              <input
                id="expense-amount-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.000"
                className="w-full text-2xl sm:text-3xl font-extrabold bg-transparent text-slate-900 focus:outline-none placeholder-blue-300"
                autoFocus
              />
            </div>

            {/* Quick preset amount chips */}
            <div className="flex items-center space-x-1.5 mt-2.5 pt-2 border-t border-blue-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick:</span>
              {[5, 10, 20, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAmount(preset.toFixed(3));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 active:scale-95 text-blue-700 text-xs font-bold border border-blue-200/90 shadow-2xs transition"
                >
                  +{preset} OMR
                </button>
              ))}
            </div>

            {/* Live Balance Impact */}
            <div className="mt-2 pt-2 border-t border-blue-200/50 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Account Ending Balance Impact:</span>
              <span className={`font-bold ${remainingBal < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {formatOMR(currentBal)} → {formatOMR(remainingBal)}
              </span>
            </div>
          </div>

          {/* Expense Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Expense Date</span>
            </label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Description / Purpose *</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Emergency taxi fares for Metro hub inspection"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Project (from Zoho Books) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>Project (from Zoho Books)</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition truncate"
            >
              <option value="">None / General Operations</option>
              {zohoProjects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_name} {p.project_code ? `(${p.project_code})` : ''}
                </option>
              ))}
            </select>
          </div>


          {/* Paid Through Account Card */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200/90 text-xs flex items-center justify-between">
            <span className="text-slate-500 font-semibold flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>Paid Through Account:</span>
            </span>
            <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 truncate max-w-[220px]">
              {currentEmployee?.petty_cash_account_name || `Petty Cash - ${currentEmployee?.name}`}
            </span>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Syncing with Zoho Books...</span>
                </div>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{editExpense ? 'Update Expense & Sync' : 'Confirm Expense & Push to Zoho'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

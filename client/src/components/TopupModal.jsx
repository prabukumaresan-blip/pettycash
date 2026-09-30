import React, { useState } from 'react';
import { X, ArrowUpRight, DollarSign, CreditCard, FileText } from 'lucide-react';
import { formatOMR } from '../utils/currency';

export default function TopupModal({
  isOpen,
  onClose,
  employee,
  onTopupSuccess
}) {
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid top-up amount');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onTopupSuccess(employee.id, parsed, notes, paymentMode);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to top up float');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Replenish Petty Cash Float</h3>
              <p className="text-xs text-slate-500">{employee.name} ({employee.employee_code})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* Current balance display */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Current Available Float:</span>
            <span className="text-sm font-black text-slate-900">
              {formatOMR(employee.current_balance)}
            </span>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Top-Up Amount (OMR) *
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-black text-slate-400">OMR</span>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.000"
                className="w-full pl-14 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-lg"
                autoFocus
              />
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>Payment Mode</span>
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            >
              <option value="Bank Transfer">Company Bank Transfer</option>
              <option value="Cash Withdrawal">Direct Cash Withdrawal</option>
              <option value="Corporate Card Reimbursement">Corporate Card Reimbursement</option>
              <option value="Check">Check Payout</option>
            </select>
          </div>

          {/* Audit Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Audit Note / Reason</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monthly replenishment of field engineering float"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Processing Top-up...' : `Confirm Top-Up (OMR ${amount || '0.000'})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

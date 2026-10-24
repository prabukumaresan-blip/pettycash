import React, { useState } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, DollarSign, CreditCard, FileText, CheckCircle2 } from 'lucide-react';
import { formatOMR, getSettlementStatus } from '../utils/currency';

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Replenish Petty Cash Float</h3>
              <p className="text-xs text-slate-500">{employee.name} ({employee.employee_code})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* Current balance display & settlement position */}
          {(() => {
            const currentBal = parseFloat(employee.current_balance || 0);
            const settlement = getSettlementStatus(currentBal, employee.name || 'He');
            const topupAmt = parseFloat(amount || 0);
            const newBal = currentBal + (isNaN(topupAmt) ? 0 : topupAmt);
            const newSettlement = getSettlementStatus(newBal, employee.name || 'He');

            return (
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium block">Current Balance:</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {settlement.formattedAmount} {settlement.accountingSideShort}
                    </span>
                  </div>
                  <div className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    settlement.isEmployeeOwing
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                      : settlement.isCompanyOwing
                      ? 'bg-amber-100 text-amber-900 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {settlement.accountingSide}: {settlement.formattedAmount}
                  </div>
                </div>

                {topupAmt > 0 && (
                  <div className={`p-2 rounded-lg text-xs font-semibold flex items-center justify-between border ${
                    newSettlement.isEmployeeOwing
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : newSettlement.isCompanyOwing
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <span className="text-[11px]">After Top-up: {newSettlement.accountingLabel}</span>
                    <span className="font-mono font-bold">{newSettlement.formattedAmount} {newSettlement.accountingSideShort}</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Top-Up Amount (OMR) *
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-bold text-slate-400 font-mono">OMR</span>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.000"
                className="w-full pl-14 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition text-base"
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
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition"
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
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-900 text-white font-semibold text-xs border border-slate-800 shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Recording Float...' : `Confirm Float Top-Up (${amount ? `OMR ${amount}` : 'OMR 0.000'})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

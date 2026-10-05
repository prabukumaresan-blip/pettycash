// Currency formatting utility for Omani Rial (OMR)
// 1 OMR = 1,000 Baisa (3 decimal places standard)

export const CURRENCY_CODE = 'OMR';
export const CURRENCY_SYMBOL = 'OMR';
export const CURRENCY_DECIMALS = 3;

export function formatOMR(amount, showCode = true, allowNegative = false) {
  const val = parseFloat(amount || 0);
  const targetVal = allowNegative ? val : Math.abs(val);
  const formatted = targetVal.toLocaleString('en-US', {
    minimumFractionDigits: CURRENCY_DECIMALS,
    maximumFractionDigits: CURRENCY_DECIMALS
  });
  const prefix = (allowNegative && val < 0) ? '-' : '';
  return showCode ? `OMR ${prefix}${formatted}` : `${prefix}${formatted}`;
}

/**
 * Returns the settlement direction and formatted labels based on the petty cash balance:
 * - balance > 0 (Debit / Dr): Employee holds unspent company cash -> Employee has to pay to Company
 * - balance < 0 (Credit / Cr): Employee spent out-of-pocket personal funds -> Company needs to pay to Employee
 * - balance == 0: Balanced -> Fully settled
 */
export function getSettlementStatus(balance, subject = 'He') {
  const bal = parseFloat(balance || 0);
  const absAmount = Math.abs(bal);
  const formattedAmount = formatOMR(absAmount);

  const targetSubject = (subject === 'You' || subject === 'He') ? (subject === 'You' ? 'You' : 'Him') : subject;
  const targetSubjectLower = (subject === 'You' || subject === 'He') ? (subject === 'You' ? 'you' : 'him') : subject;
  const targetSubjectNominative = subject === 'You' ? 'You' : subject;

  if (bal > 0.0005) {
    return {
      status: 'he_owes_company',
      amount: absAmount,
      formattedAmount,
      accountingSide: 'Debit (Dr)',
      accountingSideShort: 'Dr',
      label: `${targetSubjectNominative} ${subject === 'You' ? 'have' : 'has'} to pay to Company`,
      accountingLabel: `Debit (Dr) — ${targetSubjectNominative} ${subject === 'You' ? 'have' : 'has'} to pay to Company`,
      shortLabel: `${targetSubjectNominative} ${subject === 'You' ? 'owe' : 'owes'} Company`,
      badgeText: 'Debit (Dr) • Cash in Hand',
      explanation: `Debit balance: ${targetSubjectNominative} ${subject === 'You' ? 'hold' : 'holds'} ${formattedAmount} of company cash to return or submit expense bills for.`,
      isEmployeeOwing: true,
      isCompanyOwing: false,
      isSettled: false,
      color: 'emerald'
    };
  }

  if (bal < -0.0005) {
    return {
      status: 'company_owes_him',
      amount: absAmount,
      formattedAmount,
      accountingSide: 'Credit (Cr)',
      accountingSideShort: 'Cr',
      label: `Company needs to pay to ${targetSubject}`,
      accountingLabel: `Credit (Cr) — Company needs to pay to ${targetSubject}`,
      shortLabel: `Company owes ${targetSubject}`,
      badgeText: 'Credit (Cr) • Reimbursement Due',
      explanation: `Credit balance: Out-of-pocket expenses exceed cash float. Company needs to pay ${formattedAmount} to ${targetSubjectLower}.`,
      isEmployeeOwing: false,
      isCompanyOwing: true,
      isSettled: false,
      color: 'amber'
    };
  }

  return {
    status: 'settled',
    amount: 0,
    formattedAmount: formatOMR(0),
    accountingSide: 'Nil / Settled',
    accountingSideShort: 'Nil',
    label: 'Account Fully Settled',
    accountingLabel: 'Settled — No balance due',
    shortLabel: 'Fully Settled',
    badgeText: 'Balanced (0.000 OMR)',
    explanation: 'All cash advances and logged expenses are balanced. No payment due from either party.',
    isEmployeeOwing: false,
    isCompanyOwing: false,
    isSettled: true,
    color: 'slate'
  };
}


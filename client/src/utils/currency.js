// Currency formatting utility for Omani Rial (OMR)
// 1 OMR = 1,000 Baisa (3 decimal places standard)

export const CURRENCY_CODE = 'OMR';
export const CURRENCY_SYMBOL = 'OMR';
export const CURRENCY_DECIMALS = 3;

export function formatOMR(amount, showCode = true) {
  const val = parseFloat(amount || 0);
  const formatted = val.toLocaleString('en-US', {
    minimumFractionDigits: CURRENCY_DECIMALS,
    maximumFractionDigits: CURRENCY_DECIMALS
  });
  return showCode ? `OMR ${formatted}` : formatted;
}

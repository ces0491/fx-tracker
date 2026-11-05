const MINUS = '−';

/**
 * Decimal places that show five significant figures for a rate of this size:
 * 9.2404, 0.56323, 158.31, 1,513.4, 18,069. Pass a reference value (such as a
 * pair's latest rate) so every figure for that pair uses the same precision.
 */
export function rateDecimals(reference) {
  const magnitude = Math.abs(reference);
  if (!Number.isFinite(magnitude) || magnitude === 0) return 4;
  return Math.min(8, Math.max(0, 4 - Math.floor(Math.log10(magnitude))));
}

export function formatRate(value, decimals = rateDecimals(value)) {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Signed percentage with a true minus sign, e.g. "+0.45%" or "−1.20%". */
export function formatPct(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value).toFixed(digits);
  if (Number(abs) === 0) return `${abs}%`;
  return `${value > 0 ? '+' : MINUS}${abs}%`;
}

/** Signed number with a true minus sign. */
export function formatSigned(value, decimals) {
  if (!Number.isFinite(value)) return '—';
  const abs = formatRate(Math.abs(value), decimals);
  if (Number(Math.abs(value).toFixed(decimals)) === 0) return abs;
  return `${value > 0 ? '+' : MINUS}${abs}`;
}

/**
 * Format a calendar date (YYYY-MM-DD). Dates are parsed and printed in UTC so
 * they don't shift by a day for viewers west of Greenwich.
 */
export function formatIsoDate(dateStr, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' });
}

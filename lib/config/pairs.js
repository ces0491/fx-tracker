/** Pair selected on first load. */
export const DEFAULT_PAIR = 'NZD/ZAR';

/** Pairs listed under "Popular pairs" and served by /api/latest. */
export const POPULAR_PAIRS = [
  'NZD/ZAR', 'NZD/USD', 'USD/ZAR', 'EUR/ZAR', 'GBP/ZAR', 'AUD/NZD',
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP',
  'USD/KES', 'EUR/KES', 'GBP/KES', 'KES/ZAR', 'USD/NGN', 'EUR/NGN',
];

/**
 * Read a pair from a URL parameter such as "NZD-ZAR" or "nzd/zar".
 * Returns "BASE/QUOTE", or null when the value isn't two different
 * three-letter codes. Whether the codes exist is checked by the API.
 */
export function pairFromParam(value) {
  if (typeof value !== 'string') return null;
  const match = /^([A-Za-z]{3})[-/]([A-Za-z]{3})$/.exec(value.trim());
  if (!match) return null;
  const base = match[1].toUpperCase();
  const quote = match[2].toUpperCase();
  return base === quote ? null : `${base}/${quote}`;
}

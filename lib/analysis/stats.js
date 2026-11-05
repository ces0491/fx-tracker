import { observationsPerYear } from '../utils/mathUtils.js';

export const STAT_WINDOWS = {
  CHANGE: 14,
  VOLATILITY: 30,
  RANGE: 30,
};

/**
 * Annualised volatility: root mean square of daily log returns, scaled by the
 * series' own observations per year.
 */
function annualisedVolatility(closes, perYear) {
  if (closes.length < 2 || !Number.isFinite(perYear)) return null;
  let sumSquares = 0;
  for (let i = 1; i < closes.length; i++) {
    sumSquares += Math.log(closes[i] / closes[i - 1]) ** 2;
  }
  return Math.sqrt((sumSquares / (closes.length - 1)) * perYear);
}

/**
 * Summary figures for a pair from its daily series (with indicators applied).
 * Windows count observations, which are calendar days for Frankfurter's
 * blended series.
 */
export function pairStats(series) {
  const n = series.length;
  if (n < 2) return null;

  const closes = series.map((p) => p.close);
  const perYear = observationsPerYear(series.map((p) => p.date));
  const latest = series[n - 1];
  const previous = series[n - 2];
  const changeFrom = series[n - 1 - STAT_WINDOWS.CHANGE];
  const rangeCloses = closes.slice(-STAT_WINDOWS.RANGE);

  return {
    latest,
    previous,
    dayChange: latest.close - previous.close,
    dayChangePct: (latest.close / previous.close - 1) * 100,
    periodChangePct: changeFrom ? (latest.close / changeFrom.close - 1) * 100 : null,
    periodChangeFrom: changeFrom?.date ?? null,
    volatility30: annualisedVolatility(closes.slice(-STAT_WINDOWS.VOLATILITY), perYear),
    volatilityYear: annualisedVolatility(closes, perYear),
    low30: Math.min(...rangeCloses),
    high30: Math.max(...rangeCloses),
    rsi: latest.rsi ?? null,
  };
}

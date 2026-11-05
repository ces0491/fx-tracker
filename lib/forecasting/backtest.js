/**
 * Rolling-origin back-test. At each origin the model is refitted on the
 * preceding `window` observations and asked for an h-step forecast, which is
 * then compared with the rate that followed. A no-change forecast (the rate
 * at the origin) is scored the same way as the baseline.
 */
import { runModel } from './models.js';

export const BACKTEST = {
  WINDOW: 365,
  ORIGINS: 52,
  STEP: 7,
  MIN_ORIGINS: 12,
};

/**
 * Returns null when there is too little history for MIN_ORIGINS origins.
 * Origins are indices into `prices`; errors are absolute percentage errors.
 */
export function backtest(prices, algorithm, horizon, options = {}) {
  const { WINDOW, ORIGINS, STEP, MIN_ORIGINS } = { ...BACKTEST, ...options };
  const results = [];
  for (let origin = prices.length - 1 - horizon; origin >= WINDOW - 1 && results.length < ORIGINS; origin -= STEP) {
    const train = prices.slice(origin - WINDOW + 1, origin + 1);
    const forecast = runModel(algorithm, train, horizon);
    const actual = prices[origin + horizon];
    const predicted = forecast.mean[horizon - 1];
    results.push({
      origin,
      error: Math.abs(predicted - actual) / actual,
      noChangeError: Math.abs(prices[origin] - actual) / actual,
      held: actual >= forecast.lower[horizon - 1] && actual <= forecast.upper[horizon - 1],
    });
  }
  if (results.length < MIN_ORIGINS) return null;

  const average = (key) => (results.reduce((sum, r) => sum + r[key], 0) / results.length) * 100;
  const held = results.filter((r) => r.held).length;
  return {
    forecasts: results.length,
    firstOrigin: results[results.length - 1].origin,
    lastOrigin: results[0].origin,
    meanAbsPctError: average('error'),
    noChangeMeanAbsPctError: average('noChangeError'),
    held,
    coverage: held / results.length,
  };
}

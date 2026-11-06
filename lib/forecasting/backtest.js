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
 * `points` holds each scored forecast, oldest first.
 */
export function backtest(prices, algorithm, horizon, options = {}) {
  const { WINDOW, ORIGINS, STEP, MIN_ORIGINS } = { ...BACKTEST, ...options };
  const results = [];
  for (let origin = prices.length - 1 - horizon; origin >= WINDOW - 1 && results.length < ORIGINS; origin -= STEP) {
    const train = prices.slice(origin - WINDOW + 1, origin + 1);
    const forecast = runModel(algorithm, train, horizon);
    const actual = prices[origin + horizon];
    const predicted = forecast.mean[horizon - 1];
    // A pegged rate gives zero-width ranges that rounding (exp of a log, a regression fit) can miss by about 1e-13;
    // the slack absorbs that and is far below any precision shown.
    const slack = Math.abs(actual) * 1e-9;
    const inside = (level) =>
      actual >= forecast.intervals[level].lower[horizon - 1] - slack &&
      actual <= forecast.intervals[level].upper[horizon - 1] + slack;
    results.push({
      origin,
      predicted,
      actual,
      lower: forecast.lower[horizon - 1],
      upper: forecast.upper[horizon - 1],
      error: Math.abs(predicted - actual) / actual,
      noChangeError: Math.abs(prices[origin] - actual) / actual,
      held: inside(95),
      held50: inside(50),
    });
  }
  if (results.length < MIN_ORIGINS) return null;

  const average = (key) => (results.reduce((sum, r) => sum + r[key], 0) / results.length) * 100;
  const held = results.filter((r) => r.held).length;
  const held50 = results.filter((r) => r.held50).length;
  return {
    forecasts: results.length,
    firstOrigin: results[results.length - 1].origin,
    lastOrigin: results[0].origin,
    meanAbsPctError: average('error'),
    noChangeMeanAbsPctError: average('noChangeError'),
    held,
    coverage: held / results.length,
    held50,
    coverage50: held50 / results.length,
    points: [...results].reverse(),
  };
}

/**
 * Below this many independent forecasts a verdict on calibration or on beating no change rests on too little to
 * call either way, so none is given. With 52 weekly forecasts that cuts in past a horizon of about five weeks.
 */
export const MIN_EFFECTIVE_FORECASTS = 10;

/** Differences in average miss smaller than this many percentage points are floating-point noise. */
const NOISE_FLOOR_POINTS = 1e-9;

/**
 * Forecasts made a week apart for an h-day horizon cover overlapping stretches of rates, so their errors move
 * together. About n × step / h of them are independent (all of them when h is no longer than the step).
 */
export function effectiveForecasts(forecasts, horizon, step = BACKTEST.STEP) {
  return forecasts * Math.min(1, step / horizon);
}

/**
 * Whether the share of rates that landed inside a range is within two standard errors of the range's level
 * (50 or 95), with the standard error taken over the independent forecasts. `withinError` is null when there
 * are too few of those to judge.
 */
export function coverageCheck(held, forecasts, level, independent) {
  const expected = level / 100;
  const share = held / forecasts;
  if (independent < MIN_EFFECTIVE_FORECASTS) return { share, expected, standardError: null, withinError: null };
  const standardError = Math.sqrt((expected * (1 - expected)) / independent);
  return { share, expected, standardError, withinError: Math.abs(share - expected) <= 2 * standardError };
}

/**
 * The model's average miss against the no-change forecast's, over the same forecasts, in percentage points
 * (negative when the model missed by less). A Diebold-Mariano comparison of absolute errors: the standard error
 * uses Newey-West weights over the lags at which neighbouring forecasts overlap, and the verdict is "better" or
 * "worse" only past two standard errors, otherwise "level". The verdict is null when there are too few
 * independent forecasts to judge.
 */
export function compareWithNoChange(points, horizon, step = BACKTEST.STEP) {
  const d = points.map((p) => (p.error - p.noChangeError) * 100);
  const n = d.length;
  const difference = d.reduce((sum, v) => sum + v, 0) / n;
  if (effectiveForecasts(n, horizon, step) < MIN_EFFECTIVE_FORECASTS) {
    return { difference, standardError: null, verdict: null };
  }
  const lags = Math.min(n - 1, Math.max(0, Math.ceil(horizon / step) - 1));
  let variance = d.reduce((sum, v) => sum + (v - difference) ** 2, 0) / n;
  for (let lag = 1; lag <= lags; lag++) {
    let covariance = 0;
    for (let t = lag; t < n; t++) covariance += (d[t] - difference) * (d[t - lag] - difference);
    variance += 2 * (1 - lag / (lags + 1)) * (covariance / n);
  }
  const standardError = Math.sqrt(Math.max(variance, 0) / n);
  // On a pegged rate both forecasts are exact, and rounding leaves differences of about 1e-13 points with an even
  // smaller standard error; anything under the noise floor is no difference at all.
  let verdict = 'level';
  if (Math.abs(difference) > NOISE_FLOOR_POINTS && Math.abs(difference) > 2 * standardError) {
    verdict = difference < 0 ? 'better' : 'worse';
  }
  return { difference, standardError, verdict };
}

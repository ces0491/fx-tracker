// pages/api/forecast.js - Forecast for a pair, with the model's back-tested track record
import { ALGORITHMS, HORIZONS } from '../../lib/config/forecast.js';
import { RATE_SOURCE } from '../../lib/config/source.js';
import {
  RateSourceError,
  assertSupported,
  getDailyRates,
  isoDateDaysAgo,
  parsePair,
} from '../../lib/data/frankfurter.js';
import { BACKTEST, backtest } from '../../lib/forecasting/backtest.js';
import { MIN_OBSERVATIONS, runModel } from '../../lib/forecasting/models.js';
import { addDays, formatISODate } from '../../lib/utils/dateUtils.js';
import { allowGetOnly, sendCached, sendError } from '../../lib/api/responses.js';

// Three years: a year to fit at each back-test origin, a year of weekly
// origins, and room for the longest horizon after the last one.
const HISTORY_DAYS = 3 * 365;
const ALGORITHM_VALUES = ALGORITHMS.map((a) => a.value);

export default async function handler(req, res) {
  if (!allowGetOnly(req, res)) return;

  try {
    const pair = parsePair(req.query.pair);
    if (!pair) {
      throw new RateSourceError('pair must be two different three-letter currency codes, e.g. NZD/ZAR', 400);
    }
    const algorithm = req.query.algorithm;
    if (!ALGORITHM_VALUES.includes(algorithm)) {
      throw new RateSourceError(`algorithm must be one of ${ALGORITHM_VALUES.join(', ')}`, 400);
    }
    const horizon = Number(req.query.horizon);
    if (!HORIZONS.includes(horizon)) {
      throw new RateSourceError(`horizon must be one of ${HORIZONS.join(', ')} days`, 400);
    }

    const { base, quote } = pair;
    await assertSupported([base, quote]);
    const series = (await getDailyRates(base, [quote], isoDateDaysAgo(HISTORY_DAYS))).get(quote);
    if (series.length < MIN_OBSERVATIONS) {
      throw new RateSourceError(
        `Only ${series.length} daily rates are available for ${base}/${quote}; at least ${MIN_OBSERVATIONS} are needed`,
        422
      );
    }

    const prices = series.map((p) => p.close);
    const dates = series.map((p) => p.date);
    const lastDate = dates[dates.length - 1];
    const fitted = prices.slice(-BACKTEST.WINDOW);
    const result = runModel(algorithm, fitted, horizon);
    const record = backtest(prices, algorithm, horizon);

    sendCached(res, {
      pair: `${base}/${quote}`,
      algorithm,
      horizon,
      asOf: lastDate,
      fittedObservations: fitted.length,
      forecast: result.mean.map((rate, i) => ({
        date: formatISODate(addDays(new Date(lastDate), i + 1)),
        rate,
        lower: result.lower[i],
        upper: result.upper[i],
        lower80: result.intervals[80].lower[i],
        upper80: result.intervals[80].upper[i],
        lower50: result.intervals[50].lower[i],
        upper50: result.intervals[50].upper[i],
      })),
      backtest: record && {
        forecasts: record.forecasts,
        firstOrigin: dates[record.firstOrigin],
        lastOrigin: dates[record.lastOrigin],
        stepDays: BACKTEST.STEP,
        windowObservations: BACKTEST.WINDOW,
        meanAbsPctError: record.meanAbsPctError,
        noChangeMeanAbsPctError: record.noChangeMeanAbsPctError,
        held: record.held,
        coverage: record.coverage,
        held50: record.held50,
        coverage50: record.coverage50,
      },
      source: RATE_SOURCE,
    });
  } catch (error) {
    sendError(res, error);
  }
}

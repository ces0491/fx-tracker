// pages/api/forecast.js - Forecast for a pair, with the model's back-tested track record
import { loadForecastHistory } from '../../lib/api/forecastHistory.js';
import { allowGetOnly, sendCached, sendError } from '../../lib/api/responses.js';
import { ALGORITHMS, HORIZONS } from '../../lib/config/forecast.js';
import { RATE_SOURCE } from '../../lib/config/source.js';
import { RateSourceError } from '../../lib/data/frankfurter.js';
import { BACKTEST, backtest } from '../../lib/forecasting/backtest.js';
import { forecastEnvelope, runModel } from '../../lib/forecasting/models.js';
import { addDays, formatISODate } from '../../lib/utils/dateUtils.js';

const ALGORITHM_VALUES = ALGORITHMS.map((a) => a.value);

export default async function handler(req, res) {
  if (!allowGetOnly(req, res)) return;

  try {
    const algorithm = req.query.algorithm;
    if (!ALGORITHM_VALUES.includes(algorithm)) {
      throw new RateSourceError(`algorithm must be one of ${ALGORITHM_VALUES.join(', ')}`, 400);
    }
    const horizon = Number(req.query.horizon);
    if (!HORIZONS.includes(horizon)) {
      throw new RateSourceError(`horizon must be one of ${HORIZONS.join(', ')} days`, 400);
    }

    const { base, quote, prices, dates } = await loadForecastHistory(req.query.pair);
    const lastDate = dates[dates.length - 1];
    const fitted = prices.slice(-BACKTEST.WINDOW);
    const result = runModel(algorithm, fitted, horizon);
    const record = backtest(prices, algorithm, horizon);
    // The other models only feed the envelope, so one that fails is logged and left out, and the forecast that was
    // asked for still returns.
    const others = ALGORITHM_VALUES.filter((a) => a !== algorithm).flatMap((other) => {
      try {
        return [runModel(other, fitted, horizon)];
      } catch (error) {
        console.error(`Forecast envelope: ${other} failed for ${base}/${quote} at ${horizon} days`, error);
        return [];
      }
    });

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
      // The models' 50% ranges at this horizon: the same whichever algorithm was asked for, so the chart's
      // y-axis, which is scaled to it, holds still when the model changes.
      envelope: forecastEnvelope([result, ...others]),
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

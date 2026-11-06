// pages/api/performance.js - The models' back-tested forecasts for a pair, set against the no-change forecast
import { loadForecastHistory } from '../../lib/api/forecastHistory.js';
import { allowGetOnly, sendCached, sendError } from '../../lib/api/responses.js';
import { ALGORITHMS, DEFAULT_HORIZON, HORIZONS } from '../../lib/config/forecast.js';
import { RATE_SOURCE } from '../../lib/config/source.js';
import { RateSourceError } from '../../lib/data/frankfurter.js';
import {
  BACKTEST,
  backtest,
  compareWithNoChange,
  coverageCheck,
  effectiveForecasts,
} from '../../lib/forecasting/backtest.js';

const ALGORITHM_VALUES = ALGORITHMS.map((a) => a.value);

// A model whose back-test fails is logged and reported as unavailable, and the comparison goes ahead without it.
function tryBacktest(prices, algorithm, horizon, pair) {
  try {
    return backtest(prices, algorithm, horizon);
  } catch (error) {
    console.error(`Performance: ${algorithm} back-test failed for ${pair} at ${horizon} days`, error);
    return null;
  }
}

export default async function handler(req, res) {
  if (!allowGetOnly(req, res)) return;

  try {
    const horizon = req.query.horizon === undefined ? DEFAULT_HORIZON : Number(req.query.horizon);
    if (!HORIZONS.includes(horizon)) {
      throw new RateSourceError(`horizon must be one of ${HORIZONS.join(', ')} days`, 400);
    }

    const { base, quote, prices, dates } = await loadForecastHistory(req.query.pair);
    const pair = `${base}/${quote}`;

    // Six models at five horizons: 30 back-tests of up to 52 refits each, about 0.12 s on three years of NZD/ZAR
    // rates when measured locally.
    const tests = new Map(
      HORIZONS.map((h) => [h, Object.fromEntries(ALGORITHM_VALUES.map((a) => [a, tryBacktest(prices, a, h, pair)]))])
    );

    const byHorizon = HORIZONS.map((h) => {
      const records = tests.get(h);
      return {
        horizon: h,
        noChangeMeanAbsPctError: Object.values(records).find(Boolean)?.noChangeMeanAbsPctError ?? null,
        models: Object.fromEntries(ALGORITHM_VALUES.map((a) => [a, records[a]?.meanAbsPctError ?? null])),
      };
    });

    // The models are scored on the same weekly origins, so the dates and outcomes are listed once and each
    // model's points line up with them by position.
    const records = tests.get(horizon);
    const reference = Object.values(records).find(Boolean);
    let detail = null;
    if (reference) {
      const independent = effectiveForecasts(reference.forecasts, horizon);
      detail = {
        stepDays: BACKTEST.STEP,
        windowObservations: BACKTEST.WINDOW,
        forecasts: reference.forecasts,
        independentForecasts: independent,
        noChangeMeanAbsPctError: reference.noChangeMeanAbsPctError,
        scored: reference.points.map((p) => ({
          madeOn: dates[p.origin],
          forDate: dates[p.origin + horizon],
          actual: p.actual,
          noChangeMissPct: p.noChangeError * 100,
        })),
        models: ALGORITHM_VALUES.map((algorithm) => {
          const r = records[algorithm];
          if (!r) return { algorithm, available: false };
          return {
            algorithm,
            available: true,
            meanAbsPctError: r.meanAbsPctError,
            vsNoChange: compareWithNoChange(r.points, horizon),
            held: r.held,
            held50: r.held50,
            inside95: coverageCheck(r.held, r.forecasts, 95, independent),
            inside50: coverageCheck(r.held50, r.forecasts, 50, independent),
            points: r.points.map((p) => ({
              forecast: p.predicted,
              lower: p.lower,
              upper: p.upper,
              missPct: p.error * 100,
              held: p.held,
            })),
          };
        }),
      };
    }

    sendCached(res, {
      pair,
      horizon,
      asOf: dates[dates.length - 1],
      byHorizon,
      backtest: detail,
      source: RATE_SOURCE,
    });
  } catch (error) {
    sendError(res, error);
  }
}

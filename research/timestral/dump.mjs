// Step 1 of docs/findings.md's Timestral comparison: each popular pair's three years of rates, read through the
// app's own loader, and the six models' back-tests run with the app's own code.
// Usage, from the repository root: node research/timestral/dump.mjs [out.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { loadForecastHistory } from '../../lib/api/forecastHistory.js';
import { ALGORITHMS, HORIZONS } from '../../lib/config/forecast.js';
import { POPULAR_PAIRS } from '../../lib/config/pairs.js';
import { BACKTEST, backtest, compareWithNoChange, coverageCheck, effectiveForecasts } from '../../lib/forecasting/backtest.js';

const out = process.argv[2] ?? path.join('research', 'timestral', 'out', 'dump.json');

// The loader's 10 s timeout trips on a slow response now and then; a pair is retried before it's left out.
const ATTEMPTS = 6;

async function history(pair) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await loadForecastHistory(pair);
    } catch (error) {
      if (attempt >= ATTEMPTS || error?.status !== 502) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
}

const pairs = {};
for (const pair of POPULAR_PAIRS) {
  try {
    const { prices, dates } = await history(pair);
    const byHorizon = {};
    for (const h of HORIZONS) {
      const models = {};
      for (const { value } of ALGORITHMS) {
        const r = backtest(prices, value, h);
        if (!r) continue;
        const independent = effectiveForecasts(r.forecasts, h);
        models[value] = {
          forecasts: r.forecasts,
          meanAbsPctError: r.meanAbsPctError,
          noChangeMeanAbsPctError: r.noChangeMeanAbsPctError,
          vsNoChange: compareWithNoChange(r.points, h),
          inside95: coverageCheck(r.held, r.forecasts, 95, independent),
          inside50: coverageCheck(r.held50, r.forecasts, 50, independent),
          origins: r.points.map((p) => p.origin),
        };
      }
      byHorizon[h] = models;
    }
    pairs[pair] = { prices, dates, byHorizon };
    console.log(`${pair}: ${prices.length} rates, ${dates[0]} to ${dates.at(-1)}`);
  } catch (error) {
    pairs[pair] = { error: String(error?.message ?? error) };
    console.log(`${pair}: left out, ${pairs[pair].error}`);
  }
}

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ backtest: BACKTEST, horizons: HORIZONS, pairs }));
console.log(`-> ${out}`);

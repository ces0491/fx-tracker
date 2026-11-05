import { describe, expect, it } from 'vitest';
import reference from './reference/expected.json';
import nzdZar from './fixtures/NZD-ZAR.json';
import eurUsd from './fixtures/EUR-USD.json';
import usdJpy from './fixtures/USD-JPY.json';
import {
  MIN_OBSERVATIONS,
  MODELS,
  arimaLiteForecast,
  ensembleForecast,
  exponentialSmoothingForecast,
  fitDifferenceAR,
  fitLocalLinearTrend,
  kalmanForecast,
  linearRegressionForecast,
  runModel,
  trendForecast,
} from '@/lib/forecasting/models';
import { Z_975, logReturns, sampleVariance, tQuantile975 } from '@/lib/forecasting/stats';
import { observationsPerYear } from '@/lib/utils/mathUtils';

const lastYear = (fixture) => fixture.series.slice(-365);
const closes = (series) => series.map((p) => p.close);
const nzdZarYear = closes(lastYear(nzdZar));
const HORIZON = 30;
const at = (values) => reference.steps.map((step) => values[step - 1]);

function expectClose(actual, expected, tolerance) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, i) => expect(Math.abs(value - expected[i])).toBeLessThanOrEqual(tolerance));
}

describe('statistical helpers', () => {
  it('matches R qnorm(0.975)', () => {
    expect(Math.abs(Z_975 - reference.qnorm975)).toBeLessThan(1e-14);
  });

  it('matches R qt(0.975, df) to within 1e-7', () => {
    reference.t975.df.forEach((df, i) => {
      expect(Math.abs(tQuantile975(df) - reference.t975.value[i])).toBeLessThan(1e-7);
    });
  });
});

describe('linear regression', () => {
  it("matches R's predict(lm(y ~ x), interval = 'prediction')", () => {
    const forecast = linearRegressionForecast(nzdZarYear, HORIZON);
    expectClose(at(forecast.mean), reference.linear_regression.mean, 1e-10);
    expectClose(at(forecast.lower), reference.linear_regression.lower, 1e-8);
    expectClose(at(forecast.upper), reference.linear_regression.upper, 1e-8);
  });
});

describe('exponential smoothing', () => {
  it("matches R's HoltWinters(alpha = 0.3, beta = 0.1) forecasts and prediction intervals", () => {
    const forecast = exponentialSmoothingForecast(nzdZarYear, HORIZON);
    expectClose(at(forecast.mean), reference.holt.mean, 1e-10);
    expectClose(at(forecast.lower), reference.holt.lower, 1e-10);
    expectClose(at(forecast.upper), reference.holt.upper, 1e-10);
  });
});

describe('ARIMA-lite', () => {
  it('fits the same AR(3) coefficients as R lm() on lagged differences', () => {
    expectClose(fitDifferenceAR(nzdZarYear).phi, reference.arima.phi, 1e-12);
  });

  it("matches R's arima(order = c(3, 1, 0)) forecasts and standard-error growth", () => {
    const forecast = arimaLiteForecast(nzdZarYear, HORIZON);
    expectClose(at(forecast.mean), reference.arima.mean, 1e-10);
    const sd = (i) => (forecast.upper[i] - forecast.mean[i]) / Z_975;
    expectClose(
      reference.steps.map((step) => sd(step - 1) / sd(0)),
      reference.arima.se_ratio,
      1e-10
    );
  });
});

describe('Kalman filter', () => {
  it.each([
    ['NZD/ZAR', nzdZar],
    ['EUR/USD', eurUsd],
    ['USD/JPY', usdJpy],
  ])('reports volatility within a factor of 2 of realised 1-year volatility for %s', (_, fixture) => {
    const series = lastYear(fixture);
    const prices = closes(series);
    const perYear = observationsPerYear(series.map((p) => p.date));
    const filterVolatility = fitLocalLinearTrend(prices).oneStepSd * Math.sqrt(perYear);
    const realised = Math.sqrt(sampleVariance(logReturns(prices)) * perYear);
    const ratio = filterVolatility / realised;
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2);
  });

  it('gives a widening interval around the median forecast', () => {
    const forecast = kalmanForecast(nzdZarYear, 90);
    for (let i = 0; i < 90; i++) {
      expect(forecast.lower[i]).toBeLessThan(forecast.mean[i]);
      expect(forecast.upper[i]).toBeGreaterThan(forecast.mean[i]);
      if (i > 0) expect(forecast.upper[i] - forecast.lower[i]).toBeGreaterThan(forecast.upper[i - 1] - forecast.lower[i - 1]);
    }
  });
});

describe('trend', () => {
  it('uses a random-walk interval that grows with the square root of the horizon', () => {
    const forecast = trendForecast(nzdZarYear, HORIZON);
    const half = (i) => forecast.upper[i] - forecast.mean[i];
    expect(half(3) / half(0)).toBeCloseTo(2, 10);
  });
});

describe('ensemble', () => {
  it('is the equal-weight average of trend, linear regression and exponential smoothing', () => {
    const members = [trendForecast, linearRegressionForecast, exponentialSmoothingForecast].map((f) => f(nzdZarYear, HORIZON));
    const forecast = ensembleForecast(nzdZarYear, HORIZON);
    forecast.mean.forEach((value, i) => {
      const average = members.reduce((sum, m) => sum + m.mean[i], 0) / members.length;
      expect(value).toBeCloseTo(average, 12);
    });
  });
});

describe('every model', () => {
  it.each(Object.keys(MODELS))('%s is deterministic and well-formed', (algorithm) => {
    const first = runModel(algorithm, nzdZarYear, HORIZON);
    const second = runModel(algorithm, nzdZarYear, HORIZON);
    expect(second).toEqual(first);
    for (const key of ['mean', 'lower', 'upper']) {
      expect(first[key]).toHaveLength(HORIZON);
      expect(first[key].every(Number.isFinite)).toBe(true);
    }
    first.mean.forEach((m, i) => {
      expect(first.lower[i]).toBeLessThanOrEqual(m);
      expect(first.upper[i]).toBeGreaterThanOrEqual(m);
    });
  });

  it('rejects too little data and unknown algorithms', () => {
    expect(() => runModel('trend', nzdZarYear.slice(0, MIN_OBSERVATIONS - 1), 7)).toThrow(RangeError);
    expect(() => runModel('crystal_ball', nzdZarYear, 7)).toThrow(RangeError);
  });
});

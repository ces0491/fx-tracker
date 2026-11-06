import { describe, expect, it } from 'vitest';
import nzdZar from './fixtures/NZD-ZAR.json';
import { BACKTEST, backtest } from '@/lib/forecasting/backtest';

const prices = nzdZar.series.map((p) => p.close);

describe('backtest', () => {
  it('scores the last 52 weekly origins, ending a horizon before the latest rate', () => {
    const horizon = 30;
    const result = backtest(prices, 'exponential_smoothing', horizon);
    expect(result.forecasts).toBe(BACKTEST.ORIGINS);
    expect(result.lastOrigin).toBe(prices.length - 1 - horizon);
    expect(result.lastOrigin - result.firstOrigin).toBe((BACKTEST.ORIGINS - 1) * BACKTEST.STEP);
    expect(result.coverage).toBeCloseTo(result.held / result.forecasts, 12);
    expect(result.held50).toBeLessThanOrEqual(result.held);
  });

  it('scores the no-change baseline from the rate at each origin', () => {
    const horizon = 7;
    const result = backtest(prices, 'trend', horizon);
    let total = 0;
    for (let k = 0; k < result.forecasts; k++) {
      const origin = result.lastOrigin - k * BACKTEST.STEP;
      total += Math.abs(prices[origin] - prices[origin + horizon]) / prices[origin + horizon];
    }
    expect(result.noChangeMeanAbsPctError).toBeCloseTo((total / result.forecasts) * 100, 10);
  });

  it.each(['ensemble', 'trend', 'linear_regression', 'exponential_smoothing', 'arima_lite', 'kalman'])(
    'counts a pegged rate inside %s’s zero-width ranges',
    (algorithm) => {
      const peg = new Array(prices.length).fill(655.957);
      const result = backtest(peg, algorithm, 30);
      expect(result.meanAbsPctError).toBeLessThan(1e-9);
      expect(result.noChangeMeanAbsPctError).toBe(0);
      expect(result.held).toBe(result.forecasts);
      expect(result.held50).toBe(result.forecasts);
    }
  );

  it('is deterministic', () => {
    expect(backtest(prices, 'kalman', 14)).toEqual(backtest(prices, 'kalman', 14));
  });

  it('returns null when there is too little history', () => {
    expect(backtest(prices.slice(-400), 'trend', 30)).toBeNull();
  });
});

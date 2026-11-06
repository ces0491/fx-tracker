import { describe, expect, it } from 'vitest';
import nzdZar from './fixtures/NZD-ZAR.json';
import {
  BACKTEST,
  MIN_EFFECTIVE_FORECASTS,
  backtest,
  compareWithNoChange,
  coverageCheck,
  effectiveForecasts,
} from '@/lib/forecasting/backtest';

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

  it('lists each scored forecast oldest first, with its error against the rate that followed', () => {
    const horizon = 14;
    const result = backtest(prices, 'linear_regression', horizon);
    expect(result.points).toHaveLength(result.forecasts);
    expect(result.points[0].origin).toBe(result.firstOrigin);
    expect(result.points[result.points.length - 1].origin).toBe(result.lastOrigin);
    for (const p of result.points) {
      expect(p.actual).toBe(prices[p.origin + horizon]);
      expect(p.error).toBeCloseTo(Math.abs(p.predicted - p.actual) / p.actual, 15);
      expect(p.lower).toBeLessThanOrEqual(p.upper);
    }
  });
});

describe('judging a back-test', () => {
  const point = (error, noChangeError) => ({ error, noChangeError });

  it('counts overlapping weekly forecasts as fewer independent ones', () => {
    expect(effectiveForecasts(52, 7)).toBe(52);
    expect(effectiveForecasts(52, 14)).toBe(26);
    expect(effectiveForecasts(52, 90)).toBeCloseTo((52 * 7) / 90, 12);
  });

  it('checks coverage against the range level within two standard errors', () => {
    // 50% range, 52 independent forecasts: standard error sqrt(0.25 / 52) = 0.0693.
    const near = coverageCheck(24, 52, 50, 52);
    expect(near.standardError).toBeCloseTo(Math.sqrt(0.25 / 52), 12);
    expect(near.withinError).toBe(true);
    // 95% range: 46 of 52 is 88.5%, more than two standard errors (2 x 0.0302) under 95%.
    expect(coverageCheck(46, 52, 95, 52).withinError).toBe(false);
    expect(coverageCheck(46, 52, 95, MIN_EFFECTIVE_FORECASTS - 1).withinError).toBeNull();
  });

  it('calls a model level with no change when their misses match', () => {
    const points = Array.from({ length: 52 }, (_, i) => point(0.01 + i / 1e4, 0.01 + i / 1e4));
    expect(compareWithNoChange(points, 7)).toEqual({ difference: 0, standardError: 0, verdict: 'level' });
  });

  it('calls rounding noise on a pegged rate level, not worse', () => {
    const points = Array.from({ length: 52 }, (_, i) => point((i % 3) * 1e-15, 0));
    expect(compareWithNoChange(points, 7).verdict).toBe('level');
    expect(compareWithNoChange(backtest(new Array(prices.length).fill(3.6725), 'kalman', 7).points, 7).verdict).toBe('level');
  });

  it('uses the plain standard error when forecasts do not overlap', () => {
    const d = [0.5, -0.2, 0.1, 0.4, -0.3, 0.2, 0.0, 0.3, -0.1, 0.6, 0.1, -0.4];
    const points = d.map((v) => point(0.02 + v / 100, 0.02));
    const mean = d.reduce((s, v) => s + v, 0) / d.length;
    const variance = d.reduce((s, v) => s + (v - mean) ** 2, 0) / d.length;
    const result = compareWithNoChange(points, 7);
    expect(result.difference).toBeCloseTo(mean, 12);
    expect(result.standardError).toBeCloseTo(Math.sqrt(variance / d.length), 12);
    expect(result.verdict).toBe('level');
  });

  it('names a direction only past two standard errors, and gives none on too few independent forecasts', () => {
    const worse = Array.from({ length: 52 }, (_, i) => point(0.02 + (i % 2 ? 0.003 : 0.002), 0.02));
    expect(compareWithNoChange(worse, 7).verdict).toBe('worse');
    const better = worse.map((p) => point(p.noChangeError, p.error));
    expect(compareWithNoChange(better, 7).verdict).toBe('better');
    expect(compareWithNoChange(worse, 90).verdict).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import nzdZar from './fixtures/NZD-ZAR.json';
import { buildChartRows, niceTicks, rangeStart, valueDomain } from '@/lib/analysis/chart';
import { withIndicators } from '@/lib/analysis/indicators';
import { pairStats } from '@/lib/analysis/stats';
import { pairFromParam } from '@/lib/config/pairs';
import { formatPct, formatRate, rateDecimals } from '@/lib/format';
import { observationsPerYear } from '@/lib/utils/mathUtils';

const year = nzdZar.series.slice(-366);

describe('formatting', () => {
  it('shows five significant figures', () => {
    expect(formatRate(9.24041)).toBe('9.2404');
    expect(formatRate(0.563201)).toBe('0.56320');
    expect(formatRate(1513.394)).toBe('1,513.4');
    expect(formatRate(18069.2)).toBe('18,069');
    expect(rateDecimals(158.31)).toBe(2);
  });

  it('signs percentages with a true minus sign', () => {
    expect(formatPct(0.4512)).toBe('+0.45%');
    expect(formatPct(-0.4512)).toBe('−0.45%');
    expect(formatPct(-0.001)).toBe('0.00%');
  });
});

describe('pair parameter', () => {
  it('accepts either separator and any case', () => {
    expect(pairFromParam('nzd-zar')).toBe('NZD/ZAR');
    expect(pairFromParam('EUR/USD')).toBe('EUR/USD');
  });

  it('rejects malformed and same-currency pairs', () => {
    expect(pairFromParam('NZDZAR')).toBeNull();
    expect(pairFromParam('ZAR-ZAR')).toBeNull();
    expect(pairFromParam(undefined)).toBeNull();
  });
});

describe('chart helpers', () => {
  it('picks round ticks that cover the data', () => {
    const { domain, ticks, decimals } = niceTicks([9.0237, 9.6492]);
    expect(ticks).toEqual([9, 9.2, 9.4, 9.6, 9.8]);
    expect(domain).toEqual([9, 9.8]);
    expect(decimals).toBe(1);
  });

  it('starts ranges on calendar boundaries in UTC', () => {
    expect(rangeStart('2026-11-05', 'YTD')).toBe('2026-01-01');
    expect(rangeStart('2026-11-05', '3M')).toBe('2026-08-05');
    expect(rangeStart('2026-11-05', '1Y')).toBeNull();
  });

  it('joins the forecast to the last observed rate and drops forecast dates already observed', () => {
    const series = withIndicators(year);
    const last = series[series.length - 1];
    const forecast = [
      { date: last.date, rate: 1, lower: 0, upper: 2 },
      { date: '2026-11-06', rate: 9.3, lower: 9.1, upper: 9.5, lower80: 9.15, upper80: 9.45, lower50: 9.25, upper50: 9.35 },
    ];
    const rows = buildChartRows(series, { range: '1M', forecast });
    const joined = rows.find((r) => r.date === last.date);
    expect(joined.forecast).toBe(last.close);
    expect(rows.filter((r) => r.date === last.date)).toHaveLength(1);
    expect(rows[rows.length - 1]).toEqual({
      date: '2026-11-06',
      forecast: 9.3,
      band: [9.1, 9.5],
      band80: [9.15, 9.45],
      band50: [9.25, 9.35],
    });
  });

  it('scales the y-axis to the forecast envelope, not to the model that drew the fan', () => {
    const rows = [
      { date: '2026-11-05', close: 9.2, forecast: 9.2, band: [9.2, 9.2] },
      { date: '2026-11-06', forecast: 9.0, band: [8.0, 10.0] },
    ];
    const envelope = { lower: 8.9, upper: 9.4 };
    const [min, max] = valueDomain(rows, { overlays: [], forecastEnvelope: envelope });
    expect(min).toBeGreaterThan(8.85);
    expect(max).toBeLessThan(9.45);
    // Without an envelope the fan itself sets the domain.
    expect(valueDomain(rows, { overlays: [] })[0]).toBeLessThan(8.0);
  });
});

describe('statistics', () => {
  it('reads a calendar-daily series as about 365 observations a year', () => {
    expect(observationsPerYear(year.map((p) => p.date))).toBeCloseTo(365.25, 0);
  });

  it('computes the day change and the 30-day range from closes', () => {
    const stats = pairStats(withIndicators(year));
    const closes = year.map((p) => p.close);
    expect(stats.dayChange).toBeCloseTo(closes[closes.length - 1] - closes[closes.length - 2], 12);
    expect(stats.high30).toBe(Math.max(...closes.slice(-30)));
    expect(stats.low30).toBe(Math.min(...closes.slice(-30)));
  });
});

import { RANGES } from '../config/chart.js';

/** First date (YYYY-MM-DD) shown for a range, or null to show everything. */
export function rangeStart(lastDate, range) {
  const end = new Date(lastDate);
  if (range === 'YTD') return `${end.getUTCFullYear()}-01-01`;
  const months = RANGES.find((r) => r.value === range)?.months;
  if (!months) return null;
  return new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months, end.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

/**
 * Rows for the chart: the visible part of the series, then the forecast.
 * The last observed row also starts the forecast line and band, so the
 * projection joins the history without a gap.
 */
export function buildChartRows(series, { range, forecast }) {
  const start = rangeStart(series[series.length - 1].date, range);
  const visible = start ? series.filter((p) => p.date >= start) : series;

  const rows = visible.map((p) => ({
    date: p.date,
    close: p.close,
    sma5: p.sma5,
    sma20: p.sma20,
    bb: p.bbLower != null ? [p.bbLower, p.bbUpper] : undefined,
    rsi: p.rsi,
  }));

  if (forecast?.length && rows.length > 0) {
    const last = rows[rows.length - 1];
    last.forecast = last.close;
    last.band = [last.close, last.close];
    for (const point of forecast) {
      rows.push({ date: point.date, forecast: point.rate, band: [point.lower, point.upper] });
    }
  }

  return rows;
}

function decimalsOf(step) {
  for (let d = 0; d <= 10; d++) {
    const scaled = step * 10 ** d;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9) return d;
  }
  return 10;
}

/**
 * Round axis ticks (steps of 1, 2, 2.5 or 5 times a power of ten) covering
 * [min, max]. Returns the widened domain, the ticks and the decimals they need.
 */
export function niceTicks([min, max], count = 5) {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) return { domain: [min, max], ticks: undefined, decimals: undefined };
  const raw = span / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw);
  const decimals = decimalsOf(step);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toFixed(decimals)));
  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks, decimals };
}

/** Y-axis domain covering every value drawn, padded so lines don't touch the edges. */
export function valueDomain(rows, { overlays, extraValues = [] }) {
  const values = [...extraValues];
  for (const row of rows) {
    values.push(row.close, row.forecast);
    if (row.band) values.push(...row.band);
    if (overlays.includes('sma5')) values.push(row.sma5);
    if (overlays.includes('sma20')) values.push(row.sma20);
    if (overlays.includes('bollinger') && row.bb) values.push(...row.bb);
  }
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return ['auto', 'auto'];

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const pad = Math.max((max - min) * 0.02, ((max + min) / 2) * 0.001);
  return [min - pad, max + pad];
}

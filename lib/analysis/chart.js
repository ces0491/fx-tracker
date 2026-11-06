import { RANGES } from '../config/chart.js';

/** First date (YYYY-MM-DD) shown for a range, or null to show everything. */
export function rangeStart(lastDate, range) {
  const end = new Date(lastDate);
  if (range === 'YTD') return `${end.getUTCFullYear()}-01-01`;
  const months = RANGES.find((r) => r.value === range)?.months;
  if (!months) return null;
  // Clamp to the target month's last day: a month back from 31 March is 28 February, where Date.UTC alone
  // overflows to 3 March.
  const year = end.getUTCFullYear();
  const month = end.getUTCMonth() - months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(end.getUTCDate(), lastDay))).toISOString().slice(0, 10);
}

/**
 * Rows for the chart: the visible part of the series, then the forecast with
 * its 95%, 80% and 50% bands. The last observed row also starts the forecast
 * line and fan, so the projection joins the history without a gap.
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

  const last = rows[rows.length - 1];
  const ahead = (forecast ?? []).filter((point) => last && point.date > last.date);
  if (ahead.length > 0) {
    last.forecast = last.close;
    last.band = [last.close, last.close];
    last.band80 = [last.close, last.close];
    last.band50 = [last.close, last.close];
    for (const point of ahead) {
      rows.push({
        date: point.date,
        forecast: point.rate,
        band: [point.lower, point.upper],
        band80: [point.lower80, point.upper80],
        band50: [point.lower50, point.upper50],
      });
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

/**
 * Y-axis domain covering the values drawn, padded so lines don't touch the edges. With `forecastEnvelope` the
 * forecast's own values are left out and the envelope stands in for them, so the domain doesn't depend on which
 * model drew the fan.
 */
export function valueDomain(rows, { overlays, extraValues = [], forecastEnvelope }) {
  const values = [...extraValues];
  if (forecastEnvelope) values.push(forecastEnvelope.lower, forecastEnvelope.upper);
  for (const row of rows) {
    values.push(row.close);
    if (!forecastEnvelope) {
      values.push(row.forecast);
      if (row.band) values.push(...row.band);
    }
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

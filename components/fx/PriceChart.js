'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SeriesKey from '@/components/ui/series-key';
import { formatIsoDate, formatRate } from '@/lib/format';

const SHORT_DATE = { day: 'numeric', month: 'short' };
const AXIS_TICK = { fill: 'var(--muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' };
export const Y_AXIS_WIDTH = 64;

function ChartTooltip({ active, payload, label, decimals, overlays }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const isForecast = row.close == null && row.forecast != null;

  const items = [];
  if (row.close != null) items.push({ key: 'rate', value: formatRate(row.close, decimals), name: 'Daily rate', color: 'var(--series-rate)' });
  if (isForecast) {
    items.push({ key: 'forecast', value: formatRate(row.forecast, decimals), name: 'Forecast', color: 'var(--series-rate)', kind: 'dashed' });
    items.push({
      key: 'band',
      value: `${formatRate(row.band[0], decimals)} to ${formatRate(row.band[1], decimals)}`,
      name: 'Model range',
      color: 'var(--series-rate)',
      kind: 'band',
    });
  }
  if (overlays.includes('sma5') && row.sma5 != null) {
    items.push({ key: 'sma5', value: formatRate(row.sma5, decimals), name: '5-day average', color: 'var(--series-short)' });
  }
  if (overlays.includes('sma20') && row.sma20 != null) {
    items.push({ key: 'sma20', value: formatRate(row.sma20, decimals), name: '20-day average', color: 'var(--series-long)' });
  }
  if (overlays.includes('bollinger') && row.bb) {
    items.push({
      key: 'bb',
      value: `${formatRate(row.bb[0], decimals)} to ${formatRate(row.bb[1], decimals)}`,
      name: 'Bollinger bands',
      color: 'var(--series-long)',
      kind: 'band',
    });
  }

  return (
    <div className="min-w-44 rounded-lg border border-border bg-raised px-3 py-2.5 text-sm shadow-card">
      <p className="flex items-center gap-2 text-xs text-muted">
        {formatIsoDate(label)}
        {isForecast && <span className="rounded bg-tint-strong px-1.5 py-px text-accent">Forecast</span>}
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <SeriesKey color={item.color} kind={item.kind} />
            <span className="font-semibold tabular-nums">{item.value}</span>
            <span className="text-muted">{item.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Daily rate with optional overlays and the forecast. `rows` come from
 * buildChartRows; the forecast region is shaded so projected values never
 * read as observed ones.
 */
export default function PriceChart({ rows, domain, ticks, tickDecimals, decimals, overlays, stats, lastObservedDate, height }) {
  const lastDate = rows[rows.length - 1]?.date;
  const hasForecast = lastDate !== lastObservedDate;
  const showRange = overlays.includes('range') && stats;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} syncId="fx" margin={{ top: 12, right: 0, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => formatIsoDate(d, SHORT_DATE)}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-grid)' }}
            minTickGap={48}
            interval="preserveStartEnd"
          />
          <YAxis
            orientation="right"
            domain={domain}
            allowDataOverflow
            ticks={ticks}
            tickFormatter={(v) => formatRate(v, tickDecimals ?? decimals)}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={Y_AXIS_WIDTH}
          />

          {hasForecast && (
            <ReferenceArea
              x1={lastObservedDate}
              x2={lastDate}
              fill="var(--tint-strong)"
              fillOpacity={1}
              stroke="none"
              ifOverflow="hidden"
              label={{ value: 'Forecast', position: 'insideTopLeft', fill: 'var(--muted)', fontSize: 12, offset: 10 }}
            />
          )}

          {overlays.includes('bollinger') && (
            <Area
              dataKey="bb"
              type="linear"
              fill="var(--series-long)"
              fillOpacity={0.12}
              stroke="none"
              activeDot={false}
              isAnimationActive={false}
            />
          )}
          {hasForecast && (
            <Area
              dataKey="band"
              type="linear"
              fill="var(--series-rate)"
              fillOpacity={0.14}
              stroke="none"
              activeDot={false}
              isAnimationActive={false}
            />
          )}

          {showRange && (
            <>
              <ReferenceLine
                y={stats.high30}
                stroke="var(--muted)"
                strokeOpacity={0.6}
                label={{ value: '30-day high', position: 'insideTopLeft', fill: 'var(--muted)', fontSize: 11 }}
              />
              <ReferenceLine
                y={stats.low30}
                stroke="var(--muted)"
                strokeOpacity={0.6}
                label={{ value: '30-day low', position: 'insideBottomLeft', fill: 'var(--muted)', fontSize: 11 }}
              />
            </>
          )}

          {overlays.includes('sma20') && (
            <Line dataKey="sma20" type="linear" stroke="var(--series-long)" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} />
          )}
          {overlays.includes('sma5') && (
            <Line dataKey="sma5" type="linear" stroke="var(--series-short)" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} />
          )}

          {hasForecast && (
            <Line
              dataKey="forecast"
              type="linear"
              stroke="var(--series-rate)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--surface-raised)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          )}
          <Line
            dataKey="close"
            type="linear"
            stroke="var(--series-rate)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={false}
            activeDot={{ r: 4, stroke: 'var(--surface-raised)', strokeWidth: 2 }}
            isAnimationActive={false}
          />

          <Tooltip
            content={<ChartTooltip decimals={decimals} overlays={overlays} />}
            cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

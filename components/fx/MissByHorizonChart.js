'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import SeriesKey from '@/components/ui/series-key';
import ScrollTable from '@/components/ui/scroll-table';
import TableDisclosure from '@/components/ui/table-disclosure';
import { ALGORITHMS, HORIZONS, algorithmLabel } from '@/lib/config/forecast';

const AXIS_TICK = { fill: 'var(--muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' };
const SELECTED = 'var(--series-forecast)';
const NO_CHANGE = 'var(--series-observed)';
const OTHER = 'var(--border-strong)';
const DOT = { r: 4, strokeWidth: 2, stroke: 'var(--surface-raised)' };
const pct = (v) => (v == null ? '—' : `${v.toFixed(2)}%`);

function HorizonTooltip({ active, payload, label, selected }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const items = [
    { key: 'noChange', name: 'No change', value: row.noChange, color: NO_CHANGE },
    ...ALGORITHMS.map((a) => ({
      key: a.value,
      name: a.label,
      value: row[a.value],
      color: a.value === selected ? SELECTED : OTHER,
    })),
  ]
    .filter((item) => item.value != null)
    .sort((a, b) => a.value - b.value);

  return (
    <div className="min-w-52 rounded-md border border-border bg-raised px-3 py-2.5 text-sm shadow-card">
      <p className="text-xs text-muted">{label} days ahead</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <SeriesKey color={item.color} />
            <span className={`tabular-nums ${item.key === selected || item.key === 'noChange' ? 'font-semibold' : ''}`}>
              {pct(item.value)}
            </span>
            <span className="text-muted">{item.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Average miss at each horizon. The selected model is drawn in the forecast colour against the no-change forecast
 * in ink, with the other five models in grey for context, so one comparison reads at a glance.
 */
export default function MissByHorizonChart({ pair, byHorizon, selected }) {
  const rows = byHorizon.map((h) => ({ horizon: h.horizon, noChange: h.noChangeMeanAbsPctError, ...h.models }));
  const others = ALGORITHMS.filter((a) => a.value !== selected);

  return (
    <figure>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm" aria-label="Chart key">
        <li className="inline-flex items-center gap-2">
          <SeriesKey color={SELECTED} />
          {algorithmLabel(selected)}
        </li>
        <li className="inline-flex items-center gap-2">
          <SeriesKey color={NO_CHANGE} />
          No change
        </li>
        <li className="inline-flex items-center gap-2 text-muted">
          <SeriesKey color={OTHER} />
          Other models
        </li>
      </ul>
      <div className="mt-3 h-64" role="img" aria-label={`${pair}: average miss of each model and of no change at 7 to 90 days ahead. The figures are in the table below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="horizon"
              type="number"
              domain={[0, HORIZONS[HORIZONS.length - 1]]}
              ticks={HORIZONS}
              tickFormatter={(d) => `${d}d`}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-grid)' }}
            />
            <YAxis
              orientation="right"
              domain={[0, 'auto']}
              tickFormatter={(v) => `${v}%`}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            {others.map((a) => (
              <Line
                key={a.value}
                dataKey={a.value}
                type="linear"
                stroke={OTHER}
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
            <Line
              dataKey="noChange"
              type="linear"
              stroke={NO_CHANGE}
              strokeWidth={2}
              dot={{ ...DOT, fill: NO_CHANGE }}
              activeDot={{ ...DOT, fill: NO_CHANGE }}
              isAnimationActive={false}
            />
            <Line
              dataKey={selected}
              type="linear"
              stroke={SELECTED}
              strokeWidth={2}
              dot={{ ...DOT, fill: SELECTED }}
              activeDot={{ ...DOT, fill: SELECTED }}
              connectNulls
              isAnimationActive={false}
            />
            <Tooltip
              content={<HorizonTooltip selected={selected} />}
              cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TableDisclosure>
        <ScrollTable
          caption={`${pair}: average miss by horizon, for no change and each model`}
          columns={['Days ahead', 'No change', ...ALGORITHMS.map((a) => a.label)]}
          rows={rows.map((r) => [r.horizon, pct(r.noChange), ...ALGORITHMS.map((a) => pct(r[a.value]))])}
        />
      </TableDisclosure>
    </figure>
  );
}

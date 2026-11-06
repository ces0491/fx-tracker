'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import SeriesKey from '@/components/ui/series-key';
import ScrollTable from '@/components/ui/scroll-table';
import TableDisclosure from '@/components/ui/table-disclosure';
import { formatIsoDate, formatRate } from '@/lib/format';

const AXIS_TICK = { fill: 'var(--muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' };
const MODEL = 'var(--series-forecast)';
const NO_CHANGE = 'var(--series-observed)';
const SHORT_DATE = { day: 'numeric', month: 'short' };
const pct = (v) => `${v.toFixed(2)}%`;

function MissTooltip({ active, payload, modelName }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="min-w-52 rounded-md border border-border bg-raised px-3 py-2.5 text-sm shadow-card">
      <p className="text-xs text-muted">
        Made {formatIsoDate(row.madeOn)}, for {formatIsoDate(row.forDate)}
      </p>
      <ul className="mt-1.5 space-y-1">
        <li className="flex items-center gap-2">
          <SeriesKey color={MODEL} />
          <span className="font-semibold tabular-nums">{pct(row.model)}</span>
          <span className="text-muted">{modelName}</span>
        </li>
        <li className="flex items-center gap-2">
          <SeriesKey color={NO_CHANGE} />
          <span className="font-semibold tabular-nums">{pct(row.noChange)}</span>
          <span className="text-muted">No change</span>
        </li>
      </ul>
    </div>
  );
}

/** One model's miss on each weekly forecast against the no-change forecast's miss on the same dates. */
export default function MissOverTimeChart({ pair, horizon, scored, points, modelName, decimals }) {
  const rows = scored.map((s, i) => ({
    madeOn: s.madeOn,
    forDate: s.forDate,
    model: points[i].missPct,
    noChange: s.noChangeMissPct,
  }));

  return (
    <figure>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm" aria-label="Chart key">
        <li className="inline-flex items-center gap-2">
          <SeriesKey color={MODEL} />
          {modelName}
        </li>
        <li className="inline-flex items-center gap-2">
          <SeriesKey color={NO_CHANGE} />
          No change
        </li>
      </ul>
      <div className="mt-3 h-64" role="img" aria-label={`${pair}: miss of each ${horizon}-day forecast by ${modelName} and by no change, by the date it was made. The figures are in the table below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="madeOn"
              tickFormatter={(d) => formatIsoDate(d, SHORT_DATE)}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              minTickGap={48}
              interval="preserveStartEnd"
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
            <Line
              dataKey="noChange"
              type="linear"
              stroke={NO_CHANGE}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--surface-raised)', strokeWidth: 2, fill: NO_CHANGE }}
              isAnimationActive={false}
            />
            <Line
              dataKey="model"
              type="linear"
              stroke={MODEL}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--surface-raised)', strokeWidth: 2, fill: MODEL }}
              isAnimationActive={false}
            />
            <Tooltip
              content={<MissTooltip modelName={modelName} />}
              cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TableDisclosure summary="Show every forecast as a table">
        <ScrollTable
          caption={`${pair}: each ${horizon}-day forecast by ${modelName}, oldest first`}
          columns={['Made on', 'For', 'Forecast', 'Actual', 'Miss', 'No change miss', 'Inside 95% range']}
          rows={rows.map((r, i) => [
            formatIsoDate(r.madeOn),
            formatIsoDate(r.forDate),
            formatRate(points[i].forecast, decimals),
            formatRate(scored[i].actual, decimals),
            pct(r.model),
            pct(r.noChange),
            points[i].held ? 'Yes' : 'No',
          ])}
        />
      </TableDisclosure>
    </figure>
  );
}

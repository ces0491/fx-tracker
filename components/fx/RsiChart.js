'use client';

import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Y_AXIS_WIDTH } from './PriceChart';
import { formatIsoDate } from '@/lib/format';

const AXIS_TICK = { fill: 'var(--muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' };

function zone(rsi) {
  if (rsi > 70) return 'Above 70';
  if (rsi < 30) return 'Below 30';
  return 'Between 30 and 70';
}

function RsiTooltip({ active, payload, label }) {
  const rsi = payload?.[0]?.payload?.rsi;
  if (!active || rsi == null) return null;
  return (
    <div className="rounded-md border border-border bg-raised px-3 py-2 text-sm shadow-card">
      <p className="text-xs text-muted">{formatIsoDate(label)}</p>
      <p className="mt-1">
        <span className="font-semibold tabular-nums">{rsi.toFixed(1)}</span>{' '}
        <span className="text-muted">RSI, {zone(rsi).toLowerCase()}</span>
      </p>
    </div>
  );
}

/** 14-day RSI on the same dates as the price chart, so the two line up. */
export default function RsiChart({ rows }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">
        RSI, 14 days <span className="font-normal text-muted">(0 to 100; 70 and 30 marked)</span>
      </p>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} syncId="fx" margin={{ top: 6, right: 0, bottom: 0, left: 4 }}>
            <XAxis dataKey="date" hide />
            <YAxis
              orientation="right"
              domain={[0, 100]}
              ticks={[30, 70]}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={Y_AXIS_WIDTH}
            />
            <ReferenceLine y={70} stroke="var(--chart-grid)" />
            <ReferenceLine y={30} stroke="var(--chart-grid)" />
            <Line
              dataKey="rsi"
              type="linear"
              stroke="var(--series-observed)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--surface-raised)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Tooltip content={<RsiTooltip />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

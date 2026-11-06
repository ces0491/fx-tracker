'use client';

import { useMemo } from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import PriceChart from './PriceChart';
import RsiChart from './RsiChart';
import SeriesKey from '@/components/ui/series-key';
import { niceTicks, valueDomain } from '@/lib/analysis/chart';
import { formatIsoDate, formatRate, rateDecimals } from '@/lib/format';
import { cn } from '@/lib/cn';

// The price chart's least height; beside the forecast panel it grows to match the panel.
const CHART_MIN_HEIGHT = 'clamp(260px, 44vw, 440px)';

function Legend({ items }) {
  // One series needs no key: the heading above names it.
  if (items.length < 2) return <p className="text-sm">{items[0]?.label}</p>;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm" aria-label="Chart key">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-2">
          <SeriesKey color={item.color} kind={item.kind} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function ChartPanelSkeleton() {
  return (
    <div className="flex flex-1 flex-col rounded-lg border border-border bg-raised p-5 shadow-card" aria-busy="true">
      <span className="sr-only">Loading rates</span>
      <div className="h-4 w-48 animate-pulse rounded bg-surface" />
      <div className="mt-4 flex-1 animate-pulse rounded-md bg-surface" style={{ minHeight: CHART_MIN_HEIGHT }} />
    </div>
  );
}

export function ChartPanelError({ pair, message, canRetry, onRetry }) {
  return (
    <div className="flex flex-1 flex-col items-start gap-3 rounded-lg border border-border bg-raised p-6 shadow-card" role="alert">
      <AlertTriangle aria-hidden className="size-5 text-danger" />
      <p className="font-medium">Rates for {pair} didn&apos;t load</p>
      <p className="max-w-prose text-sm text-muted">
        {message}. {canRetry ? 'Try again, or pick another pair.' : 'Pick another pair from the heading above or the list below.'}
      </p>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-border px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Price chart and optional RSI chart for one pair, drawn from `rows` (buildChartRows).
 * While another pair loads, the current one stays on screen, faded.
 */
export default function ChartPanel({
  pair,
  series,
  rows,
  stats,
  forecast,
  algorithmLabel,
  overlays,
  isRefreshing,
  loadingPair,
  onDownload,
}) {
  const lastObserved = series[series.length - 1];
  const decimals = rateDecimals(lastObserved.close);
  const axis = useMemo(
    () =>
      niceTicks(
        valueDomain(rows, {
          overlays,
          extraValues: overlays.includes('range') && stats ? [stats.low30, stats.high30] : [],
        })
      ),
    [rows, overlays, stats]
  );

  const legend = [
    { label: `${pair} daily rate`, color: 'var(--series-observed)', kind: 'line' },
    ...(forecast?.length
      ? [
          { label: `Forecast (${algorithmLabel})`, color: 'var(--series-forecast)', kind: 'dashed' },
          { label: '50%, 80% and 95% ranges', color: 'var(--series-forecast)', kind: 'fan' },
        ]
      : []),
    ...(overlays.includes('sma5') ? [{ label: '5-day average', color: 'var(--series-short)', kind: 'line' }] : []),
    ...(overlays.includes('sma20') ? [{ label: '20-day average', color: 'var(--series-long)', kind: 'line' }] : []),
    ...(overlays.includes('bollinger') ? [{ label: 'Bollinger bands', color: 'var(--series-long)', kind: 'band' }] : []),
  ];

  const first = rows[0];
  const summary = `${pair} daily rate from ${formatIsoDate(first.date)} to ${formatIsoDate(lastObserved.date)}, latest ${formatRate(
    lastObserved.close,
    decimals
  )}${forecast?.length ? `, with a ${forecast.length}-day forecast` : ''}. The same figures are in the table below the chart.`;

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-border bg-raised p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <Legend items={legend} />
        </div>
        <div className="flex shrink-0 items-center gap-4 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onDownload}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-sm text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download aria-hidden className="size-4" />
            Download CSV
          </button>
          {isRefreshing && (
            <p className="text-sm text-muted" role="status">
              Loading {loadingPair}
            </p>
          )}
        </div>
      </div>
      <div className={cn('mt-3 flex flex-1 flex-col gap-4 transition-opacity', isRefreshing && 'opacity-40')} aria-busy={isRefreshing}>
        {/* The chart is positioned out of flow so its size follows the card and never feeds back into it. */}
        <figure role="img" aria-label={summary} className="relative flex-1" style={{ minHeight: CHART_MIN_HEIGHT }}>
          <PriceChart
            rows={rows}
            domain={axis.domain}
            ticks={axis.ticks}
            tickDecimals={axis.decimals}
            decimals={decimals}
            overlays={overlays}
            stats={stats}
            lastObservedDate={lastObserved.date}
            className="absolute inset-0"
          />
        </figure>
        {overlays.includes('rsi') && <RsiChart rows={rows} />}
      </div>
    </div>
  );
}

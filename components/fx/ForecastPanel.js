'use client';

import { RadioGroup } from 'radix-ui';
import SegmentedControl from '@/components/ui/segmented-control';
import Switch from '@/components/ui/switch';
import { ALGORITHMS, HORIZONS } from '@/lib/config/forecast';
import { formatIsoDate, formatPct, formatRate } from '@/lib/format';
import { cn } from '@/lib/cn';

const HORIZON_OPTIONS = HORIZONS.map((days) => ({ value: String(days), label: `${days}d`, title: `${days} days` }));

function Result({ query, latest, decimals, unavailable }) {
  if (unavailable) {
    return <p className="text-sm text-muted">There is no forecast without rates for this pair.</p>;
  }

  if (!latest || (query.isPending && !query.data)) {
    // Same line heights as the result below, so the panel (and the chart sized to it) doesn't jump when it arrives.
    return (
      <div aria-busy="true">
        <span className="sr-only">Running the forecast</span>
        <div className="h-5 w-32 animate-pulse rounded bg-surface" />
        <div className="mt-0.5 h-9 w-40 animate-pulse rounded bg-surface" />
        <div className="mt-1 h-5 w-48 animate-pulse rounded bg-surface" />
        <div className="mt-3 h-11 w-full animate-pulse rounded bg-surface" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" className="space-y-2 text-sm">
        <p className="font-medium">The forecast didn&apos;t run</p>
        <p className="text-muted">{query.error.message}.</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="rounded-md border border-border px-3 py-1 font-medium transition-colors hover:border-accent hover:text-accent"
        >
          Run it again
        </button>
      </div>
    );
  }

  const end = query.data.forecast[query.data.forecast.length - 1];
  const change = (end.rate / latest.close - 1) * 100;

  return (
    <div className={cn('transition-opacity', query.isPlaceholderData && 'opacity-50')} aria-busy={query.isPlaceholderData}>
      <p className="text-sm text-muted">On {formatIsoDate(end.date)}</p>
      <p className="mt-0.5 text-3xl font-semibold tracking-tight">{formatRate(end.rate, decimals)}</p>
      <p className="mt-1 text-sm">
        <span className="font-medium tabular-nums">{formatPct(change)}</span>{' '}
        <span className="text-muted">from the latest rate</span>
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted">50% range</dt>
        <dd className="font-medium tabular-nums">
          {formatRate(end.lower50, decimals)} to {formatRate(end.upper50, decimals)}
        </dd>
        <dt className="text-muted">95% range</dt>
        <dd className="font-medium tabular-nums">
          {formatRate(end.lower, decimals)} to {formatRate(end.upper, decimals)}
        </dd>
      </dl>
    </div>
  );
}

export default function ForecastPanel({
  algorithm,
  onAlgorithmChange,
  horizon,
  onHorizonChange,
  showOnChart,
  onShowOnChartChange,
  unavailable,
  query,
  latest,
  decimals,
}) {
  const selected = ALGORITHMS.find((a) => a.value === algorithm);

  return (
    <aside aria-labelledby="forecast-heading" className="flex flex-col rounded-lg border border-border bg-raised p-5 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <h2 id="forecast-heading" className="text-base font-semibold">
          Forecast
        </h2>
        <Switch checked={showOnChart} onCheckedChange={onShowOnChartChange} label="On chart" />
      </div>

      <div className="mt-4">
        <p className="text-sm text-muted">Horizon</p>
        <SegmentedControl
          label="Forecast horizon"
          value={String(horizon)}
          onValueChange={(value) => onHorizonChange(Number(value))}
          options={HORIZON_OPTIONS}
          className="mt-2 flex w-full justify-between"
        />
      </div>

      <div className="mt-5">
        <p id="model-label" className="text-sm text-muted">
          Model
        </p>
        <RadioGroup.Root
          aria-labelledby="model-label"
          value={algorithm}
          onValueChange={onAlgorithmChange}
          className="mt-1.5 grid grid-cols-2 gap-0.5 lg:grid-cols-1"
        >
          {ALGORITHMS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-tint has-[[data-state=checked]]:bg-tint-strong"
            >
              <RadioGroup.Item
                value={option.value}
                className="flex size-4 shrink-0 items-center justify-center rounded-md border border-border-strong bg-raised data-[state=checked]:border-accent"
              >
                <RadioGroup.Indicator className="block size-2 rounded-md bg-accent" />
              </RadioGroup.Item>
              {option.label}
            </label>
          ))}
        </RadioGroup.Root>
        {/* Room for the longest description, so switching models doesn't resize the chart beside the panel. */}
        <p className="mt-2 text-sm text-muted lg:min-h-[4lh]">{selected?.description}</p>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <Result query={query} latest={latest} decimals={decimals} unavailable={unavailable} />
      </div>

      {/* Pinned to the bottom when the chart beside the panel is the taller of the two. */}
      <p className="mt-auto pt-5 text-xs leading-relaxed text-muted">
        A statistical projection from the past year of daily rates. It extends recent patterns and can be wrong. General
        information, not financial advice.
      </p>
    </aside>
  );
}

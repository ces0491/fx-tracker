'use client';

import Link from 'next/link';
import { formatIsoDate } from '@/lib/format';
import { cn } from '@/lib/cn';

const DATE = { day: 'numeric', month: 'short', year: 'numeric' };

function verdict(model, noChange) {
  const a = Number(model.toFixed(2));
  const b = Number(noChange.toFixed(2));
  if (a < b) return 'Over these forecasts, the model was more accurate than assuming the rate stays where it is.';
  if (a > b) return 'Over these forecasts, the model was less accurate than assuming the rate stays where it is.';
  return 'Over these forecasts, the model was as accurate as assuming the rate stays where it is.';
}

function Figure({ label, value, note }) {
  return (
    <div className="bg-raised p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight">{value}</dd>
      {note && <dd className="mt-0.5 text-sm text-muted">{note}</dd>}
    </div>
  );
}

/** How the selected model's past forecasts compared with what happened (back-test). */
export default function TrackRecord({ query, algorithmLabel, horizon, unavailable, performanceHref }) {
  if (unavailable || query.isError) return null;

  const record = query.data?.backtest;
  const loading = query.isPending && !query.data;

  return (
    <section
      aria-labelledby="track-record-heading"
      className={cn('rounded-lg border border-border bg-raised p-4 shadow-card sm:p-5', query.isPlaceholderData && 'opacity-50')}
      aria-busy={loading || query.isPlaceholderData}
    >
      <h2 id="track-record-heading" className="text-base font-semibold">
        Track record: {algorithmLabel}, {horizon} days ahead
      </h2>

      {loading ? (
        <div className="mt-3 space-y-2">
          <span className="sr-only">Testing the model&apos;s past forecasts</span>
          <div className="h-4 w-3/4 animate-pulse rounded bg-surface" />
          <div className="h-16 animate-pulse rounded-md bg-surface" />
        </div>
      ) : !record ? (
        <p className="mt-2 text-sm text-muted">
          There isn&apos;t enough history for this pair to test the model&apos;s past forecasts.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            The last {record.forecasts} weekly forecasts, made from {formatIsoDate(record.firstOrigin, DATE)} to{' '}
            {formatIsoDate(record.lastOrigin, DATE)}, set against the rates that followed.
          </p>
          <dl className="mt-4 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            <Figure label="Average miss" value={`${record.meanAbsPctError.toFixed(2)}%`} />
            <Figure label="Assuming no change" value={`${record.noChangeMeanAbsPctError.toFixed(2)}%`} note="Average miss" />
            <Figure
              label="Inside the 50% range"
              value={`${record.held50} of ${record.forecasts}`}
              note={`About ${Math.round(0.5 * record.forecasts)} if calibrated`}
            />
            <Figure
              label="Inside the 95% range"
              value={`${record.held} of ${record.forecasts}`}
              note={`About ${Math.round(0.95 * record.forecasts)} if calibrated`}
            />
          </dl>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-sm">
            <p>{verdict(record.meanAbsPctError, record.noChangeMeanAbsPctError)}</p>
            <Link
              href={performanceHref}
              className="shrink-0 font-medium text-accent underline decoration-hairline underline-offset-4 hover:decoration-accent"
            >
              Compare all six models
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

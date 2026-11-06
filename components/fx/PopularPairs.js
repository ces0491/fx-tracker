'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import Sparkline from './Sparkline';
import { POPULAR_PAIRS } from '@/lib/config/pairs';
import { formatIsoDate, formatPct, formatRate } from '@/lib/format';
import { cn } from '@/lib/cn';

function PairTable({ pairs, rates, selected, onSelect, continuation = false }) {
  return (
    <table className="w-full text-sm">
      <thead className={continuation ? 'max-lg:sr-only' : undefined}>
        <tr className="text-left text-xs text-muted">
          <th scope="col" className="py-2 font-medium">
            Pair
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            Rate
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            Day
          </th>
          <th scope="col" className="py-2 pl-4 font-medium">
            30 days
          </th>
        </tr>
      </thead>
      <tbody>
        {pairs.map((pair) => {
          const entry = rates?.[pair];
          const isSelected = pair === selected;
          const Arrow = entry?.changePct < 0 ? ArrowDown : ArrowUp;
          const first = entry?.series?.[0];
          return (
            // The whole row selects the pair. The button carries focus and the accessible name, and its clicks
            // (including Enter and Space) bubble up to the row. No overlay stretched over the row: Safari ignored
            // position: relative on table rows until WebKit bug 240961, which pinned every row's overlay to the top
            // of the page and turned taps on the controls there into a switch to the last pair.
            <tr
              key={pair}
              onClick={() => onSelect(pair)}
              className={cn('cursor-pointer border-t border-border transition-colors hover:bg-tint', isSelected && 'bg-tint-strong')}
            >
              <th scope="row" className="py-2.5 pl-2 text-left font-medium">
                <button type="button" aria-pressed={isSelected} className="rounded">
                  {pair}
                </button>
              </th>
              <td className="py-2.5 text-right tabular-nums">{entry ? formatRate(entry.rate) : '—'}</td>
              <td className="py-2.5 text-right tabular-nums">
                {entry?.changePct != null ? (
                  <span className="inline-flex items-center justify-end gap-1">
                    <Arrow aria-hidden className="size-3.5 text-muted" strokeWidth={2.5} />
                    {formatPct(entry.changePct)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="py-1.5 pl-4 pr-2">
                <Sparkline
                  series={entry?.series}
                  width={88}
                  label={
                    first
                      ? `${pair} from ${formatRate(first.close)} on ${formatIsoDate(first.date)} to ${formatRate(entry.rate)}`
                      : `${pair}: no recent rates`
                  }
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Popular pairs with their latest rate, day change and last month. Selecting a row loads the pair. */
export default function PopularPairs({ query, selected, onSelect }) {
  const rates = query.data?.rates;
  const asOf = rates
    ? Object.values(rates).reduce((latest, r) => (r.date > latest ? r.date : latest), '')
    : null;
  const half = Math.ceil(POPULAR_PAIRS.length / 2);

  return (
    <section aria-labelledby="popular-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="popular-heading" className="text-xl font-semibold tracking-tight">
          Popular pairs
        </h2>
        {asOf && (
          <p className="text-sm text-muted">
            Daily rates for {formatIsoDate(asOf)}. Day change is against the previous day.
          </p>
        )}
      </div>

      {query.isError ? (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted">The popular pairs didn&apos;t load: {query.error.message}.</span>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="rounded-md border border-border px-3 py-1 font-medium transition-colors hover:border-accent hover:text-accent"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className={cn('mt-3 grid gap-x-10 lg:grid-cols-2', query.isPending && 'animate-pulse')}>
          <PairTable pairs={POPULAR_PAIRS.slice(0, half)} rates={rates} selected={selected} onSelect={onSelect} />
          <PairTable pairs={POPULAR_PAIRS.slice(half)} rates={rates} selected={selected} onSelect={onSelect} continuation />
        </div>
      )}
    </section>
  );
}

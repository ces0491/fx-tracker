'use client';

import { ArrowDown, ArrowLeftRight, ArrowUp } from 'lucide-react';
import CurrencyPicker from './CurrencyPicker';
import { formatIsoDate, formatPct, formatRate, formatSigned, rateDecimals } from '@/lib/format';

const SHORT_DATE = { day: 'numeric', month: 'short' };

/**
 * The pair as a sentence, "1 NZD = 9.2404 ZAR", with the codes as pickers.
 * `stats` is null while the pair's rates load or when they failed.
 */
export default function PairHero({ base, quote, currencies, stats, status, onBaseChange, onQuoteChange, onSwap }) {
  const names = Object.fromEntries(currencies.map((c) => [c.code, c.name]));
  const decimals = stats ? rateDecimals(stats.latest.close) : 4;
  const DirectionIcon = stats && stats.dayChange < 0 ? ArrowDown : ArrowUp;

  return (
    <section className="field" aria-labelledby="pair-heading">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-8 sm:pt-16">
        <h1 id="pair-heading" className="text-sm text-muted sm:text-base">
          {names[base] ?? base} to {names[quote] ?? quote}
        </h1>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-[0.28em] gap-y-1 text-[clamp(2.4rem,7.2vw,4.75rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
          <span className="font-normal text-muted">1</span>
          <CurrencyPicker value={base} currencies={currencies} onChange={onBaseChange} side="Base" />
          <span className="font-normal text-muted">=</span>
          {stats ? (
            <span>{formatRate(stats.latest.close, decimals)}</span>
          ) : (
            <span>
              <span
                aria-hidden
                className={`inline-block h-[0.78em] w-[3.4em] rounded-lg bg-surface ${status === 'error' ? '' : 'animate-pulse'}`}
              />
              <span className="sr-only">{status === 'error' ? 'No rate available' : 'Loading rate'}</span>
            </span>
          )}
          <CurrencyPicker value={quote} currencies={currencies} onChange={onQuoteChange} side="Quote" />
          <button
            type="button"
            onClick={onSwap}
            aria-label={`Swap to ${quote}/${base}`}
            title="Swap currencies"
            className="ml-[0.1em] self-center rounded-full border border-border bg-raised p-2 text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <ArrowLeftRight aria-hidden className="size-5" />
          </button>
        </div>

        <div className="mt-5 flex min-h-6 flex-wrap items-center gap-x-5 gap-y-1 text-sm sm:text-base">
          {stats && (
            <>
              <span className="inline-flex items-center gap-1.5">
                <DirectionIcon aria-hidden className="size-4" strokeWidth={2.5} />
                <span className="font-medium tabular-nums">
                  {formatSigned(stats.dayChange, decimals)} ({formatPct(stats.dayChangePct)})
                </span>
                <span className="text-muted">since {formatIsoDate(stats.previous.date, SHORT_DATE)}</span>
              </span>
              <span className="text-muted">Daily rate for {formatIsoDate(stats.latest.date)}</span>
            </>
          )}
          {status === 'error' && <span className="text-muted">No rate is available for this pair.</span>}
        </div>
      </div>
    </section>
  );
}

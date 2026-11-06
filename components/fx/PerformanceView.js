'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import CurrencyPicker from './CurrencyPicker';
import MissByHorizonChart from './MissByHorizonChart';
import MissOverTimeChart from './MissOverTimeChart';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';
import SegmentedControl from '@/components/ui/segmented-control';
import { isRetryable, useCurrencies, usePerformance } from '@/lib/client/queries';
import { HORIZON_OPTIONS, algorithmLabel } from '@/lib/config/forecast';
import { formatIsoDate, formatRate, rateDecimals } from '@/lib/format';
import { cn } from '@/lib/cn';

const EMPTY = [];
const MISSES_SHOWN = 5;
const pct = (v) => `${v.toFixed(2)}%`;
// A difference of two percentages, in percentage points, with a true minus sign.
const points = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)} pp`;

function list(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The headline sentence, built from the verdicts. */
function summary(models, horizon, independent) {
  const judged = models.filter((m) => m.available && m.vsNoChange.verdict);
  if (judged.length === 0) {
    return `At ${horizon} days the year holds about ${Math.round(independent)} independent forecasts, too few to say whether any model beat assuming no change.`;
  }
  const better = judged.filter((m) => m.vsNoChange.verdict === 'better').map((m) => algorithmLabel(m.algorithm));
  const worse = judged.filter((m) => m.vsNoChange.verdict === 'worse').map((m) => algorithmLabel(m.algorithm));
  const first = better.length
    ? `${list(better)} missed by clearly less than assuming no change.`
    : 'no model missed by clearly less than assuming no change.';
  const second = worse.length ? ` ${list(worse)} missed by clearly more.` : '';
  return `At ${horizon} days ${first}${second} Clearly means by more than twice the standard error of the difference.`;
}

function verdictText(verdict) {
  if (verdict === 'better') return 'Clearly lower';
  if (verdict === 'worse') return 'Clearly higher';
  if (verdict === 'level') return 'Within sampling error';
  return 'Too few to judge';
}

function Stat({ label, value, note }) {
  return (
    <div className="bg-raised p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight">{value}</dd>
      {note && <dd className="mt-0.5 text-sm text-muted">{note}</dd>}
    </div>
  );
}

function Coverage({ held, forecasts, check, level }) {
  return (
    <>
      <span className="block font-medium">
        {held} of {forecasts}
      </span>
      <span className="block text-xs text-muted">about {Math.round((level / 100) * forecasts)} if calibrated</span>
      {check.withinError === true && <span className="block text-xs text-muted">Within error</span>}
      {check.withinError === false && (
        <span className="mt-0.5 inline-block rounded-sm border border-border-strong px-1.5 text-xs">Outside error</span>
      )}
    </>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-lg border border-border bg-raised p-4 shadow-card sm:p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Scoring the models</span>
      <div className="h-24 animate-pulse rounded-lg bg-surface" />
      <div className="h-80 animate-pulse rounded-lg bg-surface" />
      <div className="h-64 animate-pulse rounded-lg bg-surface" />
    </div>
  );
}

/** How each model's back-tested forecasts for a pair compared with the no-change forecast. */
export default function PerformanceView({ initialPair, initialHorizon, initialModel }) {
  const [pair, setPair] = useState(initialPair);
  const [horizon, setHorizon] = useState(initialHorizon);
  const [model, setModel] = useState(initialModel);
  const [base, quote] = pair.split('/');
  const currencies = useCurrencies();
  const query = usePerformance({ pair, horizon });
  const data = query.data?.pair === pair ? query.data : undefined;

  useEffect(() => {
    document.title = `${pair} forecast model performance — FX Tracker`;
    const url = new URL(window.location.href);
    url.searchParams.set('pair', pair.replace('/', '-'));
    url.searchParams.set('horizon', String(horizon));
    url.searchParams.set('model', model);
    window.history.replaceState(window.history.state, '', url);
  }, [pair, horizon, model]);

  const selectPair = useCallback((next) => setPair(next), []);
  const changeBase = (code) => selectPair(code === quote ? `${quote}/${base}` : `${code}/${quote}`);
  const changeQuote = (code) => selectPair(code === base ? `${quote}/${base}` : `${base}/${code}`);

  const names = Object.fromEntries((currencies.data?.currencies ?? EMPTY).map((c) => [c.code, c.name]));
  const pairParam = pair.replace('/', '-');
  const detail = data?.backtest;
  const shownHorizon = data?.horizon ?? horizon;
  const selected = detail?.models.find((m) => m.algorithm === model && m.available);
  const decimals = detail ? rateDecimals(detail.scored[detail.scored.length - 1].actual) : 4;
  const available = detail?.models.filter((m) => m.available) ?? EMPTY;
  const closest = available.reduce((best, m) => (!best || m.meanAbsPctError < best.meanAbsPctError ? m : best), null);
  const judged = available.filter((m) => m.vsNoChange.verdict);
  const ahead = judged.filter((m) => m.vsNoChange.verdict === 'better');
  const worstMisses = selected
    ? selected.points
        .map((p, i) => ({ ...p, ...detail.scored[i] }))
        .sort((a, b) => b.missPct - a.missPct)
        .slice(0, MISSES_SHOWN)
    : EMPTY;

  return (
    <>
      <SiteHeader
        links={[
          { href: `/?pair=${pairParam}`, label: 'Rates and forecast', shortLabel: 'Rates' },
          { href: `/?pair=${pairParam}#how-it-works`, label: 'How it works', hideOnPhone: true },
        ]}
      />
      <main className="mx-auto max-w-page px-4 pb-20 sm:px-8">
        <section aria-labelledby="performance-heading" className="pb-8 pt-10 sm:pt-14">
          <p className="text-sm text-muted sm:text-base">
            {names[base] ?? base} to {names[quote] ?? quote}
          </p>
          <h1 id="performance-heading" className="mt-2 text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-tight tracking-tight">
            Model performance
          </h1>
          <p className="mt-3 max-w-3xl text-muted">
            Each week over the past year, the six models forecast this pair, and the forecasts are set against the rates
            that followed. The benchmark is a forecast that the rate stays where it is.
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <p className="text-sm text-muted">Pair</p>
              <div className="mt-1 flex items-baseline gap-x-[0.25em] text-2xl font-semibold tracking-tight">
                <CurrencyPicker value={base} currencies={currencies.data?.currencies ?? EMPTY} onChange={changeBase} side="Base" />
                <span className="font-normal text-muted">/</span>
                <CurrencyPicker value={quote} currencies={currencies.data?.currencies ?? EMPTY} onChange={changeQuote} side="Quote" />
                <button
                  type="button"
                  onClick={() => selectPair(`${quote}/${base}`)}
                  aria-label={`Swap to ${quote}/${base}`}
                  title="Swap currencies"
                  className="ml-1 self-center rounded-md border border-border bg-raised p-1.5 text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  <ArrowLeftRight aria-hidden className="size-4" />
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted">Days ahead</p>
              <SegmentedControl
                label="Forecast horizon"
                value={String(horizon)}
                onValueChange={(value) => setHorizon(Number(value))}
                options={HORIZON_OPTIONS}
                className="mt-1.5"
              />
            </div>
          </div>
        </section>

        {query.isError && !data ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-raised p-6 shadow-card" role="alert">
            <AlertTriangle aria-hidden className="size-5 text-danger" />
            <p className="font-medium">The models for {pair} couldn&apos;t be scored</p>
            <p className="max-w-prose text-sm text-muted">{query.error.message}.</p>
            {isRetryable(query.error) && (
              <button
                type="button"
                onClick={() => query.refetch()}
                className="rounded-md border border-border px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
              >
                Try again
              </button>
            )}
          </div>
        ) : !data ? (
          <Skeleton />
        ) : !detail ? (
          <p className="rounded-lg border border-border bg-raised p-6 text-sm text-muted shadow-card">
            There isn&apos;t enough history for {pair} to test the models&apos; past forecasts.
          </p>
        ) : (
          <div className={cn('space-y-6 transition-opacity', query.isPlaceholderData && 'opacity-50')} aria-busy={query.isPlaceholderData}>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-card lg:grid-cols-4">
              <Stat label="Assuming no change" value={pct(detail.noChangeMeanAbsPctError)} note="Average miss" />
              <Stat
                label="Lowest average miss"
                value={closest ? pct(closest.meanAbsPctError) : '—'}
                note={closest ? algorithmLabel(closest.algorithm) : ''}
              />
              <Stat
                label="Clearly ahead of no change"
                value={judged.length ? `${ahead.length} of ${available.length}` : '—'}
                note={judged.length ? 'Lower miss, past sampling error' : 'Too few independent forecasts to judge'}
              />
              <Stat
                label="Forecasts scored"
                value={detail.forecasts}
                note={`Weekly, about ${Math.round(detail.independentForecasts)} independent at ${shownHorizon} days`}
              />
            </dl>
            <p className="text-sm">{summary(detail.models, shownHorizon, detail.independentForecasts)}</p>

            <Section
              title="Average miss by how far ahead"
              description="The miss is the gap between a forecast and the rate on the day it was for, as a share of that rate, averaged over the year's weekly forecasts."
            >
              <MissByHorizonChart pair={pair} byHorizon={data.byHorizon} selected={model} />
            </Section>

            <Section
              title={`The six models at ${shownHorizon} days`}
              description="Choose a model to see its forecasts below. A range is calibrated when the rate lands inside it about as often as its level says: half the time for the 50% range, 95% of the time for the 95% range."
            >
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full whitespace-nowrap text-sm">
                  <caption className="sr-only">
                    {pair}: each model&apos;s {shownHorizon}-day forecasts against no change
                  </caption>
                  <thead className="bg-surface text-left text-xs text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Model</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Average miss</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Against no change</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Inside 50% range</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Inside 95% range</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    <tr className="border-t border-border text-muted">
                      <th scope="row" className="px-3 py-2.5 text-left font-medium">No change</th>
                      <td className="px-3 py-2.5 text-right">{pct(detail.noChangeMeanAbsPctError)}</td>
                      <td className="px-3 py-2.5 text-right">Benchmark</td>
                      <td className="px-3 py-2.5 text-right">—</td>
                      <td className="px-3 py-2.5 text-right">—</td>
                    </tr>
                    {detail.models.map((m) => {
                      const isSelected = m.algorithm === model;
                      return (
                        // The whole row selects the model; the button carries focus and the name, and its clicks
                        // bubble up to the row.
                        <tr
                          key={m.algorithm}
                          onClick={() => m.available && setModel(m.algorithm)}
                          className={cn(
                            'border-t border-border align-top transition-colors',
                            m.available && 'cursor-pointer hover:bg-tint',
                            isSelected && 'bg-tint-strong'
                          )}
                        >
                          <th scope="row" className="px-3 py-2.5 text-left font-medium">
                            <button type="button" aria-pressed={isSelected} disabled={!m.available} className="rounded text-left">
                              {algorithmLabel(m.algorithm)}
                            </button>
                          </th>
                          {m.available ? (
                            <>
                              <td className="px-3 py-2.5 text-right font-medium">{pct(m.meanAbsPctError)}</td>
                              <td className="px-3 py-2.5 text-right">
                                <span className="block font-medium">{points(m.vsNoChange.difference)}</span>
                                <span className="block text-xs text-muted">{verdictText(m.vsNoChange.verdict)}</span>
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <Coverage held={m.held50} forecasts={detail.forecasts} check={m.inside50} level={50} />
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <Coverage held={m.held} forecasts={detail.forecasts} check={m.inside95} level={95} />
                              </td>
                            </>
                          ) : (
                            <td colSpan={4} className="px-3 py-2.5 text-muted">
                              This model couldn&apos;t be tested on this pair.
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>

            {selected && (
              <Section
                title={`${algorithmLabel(model)}, forecast by forecast`}
                description={`Each ${shownHorizon}-day forecast's miss by the date it was made, against the no-change forecast's miss on the same dates.`}
              >
                <MissOverTimeChart
                  pair={pair}
                  horizon={shownHorizon}
                  scored={detail.scored}
                  points={selected.points}
                  modelName={algorithmLabel(model)}
                  decimals={decimals}
                />

                <h3 className="mt-6 text-sm font-semibold">Where it missed most</h3>
                <div className="mt-2 overflow-x-auto rounded-md border border-border">
                  <table className="w-full whitespace-nowrap text-sm tabular-nums">
                    <caption className="sr-only">
                      {pair}: the {MISSES_SHOWN} {algorithmLabel(model)} forecasts that missed most
                    </caption>
                    <thead className="bg-surface text-left text-xs text-muted">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-medium">Made on</th>
                        <th scope="col" className="px-3 py-2 font-medium">For</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Forecast</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Actual</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Miss</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Inside 95% range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {worstMisses.map((miss) => (
                        <tr key={miss.madeOn} className="border-t border-border">
                          <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-normal">
                            {formatIsoDate(miss.madeOn)}
                          </th>
                          <td className="whitespace-nowrap px-3 py-2">{formatIsoDate(miss.forDate)}</td>
                          <td className="px-3 py-2 text-right">{formatRate(miss.forecast, decimals)}</td>
                          <td className="px-3 py-2 text-right">{formatRate(miss.actual, decimals)}</td>
                          <td className="px-3 py-2 text-right font-medium">{pct(miss.missPct)}</td>
                          <td className="px-3 py-2 text-right">{miss.held ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            <section className="rounded-lg border border-dashed border-border-strong p-4 text-sm leading-relaxed text-muted sm:p-5">
              <p>
                Each week from {formatIsoDate(detail.scored[0].madeOn)} to{' '}
                {formatIsoDate(detail.scored[detail.scored.length - 1].madeOn)}, the models were refitted on the{' '}
                {detail.windowObservations} daily rates before that week and asked for a forecast {shownHorizon} days
                ahead. Forecasts a week apart for {shownHorizon} days ahead
                {shownHorizon > detail.stepDays ? ' cover overlapping stretches of rates, so their misses move together' : ' do not overlap'}
                , and the year counts as about {Math.round(detail.independentForecasts)} independent forecasts. The
                comparisons with no change and the calibration checks use that count, and give no verdict below 10.
              </p>
              <p className="mt-2">
                Daily rates from {data.source?.name ?? 'Frankfurter'} to {formatIsoDate(data.asOf)}.{' '}
                <Link
                  href={`/?pair=${pairParam}#how-it-works`}
                  className="text-foreground underline decoration-hairline underline-offset-2 hover:decoration-accent"
                >
                  How it works
                </Link>{' '}
                describes each model.
              </p>
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

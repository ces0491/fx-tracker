'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ChartPanel, { ChartPanelError, ChartPanelSkeleton } from './ChartPanel';
import ChartToolbar from './ChartToolbar';
import DataTable from './DataTable';
import ForecastPanel from './ForecastPanel';
import HowItWorks from './HowItWorks';
import PairHero from './PairHero';
import PopularPairs from './PopularPairs';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';
import StatsStrip from './StatsStrip';
import TrackRecord from './TrackRecord';
import { buildChartRows } from '@/lib/analysis/chart';
import { withIndicators } from '@/lib/analysis/indicators';
import { pairStats } from '@/lib/analysis/stats';
import { downloadCsv } from '@/lib/client/csv';
import { useCurrencies, useForecast, useHistory, useLatestRates } from '@/lib/client/queries';
import { DEFAULT_RANGE } from '@/lib/config/chart';
import { ALGORITHMS, DEFAULT_ALGORITHM, DEFAULT_HORIZON } from '@/lib/config/forecast';
import { rateDecimals } from '@/lib/format';

const EMPTY = [];

export default function FXTracker({ initialPair }) {
  const [pair, setPair] = useState(initialPair);
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [overlays, setOverlays] = useState(EMPTY);
  const [showForecast, setShowForecast] = useState(true);
  const [algorithm, setAlgorithm] = useState(DEFAULT_ALGORITHM);
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [base, quote] = pair.split('/');

  const currencies = useCurrencies();
  const latest = useLatestRates();
  const history = useHistory(pair);

  // History for another pair can be on screen while this one loads.
  const shownPair = history.data?.pair;
  const isCurrent = shownPair === pair && !history.isPlaceholderData;
  const series = useMemo(
    () => (history.data ? withIndicators(history.data.historicalData) : null),
    [history.data]
  );
  const stats = useMemo(() => (series ? pairStats(series) : null), [series]);
  const historyFailed = history.isError && !history.data;
  const forecast = useForecast({ pair, algorithm, horizon, enabled: !historyFailed });

  const selectPair = useCallback((next) => {
    setPair(next);
    const url = new URL(window.location.href);
    url.searchParams.set('pair', next.replace('/', '-'));
    window.history.replaceState(window.history.state, '', url);
  }, []);

  useEffect(() => {
    document.title = `${pair} exchange rate and forecast — FX Tracker`;
  }, [pair]);

  // Choosing the other side's currency swaps the pair.
  const changeBase = (code) => selectPair(code === quote ? `${quote}/${base}` : `${code}/${quote}`);
  const changeQuote = (code) => selectPair(code === base ? `${quote}/${base}` : `${base}/${code}`);
  const swap = () => selectPair(`${quote}/${base}`);

  const selectPopular = (next) => {
    selectPair(next);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const forecastPoints = isCurrent && forecast.data?.pair === pair ? forecast.data.forecast : undefined;
  const chartForecast = showForecast ? forecastPoints : undefined;
  // The chart and the data table show the same rows.
  const rows = useMemo(
    () => (series ? buildChartRows(series, { range, forecast: chartForecast }) : null),
    [series, range, chartForecast]
  );
  const algorithmLabel = ALGORITHMS.find((a) => a.value === algorithm)?.label ?? algorithm;

  const exportCsv = () => {
    if (!series || !isCurrent) return;
    const decimals = rateDecimals(series[series.length - 1].close) + 2;
    const n = (v) => (v == null ? '' : v.toFixed(decimals));
    const blanks = (count) => new Array(count).fill('');
    const rows = series.map((p) => [p.date, n(p.close), n(p.sma5), n(p.sma20), n(p.bbLower), n(p.bbUpper), p.rsi?.toFixed(2) ?? '', ...blanks(7)]);
    for (const f of forecastPoints ?? []) {
      rows.push([f.date, ...blanks(6), n(f.rate), n(f.lower50), n(f.upper50), n(f.lower80), n(f.upper80), n(f.lower), n(f.upper)]);
    }
    downloadCsv(
      `${pair.replace('/', '-')}_daily_rates.csv`,
      ['date', 'rate', 'sma_5', 'sma_20', 'bollinger_lower', 'bollinger_upper', 'rsi_14', `forecast_${algorithm}`, 'lower_50', 'upper_50', 'lower_80', 'upper_80', 'lower_95', 'upper_95'],
      rows
    );
  };

  return (
    <>
      <SiteHeader />
      <main>
        <PairHero
          base={base}
          quote={quote}
          currencies={currencies.data?.currencies ?? EMPTY}
          stats={isCurrent ? stats : null}
          status={historyFailed ? 'error' : 'loading'}
          onBaseChange={changeBase}
          onQuoteChange={changeQuote}
          onSwap={swap}
        />

        <div className="mx-auto max-w-page space-y-12 px-4 pb-20 sm:px-8">
          <section aria-label="Chart and forecast">
            <ChartToolbar range={range} onRangeChange={setRange} overlays={overlays} onOverlaysChange={setOverlays} />
            {/*
              Chart and forecast side by side at equal height, the chart growing to fill its card; the data table and
              track record run full width below. Stacked in this order on phones.
            */}
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
              <div className="flex min-w-0 flex-col">
                {historyFailed ? (
                  <ChartPanelError
                    pair={pair}
                    message={history.error.message}
                    canRetry={(history.error.status ?? 500) >= 500}
                    onRetry={() => history.refetch()}
                  />
                ) : rows ? (
                  <ChartPanel
                    pair={shownPair}
                    series={series}
                    rows={rows}
                    stats={stats}
                    forecast={chartForecast}
                    algorithmLabel={algorithmLabel}
                    overlays={overlays}
                    isRefreshing={!isCurrent}
                    loadingPair={pair}
                    onDownload={exportCsv}
                  />
                ) : (
                  <ChartPanelSkeleton />
                )}
              </div>
              <ForecastPanel
                algorithm={algorithm}
                onAlgorithmChange={setAlgorithm}
                horizon={horizon}
                onHorizonChange={setHorizon}
                unavailable={historyFailed}
                showOnChart={showForecast}
                onShowOnChartChange={setShowForecast}
                query={forecast}
                latest={isCurrent ? stats?.latest : null}
                decimals={isCurrent && stats ? rateDecimals(stats.latest.close) : 4}
              />
              {rows && (
                <div className="min-w-0 lg:col-span-2">
                  <DataTable pair={shownPair} rows={rows} decimals={rateDecimals(series[series.length - 1].close)} />
                </div>
              )}
              <div className="min-w-0 lg:col-span-2">
                <TrackRecord query={forecast} algorithmLabel={algorithmLabel} horizon={horizon} unavailable={historyFailed} />
              </div>
            </div>
          </section>

          <StatsStrip stats={isCurrent ? stats : null} />

          <PopularPairs query={latest} selected={pair} onSelect={selectPopular} />

          <HowItWorks />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

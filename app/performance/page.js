import PerformanceView from '@/components/fx/PerformanceView';
import { ALGORITHMS, DEFAULT_ALGORITHM, DEFAULT_HORIZON, HORIZONS } from '@/lib/config/forecast';
import { DEFAULT_PAIR, pairFromParam } from '@/lib/config/pairs';

const DESCRIPTION =
  'How six statistical forecasting models have done against assuming the rate stays where it is: average miss, calibration of their ranges and their biggest misses, over a year of weekly forecasts.';

export async function generateMetadata({ searchParams }) {
  const pair = pairFromParam((await searchParams).pair) ?? DEFAULT_PAIR;
  const title = `${pair} forecast model performance — FX Tracker`;
  const url = `/performance?pair=${pair.replace('/', '-')}`;
  return {
    title,
    description: DESCRIPTION,
    alternates: { canonical: url },
    openGraph: { title, description: DESCRIPTION, url },
    twitter: { title, description: DESCRIPTION },
  };
}

export default async function Performance({ searchParams }) {
  const { pair, horizon, model } = await searchParams;
  const days = Number(horizon);
  return (
    <PerformanceView
      initialPair={pairFromParam(pair) ?? DEFAULT_PAIR}
      initialHorizon={HORIZONS.includes(days) ? days : DEFAULT_HORIZON}
      initialModel={ALGORITHMS.some((a) => a.value === model) ? model : DEFAULT_ALGORITHM}
    />
  );
}

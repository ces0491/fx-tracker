import FXTracker from '@/components/fx/FXTracker';
import { DEFAULT_PAIR, pairFromParam } from '@/lib/config/pairs';

export async function generateMetadata({ searchParams }) {
  const { pair } = await searchParams;
  const selected = pairFromParam(pair);
  if (!selected) return {};
  return {
    title: `${selected} exchange rate and forecast — FX Tracker`,
    alternates: { canonical: `/?pair=${selected.replace('/', '-')}` },
  };
}

export default async function Home({ searchParams }) {
  const { pair } = await searchParams;
  return <FXTracker initialPair={pairFromParam(pair) ?? DEFAULT_PAIR} />;
}

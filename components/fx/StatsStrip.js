import { STAT_WINDOWS } from '@/lib/analysis/stats';
import { formatIsoDate, formatPct, formatRate, rateDecimals } from '@/lib/format';

function rsiZone(rsi) {
  if (rsi > 70) return 'Above 70, often read as stretched upward';
  if (rsi < 30) return 'Below 30, often read as stretched downward';
  return 'Between 30 and 70';
}

const pct = (v) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '—');

function Stat({ label, value, note, className = '' }) {
  return (
    <div className={`bg-raised p-4 ${className}`}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight">{value}</dd>
      <dd className="mt-0.5 text-sm text-muted">{note}</dd>
    </div>
  );
}

/** Headline statistics for the pair; null stats render placeholders. */
export default function StatsStrip({ stats }) {
  const decimals = stats ? rateDecimals(stats.latest.close) : 4;

  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Pair statistics
      </h2>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-card lg:grid-cols-5">
        <Stat
          label={`${STAT_WINDOWS.CHANGE}-day change`}
          value={stats ? formatPct(stats.periodChangePct) : '—'}
          note={stats?.periodChangeFrom ? `Since ${formatIsoDate(stats.periodChangeFrom, { day: 'numeric', month: 'short' })}` : ' '}
        />
        <Stat label={`${STAT_WINDOWS.VOLATILITY}-day volatility`} value={stats ? pct(stats.volatility30) : '—'} note="Annualised" />
        <Stat label="1-year volatility" value={stats ? pct(stats.volatilityYear) : '—'} note="Annualised" />
        <Stat
          label="RSI, 14 days"
          value={stats?.rsi != null ? stats.rsi.toFixed(1) : '—'}
          note={stats?.rsi != null ? rsiZone(stats.rsi) : ' '}
        />
        <Stat
          label={`${STAT_WINDOWS.RANGE}-day range`}
          value={stats ? `${formatRate(stats.low30, decimals)} to ${formatRate(stats.high30, decimals)}` : '—'}
          note="Lowest and highest daily rate"
          className="col-span-2 lg:col-span-1"
        />
      </dl>
    </section>
  );
}

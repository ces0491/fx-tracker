/**
 * Small swatch identifying a chart series beside its label: a short line for
 * line series (dashed for projections), a filled block for bands, and three
 * nested blocks for the forecast fan.
 */
export default function SeriesKey({ color, kind = 'line', className = '' }) {
  if (kind === 'fan') {
    return (
      <svg aria-hidden width="16" height="12" viewBox="0 0 16 12" className={`shrink-0 ${className}`}>
        <rect x="0" y="0" width="16" height="12" rx="2" fill={color} fillOpacity="0.16" />
        <rect x="0" y="2.5" width="16" height="7" rx="1.5" fill={color} fillOpacity="0.32" />
        <rect x="0" y="4.5" width="16" height="3" rx="1" fill={color} fillOpacity="0.5" />
      </svg>
    );
  }
  if (kind === 'band') {
    return (
      <span
        aria-hidden
        className={`inline-block h-2.5 w-4 shrink-0 rounded-[3px] ${className}`}
        style={{ background: `color-mix(in oklab, ${color} 22%, transparent)` }}
      />
    );
  }
  return (
    <svg aria-hidden width="16" height="8" viewBox="0 0 16 8" className={`shrink-0 ${className}`}>
      <line
        x1="1"
        y1="4"
        x2="15"
        y2="4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={kind === 'dashed' ? '4 3' : undefined}
      />
    </svg>
  );
}

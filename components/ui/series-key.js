/**
 * Small swatch identifying a chart series beside its label: a short line for
 * line series (dashed for projections), a filled block for bands.
 */
export default function SeriesKey({ color, kind = 'line', className = '' }) {
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

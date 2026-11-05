/** Small line of a short series; the latest point is marked in the accent colour. */
export default function Sparkline({ series, label, width = 96, height = 28 }) {
  if (!series || series.length < 2) return <span className="inline-block" style={{ width, height }} />;

  const closes = series.map((p) => p.close);
  const min = Math.min(...closes);
  const span = Math.max(...closes) - min || 1;
  const pad = 3;
  const points = closes.map((c, i) => [
    pad + (i / (closes.length - 1)) * (width - pad * 2),
    height - pad - ((c - min) / span) * (height - pad * 2),
  ]);
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="block">
      <polyline
        points={points.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke="var(--muted)"
        strokeOpacity="0.75"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill="var(--series-rate)" />
    </svg>
  );
}

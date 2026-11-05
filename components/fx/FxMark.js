/**
 * FX Tracker mark: a price line opening into a forecast fan. The line takes
 * the current text colour; the fan uses the accent.
 */
export default function FxMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path d="M17 13 L29 4 L29 25 Z" fill="var(--accent)" fillOpacity="0.22" />
      <path d="M17 13 L29 8 L29 20 Z" fill="var(--accent)" fillOpacity="0.45" />
      <path d="M17 13 L29 11 L29 16 Z" fill="var(--accent)" />
      <path
        d="M3 21 L8 16 L12 19 L17 13"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

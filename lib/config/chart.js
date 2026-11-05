/** Date ranges for the price chart. 1Y shows the whole series. */
export const RANGES = [
  { value: '1M', label: '1M', title: 'Last month', months: 1 },
  { value: '3M', label: '3M', title: 'Last 3 months', months: 3 },
  { value: '6M', label: '6M', title: 'Last 6 months', months: 6 },
  { value: 'YTD', label: 'YTD', title: 'Year to date' },
  { value: '1Y', label: '1Y', title: 'Last year' },
];
export const DEFAULT_RANGE = '3M';

/** Optional chart layers. `color` is a CSS colour for the series key. */
export const OVERLAYS = [
  { value: 'sma5', label: '5-day average', color: 'var(--series-short)', kind: 'line' },
  { value: 'sma20', label: '20-day average', color: 'var(--series-long)', kind: 'line' },
  { value: 'bollinger', label: 'Bollinger bands', color: 'var(--series-long)', kind: 'band' },
  { value: 'range', label: '30-day range', color: 'var(--muted)', kind: 'line' },
  { value: 'rsi', label: 'RSI', color: 'var(--series-rate)', kind: 'line' },
];

import { keepPreviousData, useQuery } from '@tanstack/react-query';

const HOUR = 60 * 60 * 1000;

/**
 * Whether a failed request can succeed on another try: a network failure (no status) or the rate provider failing
 * upstream (502, 503, 504). A 500 is a fault in this app's own calculation and fails the same way again, and a
 * 4xx (bad pair, too little data) won't change either.
 */
export function isRetryable(error) {
  return error?.status == null || [502, 503, 504].includes(error.status);
}

/** Fetch JSON from our API routes; errors carry the route's message and status. */
export async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error || `Request failed with HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: ({ signal }) => fetchJson('/api/currencies', { signal }),
    staleTime: 6 * HOUR,
  });
}

export function useLatestRates() {
  return useQuery({
    queryKey: ['latest'],
    queryFn: ({ signal }) => fetchJson('/api/latest', { signal }),
    staleTime: HOUR,
  });
}

/** One year of daily closes. The previous pair stays on screen while the next loads. */
export function useHistory(pair) {
  return useQuery({
    queryKey: ['history', pair],
    queryFn: ({ signal }) => fetchJson(`/api/historical?pair=${encodeURIComponent(pair)}`, { signal }),
    placeholderData: keepPreviousData,
    staleTime: HOUR,
  });
}

/**
 * Forecast and back-test for a pair. Keeps the previous forecast on screen
 * while a new model or horizon loads, but never carries one pair's forecast
 * onto another.
 */
/**
 * Each model's back-test for a pair at each horizon, with the detail for one horizon. Keeps the previous horizon
 * on screen while the next loads, but never carries one pair's results onto another.
 */
export function usePerformance({ pair, horizon }) {
  return useQuery({
    queryKey: ['performance', pair, horizon],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ pair, horizon: String(horizon) });
      return fetchJson(`/api/performance?${params}`, { signal });
    },
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === pair ? previous : undefined,
    staleTime: HOUR,
  });
}

export function useForecast({ pair, algorithm, horizon, enabled = true }) {
  return useQuery({
    queryKey: ['forecast', pair, algorithm, horizon],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ pair, algorithm, horizon: String(horizon) });
      return fetchJson(`/api/forecast?${params}`, { signal });
    },
    enabled,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === pair ? previous : undefined,
    staleTime: HOUR,
  });
}

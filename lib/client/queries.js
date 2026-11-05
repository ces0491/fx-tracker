import { keepPreviousData, useQuery } from '@tanstack/react-query';

const HOUR = 60 * 60 * 1000;

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
 * Forecast for a pair's series. Keeps the previous forecast on screen while a
 * new model or horizon loads, but never carries one pair's forecast onto another.
 */
export function useForecast({ pair, series, algorithm, horizon }) {
  const endDate = series?.[series.length - 1]?.date;
  return useQuery({
    queryKey: ['forecast', pair, endDate, algorithm, horizon],
    queryFn: ({ signal }) =>
      fetchJson('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historicalData: series.map(({ date, close }) => ({ date, close })),
          algorithm,
          forecastDays: horizon,
        }),
        signal,
      }),
    enabled: Boolean(endDate),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === pair ? previous : undefined,
    staleTime: HOUR,
  });
}

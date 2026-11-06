import { RateSourceError, assertSupported, getDailyRates, isoDateDaysAgo, parsePair } from '../data/frankfurter.js';
import { MIN_OBSERVATIONS } from '../forecasting/models.js';

// Three years: a year to fit at each back-test origin, a year of weekly
// origins, and room for the longest horizon after the last one.
export const FORECAST_HISTORY_DAYS = 3 * 365;

/**
 * The daily rates a forecast and its back-test are built from, for a `pair` query parameter such as "NZD/ZAR".
 * Throws a RateSourceError (400, 422 or upstream) the routes pass straight to the client.
 */
export async function loadForecastHistory(pairParam) {
  const pair = parsePair(pairParam);
  if (!pair) {
    throw new RateSourceError('pair must be two different three-letter currency codes, e.g. NZD/ZAR', 400);
  }
  const { base, quote } = pair;
  await assertSupported([base, quote]);
  const series = (await getDailyRates(base, [quote], isoDateDaysAgo(FORECAST_HISTORY_DAYS))).get(quote);
  if (series.length < MIN_OBSERVATIONS) {
    throw new RateSourceError(
      `Only ${series.length} daily rates are available for ${base}/${quote}; at least ${MIN_OBSERVATIONS} are needed`,
      422
    );
  }
  return {
    base,
    quote,
    prices: series.map((p) => p.close),
    dates: series.map((p) => p.date),
  };
}

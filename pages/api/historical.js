// pages/api/historical.js - One year of daily closes for a currency pair
import { RATE_SOURCE } from '../../lib/config/source.js';
import {
  RateSourceError,
  assertSupported,
  getDailyRates,
  isoDateDaysAgo,
  parsePair,
} from '../../lib/data/frankfurter.js';
import { allowGetOnly, sendCached, sendError } from '../../lib/api/responses.js';

const HISTORY_DAYS = 365;
// The 20-day indicators and the forecast models need a few weeks of data.
const MIN_POINTS = 30;

export default async function handler(req, res) {
  if (!allowGetOnly(req, res)) return;

  try {
    const pair = parsePair(req.query.pair);
    if (!pair) {
      throw new RateSourceError('pair must be two different three-letter currency codes, e.g. NZD/ZAR', 400);
    }
    const { base, quote } = pair;

    await assertSupported([base, quote]);

    const series = (await getDailyRates(base, [quote], isoDateDaysAgo(HISTORY_DAYS))).get(quote);
    if (series.length < MIN_POINTS) {
      throw new RateSourceError(
        `Only ${series.length} daily rates are available for ${base}/${quote} in the last year; at least ${MIN_POINTS} are needed`,
        422
      );
    }

    sendCached(res, {
      pair: `${base}/${quote}`,
      source: RATE_SOURCE,
      startDate: series[0].date,
      endDate: series[series.length - 1].date,
      dataPoints: series.length,
      historicalData: series,
    });
  } catch (error) {
    sendError(res, error);
  }
}

// pages/api/latest.js - Latest rate, change on the previous observation and the last
// month of daily rates for the popular pairs
import { POPULAR_PAIRS } from '../../lib/config/pairs.js';
import { RATE_SOURCE } from '../../lib/config/source.js';
import { getCurrencies, getDailyRates, isoDateDaysAgo, parsePair } from '../../lib/data/frankfurter.js';
import { allowGetOnly, sendCached, sendError } from '../../lib/api/responses.js';

// One month of daily rates, returned for the sparklines.
const LOOKBACK_DAYS = 30;

export default async function handler(req, res) {
  if (!allowGetOnly(req, res)) return;

  try {
    const supported = new Set((await getCurrencies()).map((c) => c.code));
    const pairs = POPULAR_PAIRS.map(parsePair).filter(
      (pair) => pair && supported.has(pair.base) && supported.has(pair.quote)
    );

    // One upstream request per base currency.
    const quotesByBase = new Map();
    for (const { base, quote } of pairs) {
      quotesByBase.set(base, [...(quotesByBase.get(base) ?? []), quote]);
    }

    const from = isoDateDaysAgo(LOOKBACK_DAYS);
    const results = await Promise.all(
      [...quotesByBase].map(async ([base, quotes]) => [base, await getDailyRates(base, quotes, from)])
    );

    const rates = {};
    for (const [base, byQuote] of results) {
      for (const [quote, series] of byQuote) {
        const latest = series[series.length - 1];
        const previous = series[series.length - 2];
        if (!latest) continue;
        rates[`${base}/${quote}`] = {
          rate: latest.close,
          date: latest.date,
          previousRate: previous ? previous.close : null,
          previousDate: previous ? previous.date : null,
          changePct: previous ? ((latest.close - previous.close) / previous.close) * 100 : null,
          series,
        };
      }
    }

    sendCached(res, { source: RATE_SOURCE, rates });
  } catch (error) {
    sendError(res, error);
  }
}

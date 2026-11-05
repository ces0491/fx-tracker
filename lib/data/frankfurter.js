/**
 * Frankfurter v2 client (https://frankfurter.dev).
 *
 * Uses Frankfurter's default blended rates: daily mid-market rates combined
 * across the central banks and official sources Frankfurter tracks. Frankfurter
 * states blended rates are free to use. Querying a single provider directly
 * would bring in that provider's own terms, so this module never sets
 * `providers`.
 */

const API_BASE = 'https://api.frankfurter.dev/v2';
const REQUEST_TIMEOUT_MS = 10_000;
const CURRENCY_LIST_TTL_MS = 6 * 60 * 60 * 1000;
const CURRENCY_CODE = /^[A-Z]{3}$/;

/** Error carrying the HTTP status an API route should return. */
export class RateSourceError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'RateSourceError';
    this.status = status;
  }
}

async function request(path) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error?.name === 'TimeoutError' ? 'timed out' : 'could not be reached';
    throw new RateSourceError(`The rate provider ${reason}`, 502);
  }

  if (response.ok) {
    return response.json();
  }

  let detail = '';
  try {
    detail = (await response.json())?.message ?? '';
  } catch {
    // Non-JSON error body; fall through with the status code only.
  }

  if (response.status === 400 || response.status === 422) {
    throw new RateSourceError(detail ? `Rate provider rejected the request: ${detail}` : 'Invalid rate request', 400);
  }
  if (response.status === 404) {
    throw new RateSourceError('No rates found for this request', 404);
  }
  throw new RateSourceError(`The rate provider returned HTTP ${response.status}`, 502);
}

function expectArray(body) {
  if (!Array.isArray(body)) {
    throw new RateSourceError('Unexpected response from the rate provider', 502);
  }
  return body;
}

/** ISO date (YYYY-MM-DD, UTC) for `days` days before now. */
export function isoDateDaysAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Parse "BASE/QUOTE" into upper-case codes. Returns null unless both parts
 * are three-letter codes and differ.
 */
export function parsePair(value) {
  if (typeof value !== 'string') return null;
  const parts = value.trim().toUpperCase().split('/');
  if (parts.length !== 2) return null;
  const [base, quote] = parts;
  if (!CURRENCY_CODE.test(base) || !CURRENCY_CODE.test(quote) || base === quote) return null;
  return { base, quote };
}

let currencyCache = null;

/**
 * Active ISO 4217 currencies Frankfurter publishes, sorted by code.
 * Entries without an ISO numeric code (crypto-assets and a few unofficial
 * codes) are excluded.
 */
export async function getCurrencies() {
  if (currencyCache && currencyCache.expires > Date.now()) {
    return currencyCache.list;
  }

  const rows = expectArray(await request('/currencies'));
  const list = rows
    .filter((row) => row.iso_numeric && CURRENCY_CODE.test(row.iso_code))
    .map((row) => ({ code: row.iso_code, name: row.name }))
    .sort((a, b) => a.code.localeCompare(b.code));

  if (list.length === 0) {
    throw new RateSourceError('The rate provider returned no currencies', 502);
  }

  currencyCache = { list, expires: Date.now() + CURRENCY_LIST_TTL_MS };
  return list;
}

/** Throws a 400 RateSourceError naming any code not in getCurrencies(). */
export async function assertSupported(codes) {
  const supported = new Set((await getCurrencies()).map((c) => c.code));
  const unsupported = [...new Set(codes)].filter((code) => !supported.has(code));
  if (unsupported.length > 0) {
    throw new RateSourceError(`Unsupported currency: ${unsupported.join(', ')}`, 400);
  }
}

/**
 * Daily rates for each quote against `base` from `from` (YYYY-MM-DD) to the
 * latest available date. Returns a Map of quote -> [{ date, close }] sorted
 * by date.
 */
export async function getDailyRates(base, quotes, from) {
  const params = new URLSearchParams({ base, quotes: quotes.join(','), from });
  const rows = expectArray(await request(`/rates?${params}`));

  const byQuote = new Map(quotes.map((quote) => [quote, []]));
  for (const row of rows) {
    const series = byQuote.get(row.quote);
    if (series && row.base === base && Number.isFinite(row.rate) && row.rate > 0) {
      series.push({ date: row.date, close: row.rate });
    }
  }
  for (const series of byQuote.values()) {
    series.sort((a, b) => a.date.localeCompare(b.date));
  }
  return byQuote;
}

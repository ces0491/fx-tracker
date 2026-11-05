import { RateSourceError } from '../data/frankfurter.js';

/**
 * CDN caching for rate responses. Frankfurter publishes daily, but blended
 * rates can be revised during the day as more sources report, so the edge
 * copy is refreshed hourly and a stale copy may be served for up to a day
 * while it revalidates.
 */
const RATE_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';

export function allowGetOnly(req, res) {
  if (req.method === 'GET') return true;
  res.setHeader('Allow', 'GET');
  res.status(405).json({ error: 'Method not allowed' });
  return false;
}

export function sendCached(res, body) {
  res.setHeader('Cache-Control', RATE_CACHE_CONTROL);
  res.status(200).json(body);
}

export function sendError(res, error) {
  res.setHeader('Cache-Control', 'no-store');
  if (error instanceof RateSourceError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error' });
}

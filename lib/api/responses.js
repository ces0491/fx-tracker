import { RateSourceError } from '../data/frankfurter.js';

/**
 * Caching for rate responses. Frankfurter publishes daily, but blended rates
 * can be revised during the day as more sources report, so Vercel's CDN
 * refreshes its copy hourly and may serve a stale copy for up to a day while
 * it revalidates. Browsers get no stale-while-revalidate: they check back
 * every time, so a returning visitor never sees yesterday's rate from their
 * own cache.
 */
const CDN_CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';
const BROWSER_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

export function allowGetOnly(req, res) {
  if (req.method === 'GET') return true;
  res.setHeader('Allow', 'GET');
  res.status(405).json({ error: 'Method not allowed' });
  return false;
}

export function sendCached(res, body) {
  res.setHeader('Vercel-CDN-Cache-Control', CDN_CACHE_CONTROL);
  res.setHeader('Cache-Control', BROWSER_CACHE_CONTROL);
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

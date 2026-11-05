// pages/api/currencies.js - Currencies available from the rate source
import { RATE_SOURCE } from '../../lib/config/source.js';
import { getCurrencies } from '../../lib/data/frankfurter.js';
import { allowGetOnly, sendCached, sendError } from '../../lib/api/responses.js';

export default async function handler(req, res) {
  if (!allowGetOnly(req, res)) return;

  try {
    sendCached(res, { source: RATE_SOURCE, currencies: await getCurrencies() });
  } catch (error) {
    sendError(res, error);
  }
}

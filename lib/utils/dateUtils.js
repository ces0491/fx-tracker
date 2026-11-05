/**
 * Date utility functions. Rate dates are calendar dates (YYYY-MM-DD) parsed
 * as UTC midnight, so arithmetic is done in UTC to avoid daylight-saving
 * shifts in the server's local time zone.
 */

/**
 * Add days to date
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Format ISO date string (YYYY-MM-DD)
 */
export function formatISODate(date) {
  return date.toISOString().split('T')[0];
}

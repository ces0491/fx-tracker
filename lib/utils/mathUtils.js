/**
 * Observations per year implied by a dated series (YYYY-MM-DD strings,
 * ascending), used to annualise per-observation volatility. A calendar-daily
 * series gives about 365, a weekday-only series about 261.
 */
export function observationsPerYear(dates) {
  if (dates.length < 2) return NaN;
  const spanDays = (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86_400_000;
  return spanDays > 0 ? ((dates.length - 1) * 365.25) / spanDays : NaN;
}

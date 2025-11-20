/**
 * Date utility functions
 */

/**
 * Calculate time ago from date string
 */
export function getTimeAgo(dateString) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;

    if (diffMs < 0) return 'Just now';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  } catch (error) {
    return 'Recently';
  }
}

/**
 * Format date for chart display
 */
export function formatDateForChart(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get next business day
 */
export function getNextBusinessDay(date, dayOfWeek) {
  const result = new Date(date);
  const daysUntilTarget = (dayOfWeek + 7 - result.getDay()) % 7;
  result.setDate(result.getDate() + (daysUntilTarget || 7));
  return result.toISOString().split('T')[0];
}

/**
 * Get date for specific day in future month
 */
export function getNextMonthDate(date, dayOfMonth, monthOffset = 1) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + monthOffset);
  result.setDate(dayOfMonth);
  return result.toISOString().split('T')[0];
}

/**
 * Add days to date
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format ISO date string (YYYY-MM-DD)
 */
export function formatISODate(date) {
  return date.toISOString().split('T')[0];
}

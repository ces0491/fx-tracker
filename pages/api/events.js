// pages/api/events.js - Upcoming economic events
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // You can fetch from an economic calendar API or maintain your own events
    // For now, return a dynamic list based on current date
    const now = new Date();
    const futureEvents = [
      {
        title: 'SARB MPC Meeting',
        date: getNextBusinessDay(now, 5), // Next Monday if today is not Monday
        importance: 'high',
        currency: 'ZAR'
      },
      {
        title: 'RBNZ Rate Decision',
        date: getNextMonthDate(now, 14), // 14th of next month
        importance: 'high',
        currency: 'NZD'
      },
      {
        title: 'SA CPI Data',
        date: getNextMonthDate(now, 21), // 21st of next month
        importance: 'medium',
        currency: 'ZAR'
      },
      {
        title: 'NZ GDP Release',
        date: getNextMonthDate(now, 19, 2), // 19th of month after next
        importance: 'medium',
        currency: 'NZD'
      }
    ].filter(event => new Date(event.date) > now);

    res.status(200).json({ events: futureEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}

// Helper functions for dynamic date generation
function getNextBusinessDay(date, dayOfWeek) {
  const result = new Date(date);
  const daysUntilTarget = (dayOfWeek + 7 - result.getDay()) % 7;
  result.setDate(result.getDate() + (daysUntilTarget || 7));
  return result.toISOString().split('T')[0];
}

function getNextMonthDate(date, dayOfMonth, monthOffset = 1) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + monthOffset);
  result.setDate(dayOfMonth);
  return result.toISOString().split('T')[0];
}
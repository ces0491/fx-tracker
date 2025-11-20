// pages/api/events.js - Upcoming economic events from real calendar APIs
import { getCurrencyCode, mapImportance } from '../../lib/utils/textUtils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try multiple economic calendar APIs
    const calendarApis = [
      {
        name: 'TradingEconomics',
        fetch: async () => {
          const TE_API_KEY = process.env.TRADING_ECONOMICS_API_KEY;
          if (!TE_API_KEY) throw new Error('TRADING_ECONOMICS_API_KEY not configured');

          const countries = 'new zealand,south africa,united states,eurozone';
          const url = `https://api.tradingeconomics.com/calendar/country/${encodeURIComponent(countries)}?c=${TE_API_KEY}&format=json`;

          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          if (!data || !Array.isArray(data)) throw new Error('Invalid response format');

          const now = new Date();
          return data
            .filter(event => new Date(event.Date) > now)
            .map(event => ({
              title: event.Event,
              date: event.Date,
              impact: mapImportance(event.Importance),
              currency: getCurrencyCode(event.Country),
              actual: event.Actual,
              forecast: event.Forecast,
              previous: event.Previous
            }))
            .slice(0, 10);
        }
      },
      {
        name: 'ForexFactory Calendar Scraper',
        fetch: async () => {
          // Use a forex calendar RSS/JSON endpoint
          const url = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          if (!data || !Array.isArray(data)) throw new Error('Invalid response format');

          const now = new Date();
          const relevantCurrencies = ['USD', 'EUR', 'GBP', 'NZD', 'ZAR', 'AUD', 'CAD', 'JPY'];

          return data
            .filter(event => {
              const eventDate = new Date(event.date);
              return eventDate > now && relevantCurrencies.includes(event.country);
            })
            .map(event => ({
              title: event.title,
              date: event.date,
              impact: event.impact?.toLowerCase() || 'medium',
              currency: event.country,
              forecast: event.forecast,
              previous: event.previous
            }))
            .slice(0, 10);
        }
      },
      {
        name: 'Static Economic Calendar',
        fetch: async () => {
          // Generate known recurring economic events for the next 3 months
          const now = new Date();
          const events = [];

          // US Federal Reserve FOMC Meetings (typically 8 times per year)
          const fomc2025 = [
            { month: 0, day: 28, year: 2025 },
            { month: 2, day: 18, year: 2025 },
            { month: 4, day: 6, year: 2025 },
            { month: 5, day: 17, year: 2025 },
            { month: 6, day: 29, year: 2025 },
            { month: 8, day: 16, year: 2025 },
            { month: 10, day: 4, year: 2025 },
            { month: 11, day: 16, year: 2025 }
          ];

          fomc2025.forEach(({ month, day, year }) => {
            const eventDate = new Date(year, month, day);
            if (eventDate > now && eventDate < new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)) {
              events.push({
                title: 'Federal Reserve FOMC Meeting',
                date: eventDate.toISOString(),
                impact: 'high',
                currency: 'USD'
              });
            }
          });

          // ECB Governing Council Meetings (typically every 6 weeks)
          const ecbBase = new Date(2025, 0, 30); // Jan 30, 2025
          for (let i = 0; i < 6; i++) {
            const eventDate = new Date(ecbBase);
            eventDate.setDate(ecbBase.getDate() + (i * 42)); // Every 6 weeks
            if (eventDate > now && eventDate < new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)) {
              events.push({
                title: 'ECB Governing Council Meeting',
                date: eventDate.toISOString(),
                impact: 'high',
                currency: 'EUR'
              });
            }
          }

          // RBNZ Official Cash Rate Decisions (quarterly)
          const rbnz2025 = [
            { month: 1, day: 19, year: 2025 },
            { month: 3, day: 9, year: 2025 },
            { month: 4, day: 28, year: 2025 },
            { month: 6, day: 9, year: 2025 },
            { month: 7, day: 20, year: 2025 },
            { month: 9, day: 8, year: 2025 },
            { month: 10, day: 26, year: 2025 }
          ];

          rbnz2025.forEach(({ month, day, year }) => {
            const eventDate = new Date(year, month, day);
            if (eventDate > now && eventDate < new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)) {
              events.push({
                title: 'RBNZ Official Cash Rate Decision',
                date: eventDate.toISOString(),
                impact: 'high',
                currency: 'NZD'
              });
            }
          });

          // SARB MPC Meetings (6 times per year)
          const sarb2025 = [
            { month: 0, day: 30, year: 2025 },
            { month: 2, day: 27, year: 2025 },
            { month: 4, day: 22, year: 2025 },
            { month: 6, day: 24, year: 2025 },
            { month: 8, day: 18, year: 2025 },
            { month: 10, day: 20, year: 2025 }
          ];

          sarb2025.forEach(({ month, day, year }) => {
            const eventDate = new Date(year, month, day);
            if (eventDate > now && eventDate < new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)) {
              events.push({
                title: 'SARB Monetary Policy Committee Meeting',
                date: eventDate.toISOString(),
                impact: 'high',
                currency: 'ZAR'
              });
            }
          });

          // Monthly CPI releases (typically mid-month)
          for (let i = 0; i < 3; i++) {
            const eventDate = new Date(now);
            eventDate.setMonth(now.getMonth() + i + 1);
            eventDate.setDate(15);

            if (eventDate > now) {
              events.push(
                {
                  title: 'US CPI Release',
                  date: new Date(eventDate.getTime()).toISOString(),
                  impact: 'high',
                  currency: 'USD'
                },
                {
                  title: 'South Africa CPI Release',
                  date: new Date(eventDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // +5 days
                  impact: 'medium',
                  currency: 'ZAR'
                },
                {
                  title: 'New Zealand CPI Release',
                  date: new Date(eventDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days
                  impact: 'medium',
                  currency: 'NZD'
                }
              );
            }
          }

          // Sort by date
          events.sort((a, b) => new Date(a.date) - new Date(b.date));

          return events.slice(0, 10);
        }
      }
    ];

    // Try each API
    for (const api of calendarApis) {
      try {
        console.log(`Trying ${api.name} for economic events...`);
        const events = await api.fetch();
        console.log(`Successfully fetched events from ${api.name}`);

        return res.status(200).json({
          events,
          source: api.name,
          lastUpdated: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Failed to fetch from ${api.name}:`, error.message);
        continue;
      }
    }

    // If all APIs fail
    throw new Error('All economic calendar APIs failed');

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch events',
      events: []
    });
  }
}
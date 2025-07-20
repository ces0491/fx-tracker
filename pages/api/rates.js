// pages/api/rates.js - Real-time exchange rates
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/USD`);
    const data = await response.json();
    
    if (data && data.conversion_rates) {
      // Calculate cross rates for all currency combinations
      const currencies = [
        'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'ZAR', 
        'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'RUB', 'CNY', 
        'HKD', 'SGD', 'KRW', 'INR', 'BRL', 'MXN', 'THB', 'MYR'
      ];

      const crossRates = {};
      
      currencies.forEach(base => {
        currencies.forEach(quote => {
          if (base !== quote) {
            let rate;
            if (base === 'USD') {
              rate = data.conversion_rates[quote];
            } else if (quote === 'USD') {
              rate = 1 / data.conversion_rates[base];
            } else {
              const baseRate = data.conversion_rates[base];
              const quoteRate = data.conversion_rates[quote];
              if (baseRate && quoteRate) {
                rate = quoteRate / baseRate;
              }
            }
            if (rate && !isNaN(rate) && rate > 0) {
              crossRates[`${base}/${quote}`] = rate;
            }
          }
        });
      });

      res.status(200).json({ 
        rates: crossRates,
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('Invalid response from exchange rate API');
    }
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
}
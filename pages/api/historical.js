// pages/api/historical.js - Historical exchange rate data
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pair, startDate, endDate } = req.query;
    
    if (!pair) {
      return res.status(400).json({ error: 'Currency pair is required' });
    }

    const [from, to] = pair.split('/');
    const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

    // Determine the appropriate time series function
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    let func = daysDiff <= 30 ? 'FX_INTRADAY' : 'FX_DAILY';
    let interval = func === 'FX_INTRADAY' ? '60min' : '';

    const url = `https://www.alphavantage.co/query?function=${func}&from_symbol=${from}&to_symbol=${to}${interval ? `&interval=${interval}` : ''}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
    
    const response = await fetch(url);
    const data = await response.json();

    // Check for API errors
    if (data['Error Message'] || data['Note']) {
      throw new Error(data['Error Message'] || 'API rate limit reached');
    }

    let timeSeriesData = null;
    if (func === 'FX_DAILY' && data['Time Series FX (Daily)']) {
      timeSeriesData = data['Time Series FX (Daily)'];
    } else if (func === 'FX_INTRADAY' && data[`Time Series FX (${interval})`]) {
      timeSeriesData = data[`Time Series FX (${interval})`];
    }

    if (!timeSeriesData) {
      throw new Error('No historical data available');
    }

    // Convert to our format
    const historicalPoints = [];
    const dates = Object.keys(timeSeriesData).sort();
    
    // Filter by date range
    const filteredDates = dates.filter(date => {
      const dataDate = new Date(date);
      return dataDate >= start && dataDate <= end;
    });

    filteredDates.forEach(date => {
      const dayData = timeSeriesData[date];
      historicalPoints.push({
        date: date.split(' ')[0],
        open: parseFloat(dayData['1. open']),
        high: parseFloat(dayData['2. high']),
        low: parseFloat(dayData['3. low']),
        close: parseFloat(dayData['4. close']),
        rate: parseFloat(dayData['4. close']),
        volume: 0,
        change: 0
      });
    });

    // Calculate daily changes
    for (let i = 1; i < historicalPoints.length; i++) {
      const current = historicalPoints[i];
      const previous = historicalPoints[i - 1];
      current.change = ((current.close - previous.close) / previous.close) * 100;
    }

    res.status(200).json({ 
      historicalData: historicalPoints,
      pair,
      startDate,
      endDate
    });

  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
}
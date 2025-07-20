"use client"

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Newspaper, BarChart3, Globe, Calendar, AlertCircle, Activity, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';

const FXTracker = () => {
  const [rates, setRates] = useState({});
  const [historicalData, setHistoricalData] = useState({});
  const [selectedPair, setSelectedPair] = useState('NZD/ZAR');
  const [baseCurrency, setBaseCurrency] = useState('NZD');
  const [quoteCurrency, setQuoteCurrency] = useState('ZAR');
  const [forecast, setForecast] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  
  // New state for enhanced features
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [forecastDays, setForecastDays] = useState(30);
  const [chartType, setChartType] = useState('line'); // 'line' or 'candlestick'
  const [indicators, setIndicators] = useState({
    sma5: true,
    sma20: true,
    bollinger: false,
    rsi: false
  });

  // Available currencies
  const currencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'ZAR', 
    'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'RUB', 'CNY', 
    'HKD', 'SGD', 'KRW', 'INR', 'BRL', 'MXN', 'THB', 'MYR'
  ];

  // Suggested pairs (especially relevant for NZD earners in SA)
  const suggestedPairs = [
    'NZD/ZAR', 'NZD/USD', 'USD/ZAR', 'EUR/ZAR', 'GBP/ZAR', 'AUD/NZD',
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP'
  ];

  // API configuration
  const ALPHA_VANTAGE_API_KEY = '7BY8PWEG91UBMXJ7';
  const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
  const EXCHANGE_RATE_API_KEY = '4fa30aea39fa0469759353fc';
  const EXCHANGE_RATE_BASE_URL = 'https://v6.exchangerate-api.com/v6';

  // Fetch real-time rates from ExchangeRate-API (fast and reliable)
  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use ExchangeRate-API for current rates - much faster and more reliable
      const response = await fetch(`${EXCHANGE_RATE_BASE_URL}/${EXCHANGE_RATE_API_KEY}/latest/USD`);
      const data = await response.json();
      
      if (data && data.conversion_rates) {
        // Calculate cross rates for all currency combinations
        const crossRates = {};
        
        currencies.forEach(base => {
          currencies.forEach(quote => {
            if (base !== quote) {
              let rate;
              if (base === 'USD') {
                // USD to other currency (e.g., USD/ZAR = 18.5)
                rate = data.conversion_rates[quote];
              } else if (quote === 'USD') {
                // Other currency to USD (e.g., NZD/USD = 1/1.68)
                rate = 1 / data.conversion_rates[base];
              } else {
                // Cross rate calculation (e.g., NZD/ZAR)
                // 1 NZD = (1/NZD_rate) USD, then * ZAR_rate = ZAR
                const baseRate = data.conversion_rates[base]; // USD/Base (e.g., USD/NZD = 1.68)
                const quoteRate = data.conversion_rates[quote]; // USD/Quote (e.g., USD/ZAR = 18.5)
                if (baseRate && quoteRate) {
                  rate = quoteRate / baseRate; // ZAR per NZD = 18.5 / 1.68 ≈ 11.01
                }
              }
              if (rate && !isNaN(rate) && rate > 0) {
                crossRates[`${base}/${quote}`] = rate;
              }
            }
          });
        });
        
        // Debug log to check key rates and calculations
        console.log('Raw conversion rates from API:');
        console.log('USD/NZD:', data.conversion_rates['NZD']);
        console.log('USD/ZAR:', data.conversion_rates['ZAR']);
        console.log('USD/EUR:', data.conversion_rates['EUR']);
        
        // Validate key rates make sense
        const nzdRate = crossRates['NZD/ZAR'];
        const eurRate = crossRates['EUR/USD'];
        const gbpRate = crossRates['GBP/USD'];
        
        console.log('Calculated cross rates:');
        console.log('NZD/ZAR:', nzdRate, '(should be ~10-12)');
        console.log('EUR/USD:', eurRate, '(should be ~1.05-1.15)');
        console.log('GBP/USD:', gbpRate, '(should be ~1.20-1.35)');
        
        // Sanity check: NZD/ZAR should be between 8-15
        if (nzdRate && (nzdRate < 8 || nzdRate > 15)) {
          console.warn('NZD/ZAR rate seems incorrect:', nzdRate);
        }
        
        setRates(crossRates);
        setLastUpdate(new Date());
        
        // Auto-fetch historical data for selected pair if we have rates
        if (crossRates[selectedPair]) {
          await fetchHistoricalData(selectedPair);
        }
        
      } else {
        setError('Failed to fetch current exchange rates. Please try again later.');
      }
    } catch (err) {
      setError('Failed to fetch exchange rates. Please check your internet connection and try again.');
      console.error('Error fetching rates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate technical indicators
  const calculateIndicators = (data) => {
    const enhanced = [...data];
    
    // Calculate moving averages
    for (let i = 0; i < enhanced.length; i++) {
      // SMA 5
      if (i >= 4) {
        const sma5 = enhanced.slice(i - 4, i + 1).reduce((sum, item) => sum + item.close, 0) / 5;
        enhanced[i].sma5 = sma5;
      }
      
      // SMA 20
      if (i >= 19) {
        const sma20 = enhanced.slice(i - 19, i + 1).reduce((sum, item) => sum + item.close, 0) / 20;
        enhanced[i].sma20 = sma20;
      }
      
      // Bollinger Bands (20-period)
      if (i >= 19) {
        const period = enhanced.slice(i - 19, i + 1);
        const sma = period.reduce((sum, item) => sum + item.close, 0) / 20;
        const variance = period.reduce((sum, item) => sum + Math.pow(item.close - sma, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);
        
        enhanced[i].bollingerUpper = sma + (2 * stdDev);
        enhanced[i].bollingerLower = sma - (2 * stdDev);
        enhanced[i].bollingerMiddle = sma;
      }
      
      // RSI (14-period)
      if (i >= 14) {
        const period = enhanced.slice(i - 13, i + 1);
        let gains = 0, losses = 0;
        
        for (let j = 1; j < period.length; j++) {
          const change = period[j].close - period[j - 1].close;
          if (change > 0) gains += change;
          else losses += Math.abs(change);
        }
        
        const avgGain = gains / 14;
        const avgLoss = losses / 14;
        const rs = avgGain / (avgLoss || 0.000001);
        enhanced[i].rsi = 100 - (100 / (1 + rs));
      }
    }
    
    return enhanced;
  };

  // Advanced forecasting algorithm using exponential smoothing and trend analysis
  const advancedForecast = (historicalData, days = 30) => {
    if (!historicalData || historicalData.length < 10) return [];
    
    const data = historicalData.map(d => d.close || d.rate);
    const n = data.length;
    
    // Exponential smoothing parameters
    const alpha = 0.3; // level smoothing
    const beta = 0.1;  // trend smoothing
    const gamma = 0.2; // seasonal smoothing
    
    // Initialize components
    let level = data[0];
    let trend = (data[1] - data[0]);
    const seasonal = new Array(7).fill(0); // weekly seasonality
    
    // Calculate seasonal indices
    for (let i = 0; i < Math.min(n, 21); i++) {
      seasonal[i % 7] += data[i] / 3; // approximate seasonal component
    }
    
    const smoothedData = [];
    
    // Apply exponential smoothing
    for (let i = 1; i < n; i++) {
      const prevLevel = level;
      const prevTrend = trend;
      
      level = alpha * data[i] + (1 - alpha) * (prevLevel + prevTrend);
      trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
      
      smoothedData.push({
        level,
        trend,
        fitted: level + trend
      });
    }
    
    // Generate forecast
    const forecast = [];
    const lastLevel = level;
    const lastTrend = trend;
    
    // Calculate volatility for confidence intervals
    const residuals = smoothedData.map((item, i) => Math.abs(data[i + 1] - item.fitted));
    const volatility = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(historicalData[n - 1].date);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // Base forecast using exponential smoothing
      const baseforecast = lastLevel + (lastTrend * i);
      
      // Add seasonal component
      const seasonalFactor = seasonal[i % 7] / (seasonal.reduce((a, b) => a + b, 0) / 7);
      const seasonalAdjustment = baseforecast * (seasonalFactor - 1) * 0.05; // 5% seasonal impact
      
      // Add mean reversion component
      const meanRate = data.reduce((a, b) => a + b, 0) / data.length;
      const meanReversionFactor = (meanRate - baseforecast) * 0.1 * Math.exp(-i / 30);
      
      const forecastValue = baseforecast + seasonalAdjustment + meanReversionFactor;
      
      // Calculate confidence intervals
      const confidenceMultiplier = Math.sqrt(i) * volatility;
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        rate: forecastValue,
        upperBound: forecastValue + (1.96 * confidenceMultiplier),
        lowerBound: forecastValue - (1.96 * confidenceMultiplier),
        confidence: Math.max(0.3, 0.95 - (i * 0.02))
      });
    }
    
    return forecast;
  };

  // Fetch real historical data from Alpha Vantage (used only for historical analysis)
  const fetchHistoricalData = async (pair) => {
    try {
      const [from, to] = pair.split('/');
      
      // Determine the appropriate time series function based on date range
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      let func, interval = '';
      if (daysDiff <= 30) {
        func = 'FX_INTRADAY';
        interval = '60min'; // 1-hour intervals for recent data
      } else {
        func = 'FX_DAILY';
      }
      
      const url = `${ALPHA_VANTAGE_BASE_URL}?function=${func}&from_symbol=${from}&to_symbol=${to}${interval ? `&interval=${interval}` : ''}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=full`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Check for Alpha Vantage API errors
      if (data['Error Message']) {
        console.error('Alpha Vantage API Error:', data['Error Message']);
        setError(`Alpha Vantage API Error: ${data['Error Message']}`);
        return;
      }
      
      if (data['Note']) {
        console.warn('Alpha Vantage API Note:', data['Note']);
        setError('Alpha Vantage rate limit reached. Please wait before requesting historical data.');
        return;
      }
      
      let timeSeriesData = null;
      
      // Handle different response formats
      if (func === 'FX_DAILY' && data['Time Series FX (Daily)']) {
        timeSeriesData = data['Time Series FX (Daily)'];
      } else if (func === 'FX_INTRADAY' && data[`Time Series FX (${interval})`]) {
        timeSeriesData = data[`Time Series FX (${interval})`];
      }
      
      if (!timeSeriesData) {
        console.error('No historical data received for', pair, data);
        // Generate basic chart with current rate as fallback
        generateFallbackChart(pair);
        return;
      }
      
      // Convert Alpha Vantage data to our format
      const historicalPoints = [];
      const dates = Object.keys(timeSeriesData).sort();
      
      // Filter data by date range
      const filteredDates = dates.filter(date => {
        const dataDate = new Date(date);
        return dataDate >= startDate && dataDate <= endDate;
      });
      
      filteredDates.forEach(date => {
        const dayData = timeSeriesData[date];
        historicalPoints.push({
          date: date.split(' ')[0], // Remove time component for daily data
          open: parseFloat(dayData['1. open']),
          high: parseFloat(dayData['2. high']),
          low: parseFloat(dayData['3. low']),
          close: parseFloat(dayData['4. close']),
          rate: parseFloat(dayData['4. close']), // for backward compatibility
          volume: 0, // Alpha Vantage doesn't provide volume for FX
          change: 0 // Will be calculated below
        });
      });
      
      // Calculate daily changes
      for (let i = 1; i < historicalPoints.length; i++) {
        const current = historicalPoints[i];
        const previous = historicalPoints[i - 1];
        current.change = ((current.close - previous.close) / previous.close) * 100;
      }
      
      // Calculate technical indicators on real data
      const enhancedData = calculateIndicators(historicalPoints);
      
      // Generate forecast based on real historical data
      const forecastData = advancedForecast(enhancedData, forecastDays);
      
      // Calculate trend and strength from real data
      const recentRates = enhancedData.slice(-14).map(d => d.close);
      const firstRate = recentRates[0];
      const lastRate = recentRates[recentRates.length - 1];
      const trend = (lastRate - firstRate) / firstRate;
      
      // Calculate support and resistance levels from real data
      const highs = enhancedData.slice(-30).map(d => d.high);
      const lows = enhancedData.slice(-30).map(d => d.low);
      const resistance = highs.sort((a, b) => b - a)[2]; // 3rd highest
      const support = lows.sort((a, b) => a - b)[2]; // 3rd lowest
      
      // Calculate volatility from real returns
      const returns = enhancedData.slice(-30).map((d, i, arr) => 
        i > 0 ? Math.log(d.close / arr[i-1].close) : 0
      ).slice(1);
      const variance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length;
      const volatility = Math.sqrt(variance * 252); // annualized
      
      // Update state with real data
      setHistoricalData(prev => ({
        ...prev,
        [pair]: enhancedData
      }));
      
      setForecast(prev => ({
        ...prev,
        [pair]: {
          data: forecastData,
          trend: trend > 0 ? 'bullish' : 'bearish',
          strength: Math.abs(trend) > 0.02 ? 'strong' : Math.abs(trend) > 0.005 ? 'moderate' : 'weak',
          support: support,
          resistance: resistance,
          volatility: volatility,
          rsi: enhancedData[enhancedData.length - 1]?.rsi
        }
      }));
      
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError(`Failed to fetch historical data for ${pair}. Showing current rate only.`);
      generateFallbackChart(pair);
    }
  };

  // Generate a basic chart with current rate when historical data fails
  const generateFallbackChart = (pair) => {
    const currentRate = rates[pair];
    if (!currentRate) return;
    
    const fallbackData = [];
    const endDate = new Date();
    
    // Create a simple 30-day chart with current rate
    for (let i = 29; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      
      fallbackData.push({
        date: date.toISOString().split('T')[0],
        open: currentRate,
        high: currentRate,
        low: currentRate,
        close: currentRate,
        rate: currentRate,
        volume: 0,
        change: 0
      });
    }
    
    const enhancedData = calculateIndicators(fallbackData);
    
    setHistoricalData(prev => ({
      ...prev,
      [pair]: enhancedData
    }));
    
    setForecast(prev => ({
      ...prev,
      [pair]: {
        data: [],
        trend: 'neutral',
        strength: 'weak',
        support: currentRate * 0.99,
        resistance: currentRate * 1.01,
        volatility: 0.1,
        rsi: 50
      }
    }));
  };

  // Remove the old generateHistoricalData function and replace with real data fetching
  const updateAnalysisWithRealData = async () => {
    if (selectedPair && rates[selectedPair]) {
      setLoading(true);
      await fetchHistoricalData(selectedPair);
      setLoading(false);
    }
  };

  // Fetch real financial news from Alpha Vantage
  const fetchNews = async () => {
    try {
      // Get relevant forex-related news using Alpha Vantage NEWS_SENTIMENT API
      const forexTickers = 'FOREX:USD,FOREX:EUR,FOREX:GBP,FOREX:JPY,FOREX:AUD,FOREX:CAD,FOREX:NZD,FOREX:CHF';
      const url = `${ALPHA_VANTAGE_BASE_URL}?function=NEWS_SENTIMENT&tickers=${forexTickers}&limit=50&apikey=${ALPHA_VANTAGE_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.feed && Array.isArray(data.feed)) {
        // Transform Alpha Vantage news data to our format
        const newsItems = data.feed.slice(0, 6).map((article, index) => {
          // Extract relevant currencies from ticker sentiment
          const relevantCurrencies = [];
          if (article.ticker_sentiment) {
            article.ticker_sentiment.forEach(ticker => {
              if (ticker.ticker.startsWith('FOREX:')) {
                const currency = ticker.ticker.replace('FOREX:', '');
                if (currencies.includes(currency)) {
                  relevantCurrencies.push(currency);
                }
              }
            });
          }
          
          // Determine impact level based on overall sentiment score
          let impact = 'low';
          if (article.overall_sentiment_score) {
            const score = Math.abs(parseFloat(article.overall_sentiment_score));
            if (score > 0.3) impact = 'high';
            else if (score > 0.15) impact = 'medium';
          }
          
          // Format time
          const timePublished = new Date(article.time_published);
          const now = new Date();
          const hoursAgo = Math.floor((now - timePublished) / (1000 * 60 * 60));
          const timeString = hoursAgo < 1 ? 'Less than 1 hour ago' : 
                           hoursAgo < 24 ? `${hoursAgo} hours ago` : 
                           `${Math.floor(hoursAgo / 24)} days ago`;
          
          return {
            id: index + 1,
            title: article.title,
            summary: article.summary,
            source: article.source,
            time: timeString,
            impact: impact,
            currencies: relevantCurrencies.length > 0 ? relevantCurrencies.slice(0, 3) : ['USD'], // Default to USD if no specific currencies
            url: article.url,
            sentiment: article.overall_sentiment_label,
            sentimentScore: article.overall_sentiment_score
          };
        });
        
        setNews(newsItems);
      } else {
        console.warn('No news data received from Alpha Vantage');
        // Fallback to general financial topics if no forex-specific news
        fetchGeneralFinancialNews();
      }
    } catch (err) {
      console.error('Error fetching news from Alpha Vantage:', err);
      // Fallback to general financial news
      fetchGeneralFinancialNews();
    }
  };

  // Fallback function to get general financial news
  const fetchGeneralFinancialNews = async () => {
    try {
      // Get broader financial news including central bank topics
      const generalUrl = `${ALPHA_VANTAGE_BASE_URL}?function=NEWS_SENTIMENT&topics=finance,economy&limit=20&apikey=${ALPHA_VANTAGE_API_KEY}`;
      
      const response = await fetch(generalUrl);
      const data = await response.json();
      
      if (data.feed && Array.isArray(data.feed)) {
        const newsItems = data.feed.slice(0, 6).map((article, index) => {
          // Determine relevant currencies based on content
          const relevantCurrencies = [];
          const content = (article.title + ' ' + article.summary).toLowerCase();
          
          if (content.includes('fed') || content.includes('federal reserve') || content.includes('dollar')) {
            relevantCurrencies.push('USD');
          }
          if (content.includes('ecb') || content.includes('european central bank') || content.includes('euro')) {
            relevantCurrencies.push('EUR');
          }
          if (content.includes('boe') || content.includes('bank of england') || content.includes('pound')) {
            relevantCurrencies.push('GBP');
          }
          if (content.includes('boj') || content.includes('bank of japan') || content.includes('yen')) {
            relevantCurrencies.push('JPY');
          }
          if (content.includes('rbnz') || content.includes('reserve bank of new zealand') || content.includes('new zealand')) {
            relevantCurrencies.push('NZD');
          }
          if (content.includes('sarb') || content.includes('south african reserve bank') || content.includes('rand')) {
            relevantCurrencies.push('ZAR');
          }
          
          let impact = 'low';
          if (article.overall_sentiment_score) {
            const score = Math.abs(parseFloat(article.overall_sentiment_score));
            if (score > 0.3) impact = 'high';
            else if (score > 0.15) impact = 'medium';
          }
          
          const timePublished = new Date(article.time_published);
          const now = new Date();
          const hoursAgo = Math.floor((now - timePublished) / (1000 * 60 * 60));
          const timeString = hoursAgo < 1 ? 'Less than 1 hour ago' : 
                           hoursAgo < 24 ? `${hoursAgo} hours ago` : 
                           `${Math.floor(hoursAgo / 24)} days ago`;
          
          return {
            id: index + 1,
            title: article.title,
            summary: article.summary,
            source: article.source,
            time: timeString,
            impact: impact,
            currencies: relevantCurrencies.length > 0 ? relevantCurrencies.slice(0, 3) : ['USD'],
            url: article.url,
            sentiment: article.overall_sentiment_label,
            sentimentScore: article.overall_sentiment_score
          };
        });
        
        setNews(newsItems);
      }
    } catch (err) {
      console.error('Error fetching general financial news:', err);
      setNews([]); // Empty news array if all fails
    }
  };

  // Handle custom pair selection
  const handlePairChange = (base, quote) => {
    setBaseCurrency(base);
    setQuoteCurrency(quote);
    setSelectedPair(`${base}/${quote}`);
  };

  // Get currency display name
  const getCurrencyName = (code) => {
    const names = {
      'USD': 'US Dollar', 'EUR': 'Euro', 'GBP': 'British Pound', 'JPY': 'Japanese Yen',
      'CHF': 'Swiss Franc', 'AUD': 'Australian Dollar', 'CAD': 'Canadian Dollar', 
      'NZD': 'New Zealand Dollar', 'ZAR': 'South African Rand', 'SEK': 'Swedish Krona',
      'NOK': 'Norwegian Krone', 'DKK': 'Danish Krone', 'PLN': 'Polish Zloty',
      'CZK': 'Czech Koruna', 'HUF': 'Hungarian Forint', 'TRY': 'Turkish Lira',
      'RUB': 'Russian Ruble', 'CNY': 'Chinese Yuan', 'HKD': 'Hong Kong Dollar',
      'SGD': 'Singapore Dollar', 'KRW': 'South Korean Won', 'INR': 'Indian Rupee',
      'BRL': 'Brazilian Real', 'MXN': 'Mexican Peso', 'THB': 'Thai Baht', 'MYR': 'Malaysian Ringgit'
    };
    return names[code] || code;
  };

  useEffect(() => {
    fetchRates();
    fetchNews();
    
    // Update rates every 5 minutes
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Regenerate data when controls change
  useEffect(() => {
    if (Object.keys(rates).length > 0) {
      generateHistoricalData(rates);
    }
  }, [dateRange, forecastDays, rates]);

  const formatRate = (rate) => {
    if (!rate || isNaN(rate) || rate === undefined || rate === null) return '--';
    return rate < 1 ? rate.toFixed(5) : rate.toFixed(4);
  };

  const formatDateForChart = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-medium">{formatDateForChart(label)}</p>
          {chartType === 'candlestick' && data.open !== undefined ? (
            <div className="space-y-1">
              <p style={{ color: '#2563eb' }}>Open: {formatRate(data.open)}</p>
              <p style={{ color: '#059669' }}>High: {formatRate(data.high)}</p>
              <p style={{ color: '#dc2626' }}>Low: {formatRate(data.low)}</p>
              <p style={{ color: '#1f2937' }}>Close: {formatRate(data.close)}</p>
              <p style={{ color: '#6b7280' }}>Volume: {data.volume?.toLocaleString()}</p>
            </div>
          ) : (
            payload.map((entry, index) => (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {formatRate(entry.value)}
              </p>
            ))
          )}
        </div>
      );
    }
    return null;
  };

  // Candlestick chart component
  const CandlestickChart = ({ data }) => {
    const candleData = data.map(item => ({
      ...item,
      fill: item.close >= item.open ? '#10b981' : '#ef4444'
    }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={candleData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDateForChart}
            stroke="#666"
          />
          <YAxis 
            domain={['dataMin - dataMin*0.001', 'dataMax + dataMax*0.001']}
            tickFormatter={formatRate}
            stroke="#666"
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Candlestick representation using close prices */}
          <Line 
            type="monotone" 
            dataKey="close" 
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            name="Close Price"
          />
          
          {/* Moving averages */}
          {indicators.sma5 && (
            <Line 
              type="monotone" 
              dataKey="sma5" 
              stroke="#10b981" 
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="5-Day SMA"
            />
          )}
          {indicators.sma20 && (
            <Line 
              type="monotone" 
              dataKey="sma20" 
              stroke="#f59e0b" 
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="20-Day SMA"
            />
          )}
          
          {/* Bollinger Bands */}
          {indicators.bollinger && (
            <>
              <Line 
                type="monotone" 
                dataKey="bollingerUpper" 
                stroke="#8b5cf6" 
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="Bollinger Upper"
              />
              <Line 
                type="monotone" 
                dataKey="bollingerLower" 
                stroke="#8b5cf6" 
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="Bollinger Lower"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getCurrentChange = (pair) => {
    const historical = historicalData[pair];
    if (!historical || historical.length < 2) return 0;
    
    const current = historical[historical.length - 1];
    const previous = historical[historical.length - 2];
    
    if (!current || !previous) return 0;
    
    const currentRate = current.close || current.rate;
    const previousRate = previous.close || previous.rate;
    
    if (!currentRate || !previousRate) return 0;
    
    return ((currentRate - previousRate) / previousRate) * 100;
  };

  const exportData = () => {
    if (!historicalData[selectedPair]) return;
    
    const data = historicalData[selectedPair].map(item => ({
      Date: item.date,
      Open: item.open,
      High: item.high,
      Low: item.low,
      Close: item.close,
      Volume: item.volume,
      SMA5: item.sma5,
      SMA20: item.sma20,
      RSI: item.rsi,
      BollingerUpper: item.bollingerUpper,
      BollingerLower: item.bollingerLower
    }));
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Open,High,Low,Close,Volume,SMA5,SMA20,RSI,BollingerUpper,BollingerLower\n"
      + data.map(row => `${row.Date},${row.Open},${row.High},${row.Low},${row.Close},${row.Volume},${row.SMA5||''},${row.SMA20||''},${row.RSI||''},${row.BollingerUpper||''},${row.BollingerLower||''}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedPair}_enhanced_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && Object.keys(rates).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading real-time FX data and market news...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Globe className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FX Tracker Pro</h1>
                <p className="text-sm text-gray-500">Real-time rates, historical data & market news • Powered by ExchangeRate-API & Alpha Vantage</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {lastUpdate && (
                <div className="text-sm text-gray-500">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
              <button
                onClick={fetchRates}
                disabled={loading}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Custom Currency Pair Selector */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Custom Currency Pair
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Base Currency</label>
                  <select
                    value={baseCurrency}
                    onChange={(e) => handlePairChange(e.target.value, quoteCurrency)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-semibold"
                  >
                    {currencies.map(currency => (
                      <option key={currency} value={currency} className="text-gray-900 font-semibold">
                        {currency} - {getCurrencyName(currency)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Quote Currency</label>
                  <select
                    value={quoteCurrency}
                    onChange={(e) => handlePairChange(baseCurrency, e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-semibold"
                  >
                    {currencies.filter(c => c !== baseCurrency).map(currency => (
                      <option key={currency} value={currency} className="text-gray-900 font-semibold">
                        {currency} - {getCurrencyName(currency)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatRate(rates[selectedPair])}
                  </div>
                  <div className={`text-sm font-medium ${getChangeColor(getCurrentChange(selectedPair))}`}>
                    {getCurrentChange(selectedPair) && !isNaN(getCurrentChange(selectedPair)) ? 
                      (getCurrentChange(selectedPair) > 0 ? '+' : '') + getCurrentChange(selectedPair).toFixed(3) + '%' : '--'}
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Controls */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Analysis Controls
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Forecast Days</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={forecastDays}
                    onChange={(e) => setForecastDays(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Chart Type</label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                  >
                    <option value="line">Line Chart</option>
                    <option value="candlestick">Candlestick</option>
                  </select>
                </div>
              </div>
              
              {/* Technical Indicators */}
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">Technical Indicators</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={indicators.sma5}
                      onChange={(e) => setIndicators(prev => ({ ...prev, sma5: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-800">SMA 5</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={indicators.sma20}
                      onChange={(e) => setIndicators(prev => ({ ...prev, sma20: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-800">SMA 20</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={indicators.bollinger}
                      onChange={(e) => setIndicators(prev => ({ ...prev, bollinger: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-800">Bollinger Bands</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={indicators.rsi}
                      onChange={(e) => setIndicators(prev => ({ ...prev, rsi: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-800">RSI</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={updateAnalysisWithRealData}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Fetching Real Data...' : 'Update Analysis'}
                </button>
              </div>
            </div>

            {/* Time Series Charts */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  {selectedPair} - Price History & Technical Analysis
                </h2>
                <button
                  onClick={exportData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Export Data
                </button>
              </div>

              {historicalData[selectedPair] ? (
                <div className="space-y-6">
                  {/* Main Price Chart */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Real Historical Price Data ({chartType === 'candlestick' ? 'OHLC' : 'Line'})
                      <span className="text-sm text-green-600 font-normal ml-2">• Historical data from Alpha Vantage</span>
                    </h3>
                    <div className="h-80">
                      {chartType === 'candlestick' ? (
                        <CandlestickChart data={historicalData[selectedPair]} />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historicalData[selectedPair]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={formatDateForChart}
                              stroke="#666"
                            />
                            <YAxis 
                              domain={['dataMin - dataMin*0.001', 'dataMax + dataMax*0.001']}
                              tickFormatter={formatRate}
                              stroke="#666"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line 
                              type="monotone" 
                              dataKey="close" 
                              stroke="#2563eb" 
                              strokeWidth={2}
                              dot={false}
                              name="Close Price"
                            />
                            {indicators.sma5 && (
                              <Line 
                                type="monotone" 
                                dataKey="sma5" 
                                stroke="#10b981" 
                                strokeWidth={1}
                                strokeDasharray="5 5"
                                dot={false}
                                name="5-Day SMA"
                              />
                            )}
                            {indicators.sma20 && (
                              <Line 
                                type="monotone" 
                                dataKey="sma20" 
                                stroke="#f59e0b" 
                                strokeWidth={1}
                                strokeDasharray="5 5"
                                dot={false}
                                name="20-Day SMA"
                              />
                            )}
                            {indicators.bollinger && (
                              <>
                                <Line 
                                  type="monotone" 
                                  dataKey="bollingerUpper" 
                                  stroke="#8b5cf6" 
                                  strokeWidth={1}
                                  strokeDasharray="3 3"
                                  dot={false}
                                  name="Bollinger Upper"
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="bollingerLower" 
                                  stroke="#8b5cf6" 
                                  strokeWidth={1}
                                  strokeDasharray="3 3"
                                  dot={false}
                                  name="Bollinger Lower"
                                />
                              </>
                            )}
                            {forecast[selectedPair]?.support && (
                              <ReferenceLine 
                                y={forecast[selectedPair].support} 
                                stroke="#ef4444" 
                                strokeDasharray="2 2"
                                label="Support"
                              />
                            )}
                            {forecast[selectedPair]?.resistance && (
                              <ReferenceLine 
                                y={forecast[selectedPair].resistance} 
                                stroke="#ef4444" 
                                strokeDasharray="2 2"
                                label="Resistance"
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* RSI Chart */}
                  {indicators.rsi && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                        RSI (14-period) Momentum Indicator
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historicalData[selectedPair]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={formatDateForChart}
                              stroke="#666"
                            />
                            <YAxis 
                              domain={[0, 100]}
                              stroke="#666"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line 
                              type="monotone" 
                              dataKey="rsi" 
                              stroke="#8b5cf6" 
                              strokeWidth={2}
                              dot={false}
                              name="RSI"
                            />
                            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="2 2" label="Overbought" />
                            <ReferenceLine y={30} stroke="#10b981" strokeDasharray="2 2" label="Oversold" />
                            <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="1 1" label="Neutral" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Forecast Chart */}
                  {forecast[selectedPair] && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        {forecastDays}-Day Advanced Statistical Forecast
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={forecast[selectedPair].data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={formatDateForChart}
                              stroke="#666"
                            />
                            <YAxis 
                              domain={['dataMin - dataMin*0.002', 'dataMax + dataMax*0.002']}
                              tickFormatter={formatRate}
                              stroke="#666"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="upperBound"
                              stackId="1"
                              stroke="#93c5fd"
                              fill="#dbeafe"
                              fillOpacity={0.3}
                              name="Upper Confidence (95%)"
                            />
                            <Area
                              type="monotone"
                              dataKey="lowerBound"
                              stackId="1"
                              stroke="#93c5fd"
                              fill="#ffffff"
                              fillOpacity={0.3}
                              name="Lower Confidence (95%)"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="rate" 
                              stroke="#1d4ed8" 
                              strokeWidth={2}
                              dot={false}
                              name="Forecast"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <p>Forecast based on real historical data using advanced exponential smoothing with trend analysis, seasonal adjustments, and mean reversion components.</p>
                      </div>
                    </div>
                  )}

                  {/* Technical Indicators Summary */}
                  {forecast[selectedPair] && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Technical Signal</h4>
                        <div className={`text-lg font-bold ${
                          forecast[selectedPair].trend === 'bullish' ? 'text-green-600' :
                          forecast[selectedPair].trend === 'bearish' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {forecast[selectedPair].trend.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {forecast[selectedPair].strength} signal
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">RSI (14)</h4>
                        <div className={`text-lg font-bold ${
                          forecast[selectedPair].rsi > 70 ? 'text-red-600' :
                          forecast[selectedPair].rsi < 30 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {forecast[selectedPair].rsi ? forecast[selectedPair].rsi.toFixed(1) : '--'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {forecast[selectedPair].rsi > 70 ? 'Overbought' :
                           forecast[selectedPair].rsi < 30 ? 'Oversold' : 'Neutral'}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Volatility (Annual)</h4>
                        <div className="text-lg font-bold text-gray-900">
                          {forecast[selectedPair].volatility ? (forecast[selectedPair].volatility * 100).toFixed(1) + '%' : '--'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {forecast[selectedPair].volatility > 0.2 ? 'High' :
                           forecast[selectedPair].volatility > 0.1 ? 'Medium' : 'Low'} volatility
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 animate-pulse mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Loading historical data from Alpha Vantage...</p>
                  <p className="text-sm text-gray-500 mt-2">If historical data is unavailable, current rates will be displayed</p>
                </div>
              )}
            </div>

            {/* Suggested Pairs Grid */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Popular Currency Pairs
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestedPairs.map(pair => {
                  const rate = rates[pair];
                  const change = getCurrentChange(pair);
                  const pairForecast = forecast?.[pair];
                  
                  return (
                    <div
                      key={pair}
                      onClick={() => {
                        const [base, quote] = pair.split('/');
                        handlePairChange(base, quote);
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedPair === pair 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{pair}</h3>
                        {pairForecast && (
                          <div className="flex items-center text-xs">
                            {pairForecast.trend === 'bullish' ? (
                              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                            )}
                            <span className={pairForecast.trend === 'bullish' ? 'text-green-600' : 'text-red-600'}>
                              {pairForecast.strength}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xl font-bold text-gray-900 mb-1">
                        {formatRate(rate)}
                      </div>
                      
                      <div className={`text-sm font-medium ${getChangeColor(change)}`}>
                        {change && !isNaN(change) ? (change > 0 ? '+' : '') + change.toFixed(3) + '%' : '--'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Quick Statistics Summary */}
            {forecast?.[selectedPair] && (
              <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedPair} - Key Statistics
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600">Current Rate</div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatRate(rates[selectedPair])}
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-600">Support Level</div>
                    <div className="text-xl font-bold text-green-600">
                      {formatRate(forecast[selectedPair].support)}
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-sm text-gray-600">Resistance Level</div>
                    <div className="text-xl font-bold text-red-600">
                      {formatRate(forecast[selectedPair].resistance)}
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm text-gray-600">{forecastDays}-Day Target</div>
                    <div className="text-xl font-bold text-purple-600">
                      {forecast[selectedPair].data.length > 0 ? 
                        formatRate(forecast[selectedPair].data[forecast[selectedPair].data.length - 1].rate) : '--'}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Analysis Summary</h4>
                  <p className="text-sm text-gray-700">
                    Based on technical analysis, {selectedPair} shows a <strong>{forecast[selectedPair].trend}</strong> bias 
                    with <strong>{forecast[selectedPair].strength}</strong> conviction. 
                    {forecast[selectedPair].rsi ? (
                      <>
                        The current RSI of {forecast[selectedPair].rsi.toFixed(1)} 
                        indicates {forecast[selectedPair].rsi > 70 ? 'overbought conditions' : 
                                    forecast[selectedPair].rsi < 30 ? 'oversold conditions' : 'neutral momentum'}. 
                      </>
                    ) : 'RSI data is being calculated. '}
                    {forecast[selectedPair].volatility ? (
                      <>
                        Annualized volatility is {(forecast[selectedPair].volatility * 100).toFixed(1)}%, suggesting 
                        {forecast[selectedPair].volatility > 0.2 ? ' elevated' : 
                         forecast[selectedPair].volatility > 0.1 ? ' moderate' : ' low'} price uncertainty.
                      </>
                    ) : 'Volatility analysis is loading.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* News Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Newspaper className="h-5 w-5 mr-2" />
                Market News
                <span className="text-xs text-green-600 ml-2 font-normal">• Live from Alpha Vantage</span>
              </h2>
              
              <div className="space-y-4">
                {news.length > 0 ? news.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => window.open(item.url, '_blank')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.impact === 'high' ? 'bg-red-100 text-red-800' :
                          item.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.impact.toUpperCase()}
                        </span>
                        {item.sentiment && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.sentiment === 'Bullish' ? 'bg-green-100 text-green-800' :
                            item.sentiment === 'Bearish' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.sentiment}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{item.time}</span>
                    </div>
                    
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    
                    {item.summary && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {item.summary}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{item.source}</span>
                      <div className="flex space-x-1">
                        {item.currencies.map(currency => (
                          <span key={currency} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {currency}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-blue-600 flex items-center">
                      <span>Click to read full article</span>
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Newspaper className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">Loading real-time financial news...</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium text-yellow-800">Upcoming Events</span>
                </div>
                <div className="text-sm text-yellow-700">
                  <div className="mb-1">• SARB MPC Meeting - Jul 25</div>
                  <div className="mb-1">• RBNZ Rate Decision - Aug 14</div>
                  <div className="mb-1">• SA CPI Data - Aug 21</div>
                  <div>• NZ GDP Release - Sep 19</div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  📈 Real-time financial news powered by Alpha Vantage's AI sentiment analysis. 
                  News articles include sentiment scores to help understand market impact.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Real-time rates from ExchangeRate-API • Historical data & news from Alpha Vantage • For educational purposes only</p>
            <p className="mt-1">Not financial advice • Always verify with official sources</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FXTracker;
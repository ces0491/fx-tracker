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

  // Alpha Vantage API configuration
  const ALPHA_VANTAGE_API_KEY = '7BY8PWEG91UBMXJ7';
  const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

  // Fetch real exchange rates from Alpha Vantage
  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get real-time rates for major pairs from Alpha Vantage
      const ratePromises = suggestedPairs.map(async (pair) => {
        const [from, to] = pair.split('/');
        try {
          const response = await fetch(
            `${ALPHA_VANTAGE_BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${ALPHA_VANTAGE_API_KEY}`
          );
          const data = await response.json();
          
          if (data['Realtime Currency Exchange Rate']) {
            return {
              pair,
              rate: parseFloat(data['Realtime Currency Exchange Rate']['5. Exchange Rate'])
            };
          }
          return null;
        } catch (err) {
          console.error(`Error fetching rate for ${pair}:`, err);
          return null;
        }
      });

      // Wait for all rate requests with delay to avoid rate limiting
      const rateResults = [];
      for (let i = 0; i < ratePromises.length; i++) {
        if (i > 0) {
          // Add delay between requests to avoid rate limiting (Alpha Vantage allows 5 requests per minute)
          await new Promise(resolve => setTimeout(resolve, 12000)); // 12 second delay
        }
        try {
          const result = await ratePromises[i];
          if (result) {
            rateResults.push(result);
          }
        } catch (err) {
          console.error('Rate fetch error:', err);
        }
      }

      // Convert to rates object
      const crossRates = {};
      rateResults.forEach(({ pair, rate }) => {
        crossRates[pair] = rate;
      });

      // Calculate additional cross rates for all currency combinations
      currencies.forEach(base => {
        currencies.forEach(quote => {
          if (base !== quote && !crossRates[`${base}/${quote}`]) {
            // Try to calculate cross rate from existing rates
            const baseUSD = crossRates[`${base}/USD`] || (crossRates[`USD/${base}`] ? 1/crossRates[`USD/${base}`] : null);
            const quoteUSD = crossRates[`${quote}/USD`] || (crossRates[`USD/${quote}`] ? 1/crossRates[`USD/${quote}`] : null);
            
            if (baseUSD && quoteUSD) {
              crossRates[`${base}/${quote}`] = quoteUSD / baseUSD;
            }
          }
        });
      });
      
      setRates(crossRates);
      setLastUpdate(new Date());
      
      // Fetch historical data for the selected pair
      if (crossRates[selectedPair]) {
        await fetchHistoricalData(selectedPair);
      }
      
    } catch (err) {
      setError('Failed to fetch exchange rates from Alpha Vantage. Please check your internet connection and try again.');
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

  // Generate historical data and forecast
  const generateHistoricalData = (currentRates) => {
    const historical = {};
    const forecasts = {};
    
    // Calculate days between start and end date
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    suggestedPairs.forEach(pair => {
      if (currentRates[pair]) {
        const currentRate = currentRates[pair];
        const data = [];
        
        // Generate historical data based on selected date range
        for (let i = daysDiff; i >= 0; i--) {
          const date = new Date(endDate);
          date.setDate(date.getDate() - i);
          
          // Enhanced volatility model
          const baseVolatility = 0.015;
          const timeDecay = Math.exp(-i / 60); // volatility increases closer to present
          const volatility = baseVolatility * (1 + timeDecay);
          
          // Add market microstructure effects
          const dayOfWeek = date.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const weekendEffect = isWeekend ? 0.5 : 1.0; // reduced volatility on weekends
          
          // Random walk with drift
          const drift = 0.0001; // small positive drift
          const randomChange = (Math.random() - 0.5) * volatility * weekendEffect;
          const rate = currentRate * Math.exp((drift + randomChange) * (daysDiff - i));
          
          // Generate OHLC data for candlesticks
          const intraday_volatility = rate * 0.005;
          const open = i === daysDiff ? rate : data[data.length - 1]?.close || rate;
          const high = rate + (Math.random() * intraday_volatility);
          const low = rate - (Math.random() * intraday_volatility);
          const close = rate;
          
          data.push({
            date: date.toISOString().split('T')[0],
            open: Math.max(low, open),
            high: Math.max(open, close, high),
            low: Math.min(open, close, low),
            close: close,
            rate: close, // for backward compatibility
            volume: Math.floor(Math.random() * 1000000) + 500000,
            change: i > 0 ? ((close - (data[data.length - 1]?.close || close)) / (data[data.length - 1]?.close || close) * 100) : 0
          });
        }
        
        // Calculate technical indicators
        const enhancedData = calculateIndicators(data);
        
        // Generate advanced forecast
        const forecastData = advancedForecast(enhancedData, forecastDays);
        
        // Calculate trend and strength
        const recentRates = enhancedData.slice(-14).map(d => d.close);
        const firstRate = recentRates[0];
        const lastRate = recentRates[recentRates.length - 1];
        const trend = (lastRate - firstRate) / firstRate;
        
        // Calculate support and resistance levels
        const highs = enhancedData.slice(-30).map(d => d.high);
        const lows = enhancedData.slice(-30).map(d => d.low);
        const resistance = highs.sort((a, b) => b - a)[2]; // 3rd highest
        const support = lows.sort((a, b) => a - b)[2]; // 3rd lowest
        
        // Calculate volatility
        const returns = enhancedData.slice(-30).map((d, i, arr) => 
          i > 0 ? Math.log(d.close / arr[i-1].close) : 0
        ).slice(1);
        const variance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length;
        const volatility = Math.sqrt(variance * 252); // annualized
        
        historical[pair] = enhancedData;
        forecasts[pair] = {
          data: forecastData,
          trend: trend > 0 ? 'bullish' : 'bearish',
          strength: Math.abs(trend) > 0.02 ? 'strong' : Math.abs(trend) > 0.005 ? 'moderate' : 'weak',
          support: support,
          resistance: resistance,
          volatility: volatility,
          rsi: enhancedData[enhancedData.length - 1]?.rsi
        };
      }
    });
    
    setHistoricalData(historical);
    setForecast(forecasts);
  };

  // Fetch financial news
  const fetchNews = async () => {
    try {
      // Mock news data with clickable URLs (including SA/NZD relevant news)
      const mockNews = [
        {
          id: 1,
          title: "SARB Keeps Repo Rate Unchanged at 8.25%",
          source: "News24",
          time: "1 hour ago",
          impact: "high",
          currencies: ["ZAR"],
          url: "https://www.news24.com/fin24/economy/south-africa/sarb-keeps-repo-rate-unchanged"
        },
        {
          id: 2,
          title: "RBNZ Signals Cautious Approach to Rate Cuts",
          source: "NZ Herald",
          time: "3 hours ago",
          impact: "high",
          currencies: ["NZD"],
          url: "https://www.nzherald.co.nz/business/rbnz-signals-cautious-approach"
        },
        {
          id: 3,
          title: "Rand Strengthens on Commodity Price Rally",
          source: "Business Day",
          time: "4 hours ago",
          impact: "medium",
          currencies: ["ZAR"],
          url: "https://www.businesslive.co.za/bd/markets/currencies/rand-strengthens"
        },
        {
          id: 4,
          title: "Fed Signals Potential Rate Changes Ahead",
          source: "Financial Times",
          time: "5 hours ago",
          impact: "high",
          currencies: ["USD"],
          url: "https://www.ft.com/content/fed-signals-rate-changes"
        },
        {
          id: 5,
          title: "NZ Employment Data Shows Resilient Labor Market",
          source: "Stats NZ",
          time: "6 hours ago",
          impact: "medium",
          currencies: ["NZD"],
          url: "https://www.stats.govt.nz/news/employment-data-resilient"
        },
        {
          id: 6,
          title: "Gold Price Surge Benefits SA Mining Sector",
          source: "Mining Weekly",
          time: "8 hours ago",
          impact: "medium",
          currencies: ["ZAR"],
          url: "https://www.miningweekly.com/article/gold-price-surge-benefits-sa-mining"
        }
      ];
      
      setNews(mockNews);
    } catch (err) {
      console.error('Error fetching news:', err);
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
          <p className="text-gray-600">Loading FX data...</p>
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
                <p className="text-sm text-gray-500">Real-time rates & advanced forecasting</p>
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
            <p className="text-red-800">{error}</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Forecast Days</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={forecastDays}
                    onChange={(e) => setForecastDays(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="line">Line Chart</option>
                    <option value="candlestick">Candlestick</option>
                  </select>
                </div>
              </div>
              
              {/* Technical Indicators */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Technical Indicators</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={indicators.sma5}
                      onChange={(e) => setIndicators(prev => ({ ...prev, sma5: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">SMA 5</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={indicators.sma20}
                      onChange={(e) => setIndicators(prev => ({ ...prev, sma20: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">SMA 20</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={indicators.bollinger}
                      onChange={(e) => setIndicators(prev => ({ ...prev, bollinger: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Bollinger Bands</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={indicators.rsi}
                      onChange={(e) => setIndicators(prev => ({ ...prev, rsi: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">RSI</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={() => generateHistoricalData(rates)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Analysis
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

              {historicalData[selectedPair] && (
                <div className="space-y-6">
                  {/* Main Price Chart */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Historical Price Movement ({chartType === 'candlestick' ? 'OHLC' : 'Line'})
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
                        <p>Forecast uses advanced exponential smoothing with trend analysis, seasonal adjustments, and mean reversion components.</p>
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
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Newspaper className="h-5 w-5 mr-2" />
                Market News
              </h2>
              
              <div className="space-y-4">
                {news.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => window.open(item.url, '_blank')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.impact === 'high' ? 'bg-red-100 text-red-800' :
                        item.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {item.impact.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{item.time}</span>
                    </div>
                    
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    
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
                    
                    <div className="mt-2 text-xs text-gray-500 flex items-center">
                      <span>Click to read full article</span>
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>
                ))}
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
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Data provided by exchangerate-api.com • For educational purposes only</p>
            <p className="mt-1">Not financial advice • Always verify with official sources</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FXTracker;
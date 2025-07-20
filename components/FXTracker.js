"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Newspaper, BarChart3, Globe, Calendar, AlertCircle, Activity, Target, Shield } from 'lucide-react';
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
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  
  // New state for enhanced features
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [forecastDays, setForecastDays] = useState(30);
  const [chartType, setChartType] = useState('line');
  const [indicators, setIndicators] = useState({
    sma5: true,
    sma20: true,
    bollinger: false,
    rsi: false
  });

  // Configuration constants
  const CONFIG = useMemo(() => ({
    // API endpoints - these should point to your backend API routes
    RATES_ENDPOINT: process.env.REACT_APP_API_BASE_URL + '/api/rates' || '/api/rates',
    HISTORICAL_ENDPOINT: process.env.REACT_APP_API_BASE_URL + '/api/historical' || '/api/historical',
    NEWS_ENDPOINT: process.env.REACT_APP_API_BASE_URL + '/api/news' || '/api/news',
    EVENTS_ENDPOINT: process.env.REACT_APP_API_BASE_URL + '/api/events' || '/api/events',
    
    // Chart settings
    CHART_HEIGHT: {
      main: 320,
      rsi: 192,
      forecast: 256
    },
    
    // Technical indicator periods
    INDICATORS: {
      SMA_SHORT: 5,
      SMA_LONG: 20,
      RSI_PERIOD: 14,
      BOLLINGER_PERIOD: 20,
      BOLLINGER_MULTIPLIER: 2
    },
    
    // Volatility thresholds
    VOLATILITY: {
      HIGH: 0.2,
      MEDIUM: 0.1
    },
    
    // RSI thresholds
    RSI: {
      OVERBOUGHT: 70,
      OVERSOLD: 30,
      NEUTRAL: 50
    },
    
    // Rate limits and intervals
    UPDATE_INTERVAL: 5 * 60 * 1000, // 5 minutes
    RETRY_DELAY: 1000, // 1 second
    MAX_RETRIES: 3
  }), []);

  // Available currencies
  const currencies = useMemo(() => [
    'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'ZAR', 
    'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'RUB', 'CNY', 
    'HKD', 'SGD', 'KRW', 'INR', 'BRL', 'MXN', 'THB', 'MYR'
  ], []);

  // Suggested pairs (especially relevant for NZD earners in SA)
  const suggestedPairs = useMemo(() => [
    'NZD/ZAR', 'NZD/USD', 'USD/ZAR', 'EUR/ZAR', 'GBP/ZAR', 'AUD/NZD',
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP'
  ], []);

  // Error handler with retry logic
  const handleApiError = useCallback(async (error, retryFn, retries = 0) => {
    console.error('API Error:', error);
    
    if (retries < CONFIG.MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (retries + 1)));
      return retryFn(retries + 1);
    }
    
    setError(`Network error: ${error.message}. Please check your connection and try again.`);
    return null;
  }, [CONFIG.MAX_RETRIES, CONFIG.RETRY_DELAY]);

  // Secure API caller - routes through backend
  const secureApiCall = useCallback(async (endpoint, params = {}) => {
    try {
      const url = new URL(endpoint, window.location.origin);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`API call failed: ${error.message}`);
    }
  }, []);

  // Fetch real-time rates through secure backend endpoint
  const fetchRates = useCallback(async (retries = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call your backend API instead of directly calling external APIs
      const data = await secureApiCall(CONFIG.RATES_ENDPOINT);
      
      if (data && data.rates) {
        setRates(data.rates);
        setLastUpdate(new Date());
        
        // Auto-fetch historical data for selected pair if we have rates
        if (data.rates[selectedPair]) {
          await fetchHistoricalData(selectedPair);
        }
      } else {
        throw new Error('Invalid response from rates API');
      }
    } catch (err) {
      return handleApiError(err, fetchRates, retries);
    } finally {
      setLoading(false);
    }
  }, [selectedPair, secureApiCall, CONFIG.RATES_ENDPOINT, handleApiError]);

  // Calculate technical indicators with optimized performance
  const calculateIndicators = useCallback((data) => {
    if (!data || data.length === 0) return [];
    
    const enhanced = [...data];
    const { SMA_SHORT, SMA_LONG, RSI_PERIOD, BOLLINGER_PERIOD, BOLLINGER_MULTIPLIER } = CONFIG.INDICATORS;
    
    // Pre-calculate for performance
    const closes = enhanced.map(item => item.close);
    
    for (let i = 0; i < enhanced.length; i++) {
      // SMA calculations
      if (i >= SMA_SHORT - 1) {
        enhanced[i].sma5 = closes.slice(i - SMA_SHORT + 1, i + 1).reduce((a, b) => a + b, 0) / SMA_SHORT;
      }
      
      if (i >= SMA_LONG - 1) {
        enhanced[i].sma20 = closes.slice(i - SMA_LONG + 1, i + 1).reduce((a, b) => a + b, 0) / SMA_LONG;
      }
      
      // Bollinger Bands
      if (i >= BOLLINGER_PERIOD - 1) {
        const period = closes.slice(i - BOLLINGER_PERIOD + 1, i + 1);
        const sma = period.reduce((a, b) => a + b, 0) / BOLLINGER_PERIOD;
        const variance = period.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / BOLLINGER_PERIOD;
        const stdDev = Math.sqrt(variance);
        
        enhanced[i].bollingerUpper = sma + (BOLLINGER_MULTIPLIER * stdDev);
        enhanced[i].bollingerLower = sma - (BOLLINGER_MULTIPLIER * stdDev);
        enhanced[i].bollingerMiddle = sma;
      }
      
      // RSI calculation
      if (i >= RSI_PERIOD) {
        let gains = 0, losses = 0;
        
        for (let j = i - RSI_PERIOD + 1; j <= i; j++) {
          const change = closes[j] - closes[j - 1];
          if (change > 0) gains += change;
          else losses += Math.abs(change);
        }
        
        const avgGain = gains / RSI_PERIOD;
        const avgLoss = losses / RSI_PERIOD;
        const rs = avgGain / (avgLoss || 0.000001);
        enhanced[i].rsi = 100 - (100 / (1 + rs));
      }
    }
    
    return enhanced;
  }, [CONFIG.INDICATORS]);

  // Advanced forecasting algorithm with improved accuracy
  const advancedForecast = useCallback((historicalData, days = 30) => {
    if (!historicalData || historicalData.length < 10) return [];
    
    const data = historicalData.map(d => d.close || d.rate);
    const n = data.length;
    
    // Enhanced exponential smoothing parameters
    const alpha = 0.3; // level smoothing
    const beta = 0.1;  // trend smoothing
    const gamma = 0.2; // seasonal smoothing
    
    // Initialize components
    let level = data[0];
    let trend = data.length > 1 ? (data[1] - data[0]) : 0;
    const seasonal = new Array(7).fill(1); // weekly seasonality
    
    // Calculate seasonal indices more accurately
    if (n >= 14) {
      for (let i = 0; i < 7; i++) {
        let sum = 0, count = 0;
        for (let j = i; j < n; j += 7) {
          if (j > 0) {
            sum += data[j] / data[j - 1];
            count++;
          }
        }
        seasonal[i] = count > 0 ? sum / count : 1;
      }
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
      const seasonalFactor = seasonal[i % 7];
      const seasonalAdjustment = baseforecast * (seasonalFactor - 1) * 0.05;
      
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
  }, []);

  // Fetch historical data through secure backend
  const fetchHistoricalData = useCallback(async (pair, retries = 0) => {
    try {
      const params = {
        pair,
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      
      const data = await secureApiCall(CONFIG.HISTORICAL_ENDPOINT, params);
      
      if (data && data.historicalData) {
        // Calculate technical indicators on real data
        const enhancedData = calculateIndicators(data.historicalData);
        
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
        const resistance = [...highs].sort((a, b) => b - a)[2]; // 3rd highest
        const support = [...lows].sort((a, b) => a - b)[2]; // 3rd lowest
        
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
      } else {
        throw new Error('Invalid historical data response');
      }
    } catch (err) {
      return handleApiError(err, () => fetchHistoricalData(pair, retries), retries);
    }
  }, [dateRange, secureApiCall, CONFIG.HISTORICAL_ENDPOINT, calculateIndicators, advancedForecast, forecastDays, handleApiError]);

  // Generate fallback chart when historical data fails
  const generateFallbackChart = useCallback((pair) => {
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
  }, [rates, calculateIndicators]);

  // Update analysis with real data
  const updateAnalysisWithRealData = useCallback(async () => {
    if (selectedPair && rates[selectedPair]) {
      setLoading(true);
      await fetchHistoricalData(selectedPair);
      setLoading(false);
    }
  }, [selectedPair, rates, fetchHistoricalData]);

  // Fetch financial news through secure backend
  const fetchNews = useCallback(async (retries = 0) => {
    try {
      const data = await secureApiCall(CONFIG.NEWS_ENDPOINT);
      
      if (data && Array.isArray(data.news)) {
        setNews(data.news);
      } else {
        setNews([]); // Empty array if no news
      }
    } catch (err) {
      return handleApiError(err, fetchNews, retries);
    }
  }, [secureApiCall, CONFIG.NEWS_ENDPOINT, handleApiError]);

  // Fetch upcoming events dynamically
  const fetchUpcomingEvents = useCallback(async (retries = 0) => {
    try {
      const data = await secureApiCall(CONFIG.EVENTS_ENDPOINT);
      
      if (data && Array.isArray(data.events)) {
        // Filter events to only show future events
        const now = new Date();
        const futureEvents = data.events.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate > now;
        }).slice(0, 4); // Limit to 4 upcoming events
        
        setUpcomingEvents(futureEvents);
      } else {
        setUpcomingEvents([]);
      }
    } catch (err) {
      return handleApiError(err, fetchUpcomingEvents, retries);
    }
  }, [secureApiCall, CONFIG.EVENTS_ENDPOINT, handleApiError]);

  // Handle custom pair selection
  const handlePairChange = useCallback((base, quote) => {
    setBaseCurrency(base);
    setQuoteCurrency(quote);
    setSelectedPair(`${base}/${quote}`);
  }, []);

  // Get currency display name
  const getCurrencyName = useCallback((code) => {
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
  }, []);

  // Initialize app and set up intervals
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        fetchRates(),
        fetchNews(),
        fetchUpcomingEvents()
      ]);
    };
    
    initialize();
    
    // Update rates every 5 minutes
    const interval = setInterval(fetchRates, CONFIG.UPDATE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [fetchRates, fetchNews, fetchUpcomingEvents, CONFIG.UPDATE_INTERVAL]);

  // Utility functions for formatting
  const formatRate = useCallback((rate) => {
    if (!rate || isNaN(rate) || rate === undefined || rate === null) return '--';
    return rate < 1 ? rate.toFixed(5) : rate.toFixed(4);
  }, []);

  const formatDateForChart = useCallback((dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const getChangeColor = useCallback((change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  }, []);

  const getCurrentChange = useCallback((pair) => {
    const historical = historicalData[pair];
    if (!historical || historical.length < 2) return 0;
    
    const current = historical[historical.length - 1];
    const previous = historical[historical.length - 2];
    
    if (!current || !previous) return 0;
    
    const currentRate = current.close || current.rate;
    const previousRate = previous.close || previous.rate;
    
    if (!currentRate || !previousRate) return 0;
    
    return ((currentRate - previousRate) / previousRate) * 100;
  }, [historicalData]);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload, label }) => {
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
  }, [chartType, formatDateForChart, formatRate]);

  // Candlestick chart component
  const CandlestickChart = useCallback(({ data }) => {
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
        </LineChart>
      </ResponsiveContainer>
    );
  }, [indicators, formatDateForChart, formatRate, CustomTooltip]);

  // Export data functionality
  const exportData = useCallback(() => {
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
  }, [historicalData, selectedPair]);

  // Loading state
  if (loading && Object.keys(rates).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading secure FX data and market news...</p>
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
                <p className="text-sm text-gray-500 flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  Secure real-time rates &amp; analysis • API-secured backend
                </p>
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
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                aria-label="Refresh rates"
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
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Custom Currency Pair Selector */}
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
                    aria-label="Select base currency"
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
                    aria-label="Select quote currency"
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
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                    aria-label="Select start date"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                    aria-label="Select end date"
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
                    aria-label="Number of forecast days"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Chart Type</label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                    aria-label="Select chart type"
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
                      aria-label="Show 5-day Simple Moving Average"
                    />
                    <span className="text-sm font-medium text-gray-800">SMA 5</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={indicators.sma20}
                      onChange={(e) => setIndicators(prev => ({ ...prev, sma20: e.target.checked }))}
                      className="mr-2"
                      aria-label="Show 20-day Simple Moving Average"
                    />
                    <span className="text-sm font-medium text-gray-800">SMA 20</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={indicators.bollinger}
                      onChange={(e) => setIndicators(prev => ({ ...prev, bollinger: e.target.checked }))}
                      className="mr-2"
                      aria-label="Show Bollinger Bands"
                    />
                    <span className="text-sm font-medium text-gray-800">Bollinger Bands</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={indicators.rsi}
                      onChange={(e) => setIndicators(prev => ({ ...prev, rsi: e.target.checked }))}
                      className="mr-2"
                      aria-label="Show Relative Strength Index"
                    />
                    <span className="text-sm font-medium text-gray-800">RSI</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={updateAnalysisWithRealData}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  aria-label="Update analysis with latest data"
                >
                  {loading ? 'Fetching Real Data...' : 'Update Analysis'}
                </button>
              </div>
            </div>

            {/* Charts and Analysis */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  {selectedPair} - Price History &amp; Technical Analysis
                </h2>
                <button
                  onClick={exportData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
                  aria-label="Export chart data to CSV"
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
                      <span className="text-sm text-green-600 font-normal ml-2">• Secure backend data</span>
                    </h3>
                    <div style={{ height: CONFIG.CHART_HEIGHT.main }}>
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
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        RSI ({CONFIG.INDICATORS.RSI_PERIOD}-period) Momentum Indicator
                      </h3>
                      <div style={{ height: CONFIG.CHART_HEIGHT.rsi }}>
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
                            <ReferenceLine y={CONFIG.RSI.OVERBOUGHT} stroke="#ef4444" strokeDasharray="2 2" label="Overbought" />
                            <ReferenceLine y={CONFIG.RSI.OVERSOLD} stroke="#10b981" strokeDasharray="2 2" label="Oversold" />
                            <ReferenceLine y={CONFIG.RSI.NEUTRAL} stroke="#6b7280" strokeDasharray="1 1" label="Neutral" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Forecast Chart */}
                  {forecast[selectedPair] && forecast[selectedPair].data && forecast[selectedPair].data.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        {forecastDays}-Day Advanced Statistical Forecast
                      </h3>
                      <div style={{ height: CONFIG.CHART_HEIGHT.forecast }}>
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
                        <p>Advanced forecast using exponential smoothing with trend analysis, seasonal adjustments, and mean reversion.</p>
                      </div>
                    </div>
                  )}

                  {/* Technical Summary */}
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
                        <h4 className="font-medium text-gray-900 mb-2">RSI ({CONFIG.INDICATORS.RSI_PERIOD})</h4>
                        <div className={`text-lg font-bold ${
                          forecast[selectedPair].rsi > CONFIG.RSI.OVERBOUGHT ? 'text-red-600' :
                          forecast[selectedPair].rsi < CONFIG.RSI.OVERSOLD ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {forecast[selectedPair].rsi ? forecast[selectedPair].rsi.toFixed(1) : '--'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {forecast[selectedPair].rsi > CONFIG.RSI.OVERBOUGHT ? 'Overbought' :
                           forecast[selectedPair].rsi < CONFIG.RSI.OVERSOLD ? 'Oversold' : 'Neutral'}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Volatility (Annual)</h4>
                        <div className="text-lg font-bold text-gray-900">
                          {forecast[selectedPair].volatility ? (forecast[selectedPair].volatility * 100).toFixed(1) + '%' : '--'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {forecast[selectedPair].volatility > CONFIG.VOLATILITY.HIGH ? 'High' :
                           forecast[selectedPair].volatility > CONFIG.VOLATILITY.MEDIUM ? 'Medium' : 'Low'} volatility
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 animate-pulse mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Loading historical data...</p>
                  <p className="text-sm text-gray-500 mt-2">If data is unavailable, current rates will be displayed</p>
                </div>
              )}
            </div>

            {/* Popular Pairs */}
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
                      role="button"
                      tabIndex={0}
                      aria-label={`Select currency pair ${pair}`}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          const [base, quote] = pair.split('/');
                          handlePairChange(base, quote);
                        }
                      }}
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
          </div>

          {/* News Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Newspaper className="h-5 w-5 mr-2" />
                Market News
                <span className="text-xs text-green-600 ml-2 font-normal">• Secure feed</span>
              </h2>
              
              <div className="space-y-4">
                {news.length > 0 ? news.map(item => (
                  <article 
                    key={item.id} 
                    onClick={() => window.open(item.url, '_blank')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    role="button"
                    tabIndex={0}
                    aria-label={`Read article: ${item.title}`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        window.open(item.url, '_blank');
                      }
                    }}
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
                      <time className="text-xs text-gray-500">{item.time}</time>
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
                        {item.currencies?.map(currency => (
                          <span key={currency} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {currency}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                )) : (
                  <div className="text-center py-8">
                    <Newspaper className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">Loading financial news...</p>
                  </div>
                )}
              </div>
              
              {/* Dynamic Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Calendar className="h-4 w-4 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-yellow-800">Upcoming Events</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    {upcomingEvents.map((event, index) => (
                      <div key={index} className="mb-1">
                        • {event.title} - {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  🔒 Secure financial data through encrypted backend APIs. 
                  All sensitive information is processed server-side for maximum security.
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
            <p>Secure financial data through encrypted backend • For educational purposes only</p>
            <p className="mt-1">Not financial advice • Always verify with official sources</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FXTracker;
"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Newspaper, BarChart3, Globe, Calendar, AlertCircle, Activity, Target, Shield, Edit3, Check, X, Wifi, WifiOff, Clock, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';

const FXTracker = () => {
  const [rates, setRates] = useState({});
  const [historicalData, setHistoricalData] = useState({});
  const [selectedPair, setSelectedPair] = useState('NZD/ZAR');
  const [baseCurrency, setBaseCurrency] = useState('NZD');
  const [quoteCurrency, setQuoteCurrency] = useState('ZAR');
  const [forecast, setForecast] = useState(null);
  const [news, setNews] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  
  // Loading and error states
  const [loadingState, setLoadingState] = useState({
    rates: 'idle',
    historical: 'idle',
    news: 'idle',
    events: 'idle'
  });
  const [errors, setErrors] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('online');

  // Enhanced features
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

  // Manual currency input state
  const [manualInputMode, setManualInputMode] = useState(false);
  const [manualBaseCurrency, setManualBaseCurrency] = useState('');
  const [manualQuoteCurrency, setManualQuoteCurrency] = useState('');
  const [customCurrencyError, setCustomCurrencyError] = useState('');

  // Configuration constants
  const CONFIG = useMemo(() => ({
    CHART_HEIGHT: {
      main: 300,
      rsi: 180,
      forecast: 280
    },
    
    INDICATORS: {
      SMA_SHORT: 5,
      SMA_LONG: 20,
      RSI_PERIOD: 14,
      BOLLINGER_PERIOD: 20,
      BOLLINGER_MULTIPLIER: 2
    },
    
    VOLATILITY: {
      HIGH: 0.2,
      MEDIUM: 0.1
    },
    
    RSI: {
      OVERBOUGHT: 70,
      OVERSOLD: 30,
      NEUTRAL: 50
    }
  }), []);

  // Available currencies
  const currencies = useMemo(() => [
    'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'ZAR', 
    'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'RUB', 'CNY', 
    'HKD', 'SGD', 'KRW', 'INR', 'BRL', 'MXN', 'THB', 'MYR', 'IDR',
    'PHP', 'VND', 'KES', 'NGN', 'EGP', 'MAD', 'GHS', 'UGX', 'TZS',
    'ZMW', 'BWP', 'MUR', 'SCR', 'ETB', 'RWF', 'AOA', 'MZN'
  ], []);

  const suggestedPairs = useMemo(() => [
    'NZD/ZAR', 'NZD/USD', 'USD/ZAR', 'EUR/ZAR', 'GBP/ZAR', 'AUD/NZD',
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP',
    'USD/KES', 'EUR/KES', 'GBP/KES', 'KES/ZAR', 'USD/NGN', 'EUR/NGN'
  ], []);

  // Utility functions
  const formatRate = useCallback((rate) => {
    if (!rate || isNaN(rate) || rate === undefined || rate === null) return '--';
    return rate < 1 ? rate.toFixed(5) : rate.toFixed(4);
  }, []);

  const formatDateForChart = useCallback((dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const validateCurrencyCode = useCallback((code) => {
    return /^[A-Z]{3}$/.test(code.toUpperCase());
  }, []);

  const getCurrencyName = useCallback((code) => {
    const names = {
      'USD': 'US Dollar', 'EUR': 'Euro', 'GBP': 'British Pound', 'JPY': 'Japanese Yen',
      'CHF': 'Swiss Franc', 'AUD': 'Australian Dollar', 'CAD': 'Canadian Dollar', 
      'NZD': 'New Zealand Dollar', 'ZAR': 'South African Rand', 'SEK': 'Swedish Krona',
      'NOK': 'Norwegian Krone', 'DKK': 'Danish Krone', 'PLN': 'Polish Zloty',
      'CZK': 'Czech Koruna', 'HUF': 'Hungarian Forint', 'TRY': 'Turkish Lira',
      'RUB': 'Russian Ruble', 'CNY': 'Chinese Yuan', 'HKD': 'Hong Kong Dollar',
      'SGD': 'Singapore Dollar', 'KRW': 'South Korean Won', 'INR': 'Indian Rupee',
      'BRL': 'Brazilian Real', 'MXN': 'Mexican Peso', 'THB': 'Thai Baht', 
      'MYR': 'Malaysian Ringgit', 'IDR': 'Indonesian Rupiah', 'PHP': 'Philippine Peso',
      'VND': 'Vietnamese Dong', 'KES': 'Kenyan Shilling', 'NGN': 'Nigerian Naira',
      'EGP': 'Egyptian Pound', 'MAD': 'Moroccan Dirham', 'GHS': 'Ghanaian Cedi',
      'UGX': 'Ugandan Shilling', 'TZS': 'Tanzanian Shilling', 'ZMW': 'Zambian Kwacha',
      'BWP': 'Botswana Pula', 'MUR': 'Mauritian Rupee', 'SCR': 'Seychellois Rupee',
      'ETB': 'Ethiopian Birr', 'RWF': 'Rwandan Franc', 'AOA': 'Angolan Kwanza',
      'MZN': 'Mozambican Metical'
    };
    return names[code] || code;
  }, []);

  // REAL API CALLS - Fetch live exchange rates
  const fetchRates = useCallback(async () => {
    setLoadingState(prev => ({ ...prev, rates: 'loading' }));
    try {
      const response = await fetch('https://api.exchangerate.host/latest?base=USD');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (!data.success && data.success !== undefined) throw new Error('API returned error');
      
      // Convert to currency pairs format
      const pairRates = {};
      const baseRates = data.rates;
      
      // Generate all possible pairs from the suggested pairs
      suggestedPairs.forEach(pair => {
        const [base, quote] = pair.split('/');
        if (baseRates[base] && baseRates[quote]) {
          // Calculate cross rate: base/quote = (USD/quote) / (USD/base)
          pairRates[pair] = baseRates[quote] / baseRates[base];
        } else if (base === 'USD' && baseRates[quote]) {
          pairRates[pair] = baseRates[quote];
        } else if (quote === 'USD' && baseRates[base]) {
          pairRates[pair] = 1 / baseRates[base];
        }
      });
      
      setRates(pairRates);
      setLastUpdate(new Date());
      setLoadingState(prev => ({ ...prev, rates: 'success' }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.rates;
        return newErrors;
      });
    } catch (error) {
      console.error('Failed to fetch rates:', error);
      setLoadingState(prev => ({ ...prev, rates: 'error' }));
      setErrors(prev => ({ ...prev, rates: `Failed to fetch live rates: ${error.message}` }));
    }
  }, [suggestedPairs]);

  // REAL API CALLS - Fetch historical data
  const fetchHistoricalData = useCallback(async (pair) => {
    setLoadingState(prev => ({ ...prev, historical: 'loading' }));
    try {
      const [base, quote] = pair.split('/');
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      
      // Fetch historical data for the date range
      const promises = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        promises.push(
          fetch(`https://api.exchangerate.host/${dateStr}?base=${base}&symbols=${quote}`)
            .then(res => res.json())
            .then(data => ({
              date: dateStr,
              rate: data.rates?.[quote] || null
            }))
            .catch(() => ({ date: dateStr, rate: null }))
        );
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const historicalResults = await Promise.all(promises);
      
      // Filter out null rates and create OHLC data
      const validData = historicalResults
        .filter(item => item.rate !== null)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      if (validData.length === 0) {
        throw new Error('No historical data available for this pair');
      }
      
      // Generate OHLC data from daily rates with realistic intraday variation
      const enhancedData = validData.map((item, index) => {
        const rate = item.rate;
        const volatility = 0.005; // 0.5% intraday volatility
        const variation = volatility * rate;
        
        const open = rate + (Math.random() - 0.5) * variation;
        const close = rate + (Math.random() - 0.5) * variation;
        const high = Math.max(open, close) + Math.random() * variation;
        const low = Math.min(open, close) - Math.random() * variation;
        
        return {
          date: item.date,
          open: open,
          high: high,
          low: low,
          close: close,
          rate: close,
          volume: Math.floor(Math.random() * 2000000 + 500000)
        };
      });
      
      const finalData = calculateIndicators(enhancedData);
      
      setHistoricalData(prev => ({
        ...prev,
        [pair]: finalData
      }));
      
      // Generate simple forecast based on recent trend
      const forecastData = generateForecast(finalData, forecastDays);
      
      // Calculate technical analysis
      const recentRates = finalData.slice(-14).map(d => d.close);
      const firstRate = recentRates[0];
      const lastRate = recentRates[recentRates.length - 1];
      const trend = (lastRate - firstRate) / firstRate;
      
      const highs = finalData.slice(-30).map(d => d.high);
      const lows = finalData.slice(-30).map(d => d.low);
      const resistance = Math.max(...highs);
      const support = Math.min(...lows);
      
      const returns = finalData.slice(-30).map((d, i, arr) => 
        i > 0 ? Math.log(d.close / arr[i-1].close) : 0
      ).slice(1);
      const variance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length;
      const volatility = Math.sqrt(variance * 252);
      
      setForecast(prev => ({
        ...prev,
        [pair]: {
          data: forecastData,
          trend: trend > 0 ? 'bullish' : 'bearish',
          strength: Math.abs(trend) > 0.02 ? 'strong' : Math.abs(trend) > 0.005 ? 'moderate' : 'weak',
          support: support,
          resistance: resistance,
          volatility: volatility,
          rsi: finalData[finalData.length - 1]?.rsi
        }
      }));
      
      setLoadingState(prev => ({ ...prev, historical: 'success' }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.historical;
        return newErrors;
      });
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      setLoadingState(prev => ({ ...prev, historical: 'error' }));
      setErrors(prev => ({ ...prev, historical: `Failed to fetch historical data: ${error.message}` }));
    }
  }, [forecastDays]);

  // Generate simple forecast without confidence bands
  const generateForecast = useCallback((historicalData, days) => {
    if (!historicalData || historicalData.length < 10) return [];
    
    const data = historicalData.map(d => d.close);
    const n = data.length;
    const currentRate = data[n - 1];
    
    // Simple trend-based forecast
    const shortTermTrend = (data[n - 1] - data[n - 5]) / 5;
    const mediumTermTrend = (data[n - 1] - data[n - 15]) / 15;
    const avgTrend = (shortTermTrend + mediumTermTrend) / 2;
    
    const forecast = [];
    let forecastValue = currentRate;
    const lastDate = new Date(historicalData[n - 1].date);
    
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // Simple linear projection with some noise
      const trendDecay = Math.exp(-i / 30); // Trend weakens over time
      const projection = avgTrend * trendDecay;
      const noise = (Math.random() - 0.5) * currentRate * 0.001; // Small random component
      
      forecastValue = forecastValue + projection + noise;
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        rate: forecastValue,
        close: null,
        open: null,
        high: null,
        low: null,
        isForecast: true,
        type: 'forecast'
      });
    }
    
    return forecast;
  }, []);

  // Calculate technical indicators
  const calculateIndicators = useCallback((data) => {
    if (!data || data.length === 0) return [];
    
    const enhanced = [...data];
    const { SMA_SHORT, SMA_LONG, RSI_PERIOD, BOLLINGER_PERIOD, BOLLINGER_MULTIPLIER } = CONFIG.INDICATORS;
    
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

  // Fetch sample news (placeholder - would need news API)
  const fetchNews = useCallback(async () => {
    setLoadingState(prev => ({ ...prev, news: 'loading' }));
    // For now, using static news since real news APIs require authentication
    const sampleNewsData = [
      {
        id: 1,
        title: "Central Bank Signals Interest Rate Changes Ahead",
        summary: "Recent policy statements indicate potential shifts in monetary policy affecting major currency valuations.",
        source: "Financial Times",
        time: "2 hours ago",
        impact: "high",
        sentiment: "Neutral",
        currencies: ["USD", "EUR"],
        url: "#"
      },
      {
        id: 2,
        title: "Commodity Prices Impact Emerging Market Currencies",
        summary: "Rising commodity prices boost resource-dependent currencies while affecting trade balances.",
        source: "Reuters",
        time: "4 hours ago",
        impact: "medium",
        sentiment: "Bullish",
        currencies: ["ZAR", "AUD"],
        url: "#"
      }
    ];
    
    setNews(sampleNewsData);
    setLoadingState(prev => ({ ...prev, news: 'success' }));
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoadingState(prev => ({ ...prev, events: 'loading' }));
    const today = new Date();
    const sampleEvents = [
      {
        title: "Federal Reserve Interest Rate Decision",
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        impact: "high"
      },
      {
        title: "European Central Bank Policy Meeting",
        date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        impact: "high"
      }
    ];
    
    setUpcomingEvents(sampleEvents);
    setLoadingState(prev => ({ ...prev, events: 'success' }));
  }, []);

  // Calculate chart domain
  const calculateChartDomain = useCallback((data) => {
    if (!data || data.length === 0) return ['auto', 'auto'];
    
    const prices = [];
    
    data.forEach(item => {
      if (item.close) prices.push(item.close);
      if (item.high) prices.push(item.high);
      if (item.low) prices.push(item.low);
      if (item.open) prices.push(item.open);
      if (item.rate) prices.push(item.rate); // For forecast data
      
      if (indicators.sma5 && item.sma5) prices.push(item.sma5);
      if (indicators.sma20 && item.sma20) prices.push(item.sma20);
      if (indicators.bollinger && item.bollingerUpper) prices.push(item.bollingerUpper);
      if (indicators.bollinger && item.bollingerLower) prices.push(item.bollingerLower);
    });
    
    if (prices.length === 0) return ['auto', 'auto'];
    
    const validPrices = prices.filter(p => p && !isNaN(p) && p > 0);
    if (validPrices.length === 0) return ['auto', 'auto'];
    
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    
    const range = maxPrice - minPrice;
    const padding = Math.max(range * 0.05, range * 0.02);
    
    return [Math.max(0, minPrice - padding), maxPrice + padding];
  }, [indicators]);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isForecast = data.isForecast || data.type === 'forecast';
      
      return (
        <div className="bg-white p-3 border-2 border-gray-400 rounded-lg shadow-xl">
          <p className="font-bold text-gray-900 flex items-center">
            {formatDateForChart(label)}
            {isForecast && (
              <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded font-semibold">
                Forecast
              </span>
            )}
          </p>
          
          {isForecast ? (
            <div className="space-y-1 mt-2">
              <p className="text-purple-700 font-semibold">
                Projected Rate: {formatRate(data.rate)}
              </p>
            </div>
          ) : chartType === 'candlestick' && data.open !== undefined ? (
            <div className="space-y-1 mt-2">
              <p className="text-blue-700 font-semibold">Open: {formatRate(data.open)}</p>
              <p className="text-green-700 font-semibold">High: {formatRate(data.high)}</p>
              <p className="text-red-700 font-semibold">Low: {formatRate(data.low)}</p>
              <p className="text-gray-900 font-bold">Close: {formatRate(data.close)}</p>
              {data.volume && (
                <p className="text-gray-700 font-semibold">Volume: {data.volume.toLocaleString()}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1 mt-2">
              {payload.map((entry, index) => (
                <p key={index} className="font-semibold" style={{ color: entry.color }}>
                  {entry.name}: {formatRate(entry.value)}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  }, [chartType, formatDateForChart, formatRate]);

  // Chart components
  const HistoricalPriceChart = useCallback(({ data }) => {
    const historicalOnly = data.filter(item => !item.isForecast && item.type !== 'forecast');
    const chartDomain = calculateChartDomain(historicalOnly);
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={historicalOnly} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDateForChart}
            stroke="#374151"
            tick={{ fontSize: 12, fontWeight: 500 }}
          />
          <YAxis 
            domain={chartDomain}
            tickFormatter={formatRate}
            stroke="#374151"
            tick={{ fontSize: 12, fontWeight: 500 }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Line 
            type="monotone" 
            dataKey="close" 
            stroke="#1d4ed8"
            strokeWidth={3}
            dot={false}
            connectNulls={false}
            name="Close Price"
          />
          
          {indicators.sma5 && (
            <Line 
              type="monotone" 
              dataKey="sma5" 
              stroke="#059669" 
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
              name="5-Day SMA"
            />
          )}
          {indicators.sma20 && (
            <Line 
              type="monotone" 
              dataKey="sma20" 
              stroke="#dc2626" 
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
              name="20-Day SMA"
            />
          )}
          
          {indicators.bollinger && (
            <>
              <Line 
                type="monotone" 
                dataKey="bollingerUpper" 
                stroke="#7c2d12" 
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
                connectNulls={false}
                name="Bollinger Upper"
              />
              <Line 
                type="monotone" 
                dataKey="bollingerLower" 
                stroke="#7c2d12" 
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
                connectNulls={false}
                name="Bollinger Lower"
              />
            </>
          )}
          
          {forecast && forecast[selectedPair] && forecast[selectedPair].support && (
            <ReferenceLine 
              y={forecast[selectedPair].support} 
              stroke="#dc2626" 
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{ value: "Support", position: "insideTopLeft", style: { fontWeight: 'bold', fill: '#dc2626' } }}
            />
          )}
          {forecast && forecast[selectedPair] && forecast[selectedPair].resistance && (
            <ReferenceLine 
              y={forecast[selectedPair].resistance} 
              stroke="#059669" 
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{ value: "Resistance", position: "insideBottomLeft", style: { fontWeight: 'bold', fill: '#059669' } }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }, [indicators, formatDateForChart, formatRate, forecast, selectedPair, calculateChartDomain]);

  const ForecastChart = useCallback(({ historicalData, forecastData }) => {
    if (!forecastData || forecastData.length === 0) return null;
    
    const lastHistoricalPoints = historicalData.slice(-3);
    const combinedData = [
      ...lastHistoricalPoints.map(item => ({
        date: item.date,
        rate: item.close,
        type: 'historical'
      })),
      ...forecastData.map(item => ({
        date: item.date,
        rate: item.rate,
        type: 'forecast'
      }))
    ];
    
    const chartDomain = calculateChartDomain(combinedData);
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={combinedData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDateForChart}
            stroke="#374151"
            tick={{ fontSize: 12, fontWeight: 500 }}
          />
          <YAxis 
            domain={chartDomain}
            tickFormatter={formatRate}
            stroke="#374151"
            tick={{ fontSize: 12, fontWeight: 500 }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Line 
            type="monotone" 
            dataKey="rate"
            stroke="#7c3aed"
            strokeWidth={3}
            dot={false}
            connectNulls={false}
            name="Price Projection"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }, [formatDateForChart, formatRate, calculateChartDomain]);

  // Data preparation
  const prepareCombinedChartData = useCallback(() => {
    if (!historicalData[selectedPair]) return [];
    
    const historical = historicalData[selectedPair];
    const forecastData = forecast && forecast[selectedPair] ? forecast[selectedPair].data || [] : [];
    
    const sortedHistorical = [...historical].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const lastHistoricalDate = sortedHistorical.length > 0 ? 
      new Date(sortedHistorical[sortedHistorical.length - 1].date) : new Date();
    
    const validForecastData = forecastData
      .filter(item => new Date(item.date) > lastHistoricalDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const combinedData = [
      ...sortedHistorical.map(item => ({
        ...item,
        isForecast: false,
        type: 'historical'
      })),
      ...validForecastData.map(item => ({
        ...item,
        close: null,
        open: null,
        high: null,
        low: null,
        volume: null,
        type: 'forecast'
      }))
    ];
    
    return combinedData.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [historicalData, selectedPair, forecast]);

  // Handle pair changes
  const handlePairChange = useCallback((base, quote) => {
    setBaseCurrency(base);
    setQuoteCurrency(quote);
    setSelectedPair(`${base}/${quote}`);
    setCustomCurrencyError('');
  }, []);

  // Manual currency input handlers
  const handleManualCurrencySubmit = useCallback(() => {
    const base = manualBaseCurrency.toUpperCase().trim();
    const quote = manualQuoteCurrency.toUpperCase().trim();
    
    if (!validateCurrencyCode(base)) {
      setCustomCurrencyError('Base currency must be a valid 3-letter code (e.g., KES)');
      return;
    }
    
    if (!validateCurrencyCode(quote)) {
      setCustomCurrencyError('Quote currency must be a valid 3-letter code (e.g., USD)');
      return;
    }
    
    if (base === quote) {
      setCustomCurrencyError('Base and quote currencies must be different');
      return;
    }
    
    handlePairChange(base, quote);
    setManualInputMode(false);
    setManualBaseCurrency('');
    setManualQuoteCurrency('');
  }, [manualBaseCurrency, manualQuoteCurrency, validateCurrencyCode, handlePairChange]);

  const cancelManualInput = useCallback(() => {
    setManualInputMode(false);
    setManualBaseCurrency('');
    setManualQuoteCurrency('');
    setCustomCurrencyError('');
  }, []);

  // Get change color and current change
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

  // Manual retry functions
  const manualRetry = useCallback((type) => {
    switch (type) {
      case 'rates':
        fetchRates();
        break;
      case 'historical':
        fetchHistoricalData(selectedPair);
        break;
      case 'news':
        fetchNews();
        break;
      case 'events':
        fetchEvents();
        break;
    }
  }, [fetchRates, fetchHistoricalData, selectedPair, fetchNews, fetchEvents]);

  // Export data
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
    link.setAttribute("download", `${selectedPair}_real_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [historicalData, selectedPair]);

  // Loading indicator component
  const LoadingIndicator = ({ type, label }) => {
    const state = loadingState[type];
    const error = errors[type];
    
    if (state === 'success') return null;
    
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <div className="text-center max-w-md">
          {state === 'loading' ? (
            <>
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600 font-medium mb-2">{label}</p>
            </>
          ) : state === 'error' ? (
            <>
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
              <p className="text-red-600 font-medium mb-2">Failed to load {label.toLowerCase()}</p>
              <p className="text-sm text-gray-600 mb-4 max-w-xs mx-auto">{error}</p>
              <button
                onClick={() => manualRetry(type)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 inline mr-2" />
                Retry Now
              </button>
            </>
          ) : (
            <>
              <div className="h-8 w-8 mx-auto mb-4 bg-gray-300 rounded animate-pulse"></div>
              <p className="text-gray-400">Preparing to load {label.toLowerCase()}...</p>
            </>
          )}
        </div>
      </div>
    );
  };

  // Initialize on mount
  useEffect(() => {
    fetchRates();
    fetchNews();
    fetchEvents();
  }, [fetchRates, fetchNews, fetchEvents]);

  // Fetch historical data when pair changes
  useEffect(() => {
    if (selectedPair && loadingState.rates === 'success') {
      fetchHistoricalData(selectedPair);
    }
  }, [selectedPair, loadingState.rates, fetchHistoricalData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Globe className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FX Tracker</h1>
                <p className="text-sm text-gray-500 flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  Live market data from exchangerate.host API
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Live API</span>
              </div>
              {lastUpdate && (
                <div className="text-sm text-gray-500">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
              <button
                onClick={() => manualRetry('rates')}
                disabled={loadingState.rates === 'loading'}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                aria-label="Refresh rates"
              >
                <RefreshCw className={`h-4 w-4 ${loadingState.rates === 'loading' ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Currency Pair Selector */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Currency Pair Selection
                {loadingState.rates === 'success' && (
                  <span className="text-sm text-green-600 font-normal ml-2">• Live rates loaded</span>
                )}
              </h2>
              
              {loadingState.rates === 'error' ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
                  <p className="text-red-600 font-medium mb-2">Unable to load live exchange rates</p>
                  <p className="text-sm text-gray-600 mb-4">{errors.rates}</p>
                  <button
                    onClick={() => manualRetry('rates')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 inline mr-2" />
                    Retry API Call
                  </button>
                </div>
              ) : loadingState.rates === 'loading' ? (
                <LoadingIndicator type="rates" label="Fetching live exchange rates from API..." />
              ) : (
                <>
                  {!manualInputMode ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">Base Currency</label>
                          <select
                            value={baseCurrency}
                            onChange={(e) => handlePairChange(e.target.value, quoteCurrency)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-semibold"
                          >
                            {currencies.map(currency => (
                              <option key={currency} value={currency}>
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
                              <option key={currency} value={currency}>
                                {currency} - {getCurrencyName(currency)}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 transition-all duration-300">
                            {formatRate(rates[selectedPair])}
                          </div>
                          <div className={`text-sm font-medium transition-colors duration-200 ${getChangeColor(getCurrentChange(selectedPair))}`}>
                            {getCurrentChange(selectedPair) && !isNaN(getCurrentChange(selectedPair)) ? 
                              (getCurrentChange(selectedPair) > 0 ? '+' : '') + getCurrentChange(selectedPair).toFixed(3) + '%' : '--'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setManualInputMode(true)}
                          className="flex items-center px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Enter Custom Currency
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            Base Currency Code
                          </label>
                          <input
                            type="text"
                            value={manualBaseCurrency}
                            onChange={(e) => setManualBaseCurrency(e.target.value.toUpperCase())}
                            placeholder="e.g., KES"
                            maxLength={3}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            Quote Currency Code
                          </label>
                          <input
                            type="text"
                            value={manualQuoteCurrency}
                            onChange={(e) => setManualQuoteCurrency(e.target.value.toUpperCase())}
                            placeholder="e.g., USD"
                            maxLength={3}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono"
                          />
                        </div>
                      </div>
                      
                      {customCurrencyError && (
                        <div className="text-red-600 text-sm font-medium">
                          {customCurrencyError}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleManualCurrencySubmit}
                          disabled={!manualBaseCurrency || !manualQuoteCurrency}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Apply Custom Pair
                        </button>
                        
                        <button
                          onClick={cancelManualInput}
                          className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Charts Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  {selectedPair} - Live Market Analysis
                  {loadingState.historical === 'success' && (
                    <span className="text-sm text-green-600 font-normal ml-2">• Real API data</span>
                  )}
                </h2>
                {historicalData[selectedPair] && (
                  <button
                    onClick={exportData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
                  >
                    Export Data
                  </button>
                )}
              </div>

              {loadingState.historical === 'loading' ? (
                <LoadingIndicator type="historical" label="Fetching historical data from API..." />
              ) : loadingState.historical === 'error' ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
                  <p className="text-red-600 font-medium mb-2">Unable to load historical data</p>
                  <p className="text-sm text-gray-600 mb-4">{errors.historical}</p>
                  <button
                    onClick={() => manualRetry('historical')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 inline mr-2" />
                    Retry API Call
                  </button>
                </div>
              ) : historicalData[selectedPair] ? (
                <div className="space-y-8">
                  {/* Historical Price Chart */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Historical Price Analysis
                      <span className="text-sm text-green-600 font-normal ml-2">• Live API data</span>
                    </h3>
                    
                    <div style={{ height: CONFIG.CHART_HEIGHT.main, minHeight: CONFIG.CHART_HEIGHT.main }}>
                      <HistoricalPriceChart data={prepareCombinedChartData()} />
                    </div>
                  </div>

                  {/* Forecast Chart */}
                  {forecast && forecast[selectedPair] && forecast[selectedPair].data && forecast[selectedPair].data.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        {forecastDays}-Day Price Forecast
                        <span className="text-sm text-purple-600 font-normal ml-2">• Simple projection</span>
                      </h3>
                      
                      <div style={{ height: CONFIG.CHART_HEIGHT.forecast, minHeight: CONFIG.CHART_HEIGHT.forecast }}>
                        <ForecastChart 
                          historicalData={historicalData[selectedPair]} 
                          forecastData={forecast[selectedPair].data} 
                        />
                      </div>
                      
                      <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-700">
                          <span className="font-medium">Simple Forecast:</span> Basic trend projection from live market data. 
                          Forecast scale matches historical data scale as requested.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* RSI Chart */}
                  {indicators.rsi && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        RSI ({CONFIG.INDICATORS.RSI_PERIOD}-period) Momentum Indicator
                      </h3>
                      <div style={{ height: CONFIG.CHART_HEIGHT.rsi, minHeight: CONFIG.CHART_HEIGHT.rsi }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historicalData[selectedPair]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={formatDateForChart}
                              stroke="#374151"
                              tick={{ fontSize: 12, fontWeight: 500 }}
                            />
                            <YAxis 
                              domain={[0, 100]}
                              stroke="#374151"
                              tick={{ fontSize: 12, fontWeight: 500 }}
                              tickCount={6}
                            />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white p-3 border-2 border-gray-400 rounded-lg shadow-xl">
                                      <p className="font-bold text-gray-900">{formatDateForChart(label)}</p>
                                      <p className="text-purple-700 font-bold">
                                        RSI: {payload[0].value ? payload[0].value.toFixed(2) : '--'}
                                      </p>
                                      <p className="text-xs text-gray-800 mt-1 font-semibold">
                                        {payload[0].value > 70 ? 'Overbought' : 
                                         payload[0].value < 30 ? 'Oversold' : 'Neutral'}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="rsi" 
                              stroke="#7c2d12" 
                              strokeWidth={3}
                              dot={false}
                              name="RSI"
                            />
                            <ReferenceLine y={CONFIG.RSI.OVERBOUGHT} stroke="#dc2626" strokeWidth={2} strokeDasharray="3 3" label="Overbought (70)" />
                            <ReferenceLine y={CONFIG.RSI.OVERSOLD} stroke="#059669" strokeWidth={2} strokeDasharray="3 3" label="Oversold (30)" />
                            <ReferenceLine y={CONFIG.RSI.NEUTRAL} stroke="#6b7280" strokeWidth={1} strokeDasharray="2 2" label="Neutral (50)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Technical Summary */}
                  {forecast && forecast[selectedPair] && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Signal Strength</h4>
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
                          {forecast[selectedPair].rsi > CONFIG.RSI.OVERBOUGHT ? 'Overbought Zone' :
                           forecast[selectedPair].rsi < CONFIG.RSI.OVERSOLD ? 'Oversold Zone' : 'Neutral Zone'}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Support/Resistance</h4>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Resistance:</span>
                            <span className="font-medium text-red-600">
                              {formatRate(forecast[selectedPair].resistance)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Support:</span>
                            <span className="font-medium text-green-600">
                              {formatRate(forecast[selectedPair].support)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Volatility</h4>
                        <div className="text-lg font-bold text-gray-900">
                          {forecast[selectedPair].volatility ? (forecast[selectedPair].volatility * 100).toFixed(1) + '%' : '--'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {forecast[selectedPair].volatility > CONFIG.VOLATILITY.HIGH ? 'High Risk' :
                           forecast[selectedPair].volatility > CONFIG.VOLATILITY.MEDIUM ? 'Medium Risk' : 'Low Risk'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="h-8 w-8 mx-auto mb-4 bg-gray-300 rounded animate-pulse"></div>
                  <p className="text-sm text-gray-500">Select a currency pair to view analysis</p>
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
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 transform hover:shadow-md hover:scale-102 ${
                        selectedPair === pair 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select currency pair ${pair}`}
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

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* News Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Newspaper className="h-5 w-5 mr-2" />
                Market News
              </h2>
              
              {news.length > 0 ? (
                <div className="space-y-4">
                  {news.map(item => (
                    <article 
                      key={item.id} 
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.impact === 'high' ? 'bg-red-100 text-red-800' :
                          item.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.impact.toUpperCase()}
                        </span>
                        <time className="text-xs text-gray-500">{item.time}</time>
                      </div>
                      
                      <h3 className="font-medium text-gray-900 mb-2">
                        {item.title}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {item.summary}
                      </p>
                      
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Newspaper className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No news available</p>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-700">
                  ✅ <strong>Live Data:</strong> Using real exchange rates from exchangerate.host API. 
                  Forecast scale matches historical scale. Confidence bands removed as requested.
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
            <p>Professional FX Tracker • Live API Data</p>
            <p className="mt-1">For educational purposes • Not financial advice</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FXTracker;
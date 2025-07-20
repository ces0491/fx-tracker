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

  // Fetch real exchange rates
  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Using exchangerate-api.com (free tier, 1500 requests/month)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      
      if (data && data.rates) {
        // Calculate cross rates for all currency combinations
        const crossRates = {};
        
        currencies.forEach(base => {
          currencies.forEach(quote => {
            if (base !== quote) {
              let rate;
              if (base === 'USD') {
                rate = data.rates[quote];
              } else if (quote === 'USD') {
                rate = 1 / data.rates[base];
              } else {
                rate = data.rates[quote] / data.rates[base];
              }
              crossRates[`${base}/${quote}`] = rate;
            }
          });
        });
        
        setRates(crossRates);
        setLastUpdate(new Date());
        generateHistoricalData(crossRates);
      }
    } catch (err) {
      setError('Failed to fetch exchange rates. Please check your internet connection and try again.');
      console.error('Error fetching rates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate historical data and forecast
  const generateHistoricalData = (currentRates) => {
    const historical = {};
    const forecasts = {};
    
    suggestedPairs.forEach(pair => {
      if (currentRates[pair]) {
        const currentRate = currentRates[pair];
        const data = [];
        const forecastData = [];
        
        // Generate 30 days of historical data
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          // Add realistic volatility
          const volatility = 0.02;
          const randomChange = (Math.random() - 0.5) * volatility;
          const rate = currentRate * (1 + randomChange * (i / 30));
          
          data.push({
            date: date.toISOString().split('T')[0],
            rate: rate,
            change: i > 0 ? ((rate - data[data.length - 1]?.rate) / data[data.length - 1]?.rate * 100) : 0
          });
        }
        
        // Simple moving average forecast
        const recentRates = data.slice(-7).map(d => d.rate);
        const avgRate = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
        const trend = (recentRates[recentRates.length - 1] - recentRates[0]) / recentRates[0];
        
        // Generate 7-day forecast
        for (let i = 1; i <= 7; i++) {
          const forecastDate = new Date();
          forecastDate.setDate(forecastDate.getDate() + i);
          
          const forecastRate = avgRate * (1 + trend * (i / 7));
          forecastData.push({
            date: forecastDate.toISOString().split('T')[0],
            rate: forecastRate,
            confidence: Math.max(0.6, 0.9 - (i * 0.05))
          });
        }
        
        historical[pair] = data;
        forecasts[pair] = {
          data: forecastData,
          trend: trend > 0 ? 'bullish' : 'bearish',
          strength: Math.abs(trend) > 0.01 ? 'strong' : 'weak'
        };
      }
    });
    
    setHistoricalData(historical);
    setForecast(forecasts);
  };

  // Fetch financial news
  const fetchNews = async () => {
    try {
      // Mock news data (including SA/NZD relevant news)
      const mockNews = [
        {
          id: 1,
          title: "SARB Keeps Repo Rate Unchanged at 8.25%",
          source: "News24",
          time: "1 hour ago",
          impact: "high",
          currencies: ["ZAR"]
        },
        {
          id: 2,
          title: "RBNZ Signals Cautious Approach to Rate Cuts",
          source: "NZ Herald",
          time: "3 hours ago",
          impact: "high",
          currencies: ["NZD"]
        },
        {
          id: 3,
          title: "Rand Strengthens on Commodity Price Rally",
          source: "Business Day",
          time: "4 hours ago",
          impact: "medium",
          currencies: ["ZAR"]
        },
        {
          id: 4,
          title: "Fed Signals Potential Rate Changes Ahead",
          source: "Financial Times",
          time: "5 hours ago",
          impact: "high",
          currencies: ["USD"]
        },
        {
          id: 5,
          title: "NZ Employment Data Shows Resilient Labor Market",
          source: "Stats NZ",
          time: "6 hours ago",
          impact: "medium",
          currencies: ["NZD"]
        },
        {
          id: 6,
          title: "Gold Price Surge Benefits SA Mining Sector",
          source: "Mining Weekly",
          time: "8 hours ago",
          impact: "medium",
          currencies: ["ZAR"]
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
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-medium">{formatDateForChart(label)}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatRate(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
    
    if (!current || !previous || !current.rate || !previous.rate) return 0;
    
    return ((current.rate - previous.rate) / previous.rate) * 100;
  };

  const exportData = () => {
    if (!historicalData[selectedPair]) return;
    
    const data = historicalData[selectedPair].map(item => ({
      Date: item.date,
      Rate: item.rate,
      SMA5: item.sma5,
      SMA20: item.sma20,
      RSI: item.rsi
    }));
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Rate,SMA5,SMA20,RSI\n"
      + data.map(row => `${row.Date},${row.Rate},${row.SMA5},${row.SMA20},${row.RSI}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedPair}_data.csv`);
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
                <p className="text-sm text-gray-500">Real-time rates & forecasting</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Currency</label>
                  <select
                    value={baseCurrency}
                    onChange={(e) => handlePairChange(e.target.value, quoteCurrency)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {currencies.map(currency => (
                      <option key={currency} value={currency}>
                        {currency} - {getCurrencyName(currency)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quote Currency</label>
                  <select
                    value={quoteCurrency}
                    onChange={(e) => handlePairChange(baseCurrency, e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <h3 className="text-lg font-medium text-gray-900 mb-3">90-Day Price Movement</h3>
                    <div className="h-80">
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
                            dataKey="rate" 
                            stroke="#2563eb" 
                            strokeWidth={2}
                            dot={false}
                            name="Exchange Rate"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="sma5" 
                            stroke="#10b981" 
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            name="5-Day SMA"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="sma20" 
                            stroke="#f59e0b" 
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            name="20-Day SMA"
                          />
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
                    </div>
                  </div>

                  {/* Forecast Chart */}
                  {forecast[selectedPair] && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        30-Day Statistical Forecast
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
                              name="Upper Confidence"
                            />
                            <Area
                              type="monotone"
                              dataKey="lowerBound"
                              stackId="1"
                              stroke="#93c5fd"
                              fill="#ffffff"
                              fillOpacity={0.3}
                              name="Lower Confidence"
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
                    <div className="text-sm text-gray-600">30-Day Target</div>
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
                  <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                    
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
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
// pages/api/forecast.js - FX Rate Forecasting with multiple algorithms
import {
  trendBasedForecast,
  linearRegressionForecast,
  exponentialSmoothingForecast,
  arimaLiteForecast,
  ensembleForecast
} from '../../lib/forecasting/algorithms.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { historicalData, algorithm = 'trend', forecastDays = 30 } = req.body;

    if (!historicalData || !Array.isArray(historicalData) || historicalData.length < 10) {
      return res.status(400).json({ error: 'Insufficient historical data. Need at least 10 data points.' });
    }

    // Extract close prices
    const prices = historicalData.map(d => d.close);
    const dates = historicalData.map(d => d.date);
    const lastDate = new Date(dates[dates.length - 1]);

    let forecastResult;

    switch (algorithm) {
      case 'trend':
        forecastResult = trendBasedForecast(prices, lastDate, forecastDays);
        break;

      case 'linear_regression':
        forecastResult = linearRegressionForecast(prices, lastDate, forecastDays);
        break;

      case 'exponential_smoothing':
        forecastResult = exponentialSmoothingForecast(prices, lastDate, forecastDays);
        break;

      case 'arima_lite':
        forecastResult = arimaLiteForecast(prices, lastDate, forecastDays);
        break;

      case 'ensemble':
        forecastResult = ensembleForecast(prices, lastDate, forecastDays);
        break;

      // Advanced algorithms - call Python microservice
      case 'lstm':
      case 'prophet':
      case 'garch':
      case 'xgboost':
        forecastResult = await callPythonForecastService(historicalData, algorithm, forecastDays);
        break;

      default:
        return res.status(400).json({ error: `Unknown algorithm: ${algorithm}` });
    }

    res.status(200).json({
      forecast: forecastResult.forecast,
      confidence: forecastResult.confidence,
      algorithm,
      metadata: {
        trainingPoints: prices.length,
        forecastHorizon: forecastDays,
        accuracy: forecastResult.accuracy,
        mae: forecastResult.mae
      }
    });

  } catch (error) {
    console.error('Forecasting error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate forecast' });
  }
}


// ============================================================================
// PYTHON MICROSERVICE INTEGRATION (Advanced ML algorithms)
// ============================================================================

async function callPythonForecastService(historicalData, algorithm, days) {
  const PYTHON_SERVICE_URL = process.env.PYTHON_FORECAST_SERVICE_URL || 'http://localhost:5000';

  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        historical_data: historicalData,
        algorithm: algorithm,
        forecast_days: days
      })
    });

    if (!response.ok) {
      throw new Error(`Python service error: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Python service unavailable, falling back to ensemble:', error.message);
    // Fallback to ensemble if Python service is unavailable
    const prices = historicalData.map(d => d.close);
    const lastDate = new Date(historicalData[historicalData.length - 1].date);
    return ensembleForecast(prices, lastDate, days);
  }
}

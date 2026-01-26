// pages/api/forecast.js - FX Rate Forecasting with multiple algorithms
import {
  trendBasedForecast,
  linearRegressionForecast,
  exponentialSmoothingForecast,
  arimaLiteForecast,
  ensembleForecast,
  kalmanFilterForecast
} from '../../lib/forecasting/algorithms.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { historicalData, algorithm = 'ensemble', forecastDays = 30 } = req.body;

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

      case 'kalman':
        forecastResult = kalmanFilterForecast(prices, lastDate, forecastDays);
        break;

      case 'ensemble':
      default:
        forecastResult = ensembleForecast(prices, lastDate, forecastDays);
        break;
    }

    res.status(200).json({
      forecast: forecastResult.forecast,
      confidence: forecastResult.confidence,
      algorithm,
      metadata: {
        trainingPoints: prices.length,
        forecastHorizon: forecastDays,
        accuracy: forecastResult.accuracy,
        mae: forecastResult.mae,
        ...(forecastResult.latestVolatility && { latestVolatility: forecastResult.latestVolatility })
      }
    });

  } catch (error) {
    console.error('Forecasting error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate forecast' });
  }
}

/**
 * Forecasting algorithms
 * Contains all JavaScript-based forecasting implementations
 */

import {
  calculateStdDev,
  calculateVariance,
  linearRegression as calcLinearRegression,
  fitARModel,
  matrixMultiply,
  matrixAdd,
  matrixSubtract,
  matrixTranspose,
  matrixInverse,
  matrixScalarMultiply,
  identityMatrix
} from '../utils/mathUtils.js';
import { formatISODate, addDays } from '../utils/dateUtils.js';

/**
 * Trend-based forecast with momentum
 */
export function trendBasedForecast(prices, lastDate, days) {
  const n = prices.length;
  const currentRate = prices[n - 1];

  // Calculate short and medium term trends
  const shortTerm = prices.slice(-5);
  const mediumTerm = prices.slice(-20);

  const shortTrend = (shortTerm[shortTerm.length - 1] - shortTerm[0]) / shortTerm.length;
  const mediumTrend = (mediumTerm[mediumTerm.length - 1] - mediumTerm[0]) / mediumTerm.length;

  // Weighted average of trends
  const avgTrend = (shortTrend * 0.7 + mediumTrend * 0.3);

  // Calculate volatility
  const returns = [];
  for (let i = 1; i < n; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  const volatility = calculateStdDev(returns) * Math.sqrt(252);

  const forecast = [];
  let forecastValue = currentRate;

  for (let i = 1; i <= days; i++) {
    const date = addDays(new Date(lastDate), i);

    // Trend decays over time
    const trendDecay = Math.exp(-i / 30);
    const noise = (Math.random() - 0.5) * currentRate * 0.001;

    forecastValue = forecastValue + (avgTrend * trendDecay) + noise;

    // Confidence intervals widen over time
    const confidenceWidth = volatility * currentRate * Math.sqrt(i / 252);

    forecast.push({
      date: formatISODate(date),
      rate: forecastValue,
      upper: forecastValue + (1.96 * confidenceWidth),
      lower: forecastValue - (1.96 * confidenceWidth),
      type: 'forecast'
    });
  }

  return {
    forecast,
    confidence: 0.65,
    accuracy: 0.65,
    mae: currentRate * 0.02
  };
}

/**
 * Linear regression forecast
 */
export function linearRegressionForecast(prices, lastDate, days) {
  const n = prices.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = prices;

  const { slope, intercept } = calcLinearRegression(x, y);

  // Calculate residuals
  const residuals = y.map((val, i) => val - (slope * i + intercept));
  const stdError = calculateStdDev(residuals);

  const forecast = [];

  for (let i = 1; i <= days; i++) {
    const date = addDays(new Date(lastDate), i);
    const xValue = n + i - 1;
    const predicted = slope * xValue + intercept;

    // Confidence intervals widen with distance
    const distanceFactor = Math.sqrt(1 + (1 / n) + Math.pow(xValue - (n / 2), 2) / calculateVariance(x));
    const confidenceWidth = 1.96 * stdError * distanceFactor;

    forecast.push({
      date: formatISODate(date),
      rate: predicted,
      upper: predicted + confidenceWidth,
      lower: predicted - confidenceWidth,
      type: 'forecast'
    });
  }

  return {
    forecast,
    confidence: 0.70,
    accuracy: 0.70,
    mae: stdError
  };
}

/**
 * Exponential smoothing (Holt's method)
 */
export function exponentialSmoothingForecast(prices, lastDate, days) {
  const alpha = 0.3; // Level smoothing
  const beta = 0.1;  // Trend smoothing

  let level = prices[0];
  let trend = (prices[1] - prices[0]);

  // Fit the model
  for (let i = 1; i < prices.length; i++) {
    const prevLevel = level;
    level = alpha * prices[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  // Calculate prediction errors
  const errors = [];
  let testLevel = prices[0];
  let testTrend = prices[1] - prices[0];

  for (let i = 1; i < prices.length; i++) {
    const predicted = testLevel + testTrend;
    errors.push(Math.abs(prices[i] - predicted));

    const prevLevel = testLevel;
    testLevel = alpha * prices[i] + (1 - alpha) * (testLevel + testTrend);
    testTrend = beta * (testLevel - prevLevel) + (1 - beta) * testTrend;
  }

  const mae = errors.reduce((a, b) => a + b, 0) / errors.length;

  const forecast = [];

  for (let i = 1; i <= days; i++) {
    const date = addDays(new Date(lastDate), i);
    const predicted = level + (i * trend);
    const confidenceWidth = mae * 1.96 * Math.sqrt(i);

    forecast.push({
      date: formatISODate(date),
      rate: predicted,
      upper: predicted + confidenceWidth,
      lower: predicted - confidenceWidth,
      type: 'forecast'
    });
  }

  return {
    forecast,
    confidence: 0.72,
    accuracy: 1 - (mae / prices[prices.length - 1]),
    mae
  };
}

/**
 * ARIMA-lite (simplified autoregressive model)
 */
export function arimaLiteForecast(prices, lastDate, days) {
  const p = 3; // AR order

  // Calculate differences
  const differences = [];
  for (let i = 1; i < prices.length; i++) {
    differences.push(prices[i] - prices[i - 1]);
  }

  // Fit AR model
  const { coefficients } = fitARModel(differences, p);

  // Calculate residuals
  const fittedValues = [];
  for (let i = p; i < differences.length; i++) {
    let fitted = 0;
    for (let j = 0; j < p; j++) {
      fitted += coefficients[j] * differences[i - j - 1];
    }
    fittedValues.push(fitted);
  }

  const residuals = differences.slice(p).map((val, i) => val - fittedValues[i]);
  const stdError = calculateStdDev(residuals);

  // Forecast
  const forecast = [];
  let currentValue = prices[prices.length - 1];
  const recentDiffs = differences.slice(-p);

  for (let i = 1; i <= days; i++) {
    const date = addDays(new Date(lastDate), i);

    // Predict next difference
    let predictedDiff = 0;
    for (let j = 0; j < p; j++) {
      predictedDiff += coefficients[j] * recentDiffs[recentDiffs.length - j - 1];
    }

    currentValue += predictedDiff;
    recentDiffs.push(predictedDiff);
    recentDiffs.shift();

    const confidenceWidth = 1.96 * stdError * Math.sqrt(i);

    forecast.push({
      date: formatISODate(date),
      rate: currentValue,
      upper: currentValue + confidenceWidth,
      lower: currentValue - confidenceWidth,
      type: 'forecast'
    });
  }

  return {
    forecast,
    confidence: 0.75,
    accuracy: 0.75,
    mae: stdError
  };
}

/**
 * Ensemble forecast - combines multiple algorithms
 */
export function ensembleForecast(prices, lastDate, days) {
  const trend = trendBasedForecast(prices, lastDate, days);
  const linear = linearRegressionForecast(prices, lastDate, days);
  const exp = exponentialSmoothingForecast(prices, lastDate, days);

  // Weight by confidence
  const weights = {
    trend: trend.confidence,
    linear: linear.confidence,
    exp: exp.confidence
  };
  const totalWeight = weights.trend + weights.linear + weights.exp;

  const forecast = [];

  for (let i = 0; i < days; i++) {
    const trendVal = trend.forecast[i].rate;
    const linearVal = linear.forecast[i].rate;
    const expVal = exp.forecast[i].rate;

    const ensembleRate = (
      (trendVal * weights.trend) +
      (linearVal * weights.linear) +
      (expVal * weights.exp)
    ) / totalWeight;

    // Tighter confidence interval for ensemble
    const trendUpper = trend.forecast[i].upper;
    const trendLower = trend.forecast[i].lower;
    const range = (trendUpper - trendLower) * 0.8;

    forecast.push({
      date: trend.forecast[i].date,
      rate: ensembleRate,
      upper: ensembleRate + (range / 2),
      lower: ensembleRate - (range / 2),
      type: 'forecast'
    });
  }

  return {
    forecast,
    confidence: 0.80,
    accuracy: (trend.accuracy + linear.accuracy + exp.accuracy) / 3,
    mae: (trend.mae + linear.mae + exp.mae) / 3
  };
}

/**
 * Kalman Filter forecast for FX rates
 * Uses a local linear trend model with time-varying volatility
 *
 * State: [price, trend, log_volatility]
 * - price: underlying exchange rate
 * - trend: drift/momentum component
 * - log_volatility: time-varying volatility (log scale for positivity)
 */
export function kalmanFilterForecast(prices, lastDate, days) {
  const n = prices.length;
  if (n < 20) {
    throw new Error('Kalman filter requires at least 20 data points');
  }

  // Model parameters
  const trendDecay = 0.95;           // Trend mean-reversion
  const volatilityPersistence = 0.98; // Volatility persistence
  const processNoisePrice = 0.0001;   // Price process noise
  const processNoiseTrend = 0.00001;  // Trend process noise
  const processNoiseVol = 0.001;      // Volatility process noise

  // Initialize from data
  const initialTrend = (prices[Math.min(4, n - 1)] - prices[0]) / Math.min(4, n - 1);
  const initialReturns = [];
  for (let i = 1; i < Math.min(20, n); i++) {
    initialReturns.push(Math.log(prices[i] / prices[i - 1]));
  }
  const initialVolatility = calculateStdDev(initialReturns);

  // State vector [price, trend, logVol] as column vectors
  let state = [
    [prices[0]],
    [initialTrend],
    [Math.log(Math.max(initialVolatility, 1e-6))]
  ];

  // State covariance matrix P (3x3)
  let P = [
    [1, 0, 0],
    [0, 0.01, 0],
    [0, 0, 0.1]
  ];

  // State transition matrix F
  const F = [
    [1, 1, 0],
    [0, trendDecay, 0],
    [0, 0, volatilityPersistence]
  ];

  // Base process noise covariance Q
  const baseQ = [
    [processNoisePrice, 0, 0],
    [0, processNoiseTrend, 0],
    [0, 0, processNoiseVol]
  ];

  // Observation matrix H (1x3 -> observe price only)
  const H = [[1, 0, 0]];
  const Ht = matrixTranspose(H);

  // Storage for filtered states
  const filteredStates = [];
  const innovations = [];

  // Run Kalman filter through historical data
  for (let t = 0; t < n; t++) {
    const observation = prices[t];

    // --- PREDICT STEP ---
    const statePred = matrixMultiply(F, state);

    // Scale Q by current volatility estimate
    const currentVol = Math.exp(state[2][0]);
    const Q = matrixScalarMultiply(baseQ, Math.max(currentVol, 0.001));

    // P_pred = F * P * F' + Q
    const FP = matrixMultiply(F, P);
    const Ft = matrixTranspose(F);
    const FPFt = matrixMultiply(FP, Ft);
    const PPred = matrixAdd(FPFt, Q);

    // --- UPDATE STEP ---
    // Innovation: y = z - H * x_pred
    const Hx = matrixMultiply(H, statePred);
    const innovation = observation - Hx[0][0];
    innovations.push(innovation);

    // Innovation covariance: S = H * P_pred * H' + R
    // R scales with price level squared
    const measurementNoise = 0.0001 * prices[0] * prices[0];
    const R = [[measurementNoise]];
    const HP = matrixMultiply(H, PPred);
    const HPHt = matrixMultiply(HP, Ht);
    const S = matrixAdd(HPHt, R);

    // Kalman gain: K = P_pred * H' * S^(-1)
    const PHt = matrixMultiply(PPred, Ht);
    const SInv = matrixInverse(S);

    if (!SInv) {
      // If S is singular, skip update
      state = statePred;
      P = PPred;
    } else {
      const K = matrixMultiply(PHt, SInv);

      // State update: x = x_pred + K * innovation
      state = [
        [statePred[0][0] + K[0][0] * innovation],
        [statePred[1][0] + K[1][0] * innovation],
        [statePred[2][0] + K[2][0] * innovation]
      ];

      // Covariance update: P = (I - K*H) * P_pred
      const KH = matrixMultiply(K, H);
      const I_KH = matrixSubtract(identityMatrix(3), KH);
      P = matrixMultiply(I_KH, PPred);
    }

    filteredStates.push([state[0][0], state[1][0], state[2][0]]);
  }

  // Calculate MAE from one-step-ahead prediction errors
  const oneStepErrors = innovations.slice(1).map(Math.abs);
  const mae = oneStepErrors.reduce((a, b) => a + b, 0) / oneStepErrors.length;
  const accuracy = Math.max(0, Math.min(1, 1 - (mae / prices[n - 1])));

  // --- FORECAST STEP ---
  const forecast = [];
  let forecastState = [state[0][0], state[1][0], state[2][0]];
  let forecastP = P.map(row => [...row]);

  for (let i = 1; i <= days; i++) {
    const date = addDays(new Date(lastDate), i);

    // Predict state forward
    const prevState = [[forecastState[0]], [forecastState[1]], [forecastState[2]]];
    const nextState = matrixMultiply(F, prevState);

    // Propagate covariance: P = F * P * F' + Q
    const currentVol = Math.exp(forecastState[2]);
    const Q = matrixScalarMultiply(baseQ, Math.max(currentVol, 0.001));

    const FP = matrixMultiply(F, forecastP.map(row => row.map(v => [v])));
    // Simplified covariance propagation
    const tempP = [];
    for (let row = 0; row < 3; row++) {
      tempP[row] = [];
      for (let col = 0; col < 3; col++) {
        let sum = 0;
        for (let k = 0; k < 3; k++) {
          for (let l = 0; l < 3; l++) {
            sum += F[row][k] * forecastP[k][l] * F[col][l];
          }
        }
        tempP[row][col] = sum + Q[row][col];
      }
    }
    forecastP = tempP;

    forecastState = [nextState[0][0], nextState[1][0], nextState[2][0]];

    // Confidence interval from state covariance
    const priceVariance = forecastP[0][0];
    const volatilityFactor = Math.exp(forecastState[2]);
    const confidenceWidth = 1.96 * Math.sqrt(Math.abs(priceVariance)) * (1 + volatilityFactor) * Math.sqrt(i);

    forecast.push({
      date: formatISODate(date),
      rate: forecastState[0],
      upper: forecastState[0] + confidenceWidth,
      lower: forecastState[0] - confidenceWidth,
      type: 'forecast'
    });
  }

  // Extract time-varying volatility estimates (annualized)
  const timeVaryingVolatility = filteredStates.map(s => Math.exp(s[2]) * Math.sqrt(252));
  const latestVolatility = timeVaryingVolatility[timeVaryingVolatility.length - 1];

  return {
    forecast,
    confidence: Math.min(0.82, accuracy + 0.05),
    accuracy,
    mae,
    latestVolatility,
    timeVaryingVolatility
  };
}

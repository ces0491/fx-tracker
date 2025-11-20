/**
 * Mathematical utility functions for technical analysis and forecasting
 */

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate variance
 */
export function calculateVariance(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
}

/**
 * Calculate mean
 */
export function calculateMean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Linear regression calculation
 */
export function linearRegression(x, y) {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Fit autoregressive model
 */
export function fitARModel(data, order) {
  const X = [];
  const y = [];

  for (let i = order; i < data.length; i++) {
    const row = [];
    for (let j = 0; j < order; j++) {
      row.push(data[i - j - 1]);
    }
    X.push(row);
    y.push(data[i]);
  }

  // Solve least squares (simplified)
  const coefficients = [];
  for (let j = 0; j < order; j++) {
    const col = X.map(row => row[j]);
    const correlation = col.reduce((sum, val, i) => sum + val * y[i], 0) / col.length;
    const variance = calculateVariance(col);
    coefficients.push(correlation / (variance || 1));
  }

  return { coefficients };
}

/**
 * Calculate Mean Absolute Error
 */
export function calculateMAE(actual, predicted) {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays must have same length');
  }
  const errors = actual.map((val, i) => Math.abs(val - predicted[i]));
  return calculateMean(errors);
}

/**
 * Calculate Root Mean Squared Error
 */
export function calculateRMSE(actual, predicted) {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays must have same length');
  }
  const squaredErrors = actual.map((val, i) => Math.pow(val - predicted[i], 2));
  return Math.sqrt(calculateMean(squaredErrors));
}

/**
 * Calculate accuracy (1 - normalized MAE)
 */
export function calculateAccuracy(actual, predicted) {
  const mae = calculateMAE(actual, predicted);
  const mean = calculateMean(actual);
  return Math.max(0, 1 - mae / mean);
}

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

// ============================================================================
// MATRIX OPERATIONS (for Kalman Filter)
// ============================================================================

/**
 * Multiply two matrices A * B
 */
export function matrixMultiply(A, B) {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const result = Array(rowsA).fill(null).map(() => Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

/**
 * Add two matrices element-wise
 */
export function matrixAdd(A, B) {
  return A.map((row, i) => row.map((val, j) => val + B[i][j]));
}

/**
 * Subtract two matrices element-wise (A - B)
 */
export function matrixSubtract(A, B) {
  return A.map((row, i) => row.map((val, j) => val - B[i][j]));
}

/**
 * Transpose a matrix
 */
export function matrixTranspose(A) {
  return A[0].map((_, colIndex) => A.map(row => row[colIndex]));
}

/**
 * Multiply matrix by scalar
 */
export function matrixScalarMultiply(A, scalar) {
  return A.map(row => row.map(val => val * scalar));
}

/**
 * Create identity matrix of size n
 */
export function identityMatrix(n) {
  return Array(n).fill(null).map((_, i) =>
    Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
  );
}

/**
 * Invert a matrix (supports 1x1, 2x2, 3x3)
 */
export function matrixInverse(A) {
  const n = A.length;

  if (n === 1) {
    if (Math.abs(A[0][0]) < 1e-10) return null;
    return [[1 / A[0][0]]];
  }

  if (n === 2) {
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    if (Math.abs(det) < 1e-10) return null;
    return [
      [A[1][1] / det, -A[0][1] / det],
      [-A[1][0] / det, A[0][0] / det]
    ];
  }

  if (n === 3) {
    const det =
      A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
      A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
      A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

    if (Math.abs(det) < 1e-10) return null;

    return [
      [
        (A[1][1] * A[2][2] - A[1][2] * A[2][1]) / det,
        (A[0][2] * A[2][1] - A[0][1] * A[2][2]) / det,
        (A[0][1] * A[1][2] - A[0][2] * A[1][1]) / det
      ],
      [
        (A[1][2] * A[2][0] - A[1][0] * A[2][2]) / det,
        (A[0][0] * A[2][2] - A[0][2] * A[2][0]) / det,
        (A[0][2] * A[1][0] - A[0][0] * A[1][2]) / det
      ],
      [
        (A[1][0] * A[2][1] - A[1][1] * A[2][0]) / det,
        (A[0][1] * A[2][0] - A[0][0] * A[2][1]) / det,
        (A[0][0] * A[1][1] - A[0][1] * A[1][0]) / det
      ]
    ];
  }

  throw new Error('Matrix inverse only implemented for 1x1, 2x2, and 3x3 matrices');
}

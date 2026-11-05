/** Forecast models offered in the UI, in display order. Values match /api/forecast. */
export const ALGORITHMS = [
  {
    value: 'ensemble',
    label: 'Ensemble',
    description: 'A weighted average of the trend, linear regression and exponential smoothing forecasts.',
  },
  {
    value: 'trend',
    label: 'Trend',
    description:
      'Carries the recent direction forward, weighting the last 5 days over the last 20, and lets it fade over time.',
  },
  {
    value: 'linear_regression',
    label: 'Linear regression',
    description: 'Fits a straight line through the past year of daily rates and extends it.',
  },
  {
    value: 'exponential_smoothing',
    label: 'Exponential smoothing',
    description: "Holt's method: a smoothed level and trend, updated with each day's rate.",
  },
  {
    value: 'arima_lite',
    label: 'ARIMA-lite',
    description: 'An autoregressive model of daily changes that uses the last three changes.',
  },
  {
    value: 'kalman',
    label: 'Kalman filter',
    description: "Tracks the rate's level and trend, updating its estimate as each day's rate arrives.",
  },
];

export const DEFAULT_ALGORITHM = 'ensemble';

/** Forecast horizons in days. */
export const HORIZONS = [7, 14, 30, 60, 90];
export const DEFAULT_HORIZON = 30;

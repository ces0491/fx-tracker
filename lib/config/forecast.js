/** Forecast models offered in the UI, in display order. Values match /api/forecast. */
export const ALGORITHMS = [
  {
    value: 'ensemble',
    label: 'Ensemble',
    description: 'The average of the trend, linear regression and exponential smoothing forecasts, weighted equally.',
  },
  {
    value: 'trend',
    label: 'Trend',
    description:
      'Carries the recent average daily change forward, weighting the last 5 days over the last 20, and lets it fade over about a month.',
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
    description: 'An autoregressive model of daily changes that uses the last three changes, fitted by least squares.',
  },
  {
    value: 'kalman',
    label: 'Kalman filter',
    description:
      "Tracks the rate's level and a slope that fades over time, with the noise in each estimated from the data.",
  },
];

export const DEFAULT_ALGORITHM = 'ensemble';

/** Forecast horizons in days. */
export const HORIZONS = [7, 14, 30, 60, 90];
export const DEFAULT_HORIZON = 30;

/** The horizons as segmented-control options. */
export const HORIZON_OPTIONS = HORIZONS.map((days) => ({ value: String(days), label: `${days}d`, title: `${days} days` }));

/** A model's display name. */
export function algorithmLabel(value) {
  return ALGORITHMS.find((a) => a.value === value)?.label ?? value;
}

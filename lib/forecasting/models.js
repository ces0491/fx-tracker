/**
 * Forecasting models. Each takes a series of daily rates (oldest first) and a
 * horizon in steps, and returns { mean, lower, upper }: arrays of length
 * `horizon`, where [lower, upper] is a 95% prediction interval under that
 * model's assumptions. Models are deterministic.
 */
import { Z_975, leastSquares, logReturns, mean, nelderMead, sampleVariance, tQuantile975 } from './stats.js';

export const MIN_OBSERVATIONS = 30;

function check(prices, horizon) {
  if (!Array.isArray(prices) || prices.length < MIN_OBSERVATIONS) {
    throw new RangeError(`At least ${MIN_OBSERVATIONS} observations are needed`);
  }
  if (!Number.isInteger(horizon) || horizon < 1) throw new RangeError('Horizon must be a positive integer');
  if (!prices.every((p) => Number.isFinite(p) && p > 0)) throw new RangeError('Rates must be positive numbers');
}

function symmetric(means, sds, quantile) {
  return {
    mean: means,
    lower: means.map((m, i) => m - quantile * sds[i]),
    upper: means.map((m, i) => m + quantile * sds[i]),
  };
}

/**
 * Trend: carries the recent average daily change forward (70% weight on the
 * last 5 days, 30% on the last 20) and lets it decay with a 30-day time
 * constant. The interval is a random walk's, from the volatility of daily
 * log returns over the whole series.
 */
export function trendForecast(prices, horizon) {
  check(prices, horizon);
  const n = prices.length;
  const last = prices[n - 1];
  const shortDrift = (last - prices[n - 5]) / 4;
  const mediumDrift = (last - prices[n - 20]) / 19;
  const drift = 0.7 * shortDrift + 0.3 * mediumDrift;
  const dailySd = Math.sqrt(sampleVariance(logReturns(prices)));

  const means = [];
  const sds = [];
  let level = last;
  for (let i = 1; i <= horizon; i++) {
    level += drift * Math.exp(-i / 30);
    means.push(level);
    sds.push(last * dailySd * Math.sqrt(i));
  }
  return symmetric(means, sds, Z_975);
}

/**
 * Linear regression of the rate on time (0, 1, ..., n - 1), extended
 * forward, with the textbook prediction interval:
 * t(0.975, n - 2) * s * sqrt(1 + 1/n + (x0 - mean(x))^2 / Sxx).
 */
export function linearRegressionForecast(prices, horizon) {
  check(prices, horizon);
  const n = prices.length;
  const xBar = (n - 1) / 2;
  const yBar = mean(prices);
  let sxx = 0;
  let sxy = 0;
  for (let x = 0; x < n; x++) {
    sxx += (x - xBar) ** 2;
    sxy += (x - xBar) * (prices[x] - yBar);
  }
  const slope = sxy / sxx;
  const intercept = yBar - slope * xBar;

  let sse = 0;
  for (let x = 0; x < n; x++) sse += (prices[x] - (intercept + slope * x)) ** 2;
  const s = Math.sqrt(sse / (n - 2));

  const means = [];
  const sds = [];
  for (let i = 1; i <= horizon; i++) {
    const x0 = n - 1 + i;
    means.push(intercept + slope * x0);
    sds.push(s * Math.sqrt(1 + 1 / n + (x0 - xBar) ** 2 / sxx));
  }
  return symmetric(means, sds, tQuantile975(n - 2));
}

export const HOLT = { alpha: 0.3, beta: 0.1 };

/**
 * Holt's linear exponential smoothing with fixed alpha = 0.3 and beta = 0.1,
 * started as R's HoltWinters() starts it (level x2, trend x2 - x1). The
 * interval follows predict.HoltWinters: var(one-step errors) times
 * 1 + sum over j < h of (alpha * (1 + j * beta))^2.
 */
export function exponentialSmoothingForecast(prices, horizon) {
  check(prices, horizon);
  const { alpha, beta } = HOLT;
  let level = prices[1];
  let trend = prices[1] - prices[0];
  const errors = [];
  for (let t = 2; t < prices.length; t++) {
    errors.push(prices[t] - (level + trend));
    const previous = level;
    level = alpha * prices[t] + (1 - alpha) * (level + trend);
    trend = beta * (level - previous) + (1 - beta) * trend;
  }
  const variance = sampleVariance(errors);

  const means = [];
  const sds = [];
  let psiSum = 0;
  for (let h = 1; h <= horizon; h++) {
    if (h > 1) psiSum += (alpha * (1 + (h - 1) * beta)) ** 2;
    means.push(level + h * trend);
    sds.push(Math.sqrt(variance * (1 + psiSum)));
  }
  return symmetric(means, sds, Z_975);
}

export const AR_ORDER = 3;

/** AR coefficients for daily changes, fitted by least squares without an intercept. */
export function fitDifferenceAR(prices, order = AR_ORDER) {
  const d = [];
  for (let i = 1; i < prices.length; i++) d.push(prices[i] - prices[i - 1]);
  const X = [];
  const y = [];
  for (let t = order; t < d.length; t++) {
    X.push(Array.from({ length: order }, (_, k) => d[t - k - 1]));
    y.push(d[t]);
  }
  const phi = leastSquares(X, y);
  let sse = 0;
  for (let r = 0; r < X.length; r++) {
    const fitted = X[r].reduce((sum, v, k) => sum + phi[k] * v, 0);
    sse += (y[r] - fitted) ** 2;
  }
  return { phi, sigma2: sse / (X.length - order), differences: d };
}

/**
 * ARIMA(3,1,0) without a constant: an AR(3) model of daily changes. The
 * interval uses the psi weights of the integrated process,
 * var(h) = sigma^2 * sum over j < h of psi_j^2.
 */
export function arimaLiteForecast(prices, horizon) {
  check(prices, horizon);
  const { phi, sigma2, differences } = fitDifferenceAR(prices);
  const p = phi.length;

  // psi weights of 1 / ((1 - phi(B)) (1 - B))
  const a = [1 + phi[0]];
  for (let k = 1; k < p; k++) a.push(phi[k] - phi[k - 1]);
  a.push(-phi[p - 1]);
  const psi = [1];
  for (let j = 1; j < horizon; j++) {
    let value = 0;
    for (let k = 1; k <= a.length; k++) if (j - k >= 0) value += a[k - 1] * psi[j - k];
    psi.push(value);
  }

  const recent = differences.slice(-p);
  let level = prices[prices.length - 1];
  const means = [];
  const sds = [];
  let psiSquares = 0;
  for (let h = 1; h <= horizon; h++) {
    let change = 0;
    for (let k = 0; k < p; k++) change += phi[k] * recent[recent.length - 1 - k];
    recent.push(change);
    level += change;
    psiSquares += psi[h - 1] ** 2;
    means.push(level);
    sds.push(Math.sqrt(sigma2 * psiSquares));
  }
  return symmetric(means, sds, Z_975);
}

/**
 * Kalman filter for a damped local linear trend in log rates:
 *   y_t = level_t + e_t
 *   level_{t+1} = level_t + slope_t + u_t
 *   slope_{t+1} = SLOPE_DAMPING * slope_t + w_t
 * The damping makes a slope fade (half-life about two weeks), so forecasts
 * don't extend the latest move indefinitely. Noise variances are estimated
 * by maximum likelihood: the level variance is concentrated out and the two
 * ratios are found by Nelder-Mead. The first two observations initialise the
 * diffuse state and are left out of the likelihood. Returns rates (the
 * exponentiated log forecast, i.e. the median) and the filter's one-step-ahead
 * standard deviation of log rates.
 */
export const SLOPE_DAMPING = 0.95;
const DIFFUSE = 1e7;
const LOG_RATIO_BOUNDS = [-30, 10];

function runLocalLinearTrend(y, ratioObs, ratioSlope) {
  let a0 = y[0];
  let a1 = 0;
  let p00 = DIFFUSE;
  let p01 = 0;
  let p11 = DIFFUSE;
  let sumLogF = 0;
  let sumScaled = 0;
  let count = 0;
  let lastF = NaN;

  for (let t = 0; t < y.length; t++) {
    const v = y[t] - a0;
    const F = p00 + ratioObs;
    const k0 = p00 / F;
    const k1 = p01 / F;
    // update
    const u0 = a0 + k0 * v;
    const u1 = a1 + k1 * v;
    const q00 = p00 - k0 * p00;
    const q01 = p01 - k0 * p01;
    const q11 = p11 - k1 * p01;
    // predict with T = [[1, 1], [0, damping]], Q = diag(1, ratioSlope)
    a0 = u0 + u1;
    a1 = SLOPE_DAMPING * u1;
    p00 = q00 + 2 * q01 + q11 + 1;
    p01 = SLOPE_DAMPING * (q01 + q11);
    p11 = SLOPE_DAMPING ** 2 * q11 + ratioSlope;

    if (t >= 2) {
      sumLogF += Math.log(F);
      sumScaled += (v * v) / F;
      count += 1;
      lastF = F;
    }
  }
  const scale = sumScaled / count;
  return {
    logLikelihood: -0.5 * (count * Math.log(scale) + sumLogF),
    scale,
    state: { a0, a1, p00, p01, p11 },
    lastF,
  };
}

export function fitLocalLinearTrend(prices) {
  const y = prices.map(Math.log);
  const clamp = (v) => Math.min(LOG_RATIO_BOUNDS[1], Math.max(LOG_RATIO_BOUNDS[0], v));
  const objective = ([logObs, logSlope]) => -runLocalLinearTrend(y, Math.exp(clamp(logObs)), Math.exp(clamp(logSlope))).logLikelihood;
  const { x } = nelderMead(objective, [-4, -8], { step: 2 });
  const ratioObs = Math.exp(clamp(x[0]));
  const ratioSlope = Math.exp(clamp(x[1]));
  const fit = runLocalLinearTrend(y, ratioObs, ratioSlope);
  return {
    ...fit,
    variances: { level: fit.scale, observation: ratioObs * fit.scale, slope: ratioSlope * fit.scale },
    oneStepSd: Math.sqrt(fit.lastF * fit.scale),
  };
}

export function kalmanForecast(prices, horizon) {
  check(prices, horizon);
  const fit = fitLocalLinearTrend(prices);
  const { observation, slope: slopeVariance } = fit.variances;
  const s = fit.scale;
  let { a0, a1, p00, p01, p11 } = fit.state;
  p00 *= s;
  p01 *= s;
  p11 *= s;

  const mean = [];
  const lower = [];
  const upper = [];
  for (let h = 1; h <= horizon; h++) {
    if (h > 1) {
      a0 += a1;
      a1 *= SLOPE_DAMPING;
      const n00 = p00 + 2 * p01 + p11 + s;
      const n01 = SLOPE_DAMPING * (p01 + p11);
      const n11 = SLOPE_DAMPING ** 2 * p11 + slopeVariance;
      p00 = n00;
      p01 = n01;
      p11 = n11;
    }
    const sd = Math.sqrt(p00 + observation);
    mean.push(Math.exp(a0));
    lower.push(Math.exp(a0 - Z_975 * sd));
    upper.push(Math.exp(a0 + Z_975 * sd));
  }
  return { mean, lower, upper, oneStepSd: fit.oneStepSd };
}

/**
 * Ensemble: equal-weight average of the trend, linear regression and
 * exponential smoothing forecasts. Its interval averages the members'
 * distances to their bounds, which is what the members' errors would give if
 * they moved together; that is the cautious assumption.
 */
export function ensembleForecast(prices, horizon) {
  check(prices, horizon);
  const members = [
    trendForecast(prices, horizon),
    linearRegressionForecast(prices, horizon),
    exponentialSmoothingForecast(prices, horizon),
  ];
  const at = (key, i) => members.map((m) => m[key][i]);
  const means = [];
  const lower = [];
  const upper = [];
  for (let i = 0; i < horizon; i++) {
    const m = mean(at('mean', i));
    means.push(m);
    lower.push(m - mean(members.map((f) => f.mean[i] - f.lower[i])));
    upper.push(m + mean(members.map((f) => f.upper[i] - f.mean[i])));
  }
  return { mean: means, lower, upper };
}

export const MODELS = {
  trend: trendForecast,
  linear_regression: linearRegressionForecast,
  exponential_smoothing: exponentialSmoothingForecast,
  arima_lite: arimaLiteForecast,
  kalman: kalmanForecast,
  ensemble: ensembleForecast,
};

export function runModel(algorithm, prices, horizon) {
  const model = MODELS[algorithm];
  if (!model) throw new RangeError(`Unknown algorithm: ${algorithm}`);
  return model(prices, horizon);
}

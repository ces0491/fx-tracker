/** Numerical helpers for the forecasting models. */

/** 97.5% quantile of the standard normal, qnorm(0.975). */
export const Z_975 = 1.959963984540054;

/**
 * Central prediction intervals drawn as the forecast fan, keyed by coverage
 * (percent), with the standard normal quantile each one needs:
 * qnorm(0.75), qnorm(0.9) and qnorm(0.975).
 */
export const INTERVAL_Z = {
  50: 0.6744897501960817,
  80: 1.2815515655446004,
  95: Z_975,
};

export function mean(values) {
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/** Sample variance (n - 1 denominator), as R's var(). */
export function sampleVariance(values) {
  const m = mean(values);
  let sum = 0;
  for (const v of values) sum += (v - m) ** 2;
  return sum / (values.length - 1);
}

export function logReturns(prices) {
  const out = new Array(prices.length - 1);
  for (let i = 1; i < prices.length; i++) out[i - 1] = Math.log(prices[i] / prices[i - 1]);
  return out;
}

/**
 * Quantile of Student's t with `df` degrees of freedom at the probability
 * whose standard normal quantile is `z`, from the Cornish-Fisher expansion.
 * Against R's qt() the error at the 97.5% point is about 3e-8 at df = 30 and
 * shrinks with df; every fit here has hundreds.
 */
export function tQuantile(z, df) {
  const g1 = (z ** 3 + z) / 4;
  const g2 = (5 * z ** 5 + 16 * z ** 3 + 3 * z) / 96;
  const g3 = (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / 384;
  const g4 = (79 * z ** 9 + 776 * z ** 7 + 1482 * z ** 5 - 1920 * z ** 3 - 945 * z) / 92160;
  return z + g1 / df + g2 / df ** 2 + g3 / df ** 3 + g4 / df ** 4;
}

export function tQuantile975(df) {
  return tQuantile(Z_975, df);
}

/**
 * Least squares without an intercept: solves (X'X) b = X'y by Gaussian
 * elimination with partial pivoting. X is an array of rows.
 */
export function leastSquares(X, y) {
  const k = X[0].length;
  const A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (let r = 0; r < X.length; r++) {
    const row = X[r];
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) A[i][j] += row[i] * row[j];
      A[i][k] += row[i] * y[r];
    }
  }
  for (let col = 0; col < k; col++) {
    let pivot = col;
    for (let r = col + 1; r < k; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    if (Math.abs(A[pivot][col]) < 1e-300) throw new Error('Least squares system is singular');
    [A[col], A[pivot]] = [A[pivot], A[col]];
    for (let r = 0; r < k; r++) {
      if (r === col) continue;
      const factor = A[r][col] / A[col][col];
      for (let c = col; c <= k; c++) A[r][c] -= factor * A[col][c];
    }
  }
  return A.map((row, i) => row[k] / row[i]);
}

/**
 * Nelder-Mead minimisation of f over R^n, starting from x0 with initial
 * simplex steps `step`. Deterministic: same inputs give the same result.
 */
export function nelderMead(f, x0, { step = 1, maxIterations = 500, tolerance = 1e-10 } = {}) {
  const n = x0.length;
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const point = x0.slice();
    point[i] += step;
    simplex.push(point);
  }
  let values = simplex.map(f);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const order = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
    simplex = order.map((i) => simplex[i]);
    values = order.map((i) => values[i]);
    if (Math.abs(values[n] - values[0]) <= tolerance * (Math.abs(values[0]) + tolerance)) break;

    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
    const along = (t) => centroid.map((c, j) => c + t * (simplex[n][j] - c));

    const reflected = along(-1);
    const fr = f(reflected);
    if (fr < values[0]) {
      const expanded = along(-2);
      const fe = f(expanded);
      [simplex[n], values[n]] = fe < fr ? [expanded, fe] : [reflected, fr];
    } else if (fr < values[n - 1]) {
      [simplex[n], values[n]] = [reflected, fr];
    } else {
      const contracted = fr < values[n] ? along(-0.5) : along(0.5);
      const fc = f(contracted);
      if (fc < Math.min(fr, values[n])) {
        [simplex[n], values[n]] = [contracted, fc];
      } else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]));
          values[i] = f(simplex[i]);
        }
      }
    }
  }

  const best = values.indexOf(Math.min(...values));
  return { x: simplex[best], value: values[best] };
}

/**
 * Technical indicators over a daily series of { date, close } points.
 * Each indicator is undefined until enough observations exist for its window.
 */

export const INDICATORS = {
  SMA_SHORT: 5,
  SMA_LONG: 20,
  BOLLINGER_PERIOD: 20,
  BOLLINGER_WIDTH: 2,
  RSI_PERIOD: 14,
};

function mean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Returns a new array of points with sma5, sma20, bbUpper, bbLower and rsi.
 * RSI uses simple averages of gains and losses over the period.
 */
export function withIndicators(series) {
  const { SMA_SHORT, SMA_LONG, BOLLINGER_PERIOD, BOLLINGER_WIDTH, RSI_PERIOD } = INDICATORS;
  const closes = series.map((p) => p.close);

  return series.map((point, i) => {
    const out = { ...point };

    if (i >= SMA_SHORT - 1) {
      out.sma5 = mean(closes.slice(i - SMA_SHORT + 1, i + 1));
    }
    if (i >= SMA_LONG - 1) {
      out.sma20 = mean(closes.slice(i - SMA_LONG + 1, i + 1));
    }
    if (i >= BOLLINGER_PERIOD - 1) {
      const window = closes.slice(i - BOLLINGER_PERIOD + 1, i + 1);
      const m = mean(window);
      const sd = Math.sqrt(mean(window.map((v) => (v - m) ** 2)));
      out.bbUpper = m + BOLLINGER_WIDTH * sd;
      out.bbLower = m - BOLLINGER_WIDTH * sd;
    }
    if (i >= RSI_PERIOD) {
      let gains = 0;
      let losses = 0;
      for (let j = i - RSI_PERIOD + 1; j <= i; j++) {
        const change = closes[j] - closes[j - 1];
        if (change > 0) gains += change;
        else losses -= change;
      }
      // No change over the window (a pegged rate) leaves nothing to measure, so there is no RSI; the formula would
      // read 100, as if the rate had only risen.
      if (gains === 0 && losses === 0) out.rsi = null;
      else out.rsi = losses === 0 ? 100 : 100 - 100 / (1 + gains / losses);
    }
    return out;
  });
}

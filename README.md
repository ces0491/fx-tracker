# FX Tracker

Daily exchange rates, technical indicators and statistical forecasts for
currency pairs. Built with Next.js, with rate data from
[Frankfurter](https://frankfurter.dev).

## Features

- **Daily rates**: blended daily mid-market rates from Frankfurter v2, which
  combines central-bank and other official sources. Rates are daily, not
  intraday, and each is shown with its date. Frankfurter can revise a day's
  blended rate as more sources report.
- **Currencies**: the active ISO 4217 currencies Frankfurter publishes.
  Crypto-assets and other non-ISO codes are excluded. Each currency code in the
  page heading opens a searchable list; the swap button reverses the pair.
- **Shareable links**: the selected pair is kept in the URL, for example
  `/?pair=NZD-ZAR`.
- **History**: one year of daily rates per pair, with 1M, 3M, 6M, YTD and 1Y
  ranges and CSV export.
- **Technical indicators**: 5- and 20-day simple moving averages, Bollinger
  Bands (20-day, 2 standard deviations), 14-day RSI, and support/resistance
  (the lowest and highest rate over the last 30 observations).
- **Volatility**: volatility of daily log returns over the last 30
  observations, annualised at the series' own frequency. Frankfurter's blended
  series is calendar-daily, so that is about 365 observations a year.
- **Forecasts**: six models over horizons of 7, 14, 30, 60 or 90 days, each
  fitted to the last 365 daily rates and shown with its 95% prediction
  interval:
  - Trend: recent average daily change, fading with a 30-day time constant;
    random-walk interval
  - Linear regression on time, with the textbook prediction interval
  - Exponential smoothing: Holt's method with alpha 0.3 and beta 0.1, interval
    as R's `predict.HoltWinters`
  - ARIMA-lite: ARIMA(3,1,0) without a constant, AR coefficients by least
    squares, interval from the psi weights
  - Kalman filter: damped local linear trend in log rates (slope damping 0.95),
    noise variances by maximum likelihood
  - Ensemble: equal-weight average of trend, linear regression and exponential
    smoothing; its interval averages the members' half-widths
- **Track record**: every forecast comes with a back-test. Over the last 52
  weeks the model is refitted each week on the preceding 365 days, and its
  forecast at the chosen horizon is compared with the rate that followed. The
  page shows the average absolute percentage miss, the same figure for a
  no-change forecast, and how many actual rates landed inside the 95% range.
- **Popular pairs**: latest rate, change on the previous day and a 30-day
  sparkline for 18 preset pairs.
- **Accessibility**: every chart has a table view, controls work from the
  keyboard, and the light and dark themes follow the system setting.

## Tech stack

- Next.js 15: App Router for the page, Pages Router for the API routes
- React 19, Tailwind CSS 4, Recharts, lucide-react
- Radix UI primitives and cmdk for the controls, TanStack Query for data fetching
- Colours and type follow sheetsolved.com (Geist, brand navy)
- Hosted on Vercel

## Getting started

Requires Node.js 22.12 or later (Vitest 5 needs it; the app itself runs on 18.18 or later).

```bash
git clone https://github.com/ces0491/fx-tracker.git
cd fx-tracker
npm install
npm run dev
```

Then open <http://localhost:3000>. No environment variables or API keys are
needed.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

## API routes

| Route | Method | Returns |
| --- | --- | --- |
| `/api/currencies` | GET | Currencies available from Frankfurter (ISO 4217 only) |
| `/api/latest` | GET | Latest rate, change on the previous day and the last 30 days for the popular pairs |
| `/api/historical?pair=NZD/ZAR` | GET | One year of daily rates as `{ date, close }` |
| `/api/forecast?pair=NZD/ZAR&algorithm=ensemble&horizon=30` | GET | Forecast with its 95% interval and back-test |

Vercel's CDN caches every route above for an hour and may serve a stale
copy for up to a day while it refreshes
(`Vercel-CDN-Cache-Control: public, max-age=3600, stale-while-revalidate=86400`).
Browsers revalidate on every request
(`Cache-Control: public, max-age=0, must-revalidate`), so a visitor's own
cache never shows an older rate than the CDN has.

`/api/historical` returns 400 for a malformed or unsupported pair, 422 when
fewer than 30 daily rates exist for the pair in the last year, and 502 when
Frankfurter can't be reached or returns a server error.

`/api/latest` response, abridged:

```json
{
  "source": { "name": "Frankfurter", "url": "https://frankfurter.dev" },
  "rates": {
    "NZD/ZAR": {
      "rate": 9.2404,
      "date": "2026-11-05",
      "previousRate": 9.2823,
      "previousDate": "2026-11-04",
      "changePct": -0.451,
      "series": [{ "date": "2026-10-06", "close": 9.2873 }]
    }
  }
}
```

`/api/forecast` fetches three years of rates for the pair, fits the model to
the last 365 and runs the back-test. `algorithm` is one of `ensemble`,
`trend`, `linear_regression`, `exponential_smoothing`, `arima_lite` or
`kalman`; `horizon` is 7, 14, 30, 60 or 90. Anything else gets a 400. The
response, abridged:

```json
{
  "pair": "NZD/ZAR",
  "algorithm": "kalman",
  "horizon": 30,
  "asOf": "2026-11-05",
  "interval": 0.95,
  "forecast": [{ "date": "2026-11-06", "rate": 9.2233, "lower": 9.1716, "upper": 9.2754 }],
  "backtest": {
    "forecasts": 52,
    "firstOrigin": "2025-10-14",
    "lastOrigin": "2026-10-06",
    "meanAbsPctError": 2.13,
    "noChangeMeanAbsPctError": 1.75,
    "held": 52,
    "coverage": 1
  }
}
```

`backtest` is null when the pair has too little history for 12 weekly
origins.

## Tests

`npm test` runs the Vitest suite in `tests/`. The model tests use three years
of real NZD/ZAR, EUR/USD and USD/JPY rates saved in `tests/fixtures/`, and
check linear regression, Holt and ARIMA-lite against values computed in R
(`tests/reference/expected.json`). To regenerate those values, run
`Rscript tests/reference/generate.R` from the project root (needs R and the
jsonlite package). GitHub Actions runs lint, tests and the build on every pull
request and every push to `main`.

## Project structure

```text
app/                 Page, root layout, error boundary, query provider
components/
  fx/                Page sections: header, pair heading, chart, forecast,
                     statistics, popular pairs, how it works, footer
  ui/                Small shared controls (segmented control, switch, series key)
lib/
  analysis/          Indicators, summary statistics, chart rows and axis ticks
  api/               Shared API response helpers
  client/            Data-fetching hooks and CSV export
  config/            Pairs, chart ranges and overlays, forecast models, links
  data/              Frankfurter v2 client
  forecasting/       Models, back-test and numerical helpers
  utils/             Maths and date helpers
pages/api/           API routes
tests/               Vitest suite, rate fixtures and R reference values
```

## Licence

MIT. See [LICENSE](LICENSE).

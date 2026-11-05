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
- **History**: one year of daily rates per pair, with 1M, 3M, 6M, 12M and YTD
  ranges and CSV export.
- **Technical indicators**: 5- and 20-day simple moving averages, Bollinger
  Bands (20-day, 2 standard deviations), 14-day RSI, and support/resistance
  (the lowest and highest rate over the last 30 observations).
- **Volatility**: volatility of daily log returns over the last 30
  observations, annualised at the series' own frequency. Frankfurter's blended
  series is calendar-daily, so that is about 365 observations a year.
- **Forecasts**: six algorithms over horizons of 7, 14, 30, 60 or 90 days, each
  with upper and lower bands:
  - Trend-based
  - Linear regression
  - Exponential smoothing (Holt)
  - ARIMA-lite (autoregressive model on daily differences)
  - Kalman filter
  - Ensemble (weighted average of trend, linear regression and exponential
    smoothing)
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

Requires Node.js 18.18 or later.

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

## API routes

| Route | Method | Returns |
| --- | --- | --- |
| `/api/currencies` | GET | Currencies available from Frankfurter (ISO 4217 only) |
| `/api/latest` | GET | Latest rate, change on the previous day and the last 30 days for the popular pairs |
| `/api/historical?pair=NZD/ZAR` | GET | One year of daily rates as `{ date, close }` |
| `/api/forecast` | POST | Forecast for a series of daily rates |

Vercel's CDN caches the three rate routes for an hour and may serve a stale
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

`/api/forecast` takes a JSON body with `historicalData` (the `{ date, close }`
array from `/api/historical`), `algorithm` (`trend`, `linear_regression`,
`exponential_smoothing`, `arima_lite`, `kalman` or `ensemble`) and
`forecastDays`. It returns `forecast`, an array of `{ date, rate, upper, lower }`.

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
  forecasting/       Forecasting algorithms
  utils/             Maths and date helpers
pages/api/           API routes
```

## Licence

MIT. See [LICENSE](LICENSE).

# SCOPE — FX Tracker

## Purpose

A free public tool at fx.sheetsolved.com showing daily reference rates, real
history, technical indicators and statistical forecasts for currency pairs,
built to showcase Sheet Solved's quantitative work and bring in consulting
enquiries.

## Done

Data
- [ ] Current and historical rates come from Frankfurter only
- [ ] No synthetic or randomised values in the data or forecast path
      (`Math.random` absent from `lib/` and `pages/api/`)
- [ ] Unsupported pairs return a clear error, not a series
- [ ] Currency list matches what Frankfurter supports
- [ ] Charts plot closes only; invented OHLC, volume and the candlestick option removed
- [ ] Rates labelled as daily reference rates with their as-of date; "live" wording removed
- [ ] Source attribution shown where a provider's terms require it

Forecasts (all six algorithms kept)
- [ ] Same input gives the same output
- [ ] Kalman's reported volatility is within a factor of 2 of realised 1-year
      volatility on NZD/ZAR, EUR/USD and USD/JPY
- [ ] Linear-regression interval matches a reference implementation on a fixed series
- [ ] Confidence and accuracy are computed from a rolling out-of-sample
      back-test against a random walk, or removed from the UI
- [ ] Help text describes what each algorithm and metric actually does
- [ ] Unit tests (Vitest) for each algorithm on fixed fixtures
- [ ] A model performance page sets the six models' back-tests beside the
      no-change forecast, with verdicts that allow for overlapping forecasts

Public hardening
- [ ] News, AI enrichment, `/api/rates`, `/api/news*` and the Anthropic SDK removed
- [ ] `/api/forecast` rejects unknown algorithms, horizons outside 7/14/30/60/90
      and oversized history with a 400
- [ ] Upstream responses cached in line with Frankfurter's daily update
- [ ] One history + forecast request per pair change; stale responses discarded
- [ ] Error boundary: a bad response shows an error state, not a blank page
- [ ] No applicable critical or high `npm audit` findings
- [ ] "General information, not financial advice" disclaimer on the page

Presentation
- [ ] Sheet Solved branding, title, meta description and OG image
- [ ] Link back to sheetsolved site with a contact call to action
- [ ] No horizontal scroll at 375px width
- [ ] Cookieless analytics (Vercel Web Analytics) on visits and CTA clicks
- [ ] Served at fx.sheetsolved.com over HTTPS

Repo
- [ ] README matches the app
- [ ] `python-forecast-service/`, Docker files and orphaned state/imports removed
- [ ] Lint, build and tests run in GitHub Actions on pull requests

## Out of scope (v1)

- News feed and AI enrichment: NewsAPI and GNews free tiers bar production use
- Economic calendar: ForexFactory feed terms couldn't be confirmed
- Python ML models
- Intraday rates, OHLC data, candlesticks
- Accounts, saved pairs, alerts, paid tier
- A public rates API
- Hosting on a path of, or embedded in, the main Sheet Solved site

## Bar

Public production tool at small scale. The numbers on screen are the product:
each figure traces to source data or a documented calculation. Validation on
API inputs, error handling at external calls, no unbounded resource use, no
secrets in client code. Auth, SLAs, on-call and load testing beyond caching
are not required.

## Decision

Ces, once the Done list is ticked and the NZD/ZAR, EUR/USD and USD/JPY figures
have been checked by hand against Frankfurter, before the link goes live on the
Sheet Solved site.

## Revision history

- 2026-11-05: initial scope
- 2026-11-06: added the model performance page, at Ces's request

# 🌍 FX Tracker

A foreign exchange tracking application built with Next.js,
featuring daily reference rates, forecasting, historical data
analysis, technical indicators, and market news.

![FX Tracker Pro](https://img.shields.io/badge/Next.js-15.4.2-black)
![React](https://img.shields.io/badge/React-18.x-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC)
![Python](https://img.shields.io/badge/Python-3.11-blue)
![ML](https://img.shields.io/badge/ML-Ready-green)

## ✨ Features

### 🔄 Rate Data

- **Daily Reference Rates**: Blended daily mid-market rates from
  [Frankfurter](https://frankfurter.dev) v2, which combines central-bank and
  other official sources. Rates are daily, not intraday, and each is shown with its date.
- **Currencies**: The active ISO 4217 currencies Frankfurter publishes.
  Crypto-assets and other non-ISO codes are excluded.
- **No API Keys**: Frankfurter needs no key. All rate requests go through the
  app's own API routes, which are cached at the CDN for an hour.

### 📊 Analytics & Charting

- **1-Year Historical Data**: One year of daily rates per pair from Frankfurter
- **Technical Indicators**:
  - Simple Moving Averages (5-day, 20-day)
  - Bollinger Bands
  - RSI (Relative Strength Index)
  - Support/Resistance levels
- **Line Chart**: Daily rates with indicator overlays and forecast bands
- **Date Ranges and Export**: Quick 1M/3M/6M/12M/YTD ranges and CSV export

### 🤖 Forecasting

**9 Forecasting Algorithms** with hybrid JavaScript + Python architecture:

**JavaScript Algorithms** (Built-in, no setup required):

- Trend-Based (65% confidence)
- Linear Regression (70% confidence)
- Exponential Smoothing (72% confidence)
- ARIMA-Lite (75% confidence)
- **Ensemble** (80% confidence) ⭐ Recommended

**Python ML Algorithms** (Optional, requires Python service):

- Facebook Prophet (88% confidence) - Best for seasonal patterns
- LSTM Neural Network (85% confidence) - Complex patterns
- GARCH Volatility (82% confidence) - Risk management
- XGBoost (83% confidence) - Short-term predictions

**Features**:

- 95% confidence intervals with upper/lower bounds
- Forecast horizons: 7, 14, 30, 60, 90 days
- Real-time accuracy metrics
- Algorithm comparison and selection
- Automatic fallback to JavaScript if Python unavailable

See [FORECASTING.md](FORECASTING.md) for detailed documentation.

### 📈 Tools

- **Popular Pairs**: Pre-configured currency pairs (NZD/ZAR, EUR/USD, etc.)
- **Custom Pair Selection**: Choose any base and quote currency combination
- **Data Export**: Download historical data and indicators as CSV
- **Volatility Analysis**: Annual volatility calculations with risk assessment

### 📰 Market Intelligence

- **Real Financial News**: Live forex news from RSS feeds (ForexLive)
- **Multiple News Sources**: NewsAPI.org (free), GNews (free), RSS aggregation with fallback
- **AI Sentiment Analysis**: Automatic bullish/bearish/neutral classification
- **Impact Classification**: High/Medium/Low impact rating
- **Currency Extraction**: Automatically identifies relevant currencies
- **Economic Calendar**: Real 2025 events including:
  - Federal Reserve FOMC meetings
  - ECB Governing Council meetings
  - RBNZ OCR decisions
  - SARB MPC meetings
  - CPI releases (US, NZ, South Africa)

### 🔒 Security & Performance

- **Secure API Architecture**: All external API calls routed through backend
- **Environment Variable Protection**: API keys never exposed to frontend
- **Error Handling**: Comprehensive error handling with retry logic
- **Responsive Design**: Mobile-first design with Tailwind CSS

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 15.4.2
- **UI**: React 18.x with Hooks
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel-ready

### Backend APIs (Node.js)

- **Rates (latest and historical)**: Frankfurter v2 (free, no key)
- **News**: ForexLive RSS (free, no key)
- **Events**: Static 2025 calendar + external APIs
- **Forecasting**: 5 JavaScript algorithms built-in

### Optional Python Microservice

- **Framework**: Flask 3.0
- **ML Libraries**:
  - Facebook Prophet 1.1.5
  - TensorFlow 2.15.0
  - XGBoost 2.0.3
  - GARCH (arch 6.3.0)
- **Deployment**: Docker-ready with docker-compose

## 📦 Installation

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- (Optional) Python 3.11+ for ML forecasting
- (Optional) Docker for Python service

### Quick Start (No API Keys Needed!)

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/fx-tracker.git
   cd fx-tracker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**

   Navigate to `http://localhost:3000`

**That's it!** The app works immediately with free APIs.

### Optional: Add API Keys for Enhanced Features

1. **Copy environment template**

   ```bash
   cp .env.example .env.local
   ```

2. **Add FREE API keys** (see [.env.example](.env.example) for step-by-step instructions):

   ```env
   NEWS_API_KEY=your_newsapi_key           # newsapi.org
   GNEWS_API_KEY=your_gnews_key            # gnews.io
   ```

### Optional: Python ML Forecasting Service

For advanced ML algorithms (Prophet, LSTM, GARCH, XGBoost):

#### Option 1: Docker (Recommended)

```bash
cd python-forecast-service
docker-compose up -d
```

#### Option 2: Local Python

```bash
cd python-forecast-service
pip install -r requirements.txt
python app.py
```

See [python-forecast-service/README.md](python-forecast-service/README.md) for details.

## 🔑 API Keys (All Optional!)

### ✅ Works Without Any API Keys

The app uses free fallback services:

- **Rates**: Frankfurter v2 (free, no key)
- **News**: ForexLive RSS (free, no key)
- **Events**: Static 2025 economic calendar

### Free API Keys for Enhanced Features (100% Free!)

| API | Purpose | Free Tier | Setup Time |
|-----|---------|-----------|------------|
| **NewsAPI.org** | Better news coverage | 100 req/day | [Sign up](https://newsapi.org/) - 2 min |
| **GNews API** | Alternative news | 100 req/day | [Sign up](https://gnews.io/) - 2 min |

**Note**: All APIs above are 100% free forever. No credit card required!

### Environment Variables

See [.env.example](.env.example) for complete configuration with detailed notes.

### Production Deployment (Vercel)

1. **Deploy to Vercel**

   ```bash
   npm install -g vercel
   vercel
   ```

2. **Optional: Add API keys in Vercel dashboard**
   - Settings → Environment Variables
   - Add any optional keys

3. **Python Service** (optional):
   - Deploy Python service separately (Railway, Render, or own server)
   - Set `PYTHON_FORECAST_SERVICE_URL` in Vercel

## 📁 Project Structure

```text
fx-tracker/
├── components/
│   └── FXTracker.js              # Main React component
├── pages/
│   ├── api/                      # Backend API routes (Node.js)
│   │   ├── currencies.js        # Currencies available from Frankfurter
│   │   ├── latest.js            # Latest rates for the popular pairs
│   │   ├── historical.js        # One year of daily rates for a pair
│   │   ├── forecast.js          # 5 JS forecasting algorithms
│   │   ├── news.js              # Live financial news
│   │   └── events.js            # Economic calendar
│   ├── _app.js                  # Next.js app wrapper
│   └── index.js                 # Main page
├── python-forecast-service/      # Optional ML microservice
│   ├── app.py                   # Flask REST API
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile               # Docker configuration
│   ├── docker-compose.yml       # Docker Compose setup
│   └── README.md                # Python service docs
├── public/                       # Static assets
├── styles/                       # Global styles
├── .env.example                 # Environment template
├── FORECASTING.md               # Forecasting documentation
├── package.json                 # Node dependencies
└── README.md                    # This file
```

## 🔌 API Endpoints

### Backend API Routes (Next.js)

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/currencies` | GET | Currencies available from Frankfurter (ISO 4217 only) | < 1s |
| `/api/latest` | GET | Latest rate and change on the previous day for the popular pairs | < 2s |
| `/api/historical?pair=NZD/ZAR` | GET | One year of daily rates (`date`, `close`) | < 2s |
| `/api/forecast` | POST | Generate forecast with selected algorithm | < 5s |
| `/api/news` | GET | Live financial news with sentiment | < 2s |
| `/api/events` | GET | Economic calendar (next 90 days) | < 1s |

### Python ML Service (Optional)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `http://localhost:5000/forecast` | POST | Advanced ML forecasts |
| `http://localhost:5000/health` | GET | Service health check |
| `http://localhost:5000/algorithms` | GET | List available algorithms |

### Example Responses

`/api/historical` returns 400 for a malformed or unsupported pair, 422 when
fewer than 30 daily rates exist for the pair in the last year, and 502 when
Frankfurter can't be reached.

**Latest** (`/api/latest`, abridged):

```json
{
  "source": { "name": "Frankfurter", "url": "https://frankfurter.dev" },
  "rates": {
    "NZD/ZAR": {
      "rate": 9.2404,
      "date": "2026-11-05",
      "previousRate": 9.2823,
      "previousDate": "2026-11-04",
      "changePct": -0.451
    }
  }
}
```

**Forecast**:

```json
{
  "forecast": [
    {
      "date": "2025-02-20",
      "rate": 9.7123,
      "upper": 9.8456,
      "lower": 9.5790
    }
  ],
  "algorithm": "ensemble",
  "confidence": 0.80,
  "accuracy": 0.78
}
```

## 📊 Features Deep Dive

### Technical Analysis

- **Moving Averages**: 5 and 20-period SMAs for trend identification
- **Bollinger Bands**: Volatility bands with 2σ standard deviations
- **RSI**: 14-period momentum oscillator
- **Support/Resistance**: Lowest and highest daily rate over the last 30 observations
- **Volatility**: 30-observation volatility, annualised at the series' own
  frequency (Frankfurter's blended series is calendar-daily, so about 365 a year)

### Advanced Forecasting System

**9 Algorithms Available**:

| Algorithm | Type | Confidence | Speed | Best For |
|-----------|------|------------|-------|----------|
| Trend | JS | 65% | ⚡⚡⚡ | Quick analysis |
| Linear Regression | JS | 70% | ⚡⚡⚡ | Trend analysis |
| Exp. Smoothing | JS | 72% | ⚡⚡ | General use |
| ARIMA-Lite | JS | 75% | ⚡⚡ | Pattern recognition |
| **Ensemble** | JS | **80%** | ⚡⚡ | **Production** |
| Prophet | Python | 88% | ⚡ | Seasonality |
| LSTM | Python | 85% | ⚡ | Complex patterns |
| GARCH | Python | 82% | ⚡⚡ | Volatility |
| XGBoost | Python | 83% | ⚡ | Short-term |

**Features**:

- 95% confidence intervals
- Backtesting metrics (MAE, accuracy)
- Automatic fallback to JS if Python unavailable
- Horizon selection: 7, 14, 30, 60, 90 days

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE)
file for details.

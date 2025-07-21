# 🌍 FX Tracker

A foreign exchange tracking application built with Next.js, featuring real-time currency rates, historical data analysis, technical indicators, and market news.

![FX Tracker Pro](https://img.shields.io/badge/Next.js-15.4.2-black) ![React](https://img.shields.io/badge/React-18.x-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC) ![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000)

## ✨ Features

### 🔄 Real-Time Data
- **Live Exchange Rates**: Real-time currency conversion for 27+ major currencies
- **Cross-Rate Calculations**: Automatic calculation of all currency pair combinations
- **5-minute Updates**: Automated refresh every 5 minutes
- **Last Update Tracking**: Visual indication of data freshness

### 📊 Analytics
- **Historical Charts**: Interactive price history with customizable date ranges
- **Technical Indicators**: 
  - Simple Moving Averages (5-day, 20-day)
  - Bollinger Bands
  - RSI (Relative Strength Index)
  - Support/Resistance levels
- **Multiple Chart Types**: Line charts and candlestick views
- **Forecasting**: 30-90 day statistical forecasting using exponential smoothing

### 📈 Tools
- **Popular Pairs**: Pre-configured currency pairs (NZD/ZAR, EUR/USD, etc.)
- **Custom Pair Selection**: Choose any base and quote currency combination
- **Data Export**: Download historical data and indicators as CSV
- **Volatility Analysis**: Annual volatility calculations with risk assessment

### 📰 Market Intelligence
- **Real-Time News**: Financial news with AI sentiment analysis
- **Impact Classification**: High/Medium/Low impact rating for news events
- **Currency Relevance**: News filtered by relevant currencies
- **Dynamic Events Calendar**: Upcoming economic events and central bank meetings

### 🔒 Security & Performance
- **Secure API Architecture**: All external API calls routed through backend
- **Environment Variable Protection**: API keys never exposed to frontend
- **Error Handling**: Comprehensive error handling with retry logic
- **Responsive Design**: Mobile-first design with Tailwind CSS

## 🛠️ Tech Stack

- **Framework**: Next.js 15.4.2
- **Frontend**: React 18.x with Hooks
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel
- **APIs**: 
  - ExchangeRate-API (real-time rates)
  - Alpha Vantage (historical data & news)

## 📦 Installation

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- API keys (see [Environment Setup](#environment-setup))

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fx-tracker-pro.git
   cd fx-tracker-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your actual API keys:
   ```env
   ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
   EXCHANGE_RATE_API_KEY=your_exchangerate_api_key_here
   REACT_APP_API_BASE_URL=http://localhost:3000
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔑 Environment Setup

### Required API Keys

#### 1. ExchangeRate-API (Real-time Rates)
- **Purpose**: Real-time currency exchange rates
- **Free Tier**: 1,500 requests/month
- **Sign up**: [ExchangeRate-API](https://app.exchangerate-api.com/sign-up)

#### 2. Alpha Vantage (Historical Data & News)
- **Purpose**: Historical forex data and financial news
- **Free Tier**: 25 requests/day
- **Sign up**: [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage API key for historical data | Yes |
| `EXCHANGE_RATE_API_KEY` | ExchangeRate-API key for real-time rates | Yes |
| `REACT_APP_API_BASE_URL` | Base URL for API calls | Yes |

### Production Deployment (Vercel)

1. **Deploy to Vercel**
   ```bash
   vercel
   ```

2. **Set environment variables in Vercel dashboard**
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add all required variables

3. **Redeploy** after adding environment variables

## 📁 Project Structure

```
fx-tracker-pro/
├── components/
│   └── FXTracker.js           # Main application component
├── pages/
│   ├── api/                   # Backend API routes
│   │   ├── rates.js          # Real-time exchange rates
│   │   ├── historical.js     # Historical data
│   │   ├── news.js           # Financial news
│   │   └── events.js         # Economic events
│   ├── _app.js               # Next.js app wrapper
│   └── index.js              # Main page
├── public/                    # Static assets
├── styles/                    # Global styles
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore rules
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## 🔌 API Endpoints

### Internal API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rates` | GET | Real-time exchange rates for all currency pairs |
| `/api/historical` | GET | Historical forex data with OHLC values |
| `/api/news` | GET | Latest financial news with sentiment analysis |
| `/api/events` | GET | Upcoming economic events and central bank meetings |

### Example API Response

```json
{
  "rates": {
    "NZD/ZAR": 11.0234,
    "EUR/USD": 1.0856,
    "GBP/USD": 1.2534
  },
  "timestamp": "2025-01-20T12:00:00Z"
}
```

## 📊 Features Deep Dive

### Technical Analysis

- **Moving Averages**: Trend identification with 5 and 20-period SMAs
- **Bollinger Bands**: Volatility and overbought/oversold conditions
- **RSI**: Momentum oscillator (14-period) with overbought (>70) and oversold (<30) levels
- **Support/Resistance**: Dynamic calculation based on recent price action

### Forecasting Algorithm

The application uses advanced exponential smoothing with:
- **Trend Analysis**: Identifies bullish/bearish trends
- **Seasonal Adjustments**: Weekly seasonality patterns
- **Mean Reversion**: Long-term equilibrium considerations
- **Confidence Intervals**: 95% confidence bands for forecasts

### News Sentiment Analysis

- **AI-Powered**: Alpha Vantage's AI sentiment scoring
- **Impact Classification**: Automatic high/medium/low impact rating
- **Currency Relevance**: News filtered by mentioned currencies
- **Real-Time Updates**: Fresh financial news every hour

## 🛡️ Security

### Best Practices Implemented

- ✅ **API Key Protection**: All external API calls made server-side
- ✅ **Environment Variables**: Sensitive data never exposed to frontend
- ✅ **CORS Protection**: API routes secured against unauthorized access
- ✅ **Input Validation**: All user inputs validated and sanitized
- ✅ **Error Handling**: Graceful error handling without exposing system details

### Security Headers

The application implements security headers through Vercel:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

## ⚡ Performance

### Optimization Features

- **Memoization**: React.useCallback and useMemo for optimal performance
- **Lazy Loading**: Components loaded on demand
- **Caching**: API responses cached for improved speed
- **Code Splitting**: Automatic code splitting with Next.js
- **Image Optimization**: Next.js automatic image optimization

### Performance Metrics

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.0s

## 🌐 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Add JSDoc comments for new functions
- Include error handling for all API calls
- Test on multiple screen sizes
- Ensure accessibility compliance

### Code Style

```javascript
// Use descriptive function names
const calculateMovingAverage = (data, period) => {
  // Implementation
};

// Implement error handling
try {
  const data = await fetchHistoricalData(pair);
  processData(data);
} catch (error) {
  handleError(error);
}
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
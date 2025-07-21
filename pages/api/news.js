// pages/api/news.js - Fixed time calculation
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
    
    if (!ALPHA_VANTAGE_API_KEY) {
      // Return mock news data for testing
      const mockNews = [
        {
          id: 1,
          title: "Global Currency Markets Show Mixed Signals",
          summary: "Major currencies experiencing volatility amid central bank policy expectations.",
          source: "Mock Financial News",
          time: "2 hours ago",
          impact: "medium",
          currencies: ["USD", "EUR", "GBP"],
          url: "#",
          sentiment: "Neutral"
        },
        {
          id: 2,
          title: "NZD Strengthens Against Major Pairs",
          summary: "New Zealand Dollar gains ground on positive economic data.",
          source: "Mock Reuters",
          time: "4 hours ago",
          impact: "high",
          currencies: ["NZD", "USD"],
          url: "#",
          sentiment: "Bullish"
        }
      ];
      
      return res.status(200).json({ 
        news: mockNews,
        note: "Mock data - Add ALPHA_VANTAGE_API_KEY for real news"
      });
    }

    const forexTickers = 'FOREX:USD,FOREX:EUR,FOREX:GBP,FOREX:JPY,FOREX:AUD,FOREX:CAD,FOREX:NZD,FOREX:CHF';
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${forexTickers}&limit=50&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'ZAR', 'SEK', 'NOK', 'DKK'];

    if (data.feed && Array.isArray(data.feed)) {
      const newsItems = data.feed.slice(0, 6).map((article, index) => {
        // Extract relevant currencies
        const relevantCurrencies = [];
        if (article.ticker_sentiment) {
          article.ticker_sentiment.forEach(ticker => {
            if (ticker.ticker.startsWith('FOREX:')) {
              const currency = ticker.ticker.replace('FOREX:', '');
              if (currencies.includes(currency)) {
                relevantCurrencies.push(currency);
              }
            }
          });
        }

        // Determine impact level
        let impact = 'low';
        if (article.overall_sentiment_score) {
          const score = Math.abs(parseFloat(article.overall_sentiment_score));
          if (score > 0.3) impact = 'high';
          else if (score > 0.15) impact = 'medium';
        }

        // FIXED: Better time calculation
        let timeString = 'Unknown time';
        if (article.time_published) {
          try {
            // Parse the time_published format: YYYYMMDDTHHMMSS
            const timeStr = article.time_published;
            const year = parseInt(timeStr.substring(0, 4));
            const month = parseInt(timeStr.substring(4, 6)) - 1; // JS months are 0-indexed
            const day = parseInt(timeStr.substring(6, 8));
            const hour = parseInt(timeStr.substring(9, 11));
            const minute = parseInt(timeStr.substring(11, 13));
            const second = parseInt(timeStr.substring(13, 15));
            
            const timePublished = new Date(year, month, day, hour, minute, second);
            const now = new Date();
            const diffMs = now - timePublished;
            
            if (diffMs >= 0) {
              const diffMinutes = Math.floor(diffMs / (1000 * 60));
              const diffHours = Math.floor(diffMinutes / 60);
              const diffDays = Math.floor(diffHours / 24);
              
              if (diffDays > 0) {
                timeString = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
              } else if (diffHours > 0) {
                timeString = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
              } else if (diffMinutes > 0) {
                timeString = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
              } else {
                timeString = 'Just now';
              }
            } else {
              timeString = 'Future date';
            }
          } catch (error) {
            console.error('Error parsing time:', error);
            timeString = 'Time parse error';
          }
        }

        return {
          id: index + 1,
          title: article.title,
          summary: article.summary,
          source: article.source,
          time: timeString,
          impact: impact,
          currencies: relevantCurrencies.length > 0 ? relevantCurrencies.slice(0, 3) : ['USD'],
          url: article.url,
          sentiment: article.overall_sentiment_label,
          sentimentScore: article.overall_sentiment_score
        };
      });

      res.status(200).json({ news: newsItems });
    } else {
      res.status(200).json({ news: [] });
    }
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
}
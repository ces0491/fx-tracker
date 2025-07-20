// pages/api/news.js - Financial news
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
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

        // Format time
        const timePublished = new Date(article.time_published);
        const now = new Date();
        const hoursAgo = Math.floor((now - timePublished) / (1000 * 60 * 60));
        const timeString = hoursAgo < 1 ? 'Less than 1 hour ago' : 
                         hoursAgo < 24 ? `${hoursAgo} hours ago` : 
                         `${Math.floor(hoursAgo / 24)} days ago`;

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
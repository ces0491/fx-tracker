// pages/api/news.js - Fixed time calculation and current news
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
    
    if (!ALPHA_VANTAGE_API_KEY) {
      // Return current mock news data for testing
      const mockNews = [
        {
          id: 1,
          title: "USD Strengthens as Fed Signals Continued Rate Hikes",
          summary: "The Federal Reserve's latest statements suggest further monetary tightening, boosting dollar strength across major pairs.",
          source: "Financial Times",
          time: "2 hours ago",
          impact: "high",
          currencies: ["USD", "EUR", "GBP"],
          url: "#",
          sentiment: "Bullish"
        },
        {
          id: 2,
          title: "RBNZ Holds Rates Steady, NZD Shows Mixed Reaction",
          summary: "Reserve Bank of New Zealand maintains current policy stance as inflation pressures persist.",
          source: "Reuters",
          time: "4 hours ago",
          impact: "high",
          currencies: ["NZD", "USD"],
          url: "#",
          sentiment: "Neutral"
        },
        {
          id: 3,
          title: "South African Rand Under Pressure from Political Uncertainty",
          summary: "ZAR weakens against major currencies as political developments create market volatility.",
          source: "Bloomberg",
          time: "6 hours ago",
          impact: "medium",
          currencies: ["ZAR", "USD"],
          url: "#",
          sentiment: "Bearish"
        },
        {
          id: 4,
          title: "Global Currency Markets React to Latest Economic Data",
          summary: "Mixed economic indicators from major economies drive volatility in forex markets.",
          source: "MarketWatch",
          time: "8 hours ago",
          impact: "medium",
          currencies: ["USD", "EUR", "JPY"],
          url: "#",
          sentiment: "Neutral"
        }
      ];
      
      return res.status(200).json({ 
        news: mockNews,
        note: "Current mock data - Add ALPHA_VANTAGE_API_KEY for live news"
      });
    }

    // Use more specific forex and economic keywords for current news
    const forexTopics = 'forex,currency,central bank,interest rates,federal reserve,ECB,BOJ,RBNZ,SARB';
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=${forexTopics}&limit=20&sort=LATEST&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'ZAR', 'SEK', 'NOK', 'DKK'];

    if (data.feed && Array.isArray(data.feed)) {
      const newsItems = data.feed
        .slice(0, 8) // Get top 8 most recent
        .map((article, index) => {
          // Extract relevant currencies from title and summary
          const relevantCurrencies = [];
          const textToSearch = `${article.title} ${article.summary}`.toUpperCase();
          
          currencies.forEach(currency => {
            if (textToSearch.includes(currency) || textToSearch.includes(currency.toLowerCase())) {
              relevantCurrencies.push(currency);
            }
          });
          
          // Add currencies from ticker sentiment if available
          if (article.ticker_sentiment) {
            article.ticker_sentiment.forEach(ticker => {
              if (ticker.ticker.startsWith('FOREX:')) {
                const currency = ticker.ticker.replace('FOREX:', '');
                if (currencies.includes(currency) && !relevantCurrencies.includes(currency)) {
                  relevantCurrencies.push(currency);
                }
              }
            });
          }

          // Determine impact level based on sentiment score and relevance
          let impact = 'low';
          if (article.overall_sentiment_score) {
            const score = Math.abs(parseFloat(article.overall_sentiment_score));
            if (score > 0.35) impact = 'high';
            else if (score > 0.15) impact = 'medium';
          }
          
          // Enhanced impact for central bank or interest rate news
          if (textToSearch.includes('CENTRAL BANK') || textToSearch.includes('INTEREST RATE') || 
              textToSearch.includes('FED') || textToSearch.includes('ECB') || textToSearch.includes('RBNZ')) {
            impact = 'high';
          }

          // FIXED: Better time calculation using the actual published time
          let timeString = 'Unknown time';
          if (article.time_published) {
            try {
              // Alpha Vantage format: YYYYMMDDTHHMMSS
              const timeStr = article.time_published.toString();
              
              // Parse the timestamp properly
              const year = parseInt(timeStr.substring(0, 4));
              const month = parseInt(timeStr.substring(4, 6)) - 1; // JS months are 0-indexed
              const day = parseInt(timeStr.substring(6, 8));
              const hour = parseInt(timeStr.substring(9, 11)) || 0;
              const minute = parseInt(timeStr.substring(11, 13)) || 0;
              const second = parseInt(timeStr.substring(13, 15)) || 0;
              
              const timePublished = new Date(year, month, day, hour, minute, second);
              const now = new Date();
              const diffMs = now - timePublished;
              
              // Only show news from the last 7 days for relevance
              const daysDiff = diffMs / (1000 * 60 * 60 * 24);
              if (daysDiff > 7) return null; // Skip old news
              
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
                return null; // Skip future dated articles
              }
            } catch (error) {
              console.error('Error parsing time:', error, article.time_published);
              return null; // Skip articles with invalid timestamps
            }
          } else {
            return null; // Skip articles without timestamps
          }

          return {
            id: index + 1,
            title: article.title.length > 100 ? article.title.substring(0, 100) + '...' : article.title,
            summary: article.summary?.length > 150 ? article.summary.substring(0, 150) + '...' : article.summary,
            source: article.source_domain || article.source,
            time: timeString,
            impact: impact,
            currencies: relevantCurrencies.length > 0 ? relevantCurrencies.slice(0, 3) : ['USD'],
            url: article.url,
            sentiment: article.overall_sentiment_label || 'Neutral',
            sentimentScore: article.overall_sentiment_score
          };
        })
        .filter(item => item !== null) // Remove old or invalid articles
        .slice(0, 6); // Limit to 6 current articles

      res.status(200).json({ 
        news: newsItems,
        lastUpdated: new Date().toISOString()
      });
    } else {
      // Return empty array if no news available
      res.status(200).json({ news: [] });
    }
  } catch (error) {
    console.error('Error fetching news:', error);
    
    // Return current fallback news on error
    const fallbackNews = [
      {
        id: 1,
        title: "Currency Markets Show Volatility Amid Global Economic Uncertainty",
        summary: "Major currency pairs experiencing increased volatility as markets digest latest economic data.",
        source: "Market Analysis",
        time: "1 hour ago",
        impact: "medium",
        currencies: ["USD", "EUR", "GBP"],
        url: "#",
        sentiment: "Neutral"
      }
    ];
    
    res.status(200).json({ 
      news: fallbackNews,
      error: "Using fallback news due to API issues"
    });
  }
}
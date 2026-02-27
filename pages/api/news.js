// pages/api/news.js - Real forex and economic news with optional AI enhancement
import { getTimeAgo } from '../../lib/utils/dateUtils.js';
import { extractCurrencies, determineImpact, determineSentiment } from '../../lib/utils/textUtils.js';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Enhance articles with Claude Haiku for better sentiment, impact, currencies, and summaries.
 * Returns null if the API key is missing or the call fails (caller should fall back).
 */
async function enhanceWithAI(articles) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });

    const articlesBlock = articles
      .map((a, i) => `Article ${i + 1}:\nTitle: ${a.title}\nSummary: ${a.summary || 'N/A'}`)
      .join('\n\n');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a forex market analyst. Analyse each article below and return a JSON array (no markdown fences) with one object per article in the same order. Each object must have:
- "sentiment": "Bullish", "Bearish", or "Neutral"
- "impact": "high", "medium", or "low"
- "currencies": array of up to 3 ISO currency codes mentioned or implied (e.g. ["USD","EUR"])
- "aiSummary": a concise 1-2 sentence summary of market implications

${articlesBlock}

Respond ONLY with the JSON array.`
        }
      ]
    });

    const text = message.content[0].text.trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const results = JSON.parse(cleaned);

    if (!Array.isArray(results) || results.length !== articles.length) {
      console.warn('AI returned unexpected number of results, falling back to keyword analysis');
      return null;
    }

    return results;
  } catch (error) {
    console.warn('AI enhancement failed, falling back to keyword analysis:', error.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try multiple news APIs in order of preference
    const newsApis = [
      {
        name: 'NewsAPI.org',
        fetch: async () => {
          const NEWS_API_KEY = process.env.NEWS_API_KEY;
          if (!NEWS_API_KEY) throw new Error('NEWS_API_KEY not configured');

          const query = 'forex OR currency OR "central bank" OR "interest rate" OR "exchange rate"';
          const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`;

          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          if (!data.articles || data.articles.length === 0) throw new Error('No articles found');

          return data.articles.map((article, index) => ({
            id: index + 1,
            title: article.title,
            summary: article.description || article.content?.substring(0, 150) + '...',
            source: article.source.name,
            time: getTimeAgo(article.publishedAt),
            impact: determineImpact(article.title + ' ' + article.description),
            currencies: extractCurrencies(article.title + ' ' + article.description),
            url: article.url,
            sentiment: determineSentiment(article.title + ' ' + article.description)
          })).slice(0, 6);
        }
      },
      {
        name: 'GNews API',
        fetch: async () => {
          const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
          if (!GNEWS_API_KEY) throw new Error('GNEWS_API_KEY not configured');

          const query = 'forex currency central bank';
          const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=10&apikey=${GNEWS_API_KEY}`;

          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          if (!data.articles || data.articles.length === 0) throw new Error('No articles found');

          return data.articles.map((article, index) => ({
            id: index + 1,
            title: article.title,
            summary: article.description,
            source: article.source.name,
            time: getTimeAgo(article.publishedAt),
            impact: determineImpact(article.title + ' ' + article.description),
            currencies: extractCurrencies(article.title + ' ' + article.description),
            url: article.url,
            sentiment: determineSentiment(article.title + ' ' + article.description)
          })).slice(0, 6);
        }
      },
      {
        name: 'RSS Feed Aggregator',
        fetch: async () => {
          // Use a free RSS to JSON service for financial news
          const feedUrl = 'https://www.forexlive.com/feed/news';
          const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=10`;

          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          if (!data.items || data.items.length === 0) throw new Error('No items found');

          return data.items.map((item, index) => ({
            id: index + 1,
            title: item.title,
            summary: item.description?.replace(/<[^>]*>/g, '').substring(0, 150) + '...',
            source: 'ForexLive',
            time: getTimeAgo(item.pubDate),
            impact: determineImpact(item.title),
            currencies: extractCurrencies(item.title + ' ' + item.description),
            url: item.link,
            sentiment: determineSentiment(item.title)
          })).slice(0, 6);
        }
      }
    ];

    // Try each API
    for (const api of newsApis) {
      try {
        console.log(`Trying ${api.name} for news...`);
        const newsItems = await api.fetch();
        console.log(`Successfully fetched news from ${api.name}`);

        // Attempt AI enhancement
        const aiResults = await enhanceWithAI(newsItems);
        let enhanced = false;

        if (aiResults) {
          // Merge AI results onto the news items
          for (let i = 0; i < newsItems.length; i++) {
            const ai = aiResults[i];
            newsItems[i].sentiment = ai.sentiment;
            newsItems[i].impact = ai.impact;
            newsItems[i].currencies = ai.currencies;
            newsItems[i].aiSummary = ai.aiSummary;
          }
          enhanced = true;
          console.log('AI enhancement applied successfully');
        }

        return res.status(200).json({
          news: newsItems,
          source: api.name,
          enhanced,
          lastUpdated: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Failed to fetch from ${api.name}:`, error.message);
        continue;
      }
    }

    // If all news APIs fail, return error
    throw new Error('All news APIs failed. Please configure NEWS_API_KEY or GNEWS_API_KEY in environment variables.');

  } catch (error) {
    console.error('Error fetching news:', error);

    res.status(500).json({
      error: error.message || 'Failed to fetch news',
      news: [],
      enhanced: false
    });
  }
}

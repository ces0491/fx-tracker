// pages/api/news.js - Real forex and economic news with optional AI enhancement
import { getTimeAgo } from '../../lib/utils/dateUtils.js';
import { extractCurrencies, determineImpact, determineSentiment } from '../../lib/utils/textUtils.js';
import Anthropic from '@anthropic-ai/sdk';

// Map ISO codes to common names for better search queries
const CURRENCY_NAMES = {
  USD: 'dollar', EUR: 'euro', GBP: 'pound', JPY: 'yen',
  CHF: 'franc', ZAR: 'rand', CNY: 'yuan', INR: 'rupee',
  AUD: 'australian dollar', NZD: 'new zealand dollar', CAD: 'canadian dollar',
  BRL: 'real', MXN: 'peso', TRY: 'lira', SEK: 'krona', NOK: 'krone',
  SGD: 'singapore dollar', HKD: 'hong kong dollar', KRW: 'won',
};

function buildSearchQuery(base, quote) {
  const baseName = CURRENCY_NAMES[base] || base;
  const quoteName = CURRENCY_NAMES[quote] || quote;
  return `("${base}" OR "${baseName}") AND ("${quote}" OR "${quoteName}") AND (forex OR currency OR "exchange rate")`;
}

function buildGNewsQuery(base, quote) {
  // GNews has simpler query syntax
  const baseName = CURRENCY_NAMES[base] || base;
  const quoteName = CURRENCY_NAMES[quote] || quote;
  return `${base} ${quote} ${baseName} ${quoteName} forex`;
}

/**
 * Enhance articles with Claude Haiku — assess relevance to the selected pair,
 * provide sentiment, impact, and summaries. Returns null on failure.
 */
async function enhanceWithAI(articles, base, quote) {
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
          content: `You are a forex market analyst focused on the ${base}/${quote} currency pair.

Analyse each article below and return a JSON array (no markdown fences) with one object per article in the same order. Each object must have:
- "relevant": true if the article is relevant to ${base}, ${quote}, or factors that directly affect ${base}/${quote} (e.g. central bank policy, trade data, economic indicators for either country). false otherwise.
- "sentiment": "Bullish", "Bearish", or "Neutral" — specifically for the ${base}/${quote} pair (Bullish = ${base} strengthens vs ${quote})
- "impact": "high", "medium", or "low" — how much this could move ${base}/${quote}
- "currencies": array of ISO currency codes mentioned or implied (e.g. ["${base}","${quote}"])
- "aiSummary": 1-2 sentence summary of implications specifically for ${base}/${quote}

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

  const base = (req.query.base || 'USD').toUpperCase();
  const quote = (req.query.quote || 'ZAR').toUpperCase();

  try {
    // Try multiple news APIs in order of preference
    const newsApis = [
      {
        name: 'NewsAPI.org',
        fetch: async () => {
          const NEWS_API_KEY = process.env.NEWS_API_KEY;
          if (!NEWS_API_KEY) throw new Error('NEWS_API_KEY not configured');

          const query = buildSearchQuery(base, quote);
          const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=15&apiKey=${NEWS_API_KEY}`;

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
          })).slice(0, 15);
        }
      },
      {
        name: 'GNews API',
        fetch: async () => {
          const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
          if (!GNEWS_API_KEY) throw new Error('GNEWS_API_KEY not configured');

          const query = buildGNewsQuery(base, quote);
          const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=15&apikey=${GNEWS_API_KEY}`;

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
          })).slice(0, 15);
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
          })).slice(0, 15);
        }
      }
    ];

    // Try each API
    for (const api of newsApis) {
      try {
        console.log(`Trying ${api.name} for ${base}/${quote} news...`);
        const newsItems = await api.fetch();
        console.log(`Successfully fetched ${newsItems.length} articles from ${api.name}`);

        // Attempt AI enhancement with pair-specific filtering
        const aiResults = await enhanceWithAI(newsItems, base, quote);
        let enhanced = false;
        let finalNews = newsItems;

        if (aiResults) {
          // Merge AI results and filter to only relevant articles
          const merged = [];
          for (let i = 0; i < newsItems.length; i++) {
            const ai = aiResults[i];
            if (!ai.relevant) continue; // Drop irrelevant articles
            merged.push({
              ...newsItems[i],
              sentiment: ai.sentiment,
              impact: ai.impact,
              currencies: ai.currencies,
              aiSummary: ai.aiSummary,
            });
          }
          finalNews = merged.length > 0 ? merged.slice(0, 8) : newsItems.slice(0, 6);
          enhanced = merged.length > 0;
          console.log(`AI enhancement: ${merged.length} relevant articles out of ${newsItems.length}`);
        } else {
          finalNews = newsItems.slice(0, 6);
        }

        return res.status(200).json({
          news: finalNews,
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

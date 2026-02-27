// pages/api/news/enhance.js - AI-powered news sentiment analysis
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { articles } = req.body;

  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    return res.status(400).json({ error: 'Request body must include a non-empty articles array' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

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
    // Strip markdown fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const results = JSON.parse(cleaned);

    if (!Array.isArray(results) || results.length !== articles.length) {
      throw new Error('AI returned unexpected number of results');
    }

    return res.status(200).json({ articles: results });
  } catch (error) {
    console.error('AI enhancement failed:', error.message);
    return res.status(500).json({ error: 'AI enhancement failed: ' + error.message });
  }
}

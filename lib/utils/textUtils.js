/**
 * Text processing utilities for news and sentiment analysis
 */

/**
 * Extract currency codes from text
 */
export function extractCurrencies(text) {
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'ZAR', 'SEK', 'NOK', 'DKK', 'CNY', 'INR', 'BRL'];
  const upperText = text.toUpperCase();
  const found = [];

  currencies.forEach(currency => {
    if (upperText.includes(currency)) {
      found.push(currency);
    }
  });

  // Also check for currency names
  const currencyNames = {
    'DOLLAR': 'USD', 'EURO': 'EUR', 'POUND': 'GBP', 'YEN': 'JPY',
    'FRANC': 'CHF', 'RAND': 'ZAR', 'YUAN': 'CNY', 'RUPEE': 'INR'
  };

  Object.entries(currencyNames).forEach(([name, code]) => {
    if (upperText.includes(name) && !found.includes(code)) {
      found.push(code);
    }
  });

  return found.length > 0 ? found.slice(0, 3) : ['USD'];
}

/**
 * Determine impact level from text
 */
export function determineImpact(text) {
  const upperText = text.toUpperCase();

  const highImpactTerms = ['CENTRAL BANK', 'INTEREST RATE', 'FED ', 'ECB ', 'RBNZ', 'SARB', 'CRISIS', 'DECISION'];
  const mediumImpactTerms = ['INFLATION', 'GDP', 'EMPLOYMENT', 'TRADE', 'POLICY'];

  for (const term of highImpactTerms) {
    if (upperText.includes(term)) return 'high';
  }

  for (const term of mediumImpactTerms) {
    if (upperText.includes(term)) return 'medium';
  }

  return 'low';
}

/**
 * Determine sentiment from text
 */
export function determineSentiment(text) {
  const upperText = text.toUpperCase();

  const bullishTerms = ['RISES', 'GAINS', 'STRENGTHENS', 'RALLIES', 'SURGES', 'CLIMBS', 'JUMPS'];
  const bearishTerms = ['FALLS', 'DROPS', 'WEAKENS', 'DECLINES', 'PLUNGES', 'TUMBLES', 'SLUMPS'];

  let bullishCount = 0;
  let bearishCount = 0;

  bullishTerms.forEach(term => {
    if (upperText.includes(term)) bullishCount++;
  });

  bearishTerms.forEach(term => {
    if (upperText.includes(term)) bearishCount++;
  });

  if (bullishCount > bearishCount) return 'Bullish';
  if (bearishCount > bullishCount) return 'Bearish';
  return 'Neutral';
}

/**
 * Strip HTML tags from string
 */
export function stripHtml(html) {
  return html?.replace(/<[^>]*>/g, '') || '';
}

/**
 * Truncate string to length
 */
export function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

/**
 * Get currency code from country name
 */
export function getCurrencyCode(country) {
  const countryMap = {
    'United States': 'USD',
    'USA': 'USD',
    'New Zealand': 'NZD',
    'South Africa': 'ZAR',
    'Eurozone': 'EUR',
    'Euro Zone': 'EUR',
    'Germany': 'EUR',
    'France': 'EUR',
    'United Kingdom': 'GBP',
    'UK': 'GBP',
    'Japan': 'JPY',
    'Australia': 'AUD',
    'Canada': 'CAD',
    'Switzerland': 'CHF'
  };

  return countryMap[country] || 'USD';
}

/**
 * Map importance levels
 */
export function mapImportance(importance) {
  if (!importance) return 'medium';
  const imp = importance.toLowerCase();
  if (imp.includes('high') || imp === '3') return 'high';
  if (imp.includes('low') || imp === '1') return 'low';
  return 'medium';
}

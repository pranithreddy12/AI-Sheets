/**
 * intentRouter.js — Keyword-based intent detection
 * 
 * Classifies the user's natural language prompt into one of 5 feature intents.
 * Uses keyword matching (no AI call needed), so routing is instant.
 */

// ── Intent keyword maps ──────────────────────────
// Each intent has a list of trigger keywords/phrases, ordered by specificity
const INTENT_PATTERNS = {
  visualize: {
    keywords: [
      'chart', 'graph', 'plot', 'visualize', 'visualization',
      'bar chart', 'line chart', 'pie chart', 'histogram',
      'show me a', 'draw', 'render chart', 'display chart',
    ],
    weight: 3, // Higher weight = checked first when multiple intents match
  },
  summarize: {
    keywords: [
      'summarize', 'summary', 'summarise', 'insights', 'insight',
      'overview', 'describe the data', 'key findings', 'statistics',
      'stats', 'tell me about', 'what does this data',
      'analyze this', 'analyse this', 'data overview',
    ],
    weight: 3,
  },
  classify: {
    keywords: [
      'classify', 'classification', 'categorize', 'categorise',
      'label each', 'label as', 'tag each', 'tag as',
      'income or expense', 'positive or negative', 'group as',
      'assign category', 'assign label', 'mark as',
      'identify as', 'determine if', 'is it',
    ],
    weight: 2,
  },
  edit: {
    keywords: [
      'replace all', 'replace empty', 'fill empty', 'fill blank',
      'capitalize', 'uppercase', 'lowercase', 'trim',
      'remove duplicates', 'delete empty', 'clean up',
      'set all', 'change all', 'update all', 'fix all',
      'convert to', 'format as', 'standardize',
      'remove spaces', 'strip', 'merge', 'split column',
    ],
    weight: 2,
  },
  formula: {
    keywords: [
      'formula', 'calculate', 'compute', 'sum', 'average',
      'count', 'multiply', 'divide', 'subtract', 'add column',
      'new column', 'profit margin', 'percentage', 'difference',
      'ratio', 'total', 'cumulative', 'running total',
    ],
    weight: 1, // Lowest weight — acts as fallback
  },
};

/**
 * Detect the user's intent from their prompt text
 * 
 * @param {string} promptText - The natural language prompt
 * @returns {string} One of: 'formula', 'edit', 'visualize', 'summarize', 'classify'
 */
export function detectIntent(promptText) {
  if (!promptText || typeof promptText !== 'string') return 'formula';

  const text = promptText.toLowerCase().trim();
  const scores = {};

  // Score each intent by counting keyword matches
  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (text.includes(keyword)) {
        // Longer keyword matches are more specific, give them more weight
        score += keyword.split(' ').length * config.weight;
      }
    }
    scores[intent] = score;
  }

  // Find the intent with the highest score
  let bestIntent = 'formula'; // Default fallback
  let bestScore = 0;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  return bestIntent;
}

/**
 * Get a human-readable label for an intent
 * @param {string} intent 
 * @returns {string}
 */
export function getIntentLabel(intent) {
  const labels = {
    formula: '🧮 Formula Generation',
    edit: '✏️ Data Editing',
    visualize: '📊 Visualization',
    summarize: '📋 Summarization',
    classify: '🏷️ Classification',
  };
  return labels[intent] || '🧮 Formula Generation';
}

/**
 * dataSummarizer.js — Data summarization via prompts
 * 
 * User asks "summarize this sheet" or "give me key insights".
 * We compute stats locally, then send them to the AI for
 * natural language interpretation.
 */

import { callOllama } from './ollamaConfig.js';

/**
 * System prompt for generating natural language summaries
 */
const SYSTEM_PROMPT = `You are a data analyst providing a concise summary of a dataset.
You will receive pre-computed statistics and a small sample of the data.
Provide a clear, well-structured summary in plain text (NOT markdown, NOT code).

Your summary should include:
1. A one-line overview (what the data appears to be about)
2. Key numeric insights (totals, averages, min/max for important columns)
3. Notable patterns or observations
4. Any data quality notes (missing values, outliers if obvious)

Keep the summary concise — maximum 8-10 bullet points.
Use simple language. Do not use markdown formatting like ** or ##.
Start each point on a new line with a dash (-).`;

/**
 * Generate a summary of the dataset
 * 
 * @param {string} prompt - User's summarization request
 * @param {Array<object>} data - Full dataset
 * @param {Array<string>} headers - Column names
 * @returns {Promise<{textSummary: string, stats: object}>}
 */
export async function summarizeData(prompt, data, headers) {
  if (!data || data.length === 0) {
    throw new Error('No data available to summarize.');
  }

  // ── Compute local statistics ──────────────────
  const stats = computeStats(data, headers);

  // Build a compact stats string for the AI
  const statsText = formatStatsForAI(stats, headers, data.length);

  // Get a small sample of the data (first 5 rows)
  const sample = data.slice(0, 5).map(row => {
    const filtered = {};
    headers.slice(0, 10).forEach(h => { filtered[h] = row[h] || ''; }); // Limit columns too
    return filtered;
  });

  const userPrompt = `${prompt ? `User request: ${prompt}\n\n` : ''}Dataset Statistics:
${statsText}

Sample data (first 5 rows, up to 10 columns):
${JSON.stringify(sample, null, 2)}

Provide a concise, insightful summary.`;

  const aiText = await callOllama(userPrompt, SYSTEM_PROMPT, { temperature: 0.3 });

  return {
    textSummary: aiText.trim(),
    stats,
  };
}

/**
 * Compute comprehensive statistics for each column
 */
function computeStats(data, headers) {
  const stats = {};

  headers.forEach(header => {
    const values = data.map(r => r[header]).filter(v => v !== undefined && v !== null && String(v).trim() !== '');
    const numericValues = values.map(v => parseFloat(v)).filter(n => !isNaN(n));

    const colStat = {
      name: header,
      totalCount: data.length,
      nonEmptyCount: values.length,
      emptyCount: data.length - values.length,
      emptyPercent: ((data.length - values.length) / data.length * 100).toFixed(1),
    };

    if (numericValues.length > values.length * 0.5) {
      // Numeric column
      colStat.type = 'numeric';
      colStat.min = Math.min(...numericValues);
      colStat.max = Math.max(...numericValues);
      colStat.sum = numericValues.reduce((a, b) => a + b, 0);
      colStat.average = colStat.sum / numericValues.length;
      colStat.median = getMedian(numericValues);
    } else {
      // Categorical column
      colStat.type = 'categorical';
      const counts = {};
      values.forEach(v => { const s = String(v); counts[s] = (counts[s] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      colStat.uniqueCount = sorted.length;
      colStat.topValues = sorted.slice(0, 5);
    }

    stats[header] = colStat;
  });

  return stats;
}

/**
 * Calculate the median of a numeric array
 */
function getMedian(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Format stats into a compact text representation for the AI prompt
 */
function formatStatsForAI(stats, headers, totalRows) {
  let text = `Total rows: ${totalRows}\nTotal columns: ${headers.length}\n\n`;

  headers.forEach(h => {
    const s = stats[h];
    if (!s) return;
    text += `Column "${h}" (${s.type}):\n`;
    text += `  - Non-empty: ${s.nonEmptyCount}/${s.totalCount} (${s.emptyPercent}% empty)\n`;

    if (s.type === 'numeric') {
      text += `  - Range: ${s.min.toFixed(2)} to ${s.max.toFixed(2)}\n`;
      text += `  - Average: ${s.average.toFixed(2)}, Median: ${s.median.toFixed(2)}, Sum: ${s.sum.toFixed(2)}\n`;
    } else {
      text += `  - Unique values: ${s.uniqueCount}\n`;
      text += `  - Top values: ${s.topValues.map(([v, c]) => `"${v}" (${c})`).join(', ')}\n`;
    }
  });

  return text;
}

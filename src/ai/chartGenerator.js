/**
 * chartGenerator.js — Prompt-based data visualization
 * 
 * User types "show a bar chart of sales by month" and the AI
 * identifies the relevant columns and chart type. We then
 * aggregate the actual data and return a Recharts-compatible config.
 */

import { callOllama } from './ollamaConfig.js';

/**
 * System prompt for chart configuration generation
 */
const SYSTEM_PROMPT = `You are a data visualization expert. You receive column names, data types, and a sample of tabular data.
Your job is to determine the best chart configuration for the user's request.

CRITICAL: Return ONLY a valid JSON object (no markdown, no explanations, no code fences). The JSON must have:
{
  "chartType": "bar" | "line" | "pie",
  "xAxis": "column name for X axis / categories",
  "yAxis": "column name for Y axis / values (must be numeric or aggregatable)",
  "title": "A descriptive chart title",
  "aggregate": "sum" | "average" | "count" | "none"
}

Rules:
- chartType must be one of: "bar", "line", "pie"
- xAxis should be a categorical or date column
- yAxis should be a numeric column
- aggregate: use "sum" to total values per category, "average" for mean, "count" to count occurrences, "none" if data is already one-row-per-category
- If the user doesn't specify a chart type, choose the most appropriate one
- For pie charts, the data should have clear categories with numeric values

Example request: "show a bar chart of sales by month"
Example output:
{"chartType":"bar","xAxis":"Month","yAxis":"Sales","title":"Sales by Month","aggregate":"sum"}`;

/**
 * Generate chart configuration from a natural language prompt
 * 
 * @param {string} prompt - User's visualization request
 * @param {Array<object>} data - Full dataset (we'll aggregate ourselves)
 * @param {Array<string>} headers - All column names
 * @returns {Promise<{chartConfig: object, chartData: Array}>}
 */
export async function generateChart(prompt, data, headers) {
  if (!data || data.length === 0) {
    throw new Error('No data available to visualize.');
  }

  // Build column info for the AI (name + detected type + sample values)
  const columnInfo = headers.map(h => {
    const values = data.slice(0, 10).map(r => r[h]).filter(v => v !== undefined && v !== '');
    const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;
    const type = numericCount > values.length * 0.6 ? 'numeric' : 'text';
    return `  - "${h}" (${type}): sample values = [${values.slice(0, 3).map(v => `"${v}"`).join(', ')}]`;
  }).join('\n');

  const userPrompt = `Available columns:\n${columnInfo}\n\nTotal rows: ${data.length}\n\nRequest: ${prompt}\n\nReturn ONLY the JSON config object.`;

  const aiText = await callOllama(userPrompt, SYSTEM_PROMPT);

  // Parse the JSON config from AI response
  const chartConfig = parseChartConfig(aiText, headers);

  // Aggregate the actual data based on the config
  const chartData = aggregateData(data, chartConfig);

  return {
    chartConfig: {
      ...chartConfig,
      data: chartData,
    },
    chartData,
  };
}

/**
 * Parse and validate the AI-returned chart config JSON
 */
function parseChartConfig(aiText, headers) {
  // Try to extract JSON from the response (handle possible markdown fences)
  let jsonStr = aiText.trim();
  const jsonMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Also try to find a JSON object if there's surrounding text
  const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    jsonStr = braceMatch[0];
  }

  let config;
  try {
    config = JSON.parse(jsonStr);
  } catch {
    throw new Error(`AI returned invalid chart config. Response was: "${aiText.substring(0, 100)}..."`);
  }

  // Validate required fields
  if (!config.chartType || !config.xAxis || !config.yAxis) {
    throw new Error('Chart config missing required fields (chartType, xAxis, yAxis).');
  }

  // Validate chart type
  const validTypes = ['bar', 'line', 'pie'];
  if (!validTypes.includes(config.chartType)) {
    config.chartType = 'bar'; // Fallback
  }

  // Validate columns exist (case-insensitive match)
  const headerLower = headers.map(h => h.toLowerCase());
  const xIdx = headerLower.indexOf(config.xAxis.toLowerCase());
  const yIdx = headerLower.indexOf(config.yAxis.toLowerCase());

  if (xIdx === -1) {
    // Try fuzzy match
    const closest = headers.find(h => h.toLowerCase().includes(config.xAxis.toLowerCase()));
    if (closest) config.xAxis = closest;
    else throw new Error(`Column "${config.xAxis}" not found. Available: ${headers.join(', ')}`);
  } else {
    config.xAxis = headers[xIdx]; // Use exact case
  }

  if (yIdx === -1) {
    const closest = headers.find(h => h.toLowerCase().includes(config.yAxis.toLowerCase()));
    if (closest) config.yAxis = closest;
    else throw new Error(`Column "${config.yAxis}" not found. Available: ${headers.join(', ')}`);
  } else {
    config.yAxis = headers[yIdx];
  }

  config.aggregate = config.aggregate || 'sum';
  config.title = config.title || `${config.yAxis} by ${config.xAxis}`;

  return config;
}

/**
 * Aggregate the dataset based on the chart config
 * Groups by xAxis column and applies the aggregate function to yAxis
 */
function aggregateData(data, config) {
  const { xAxis, yAxis, aggregate } = config;

  if (aggregate === 'none') {
    // No aggregation — return raw data (limited to 50 points for readability)
    return data.slice(0, 50).map(row => ({
      name: String(row[xAxis] || 'N/A'),
      value: parseFloat(row[yAxis]) || 0,
    }));
  }

  // Group by xAxis
  const groups = {};
  data.forEach(row => {
    const key = String(row[xAxis] || 'N/A').trim();
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    const val = parseFloat(row[yAxis]);
    if (!isNaN(val)) groups[key].push(val);
  });

  // Apply aggregation
  const result = Object.entries(groups).map(([name, values]) => {
    let value = 0;
    if (aggregate === 'sum') {
      value = values.reduce((a, b) => a + b, 0);
    } else if (aggregate === 'average') {
      value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    } else if (aggregate === 'count') {
      value = values.length;
    }
    return { name, value: parseFloat(value.toFixed(2)) };
  });

  // Sort by name for consistency, limit to 25 categories for readability
  result.sort((a, b) => {
    // Try numeric sort first
    const numA = parseFloat(a.name);
    const numB = parseFloat(b.name);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.name.localeCompare(b.name);
  });

  return result.slice(0, 25);
}

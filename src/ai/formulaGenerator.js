/**
 * formulaGenerator.js — Prompt-based formula/column generation
 * 
 * User types something like "sum all values in column B" or
 * "calculate profit as Revenue minus Cost". The AI generates a
 * JavaScript transform function that is applied to every row.
 */

import { callOllama } from './ollamaConfig.js';

/**
 * System prompt that instructs the AI to return a pure JS function
 */
const SYSTEM_PROMPT = `You are a spreadsheet formula expert. You receive tabular data (JSON) and a task.
CRITICAL: Return ONLY a valid JavaScript arrow function that takes a single "row" object and returns the modified row.
Do NOT return explanations, comments outside the function, or markdown formatting.
Your output MUST be a valid, executable JavaScript function starting with \`(row) => {\` and ending with \`}\`.

Rules:
- Access column values via row['ColumnName']
- Always use parseFloat() for numeric operations with || 0 fallback
- Add new columns by assigning to row['NewColumnName']
- Always return the row object at the end
- Handle edge cases (empty strings, null, undefined)

Example task: "Calculate Profit Margin from Revenue and Cost"
Example output:
(row) => {
  const revenue = parseFloat(row['Revenue']) || 0;
  const cost = parseFloat(row['Cost']) || 0;
  row['Profit Margin'] = revenue === 0 ? "0%" : ((revenue - cost) / revenue * 100).toFixed(2) + "%";
  return row;
}`;

/**
 * Generate a formula/transform function from a natural language prompt
 * 
 * @param {string} prompt - User's natural language request
 * @param {Array<object>} sampleData - First 5 rows of selected data
 * @param {Array<string>} columns - Selected column names
 * @returns {Promise<{transformFn: Function, rawCode: string, newColumns: string[]}>}
 */
export async function generateFormula(prompt, sampleData, columns) {
  // Build a filtered sample with only selected columns
  const filteredSample = sampleData.map(row => {
    const filtered = {};
    columns.forEach(col => { filtered[col] = row[col] || ''; });
    return filtered;
  });

  const userPrompt = `Here is a sample of the data (first ${filteredSample.length} rows):
${JSON.stringify(filteredSample, null, 2)}

Task: ${prompt}

Return ONLY the JavaScript function code.`;

  // Call Ollama
  const aiText = await callOllama(userPrompt, SYSTEM_PROMPT);

  // Extract the function code from the response
  const cleanCode = extractCode(aiText);

  // Parse and validate the function
  const transformFn = parseFunction(cleanCode);

  // Detect what new columns the function creates by running it on the first sample row
  const newColumns = detectNewColumns(transformFn, filteredSample[0], columns);

  return { transformFn, rawCode: cleanCode, newColumns };
}

/**
 * Extract JavaScript code from AI response, handling markdown fences
 */
function extractCode(aiText) {
  let code = aiText;

  // Try to extract from markdown code fences
  const codeMatch = aiText.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
  if (codeMatch) {
    code = codeMatch[1].trim();
  } else {
    code = aiText.replace(/```(?:javascript|js)?\s*/gi, '').replace(/```/g, '').trim();
  }

  // Ensure it looks like a function
  if (!code.startsWith('(') && !code.startsWith('function') && !code.startsWith('row')) {
    throw new Error(`AI returned invalid code format. Output started with: "${code.substring(0, 60)}..."`);
  }

  return code;
}

/**
 * Safely evaluate an AI-generated function string
 */
function parseFunction(codeString) {
  try {
    // eslint-disable-next-line no-eval
    const fn = eval(`(${codeString})`);
    if (typeof fn !== 'function') {
      throw new Error('Evaluated code is not a function');
    }
    return fn;
  } catch (e) {
    throw new Error(`Failed to parse AI-generated function: ${e.message}`);
  }
}

/**
 * Run the transform on a sample row to detect new/modified columns
 */
function detectNewColumns(fn, sampleRow, existingColumns) {
  if (!sampleRow) return [];
  try {
    const clone = JSON.parse(JSON.stringify(sampleRow));
    const result = fn(clone);
    const existingSet = new Set(existingColumns);
    return Object.keys(result).filter(k => !existingSet.has(k));
  } catch {
    return [];
  }
}

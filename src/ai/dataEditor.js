/**
 * dataEditor.js — Prompt-based data editing/transformation
 * 
 * Handles prompts like "replace all empty cells with 0",
 * "capitalize all names in column A", "trim whitespace", etc.
 * The AI generates a row-level transform function that modifies existing values.
 */

import { callOllama } from './ollamaConfig.js';

/**
 * System prompt specialized for data editing (modifying existing columns, not adding new ones)
 */
const SYSTEM_PROMPT = `You are a data cleaning and transformation expert. You receive tabular data (JSON) and an editing task.
CRITICAL: Return ONLY a valid JavaScript arrow function that takes a single "row" object and returns the MODIFIED row.
The function should modify EXISTING column values, not add new columns (unless the task explicitly asks for a new column).
Do NOT return explanations, comments outside the function, or markdown formatting.

Rules:
- Access column values via row['ColumnName']
- Modify values in-place: row['ColumnName'] = newValue
- Always return the row at the end
- Handle edge cases (empty strings, null, undefined, NaN)
- For "replace empty cells with X": check for null, undefined, empty string, and whitespace-only
- For text operations: always convert to String first with String(value || '')
- String methods: .toUpperCase(), .toLowerCase(), .trim(), .replace(), etc.

Example task: "Replace all empty cells with 0"
Example output:
(row) => {
  for (const key of Object.keys(row)) {
    if (row[key] === null || row[key] === undefined || String(row[key]).trim() === '') {
      row[key] = '0';
    }
  }
  return row;
}

Example task: "Capitalize all names in column Name"
Example output:
(row) => {
  const val = String(row['Name'] || '');
  row['Name'] = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return row;
}`;

/**
 * Generate a data editing transform function from a natural language prompt
 * 
 * @param {string} prompt - User's editing request
 * @param {Array<object>} sampleData - First 5 rows of selected data
 * @param {Array<string>} columns - Selected column names
 * @returns {Promise<{transformFn: Function, rawCode: string, description: string}>}
 */
export async function generateEdit(prompt, sampleData, columns) {
  const filteredSample = sampleData.map(row => {
    const filtered = {};
    columns.forEach(col => { filtered[col] = row[col] || ''; });
    return filtered;
  });

  const userPrompt = `Here is a sample of the data (first ${filteredSample.length} rows):
${JSON.stringify(filteredSample, null, 2)}

Available columns: ${columns.join(', ')}

Editing task: ${prompt}

Return ONLY the JavaScript function code.`;

  const aiText = await callOllama(userPrompt, SYSTEM_PROMPT);

  // Extract code
  const cleanCode = extractCode(aiText);

  // Parse function
  const transformFn = parseFunction(cleanCode);

  return {
    transformFn,
    rawCode: cleanCode,
    description: `Applied edit: "${prompt}"`,
  };
}

/**
 * Extract JavaScript code from AI response
 */
function extractCode(aiText) {
  let code = aiText;
  const codeMatch = aiText.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
  if (codeMatch) {
    code = codeMatch[1].trim();
  } else {
    code = aiText.replace(/```(?:javascript|js)?\s*/gi, '').replace(/```/g, '').trim();
  }

  if (!code.startsWith('(') && !code.startsWith('function') && !code.startsWith('row')) {
    throw new Error(`AI returned invalid code format for edit operation.`);
  }
  return code;
}

/**
 * Safely evaluate the function string
 */
function parseFunction(codeString) {
  try {
    // eslint-disable-next-line no-eval
    const fn = eval(`(${codeString})`);
    if (typeof fn !== 'function') throw new Error('Not a function');
    return fn;
  } catch (e) {
    throw new Error(`Failed to parse edit function: ${e.message}`);
  }
}

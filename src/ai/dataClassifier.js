/**
 * dataClassifier.js — Prompt-based data classification
 * 
 * User says "classify these transactions as income or expense".
 * The AI generates a JS function that adds a classification column
 * based on the content/context of each row.
 */

import { callOllama } from './ollamaConfig.js';

/**
 * System prompt specialized for classification tasks
 */
const SYSTEM_PROMPT = `You are a data classification expert. You receive tabular data (JSON) and a classification task.
CRITICAL: Return ONLY a valid JavaScript arrow function that takes a single "row" object and returns the modified row WITH a new classification column added.

Rules:
- Analyze the row data to determine the classification label
- Add the classification as a NEW column (choose a descriptive column name based on the task)
- Use keyword matching, numeric thresholds, or pattern matching to classify
- Always return the row object
- Handle edge cases (empty values, unexpected data)
- Make classifications based on ALL available data in the row, not just one column
- If uncertain, use a "Unknown" or "Other" label

Example task: "Classify these transactions as income or expense"
Example output:
(row) => {
  const amount = parseFloat(row['Amount']) || 0;
  const desc = String(row['Description'] || '').toLowerCase();
  const incomeKeywords = ['salary', 'payment received', 'deposit', 'refund', 'interest', 'dividend'];
  const expenseKeywords = ['purchase', 'payment', 'bill', 'fee', 'withdrawal', 'debit'];
  let category = 'Other';
  if (amount > 0 && incomeKeywords.some(k => desc.includes(k))) category = 'Income';
  else if (amount > 0) category = 'Income';
  else if (expenseKeywords.some(k => desc.includes(k))) category = 'Expense';
  else if (amount < 0) category = 'Expense';
  row['Transaction Type'] = category;
  return row;
}

Example task: "Label sentiment as positive, negative, or neutral"
Example output:
(row) => {
  const text = String(row['Review'] || row['Comment'] || row['Text'] || '').toLowerCase();
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'happy', 'wonderful', 'fantastic', 'satisfied'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'poor', 'disappointed', 'angry', 'unsatisfied'];
  let posScore = positiveWords.filter(w => text.includes(w)).length;
  let negScore = negativeWords.filter(w => text.includes(w)).length;
  let sentiment = 'Neutral';
  if (posScore > negScore) sentiment = 'Positive';
  else if (negScore > posScore) sentiment = 'Negative';
  row['Sentiment'] = sentiment;
  return row;
}`;

/**
 * Generate a classification function from a natural language prompt
 * 
 * @param {string} prompt - User's classification request
 * @param {Array<object>} sampleData - First 5 rows of selected data
 * @param {Array<string>} columns - Selected column names
 * @returns {Promise<{transformFn: Function, rawCode: string, newColumnName: string}>}
 */
export async function classifyData(prompt, sampleData, columns) {
  const filteredSample = sampleData.map(row => {
    const filtered = {};
    columns.forEach(col => { filtered[col] = row[col] || ''; });
    return filtered;
  });

  const userPrompt = `Here is a sample of the data (first ${filteredSample.length} rows):
${JSON.stringify(filteredSample, null, 2)}

Available columns: ${columns.join(', ')}

Classification task: ${prompt}

Return ONLY the JavaScript function code. The function must add a new classification column to each row.`;

  const aiText = await callOllama(userPrompt, SYSTEM_PROMPT);

  // Extract code
  const cleanCode = extractCode(aiText);

  // Parse function
  const transformFn = parseFunction(cleanCode);

  // Detect the new column name by running on sample
  const newColumnName = detectNewColumn(transformFn, filteredSample[0], columns);

  return {
    transformFn,
    rawCode: cleanCode,
    newColumnName: newColumnName || 'Classification',
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
    throw new Error(`AI returned invalid code format for classification.`);
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
    throw new Error(`Failed to parse classification function: ${e.message}`);
  }
}

/**
 * Detect what new column the classification function adds
 */
function detectNewColumn(fn, sampleRow, existingColumns) {
  if (!sampleRow) return null;
  try {
    const clone = JSON.parse(JSON.stringify(sampleRow));
    const result = fn(clone);
    const existingSet = new Set(existingColumns);
    const newCols = Object.keys(result).filter(k => !existingSet.has(k));
    return newCols[0] || null;
  } catch {
    return null;
  }
}

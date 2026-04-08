/**
 * ollamaConfig.js — Central Ollama connection & helpers
 * 
 * All AI calls go through this module. No data leaves the machine.
 * Configure via .env: VITE_OLLAMA_URL, VITE_OLLAMA_MODEL
 */

// ── Configuration ──────────────────────────────
const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = import.meta.env.VITE_OLLAMA_MODEL || '';

/**
 * Get the model to use — either from .env or auto-detect the first loaded model
 * @returns {Promise<string>} model name
 */
export async function getModel() {
  if (DEFAULT_MODEL) return DEFAULT_MODEL;

  try {
    // Fetch list of locally available models
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!res.ok) throw new Error('Cannot reach Ollama');
    const data = await res.json();
    if (data.models && data.models.length > 0) {
      return data.models[0].name;
    }
    throw new Error('No models found in Ollama. Please pull a model first (e.g., ollama pull llama3)');
  } catch (err) {
    throw new Error(`Ollama not reachable at ${OLLAMA_BASE_URL}. Is Ollama running? Error: ${err.message}`);
  }
}

/**
 * Check if Ollama is running and reachable
 * @returns {Promise<{online: boolean, model: string|null, error: string|null}>}
 */
export async function checkOllamaStatus() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!res.ok) return { online: false, model: null, error: `HTTP ${res.status}` };
    const data = await res.json();
    const modelCount = data.models?.length || 0;
    if (modelCount === 0) {
      return { online: true, model: null, error: 'No models installed' };
    }
    const model = DEFAULT_MODEL || data.models[0].name;
    return { online: true, model, error: null };
  } catch (err) {
    return { online: false, model: null, error: err.message };
  }
}

/**
 * Call Ollama's generate API (non-streaming for simplicity)
 * 
 * @param {string} prompt - The user prompt
 * @param {string} systemPrompt - System-level instructions
 * @param {object} options - Optional overrides { model, temperature, timeout }
 * @returns {Promise<string>} The AI response text
 */
export async function callOllama(prompt, systemPrompt = '', options = {}) {
  const model = options.model || await getModel();
  const timeout = options.timeout || 120000; // 2 minute default timeout

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        system: systemPrompt,
        stream: false, // Get complete response at once
        options: {
          temperature: options.temperature ?? 0.1, // Low temp for deterministic code gen
          num_predict: options.maxTokens || 4096,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Ollama API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    return data.response || '';
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Ollama request timed out after ${timeout / 1000}s. The model may be too slow or overloaded.`);
    }
    throw new Error(`Ollama request failed: ${err.message}`);
  }
}

export { OLLAMA_BASE_URL };

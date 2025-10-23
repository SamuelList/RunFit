import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API (client-side fallback) — server proxy will be used if VITE_USE_PROXY=true
let genAI = null;
let model = null;
const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true';

/**
 * Initialize the Gemini API with the provided API key
 * @returns {boolean} True if initialization successful
 */
export const initializeGemini = () => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.warn('Gemini API key not configured');
      return false;
    }

    genAI = new GoogleGenerativeAI(apiKey.trim());
    // Model selection - change this string to try different Gemini variants.
    // Examples (swap the model string to experiment):
    //  - 'gemini-2.5-pro'   -> High-quality, best performance (default)
    //  - 'gemini-2.5-flash' -> Standard 2.5 series model (balanced cost/quality)
    //  - 'gemini-2.5-flash-lite' -> Smaller, lower-cost/faster variant
    //  - 'gemini-2.0-flash-exp' -> Older flash/experimental variant (used previously)
    // Note: availability and exact identifiers may vary by account/region. If a model
    // identifier fails, try another or check your Google AI account for supported names.
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Gemini:', error);
    return false;
  }
};

/**
 * Generate running gear recommendations using Gemini
 * @param {string} promptText - The formatted prompt to send to Gemini
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
export const generateGearRecommendation = async (promptText) => {
  try {
    if (USE_PROXY) {
      console.log('[geminiService] Using proxy mode, calling /api/generate-gear');
      // POST to server proxy which holds the server-side API key and enforces cooldown
      const resp = await fetch('/api/generate-gear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });

      console.log('[geminiService] Response status:', resp.status);
      const payload = await resp.json();
      console.log('[geminiService] Response payload:', payload);
      if (!resp.ok) return { success: false, error: payload.error || 'Server error', ...(payload.remainingMs ? { remainingMs: payload.remainingMs } : {}) };
      return { success: true, data: payload.data };
    }

    // Initialize if not already done (client-side SDK)
    if (!model) {
      const initialized = initializeGemini();
      if (!initialized) {
        return {
          success: false,
          error: 'API key not configured. Please add your Gemini API key to the .env file.'
        };
      }
    }

    // Generate content via client-side SDK
    const result = await model.generateContent(promptText);
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      data: text
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Handle specific error types
    if (error.message?.includes('API_KEY_INVALID')) {
      return {
        success: false,
        error: 'Invalid API key. Please check your Gemini API key configuration.'
      };
    }
    
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return {
        success: false,
        error: 'API rate limit reached. Please try again in a moment.'
      };
    }

    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }

    return {
      success: false,
      error: 'Failed to generate recommendation. Please try again.'
    };
  }
};

/**
 * Check if Gemini API is available
 * @returns {boolean}
 */
export const isGeminiAvailable = () => {
  // When using proxy, assume server has the key
  if (USE_PROXY) return true;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  return apiKey && apiKey !== 'your_api_key_here';
};

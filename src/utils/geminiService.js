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
    //  - 'gemini-2.5-flash' -> Standard 2.5 series model (balanced cost/quality, used as fallback)
    //  - 'gemini-2.5-flash-lite' -> Smaller, lower-cost/faster variant
    //  - 'gemini-2.0-flash-exp' -> Older flash/experimental variant (used previously)
    // Note: availability and exact identifiers may vary by account/region. If a model
    // identifier fails, try another or check your Google AI account for supported names.
    // Use the high-quality 'pro' model as the primary; fallback to 'flash' is attempted on access errors.
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
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
      // Include server 'note' and 'model' if present
      return { success: true, data: payload.data, ...(payload.note ? { note: payload.note } : {}), ...(payload.model ? { model: payload.model } : {}) };
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
    try {
      const result = await model.generateContent(promptText);
      const response = await result.response;
      const text = response.text();
      return { success: true, data: text, model: 'gemini-2.5-pro' };
    } catch (e) {
      console.warn('[geminiService] primary model generate failed:', e?.message || e);

      // Detect common access/model-not-available errors and try fallback to flash
      const msg = (e && e.message) ? e.message.toLowerCase() : '';
      const accessRelated = msg.includes('not authorized') || msg.includes('permission') || msg.includes('access') || msg.includes('model not found') || msg.includes('not found') || msg.includes('does not exist') || msg.includes('unsupported');

      if (accessRelated) {
        try {
          console.log('[geminiService] attempting fallback to gemini-2.5-flash');
          // Attempt to instantiate a flash model client and retry once
          const flashClient = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY.trim());
          const flashModel = flashClient.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const flashResult = await flashModel.generateContent(promptText);
          const flashResponse = await flashResult.response;
          const flashText = flashResponse.text();
          return { success: true, data: flashText, model: 'gemini-2.5-flash', note: 'retried-with-flash' };
        } catch (flashErr) {
          console.error('[geminiService] fallback model also failed:', flashErr);
          // fall through to unified error handler below
        }
      }

      throw e; // let the outer catch handle the message
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    
    const errorMsg = error.message?.toLowerCase() || '';
    const errorString = error.toString().toLowerCase();
    
    // Handle specific error types with more helpful messages
    
    // API Key issues
    if (errorMsg.includes('api_key_invalid') || errorMsg.includes('invalid api key') || errorMsg.includes('api key not valid')) {
      return {
        success: false,
        error: 'Invalid API key. Please check your Gemini API key in settings.'
      };
    }
    
    // Rate limiting / Quota
    if (errorMsg.includes('quota') || errorMsg.includes('resource exhausted') || errorMsg.includes('rate limit')) {
      return {
        success: false,
        error: 'API quota exceeded. Try again in a few minutes or check your Google AI Studio quota.'
      };
    }
    
    // Network/Connection issues
    if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('timeout') || 
        errorMsg.includes('econnrefused') || errorMsg.includes('connection') || errorString.includes('typeerror: failed to fetch')) {
      return {
        success: false,
        error: 'Network connection error. Check your internet connection and try again.'
      };
    }
    
    // Model not found / Access issues
    if (errorMsg.includes('model not found') || errorMsg.includes('not found') || 
        errorMsg.includes('does not exist') || errorMsg.includes('unsupported')) {
      return {
        success: false,
        error: 'AI model unavailable. This may be a temporary issue - please try again.'
      };
    }
    
    // Permission/Authorization issues
    if (errorMsg.includes('permission') || errorMsg.includes('forbidden') || 
        errorMsg.includes('not authorized') || errorMsg.includes('unauthorized') || errorMsg.includes('403')) {
      return {
        success: false,
        error: 'Access denied. Check your API key permissions in Google AI Studio.'
      };
    }
    
    // Content filtering / Safety
    if (errorMsg.includes('safety') || errorMsg.includes('blocked') || errorMsg.includes('content filter')) {
      return {
        success: false,
        error: 'Request blocked by safety filters. Try regenerating with different settings.'
      };
    }
    
    // Server errors (500s)
    if (errorMsg.includes('500') || errorMsg.includes('internal server') || errorMsg.includes('service unavailable')) {
      return {
        success: false,
        error: 'Gemini service temporarily unavailable. Please try again in a moment.'
      };
    }
    
    // Timeout
    if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
      return {
        success: false,
        error: 'Request timed out. The AI is taking too long - please try again.'
      };
    }
    
    // Response too large
    if (errorMsg.includes('too large') || errorMsg.includes('payload') || errorMsg.includes('size')) {
      return {
        success: false,
        error: 'Response too large. Try simplifying your request.'
      };
    }
    
    // Catch-all with more context
    return {
      success: false,
      error: `AI error: ${error.message || 'Unknown error occurred'}. Please try again.`
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

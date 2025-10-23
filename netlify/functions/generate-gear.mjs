import { Redis } from '@upstash/redis';
import { GoogleGenerativeAI } from '@google/generative-ai';

const COOLDOWN_MS = Number(process.env.COOLDOWN_MS || 120000);
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

let model = null;
function ensureGemini() {
  if (model) return true;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('GEMINI_API_KEY not found in env. Available env keys:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('UPSTASH')));
    return false;
  }
  try {
    const g = new GoogleGenerativeAI(key.trim());
    model = g.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-pro' });
    console.log('Gemini initialized successfully');
    return true;
  } catch (e) {
    console.error('Failed to initialize Gemini SDK:', e);
    return false;
  }
}

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    const { prompt } = JSON.parse(event.body || '{}');
    if (!prompt) return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing prompt' }) };

    // Use a global cooldown key (simple approach - all users share cooldown)
    // For per-user: implement auth and use user ID, or use a cookie-based session ID
    const key = `ai:last:global`;
    const last = await redis.get(key);
    const now = Date.now();
    console.log('[function] Checking cooldown. last:', last, 'now:', now, 'diff:', last ? now - Number(last) : 'none');
    if (last && now - Number(last) < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - Number(last));
      console.log('[function] Cooldown active, remaining:', remaining);
      return { statusCode: 429, body: JSON.stringify({ success: false, error: 'Cooldown', remainingMs: remaining }) };
    }

    await redis.set(key, String(now), { ex: Math.ceil((COOLDOWN_MS + 5000) / 1000) });
    console.log('[function] Cooldown key set');

    if (!ensureGemini()) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' }) };
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return { statusCode: 200, body: JSON.stringify({ success: true, data: text }) };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: (err && err.message) || 'Server error' }) };
  }
}

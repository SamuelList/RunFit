import { Redis } from '@upstash/redis';

const COOLDOWN_MS = Number(process.env.COOLDOWN_MS || 60000);
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

const KEY = 'ai:last:global';

export async function handler(event) {
  try {
    if (event.httpMethod === 'GET') {
      const last = await redis.get(KEY);
      const now = Date.now();
      const rem = last ? Math.max(0, COOLDOWN_MS - (now - Number(last))) : 0;
      return { statusCode: 200, body: JSON.stringify({ remainingMs: rem, COOLDOWN_MS }) };
    }

    if (event.httpMethod === 'POST') {
      // Accept optional ts in body to set last-used, otherwise use now
      const { ts } = JSON.parse(event.body || '{}');
      const when = ts ? Number(ts) : Date.now();
      await redis.set(KEY, String(when), { ex: Math.ceil((COOLDOWN_MS + 5000) / 1000) });
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('Cooldown function error:', err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message || 'Server error' }) };
  }
}

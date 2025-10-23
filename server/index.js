import express from 'express';
import Redis from 'ioredis';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const COOLDOWN_MS = parseInt(process.env.COOLDOWN_MS || '120000', 10);
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

function userKeyForReq(req) {
  // Prefer authenticated user id header; fall back to IP
  if (req.headers['x-user-id']) return `ai:last:${req.headers['x-user-id']}`;
  return `ai:last:ip:${req.ip}`;
}

let genAI = null;
let model = null;

function ensureGeminiInit() {
  if (model) return true;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not configured on server');
    return false;
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey.trim());
    model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-pro' });
    return true;
  } catch (e) {
    console.error('Failed to initialize Gemini SDK on server:', e);
    return false;
  }
}

async function callGeminiServerSide(prompt) {
  // If MOCK_GEMINI is set, return a canned response so we can test without a key.
  if (process.env.MOCK_GEMINI === 'true') {
    return `MOCK_GEMINI_RESPONSE: Recommended gear for prompt length ${String(prompt).length}`;
  }

  if (!ensureGeminiInit()) throw new Error('Gemini not initialized on server');

  // Use the SDK's generate API
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return text;
}

app.post('/api/generate-gear', async (req, res) => {
  try {
    const key = userKeyForReq(req);
    const now = Date.now();
    const last = await redis.get(key);

    if (last && now - Number(last) < COOLDOWN_MS) {
      const remainingMs = COOLDOWN_MS - (now - Number(last));
      return res.status(429).json({ success: false, error: 'Cooldown', remainingMs });
    }

    // Optimistically set last-used
    await redis.set(key, String(now), 'PX', 24 * 60 * 60 * 1000);

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Missing prompt' });

    // Call Gemini server-side (placeholder)
    const data = await callGeminiServerSide(prompt);

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`RunFit server listening on ${PORT}`);
});

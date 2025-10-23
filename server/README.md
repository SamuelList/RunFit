RunFit Express server (development)

This small Express microservice provides a server-side proxy for Gemini calls and enforces a per-user cooldown using Redis.

Environment variables
- GEMINI_API_KEY - your server-side Gemini API key (do NOT expose this to the client)
- REDIS_URL - connection string for Redis (e.g. redis://localhost:6379)
- PORT - port to listen on (default 4000)
- COOLDOWN_MS - cooldown in milliseconds (default 90000)

Run locally (requires Redis running locally):

1. cd server
2. npm install
3. export GEMINI_API_KEY=...
4. export REDIS_URL=redis://127.0.0.1:6379
5. npm start

In production, deploy to Cloud Run / a VM and set the environment variables in your provider.

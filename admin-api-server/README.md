# WanderAI API Server

Secure backend for WanderAI. It keeps the **Gemini API key server-side** (so it is
never shipped in the browser bundle) and provides trip persistence.

## Why this exists

The frontend can call Gemini directly, but that exposes `VITE_GEMINI_API_KEY` in the
browser. With this server running and `VITE_API_BASE_URL` set in the frontend, the
copilot chat routes through the server instead — the key stays private.

## Setup

```bash
cd admin-api-server
cp .env.example .env        # then put your real GEMINI_API_KEY in .env
npm install                 # express, cors, dotenv
npm run dev                 # starts on http://localhost:8787 (auto-reload)
```

Then in the project root `.env` add:

```
VITE_API_BASE_URL=http://localhost:8787
```

Restart `npm run dev` (the Vite frontend) so it picks up the new env var.

## Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/health` | Health + whether Gemini is configured |
| POST | `/api/ai/generate` | `{ prompt, json? }` → `{ text }` (key stays server-side) |
| POST | `/api/ai/chat` | `{ messages, system }` → SSE stream of `{ text }` deltas |
| GET | `/api/trips?userId=` | List saved trips |
| GET | `/api/trips/:id` | Get one trip |
| POST | `/api/trips` | Save a trip |
| DELETE | `/api/trips/:id` | Delete a trip |

Trips are stored in `admin-api-server/data/trips.json` (gitignored). Swap
`src/store/tripStore.js` for a real database (Postgres, Firestore, etc.) when needed.

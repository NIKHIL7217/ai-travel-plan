# WanderAI API Server

Secure backend for WanderAI. It keeps the **Gemini API key server-side** (so it is
never shipped in the browser bundle), can proxy live travel APIs server-side,
and provides trip persistence.

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

Optional security envs (recommended):

```bash
ADMIN_BOOTSTRAP_EMAILS=admin@wanderai.local,owner@company.com
ADMIN_API_SECRET=change-me-strong-secret
ENFORCE_ADMIN_SECRET=true
```

Optional live data envs:

```bash
GOOGLE_MAPS_API_KEY=your_google_maps_key
OPENWEATHER_API_KEY=your_openweather_key

# Live proxy cache tuning (optional)
LIVE_PROXY_CACHE_ENABLED=true
LIVE_PROXY_CACHE_MAX_ENTRIES=800
LIVE_PROXY_CACHE_TTL_GEOCODE_MS=21600000
LIVE_PROXY_CACHE_TTL_ROUTE_MS=7200000
LIVE_PROXY_CACHE_TTL_PLACES_MS=1200000
LIVE_PROXY_CACHE_TTL_WEATHER_MS=600000
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
| GET | `/api/live/geocode?q=` | Server-side geocode with Google/OSM fallback |
| GET | `/api/live/route?origin=&destination=` | Server-side route distance + duration |
| GET | `/api/live/places?lat=&lng=&type=` | Server-side nearby places lookup |
| GET | `/api/live/weather?lat=&lng=` | Server-side weather lookup |
| GET | `/api/live/cache/stats` | Live proxy cache stats (entries, TTLs, hit/miss/dedupe counters) |
| GET | `/api/trips?userId=` | List saved trips |
| GET | `/api/trips/:id` | Get one trip |
| POST | `/api/trips` | Save a trip |
| DELETE | `/api/trips/:id` | Delete a trip |
| GET | `/api/admin/overview` | Real dashboard metrics: users, logins, trips, revenue |
| GET | `/api/admin/users` | List all tracked users |
| POST | `/api/admin/users/upsert` | Create/update user profile in admin DB |
| PATCH | `/api/admin/users/:id` | Update user status/role/profile |
| DELETE | `/api/admin/users/:id` | Remove user from admin DB |
| POST | `/api/admin/events/auth` | Track auth events (`login`/`signup`/`logout`) |
| POST | `/api/admin/events/trip` | Track trip save + revenue event |

Trips are stored in `admin-api-server/data/trips.json` (gitignored). Swap
`src/store/tripStore.js` for a real database (Postgres, Firestore, etc.) when needed.

Admin telemetry is stored in:

- `admin-api-server/data/users.json`
- `admin-api-server/data/admin-events.json`

This gives you a database-like persistent layer for user control + income tracking,
without requiring external infra during development.

## Request Context and Access Rules

- Trips routes require requester context (`x-user-id` header or `userId` in body/query).
- Non-admin users can only access their own trips.
- Admin routes require:
	- requester must exist in tracked users store with `role: admin`, and
	- if configured, `x-admin-secret` must match `ADMIN_API_SECRET`.

Admin role bootstrap:

- Add allowed admin emails to `ADMIN_BOOTSTRAP_EMAILS`.
- On signup/login/upsert, those emails are promoted to admin role server-side.

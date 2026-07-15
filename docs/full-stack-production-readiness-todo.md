# WanderAI Full-Stack Production Readiness TODO

This document is a repo-specific, implementation-level checklist for taking WanderAI from a strong prototype to a real web app with stable frontend, backend, data, auth, admin, and live travel data.

It is intentionally practical.
It should be used like a working engineering backlog.

---

## 1. Current Reality Snapshot

### What is already working
- Vue 3 + Vite + Pinia + Vue Router app shell is in place.
- Planner, roadtrip, trips, community, profile, documents, and admin pages exist.
- Firebase auth + Firestore path exists, with local fallback when Firebase envs are missing.
- Admin API server exists for:
  - Gemini proxy
  - trip persistence
  - admin user/event management
- Real data services exist for:
  - geocoding
  - route distance
  - nearby places
  - weather
  - traffic
  - events
  - live destination photos
- Shared cache exists in frontend.
- Test, lint, and build pipelines are already present.

### What was weak before the latest fixes
- Real-data paths were mixed with fake fallback presentation in some planner flows.
- Budget engine had mixed currency assumptions.
- Some heavy live-data flows were over-calling external APIs.
- Browser was directly hitting too many external travel APIs.
- Live-data debugging was hard because provider source/fallback path was not clearly visible.

### What has now been improved
- Budget flow is being normalized toward INR-first behavior.
- Budget generation now has dedicated caching.
- Backend-first live travel proxy path has been added for geocode, route, places, and weather.
- Unified discovery fan-out has been reduced.
- Location intelligence is cached.
- Live-data decision logging has been added into monitoring.

---

## 2. Target Product Standard

WanderAI should behave like a real travel web app, not just a UI demo.

That means:
- Real users can sign up, log in, log out, and recover accounts reliably.
- Trips save correctly per user and survive refresh/restart.
- Admin can monitor users, auth, trips, revenue-style events, and data health.
- Planner shows live destination, route, weather, stays, restaurants, and travel cost context wherever possible.
- API keys are not relied on from the browser for critical production paths.
- Cache is used intentionally so rate limits and repeated cost are controlled.
- Errors are observable and diagnosable.
- No feature should silently fail and then pretend to be real.

---

## 3. Priority Order

### P0: Must be solid before calling this production-ready
- Stable auth and user lifecycle
- Stable trip persistence
- Real-data pipeline through backend proxy
- Clear strict-live vs fallback behavior
- Budget engine with one currency model
- Admin observability for user and data events
- API rate control and cache policy
- Security cleanup for secrets and admin access

### P1: Strongly recommended next
- Better diagnostics surface for data provider failures
- Retry UX and partial-data UI states
- Background refresh and stale cache policy
- Admin controls for banning/suspending users
- Password reset / email verification / session hardening

### P2: Product polish and scale
- Proper database migration away from JSON files
- Queue/background jobs for expensive enrichments
- Billing-aware quota management
- Analytics dashboards and operational alerting

---

## 4. Frontend TODO

### Planner and travel data UX
- [ ] Replace any remaining generic hardcoded copy that can be mistaken for live data.
- [ ] Show explicit state when a section is empty because live provider failed in strict mode.
- [ ] Display provider-backed route time and distance consistently across planner, roadtrip, and destination details.
- [ ] Show whether budget is estimated from live place pricing or heuristic travel math.
- [ ] Add visible stale/last-updated metadata for weather, route, and place cards.
- [ ] Add retry action for each live block instead of only page-level retry.

### Auth and account UX
- [ ] Add password reset flow.
- [ ] Add email verification UX if Firebase is enabled.
- [ ] Add session-expired handling and redirect messaging.
- [ ] Add user profile edit and account deletion flow.
- [ ] Add device/session visibility if long-term auth support is required.

### Saved trips and user data
- [ ] Ensure every saved trip is editable, duplicable, deletable, and shareable.
- [ ] Add optimistic UI with rollback when backend save/delete fails.
- [ ] Add per-trip metadata: source prompt, updatedAt, sync status, last live refresh.

### Diagnostics UX
- [ ] Add a developer-only diagnostics drawer or admin-only diagnostics page that reads monitoring events.
- [ ] Show: provider source, success/failure, fallback reason, last API timestamp, and cache-hit indicators.

---

## 5. Backend TODO

### Admin API server
- [ ] Add response caching for `/api/live/geocode`, `/api/live/route`, `/api/live/places`, and `/api/live/weather`.
- [ ] Add cache invalidation / TTL strategy per endpoint.
- [ ] Add request timeouts and normalized error payloads for all live proxy routes.
- [ ] Add lightweight rate-limiting to protect external API quotas.
- [ ] Add structured server logs for provider success/failure and response latency.
- [ ] Add health endpoint details for live integrations: googleConfigured, openWeatherConfigured, geminiConfigured.

### Security
- [ ] Remove dependence on public browser keys for production-critical paths wherever possible.
- [ ] Enforce admin secret in production only, but make dev setup smoother.
- [ ] Add origin restrictions and secret rotation guidance.
- [ ] Add request validation on all admin and live routes.

### Auth backend support
- [ ] Add backend-side account lifecycle helpers if Firebase is not the long-term final auth source.
- [ ] Add audit trail for signup, login, failed login, suspension, role change, account deletion.

---

## 6. Database and Persistence TODO

### Current status
- Frontend can use Firestore if Firebase envs are configured.
- Backend currently persists admin and trip data in JSON files.
- This is useful for development, but not sufficient for a serious multi-user production setup.

### Required next step
- [ ] Decide single source of truth for production data.

### Recommended production data split
- Auth: Firebase Auth or equivalent managed auth
- User profiles: Firestore / Postgres / equivalent
- Trips: Firestore / Postgres
- Admin events and analytics: Postgres / ClickHouse / logging pipeline
- Caches: Redis or managed cache when traffic grows

### Immediate DB TODO
- [ ] Define canonical data ownership for users, trips, and admin events.
- [ ] Stop long-term dependence on JSON files in `admin-api-server/data`.
- [ ] Add migration plan from JSON file store to real DB.
- [ ] Add indexes for trip queries, user lookup, admin reporting.
- [ ] Add backup and recovery plan.

---

## 7. Real Data Pipeline TODO

### Geocoding
- [ ] Prefer backend proxy in production.
- [ ] Log provider source: backend/google/osm/empty.
- [ ] Handle ambiguous place names more safely.

### Places
- [ ] Prefer backend proxy in production.
- [ ] Expand categories where needed: pharmacy, ATM, parking, transit, washroom.
- [ ] Deduplicate place results across providers.
- [ ] Add cache-key normalization for destination aliases.

### Weather
- [ ] Put `OPENWEATHER_API_KEY` in backend env for richer AQI/current conditions.
- [ ] Keep Open-Meteo fallback, but label reduced-fidelity states internally.
- [ ] Store provider source in diagnostics.

### Routes
- [ ] Prefer backend proxy in production.
- [ ] Use server cache for repeated origin-destination route pairs.
- [ ] Add provider diagnostics for Google vs heuristic fallback.

### Budget
- [ ] Complete and preserve INR-only semantics across all planner/roadtrip/trips surfaces.
- [ ] Mark when budget came from live local pricing vs heuristics.
- [ ] Cache budget estimates by normalized request key.

---

## 8. Admin and User Management TODO

### Admin side
- [ ] Add live diagnostics section inside admin page.
- [ ] Show recent live-data failures and fallback counts.
- [ ] Show top destinations by API usage.
- [ ] Show cache-hit ratio and provider error counts.
- [ ] Add suspend/ban/reactivate workflows with reason logging.
- [ ] Add role management safety rules.

### Real users side
- [ ] Signup/login should always create or sync admin-side user record.
- [ ] Saved trips must always be user-scoped.
- [ ] Community actions must be auth-scoped and abuse-protected.
- [ ] Group travel actions must validate membership and permissions consistently.

---

## 9. Caching Strategy TODO

### Frontend cache
- [ ] Review all TTLs and ensure they match data volatility.
- [ ] Add explicit stale markers for weather and route.
- [ ] Add cache clear helper for debugging.

### Backend cache
- [ ] Add in-memory cache first.
- [ ] Later move to Redis if load increases.
- [ ] Cache geocode, route, weather, and places independently.

### Cache policy recommendation
- Geocode: 12h to 7d
- Places: 15m to 30m
- Weather: 10m to 20m
- Route distance: 30m to 6h
- Budget estimate: 15m
- Discovery collections: 20m

---

## 10. Observability and Diagnostics TODO

### Already added direction
- Live-data decision logging now exists in monitoring.
- This needs a visible consumer.

### Next implementation steps
- [ ] Add `getLiveDataSnapshot()` consumer in a debug/admin surface.
- [ ] Group diagnostics by feature: geocode, route, weather, places, location intelligence, budget.
- [ ] Show last 50 live-data events with timestamp, source, status, and reason.
- [ ] Add server-side diagnostics counters for `/api/live/*` routes.

---

## 11. Security TODO

- [ ] Remove public Gemini key usage from production path wherever possible.
- [ ] Move critical Google and weather calls fully behind backend for production mode.
- [ ] Audit `.env` usage and split dev/prod secret strategy.
- [ ] Add `.env.example` for root app with required and optional vars explained clearly.
- [ ] Review admin bootstrap email logic for production safety.
- [ ] Add account lock / failed-login throttling if local auth fallback remains.

---

## 12. Testing TODO

### Keep
- `npm run lint`
- `npm run build`
- `npm run test`

### Add next
- [ ] Integration tests for backend `/api/live/*` routes.
- [ ] Tests for cache-hit and fallback behavior.
- [ ] Tests for strict live mode showing empty state instead of fake state.
- [ ] Tests for budget engine with INR-only assumptions.
- [ ] Auth lifecycle tests: signup, login, logout, role sync, admin bootstrap.

---

## 13. Environment TODO

### Root frontend env should clearly define
- [ ] `VITE_ADMIN_API_BASE_URL`
- [ ] `VITE_FIREBASE_*` vars if cloud auth/storage is intended
- [ ] `VITE_REAL_DATA_ONLY`
- [ ] remove unused or misleading envs over time

### Backend env should clearly define
- [ ] `GEMINI_API_KEY`
- [ ] `GOOGLE_MAPS_API_KEY`
- [ ] `OPENWEATHER_API_KEY`
- [ ] `ADMIN_API_SECRET`
- [ ] `ADMIN_BOOTSTRAP_EMAILS`

---

## 14. Recommended Execution Plan

### Phase 1: Real-data hardening
- [ ] Finish backend cache on live proxy routes
- [ ] Expose diagnostics snapshot in admin/debug UI
- [ ] Verify all planner/destination/roadtrip flows are backend-first in production mode

### Phase 2: Account and admin hardening
- [ ] Add password reset / verification / suspension / audit trail
- [ ] Finalize real multi-user persistence ownership
- [ ] Reduce local fallback dependence for production mode

### Phase 3: Database readiness
- [ ] Replace JSON persistence with real DB
- [ ] Add migrations and indexes
- [ ] Add operational backup and restore plan

### Phase 4: Production polish
- [ ] Observability dashboard
- [ ] quota monitoring
- [ ] failover runbooks
- [ ] release checklist

---

## 15. Definition of Done

WanderAI should be considered production-ready only when all of the below are true:
- Real users can sign up, log in, save trips, and return later reliably.
- Admin can monitor users, roles, and critical events from one place.
- Planner and roadtrip modules show real data or explicitly show that live data is unavailable.
- No critical production feature depends on exposed browser-only secrets.
- Cache and API usage are controlled and observable.
- Budget, route, stays, restaurants, and weather behave consistently in the same currency and same live-data mode.
- Build, lint, and test stay green.

---

## 16. Short Immediate Next TODO

If the goal is to make the app feel like a real working product as fast as possible, do these next in order:
- [ ] Add backend response cache for `/api/live/*`
- [ ] Add diagnostics viewer in admin page
- [ ] Add root `.env.example` cleanup and backend `.env` setup with Google + OpenWeather keys
- [ ] Finalize Firebase + backend user sync policy
- [ ] Replace JSON trip/admin persistence with a real DB

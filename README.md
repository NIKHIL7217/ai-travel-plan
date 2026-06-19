# AI Travel App (Live Data Migration)

Last updated: 2026-06-19

This README reflects the current production-oriented migration status.

## Current Status

- App is migrated from demo-style behavior toward live, data-driven travel operations.
- Core flows are working: Home, Destination, DestinationDetails, Planner, Dashboard, SavedTrips, Auth.
- No Mock Data Policy foundation is active.
- Required cache buckets are implemented and wired into core services.
- Build and tests are green on latest slice.

Latest verification:

- `npm run build` passed.
- `npm run test` passed (`14` files, `67` tests).

## Stack

- Vue 3
- Vite
- Vue Router
- Pinia
- Firebase (auth/data when configured)
- Gemini API (AI generation)
- Zod (schema validation)

## Product Direction

Goal: convert the app into a fully data-driven Travel OS.

Key migration constraints in effect:

1. Prefer real APIs and live providers.
2. Avoid fake/demo static content where possible.
3. If live data is unavailable, render graceful fallback messaging (not fake data) when policy is active.
4. Every visible feature should support loading/error/empty/success lifecycle states.

## Implemented Migration Milestones

### 1) No Mock Data Policy

- `NO_MOCK_DATA_POLICY` added and enabled by default unless explicitly disabled.
- `DEMO_MODE` is blocked when no-mock is active.
- Core services updated to avoid static fallback under policy.

Primary file:

- `src/services/ai/planner.service.ts`

### 2) Unified Cache Layer

Implemented shared cache module:

- `src/core/cache/dataCache.js`

Required buckets implemented exactly as requested:

- `destination_cache`
- `search_cache`
- `weather_cache`
- `photo_cache`
- `route_cache`

### 3) Live Photo Resolution

- Live destination photo provider added:
  - Google Places Photos first
  - live Unsplash source fallback
- Bundled destination images are avoided in migrated flows.

Primary file:

- `src/services/photo/provider.service.ts`

### 4) Dynamic Trending Engine

- Implemented live trending categories:
  - Nearby Destinations
  - Weekend Escapes
  - Seasonal Recommendations
  - Trending Destinations
- Integrated in Home page.

Primary file:

- `src/modules/trending/engine.js`

### 5) Home Migration

- Home now uses live recommendations and trending engine data.
- Distance display uses route service from user real-time location.
- Home sections have explicit loading/error/empty/success behavior.

Primary file:

- `src/pages/Home.vue`

### 6) Widget/Page State Coverage Expansion

Explicit loading/error/empty/success handling added on critical pages:

- `src/pages/Destination.vue`
- `src/pages/DestinationDetails.vue`
- `src/pages/Dashboard.vue`
- `src/pages/SavedTrips.vue`

## Active App Routes

- `/`
- `/destination`
- `/destination/:id`
- `/planner`
- `/login`
- `/dashboard` (protected)
- `/saved-trips` (protected)
- `/guides`
- `/security`
- `/faq`
- `/api-keys`

## Environment Variables

### Required

- `VITE_GEMINI_API_KEY`

### Recommended

- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_OPENWEATHER_API_KEY`
- `VITE_TOMTOM_API_KEY`
- Firebase keys (`VITE_FIREBASE_*`)

### Behavior Flags

- `VITE_REAL_DATA_ONLY` (default true unless set to `false`)
- `VITE_NO_MOCK_DATA_POLICY` (default true unless set to `false`)
- `VITE_DEMO_MODE` (effective only when no-mock policy is not active)

Start from the template file:

- `.env.example`

## Run Locally

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Quality Commands

```bash
npm run lint
npm run test
npm run test:unit
npm run test:component
npm run test:integration
npm run test:coverage
npm run test:e2e
npm run lighthouse
npm run quality:check
```

## Repo Notes

- Active runtime is under `src/`.
- `src/app/` and parts of `src/features/` contain older/legacy flows; not all are routed in the current app shell.

## Current Risks / Pending Work

1. Continue no-mock sweep for remaining secondary widgets and old fallback branches.
2. Further reduce legacy overlap between active and older module trees.
3. Keep improving contract strictness where dynamic payloads still exist.
4. Add broader integration coverage for outage/fallback scenarios.

## Roadmap Document

Detailed phased migration plan:

- `docs/data-os-migration-roadmap.md`

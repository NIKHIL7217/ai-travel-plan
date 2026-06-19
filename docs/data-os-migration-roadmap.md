# Data-Driven Travel OS Migration Roadmap

Last updated: 2026-06-19

## Product Goal

Migrate AI Travel Planner from demo-oriented behavior to a live-data travel operating system without breaking existing user flows.

## Hard Policies

1. No Mock Data Policy is enabled by default.
2. If live data is unavailable, UI must show graceful empty/error state messages.
3. All destination media must come from live providers.
4. All visible features must expose loading, error, empty, and success states.

## Migration Phases

### Phase 1: Platform Foundations (Completed)

- Add shared cache infrastructure with named buckets:
  - destination_cache
  - search_cache
  - weather_cache
  - photo_cache
  - route_cache
- Add no-mock policy flag exported from core AI planner service.
- Add live photo provider service:
  - Google Places photos first
  - Unsplash live query fallback

### Phase 2: Home Data Engine (Completed)

- Replace static recommendation strategy with dynamic trending engine:
  - Nearby destinations
  - Weekend escapes
  - Seasonal recommendations
  - Trending destinations
- Use route service for distance computation using user real-time location.
- Ensure destination cards and trend cards remain actionable.
- Add explicit loading/error/empty/success handling for trending surfaces.

### Phase 3: Service-Level No-Mock Enforcement (Completed for core paths)

- Recommendation service:
  - search cache integration
  - no-mock behavior for search/details/location fallback
  - live destination photo resolver integration
- Weather service:
  - weather_cache integration
  - no static fallback when no-mock policy is active
- Route service:
  - route_cache integration
  - no static fallback when no-mock policy is active
- Places service:
  - no static fallback when no-mock policy is active

### Phase 4: Remaining UI State Coverage (In Progress)

- Audit each page widget/card for full state lifecycle:
  - loading
  - error
  - empty
  - success
- Add missing state surfaces in Destination, DestinationDetails, Dashboard, SavedTrips, and Planner secondary widgets.

### Phase 5: End-to-End Reliability and Correctness (Pending)

- Add integration tests for:
  - no-mock behavior under API outage
  - cache hit/miss behavior per bucket
  - dynamic trending engine category integrity
- Add telemetry dashboards for cache effectiveness and external API failure rates.

## Rollout Strategy

1. Keep existing routing and user journey unchanged.
2. Land migration in incremental slices behind existing interfaces.
3. Validate build and tests after each slice.
4. Prioritize correctness and graceful degradation over cosmetic changes.

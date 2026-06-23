# WanderAI Travel Operating System Architecture Blueprint

Last updated: 2026-06-22

## 1. Scope and Constraints

This blueprint evolves the existing Vue 3 + Vite + Pinia codebase into a production-grade Travel Operating System.

Constraints respected:
- Existing working features are preserved.
- Architecture is enhanced, not replaced.
- Existing modules are reused before creating new layers.
- Phase 1 shipping path is prioritized, then Phase 2 and Phase 3 roadmaps.

## 2. Existing Architecture Audit

### Active runtime and reusable modules
- Runtime shell: src/main.js, src/App.vue, src/router/index.js
- Planner surface: src/pages/Planner.vue
- Dashboard surface: src/pages/Dashboard.vue
- Persistence: src/services/firebase.js (Firebase + local fallback)
- AI services: src/services/ai/*
- Routing and geospatial: src/services/maps/*
- Travel providers: src/services/travel/*
- Photo provider: src/services/photo/provider.service.ts
- Profile memory: src/modules/profile-memory/*
- Plan comparison engine: src/modules/planner-options/index.js
- Roadtrip engine: src/modules/roadtrip/*
- Intelligence services: src/modules/travel-intelligence/*

### Present but underused or parked modules
- Planner comparison UI was available but not actively surfaced in planner flow.
- Profile-memory module existed but lacked a central Pinia store integration.
- Roadtrip engine existed but dedicated workspace route was missing.
- Personalized recommendations existed at service level, but no memory-driven recommendation orchestrator.

### Gaps found before implementation
- No unified memory state source for Planner and Dashboard.
- No dedicated Travel History dashboard metrics model.
- No integrated Smart Recommendations panel using profile signals.
- Roadtrip mode was not promoted as a first-class route-level workspace.

## 3. Phase 1 Delivery Design

Phase 1 priorities:
1. Profile Memory System
2. Travel Personality Engine
3. Plan Comparison
4. Roadtrip Mode
5. Smart Recommendations
6. User Dashboard Upgrade

### Implemented foundation in this iteration
- Profile memory Pinia store: src/stores/profileMemory.js
- Smart recommendation engine: src/modules/recommendations/engine.js
- Dedicated roadtrip planner page: src/pages/RoadtripPlanner.vue
- Planner upgraded with:
  - memory nudge
  - memory-driven personalization
  - 3-option plan comparison
  - roadtrip intelligence panel for road modes
- Dashboard upgraded with:
  - personality panel
  - memory timeline
  - travel history analytics
  - smart recommendation cards

## 4. Feature-Level Architecture Matrix

## 4.1 Profile Memory Engine

Architecture:
- Domain memory logic stays in src/modules/profile-memory/*.
- State orchestration handled by src/stores/profileMemory.js.
- Planner and Dashboard read/write through Pinia store actions.

Components:
- Planner memory nudge card in src/pages/Planner.vue.
- Dashboard profile memory panel in src/pages/Dashboard.vue.
- Memory timeline preview in dashboard panel.

Services:
- loadProfileMemory
- saveEditablePreferences
- recordGeneratedTrip
- recordSavedTrip
- computeMemoryScores
- createPersonalizationPlan

State Management:
- Pinia store key: profileMemory
- State includes memory object, confidence scores, personality profile, memory timeline
- Getter includes profileNudge, preferredSettings, historySummary, topDestinations

Database Changes:
- Current phase stores memory in localStorage via existing module.
- Next migration path: move to Firestore collection user_profile_memory for multi-device consistency.

API Changes:
- None required for local phase.
- Future API contract for cloud sync:
  - GET /api/profile-memory
  - PATCH /api/profile-memory/preferences
  - POST /api/profile-memory/events

UI Changes:
- Planner now proposes saved preference application.
- Dashboard now exposes personality and timeline insights.

Testing Strategy:
- Unit: store personality classification and score derivation.
- Integration: planner generation updates memory and dashboard reflects changes.
- Regression: ensure planner still works without memory signals.

## 4.2 Travel Personality Engine

Architecture:
- Implemented inside profileMemory Pinia store as derived model.
- Uses historical trip patterns and preference distribution.

Components:
- Personality label and traits chips in Planner and Dashboard.

Services:
- computeMemoryScores + rule-driven classifier in store.

State Management:
- personality object in store: key, label, description, traits.

Database Changes:
- No schema migration yet; personality derived at runtime.
- Future optimization: persist personality snapshots for analytics drift tracking.

API Changes:
- Future endpoint:
  - GET /api/profile-memory/personality

UI Changes:
- Confidence-based hints and behavior-aware recommendations.

Testing Strategy:
- Unit: classification buckets (Explorer, Luxury Traveler, Foodie, Backpacker, Road Tripper, Family Planner).
- Snapshot: personality output for known fixtures.

## 4.3 Plan Comparison

Architecture:
- Existing scoring engine reused: src/modules/planner-options/index.js.
- Planner now generates Budget, Balanced, Premium options on each request.

Components:
- Comparison UI: src/features/planner/PlanComparisonView.vue.
- Selected plan strip in planner result column.

Services:
- generateTravelPlan
- generateBudgetEstimate
- rankItineraryOptions
- createPlanProfiles

State Management:
- Planner state now includes generatedPlanOptions and selectedPlanId.

Database Changes:
- Saved trip now includes:
  - planOptionId
  - planType
  - planRank
  - planScore
  - planScores
  - pros
  - cons

API Changes:
- No backend API changes required in local/Firebase direct mode.

UI Changes:
- Comparison cards now display:
  - Cost
  - Hotels
  - Activities
  - Transportation
  - Pros
  - Cons
- Instant plan switching supported.

Testing Strategy:
- Unit: ranking and selection behavior.
- Component: comparison card rendering with complete fields.
- Integration: select plan updates itinerary and save payload.

## 4.4 Roadtrip Mode

Architecture:
- Existing roadtrip domain reused from src/modules/roadtrip/*.
- Dedicated route-level workspace added at /roadtrips.

Components:
- Page: src/pages/RoadtripPlanner.vue.
- Intelligence panel: src/features/roadtrip/RoadtripIntelligencePanel.vue.

Services:
- generateRoadtripEngine
- isRoadtripMode
- route and traffic services

State Management:
- Page-level controls and roadtrip payload state.
- Planner-level selected-option roadtrip cache.

Database Changes:
- Saved trip payload supports roadtripIntelligence object.

API Changes:
- No external API contract changes required.

UI Changes:
- New roadtrip workspace with route controls and reusable panel.
- Planner auto-displays roadtrip dashboard when mode is roadtrip compatible.

Testing Strategy:
- Unit: roadtrip engine estimators and mode detection.
- Integration: planner selection and roadtrip panel rendering.
- E2E: roadtrip route, input, and panel visibility flow.

## 4.5 Smart Recommendations

Architecture:
- New orchestrator module: src/modules/recommendations/engine.js.
- Reuses existing destination and detail services.

Components:
- Dashboard recommendation cards:
  - Destinations
  - Hotels and attractions
  - Activities and rationale

Services:
- getSmartRecommendations
- generateDestinationSuggestions
- getDestinationDetails

State Management:
- Dashboard stores recommendations, loading state, error state.

Database Changes:
- None required for v1.
- Future: store recommendation impressions and clicks for learning loop.

API Changes:
- Future optional endpoint:
  - POST /api/recommendations/query

UI Changes:
- Recommendations are now profile-memory and season aware.

Testing Strategy:
- Unit: query synthesis by memory profile.
- Integration: dashboard loads recommendation sections.
- Contract tests: recommendation payload shape stability.

## 4.6 Trip History System

Architecture:
- History analytics derived from saved trips + profile memory store.
- Metrics calculated in dashboard computed state.

Components:
- Travel History panel in dashboard.
- Metrics cards and style evolution line.

Services:
- getSavedTripsFromDb
- profileMemoryStore.historySummary

State Management:
- Dashboard computed metrics:
  - Total Trips
  - Countries Visited
  - Cities Visited
  - Total Budget Spent
  - Average Trip Cost
  - Favorite Destination Type
  - Travel Style Evolution

Database Changes:
- Existing trip records reused.
- Future enhancement: store normalized destination country/city fields for cleaner analytics.

API Changes:
- Future analytics endpoint:
  - GET /api/travel-history/summary

UI Changes:
- Travel history is now visible in dashboard instead of only list view.

Testing Strategy:
- Unit: metric derivation with fixture trips.
- Integration: dashboard metrics update after new trip save.

## 5. Phase 2 Architecture Plan

## 5.1 AI Travel Copilot

Architecture:
- Global floating component mounted in app shell.
- Context-aware resolver service reads route context and active trip.

Components:
- Floating button + expandable copilot panel.
- Conversation quick actions: eat nearby, tonight plan, budget left, area safety.

Services:
- copilot orchestration service
- location-intent adapter
- budget and itinerary context adapter

State Management:
- New Pinia store: copilotStore with session history and context scope.

Database Changes:
- Optional copilot session logging collection.

API Changes:
- /api/copilot/ask
- /api/copilot/context

UI Changes:
- Persistent assistant in all pages.

Testing Strategy:
- E2E route context carry-over.
- Unit prompt grounding and response guardrails.

## 5.2 Offline Trip Mode

Architecture:
- Cache planner artifacts and map snapshots in IndexedDB.

Components:
- Offline save action on trip details and planner result.
- Offline indicator chip.

Services:
- offline-sync service
- manifest downloader

State Management:
- offlineStore with sync status and cache inventory.

Database Changes:
- IndexedDB stores for itinerary, maps, docs metadata, emergency contacts.

API Changes:
- Optional prefetch endpoints for map/static content.

UI Changes:
- Offline-ready badges and sync state.

Testing Strategy:
- Offline simulation tests.
- Recovery tests when network returns.

## 5.3 Document Vault

Architecture:
- Secure vault layer using encrypted blobs and metadata index.

Components:
- Document upload, list, preview, and emergency pack.

Services:
- vault encryption service
- secure upload service

State Management:
- vaultStore for documents and encryption status.

Database Changes:
- Firestore: user_documents metadata
- Storage bucket: encrypted file objects

API Changes:
- /api/vault/upload
- /api/vault/list
- /api/vault/delete

UI Changes:
- New Documents route in user panel.

Testing Strategy:
- Encryption/decryption unit tests.
- Access control integration tests.

## 5.4 Visa Intelligence

Architecture:
- Destination detail adapter merges visa data provider with destination profile.

Components:
- Visa requirements card in destination details.

Services:
- visa-intelligence service

State Management:
- destination page state includes visa block loading/error/success.

Database Changes:
- Optional cached visa table by nationality and destination.

API Changes:
- /api/visa-intelligence?origin=..&destination=..

UI Changes:
- Visa cost, processing time, required docs, entry requirements.

Testing Strategy:
- Contract tests for visa schema.
- Edge case tests per nationality.

## 5.5 Group Travel Planning

Architecture:
- Collaborative trip workspace with role-based membership.

Components:
- Member invite UI
- Shared itinerary
- Polling and voting
- Comments and tasks

Services:
- collaboration service
- voting service
- task sync service

State Management:
- groupTripStore per active trip collaboration session.

Database Changes:
- Collections:
  - group_trips
  - group_members
  - group_votes
  - group_comments
  - group_tasks

API Changes:
- /api/group-trips/* routes for member and artifact operations.

UI Changes:
- Group tabs inside planner and saved trip views.

Testing Strategy:
- Multi-user integration tests.
- Access role tests.

## 6. Phase 3 Architecture Plan

## 6.1 Local Scam Alerts

Architecture:
- Safety risk aggregator combining public advisories and user reports.

Components:
- Scam alerts panel in destination and live mode.

Services:
- scam-alerts service

State Management:
- safetyStore with risk feed by location.

Database Changes:
- scam_alerts feed cache and report queue.

API Changes:
- /api/safety/scam-alerts

UI Changes:
- Severity badges and safe-area suggestions.

Testing Strategy:
- Severity mapping tests.

## 6.2 Hidden Gems Engine

Architecture:
- Popularity-adjusted recommendation model.

Components:
- Hidden gems section in destination and recommendation cards.

Services:
- hidden-gems service

State Management:
- recommendations store extension.

Database Changes:
- attraction popularity index table.

API Changes:
- /api/recommendations/hidden-gems

UI Changes:
- Less crowded alternatives with local context.

Testing Strategy:
- Ranking quality benchmarks.

## 6.3 Crowd Intelligence

Architecture:
- Existing crowd module extended with temporal forecasting.

Components:
- Best-time and peak-hour cards.

Services:
- crowd prediction service

State Management:
- travel-intelligence state extension.

Database Changes:
- crowd history and forecast snapshots.

API Changes:
- /api/crowd/forecast

UI Changes:
- Wait time and peak-hour indicators.

Testing Strategy:
- Forecast consistency tests.

## 6.4 Safety Intelligence Expansion

Architecture:
- Existing safety intelligence extended with persona-specific scores.

Components:
- Overall safety
- Night safety
- Solo female safety
- Family safety
- Scam risk
- Health risk

Services:
- safety scoring service

State Management:
- safety breakdown in intelligence dashboard state.

Database Changes:
- risk source attribution logs.

API Changes:
- /api/safety/score

UI Changes:
- Multi-axis safety cards.

Testing Strategy:
- Score decomposition unit tests.

## 6.5 Travel Community and Reviews

Architecture:
- Social feed and reviews domain with moderation.

Components:
- Posts
- Reviews
- Comments
- Community feed

Services:
- community service
- moderation service

State Management:
- communityStore and reviewsStore.

Database Changes:
- community_posts
- community_comments
- destination_reviews

API Changes:
- /api/community/*
- /api/reviews/*

UI Changes:
- Community tab and review blocks on destination pages.

Testing Strategy:
- Moderation workflow integration tests.

## 7. User Panel Redesign Architecture

Architecture:
- Route-driven panel shell with persistent left sidebar.
- Dashboard cards as composable widgets.

Components:
- Sidebar routes:
  - Home
  - Trips
  - Planner
  - Roadtrips
  - Destinations
  - Budgets
  - Documents
  - Saved Places
  - Travel History
  - Community
  - Settings
- Widgets:
  - Upcoming Trips
  - Recent Trips
  - Travel Statistics
  - Budget Summary
  - Recommendations
  - Travel Intelligence
  - Weather Snapshot
  - Activity Feed

Services:
- Widget composition service with lazy loading.

State Management:
- dashboardWidgetStore for user-configurable layout.

Database Changes:
- user_dashboard_layout preferences.

API Changes:
- /api/user/dashboard-layout

UI Changes:
- Premium glassmorphism theme tokens with responsive panel.

Testing Strategy:
- Visual regression for widget layouts.

## 8. User Profile Page Architecture

Architecture:
- Dedicated profile route with memory and achievements aggregation.

Components:
- Profile Information
- Travel Personality
- Travel Statistics
- Saved Preferences
- Travel Achievements
- Visited Destinations
- Travel Timeline

Services:
- profile summary service

State Management:
- profileStore

Database Changes:
- user_profile summary and achievements collections.

API Changes:
- /api/profile/summary

UI Changes:
- Profile-centric analytics experience.

Testing Strategy:
- Profile summary integrity tests.

## 9. SaaS Admin Platform Architecture

## 9.1 Admin Core

Architecture:
- Separate admin app shell under /admin routes.

Components:
- Dashboard
- Users
- Trips
- Destinations
- Reviews
- Community
- Reports
- Analytics
- Revenue
- AI Monitoring
- Settings

Services:
- admin analytics service
- admin moderation service
- admin ai-monitoring service

State Management:
- adminStore modules by domain.

Database Changes:
- analytics rollup tables
- moderation logs
- ai usage logs

API Changes:
- /api/admin/* secured endpoints

UI Changes:
- Data-grid + charts + moderation queue patterns.

Testing Strategy:
- RBAC access tests
- admin API contract tests

## 9.2 AI Admin Tools

Architecture:
- Observability pipeline from AI request wrappers.

Components:
- Prompt analytics
- Model usage
- Token usage
- Cost tracking
- Failure tracking
- AI health dashboard

Services:
- ai telemetry collector
- ai health evaluator

State Management:
- aiMonitoringStore

Database Changes:
- ai_request_logs
- ai_cost_daily
- ai_error_events

API Changes:
- /api/admin/ai/usage
- /api/admin/ai/errors

UI Changes:
- Live charts and failure drill-down.

Testing Strategy:
- Aggregation accuracy tests.

## 10. UX System Requirements and Delivery Guardrails

UI direction:
- Premium and intentional visual language.
- Glassmorphism with legible contrast.
- Responsive desktop and mobile support.
- Smooth but meaningful animations.
- Skeleton states for all slow data blocks.

Performance guardrails:
- Keep route-level code splitting.
- Cache expensive recommendation and intelligence results.
- Avoid blocking first paint with optional modules.

Reliability guardrails:
- Graceful fallback for every external provider.
- Strict loading/error/empty/success lifecycle rendering.
- No hard dependency on single third-party API.

## 11. Delivery Plan

Phase 1 hardening checklist:
- Add tests for new profileMemory store.
- Add tests for recommendation engine.
- Add planner integration tests for 3-option flow and selection.
- Add roadtrip route smoke test.
- Validate quality gates: build, tests, coverage, e2e smoke.

Phase 2 start checklist:
- Ship global copilot skeleton and context store.
- Add offline cache contract and IndexedDB adapters.
- Add encrypted document vault core path.

Phase 3 start checklist:
- Establish safety and community data ingestion contracts.
- Roll out hidden gems and crowd prediction with A/B instrumentation.

This blueprint is designed to keep WanderAI shippable while evolving feature depth toward a full Travel Operating System.

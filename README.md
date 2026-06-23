# AI Travel App - Detailed Page Overview README

Last updated: 2026-06-23

This README is intentionally detailed and written for day-to-day development.
Main focus: every page overview in depth, including what is shown on the page and where it appears in the layout.

---

## 1. Project Snapshot

AI Travel App is a Vue 3 + Vite based Travel OS style application.
It combines:

- AI trip planning
- destination intelligence
- roadtrip planning
- user profile memory
- community and group collaboration
- document vault and offline packs
- admin operations panel

Core stack:

- Vue 3 + Vite
- Vue Router
- Pinia
- Firebase (with local fallback in services)
- Vitest + Playwright + ESLint

---

## 2. App Shell (Global Layout)

Global shell file: [src/App.vue](src/App.vue)

Every routed page is rendered inside this shell.

### 2.1 Top Area (Sticky Navbar)

Location in UI: very top, fixed/sticky.

Contains:

- Brand logo (left)
- Desktop nav links (center)
- Geo indicator (right cluster)
- Offline sync indicator (right cluster)
- Profile avatar menu toggle (right cluster)

Desktop nav links include:

- Home
- Destinations
- Planner
- Roadtrips
- Group Trips (auth)
- Community (auth)
- Dashboard (auth)
- Profile (auth)
- Travel OS (auth)
- Admin (auth + admin)
- Documents (auth)
- Saved Trips

### 2.2 Profile Dropdown Menu

Location in UI: top-right avatar click.

Contains quick links to:

- Profile Center
- Open Dashboard
- Travel OS Panel
- Admin Console (admin only)
- My Saved Trips
- Document Vault
- Group Trips
- Community Hub
- Roadtrip Mode
- Help Center
- Login/Signup (guest)
- Logout (auth)

### 2.3 Main Content View

Location in UI: center page body.

Contains:

- RouterView content
- Suspense fallback skeleton while async page components load

### 2.4 Footer

Location in UI: bottom area above mobile nav.

Contains:

- Brand block and app description
- Application links
- Support links (Help Center)
- Conditional auth/admin links

### 2.5 Global Floating Widget

Location in UI: floating overlay.

Contains:

- `TravelCopilotWidget`

### 2.6 Mobile Bottom Navigation

Location in UI: fixed bottom on mobile.

Contains:

- Home
- Explore
- Planner
- Roadtrip
- Saved
- Community
- Profile (routes to `/profile` when authenticated, `/login` otherwise)

---

## 3. Routing and Access Control

Router file: [src/router/index.js](src/router/index.js)

### 3.1 Public Routes

- `/` -> Home
- `/destination` -> Destination directory
- `/destination/:id` -> Destination details
- `/planner` -> Planner
- `/roadtrips` -> Roadtrip planner
- `/help` -> Help center
- Catch-all -> NotFound

### 3.2 Authenticated Routes (`requiresAuth`)

- `/dashboard`
- `/community`
- `/saved-trips`
- `/documents`
- `/group-trips`
- `/profile`
- `/travel-os`

### 3.3 Admin Route (`requiresAuth + requiresAdmin`)

- `/admin`

Admin check rule in router:

- user email contains `admin`
- or ends with `@wanderai.local`

### 3.4 Redirect Routes

- `/group-travel` -> `/group-trips`
- `/guides` -> `/help?topic=overview`
- `/security` -> `/help?topic=security`
- `/faq` -> `/help?topic=overview`
- `/api-keys` -> `/help?topic=api`

---

## 4. Page-by-Page Detailed Overview

Each subsection explains:

- purpose
- layout order (top to bottom)
- important actions
- data dependencies
- state handling
- route/query assumptions

---

### 4.1 Home Page

File: [src/pages/Home.vue](src/pages/Home.vue)
Route: `/`

Purpose:

- Main landing command center for prompt-led trip discovery and planning.

Layout flow (top to bottom):

1. Hero section with headline and planning CTA
2. Prompt/search input area with quick chips
3. Trending destination section
4. Popular destination cards section

What is where:

- Prompt and CTA controls are at the top hero area.
- Live destination cards are in middle content blocks.
- Individual destination card actions sit inside each card.

Key actions:

- Start planning from prompt
- Apply quick prompt chips
- Open destination details
- Open planner with selected destination context

Dependencies:

- location service
- currency formatting
- Gemini-based suggestion/photo helpers
- trending engine

State handling:

- loading skeletons for trending/popular lists
- explicit error cards/messages
- empty list fallback text

Route/query behavior:

- pushes route to planner or destination based on selected action

---

### 4.2 Destination Directory Page

File: [src/pages/Destination.vue](src/pages/Destination.vue)
Route: `/destination`

Purpose:

- Destination discovery and filtering hub.

Layout flow:

1. Page header and intro
2. Maps analyzer input card
3. Filter/search controls
4. Destination listing grid

What is where:

- Maps URL/coordinates analyzer is near top.
- Filters are above list area.
- Destination cards are main body.

Key actions:

- Analyze Google Maps input and jump to details
- Search/filter destinations
- Reset filters
- Open selected destination details

Dependencies:

- Gemini destination suggestion service
- map input parser
- currency formatter

State handling:

- loading section for list
- error message/card for fetch/analyze failures
- empty state when no matching destinations

Route/query behavior:

- reads `route.query.search` to initialize search text

---

### 4.3 Destination Details Page

File: [src/pages/DestinationDetails.vue](src/pages/DestinationDetails.vue)
Route: `/destination/:id`

Purpose:

- Full destination intelligence workspace (travel signals + planning context).

Layout flow:

1. Top gate states (loading/error)
2. Destination hero banner
3. Route origin analyzer strip
4. Main content with tabbed sections
5. Right-side utility/sidebar blocks

Tabs/sections include:

- Overview
- Attractions
- Hotels
- Food
- Transport
- Weather

What is where:

- Core destination summary is top hero.
- Tab switcher is above tab content body.
- Community/scam/gems/visa/live intelligence appear in tab content blocks.
- Route + budget helpers appear in side blocks.

Key actions:

- Analyze route from origin
- Switch tabs
- Refresh live intelligence
- Submit destination review
- Open map links
- Jump to planner

Dependencies:

- destination detail generation
- route/traffic intelligence
- visa intelligence module
- scam alerts + hidden gems modules
- community store

State handling:

- multiple nested loading/error/empty states per panel
- top-level fallback when destination fails or missing

Route/query behavior:

- uses `route.params.id`
- can also handle map-derived query context

---

### 4.4 Planner Page

File: [src/pages/Planner.vue](src/pages/Planner.vue)
Route: `/planner`

Purpose:

- Primary AI planner workspace with prompt conversation, plan comparison, save/offline/group actions.

Layout flow:

1. Planner header
2. Two-column body
3. Left column:
   - prompt input card
   - offline/personalization strips
   - memory nudge card
   - recent trips card
   - conversation card
4. Right column:
   - loading/empty/result container
   - result card with selected plan details
   - budget/itinerary/snapshot/roadtrip panels
5. Preferences modal overlay

What is where:

- Prompt and generation button are at top-left card.
- Plan result action buttons are in result header right area.
- Day-wise itinerary is lower in result card.
- Preference form is modal, not inline.

Key actions:

- Generate trip plan
- Open/apply/reset preferences
- Save trip
- Save offline draft
- Save itinerary/maps/hotels/emergency packs
- Create group trip
- Select plan option
- Refine plan via suggestion prompts

Dependencies:

- auth, profileMemory, offline, plannerSession, groupTravel stores
- AI itinerary + budget generation
- firebase save/load
- travel weather/places snapshot services
- planner-options and roadtrip modules

State handling:

- global generation loading
- no-results empty block
- planner error message
- save status and transient messages
- snapshot loading/error behavior

Route/query behavior:

- supports incoming query parameters like destination/origin/prompt
- save/group action redirects to login if unauthenticated

---

### 4.5 Roadtrip Planner Page

File: [src/pages/RoadtripPlanner.vue](src/pages/RoadtripPlanner.vue)
Route: `/roadtrips`

Purpose:

- Dedicated roadtrip intelligence generation workspace.

Layout flow:

1. Header with offline status strip
2. Main grid
3. Input control card
4. Recent trip reuse card
5. Roadtrip intelligence output panel

What is where:

- Origin/destination/travel-mode/day/traveler inputs are in first main card.
- Offline save controls are in the same action row.
- Intelligence output is full-width below grid.

Key actions:

- Generate roadtrip intelligence
- Load controls from recent trips
- Save offline draft
- Save maps/hotels/emergency offline packs

Dependencies:

- auth + offline + plannerSession stores
- saved trip retrieval
- roadtrip module generation

State handling:

- generation loading state
- planner error text
- transient offline draft message

Route/query behavior:

- no query-driven initialization logic currently

---

### 4.6 Login Page

File: [src/pages/Login.vue](src/pages/Login.vue)
Route: `/login` (guest-only)

Purpose:

- Login and signup interface with redirect support.

Layout flow:

1. Auth container split layout
2. Left info/art panel
3. Right form panel
4. Footer mode toggle controls

What is where:

- Credentials form appears right side.
- mode switch (login/signup) appears below form.

Key actions:

- Login with email/password
- Signup with name/email/password + confirm validation
- Switch modes

Dependencies:

- auth store
- route/router for redirect target

State handling:

- form validation errors
- auth errors
- loading/disabled submit button state

Route/query behavior:

- after success, navigates to query redirect path or dashboard

---

### 4.7 Dashboard Page

File: [src/pages/Dashboard.vue](src/pages/Dashboard.vue)
Route: `/dashboard` (auth)

Purpose:

- Authenticated traveler cockpit with stats, recommendations, live intelligence, and community pulse.

Layout flow:

1. Welcome header
2. Top-level loading/error wrapper
3. Stats cards grid
4. Quick actions + recent trips
5. Profile memory and history cards
6. Recommendations block
7. Phase-3 live signals block
8. Live geo snapshot block
9. Travel intelligence widgets block
10. Community pulse/reviews section

What is where:

- aggregate KPIs are high on page.
- intelligence and community sections are lower in page flow.

Key actions:

- open planner/documents/community/group flows
- retry specific failed blocks
- navigate to detailed pages from action buttons

Dependencies:

- auth/profileMemory/community stores
- saved trips
- weather/places/location services
- travel-intelligence module
- recommendations + scam + hidden gems modules

State handling:

- layered state handling by section (not only single global flag)
- loading/error/empty/success variations for several panels

Route/query behavior:

- authenticated route
- redirects to login if session unavailable in page init

---

### 4.8 Community Page

File: [src/pages/Community.vue](src/pages/Community.vue)
Route: `/community` (auth)

Purpose:

- Community hub for posts, comments, reviews, and destination-level sentiment.

Layout flow:

1. Hero with destination context controls
2. UI status banner/message
3. Pulse cards area
4. Three-column main area:
   - composer
   - posts feed
   - reviews feed

What is where:

- destination refresh controls at top.
- content creation form in first column.
- feed and review streams in adjacent columns.

Key actions:

- create post
- comment/like posts
- submit review
- helpful vote on reviews
- reload destination community signals

Dependencies:

- auth + community store
- scam/hidden gems services

State handling:

- page loading
- insights loading
- page error and ui feedback message
- empty feed/review states

Route/query behavior:

- unauthenticated users redirected to `/login?redirect=/community`

---

### 4.9 Saved Trips Page

File: [src/pages/SavedTrips.vue](src/pages/SavedTrips.vue)
Route: `/saved-trips` (auth)

Purpose:

- Persisted trip archive with modal review and deletion.

Layout flow:

1. Header section
2. Loading/error/empty gates
3. Trip cards grid
4. Full itinerary modal overlay on selection

What is where:

- list cards in main body
- detailed day-wise itinerary appears only in modal overlay

Key actions:

- retry fetching trips
- open trip details modal
- close modal
- delete trip with confirmation

Dependencies:

- auth store
- firebase trip get/delete
- destination image resolver
- optional roadtrip panel in modal

State handling:

- top-level loading/error/empty states
- per-item deleting guard

Route/query behavior:

- auth protected by router meta

---

### 4.10 Documents Page

File: [src/pages/Documents.vue](src/pages/Documents.vue)
Route: `/documents` (auth)

Purpose:

- Local metadata-based travel document vault with offline bundle support.

Layout flow:

1. Page header
2. Stats grid
3. Upload/actions card
4. Vault list card

What is where:

- vault stats (count, size, emergency, encryption) near top.
- upload/category and utility actions in middle card.
- document list/removal controls in lower card.

Key actions:

- upload files
- assign category
- toggle emergency pack per doc
- remove doc
- clear all docs
- save offline document pack
- rotate vault key metadata

Dependencies:

- auth store
- vault store
- offline store

State handling:

- transient message banner for upload/key/pack actions
- empty vault message when no docs

Route/query behavior:

- redirects to login with redirect query when unauthenticated

---

### 4.11 Group Travel Page

File: [src/pages/GroupTravel.vue](src/pages/GroupTravel.vue)
Route: `/group-trips` (auth)

Purpose:

- Group collaboration workspace for shared planning and execution.

Layout flow:

1. Header and planner-context quick actions
2. Join by code card
3. Split workspace:
   - left: group list
   - right: active group details
4. Active group panel sections:
   - snapshot
   - shared budget and itinerary
   - comments and tasks
   - members and invites
   - polls and voting
   - activity timeline

What is where:

- left sidebar is group navigation.
- collaborative editing cards are centered in main area.
- timeline and member controls lower in right panel.

Key actions:

- create group from planner context
- join by invite code
- invite members by email
- create poll and vote
- update shared budget
- add/update itinerary items
- post comments
- add/toggle tasks

Dependencies:

- auth store
- groupTravel store
- plannerSession store

State handling:

- ui message alerts
- empty group list and no-active-group placeholders
- action disable while store loading

Route/query behavior:

- reads/watches `query.group` to auto-open selected group
- redirects unauthenticated users to login with redirect

---

### 4.12 Profile Page

File: [src/pages/Profile.vue](src/pages/Profile.vue)
Route: `/profile` (auth)

Purpose:

- Personalized profile center based on travel memory and saved trips.

Layout flow:

1. Header
2. Loading/error gates
3. Profile info + personality cards
4. Stats cards
5. Preferences + achievements cards
6. Visited destinations chip section
7. Travel timeline section

What is where:

- account and personality are top major blocks.
- preferences and achievements are middle.
- timeline is lower section.

Key actions:

- primarily read-only insights (no major editing controls)

Dependencies:

- auth store
- profileMemory store
- saved trips for aggregation

State handling:

- loading state
- load error state
- empty fallback for destinations/timeline

Route/query behavior:

- redirects unauthenticated users to `/login?redirect=/profile`

---

### 4.13 Travel OS Page

File: [src/pages/TravelOS.vue](src/pages/TravelOS.vue)
Route: `/travel-os` (auth)

Purpose:

- Unified operational panel with compact widget-style travel controls.

Layout flow:

1. Header
2. Error/loading wrapper
3. Main layout:
   - left sidebar navigation
   - right widgets grid

Widget groups include:

- Upcoming Trips
- Recent Trips
- Travel Statistics
- Offline Readiness
- Budget Summary
- Recommendations
- Travel Intelligence highlights
- Weather Snapshot
- Activity Feed

What is where:

- sidebar quick nav left side.
- all operational mini cards in right 2-column widget grid.

Key actions:

- jump to major modules from sidebar
- open admin via sidebar (with non-admin fallback to dashboard)

Dependencies:

- auth/profileMemory/community/offline stores
- saved trips
- weather + location services
- recommendation engine

State handling:

- top-level loading and error blocks
- per-widget empty text fallbacks

Route/query behavior:

- redirects unauthenticated users to `/login?redirect=/travel-os`

---

### 4.14 Admin Page

File: [src/pages/Admin.vue](src/pages/Admin.vue)
Route: `/admin` (auth + admin)

Purpose:

- SaaS-style operations panel for management and monitoring.

Layout flow:

1. Header
2. Loading or restricted-access gate
3. Tabs row
4. Active tab content panel

Tabs currently:

- Dashboard metrics
- Users
- Trips
- Destinations
- Community moderation
- Analytics bars
- AI Monitoring
- Settings placeholder

What is where:

- tab switch buttons top of workspace.
- each tab renders its own table/cards in central panel.

Key actions:

- suspend/ban/activate/delete users
- feature/unfeature/delete destinations
- moderation approve/remove placeholders
- tab navigation

Dependencies:

- auth store
- community store
- trips data source

State handling:

- loading gate
- restricted gate for non-admin
- transient admin action message
- empty states for sections with no data

Route/query behavior:

- admin route guard in router + in-page auth redirect safety

---

### 4.15 Help Page

File: [src/pages/Help.vue](src/pages/Help.vue)
Route: `/help`

Purpose:

- Consolidated support center for overview, security, and API guidance.

Layout flow:

1. Header
2. Action button strip
3. Support cards grid

What is where:

- topic actions near top.
- support article cards in main body grid.

Key actions:

- navigate to planner
- navigate to destination directory
- force API topic query

Dependencies:

- route/router only

State handling:

- no explicit loading/error blocks

Route/query behavior:

- query `topic` controls ordering/priority of help sections

---

### 4.16 NotFound Page

File: [src/pages/NotFound.vue](src/pages/NotFound.vue)
Route: catch-all

Purpose:

- 404 fallback page for unknown paths.

Layout flow:

1. Centered card with icon/title/message
2. Return-home button

Key actions:

- route back to home page

Dependencies:

- router link only

State handling:

- static page, no dynamic states

---

## 5. Legacy Pages Present in Codebase

These files exist under `src/pages` but route flow now redirects to Help topics:

- [src/pages/Guides.vue](src/pages/Guides.vue)
- [src/pages/Security.vue](src/pages/Security.vue)
- [src/pages/Faq.vue](src/pages/Faq.vue)
- [src/pages/ApiKeys.vue](src/pages/ApiKeys.vue)

Current behavior:

- users are routed to `/help` with topic query mapping instead of using these pages directly.

---

## 6. Stores and Service Mapping (Quick Reference)

Primary stores:

- [src/stores/auth.js](src/stores/auth.js): auth session and identity
- [src/stores/profileMemory.js](src/stores/profileMemory.js): personalization memory and scores
- [src/stores/offline.js](src/stores/offline.js): offline drafts + typed offline packs
- [src/stores/community.js](src/stores/community.js): posts/reviews/pulse
- [src/stores/groupTravel.js](src/stores/groupTravel.js): collaborative trip state
- [src/stores/vault.js](src/stores/vault.js): document vault metadata + encryption metadata
- [src/stores/plannerSession.js](src/stores/plannerSession.js): active planner context

Notable modules/services:

- recommendations engine: [src/modules/recommendations/engine.js](src/modules/recommendations/engine.js)
- roadtrip intelligence: [src/modules/roadtrip](src/modules/roadtrip)
- travel intelligence: [src/modules/travel-intelligence](src/modules/travel-intelligence)
- visa intelligence: [src/modules/visa-intelligence/service.js](src/modules/visa-intelligence/service.js)
- firebase integration: [src/services/firebase.js](src/services/firebase.js)

---

## 7. Validation Status

Latest run snapshot:

- `npm run lint` -> PASS
- `npm run test` -> PASS (23 files, 99 tests)
- `npm run build` -> PASS

---

## 8. Developer Notes

If you add a new page, keep this README updated using the same pattern:

1. route and access
2. top-to-bottom layout map
3. key actions
4. dependencies
5. state handling
6. query assumptions

This keeps onboarding and debugging much faster for all contributors.


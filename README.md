# WanderAI - API Integration & Data Flow Overview

This document provides a brief overview of how APIs are integrated, used, and configured in the WanderAI project, answering common developer questions.

---

## 1. Where are the Gemini API & Google Maps API called?

### **Gemini API Calls**
The Gemini API model (`gemini-2.5-flash`) is used across the AI services located in the [src/services/ai](file:///d:/ai-travel-plan/src/services/ai) directory:
* **Trip Itinerary Generation:** Called in [itinerary.service.ts](file:///d:/ai-travel-plan/src/services/ai/itinerary.service.ts) inside `generateTravelPlan`.
* **Budget Estimations:** Called in [budget.service.ts](file:///d:/ai-travel-plan/src/services/ai/budget.service.ts) inside `generateBudgetEstimate`.
* **WhatsApp Chat Intent Parsing:** Called in [intent.service.ts](file:///d:/ai-travel-plan/src/services/ai/intent.service.ts) inside `extractTripIntent`.
* **Route Intelligence & Logistics:** Called in [route.service.ts](file:///d:/ai-travel-plan/src/services/maps/route.service.ts) inside `getRouteIntelligence` to estimate travel modes, prices, and charging stops.

### **Google Maps API Calls**
Google Maps APIs are called within the maps, travel, and photo services:
* **Geocoding Places:** Called in [geocoding.service.ts](file:///d:/ai-travel-plan/src/services/maps/geocoding.service.ts) inside `geocodePlace` using the Google Geocoding API (`https://maps.googleapis.com/maps/api/geocode/json`).
* **Route Distances & Durations:** Called in [route.service.ts](file:///d:/ai-travel-plan/src/services/maps/route.service.ts) inside `getRouteDistance` using the Google Distance Matrix API (`https://maps.googleapis.com/maps/api/distancematrix/json`).
* **Nearby Accommodations & Diners:** Called in [places.service.ts](file:///d:/ai-travel-plan/src/services/travel/places.service.ts) inside `fetchNearbyPlaces` using the Google Places API (New) (`https://places.googleapis.com/v1/places:searchNearby`).
* **Place Photo Media:** Called in [provider.service.ts](file:///d:/ai-travel-plan/src/services/photo/provider.service.ts) inside `fetchGooglePlacesPhoto` using the Google Places API (New) Text Search (`https://places.googleapis.com/v1/places:searchText`) to query and resolve photo media endpoints.

---

## 2. How are we using the APIs?

* **Gemini API:** We construct structured text prompts containing user preferences (travel style, budget limits, duration, travelers) and real-time facts (like fetched weather, hotels, and restaurants). We configure the request with `generationConfig: { responseMimeType: "application/json" }` to force the Gemini model to return a single, valid JSON object matching our client-side schemas (e.g., `travelPlanSchema`).
* **Google Maps APIs:** We execute standard HTTP `GET` and `POST` requests wrapped in a retry utility `requestWithRetry` to query geographic details based on latitude/longitude or query addresses.
* **TomTom Traffic Flow API:** If configured in [route.service.ts](file:///d:/ai-travel-plan/src/services/maps/route.service.ts) via `getTrafficInsights`, it queries the TomTom flow segments API to calculate real-time road congestion levels.
* **OpenWeather API:** If configured in [weather.service.ts](file:///d:/ai-travel-plan/src/services/travel/weather.service.ts) via `fetchWeather`, it queries current conditions and forecast blocks.

---

## 3. How are we fetching images, locations, and chat responses?

### **Locations**
* User search strings are passed to `geocodePlace` in [geocoding.service.ts](file:///d:/ai-travel-plan/src/services/maps/geocoding.service.ts).
* If `VITE_GOOGLE_MAPS_API_KEY` is configured, it calls Google Geocoding.
* **Fallback:** If the Google API key is missing or fails, it falls back to the keyless **OpenStreetMap (OSM) Nominatim** search.

### **Images**
* Handled in [provider.service.ts](file:///d:/ai-travel-plan/src/services/photo/provider.service.ts) inside `getLiveDestinationPhoto`.
* If a Google Maps API Key is active, it makes a POST request to Google Places API (New) searching for the place name, extracts the first photo token, and requests the photo media URL.
* **Fallback:** If the Google key is missing or fails, it calls `destinationImageUrl` in [destinationImage.js](file:///d:/ai-travel-plan/src/utils/destinationImage.js) to generate a deterministic, highly-reliable placeholder image using a hash of the keywords via **Picsum Photos** (`https://picsum.photos/seed/...`).

### **Chat Responses & Itinerary (Hotels, Restaurants, Weather)**
* Handled in [itinerary.service.ts](file:///d:/ai-travel-plan/src/services/ai/itinerary.service.ts) inside `generateTravelPlan`.
1. The search query is first geocoded to acquire coordinates (`lat` and `lng`).
2. The coordinates are used to fetch real weather conditions from OpenWeather (falling back to Open-Meteo) and nearby places from Google Places (falling back to OpenStreetMap Overpass API).
3. The extracted details (weather stats, first 3 hotels, first 3 restaurants) are injected into the Gemini prompt as factual context.
4. Gemini outputs the structured itinerary showing morning, afternoon, and evening slots referencing those hotels and dining spots.
5. **Fallback:** If no Gemini API Key is present, the **Local Simulation Engine** constructs a mock travel plan based on hardcoded structures (`MOCK_DESTINATIONS` / `testing/featureDataset`) or generates simulated schedules.

---

## 4. Why is the project not showing real data?

Looking at the current [.env](file:///d:/ai-travel-plan/.env) configuration:

1. **Invalid API Keys:** The API keys configured for the Gemini API (`VITE_GEMINI_API_KEY`) and Google Maps API (`VITE_GOOGLE_MAPS_API_KEY`) are dummy/placeholder values (e.g., keys containing dummy characters or not matching valid Google credentials formats). Therefore, any live API requests sent to Google's servers return errors (400 Bad Request, 401 Unauthorized, or 403 Forbidden).
2. **Blocked Simulation Fallback:** The environment file has:
   ```env
   VITE_REAL_DATA_ONLY=true
   ```
   When `VITE_REAL_DATA_ONLY` is set to `true`, the application's fallback simulation engines (which generate mock itineraries, hotels, and restaurants during network or API key failures) are **explicitly bypassed**. The service methods return empty lists, `null` objects, or throw errors instead of returning simulated data.

### **How to Fix it:**
To show real data:
1. Replace `VITE_GEMINI_API_KEY` and `VITE_GOOGLE_MAPS_API_KEY` with actual, valid API keys in your [.env](file:///d:/ai-travel-plan/.env) file.
2. If you want to use the application without real keys, set `VITE_REAL_DATA_ONLY=false` in [.env](file:///d:/ai-travel-plan/.env) to re-enable local simulated/mock itineraries and details.

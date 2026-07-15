import { Router } from "express";

const router = Router();
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "";
const CACHE_ENABLED = String(process.env.LIVE_PROXY_CACHE_ENABLED || "true").toLowerCase() !== "false";
const CACHE_MAX_ENTRIES = Number(process.env.LIVE_PROXY_CACHE_MAX_ENTRIES || 800);
const CACHE_TTL = {
  geocode: Number(process.env.LIVE_PROXY_CACHE_TTL_GEOCODE_MS || 6 * 60 * 60 * 1000),
  route: Number(process.env.LIVE_PROXY_CACHE_TTL_ROUTE_MS || 2 * 60 * 60 * 1000),
  places: Number(process.env.LIVE_PROXY_CACHE_TTL_PLACES_MS || 20 * 60 * 1000),
  weather: Number(process.env.LIVE_PROXY_CACHE_TTL_WEATHER_MS || 10 * 60 * 1000)
};

const GOOGLE_PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby";
const liveCache = new Map();
const inflightRequests = new Map();
const cacheMetrics = {
  geocode: { hit: 0, miss: 0, dedupe: 0 },
  route: { hit: 0, miss: 0, dedupe: 0 },
  places: { hit: 0, miss: 0, dedupe: 0 },
  weather: { hit: 0, miss: 0, dedupe: 0 }
};

function json(res, status, body) {
  return res.status(status).json(body);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCoord(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(4) : "nan";
}

function makeCacheKey(prefix, parts) {
  return `${prefix}:${parts.join("|")}`;
}

function pruneCacheIfNeeded() {
  if (!CACHE_ENABLED || liveCache.size <= CACHE_MAX_ENTRIES) {
    return;
  }
  const deleteCount = Math.max(1, Math.floor(CACHE_MAX_ENTRIES * 0.15));
  const entries = Array.from(liveCache.entries()).sort((a, b) => a[1].savedAt - b[1].savedAt);
  for (let index = 0; index < deleteCount && index < entries.length; index += 1) {
    liveCache.delete(entries[index][0]);
  }
}

function readCachedValue(cacheKey, ttlMs) {
  if (!CACHE_ENABLED) {
    return { hit: false, value: undefined };
  }
  const entry = liveCache.get(cacheKey);
  if (!entry) {
    return { hit: false, value: undefined };
  }
  if (Date.now() - entry.savedAt > ttlMs) {
    liveCache.delete(cacheKey);
    return { hit: false, value: undefined };
  }
  return { hit: true, value: entry.value };
}

function recordCacheMetric(metricKey, type) {
  if (!cacheMetrics[metricKey] || typeof cacheMetrics[metricKey][type] !== "number") {
    return;
  }
  cacheMetrics[metricKey][type] += 1;
}

async function withCachedValue(cacheKey, ttlMs, resolver, metricKey) {
  const cached = readCachedValue(cacheKey, ttlMs);
  if (cached.hit) {
    recordCacheMetric(metricKey, "hit");
    return { value: cached.value, cache: "hit" };
  }

  if (inflightRequests.has(cacheKey)) {
    const value = await inflightRequests.get(cacheKey);
    recordCacheMetric(metricKey, "dedupe");
    return { value, cache: "dedupe" };
  }

  const promise = (async () => {
    const value = await resolver();
    if (CACHE_ENABLED) {
      liveCache.set(cacheKey, { value, savedAt: Date.now() });
      pruneCacheIfNeeded();
    }
    return value;
  })();

  inflightRequests.set(cacheKey, promise);
  try {
    const value = await promise;
    recordCacheMetric(metricKey, "miss");
    return { value, cache: "miss" };
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Upstream error ${response.status}`);
  }
  return response.json();
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const radius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radius * c;
}

async function geocodePlace(query) {
  const text = String(query || "").trim();
  if (!text) {
    return null;
  }

  const cacheKey = makeCacheKey("geocode", [normalizeText(text)]);
  const cached = readCachedValue(cacheKey, CACHE_TTL.geocode);
  if (cached.hit) {
    return cached.value;
  }

  if (GOOGLE_MAPS_API_KEY) {
    try {
      const data = await fetchJson(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_API_KEY}`);
      const result = data?.results?.[0];
      if (result?.geometry?.location) {
        const payload = {
          lat: Number(result.geometry.location.lat),
          lng: Number(result.geometry.location.lng),
          formattedName: String(result.formatted_address || text)
        };
        if (CACHE_ENABLED) {
          liveCache.set(cacheKey, { value: payload, savedAt: Date.now() });
          pruneCacheIfNeeded();
        }
        return payload;
      }
    } catch {
      // Fall through to OSM.
    }
  }

  try {
    const data = await fetchJson(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`, {
      headers: { "User-Agent": "WanderAI/1.0" }
    });
    const result = Array.isArray(data) ? data[0] : null;
    if (result?.lat && result?.lon) {
      const payload = {
        lat: Number(result.lat),
        lng: Number(result.lon),
        formattedName: String(result.display_name || text)
      };
      if (CACHE_ENABLED) {
        liveCache.set(cacheKey, { value: payload, savedAt: Date.now() });
        pruneCacheIfNeeded();
      }
      return payload;
    }
  } catch {
    return null;
  }

  if (CACHE_ENABLED) {
    liveCache.set(cacheKey, { value: null, savedAt: Date.now() });
    pruneCacheIfNeeded();
  }

  return null;
}

function googleIncludedTypes(type) {
  const map = {
    lodging: ["hotel", "lodging"],
    restaurant: ["restaurant", "cafe"],
    attraction: ["tourist_attraction", "museum", "park"],
    fuel: ["gas_station"],
    ev: ["electric_vehicle_charging_station"],
    hospital: ["hospital", "medical_clinic"]
  };
  return map[type] || map.restaurant;
}

function overpassFilters(type) {
  const map = {
    lodging: ['node["tourism"="hotel"]', 'node["tourism"="guest_house"]', 'node["tourism"="hostel"]'],
    restaurant: ['node["amenity"="restaurant"]', 'node["amenity"="cafe"]'],
    attraction: ['node["tourism"="attraction"]', 'node["historic"]', 'node["leisure"="park"]'],
    fuel: ['node["amenity"="fuel"]'],
    ev: ['node["amenity"="charging_station"]'],
    hospital: ['node["amenity"="hospital"]', 'node["amenity"="clinic"]']
  };
  return map[type] || map.restaurant;
}

function inferHotelTierFromRating(rating) {
  if (rating >= 4.7) return "luxury";
  if (rating >= 4.4) return "premium";
  if (rating >= 4.0) return "mid-range";
  return "budget";
}

function normalizePriceLevel(priceLevel) {
  const raw = String(priceLevel || "").toUpperCase();
  if (!raw) return "PRICE_LEVEL_MODERATE";
  if (raw.includes("FREE")) return "PRICE_LEVEL_FREE";
  if (raw.includes("INEXPENSIVE") || raw.endsWith("LOW")) return "PRICE_LEVEL_INEXPENSIVE";
  if (raw.includes("MODERATE") || raw.endsWith("MEDIUM")) return "PRICE_LEVEL_MODERATE";
  if (raw.includes("EXPENSIVE") && !raw.includes("VERY")) return "PRICE_LEVEL_EXPENSIVE";
  if (raw.includes("VERY_EXPENSIVE") || raw.endsWith("HIGH")) return "PRICE_LEVEL_VERY_EXPENSIVE";
  return "PRICE_LEVEL_MODERATE";
}

function estimateHotelNightlyInr(rating, tier, priceLevel) {
  const level = normalizePriceLevel(priceLevel);
  const tierBase = { hostel: 900, budget: 1800, "mid-range": 4200, premium: 7500, luxury: 14000 };
  const levelMultiplier = {
    PRICE_LEVEL_FREE: 0.75,
    PRICE_LEVEL_INEXPENSIVE: 0.9,
    PRICE_LEVEL_MODERATE: 1,
    PRICE_LEVEL_EXPENSIVE: 1.35,
    PRICE_LEVEL_VERY_EXPENSIVE: 1.8
  };
  const ratingFactor = Math.max(0.85, Math.min(1.35, 0.75 + Number(rating || 4.1) / 8));
  const base = tierBase[tier || "mid-range"] || tierBase["mid-range"];
  return Math.round(base * (levelMultiplier[level] || 1) * ratingFactor);
}

function estimateRestaurantMealInr(rating, priceLevel) {
  const level = normalizePriceLevel(priceLevel);
  const base = {
    PRICE_LEVEL_FREE: 120,
    PRICE_LEVEL_INEXPENSIVE: 300,
    PRICE_LEVEL_MODERATE: 700,
    PRICE_LEVEL_EXPENSIVE: 1400,
    PRICE_LEVEL_VERY_EXPENSIVE: 2600
  };
  const ratingFactor = Math.max(0.9, Math.min(1.25, 0.8 + Number(rating || 4.0) / 10));
  return Math.round((base[level] || 700) * ratingFactor);
}

async function fetchNearbyPlaces(lat, lng, type) {
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const data = await fetchJson(GOOGLE_PLACES_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.nationalPhoneNumber,places.editorialSummary,places.priceLevel,places.googleMapsUri,places.websiteUri,places.regularOpeningHours,places.photos"
        },
        body: JSON.stringify({
          includedTypes: googleIncludedTypes(type),
          maxResultCount: 10,
          rankPreference: "POPULARITY",
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: 8000
            }
          }
        })
      });

      const places = Array.isArray(data?.places) ? data.places : [];
      if (places.length) {
        return places.slice(0, 10).map((place) => {
          const pLat = Number(place.location?.latitude);
          const pLng = Number(place.location?.longitude);
          const rating = Number(place.rating || 0);
          const tier = type === "lodging" ? inferHotelTierFromRating(rating || 4.1) : undefined;
          return {
            name: place.displayName?.text || "Unknown place",
            rating: rating || 4.1,
            reviews: Number(place.userRatingCount || 0),
            distance: Number.isFinite(pLat) && Number.isFinite(pLng) ? `${haversineDistanceKm(lat, lng, pLat, pLng).toFixed(1)} km` : "N/A",
            lat: Number.isFinite(pLat) ? pLat : undefined,
            lng: Number.isFinite(pLng) ? pLng : undefined,
            address: place.formattedAddress || place.shortFormattedAddress || "Address unavailable",
            website: place.websiteUri || undefined,
            mapsUrl: place.googleMapsUri || undefined,
            openingHours: Array.isArray(place?.regularOpeningHours?.weekdayDescriptions) ? place.regularOpeningHours.weekdayDescriptions : undefined,
            openNow: typeof place?.regularOpeningHours?.openNow === "boolean" ? place.regularOpeningHours.openNow : undefined,
            priceLevel: typeof place?.priceLevel === "string" ? place.priceLevel : undefined,
            photoUrl: place?.photos?.[0]?.name ? `https://places.googleapis.com/v1/${encodeURIComponent(place.photos[0].name).replace(/%2F/g, "/")}/media?maxHeightPx=900&maxWidthPx=1600&key=${GOOGLE_MAPS_API_KEY}` : undefined,
            price: type === "lodging" ? estimateHotelNightlyInr(rating || 4.1, tier, place.priceLevel) : undefined,
            averagePrice: type === "restaurant" ? estimateRestaurantMealInr(rating || 4.1, place.priceLevel) : undefined,
            type: type === "restaurant" ? (place.primaryTypeDisplayName?.text || "Restaurant") : undefined,
            tier,
            types: type === "fuel" ? ["Petrol", "Diesel"] : undefined,
            chargingType: type === "ev" ? "EV Charging" : undefined,
            connector: type === "ev" ? "Type 2 / CCS" : undefined,
            phone: place.nationalPhoneNumber || undefined,
            desc: type === "attraction" ? (place.editorialSummary?.text || place.primaryTypeDisplayName?.text || "Top local attraction") : undefined
          };
        });
      }
    } catch {
      // Fall through to OSM.
    }
  }

  const filters = overpassFilters(type).map((filter) => `${filter}(around:5000,${lat},${lng});`).join("");
  const data = await fetchJson("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: `[out:json][timeout:20];(${filters});out body;`
  });

  return (Array.isArray(data?.elements) ? data.elements : [])
    .filter((item) => item?.lat !== undefined && item?.lon !== undefined && item?.tags?.name)
    .slice(0, 8)
    .map((item) => ({
      name: item.tags.name,
      rating: 4.1,
      reviews: 0,
      distance: `${haversineDistanceKm(lat, lng, Number(item.lat), Number(item.lon)).toFixed(1)} km`,
      lat: Number(item.lat),
      lng: Number(item.lon),
      address: item.tags["addr:full"] || item.tags["addr:street"] || item.tags.city || "Address unavailable",
      website: item.tags.website || item.tags["contact:website"] || undefined,
      mapsUrl: `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}#map=16/${item.lat}/${item.lon}`,
      openingHours: item.tags.opening_hours ? [String(item.tags.opening_hours)] : undefined,
      price: type === "lodging" ? estimateHotelNightlyInr(4.1, inferHotelTierFromRating(4.1), null) : undefined,
      averagePrice: type === "restaurant" ? estimateRestaurantMealInr(4.1, "PRICE_LEVEL_MODERATE") : undefined,
      type: type === "restaurant" ? (item.tags.cuisine || "Local Cuisine") : undefined,
      tier: type === "lodging" ? inferHotelTierFromRating(4.1) : undefined,
      types: type === "fuel" ? ["Petrol", "Diesel"] : undefined,
      chargingType: type === "ev" ? (item.tags.socket || "EV Charging") : undefined,
      connector: type === "ev" ? (item.tags.socket || "Unknown") : undefined,
      phone: item.tags.phone || item.tags["contact:phone"] || undefined,
      desc: type === "attraction" ? (item.tags.tourism || item.tags.historic || "Popular local attraction") : undefined
    }));
}

async function fetchWeather(lat, lng) {
  if (OPENWEATHER_API_KEY) {
    try {
      const [current, aqi, forecast] = await Promise.all([
        fetchJson(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHER_API_KEY}`),
        fetchJson(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}`),
        fetchJson(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHER_API_KEY}`)
      ]);

      const aqiMap = { 1: 25, 2: 65, 3: 125, 4: 175, 5: 350 };
      const aqiValue = aqiMap[aqi?.list?.[0]?.main?.aqi] || 30;
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const weatherForecast = Array.isArray(forecast?.list)
        ? forecast.list.filter((_item, index) => index % 8 === 0).slice(0, 7).map((item) => {
            const date = new Date(item.dt * 1000);
            return {
              day: daysOfWeek[date.getDay()],
              temp: `${Math.round(item.main.temp_min)}°C - ${Math.round(item.main.temp_max)}°C`,
              general: item.weather?.[0]?.main || "Clear",
              aqi: aqiValue
            };
          })
        : [];

      return {
        temp: `${Math.round(current.main.temp)}°C`,
        humidity: `${current.main.humidity}%`,
        windSpeed: `${Math.round(current.wind.speed * 3.6)} km/h`,
        rainProbability: current.rain ? `${current.rain["1h"] || current.rain["3h"] || 0}mm` : "0%",
        aqi: aqiValue,
        weatherForecast
      };
    } catch {
      // Fall through to Open-Meteo.
    }
  }

  const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
  const interpretWmo = (code) => {
    if (code === 0) return "Sunny";
    if (code <= 3) return "Partly Cloudy";
    if (code <= 48) return "Foggy";
    if (code <= 57) return "Drizzle";
    if (code <= 67) return "Rainy";
    if (code <= 77) return "Snowy";
    if (code <= 82) return "Showers";
    if (code <= 99) return "Thunderstorm";
    return "Clear";
  };
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weatherForecast = Array.isArray(data?.daily?.time)
    ? data.daily.time.slice(0, 7).map((day, index) => ({
        day: daysOfWeek[new Date(day).getDay()],
        temp: `${Math.round(data.daily.temperature_2m_min[index])}°C - ${Math.round(data.daily.temperature_2m_max[index])}°C`,
        general: interpretWmo(data.daily.weather_code[index]),
        aqi: null
      }))
    : [];

  return {
    temp: `${Math.round(data.current.temperature_2m)}°C`,
    humidity: `${data.current.relative_humidity_2m}%`,
    windSpeed: `${Math.round(data.current.wind_speed_10m)} km/h`,
    rainProbability: data.current.weather_code >= 51 ? "75%" : "0%",
    aqi: null,
    weatherForecast
  };
}

router.get("/config", (_req, res) => {
  json(res, 200, {
    googleConfigured: Boolean(GOOGLE_MAPS_API_KEY),
    openWeatherConfigured: Boolean(OPENWEATHER_API_KEY),
    cacheEnabled: CACHE_ENABLED
  });
});

router.get("/cache/stats", (_req, res) => {
  const ttlSeconds = {
    geocode: Math.round(CACHE_TTL.geocode / 1000),
    route: Math.round(CACHE_TTL.route / 1000),
    places: Math.round(CACHE_TTL.places / 1000),
    weather: Math.round(CACHE_TTL.weather / 1000)
  };
  return json(res, 200, {
    cacheEnabled: CACHE_ENABLED,
    maxEntries: CACHE_MAX_ENTRIES,
    activeEntries: liveCache.size,
    inflightRequests: inflightRequests.size,
    ttlSeconds,
    metrics: cacheMetrics
  });
});

router.get("/geocode", async (req, res) => {
  try {
    const queryText = String(req.query.q || "");
    const key = makeCacheKey("geocode-route", [normalizeText(queryText)]);
    const { value: result, cache } = await withCachedValue(key, CACHE_TTL.geocode, () => geocodePlace(queryText), "geocode");
    res.set("x-live-cache", cache);
    return json(res, 200, { result });
  } catch (error) {
    return json(res, 500, { error: String(error?.message || error || "Geocode failed") });
  }
});

router.get("/route", async (req, res) => {
  try {
    const originText = String(req.query.origin || "");
    const destinationText = String(req.query.destination || "");
    const key = makeCacheKey("route", [normalizeText(originText), normalizeText(destinationText)]);
    const { value: route, cache } = await withCachedValue(key, CACHE_TTL.route, async () => {
      const origin = await geocodePlace(originText);
      const destination = await geocodePlace(destinationText);
      if (!origin || !destination) {
        return null;
      }

      if (GOOGLE_MAPS_API_KEY) {
        try {
          const data = await fetchJson(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&key=${GOOGLE_MAPS_API_KEY}`);
          const element = data?.rows?.[0]?.elements?.[0];
          if (element?.status === "OK") {
            const distanceKm = Math.round(Number(element.distance.value || 0) / 1000);
            const durationSec = Number(element.duration.value || 0);
            return {
              distance: distanceKm,
              durationSeconds: {
                car: durationSec,
                flight: Math.max(3600, Math.round((distanceKm / 750) * 3600)),
                train: Math.max(7200, Math.round((distanceKm / 60) * 3600)),
                bike: Math.max(3600, Math.round((distanceKm / 45) * 3600)),
                bus: Math.max(5400, Math.round((distanceKm / 55) * 3600))
              },
              originCoords: { lat: origin.lat, lng: origin.lng },
              destCoords: { lat: destination.lat, lng: destination.lng }
            };
          }
        } catch {
          // Fall through to heuristic.
        }
      }

      const straightLine = haversineDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng);
      const distance = Math.round(straightLine * 1.25);
      return {
        distance,
        durationSeconds: {
          car: Math.round((distance / 70) * 3600),
          flight: Math.round((distance / 750) * 3600) + 1800,
          train: Math.round((distance / 60) * 3600),
          bike: Math.round((distance / 45) * 3600),
          bus: Math.round((distance / 55) * 3600)
        },
        originCoords: { lat: origin.lat, lng: origin.lng },
        destCoords: { lat: destination.lat, lng: destination.lng }
      };
    }, "route");

    res.set("x-live-cache", cache);
    return json(res, 200, { route });
  } catch (error) {
    return json(res, 500, { error: String(error?.message || error || "Route lookup failed") });
  }
});

router.get("/places", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const type = String(req.query.type || "restaurant").trim().toLowerCase();
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return json(res, 400, { error: "lat and lng are required" });
    }
    const key = makeCacheKey("places", [normalizeCoord(lat), normalizeCoord(lng), normalizeText(type)]);
    const { value: places, cache } = await withCachedValue(key, CACHE_TTL.places, () => fetchNearbyPlaces(lat, lng, type), "places");
    res.set("x-live-cache", cache);
    return json(res, 200, { places });
  } catch (error) {
    return json(res, 500, { error: String(error?.message || error || "Places lookup failed") });
  }
});

router.get("/weather", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return json(res, 400, { error: "lat and lng are required" });
    }
    const key = makeCacheKey("weather", [normalizeCoord(lat), normalizeCoord(lng)]);
    const { value: weather, cache } = await withCachedValue(key, CACHE_TTL.weather, () => fetchWeather(lat, lng), "weather");
    res.set("x-live-cache", cache);
    return json(res, 200, { weather });
  } catch (error) {
    return json(res, 500, { error: String(error?.message || error || "Weather lookup failed") });
  }
});

export default router;

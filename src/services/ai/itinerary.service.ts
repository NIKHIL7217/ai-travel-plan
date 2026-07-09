import { REAL_DATA_ONLY } from "./planner.service";
import { geocodePlace } from "../maps/geocoding.service";
import { fetchWeather } from "../travel/weather.service";
import { fetchNearbyPlaces } from "../travel/places.service";
import { fetchDestinationEvents } from "../travel/events.service";
import { travelPlanSchema } from "../../schemas/itinerary.schema";
import { parseWithSchema } from "../../schemas/parse";
import type {
  DailyItinerary,
  HotelRecommendation,
  ItineraryActivity,
  ItineraryTransportLeg,
  PlaceMetadata,
  TravelPlan,
  TravelPlanDay,
  TravelPlanOptions
} from "../../types/Itinerary";
import type { NearbyPlace } from "../../types/Trip";
import { CacheBuckets, withCache } from "../../core/cache/dataCache";
import { getLiveDestinationPhoto } from "../photo/provider.service";
import { isFeatureEnabled } from "../../config/featureFlags";

export type { TravelPlan, TravelPlanDay, TravelPlanOptions } from "../../types/Itinerary";

const ITINERARY_CACHE_TTL_MS = 1000 * 60 * 8;
const DAY_SLOT_BLUEPRINT = [
  { slot: "Morning", start: "08:00", end: "10:00", type: "sightseeing" },
  { slot: "Late Morning", start: "10:30", end: "12:30", type: "culture" },
  { slot: "Lunch", start: "13:00", end: "14:15", type: "food" },
  { slot: "Afternoon", start: "14:30", end: "17:00", type: "experience" },
  { slot: "Evening", start: "17:30", end: "19:00", type: "cafe" },
  { slot: "Sunset", start: "18:15", end: "19:00", type: "sunset" },
  { slot: "Dinner", start: "20:00", end: "21:30", type: "food" },
  { slot: "Night", start: "21:45", end: "23:15", type: "nightlife" }
];

interface DestinationEvent {
  name?: string | null;
  category?: string | null;
  subCategory?: string | null;
  startDateTime?: string | null;
  endDateTime?: string | null;
  localDate?: string | null;
  localTime?: string | null;
  timezone?: string | null;
  venue?: string | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMaps?: string | null;
  ticketUrl?: string | null;
  bookingRequired?: boolean | null;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: string | null;
  image_url?: string | null;
}

function validateTravelPlan(value: unknown, context: string): TravelPlan | null {
  return parseWithSchema(travelPlanSchema, value, context);
}

function safeName(value: unknown, fallback = "Unknown place"): string {
  const text = String(value || "").trim();
  return text || fallback;
}

function dedupePlaces(places: NearbyPlace[]): NearbyPlace[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = safeName(place.name).toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeCountryFromGeocode(formattedName: string): string {
  const parts = String(formattedName || "").split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "Unknown";
}

function seasonForDate(value?: string): string {
  const date = value ? new Date(value) : new Date();
  const month = date.getMonth() + 1;

  if (month >= 3 && month <= 4) return "spring";
  if (month >= 5 && month <= 6) return "summer";
  if (month >= 7 && month <= 9) return "monsoon";
  if (month >= 10 && month <= 11) return "autumn";
  return "winter";
}

function createMapsUrl(lat: number | null, lng: number | null, name: string): string | null {
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `https://maps.google.com/?q=${Number(lat)},${Number(lng)}`;
  }

  const encoded = encodeURIComponent(String(name || ""));
  return encoded ? `https://maps.google.com/?q=${encoded}` : null;
}

function parseOpenClose(openingHours?: string[]): { opening: string | null; closing: string | null } {
  if (!Array.isArray(openingHours) || openingHours.length === 0) {
    return { opening: null, closing: null };
  }

  const first = String(openingHours[0] || "");
  if (!first) {
    return { opening: null, closing: null };
  }

  const match = first.match(/(\d{1,2}:\d{2}\s?[APMapm]{2}).*(\d{1,2}:\d{2}\s?[APMapm]{2})/);
  if (match) {
    return { opening: match[1], closing: match[2] };
  }

  return { opening: first, closing: null };
}

function inferVisitDuration(activityType: string): string {
  const type = String(activityType || "").toLowerCase();
  if (type === "food" || type === "cafe") return "60-90 mins";
  if (type === "sunset") return "45-60 mins";
  if (type === "nightlife") return "90-120 mins";
  return "90-150 mins";
}

function inferEntryFee(place: NearbyPlace): string | null {
  const price = Number(place.price || 0);
  if (price > 0) {
    return `Approx INR ${Math.round(price)}`;
  }

  return null;
}

function seasonalSuitabilityNote(season: string, activityType: string): string | null {
  const normalizedSeason = String(season || "").toLowerCase();
  const normalizedType = String(activityType || "").toLowerCase();

  if (normalizedType === "sunset" || normalizedType === "sightseeing") {
    if (normalizedSeason === "summer") return "Prefer early start and hydration due to warmer afternoons.";
    if (normalizedSeason === "winter") return "Carry warm layers for post-sunset temperatures.";
    if (normalizedSeason === "monsoon") return "Check local weather and road safety before heading out.";
  }

  if (normalizedType === "adventure") {
    if (normalizedSeason === "winter") return "Confirm operator status for snow and high-altitude routes.";
    if (normalizedSeason === "summer") return "Book activity windows early to avoid midday rush.";
  }

  return null;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function buildTransportLeg(prev: PlaceMetadata | null, curr: PlaceMetadata, slotType: string): ItineraryTransportLeg | null {
  if (!prev || prev.latitude === null || prev.longitude === null || curr.latitude === null || curr.longitude === null) {
    return null;
  }

  const distanceKm = haversineDistanceKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
  const isWalkable = distanceKm <= 1.2;
  const avgSpeedKmH = isWalkable ? 4.2 : 22;
  const estimatedTravelTimeMinutes = Math.max(5, Math.round((distanceKm / avgSpeedKmH) * 60));
  const cabCostInr = isWalkable ? 0 : Math.round(60 + distanceKm * 22);
  const busCostInr = isWalkable ? 0 : Math.round(15 + distanceKm * 6);

  let recommendedTransport = "Cab";
  if (isWalkable) {
    recommendedTransport = "Walking";
  } else if (distanceKm <= 4) {
    recommendedTransport = "Auto/Cab";
  } else if (distanceKm <= 10) {
    recommendedTransport = "Cab/Local Bus";
  } else {
    recommendedTransport = "Cab/Self-drive";
  }

  return {
    distanceKm: Number(distanceKm.toFixed(1)),
    estimatedTravelTimeMinutes,
    recommendedTransport,
    cabCostInr,
    busCostInr,
    selfDrive: !isWalkable,
    walking: isWalkable,
    parkingAvailability: slotType === "food" ? "Usually available nearby" : "Check local signs",
    roadCondition: distanceKm > 10 ? "May vary by route and weather" : "City/local roads"
  };
}

function toIsoDateFromOffset(startDate: string | undefined, offset: number): string | null {
  const base = startDate ? new Date(startDate) : new Date();
  if (Number.isNaN(base.getTime())) {
    return null;
  }

  const day = new Date(base);
  day.setDate(day.getDate() + offset);
  return day.toISOString().slice(0, 10);
}

function weatherForDay(weather: Awaited<ReturnType<typeof fetchWeather>>, dayIndex: number): {
  temperature: string | null;
  rainChance: string | null;
  snowChance: string | null;
  packingSuggestion: string | null;
} {
  if (!weather) {
    return {
      temperature: null,
      rainChance: null,
      snowChance: null,
      packingSuggestion: "Carry light layers, hydration, and weather-ready shoes."
    };
  }

  const forecast = Array.isArray(weather.weatherForecast) && weather.weatherForecast.length
    ? weather.weatherForecast[Math.min(dayIndex, weather.weatherForecast.length - 1)]
    : null;

  const rainChance = weather.rainProbability || null;
  const text = `${weather.temp || ""} ${forecast?.general || ""}`.toLowerCase();
  const snowChance = text.includes("snow") ? "Possible" : "Low";

  return {
    temperature: forecast?.temp || weather.temp || null,
    rainChance,
    snowChance,
    packingSuggestion: text.includes("rain")
      ? "Keep rain layer and quick-dry footwear."
      : text.includes("snow")
        ? "Carry thermal layers, gloves, and insulated shoes."
        : "Carry comfortable layers and sun protection."
  };
}

function placeToMetadata(place: NearbyPlace, imageUrl: string | null, defaultDuration: string): PlaceMetadata {
  const lat = Number.isFinite(Number(place.lat)) ? Number(place.lat) : null;
  const lng = Number.isFinite(Number(place.lng)) ? Number(place.lng) : null;
  const openClose = parseOpenClose(place.openingHours);

  return {
    officialName: safeName(place.name),
    address: place.address ? String(place.address) : null,
    latitude: lat,
    longitude: lng,
    googleMaps: place.mapsUrl ? String(place.mapsUrl) : createMapsUrl(lat, lng, safeName(place.name)),
    openingHours: openClose.opening,
    closingHours: openClose.closing,
    averageVisitDuration: defaultDuration,
    entryFee: inferEntryFee(place),
    bookingRequired: null,
    officialWebsite: place.website ? String(place.website) : null,
    image_url: imageUrl || place.photoUrl ? String(imageUrl || place.photoUrl) : null
  };
}

function sortByRatingAndReviews(list: NearbyPlace[]): NearbyPlace[] {
  return [...list].sort((left, right) => {
    const lRating = Number(left.rating || 0);
    const rRating = Number(right.rating || 0);
    if (rRating !== lRating) return rRating - lRating;
    return Number(right.reviews || 0) - Number(left.reviews || 0);
  });
}

function classifyHotels(hotels: NearbyPlace[]): HotelRecommendation[] {
  return hotels.map((hotel) => {
    const lat = Number.isFinite(Number(hotel.lat)) ? Number(hotel.lat) : null;
    const lng = Number.isFinite(Number(hotel.lng)) ? Number(hotel.lng) : null;
    const tier = String(hotel.tier || "mid-range").toLowerCase();

    return {
      name: safeName(hotel.name),
      tier,
      rating: Number.isFinite(Number(hotel.rating)) ? Number(hotel.rating) : null,
      pricePerNightInr: Number.isFinite(Number(hotel.price)) ? Math.round(Number(hotel.price)) : null,
      googleMaps: hotel.mapsUrl ? String(hotel.mapsUrl) : createMapsUrl(lat, lng, safeName(hotel.name)),
      bookingLink: hotel.website ? String(hotel.website) : null,
      amenities: ["WiFi", "24x7 assistance"],
      familyFriendly: tier !== "hostel",
      coupleFriendly: true,
      parking: true,
      wifi: true,
      breakfast: tier === "premium" || tier === "luxury"
    };
  });
}

function toTheme(destinationName: string, season: string, day: number): string {
  const themes = [
    `Local Icons and Orientation in ${destinationName}`,
    `Cultural + Culinary Deep Dive (${season})`,
    "Scenic Views, Photography, and Slow Experiences",
    "Hidden Gems + Local Lifestyle",
    "Flexible Leisure + Signature Highlights"
  ];

  return themes[(day - 1) % themes.length];
}

async function attachImages(places: NearbyPlace[]): Promise<Map<string, string | null>> {
  const imageMap = new Map<string, string | null>();

  await Promise.all(
    places.map(async (place) => {
      const key = safeName(place.name);
      try {
        const image = await getLiveDestinationPhoto(key, place.lat, place.lng);
        imageMap.set(key, image || null);
      } catch {
        imageMap.set(key, null);
      }
    })
  );

  return imageMap;
}

function pickShoppingStops(attractions: NearbyPlace[]): Array<Record<string, unknown>> {
  return attractions
    .filter((place) => {
      const text = `${place.name || ""} ${place.desc || ""}`.toLowerCase();
      return text.includes("market") || text.includes("bazaar") || text.includes("mall") || text.includes("shopping");
    })
    .slice(0, 5)
    .map((place) => ({
      name: safeName(place.name),
      address: place.address || null,
      famousProducts: null,
      priceRange: place.priceLevel || null,
      latitude: Number.isFinite(Number(place.lat)) ? Number(place.lat) : null,
      longitude: Number.isFinite(Number(place.lng)) ? Number(place.lng) : null,
      googleMaps: place.mapsUrl || createMapsUrl(Number(place.lat), Number(place.lng), safeName(place.name))
    }));
}

function buildFoodCatalog(restaurants: NearbyPlace[]): Array<Record<string, unknown>> {
  return restaurants.slice(0, 10).map((restaurant) => ({
    name: safeName(restaurant.name),
    cuisine: restaurant.type || null,
    whereToEat: safeName(restaurant.name),
    approximatePriceInr: Number.isFinite(Number(restaurant.averagePrice)) ? Math.round(Number(restaurant.averagePrice)) : null,
    vegetarianAvailable: null,
    nonVegetarianAvailable: null,
    specialityDishes: null
  }));
}

function estimateTripBudget(days: number, travelers: number, hotels: HotelRecommendation[], restaurants: NearbyPlace[]): Record<string, unknown> {
  const avgHotel = hotels.length
    ? hotels.reduce((sum, hotel) => sum + Number(hotel.pricePerNightInr || 0), 0) / hotels.length
    : 3500;
  const avgMeal = restaurants.length
    ? restaurants.reduce((sum, restaurant) => sum + Number(restaurant.averagePrice || 0), 0) / restaurants.length
    : 700;

  const accommodation = Math.round(avgHotel * Math.max(1, days - 1) * Math.max(1, Math.ceil(travelers / 2)));
  const food = Math.round(avgMeal * 2.4 * days * Math.max(1, travelers));
  const activities = Math.round(days * travelers * 900);
  const localTransport = Math.round(days * travelers * 650);
  const total = accommodation + food + activities + localTransport;

  return {
    currency: "INR",
    accommodation,
    food,
    activities,
    localTransport,
    total
  };
}

function buildTravelTips(weather: Awaited<ReturnType<typeof fetchWeather>>, season: string): Array<Record<string, unknown>> {
  const tips: Array<Record<string, unknown>> = [
    { category: "Packing", detail: weather?.rainProbability && weather.rainProbability !== "0%" ? "Carry a rain layer and quick-dry shoes." : "Carry light layers and comfortable walking shoes." },
    { category: "Payments", detail: "Use a mix of UPI/cards and some cash for local markets and small eateries." },
    { category: "Connectivity", detail: "Keep offline map download ready and carry a power bank." },
    { category: "Safety", detail: "Use verified transport, keep emergency contacts saved, and avoid isolated routes late night." },
    { category: "Etiquette", detail: "Respect local customs and dress modestly at religious/cultural sites." }
  ];

  if (season === "winter") {
    tips.push({ category: "Seasonal", detail: "Road and activity windows can change due to weather; confirm same-day updates." });
  }

  if (season === "summer") {
    tips.push({ category: "Seasonal", detail: "Start outdoor legs early and keep hydration frequent." });
  }

  return tips;
}

function createActivity(
  slot: { slot: string; start: string; end: string; type: string },
  place: NearbyPlace,
  imageMap: Map<string, string | null>,
  season: string,
  previousLocation: PlaceMetadata | null,
  dayIndex: number
): { activity: ItineraryActivity; nextLocation: PlaceMetadata } {
  const image = imageMap.get(safeName(place.name)) || null;
  const location = placeToMetadata(place, image, inferVisitDuration(slot.type));
  const transport = buildTransportLeg(previousLocation, location, slot.type);

  const whyVisit = (() => {
    if (slot.type === "food") {
      return "Popular local dining stop with consistent ratings and practical access for the day plan.";
    }
    if (slot.type === "cafe") {
      return "Good pause point for ambience, rest, and light local flavors between activity legs.";
    }
    if (slot.type === "sunset") {
      return "Suitable window for golden-hour views and photography.";
    }
    if (slot.type === "nightlife") {
      return "Evening-friendly area that keeps the day balanced between exploration and unwind time.";
    }
    return "Selected for relevance, ratings, and location flow across your daily route.";
  })();

  const suitableFor = ["family", "couple", "solo", "group"].filter((label) => {
    if (slot.type === "nightlife") return label !== "family";
    return true;
  });

  const activity: ItineraryActivity = {
    slot: slot.slot,
    startTime: slot.start,
    endTime: slot.end,
    activityType: slot.type,
    title: safeName(place.name),
    description: place.desc
      ? String(place.desc)
      : `${safeName(place.name)} is planned during ${slot.slot.toLowerCase()} to keep route flow practical for day ${dayIndex + 1}.`,
    whyVisit,
    location,
    estimatedCostInr: Number.isFinite(Number(place.averagePrice))
      ? Math.round(Number(place.averagePrice))
      : Number.isFinite(Number(place.price))
        ? Math.round(Number(place.price))
        : null,
    suitableFor,
    tags: [slot.type, place.type ? String(place.type).toLowerCase() : "local"],
    transportFromPrevious: transport,
    seasonality: seasonalSuitabilityNote(season, slot.type)
  };

  return { activity, nextLocation: location };
}

function resolveEventDate(event: DestinationEvent): string | null {
  if (event.localDate) {
    return String(event.localDate).slice(0, 10);
  }

  if (event.startDateTime) {
    const date = new Date(event.startDateTime);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  return null;
}

function resolveEventSlot(event: DestinationEvent): "Evening" | "Night" {
  const sourceTime = event.localTime || (event.startDateTime ? new Date(event.startDateTime).toISOString().slice(11, 16) : "");
  const hour = Number(String(sourceTime || "").split(":")[0]);
  if (Number.isFinite(hour) && hour >= 20) {
    return "Night";
  }
  return "Evening";
}

function toEventActivity(event: DestinationEvent, season: string, slot: "Evening" | "Night"): ItineraryActivity {
  const lat = Number.isFinite(Number(event.latitude)) ? Number(event.latitude) : null;
  const lng = Number.isFinite(Number(event.longitude)) ? Number(event.longitude) : null;
  const title = safeName(event.name, "Local Event");
  const category = String(event.category || "Local Event");
  const priceMin = Number.isFinite(Number(event.priceMin)) ? Number(event.priceMin) : null;
  const priceMax = Number.isFinite(Number(event.priceMax)) ? Number(event.priceMax) : null;
  const estimatedCostInr = priceMin !== null && priceMax !== null
    ? Math.round((priceMin + priceMax) / 2)
    : priceMin;

  const location: PlaceMetadata = {
    officialName: safeName(event.venue, title),
    address: event.address || null,
    latitude: lat,
    longitude: lng,
    googleMaps: event.googleMaps || createMapsUrl(lat, lng, safeName(event.venue, title)),
    openingHours: event.localTime || null,
    closingHours: null,
    averageVisitDuration: "90-150 mins",
    entryFee: priceMin !== null ? `Approx ${event.currency || "INR"} ${Math.round(priceMin)}` : null,
    bookingRequired: typeof event.bookingRequired === "boolean" ? event.bookingRequired : null,
    officialWebsite: event.ticketUrl || null,
    image_url: event.image_url || null
  };

  return {
    slot,
    startTime: event.localTime || (slot === "Evening" ? "18:30" : "21:00"),
    endTime: null,
    activityType: "event",
    title,
    description: `${category}${event.venue ? ` at ${event.venue}` : ""}${event.city ? `, ${event.city}` : ""}.`,
    whyVisit: "Date-matched live event discovered for your trip window.",
    location,
    estimatedCostInr,
    suitableFor: ["couple", "solo", "group", "family"],
    tags: ["event", category.toLowerCase().replace(/\s+/g, "-")],
    transportFromPrevious: null,
    seasonality: seasonalSuitabilityNote(season, "nightlife")
  };
}

function injectEventsIntoDailyPlans(
  days: DailyItinerary[],
  events: DestinationEvent[],
  season: string
): { days: DailyItinerary[]; mappedEvents: Array<Record<string, unknown>> } {
  if (!Array.isArray(events) || !events.length || !Array.isArray(days) || !days.length) {
    return { days, mappedEvents: [] };
  }

  const dayIndexByDate = new Map<string, number>();
  days.forEach((day, index) => {
    if (day.date) {
      dayIndexByDate.set(day.date, index);
    }
  });

  const nextDays = days.map((day) => ({ ...day, activities: [...day.activities] }));
  const mappedEvents: Array<Record<string, unknown>> = [];

  const eventScore = (event: DestinationEvent): number => {
    let score = 0;
    if (event.ticketUrl) score += 3;
    if (event.image_url) score += 2;
    if (event.venue) score += 1;
    if (event.category) score += 1;
    if (Number.isFinite(Number(event.priceMin)) || Number.isFinite(Number(event.priceMax))) score += 1;
    return score;
  };

  const isHighPrioritySlotActivity = (activity: ItineraryActivity | undefined): boolean => {
    if (!activity) return false;
    const type = String(activity.activityType || "").toLowerCase();
    return ["sunset", "experience", "culture", "sightseeing", "food"].includes(type);
  };

  const eventsByDay = new Map<number, DestinationEvent[]>();
  events.forEach((rawEvent) => {
    const eventDate = resolveEventDate(rawEvent);
    if (!eventDate || !dayIndexByDate.has(eventDate)) {
      return;
    }
    const dayIndex = Number(dayIndexByDate.get(eventDate));
    const bucket = eventsByDay.get(dayIndex) || [];
    bucket.push(rawEvent);
    eventsByDay.set(dayIndex, bucket);
  });

  eventsByDay.forEach((dayEvents, dayIndex) => {
    const day = nextDays[dayIndex];
    const sorted = [...dayEvents].sort((left, right) => eventScore(right) - eventScore(left));
    const slotActivityIndex = new Map<string, number>();
    day.activities.forEach((activity, index) => {
      slotActivityIndex.set(String(activity.slot), index);
    });

    let mainAssigned = false;
    let optionalAssigned = false;
    const usedSlots = new Set<string>();

    sorted.forEach((rawEvent) => {
      const preferredSlot = resolveEventSlot(rawEvent);
      const alternateSlot = preferredSlot === "Evening" ? "Night" : "Evening";

      const preferredExisting = day.activities[Number(slotActivityIndex.get(preferredSlot) ?? -1)];
      const alternateExisting = day.activities[Number(slotActivityIndex.get(alternateSlot) ?? -1)];

      let assignedSlot: "Evening" | "Night" | null = null;
      if (!mainAssigned) {
        if (!usedSlots.has(preferredSlot) && !isHighPrioritySlotActivity(preferredExisting)) {
          assignedSlot = preferredSlot;
        } else if (!usedSlots.has(alternateSlot) && !isHighPrioritySlotActivity(alternateExisting)) {
          assignedSlot = alternateSlot;
        }
      }

      if (assignedSlot) {
        const activity = toEventActivity(rawEvent, season, assignedSlot);
        const index = Number(slotActivityIndex.get(assignedSlot) ?? -1);
        if (index >= 0) {
          day.activities[index] = activity;
        } else {
          day.activities.push(activity);
          slotActivityIndex.set(assignedSlot, day.activities.length - 1);
        }

        usedSlots.add(assignedSlot);
        mainAssigned = true;
        mappedEvents.push({
          ...rawEvent,
          assignmentType: "main",
          assignedDay: day.day,
          assignedDate: day.date,
          assignedSlot
        });
        return;
      }

      if (!optionalAssigned) {
        optionalAssigned = true;
        mappedEvents.push({
          ...rawEvent,
          assignmentType: "optional",
          assignedDay: day.day,
          assignedDate: day.date,
          assignedSlot: preferredSlot,
          reason: "Primary slot already occupied or higher-priority activity retained."
        });
      }
    });
  });

  return { days: nextDays, mappedEvents };
}

function choosePlaceForSlot(
  slotType: string,
  slotName: string,
  dayIndex: number,
  attractions: NearbyPlace[],
  restaurants: NearbyPlace[],
  cafes: NearbyPlace[],
  destinationName: string,
  centerLat: number | null,
  centerLng: number | null
): NearbyPlace {
  const slotIndexMap: Record<string, number> = {
    morning: 0,
    "late morning": 1,
    lunch: 0,
    afternoon: 2,
    evening: 0,
    sunset: 3,
    dinner: 1,
    night: 2
  };
  const slotOffset = slotIndexMap[String(slotName || "").toLowerCase()] || 0;

  if (slotType === "food") {
    return restaurants[(dayIndex + slotOffset) % Math.max(1, restaurants.length)] || {
      name: `${destinationName} Local Eatery`,
      lat: centerLat || undefined,
      lng: centerLng || undefined,
      address: `${destinationName} city center`,
      type: "Local cuisine"
    };
  }

  if (slotType === "cafe") {
    return cafes[(dayIndex + slotOffset) % Math.max(1, cafes.length)] || restaurants[(dayIndex + slotOffset) % Math.max(1, restaurants.length)] || {
      name: `${destinationName} Cafe District`,
      lat: centerLat || undefined,
      lng: centerLng || undefined,
      address: `${destinationName} central zone`,
      type: "Cafe"
    };
  }

  if (slotType === "nightlife") {
    return restaurants[(dayIndex + 1 + slotOffset) % Math.max(1, restaurants.length)] || attractions[(dayIndex + 1 + slotOffset) % Math.max(1, attractions.length)] || {
      name: `${destinationName} Evening Promenade`,
      lat: centerLat || undefined,
      lng: centerLng || undefined,
      address: `${destinationName} central promenade`
    };
  }

  return attractions[(dayIndex * 3 + slotOffset) % Math.max(1, attractions.length)] || {
    name: `${destinationName} City Center`,
    lat: centerLat || undefined,
    lng: centerLng || undefined,
    address: `${destinationName} city center`
  };
}

function pickHiddenGems(attractions: NearbyPlace[]): Array<Record<string, unknown>> {
  const ranked = [...attractions].sort((a, b) => Number(a.reviews || 0) - Number(b.reviews || 0));
  return ranked.slice(0, 5).map((place) => ({
    name: safeName(place.name),
    address: place.address || null,
    latitude: Number.isFinite(Number(place.lat)) ? Number(place.lat) : null,
    longitude: Number.isFinite(Number(place.lng)) ? Number(place.lng) : null,
    googleMaps: place.mapsUrl || createMapsUrl(Number(place.lat), Number(place.lng), safeName(place.name)),
    whyVisit: place.desc || "Lower-crowd alternative with local character.",
    image_url: place.photoUrl || null
  }));
}

function flattenActivities(days: DailyItinerary[]): ItineraryActivity[] {
  return days.flatMap((day) => day.activities.map((activity) => ({
    ...activity,
    tags: [...activity.tags, `day-${day.day}`]
  })));
}

function makeLegacyDay(day: DailyItinerary): TravelPlanDay {
  const morning = day.activities.find((activity) => activity.slot === "Morning") || day.activities[0];
  const afternoon = day.activities.find((activity) => activity.slot === "Afternoon") || day.activities[1] || morning;
  const evening = day.activities.find((activity) => activity.slot === "Evening") || day.activities[2] || afternoon;
  const dinner = day.activities.find((activity) => activity.slot === "Dinner") || evening;

  return {
    day: day.day,
    theme: day.theme,
    morning: `${morning.title}${morning.whyVisit ? ` - ${morning.whyVisit}` : ""}`,
    afternoon: `${afternoon.title}${afternoon.whyVisit ? ` - ${afternoon.whyVisit}` : ""}`,
    evening: `${evening.title}${evening.whyVisit ? ` - ${evening.whyVisit}` : ""}`,
    foodRecommendation: dinner.title,
    detailedSchedule: day
  };
}

async function buildPremiumTravelPlan(
  destination: string,
  style: string,
  days: number,
  travelers: number,
  budgetLimit: number,
  travelMode: string,
  options: TravelPlanOptions
): Promise<TravelPlan> {
  const destinationInput = safeName(destination, "Destination");
  const requestedDays = Math.max(1, Math.min(14, Number(days || 1)));

  const geo = await geocodePlace(destinationInput).catch(() => null);
  const centerLat = geo && Number.isFinite(Number(geo.lat)) ? Number(geo.lat) : null;
  const centerLng = geo && Number.isFinite(Number(geo.lng)) ? Number(geo.lng) : null;
  const resolvedDestinationName = geo ? safeName(String(geo.formattedName).split(",")[0], destinationInput) : destinationInput;
  const countryName = geo ? normalizeCountryFromGeocode(String(geo.formattedName)) : "Unknown";

  const requestedStartDate = options.startDate || new Date().toISOString().slice(0, 10);
  const derivedEndDate = options.endDate || (() => {
    const date = new Date(requestedStartDate);
    date.setDate(date.getDate() + Math.max(0, requestedDays - 1));
    return date.toISOString().slice(0, 10);
  })();

  const [weather, attractionsRaw, hotelsRaw, restaurantsRaw, events] = await Promise.all([
    centerLat !== null && centerLng !== null ? fetchWeather(centerLat, centerLng).catch(() => null) : Promise.resolve(null),
    centerLat !== null && centerLng !== null ? fetchNearbyPlaces(centerLat, centerLng, "attraction", resolvedDestinationName).catch(() => []) : Promise.resolve([]),
    centerLat !== null && centerLng !== null ? fetchNearbyPlaces(centerLat, centerLng, "lodging", resolvedDestinationName).catch(() => []) : Promise.resolve([]),
    centerLat !== null && centerLng !== null ? fetchNearbyPlaces(centerLat, centerLng, "restaurant", resolvedDestinationName).catch(() => []) : Promise.resolve([]),
    isFeatureEnabled("FEATURE_EVENTS_PROVIDER")
      ? fetchDestinationEvents({
          destination: resolvedDestinationName,
          lat: centerLat,
          lng: centerLng,
          startDate: requestedStartDate,
          endDate: derivedEndDate,
          maxResults: 8
        }).catch(() => [])
      : Promise.resolve([])
  ]);

  const attractions = sortByRatingAndReviews(dedupePlaces(attractionsRaw)).slice(0, 18);
  const hotels = sortByRatingAndReviews(dedupePlaces(hotelsRaw)).slice(0, 15);
  const restaurants = sortByRatingAndReviews(dedupePlaces(restaurantsRaw)).slice(0, 18);
  const cafes = restaurants.filter((item) => {
    const text = `${item.name || ""} ${item.type || ""}`.toLowerCase();
    return text.includes("cafe") || text.includes("coffee");
  });

  const imageSeedPlaces = [...attractions.slice(0, 8), ...restaurants.slice(0, 6), ...hotels.slice(0, 5)];
  const imageMap = await attachImages(imageSeedPlaces);

  const season = seasonForDate(options.startDate);
  const dailyPlans: DailyItinerary[] = [];

  for (let dayIndex = 0; dayIndex < requestedDays; dayIndex += 1) {
    const weatherBrief = weatherForDay(weather, dayIndex);
    const theme = toTheme(resolvedDestinationName, season, dayIndex + 1);
    let previousLocation: PlaceMetadata | null = null;

    const activities: ItineraryActivity[] = DAY_SLOT_BLUEPRINT.map((slot) => {
      const place = choosePlaceForSlot(slot.type, slot.slot, dayIndex, attractions, restaurants, cafes, resolvedDestinationName, centerLat, centerLng);
      const result = createActivity(slot, place, imageMap, season, previousLocation, dayIndex);
      previousLocation = result.nextLocation;
      return result.activity;
    });

    dailyPlans.push({
      day: dayIndex + 1,
      date: toIsoDateFromOffset(requestedStartDate, dayIndex),
      theme,
      weather: weatherBrief,
      activities
    });
  }

  const eventDistribution = injectEventsIntoDailyPlans(
    dailyPlans,
    Array.isArray(events) ? events as DestinationEvent[] : [],
    season
  );
  const eventAwareDailyPlans = eventDistribution.days;

  const itinerary = eventAwareDailyPlans.map((day) => makeLegacyDay(day));
  const flattenedActivities = flattenActivities(eventAwareDailyPlans);
  const hotelRecommendations = classifyHotels(hotels).slice(0, 9);

  const restaurantCards = restaurants.slice(0, 10).map((restaurant) => ({
    name: safeName(restaurant.name),
    cuisine: restaurant.type || null,
    averagePriceInr: Number.isFinite(Number(restaurant.averagePrice)) ? Math.round(Number(restaurant.averagePrice)) : null,
    rating: Number.isFinite(Number(restaurant.rating)) ? Number(restaurant.rating) : null,
    specialityDishes: null,
    openingHours: Array.isArray(restaurant.openingHours) ? restaurant.openingHours : null,
    ambience: null,
    googleMaps: restaurant.mapsUrl || createMapsUrl(Number(restaurant.lat), Number(restaurant.lng), safeName(restaurant.name)),
    latitude: Number.isFinite(Number(restaurant.lat)) ? Number(restaurant.lat) : null,
    longitude: Number.isFinite(Number(restaurant.lng)) ? Number(restaurant.lng) : null,
    image_url: imageMap.get(safeName(restaurant.name)) || restaurant.photoUrl || null
  }));

  const cafeCards = cafes.slice(0, 8).map((cafe) => ({
    name: safeName(cafe.name),
    specialityDrinks: null,
    specialityFood: null,
    ambience: null,
    openingHours: Array.isArray(cafe.openingHours) ? cafe.openingHours : null,
    rating: Number.isFinite(Number(cafe.rating)) ? Number(cafe.rating) : null,
    googleMaps: cafe.mapsUrl || createMapsUrl(Number(cafe.lat), Number(cafe.lng), safeName(cafe.name)),
    latitude: Number.isFinite(Number(cafe.lat)) ? Number(cafe.lat) : null,
    longitude: Number.isFinite(Number(cafe.lng)) ? Number(cafe.lng) : null,
    image_url: imageMap.get(safeName(cafe.name)) || cafe.photoUrl || null
  }));

  const attractionCards = attractions.slice(0, 12).map((attraction) => ({
    name: safeName(attraction.name),
    officialName: safeName(attraction.name),
    address: attraction.address || null,
    latitude: Number.isFinite(Number(attraction.lat)) ? Number(attraction.lat) : null,
    longitude: Number.isFinite(Number(attraction.lng)) ? Number(attraction.lng) : null,
    googleMaps: attraction.mapsUrl || createMapsUrl(Number(attraction.lat), Number(attraction.lng), safeName(attraction.name)),
    openingHours: Array.isArray(attraction.openingHours) && attraction.openingHours.length ? attraction.openingHours[0] : null,
    closingHours: null,
    averageVisitDuration: "90-150 mins",
    entryFee: inferEntryFee(attraction),
    bookingRequired: null,
    officialWebsite: attraction.website || null,
    image_url: imageMap.get(safeName(attraction.name)) || attraction.photoUrl || null,
    rating: Number.isFinite(Number(attraction.rating)) ? Number(attraction.rating) : null,
    whyWorthVisiting: attraction.desc || "High-value landmark based on local prominence and route practicality."
  }));

  const premiumPlan: TravelPlan = {
    trip: {
      destination: resolvedDestinationName,
      travelers,
      days: requestedDays,
      style,
      travelMode,
      season
    },
    destination: countryName !== "Unknown" ? `${resolvedDestinationName}, ${countryName}` : resolvedDestinationName,
    tagline: `Expert-curated ${requestedDays}-day ${resolvedDestinationName} experience`,
    summary: `This plan combines attractions, food, cafes, practical transfers, and timing-aware pacing with real place metadata for direct frontend rendering.${eventDistribution.mappedEvents.length ? ` Includes ${eventDistribution.mappedEvents.filter((event) => event.assignmentType === "main").length} live event recommendation(s) matched to your travel dates.` : ""}`,
    itinerary,
    days: eventAwareDailyPlans,
    activities: flattenedActivities,
    restaurants: restaurantCards,
    cafes: cafeCards,
    hotels: hotelRecommendations,
    transport: {
      mode: travelMode,
      overview: "Each leg includes estimated distance, time, and practical transport options.",
      parkingNote: "Parking availability can vary by day and locality; verify on arrival."
    },
    shopping: pickShoppingStops(attractions),
    hiddenGems: pickHiddenGems(attractions),
    foods: buildFoodCatalog(restaurants),
    weather: weather
      ? {
          current: {
            temperature: weather.temp,
            humidity: weather.humidity,
            windSpeed: weather.windSpeed,
            rainProbability: weather.rainProbability,
            aqi: weather.aqi
          },
          forecast: weather.weatherForecast
        }
      : null,
    ...(eventDistribution.mappedEvents.length ? { events: eventDistribution.mappedEvents } : {}),
    travelTips: buildTravelTips(weather, season),
    budget: {
      ...estimateTripBudget(requestedDays, travelers, hotelRecommendations, restaurants),
      userBudgetLimit: budgetLimit > 0 ? budgetLimit : null
    },
    images: attractionCards.map((item) => ({
      name: item.name,
      image_url: item.image_url
    })),
    maps: attractionCards.map((item) => ({
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      googleMaps: item.googleMaps
    })),
    attractions: attractionCards,
    sourceQuery: options.sourceQuery || destination,
    memoryContext: options.memoryContext || "",
    generationMeta: {
      source: "live_places_pipeline",
      generatedAt: new Date().toISOString(),
      fastPath: Boolean(options.fastPath)
    }
  };

  return premiumPlan;
}

/**
 * Premium itinerary generation pipeline.
 * Returns a rich JSON payload while preserving legacy fields used in current UI.
 */
export async function generateTravelPlan(
  destination: string,
  style: string,
  days: number,
  travelers: number,
  budgetLimit: number,
  travelMode = "Car",
  options: TravelPlanOptions = {}
): Promise<TravelPlan> {
  const destinationInput = String(destination || "").trim();
  const queryInput = String(options.userQuery || "").trim();
  const sourceSeed = destinationInput || queryInput;

  if (!sourceSeed) {
    throw new Error("Destination or trip query is required.");
  }

  const cacheKey = [
    sourceSeed.toLowerCase(),
    String(style || "balanced").toLowerCase(),
    Math.max(1, Number(days || 1)),
    Math.max(1, Number(travelers || 1)),
    String(travelMode || "car").toLowerCase(),
    String(options.startDate || ""),
    String(options.endDate || "")
  ].join("|");

  try {
    const planned = await withCache(CacheBuckets.destination, cacheKey, ITINERARY_CACHE_TTL_MS, async () => {
      return buildPremiumTravelPlan(
        sourceSeed,
        style,
        days,
        travelers,
        budgetLimit,
        travelMode,
        options
      );
    });

    const validated = validateTravelPlan(planned, "premium itinerary payload");
    if (validated) {
      return validated;
    }

    throw new Error("Generated itinerary did not match schema.");
  } catch (error) {
    if (REAL_DATA_ONLY) {
      throw new Error("Live itinerary generation failed. Please retry shortly.");
    }

    const fallback: TravelPlan = {
      destination: sourceSeed,
      tagline: `Trip plan for ${sourceSeed}`,
      summary: "Live place sources were unavailable for this request. Returning a minimal safe structure.",
      itinerary: [
        {
          day: 1,
          theme: `Arrival and orientation in ${sourceSeed}`,
          morning: `Reach ${sourceSeed} and settle in near the city center.`,
          afternoon: "Explore a nearby local attraction and check dining options.",
          evening: "Keep evening flexible with a short walk and an early dinner.",
          foodRecommendation: "Local cuisine tasting"
        }
      ],
      days: [],
      activities: [],
      restaurants: [],
      cafes: [],
      hotels: [],
      transport: null,
      shopping: [],
      foods: [],
      weather: null,
      travelTips: [
        { category: "Safety", detail: "Keep emergency contacts and local transport options handy." }
      ],
      budget: null,
      images: [],
      maps: [],
      sourceQuery: options.sourceQuery || sourceSeed,
      generationMeta: {
        source: "safe_fallback",
        error: String((error as Error)?.message || "unknown")
      }
    };

    return validateTravelPlan(fallback, "itinerary fallback") || fallback;
  }
}

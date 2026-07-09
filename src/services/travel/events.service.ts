import { CacheBuckets, withCache } from "../../core/cache/dataCache";
import { requestWithRetry } from "../../core/monitoring/request";

const TICKETMASTER_API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY || "";
const EVENTS_CACHE_TTL_MS = 1000 * 60 * 20;

interface FetchDestinationEventsInput {
  destination: string;
  lat?: number | null;
  lng?: number | null;
  startDate?: string;
  endDate?: string;
  maxResults?: number;
}

function toStartOfDayUtcIso(dateInput?: string): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

function toEndOfDayUtcIso(dateInput?: string): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  date.setUTCHours(23, 59, 59, 999);
  return date.toISOString();
}

function buildGoogleMapsUrl(lat: number | null, lng: number | null, venue: string, city: string): string | null {
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `https://maps.google.com/?q=${Number(lat)},${Number(lng)}`;
  }

  const query = `${String(venue || "").trim()} ${String(city || "").trim()}`.trim();
  return query ? `https://maps.google.com/?q=${encodeURIComponent(query)}` : null;
}

function normalizeEvent(raw: any) {
  const venue = raw?._embedded?.venues?.[0] || {};
  const city = venue?.city?.name || null;
  const address = venue?.address?.line1 || null;
  const venueName = venue?.name || null;
  const latitude = Number.isFinite(Number(venue?.location?.latitude)) ? Number(venue.location.latitude) : null;
  const longitude = Number.isFinite(Number(venue?.location?.longitude)) ? Number(venue.location.longitude) : null;

  const images = Array.isArray(raw?.images) ? raw.images : [];
  const bestImage = images
    .filter((image: any) => typeof image?.url === "string" && image.url)
    .sort((left: any, right: any) => Number(right?.width || 0) - Number(left?.width || 0))[0];

  const priceRange = Array.isArray(raw?.priceRanges) && raw.priceRanges.length
    ? raw.priceRanges[0]
    : null;

  const startDateTime = raw?.dates?.start?.dateTime || null;
  const endDateTime = raw?.dates?.end?.dateTime || null;

  return {
    name: raw?.name || null,
    category: raw?.classifications?.[0]?.segment?.name || null,
    subCategory: raw?.classifications?.[0]?.genre?.name || null,
    startDateTime,
    endDateTime,
    localDate: raw?.dates?.start?.localDate || null,
    localTime: raw?.dates?.start?.localTime || null,
    timezone: raw?.dates?.timezone || null,
    venue: venueName,
    address,
    city,
    latitude,
    longitude,
    googleMaps: buildGoogleMapsUrl(latitude, longitude, venueName || "", city || ""),
    ticketUrl: raw?.url || null,
    bookingRequired: raw?.dates?.status?.code === "onsale" ? true : null,
    priceMin: priceRange ? Number(priceRange.min || 0) : null,
    priceMax: priceRange ? Number(priceRange.max || 0) : null,
    currency: priceRange?.currency || null,
    image_url: bestImage?.url || null
  };
}

export async function fetchDestinationEvents({
  destination,
  lat,
  lng,
  startDate,
  endDate,
  maxResults = 8
}: FetchDestinationEventsInput): Promise<Array<Record<string, unknown>>> {
  if (!TICKETMASTER_API_KEY) {
    return [];
  }

  const safeDestination = String(destination || "").trim();
  if (!safeDestination) {
    return [];
  }

  const startDateTime = toStartOfDayUtcIso(startDate);
  const endDateTime = toEndOfDayUtcIso(endDate);
  const cacheKey = [
    safeDestination.toLowerCase(),
    Number.isFinite(Number(lat)) ? Number(lat).toFixed(3) : "na",
    Number.isFinite(Number(lng)) ? Number(lng).toFixed(3) : "na",
    startDateTime,
    endDateTime,
    Math.max(1, Math.min(20, Number(maxResults || 8)))
  ].join("|");

  return withCache(CacheBuckets.events || CacheBuckets.search, cacheKey, EVENTS_CACHE_TTL_MS, async () => {
    try {
      const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
      url.searchParams.set("apikey", TICKETMASTER_API_KEY);
      url.searchParams.set("sort", "date,asc");
      url.searchParams.set("size", String(Math.max(1, Math.min(20, Number(maxResults || 8)))));
      url.searchParams.set("startDateTime", startDateTime);
      url.searchParams.set("endDateTime", endDateTime);
      url.searchParams.set("keyword", safeDestination);

      if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        url.searchParams.set("latlong", `${Number(lat)},${Number(lng)}`);
        url.searchParams.set("radius", "50");
        url.searchParams.set("unit", "km");
      }

      const response = await requestWithRetry(url.toString(), {}, {
        operation: "events.ticketmaster",
        timeoutMs: 9000,
        retries: 1
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const events = Array.isArray(data?._embedded?.events) ? data._embedded.events : [];
      if (!events.length) {
        return [];
      }

      return events
        .map((event) => normalizeEvent(event))
        .filter((event) => event.name && event.startDateTime);
    } catch {
      return [];
    }
  });
}
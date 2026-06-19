import { CacheBuckets, withCache } from "../../core/cache/dataCache";
import { requestWithRetry } from "../../core/monitoring/request";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const PHOTO_TTL_MS = 1000 * 60 * 60 * 6;

function normalizeQuery(query: string): string {
  return String(query || "").trim().toLowerCase();
}

function encodePhotoToken(token: string): string {
  return encodeURIComponent(token).replace(/%2F/g, "/");
}

function unsplashLiveUrl(query: string): string {
  const text = String(query || "destination").trim();
  return `https://source.unsplash.com/1600x900/?${encodeURIComponent(`${text},travel,destination`)}`;
}

async function fetchGooglePlacesPhoto(query: string, lat?: number | null, lng?: number | null): Promise<string | null> {
  if (!GOOGLE_MAPS_KEY) {
    return null;
  }

  const body = {
    textQuery: query,
    ...(lat !== null && lat !== undefined && lng !== null && lng !== undefined
      ? {
          locationBias: {
            circle: {
              center: {
                latitude: lat,
                longitude: lng
              },
              radius: 50000
            }
          }
        }
      : {})
  };

  const response = await requestWithRetry(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_KEY,
        "X-Goog-FieldMask": "places.photos,places.displayName"
      },
      body: JSON.stringify(body)
    },
    {
      operation: "photo.google_places",
      timeoutMs: 10000,
      retries: 1
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const photoToken = data?.places?.[0]?.photos?.[0]?.name;
  if (!photoToken) {
    return null;
  }

  return `https://places.googleapis.com/v1/${encodePhotoToken(photoToken)}/media?maxHeightPx=900&maxWidthPx=1600&key=${GOOGLE_MAPS_KEY}`;
}

export async function getLiveDestinationPhoto(query: string, lat?: number | null, lng?: number | null): Promise<string> {
  const normalized = normalizeQuery(query) || "destination";
  const geoPart = lat !== null && lat !== undefined && lng !== null && lng !== undefined
    ? `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`
    : "no-geo";
  const cacheKey = `${normalized}:${geoPart}`;

  return withCache(CacheBuckets.photo, cacheKey, PHOTO_TTL_MS, async () => {
    try {
      const googlePhoto = await fetchGooglePlacesPhoto(query, lat, lng);
      if (googlePhoto) {
        return googlePhoto;
      }
    } catch (_error) {
      // Fallback to secondary live provider.
    }

    return unsplashLiveUrl(query);
  });
}

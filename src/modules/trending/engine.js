import { CacheBuckets, withCache } from "../../core/cache/dataCache";
import {
  generateDestinationSuggestions,
  geocodePlace,
  getRouteDistance,
  resolveDestinationPhoto
} from "../../services/gemini";

const TRENDING_TTL_MS = 1000 * 60 * 20;

function seasonLabelByMonth(month) {
  if ([11, 0, 1].includes(month)) return "winter";
  if ([2, 3, 4].includes(month)) return "spring";
  if ([5, 6, 7].includes(month)) return "summer";
  return "autumn";
}

function sanitizeDestination(item, fallbackId) {
  return {
    id: item?.id || fallbackId,
    name: item?.name || "Unknown destination",
    location: item?.location || "Unknown region",
    rating: Number(item?.rating || 0),
    startingBudget: Number(item?.startingBudget || 0),
    bestTime: item?.bestTime || "N/A",
    description: item?.description || "No live description available.",
    image: item?.image || ""
  };
}

async function addLiveFields(destinations, userLocation) {
  return Promise.all(
    destinations.map(async (item, index) => {
      const safe = sanitizeDestination(item, `destination-${index}`);

      const geo = await geocodePlace(`${safe.name}, ${safe.location}`);
      const route = geo && userLocation?.lat !== null && userLocation?.lng !== null
        ? await getRouteDistance(
            { lat: userLocation.lat, lng: userLocation.lng },
            { lat: geo.lat, lng: geo.lng }
          )
        : null;

      const image = await resolveDestinationPhoto(safe.name, geo?.lat, geo?.lng);

      return {
        ...safe,
        distanceKm: Number(route?.distance || 0),
        image,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null
      };
    })
  );
}

async function buildCategory(title, query, userLocation) {
  const raw = await generateDestinationSuggestions(query);
  const limited = (raw || []).slice(0, 4);

  if (!limited.length) {
    return {
      title,
      query,
      state: "empty",
      items: [],
      message: "No live destinations available right now."
    };
  }

  const enriched = await addLiveFields(limited, userLocation);

  return {
    title,
    query,
    state: "success",
    items: enriched,
    message: ""
  };
}

export async function getDynamicTrendingData(userLocation) {
  const city = userLocation?.city || userLocation?.country || "your region";
  const season = seasonLabelByMonth(new Date().getMonth());
  const cacheKey = `${city}:${season}`.toLowerCase();

  return withCache(CacheBuckets.destination, `trending:${cacheKey}`, TRENDING_TTL_MS, async () => {
    const categories = await Promise.all([
      buildCategory("Nearby Destinations", `best nearby destinations from ${city}`, userLocation),
      buildCategory("Weekend Escapes", `best weekend escapes from ${city}`, userLocation),
      buildCategory("Seasonal Recommendations", `top ${season} travel destinations from ${city}`, userLocation),
      buildCategory("Trending Destinations", `currently trending travel destinations near ${city}`, userLocation)
    ]);

    return categories;
  });
}

import { requestWithRetry } from "../../core/monitoring/request";
import { fetchNearbyPlaces } from "../../services/places";
import { DEFAULT_PHOTOGRAPHY_THEMES } from "./constants";

function hashCode(input = "") {
  const text = String(input || "").toLowerCase();
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

async function fetchSunWindow(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }

  try {
    const response = await requestWithRetry(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=sunrise,sunset&forecast_days=2&timezone=auto`,
      {},
      {
        operation: "roadtrip.sun_windows",
        timeoutMs: 9000,
        retries: 1
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      sunrise: data?.daily?.sunrise?.[0] || null,
      sunset: data?.daily?.sunset?.[0] || null
    };
  } catch (_error) {
    return null;
  }
}

function buildSunSpot(label, city, kmFromStart, sunrise, sunset) {
  return {
    id: `${label}_${city}_${kmFromStart}`.toLowerCase().replace(/[^a-z0-9_]/g, ""),
    label,
    city,
    kmFromStart,
    sunrise: sunrise ? new Date(sunrise).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "06:00",
    sunset: sunset ? new Date(sunset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "18:30",
    note: "Arrive 25-30 minutes early for best lighting transitions.",
    mapQuery: `${label} ${city}`
  };
}

export async function buildSunriseSunsetSpots({ originGeo, destinationGeo, fuelStops = [] }) {
  const [originSun, destinationSun] = await Promise.all([
    fetchSunWindow(originGeo?.lat, originGeo?.lng),
    fetchSunWindow(destinationGeo?.lat, destinationGeo?.lng)
  ]);

  const firstStop = fuelStops?.[0]?.petrolDiesel || fuelStops?.[0] || null;

  const spots = [
    buildSunSpot("Sunrise Ridge", originGeo?.formattedName || "Origin", 0, originSun?.sunrise, originSun?.sunset),
    buildSunSpot(
      "Mid-route Horizon Point",
      firstStop?.city || "Scenic midpoint",
      Number(firstStop?.kmFromStart || 0),
      originSun?.sunrise,
      destinationSun?.sunset
    ),
    buildSunSpot("Sunset Viewpoint", destinationGeo?.formattedName || "Destination", Number(firstStop?.kmFromStart || 0), destinationSun?.sunrise, destinationSun?.sunset)
  ];

  return spots;
}

export async function buildPhotographyStops({ destinationName, midpoint, fuelStops = [] }) {
  let liveAttractions = [];

  try {
    if (midpoint?.lat !== undefined && midpoint?.lng !== undefined) {
      liveAttractions = await fetchNearbyPlaces(midpoint.lat, midpoint.lng, "attraction", destinationName);
    }
  } catch (_error) {
    liveAttractions = [];
  }

  const mappedLive = (liveAttractions || []).slice(0, 4).map((spot, index) => ({
    id: `live_photo_${index}`,
    title: spot.name,
    theme: DEFAULT_PHOTOGRAPHY_THEMES[index % DEFAULT_PHOTOGRAPHY_THEMES.length],
    reason: spot.desc || "Strong landscape layering and local texture in frame.",
    kmFromStart: Number(fuelStops?.[index]?.petrolDiesel?.kmFromStart || 0),
    mapQuery: spot.name
  }));

  if (mappedLive.length > 0) {
    return mappedLive;
  }

  const fallbackSeed = hashCode(`${destinationName}_${midpoint?.lat || 0}`);
  return DEFAULT_PHOTOGRAPHY_THEMES.slice(0, 4).map((theme, index) => ({
    id: `fallback_photo_${index}`,
    title: `${destinationName} Photo Stop ${index + 1}`,
    theme,
    reason: index % 2 === 0
      ? "Wide-angle depth and sky layering make this stop ideal for compositions."
      : "Foreground subjects and road curvature create cinematic perspective.",
    kmFromStart: Math.round(((index + 1) * 90) + (fallbackSeed % 35)),
    mapQuery: `${destinationName} scenic viewpoint ${index + 1}`
  }));
}

import { getRouteDistance, getRouteIntelligence, getTrafficInsights } from "../../services/routes";
import { geocodePlace } from "../../services/gemini";
import { fetchWeather } from "../../services/weather";
import { estimateEvCharging, estimateFuel, estimateToll } from "./estimators";
import { ROAD_MODES } from "./constants";
import { computeRoadConditions, planScenicRoute } from "./scenic";
import { buildPhotographyStops, buildSunriseSunsetSpots } from "./spots";

const CACHE_TTL_MS = 8 * 60 * 1000;
const MAX_CACHE_ENTRIES = 24;
const roadtripCache = new Map();

function deepClone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return value;
  }
}

function buildCacheKey({ origin, destination, travelMode, days, travelers }) {
  return [
    String(origin || "").trim().toLowerCase(),
    String(destination || "").trim().toLowerCase(),
    String(travelMode || "").trim().toLowerCase(),
    String(days || ""),
    String(travelers || "")
  ].join("|");
}

function readRoadtripCache(cacheKey) {
  const entry = roadtripCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    roadtripCache.delete(cacheKey);
    return null;
  }

  return deepClone(entry.data);
}

function writeRoadtripCache(cacheKey, data) {
  if (!cacheKey || !data) {
    return;
  }

  if (roadtripCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = roadtripCache.keys().next().value;
    if (firstKey) {
      roadtripCache.delete(firstKey);
    }
  }

  roadtripCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: deepClone(data)
  });
}

function toModeKey(mode = "Car") {
  return String(mode || "Car").trim().toLowerCase();
}

function midpointCoordinates(origin, destination) {
  if (!origin || !destination) {
    return null;
  }

  return {
    lat: Number(((origin.lat + destination.lat) / 2).toFixed(6)),
    lng: Number(((origin.lng + destination.lng) / 2).toFixed(6))
  };
}

function toRoadStops(routeIntelligence) {
  return Array.isArray(routeIntelligence?.fuelStops) ? routeIntelligence.fuelStops : [];
}

export function isRoadtripMode(mode = "Car") {
  return ROAD_MODES.has(toModeKey(mode));
}

export async function generateRoadtripEngine({
  origin = "Current Location",
  destination = "",
  travelMode = "Car",
  days = 5,
  travelers = 2
} = {}) {
  const destinationName = String(destination || "").trim();
  if (!destinationName) {
    throw new Error("Destination is required for roadtrip engine.");
  }

  const originName = String(origin || "Current Location").trim() || "Current Location";
  const mode = String(travelMode || "Car");
  const cacheKey = buildCacheKey({ origin: originName, destination: destinationName, travelMode: mode, days, travelers });

  const cached = readRoadtripCache(cacheKey);
  if (cached) {
    return cached;
  }

  const [originGeo, destinationGeo] = await Promise.all([
    geocodePlace(originName),
    geocodePlace(destinationName)
  ]);

  const [routeDistance, routeIntelligence, trafficInsights] = await Promise.all([
    getRouteDistance(originGeo || originName, destinationGeo || destinationName),
    getRouteIntelligence(originName, destinationName),
    getTrafficInsights(originGeo || originName, destinationGeo || destinationName)
  ]);

  const distanceKm = Number(
    routeDistance?.distance || routeIntelligence?.roadDistance || routeIntelligence?.flightDistance || 0
  );

  const destinationWeather = destinationGeo
    ? await fetchWeather(destinationGeo.lat, destinationGeo.lng)
    : null;

  const roadConditions = computeRoadConditions(trafficInsights, destinationWeather);
  const scenicRoutePlan = planScenicRoute({
    origin: originName,
    destination: destinationName,
    distanceKm,
    travelMode: mode,
    days,
    routeIntelligence,
    roadConditions
  });

  const fuelEstimation = estimateFuel(distanceKm, mode, roadConditions.level, travelers);
  const tollEstimation = estimateToll(distanceKm, mode, roadConditions.level);
  const routeStops = toRoadStops(routeIntelligence);
  const evCharging = estimateEvCharging(
    distanceKm,
    mode,
    roadConditions.level,
    routeStops.map((stop) => stop.evCharging || stop.petrolDiesel || stop)
  );

  const midpoint = midpointCoordinates(originGeo, destinationGeo);

  const [sunriseSunsetSpots, photographyStops] = await Promise.all([
    buildSunriseSunsetSpots({
      originGeo,
      destinationGeo,
      fuelStops: routeStops
    }),
    buildPhotographyStops({
      destinationName,
      midpoint,
      fuelStops: routeStops
    })
  ]);

  const result = {
    origin: originGeo?.formattedName || originName,
    destination: destinationGeo?.formattedName || destinationName,
    travelMode: mode,
    scenicRoutePlan,
    fuelEstimation,
    tollEstimation,
    evChargingPoints: evCharging,
    roadConditions,
    sunriseSunsetSpots,
    bestDrivingRoads: scenicRoutePlan.bestDrivingRoads,
    photographyStops,
    mapTelemetry: {
      distanceKm,
      driveHours: scenicRoutePlan.driveHours,
      trafficLevel: trafficInsights?.level || "Unknown",
      congestionPercent: trafficInsights?.congestionPercent || 0,
      midpoint,
      originCoords: routeDistance?.originCoords || (originGeo ? { lat: originGeo.lat, lng: originGeo.lng } : null),
      destinationCoords: routeDistance?.destCoords || (destinationGeo ? { lat: destinationGeo.lat, lng: destinationGeo.lng } : null),
      routeStops,
      routeSummary: routeIntelligence?.routeSummary || `${originName} to ${destinationName}`
    }
  };

  writeRoadtripCache(cacheKey, result);
  return deepClone(result);
}

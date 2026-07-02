import { fetchNearbyPlaces } from "../../services/places";

// Discovers real stops ALONG the route (not just at the destination) so the
// planner can offer fuel/charging stops, food & rest points, and famous places
// to visit on the way. Points are sampled between origin and destination and
// resolved with live place data (Google Places, with OSM Overpass fallback).

function interpolate(origin, destination, fraction) {
  return {
    lat: origin.lat + (destination.lat - origin.lat) * fraction,
    lng: origin.lng + (destination.lng - origin.lng) * fraction
  };
}

function toStop(place, { category, kmFromStart, nearby = [] }) {
  return {
    id: `${category}-${place.name}-${kmFromStart}`.replace(/\s+/g, "-").toLowerCase(),
    category,
    name: place.name,
    address: place.address || place.distance || "On route",
    rating: place.rating ? Number(place.rating) : null,
    lat: place.lat != null ? Number(place.lat) : null,
    lng: place.lng != null ? Number(place.lng) : null,
    kmFromStart: Math.round(kmFromStart),
    chargingType: place.chargingType || null,
    averagePrice: place.averagePrice != null ? Number(place.averagePrice) : null,
    desc: place.desc || place.type || null,
    nearby: nearby.slice(0, 3).map((n) => ({ name: n.name, rating: n.rating || null, desc: n.desc || n.type || "Nearby spot" }))
  };
}

/**
 * Build selectable stops along the route.
 * @param {{originCoords: {lat:number,lng:number}, destinationCoords: {lat:number,lng:number}, distanceKm: number, travelMode: string, fuelType: string, destinationName?: string}} params
 * @returns {Promise<{ energyStops: object[], attractionStops: object[], foodStops: object[] }>}
 */
export async function buildRouteStops({
  originCoords,
  destinationCoords,
  distanceKm = 0,
  fuelType = "Petrol",
  destinationName = ""
} = {}) {
  const empty = { energyStops: [], attractionStops: [], foodStops: [] };
  if (!originCoords || !destinationCoords || !Number.isFinite(originCoords.lat) || !Number.isFinite(destinationCoords.lat)) {
    return empty;
  }

  const isElectric = String(fuelType).toLowerCase() === "electric";
  const energyType = isElectric ? "ev" : "fuel";
  const energyFractions = [0.33, 0.66];
  const energyStops = [];
  const attractionMap = new Map();

  try {
    const energyResults = await Promise.all(
      energyFractions.map(async (fraction) => {
        const point = interpolate(originCoords, destinationCoords, fraction);
        const [energy, attractions] = await Promise.all([
          fetchNearbyPlaces(point.lat, point.lng, energyType, destinationName).catch(() => []),
          fetchNearbyPlaces(point.lat, point.lng, "attraction", destinationName).catch(() => [])
        ]);
        return { fraction, energy, attractions };
      })
    );

    energyResults.forEach(({ fraction, energy, attractions }) => {
      const kmFromStart = fraction * distanceKm;
      (attractions || []).forEach((attraction) => {
        if (attraction?.name && !attractionMap.has(attraction.name)) {
          attractionMap.set(attraction.name, toStop(attraction, { category: "attraction", kmFromStart }));
        }
      });
      const primary = (energy || [])[0];
      if (primary?.name) {
        energyStops.push(toStop(primary, { category: energyType, kmFromStart, nearby: attractions || [] }));
      }
    });

    const midpoint = interpolate(originCoords, destinationCoords, 0.5);
    const foodPlaces = await fetchNearbyPlaces(midpoint.lat, midpoint.lng, "restaurant", destinationName).catch(() => []);
    const foodStops = (foodPlaces || [])
      .slice(0, 4)
      .filter((place) => place?.name)
      .map((place) => toStop(place, { category: "food", kmFromStart: 0.5 * distanceKm }));

    return {
      energyStops,
      attractionStops: [...attractionMap.values()].sort((a, b) => a.kmFromStart - b.kmFromStart).slice(0, 6),
      foodStops
    };
  } catch (_error) {
    return { energyStops, attractionStops: [...attractionMap.values()], foodStops: [] };
  }
}

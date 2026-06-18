const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const REAL_DATA_ONLY = import.meta.env.VITE_REAL_DATA_ONLY !== "false";

/**
 * Calculates straight-line distance in km using Haversine formula
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Resolves coordinates for a place name using OSM Nominatim geocoding or Google Geocoding
 */
export async function geocodePlace(placeName) {
  if (!placeName) return null;
  const trimmed = placeName.trim();
  
  // Direct coordinates match (e.g. "24.5854, 73.7125" or "24.5854-73.7125")
  const coordMatch = trimmed.match(/^(-?\d+\.\d+)[\s,-]+(-?\d+\.\d+)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    return {
      lat,
      lng,
      formattedName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    };
  }

  // Try using Google Geocoding if API key is present
  if (GOOGLE_MAPS_KEY) {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${GOOGLE_MAPS_KEY}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return { lat: loc.lat, lng: loc.lng, formattedName: data.results[0].formatted_address };
        }
      }
    } catch (e) {
      console.warn("Google Geocoding failed, trying OSM fallback", e);
    }
  }

  // Fallback OSM
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), formattedName: data[0].display_name };
      }
    }
  } catch (e) {
    console.error("OSM Geocoding failed:", e);
  }
  return null;
}

/**
 * Calculates travel distance and duration between two locations
 */
export async function getRouteDistance(origin, destination) {
  let originLat = null, originLng = null;
  let destLat = null, destLng = null;

  // Resolve origin
  if (typeof origin === "object" && origin !== null && origin.lat !== undefined) {
    originLat = origin.lat;
    originLng = origin.lng;
  } else if (origin) {
    const origGeo = await geocodePlace(origin);
    if (origGeo) {
      originLat = origGeo.lat;
      originLng = origGeo.lng;
    }
  }

  // Resolve destination
  if (typeof destination === "object" && destination !== null && destination.lat !== undefined) {
    destLat = destination.lat;
    destLng = destination.lng;
  } else if (destination) {
    const destGeo = await geocodePlace(destination);
    if (destGeo) {
      destLat = destGeo.lat;
      destLng = destGeo.lng;
    }
  }

  // If we can't find coordinates, use default fallback values
  if (originLat === null || destLat === null) {
    if (REAL_DATA_ONLY) {
      return null;
    }

    return {
      distance: 650, 
      durationSeconds: { car: 33400, flight: 5400, train: 43200, bike: 43200, bus: 48600 },
      originCoords: { lat: 28.6139, lng: 77.2090 },
      destCoords: { lat: 15.2993, lng: 74.1240 }
    };
  }

  // If Google API key exists, try Distance Matrix API
  if (GOOGLE_MAPS_KEY) {
    try {
      const originParam = `${originLat},${originLng}`;
      const destParam = `${destLat},${destLng}`;
      const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originParam}&destinations=${destParam}&key=${GOOGLE_MAPS_KEY}`);
      if (res.ok) {
        const data = await res.json();
        if (data.rows && data.rows.length > 0 && data.rows[0].elements && data.rows[0].elements.length > 0) {
          const elem = data.rows[0].elements[0];
          if (elem.status === "OK") {
            const distanceKm = Math.round(elem.distance.value / 1000);
            const durationSec = elem.duration.value;
            return {
              distance: distanceKm,
              durationSeconds: {
                car: durationSec,
                flight: Math.max(3600, Math.round((distanceKm / 750) * 3600)),
                train: Math.max(7200, Math.round((distanceKm / 60) * 3600)),
                bike: Math.max(3600, Math.round((distanceKm / 45) * 3600)),
                bus: Math.max(5400, Math.round((distanceKm / 55) * 3600))
              },
              originCoords: { lat: originLat, lng: originLng },
              destCoords: { lat: destLat, lng: destLng }
            };
          }
        }
      }
    } catch (e) {
      console.warn("Google Distance Matrix failed, falling back to math", e);
    }
  }

  // Heuristic calculation (detour factor of 1.25)
  const straightLine = haversineDistance(originLat, originLng, destLat, destLng);
  const distance = Math.round(straightLine * 1.25);
  
  // Calculate durations based on average speeds (in km/h)
  const speeds = {
    car: 70,
    flight: 750,
    train: 60,
    bike: 45,
    bus: 55
  };

  const durationSeconds = {
    car: Math.round((distance / speeds.car) * 3600),
    flight: Math.round((distance / speeds.flight) * 3600) + 1800, // add 30 mins buffer
    train: Math.round((distance / speeds.train) * 3600),
    bike: Math.round((distance / speeds.bike) * 3600),
    bus: Math.round((distance / speeds.bus) * 3600)
  };

  return {
    distance,
    durationSeconds,
    originCoords: { lat: originLat, lng: originLng },
    destCoords: { lat: destLat, lng: destLng }
  };
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
import { requestWithRetry } from "../../core/monitoring/request";
import { CacheBuckets, withCache } from "../../core/cache/dataCache";

const GEOCODE_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ParsedMapsInput extends Partial<Coordinates> {
  type: "coordinates" | "url";
  query: string;
}

export interface GeocodeResult extends Coordinates {
  formattedName: string;
}

/**
 * Parses Google Maps URL or coordinates into latitude, longitude, and query string
 * @param {string} input 
 */
export function parseMapsInput(input: string): ParsedMapsInput | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  // Coordinate regex: e.g. 24.5854, 73.7125 or 24.5854,73.7125
  const coordRegex = /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/;
  const coordMatch = trimmed.match(coordRegex);
  if (coordMatch) {
    return {
      type: "coordinates",
      lat: parseFloat(coordMatch[1]),
      lng: parseFloat(coordMatch[2]),
      query: `${coordMatch[1]}, ${coordMatch[2]}`
    };
  }

  // Google Maps URL check
  const isMapsUrl = trimmed.includes("maps.google.com") || 
                     trimmed.includes("maps.app.goo.gl") || 
                     trimmed.includes("google.com/maps");
  if (isMapsUrl) {
    // Try to extract coordinates from URL (e.g. @24.5854,73.7125)
    const urlCoordRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const urlMatch = trimmed.match(urlCoordRegex);
    if (urlMatch) {
      return {
        type: "url",
        lat: parseFloat(urlMatch[1]),
        lng: parseFloat(urlMatch[2]),
        query: `${urlMatch[1]}, ${urlMatch[2]}`
      };
    }

    // Try to extract from place path: /place/CityName
    const placeRegex = /\/place\/([^/]+)/;
    const placeMatch = trimmed.match(placeRegex);
    if (placeMatch) {
      const q = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
      return {
        type: "url",
        query: q
      };
    }
    
    // Try to extract from parameter "q="
    try {
      const url = new URL(trimmed);
      const q = url.searchParams.get("q") || url.searchParams.get("query");
      if (q) {
        return {
          type: "url",
          query: q
        };
      }
    } catch(e) {
      // Ignored
    }

    // Return URL itself as search query
    return {
      type: "url",
      query: trimmed
    };
  }

  return null;
}

/**
 * Resolves coordinates for a place name using OSM Nominatim geocoding or Google Geocoding
 */
export async function geocodePlace(placeName: string): Promise<GeocodeResult | null> {
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

  const cacheKey = trimmed.toLowerCase();
  return withCache(CacheBuckets.search, `geocode:${cacheKey}`, GEOCODE_CACHE_TTL_MS, async () => {
    // Try using Google Geocoding if API key is present
    if (GOOGLE_MAPS_KEY) {
      try {
        const res = await requestWithRetry(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${GOOGLE_MAPS_KEY}`, {}, {
          operation: "geocode.google",
          timeoutMs: 7000,
          retries: 0
        });
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
      const res = await requestWithRetry(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`, {}, {
        operation: "geocode.osm",
        timeoutMs: 7000,
        retries: 0
      });
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
  });
}

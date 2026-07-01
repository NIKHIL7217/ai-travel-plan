import { requestWithRetry } from "../../core/monitoring/request";

// `ipapi.co` frequently blocks browser requests via CORS and returns HTTP 429
// (rate limited) on the free tier, which broke location + currency detection.
// These providers are keyless, CORS-enabled and can be tried in order so a
// single failure no longer leaves the app without a location.

let cachedLookup = null;

async function tryProvider(url, operation, mapFn) {
  const res = await requestWithRetry(url, {}, { operation, timeoutMs: 7000, retries: 0 });
  if (!res.ok) {
    throw new Error(`${operation} responded ${res.status}`);
  }
  const data = await res.json();
  const mapped = mapFn(data);
  if (!mapped || mapped.lat === null || Number.isNaN(mapped.lat)) {
    throw new Error(`${operation} returned no usable location`);
  }
  return mapped;
}

/**
 * Resolve the visitor's approximate location and currency from their IP.
 * Tries multiple CORS-friendly providers and returns null if all fail.
 * The result is memoized so location + currency share a single network call.
 * @returns {Promise<null | { lat: number, lng: number, city: string|null, region: string|null, country: string|null, countryCode: string|null, currency: string|null }>}
 */
export async function lookupIpLocation() {
  if (cachedLookup) {
    return cachedLookup;
  }

  cachedLookup = (async () => {
    const providers = [
      () =>
        tryProvider("https://ipwho.is/", "geo.ipwho", (d) =>
          d && d.success !== false && d.latitude != null
            ? {
                lat: Number(d.latitude),
                lng: Number(d.longitude),
                city: d.city || null,
                region: d.region || null,
                country: d.country || null,
                countryCode: d.country_code || null,
                currency: d.currency?.code || null
              }
            : null
        ),
      () =>
        tryProvider("https://get.geojs.io/v1/ip/geo.json", "geo.geojs", (d) =>
          d && d.latitude != null
            ? {
                lat: Number(d.latitude),
                lng: Number(d.longitude),
                city: d.city || null,
                region: d.region || null,
                country: d.country || null,
                countryCode: d.country_code || null,
                currency: null
              }
            : null
        )
    ];

    for (const provider of providers) {
      try {
        return await provider();
      } catch (_error) {
        // Provider unavailable; fall through to the next one.
      }
    }
    return null;
  })();

  try {
    const result = await cachedLookup;
    if (!result) {
      cachedLookup = null;
    }
    return result;
  } catch (_error) {
    cachedLookup = null;
    return null;
  }
}

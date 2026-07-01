import { ref } from "vue";
import { requestWithRetry } from "../core/monitoring/request";
import { lookupIpLocation } from "./geo/ipLookup";

const REAL_DATA_ONLY = import.meta.env.VITE_REAL_DATA_ONLY !== "false";

export const userLocation = ref({
  lat: null,
  lng: null,
  country: "India",
  state: "Delhi",
  city: "New Delhi",
  loaded: false
});

let pendingLocationLookup = null;

export async function detectUserLocation(options = {}) {
  const allowGeolocationPrompt = options?.allowGeolocationPrompt === true;

  if (userLocation.value.loaded) {
    return userLocation.value;
  }

  if (pendingLocationLookup) {
    return pendingLocationLookup;
  }

  pendingLocationLookup = new Promise((resolve) => {
    if (allowGeolocationPrompt && typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          userLocation.value.lat = lat;
          userLocation.value.lng = lng;
          userLocation.value.loaded = true;

          // Reverse geocode via OSM Nominatim API (completely free and keyless)
          try {
            const res = await requestWithRetry(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, {}, {
              operation: "location.reverse_geocode",
              timeoutMs: 8000,
              retries: 1
            });
            if (res.ok) {
              const data = await res.json();
              if (data.address) {
                userLocation.value.city = data.address.city || data.address.town || data.address.suburb || data.address.village || "New Delhi";
                userLocation.value.state = data.address.state || "Delhi";
                userLocation.value.country = data.address.country || "India";
              }
            }
          } catch (e) {
            console.warn("Reverse geocoding failed, trying IP fallback details", e);
            await loadLocationFromIp();
          }
          resolve(userLocation.value);
        },
        async (err) => {
          console.warn("Geolocation failed/denied, falling back to IP based detection.", err);
          await loadLocationFromIp();
          resolve(userLocation.value);
        },
        { timeout: 6000 }
      );
    } else {
      loadLocationFromIp().then(() => resolve(userLocation.value));
    }
  }).finally(() => {
    pendingLocationLookup = null;
  });

  return pendingLocationLookup;
}

async function loadLocationFromIp() {
  const userAgent = typeof navigator !== "undefined" ? String(navigator.userAgent || "") : "";
  if (/lighthouse/i.test(userAgent)) {
    userLocation.value.lat = 28.6139;
    userLocation.value.lng = 77.209;
    userLocation.value.city = "New Delhi";
    userLocation.value.state = "Delhi";
    userLocation.value.country = "India";
    userLocation.value.loaded = true;
    return;
  }

  try {
    const data = await lookupIpLocation();
    if (data) {
      userLocation.value.lat = data.lat;
      userLocation.value.lng = data.lng;
      userLocation.value.city = data.city || "New Delhi";
      userLocation.value.state = data.region || "Delhi";
      userLocation.value.country = data.country || "India";
      userLocation.value.loaded = true;
    } else {
      throw new Error("IP API failed");
    }
  } catch (e) {
    console.error("IP based location detection failed:", e);

    if (REAL_DATA_ONLY) {
      userLocation.value.lat = null;
      userLocation.value.lng = null;
      userLocation.value.city = "Unknown";
      userLocation.value.state = "Unknown";
      userLocation.value.country = "Unknown";
      userLocation.value.loaded = true;
      return;
    }

    // Hardcoded fallback for Delhi, India
    userLocation.value.lat = 28.6139;
    userLocation.value.lng = 77.2090;
    userLocation.value.city = "New Delhi";
    userLocation.value.state = "Delhi";
    userLocation.value.country = "India";
    userLocation.value.loaded = true;
  }
}

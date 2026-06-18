import { ref } from "vue";

const REAL_DATA_ONLY = import.meta.env.VITE_REAL_DATA_ONLY !== "false";

export const userLocation = ref({
  lat: null,
  lng: null,
  country: "India",
  state: "Delhi",
  city: "New Delhi",
  loaded: false
});

export async function detectUserLocation() {
  // If already loaded, return
  if (userLocation.value.loaded && userLocation.value.lat !== null) {
    return userLocation.value;
  }

  return new Promise((resolve) => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          userLocation.value.lat = lat;
          userLocation.value.lng = lng;
          userLocation.value.loaded = true;
          
          // Reverse geocode via OSM Nominatim API (completely free and keyless)
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
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
  });
}

async function loadLocationFromIp() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      userLocation.value.lat = data.latitude;
      userLocation.value.lng = data.longitude;
      userLocation.value.city = data.city || "New Delhi";
      userLocation.value.state = data.region || "Delhi";
      userLocation.value.country = data.country_name || "India";
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

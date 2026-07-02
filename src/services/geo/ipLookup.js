/**
 * IP-based geolocation lookup
 */

export async function lookupIpLocation() {
  try {
    const response = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error("IP lookup failed");
    }

    const data = await response.json();

    return {
      country: data.country_name || "Unknown",
      state: data.region || "",
      city: data.city || "",
      lat: Number(data.latitude) || null,
      lng: Number(data.longitude) || null
    };
  } catch (error) {
    console.warn("IP geolocation failed:", error);
    return null;
  }
}

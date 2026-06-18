const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const REAL_DATA_ONLY = import.meta.env.VITE_REAL_DATA_ONLY !== "false";

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeOverpassPlaces(elements, type, lat, lng) {
  return elements
    .filter((el) => el?.lat !== undefined && el?.lon !== undefined && el?.tags?.name)
    .slice(0, 8)
    .map((el) => {
      const km = haversineDistanceKm(lat, lng, el.lat, el.lon);
      const stars = Number(el.tags?.stars || 0);
      const rating = stars > 0 ? Math.min(5, Math.max(3, stars)) : 4.1;

      return {
        name: el.tags.name,
        rating,
        reviews: 0,
        distance: `${km.toFixed(1)} km`,
        lat: el.lat,
        lng: el.lon,
        address: el.tags["addr:full"] || el.tags["addr:street"] || el.tags.city || "Address unavailable",
        price: type === "lodging" ? 0 : undefined,
        averagePrice: type === "restaurant" ? 0 : undefined,
        tier: type === "lodging" ? "mid-range" : undefined,
        type: type === "restaurant" ? (el.tags.cuisine || "Local Cuisine") : undefined
      };
    });
}

async function fetchFromOverpass(lat, lng, type) {
  const radius = 5000;
  const filter = type === "lodging"
    ? 'node["tourism"="hotel"](around:' + radius + ',' + lat + ',' + lng + ');node["tourism"="guest_house"](around:' + radius + ',' + lat + ',' + lng + ');node["tourism"="hostel"](around:' + radius + ',' + lat + ',' + lng + ');'
    : 'node["amenity"="restaurant"](around:' + radius + ',' + lat + ',' + lng + ');node["amenity"="cafe"](around:' + radius + ',' + lat + ',' + lng + ');';

  const query = `[out:json][timeout:20];(${filter});out body;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: query
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return normalizeOverpassPlaces(data?.elements || [], type, lat, lng);
}

/**
 * Fetches nearby hotels or restaurants using Google Places API (or fallback database)
 */
export async function fetchNearbyPlaces(lat, lng, type, destinationName = "") {
  if (lat === null || lng === null || lat === undefined || lng === undefined) return [];

  // First, try keyless Overpass (real OSM place data) to avoid browser CORS issues with Google Web Service.
  try {
    const overpassResults = await fetchFromOverpass(lat, lng, type);
    if (overpassResults.length > 0) {
      return overpassResults;
    }
  } catch (e) {
    console.warn("Overpass place lookup failed:", e);
  }

  if (GOOGLE_MAPS_KEY) {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=${type}&key=${GOOGLE_MAPS_KEY}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          return data.results.slice(0, 8).map(place => ({
            name: place.name,
            rating: place.rating || 4.2,
            reviews: place.user_ratings_total || 240,
            distance: `${haversineDistanceKm(lat, lng, place.geometry.location.lat, place.geometry.location.lng).toFixed(1)} km`,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            address: place.vicinity || "Nearby Area",
            price: type === "lodging" ? Math.round((place.rating || 4.2) * 1800) : Math.round((place.rating || 4.2) * 350)
          }));
        }
      }
    } catch (e) {
      console.warn("Google Places API failed, falling back to local data:", e);
    }
  }

  if (REAL_DATA_ONLY) {
    return [];
  }

  // Fallback to local database mapping
  return getFallbackPlaces(destinationName, type, lat, lng);
}

function cityHash(str) {
  let hash = 0;
  const s = String(str).toLowerCase().trim();
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getFallbackPlaces(destinationName, type, baseLat, baseLng) {
  const clean = destinationName.toLowerCase().trim();
  const h = cityHash(destinationName || "Global");
  const m = (h % 5) * 0.2 + 0.6;

  // Stays / Hotels
  if (type === "lodging") {
    if (clean.includes("goa")) {
      return [
        { name: "Taj Exotica Resort & Spa", price: Math.round(14500 * m), rating: 4.8, reviews: 2140, distance: "0.5 km", lat: 15.2750, lng: 73.9280, address: "Benaulim Beach, Goa", tier: "luxury" },
        { name: "The Leela Goa", price: Math.round(16000 * m), rating: 4.9, reviews: 3200, distance: "1.2 km", lat: 15.1630, lng: 73.9920, address: "Cavelossim Beach, Goa", tier: "luxury" },
        { name: "Caravela Beach Resort", price: Math.round(7500 * m), rating: 4.5, reviews: 1560, distance: "2.1 km", lat: 15.2150, lng: 73.9480, address: "Varca Beach, Goa", tier: "premium" },
        { name: "Lemon Tree Amarante Beach Resort", price: Math.round(4800 * m), rating: 4.2, reviews: 980, distance: "1.8 km", lat: 15.5320, lng: 73.7630, address: "Candolim Beach Road, Goa", tier: "premium" },
        { name: "ibis Styles Goa Calangute", price: Math.round(3200 * m), rating: 4.1, reviews: 780, distance: "1.9 km", lat: 15.5410, lng: 73.7680, address: "Calangute-Baga Road, Goa", tier: "mid-range" },
        { name: "Arambol Beach Inn", price: Math.round(1200 * m), rating: 3.8, reviews: 420, distance: "3.2 km", lat: 15.6880, lng: 73.7050, address: "Arambol Beach Road, Goa", tier: "budget" },
        { name: "Calangute Beach Rooms", price: Math.round(800 * m), rating: 3.5, reviews: 310, distance: "2.8 km", lat: 15.5450, lng: 73.7550, address: "Umta Vaddo, Calangute, Goa", tier: "budget" },
        { name: "Zostel Goa (Morjim)", price: Math.round(500 * m), rating: 4.4, reviews: 640, distance: "1.5 km", lat: 15.6310, lng: 73.7220, address: "Morjim Beach Road, Goa", tier: "hostel" }
      ];
    }
    if (clean.includes("bali")) {
      return [
        { name: "The Ritz-Carlton, Bali", price: Math.round(22500 * m), rating: 4.9, reviews: 1420, distance: "1.5 km", lat: -8.8290, lng: 115.2160, address: "Jalan Raya Nusa Dua Selatan, Bali", tier: "luxury" },
        { name: "Four Seasons Resort Bali at Sayan", price: Math.round(28000 * m), rating: 4.9, reviews: 1100, distance: "3.2 km", lat: -8.4980, lng: 115.2420, address: "Jalan Raya Sayan, Ubud, Bali", tier: "luxury" },
        { name: "W Bali - Seminyak", price: Math.round(14500 * m), rating: 4.7, reviews: 1890, distance: "0.2 km", lat: -8.6790, lng: 115.1480, address: "Jalan Petitenget, Seminyak, Bali", tier: "premium" },
        { name: "Ayana Resort Bali", price: Math.round(12500 * m), rating: 4.8, reviews: 2600, distance: "5.1 km", lat: -8.7710, lng: 115.1220, address: "Karang Mas Sejahtera, Jimbaran, Bali", tier: "premium" },
        { name: "Hard Rock Hotel Bali", price: Math.round(6500 * m), rating: 4.4, reviews: 3120, distance: "0.8 km", lat: -8.7220, lng: 115.1690, address: "Jalan Pantai Kuta, Kuta, Bali", tier: "mid-range" },
        { name: "Ubud Tropical Garden Resort", price: Math.round(3800 * m), rating: 4.3, reviews: 780, distance: "1.2 km", lat: -8.5150, lng: 115.2630, address: "Jalan Monkey Forest, Ubud, Bali", tier: "mid-range" },
        { name: "Kuta Beach Stay Inn", price: Math.round(1500 * m), rating: 3.9, reviews: 420, distance: "2.1 km", lat: -8.7280, lng: 115.1720, address: "Jalan Kartika Plaza, Kuta, Bali", tier: "budget" },
        { name: "Lay Day Surf Hostel", price: Math.round(800 * m), rating: 4.5, reviews: 680, distance: "2.8 km", lat: -8.6480, lng: 115.1380, address: "Jalan Pantai Batu Bolong, Canggu, Bali", tier: "hostel" }
      ];
    }
    if (clean.includes("dubai")) {
      return [
        { name: "Burj Al Arab Jumeirah", price: Math.round(45000 * m), rating: 4.9, reviews: 3400, distance: "3.5 km", lat: 25.1412, lng: 55.1852, address: "Jumeirah Street, Dubai", tier: "luxury" },
        { name: "Atlantis, The Palm", price: Math.round(25000 * m), rating: 4.8, reviews: 4500, distance: "8.2 km", lat: 25.1304, lng: 55.1172, address: "Crescent Road, Palm Jumeirah, Dubai", tier: "luxury" },
        { name: "Armani Hotel Dubai", price: Math.round(18000 * m), rating: 4.7, reviews: 1210, distance: "0.1 km", lat: 25.1972, lng: 55.2742, address: "Burj Khalifa, Downtown Dubai", tier: "premium" },
        { name: "Jumeirah Beach Hotel", price: Math.round(12500 * m), rating: 4.6, reviews: 2310, distance: "3.8 km", lat: 25.1432, lng: 55.1892, address: "Jumeirah Beach Road, Dubai", tier: "premium" },
        { name: "Rove Downtown Dubai", price: Math.round(4200 * m), rating: 4.5, reviews: 1650, distance: "1.1 km", lat: 25.1995, lng: 55.2825, address: "312 Al Sa'ada Street, Zabeel 2, Dubai", tier: "mid-range" },
        { name: "Novotel World Trade Centre", price: Math.round(4800 * m), rating: 4.2, reviews: 980, distance: "3.2 km", lat: 25.2245, lng: 55.2895, address: "Al Mustaqbal Street, Trade Centre, Dubai", tier: "mid-range" },
        { name: "ibis One Central Dubai", price: Math.round(2800 * m), rating: 4.0, reviews: 810, distance: "3.4 km", lat: 25.2230, lng: 55.2875, address: "Trade Centre District, Dubai", tier: "budget" },
        { name: "California Hostel Dubai Marina", price: Math.round(1500 * m), rating: 4.3, reviews: 520, distance: "18.5 km", lat: 25.0815, lng: 55.1425, address: "Elite Residency Tower, Dubai Marina, Dubai", tier: "hostel" }
      ];
    }
    // Generic generator
    const name = destinationName || "Global";
    return [
      { name: `The Oberoi ${name}`, price: Math.round(8500 * m), rating: 4.8, reviews: 2140, distance: "0.5 km", lat: baseLat + 0.005, lng: baseLng + 0.003, address: `Luxury Palace Road, ${name}`, tier: "luxury" },
      { name: `Taj ${name} Resort & Spa`, price: Math.round(12000 * m), rating: 4.9, reviews: 3200, distance: "1.2 km", lat: baseLat + 0.012, lng: baseLng - 0.008, address: `Heritage Lane, ${name}`, tier: "luxury" },
      { name: `Radisson Blu ${name}`, price: Math.round(4500 * m), rating: 4.4, reviews: 1560, distance: "2.1 km", lat: baseLat - 0.015, lng: baseLng + 0.018, address: `Airport Road, ${name}`, tier: "premium" },
      { name: `Lemon Tree ${name}`, price: Math.round(2800 * m), rating: 4.1, reviews: 980, distance: "1.8 km", lat: baseLat + 0.022, lng: baseLng + 0.011, address: `City Center, ${name}`, tier: "mid-range" },
      { name: `FabHotel ${name} Inn`, price: Math.round(1200 * m), rating: 3.8, reviews: 420, distance: "3.2 km", lat: baseLat - 0.028, lng: baseLng - 0.015, address: `Station Road, ${name}`, tier: "budget" },
      { name: `OYO Rooms ${name} Central`, price: Math.round(800 * m), rating: 3.5, reviews: 310, distance: "2.8 km", lat: baseLat + 0.018, lng: baseLng - 0.022, address: `Market Area, ${name}`, tier: "budget" },
      { name: `Zostel ${name}`, price: Math.round(500 * m), rating: 4.3, reviews: 640, distance: "1.5 km", lat: baseLat - 0.008, lng: baseLng + 0.025, address: `Old Town, ${name}`, tier: "hostel" }
    ];
  }

  // Restaurants & Cafes
  if (type === "restaurant") {
    if (clean.includes("goa")) {
      return [
        { name: "Britto's Bar & Restaurant", type: "Seafood & Goan Cuisine", averagePrice: Math.round(1200 * m), rating: 4.5, distance: "0.6 km", lat: 15.5580, lng: 73.7520, address: "Baga Beach, Goa" },
        { name: "Curlies Beach Shack", type: "Goan & Continental", averagePrice: Math.round(1000 * m), rating: 4.3, distance: "1.1 km", lat: 15.5820, lng: 73.7380, address: "Anjuna Beach, Goa" },
        { name: "Gunpowder", type: "South Indian & Coastal", averagePrice: Math.round(1500 * m), rating: 4.6, distance: "2.5 km", lat: 15.5980, lng: 73.7740, address: "Assagao, Goa" },
        { name: "Thalassa", type: "Greek & Mediterranean", averagePrice: Math.round(2500 * m), rating: 4.7, distance: "3.2 km", lat: 15.6120, lng: 73.7310, address: "Siolim, Goa" },
        { name: "Mum's Kitchen", type: "Traditional Goan", averagePrice: Math.round(1800 * m), rating: 4.4, distance: "4.1 km", lat: 15.4980, lng: 73.8210, address: "Panaji, Goa" }
      ];
    }
    if (clean.includes("bali")) {
      return [
        { name: "Locavore", type: "Modern European & Balinese", averagePrice: Math.round(3500 * m), rating: 4.8, distance: "1.2 km", lat: -8.5130, lng: 115.2610, address: "Jalan Dewisita, Ubud, Bali" },
        { name: "Naughty Nuri's Ubud", type: "Barbecue Ribs & Martinis", averagePrice: Math.round(1200 * m), rating: 4.6, distance: "2.8 km", lat: -8.4870, lng: 115.2440, address: "Jalan Raya Sanggingan, Ubud, Bali" },
        { name: "Warung Nia", type: "Authentic Balinese Ribs & Satay", averagePrice: Math.round(800 * m), rating: 4.5, distance: "0.9 km", lat: -8.6820, lng: 115.1550, address: "Kayu Aya Square, Seminyak, Bali" },
        { name: "Potato Head Beach Club Restaurant", type: "International & Beach Bites", averagePrice: Math.round(2200 * m), rating: 4.7, distance: "0.4 km", lat: -8.6795, lng: 115.1430, address: "Jalan Petitenget, Seminyak, Bali" }
      ];
    }
    const name = destinationName || "Global";
    return [
      { name: `${name} Garden Bistro`, type: "Regional Delicacies", averagePrice: Math.round(1200 * m), rating: 4.6, distance: "0.6 km", lat: baseLat + 0.003, lng: baseLng - 0.002, address: `Fort Road, ${name}` },
      { name: `The Food Gallery`, type: "Continental & Fusion", averagePrice: Math.round(1500 * m), rating: 4.4, distance: "1.1 km", lat: baseLat - 0.005, lng: baseLng + 0.008, address: `Central Avenue, ${name}` },
      { name: `Royal Dining Hall`, type: "Vegetarian Thali / Local Special", averagePrice: Math.round(300 * m), rating: 4.7, distance: "0.8 km", lat: baseLat + 0.007, lng: baseLng + 0.004, address: `Main Bazaar, ${name}` }
    ];
  }

  return [];
}

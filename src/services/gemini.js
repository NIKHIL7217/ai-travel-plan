/**
 * Gemini AI Service for AI Travel Planner
 */

import { geocodePlace, getRouteDistance } from "./routes";
import { fetchWeather } from "./weather";
import { fetchNearbyPlaces } from "./places";
import { userLocation } from "./location";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const REAL_DATA_ONLY = import.meta.env.VITE_REAL_DATA_ONLY !== "false";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

export function isGeminiConfigured() {
  return Boolean(API_KEY);
}

function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

function extractJsonObject(text) {
  if (!text) {
    return null;
  }

  const direct = safeJsonParse(text, null);
  if (direct && typeof direct === "object") {
    return direct;
  }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    const fenced = safeJsonParse(fenceMatch[1].trim(), null);
    if (fenced && typeof fenced === "object") {
      return fenced;
    }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = text.slice(firstBrace, lastBrace + 1);
    const parsed = safeJsonParse(sliced, null);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  }

  return null;
}

/**
 * Parses Google Maps URL or coordinates into latitude, longitude, and query string
 * @param {string} input 
 */
export function parseMapsInput(input) {
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

// Mock Destinations Database for popular locations
const MOCK_DESTINATIONS = [
  {
    id: "bali",
    name: "Bali",
    location: "Indonesia",
    rating: 4.8,
    startingBudget: 600,
    bestTime: "April to October",
    description: "Known for its forested volcanic mountains, iconic rice paddies, beaches, and coral reefs.",
    image: "/images/destinations/bali.png",
    attractions: [
      { name: "Uluwatu Temple", desc: "Clifftop sea temple with spectacular ocean views and traditional dances." },
      { name: "Tegallalang Rice Terraces", desc: "Scenic terraced slopes covered in lush green paddy fields." },
      { name: "Ubud Monkey Forest", desc: "Sanctuary containing historical temples inhabited by gray long-tailed macaques." }
    ],
    hotels: [
      { name: "Maya Ubud Resort & Spa", price: 180, rating: "⭐⭐⭐⭐⭐" },
      { name: "Seminyak Beach Cottage", price: 65, rating: "⭐⭐⭐⭐" }
    ],
    food: [
      { name: "Nasi Goreng", desc: "Indonesian style fried rice with vegetables, chicken, and egg." },
      { name: "Babi Guling", desc: "Traditional roasted suckling pig seasoned with local spice pastes." }
    ],
    tips: [
      "Rent a scooter for cheap local transport.",
      "Dress respectfully with a sarong when visiting sacred temples.",
      "Avoid drinking tap water directly; stick to sealed bottles."
    ],
    weather: { general: "Sunny and hot with gentle coastal winds", temp: "26°C - 31°C" }
  },
  {
    id: "dubai",
    name: "Dubai",
    location: "UAE",
    rating: 4.7,
    startingBudget: 1200,
    bestTime: "November to March",
    description: "Famous for luxury shopping, ultramodern architecture, and a lively nightlife scene.",
    image: "/images/destinations/dubai.png",
    attractions: [
      { name: "Burj Khalifa", desc: "The tallest building in the world offering panoramic views of the modern skyline." },
      { name: "Dubai Fountain", desc: "Choreographed water show dancing to lights and music in Downtown Dubai." },
      { name: "Museum of the Future", desc: "Exhibition space exploring future concepts, technology, and designs." }
    ],
    hotels: [
      { name: "Burj Al Arab Jumeirah", price: 950, rating: "⭐⭐⭐⭐⭐" },
      { name: "Marina View Hotel", price: 120, rating: "⭐⭐⭐⭐" }
    ],
    food: [
      { name: "Shawarma", desc: "Spiced meat roasted on a vertical spit, wrapped in warm pita bread." },
      { name: "Mandi", desc: "A traditional rice and meat dish slow-cooked underground with Arabic spices." }
    ],
    tips: [
      "Use the clean and fast Metro system to beat the traffic.",
      "Dress modestly in malls and public government buildings.",
      "Pre-book tickets for Burj Khalifa to save budget."
    ],
    weather: { general: "Dry desert heat with clear skies", temp: "28°C - 38°C" }
  },
  {
    id: "goa",
    name: "Goa",
    location: "India",
    rating: 4.6,
    startingBudget: 250,
    bestTime: "November to February",
    description: "Famous for its pristine sandy beaches, Portuguese architecture, and vibrant coastal shacks.",
    image: "/images/destinations/goa.png",
    attractions: [
      { name: "Basilica of Bom Jesus", desc: "UNESCO World Heritage site holding the sacred relics of St. Francis Xavier." },
      { name: "Dudhsagar Waterfalls", desc: "Four-tiered waterfall cascade resembling milk streaming down the hills." },
      { name: "Baga Beach shacks", desc: "Sandy shoreline loaded with water sports, beach bars, and night parties." }
    ],
    hotels: [
      { name: "Taj Exotica Resort & Spa", price: 220, rating: "⭐⭐⭐⭐⭐" },
      { name: "Calangute Beach Bungalow", price: 40, rating: "⭐⭐⭐⭐" }
    ],
    food: [
      { name: "Goan Fish Curry Rice", desc: "Spiced coconut-based fish curry served with warm steamed rice." },
      { name: "Bebinca", desc: "Layered traditional Goan sweet pudding cake made with coconut milk." }
    ],
    tips: [
      "Rent a scooter to explore both North and South Goa easily.",
      "Check out local shacks for the best beach food.",
      "Keep sunscreen and cotton clothes handy for tropical humidity."
    ],
    weather: { general: "Warm and tropical with sea breezes", temp: "25°C - 32°C" }
  },
  {
    id: "paris",
    name: "Paris",
    location: "France",
    rating: 4.9,
    startingBudget: 1100,
    bestTime: "April to October",
    description: "The global center for art, fashion, gastronomy, and iconic 19th-century architecture.",
    image: "/images/destinations/paris.png",
    attractions: [
      { name: "Eiffel Tower", desc: "Iconic wrought-iron lattice tower offering panoramic views of the Seine River." },
      { name: "Louvre Museum", desc: "The world's largest art museum holding the Mona Lisa and historic sculptures." },
      { name: "Arc de Triomphe", desc: "Monument honoring those who fought for France, sitting at the end of Champs-Élysées." }
    ],
    hotels: [
      { name: "Ritz Paris", price: 850, rating: "⭐⭐⭐⭐⭐" },
      { name: "Boutique Hotel Marais", price: 140, rating: "⭐⭐⭐⭐" }
    ],
    food: [
      { name: "Confit de Canard", desc: "Duck leg slow-cooked in its own fat until tender and crispy." },
      { name: "French Croissants", desc: "Flaky, buttery crescent-shaped pastries baked fresh at local bakeries." }
    ],
    tips: [
      "Buy a Paris Museum Pass to skip long lines at major sites.",
      "Use the Metro; it is cheap and connects every major arrondissement.",
      "Greeting shopkeepers with 'Bonjour' is customary and appreciated."
    ],
    weather: { general: "Mild temperatures with occasional light rain", temp: "12°C - 24°C" }
  },
  {
    id: "switzerland",
    name: "Switzerland",
    location: "Europe",
    rating: 4.9,
    startingBudget: 1500,
    bestTime: "June to September",
    description: "Renowned for its snow-capped Alpine peaks, pristine blue lakes, and picturesque villages.",
    image: "/images/destinations/switzerland.png",
    attractions: [
      { name: "Jungfraujoch", desc: "Scenic observatory called 'Top of Europe' sitting at 3,454m altitude." },
      { name: "Chapel Bridge Lucerne", desc: "Medieval wooden bridge adorned with interior triangular paintings." },
      { name: "Lake Geneva", desc: "Large crescent-shaped alpine lake shared between France and Switzerland." }
    ],
    hotels: [
      { name: "The Dolder Grand Zurich", price: 680, rating: "⭐⭐⭐⭐⭐" },
      { name: "Interlaken Alpine Lodge", price: 115, rating: "⭐⭐⭐⭐" }
    ],
    food: [
      { name: "Cheese Fondue", desc: "Melted alpine cheese served in a communal pot for dipping crusty bread." },
      { name: "Rösti", desc: "Grated, crispy pan-fried potato cake, often topped with eggs or bacon." }
    ],
    tips: [
      "Buy a Swiss Travel Pass for unlimited travel on trains, buses, and boats.",
      "Bring layered warm clothes, as temperatures drop quickly at high altitudes.",
      "Drinking water from street fountains is clean and free."
    ],
    weather: { general: "Cool mountain air with clear alpine skies", temp: "8°C - 20°C" }
  },
  {
    id: "thailand",
    name: "Thailand",
    location: "Asia",
    rating: 4.7,
    startingBudget: 500,
    bestTime: "November to February",
    description: "Famous for tropical beaches, opulent royal palaces, ancient ruins, and ornate temples.",
    image: "/images/destinations/thailand.png",
    attractions: [
      { name: "The Grand Palace Bangkok", desc: "Complex of royal buildings and temples, including Wat Phra Kaew." },
      { name: "Phi Phi Islands", desc: "Group of tropical islands containing Maya Bay and crystal coral lagoons." },
      { name: "Wat Arun", desc: "Stunning riverside Buddhist temple decorated with colored porcelain shards." }
    ],
    hotels: [
      { name: "Anantara Riverside Resort", price: 210, rating: "⭐⭐⭐⭐⭐" },
      { name: "Phuket Beach Guesthouse", price: 35, rating: "⭐⭐⭐⭐" }
    ],
    food: [
      { name: "Pad Thai", desc: "Stir-fried rice noodles with egg, tofu, bean sprouts, and peanuts." },
      { name: "Tom Yum Goong", desc: "Hot and sour soup cooked with prawns, lemongrass, and chili." }
    ],
    tips: [
      "Cover your shoulders and knees when entering Buddhist temples.",
      "Use Grab or local taxi apps for fair, transparent pricing.",
      "Street food stalls are safe, cheap, and offer excellent local flavors."
    ],
    weather: { general: "Tropical humidity with warm sun", temp: "24°C - 33°C" }
  }
];

/**
 * Resolves a real-time valid Unsplash photo URL based on the destination name
 */
export function resolveUnsplashImage(cityName) {
  const query = cityName.toLowerCase().trim();
  const unsplashPhotoIds = {
    tokyo: "photo-1503899036084-c55cdd92da26",
    london: "photo-1513635269975-59663e0ac1ad",
    newyork: "photo-1496442226666-8d4d0e62e6e9",
    "new york": "photo-1496442226666-8d4d0e62e6e9",
    nyc: "photo-1496442226666-8d4d0e62e6e9",
    sydney: "photo-1506973035872-a4ec16b8e8d9",
    rome: "photo-1552832230-c0197dd311b5",
    singapore: "photo-1525625293386-3f8f99389edd",
    udaipur: "photo-1615568261314-e0c1f51ee19d",
    delhi: "photo-1587474260584-136574528ed5",
    mumbai: "photo-1562158074-a5e2f75a7c29",
    goa: "photo-1512343879784-a960bf40e7f2",
    jaipur: "photo-1477584305590-38772bf2542a",
    agra: "photo-1564507592333-c60657eea523",
    tajmahal: "photo-1564507592333-c60657eea523",
    "taj mahal": "photo-1564507592333-c60657eea523",
    egypt: "photo-1539650116574-8efeb43e2750",
    cairo: "photo-1539650116574-8efeb43e2750",
    amsterdam: "photo-1513694203232-719a280e022f",
    barcelona: "photo-1539650116574-8efeb43e2750",
    kyoto: "photo-1493976040374-85c8e12f0c0e",
    maldives: "photo-1514282401047-d79a71a590e8"
  };

  const generalLandscapes = [
    "photo-1470071459604-3b5ec3a7fe05",
    "photo-1447752875215-b2761acb3c5d",
    "photo-1469474968028-56623f02e42e",
    "photo-1507525428034-b723cf961d3e",
    "photo-1476514525535-07fb3b4ae5f1",
    "photo-1533105079780-92b9be482077",
    "photo-1506744038136-46273834b3fb"
  ];

  let photoId = unsplashPhotoIds[query];
  if (!photoId) {
    const matchedKey = Object.keys(unsplashPhotoIds).find(k => query.includes(k));
    if (matchedKey) {
      photoId = unsplashPhotoIds[matchedKey];
    } else {
      let hash = 0;
      for (let i = 0; i < query.length; i++) {
        hash = query.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % generalLandscapes.length;
      photoId = generalLandscapes[index];
    }
  }

  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=800&q=80`;
}

/**
 * Returns matching destination profiles, appending a custom card if no match exists
 */
export async function generateDestinationSuggestions(query) {
  const q = String(query || "").trim();
  if (!q) {
    return REAL_DATA_ONLY ? [] : MOCK_DESTINATIONS;
  }

  if (API_KEY) {
    try {
      const prompt = `
        You are a travel discovery assistant. For user query "${q}", return real destination suggestions.
        Respond with a single valid JSON array only, no markdown.
        Each item must follow this schema:
        {
          "id": "lowercase-slug",
          "name": "City or destination name",
          "location": "Country or region",
          "rating": 4.5,
          "startingBudget": 900,
          "bestTime": "Month range",
          "description": "One sentence",
          "image": ""
        }
        Return between 4 and 8 items.
      `;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        const parsed = safeJsonParse(text, []);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => ({
            id: String(item.id || item.name || `destination-${idx}`).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
            name: item.name || "Destination",
            location: item.location || "Global",
            rating: Number(item.rating || 4.4),
            startingBudget: Math.max(0, Math.round(Number(item.startingBudget || 0))),
            bestTime: item.bestTime || "Season varies",
            description: item.description || "Popular travel destination.",
            image: item.image || resolveUnsplashImage(item.name || q)
          }));
        }
      }
    } catch (error) {
      console.warn("Failed to generate destination suggestions from Gemini:", error);
    }
  }

  if (REAL_DATA_ONLY) {
    return [];
  }

  const lower = query.toLowerCase().trim();
  const filtered = MOCK_DESTINATIONS.filter(
    d => d.name.toLowerCase().includes(lower) || d.location.toLowerCase().includes(lower)
  );

  // If the user is searching for a custom city that isn't in MOCK_DESTINATIONS, append a dynamically created profile suggestion
  if (filtered.length === 0 && query.length >= 2) {
    const formattedName = query.charAt(0).toUpperCase() + query.slice(1);
    filtered.push({
      id: lower.replace(/\s+/g, "-"),
      name: formattedName,
      location: "Global Destination",
      rating: 4.5,
      startingBudget: 800,
      bestTime: "All Year Round",
      description: `Discover the scenic landmarks, local cuisine, and culture of ${formattedName}.`,
      image: resolveUnsplashImage(formattedName)
    });
  }

  return filtered;
}

function fillIntelligenceFields(destData) {
  const mock = generateDynamicMockDestination(destData.name || "Destination");
  return {
    ...mock,
    ...destData,
    weatherForecast: destData.weatherForecast || mock.weatherForecast,
    transportOptions: destData.transportOptions || mock.transportOptions,
    accommodationOptions: destData.accommodationOptions || mock.accommodationOptions,
    foodCostAnalysis: destData.foodCostAnalysis || mock.foodCostAnalysis,
    nearbyExplorer: destData.nearbyExplorer || mock.nearbyExplorer,
    suitability: destData.suitability || mock.suitability,
    advantages: destData.advantages || mock.advantages,
    disadvantages: destData.disadvantages || mock.disadvantages
  };
}

/**
 * Fetches or synthesizes comprehensive details for any destination globally
 * @param {string} destId - ID or name of destination
 */
export async function getDestinationDetails(destId) {
  const cleanId = String(destId).toLowerCase().trim();
  const matched = MOCK_DESTINATIONS.find(d => d.id === cleanId);
  
  // 1. Geocode location to get coordinates and formatted name
  const rawName = matched ? matched.name : destId;
  const geo = await geocodePlace(rawName);
  
  let lat = geo ? geo.lat : (matched?.id === 'bali' ? -8.4095 : 24.5854);
  let lng = geo ? geo.lng : (matched?.id === 'bali' ? 115.1889 : 73.7125);
  let resolvedName = matched ? matched.name : destId;
  let country = matched ? matched.location : "Global Destination";

  // Check if we parsed coordinates
  const isCoords = cleanId.match(/^(-?\d+\.\d+)[\s,-]+(-?\d+\.\d+)$/) || (geo && geo.formattedName.match(/^(-?\d+\.\d+)[\s,-]+(-?\d+\.\d+)$/));
  
  if (isCoords) {
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    } else {
      const match = cleanId.match(/^(-?\d+\.\d+)[\s,-]+(-?\d+\.\d+)$/);
      lat = parseFloat(match[1]);
      lng = parseFloat(match[2]);
    }
    // Reverse geocode to get actual location names
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          resolvedName = data.address.city || data.address.town || data.address.suburb || data.address.village || "Analyzed Location";
          country = data.address.country || "Global Destination";
        }
      }
    } catch (e) {
      console.warn("Nominatim reverse geocode failed inside details:", e);
    }
  } else if (geo) {
    resolvedName = geo.formattedName.split(',')[0];
    country = geo.formattedName.split(',').pop().trim();
  }

  // 2. Fetch real weather and places in parallel
  const [weatherData, hotelsList, restaurantsList] = await Promise.all([
    fetchWeather(lat, lng),
    fetchNearbyPlaces(lat, lng, "lodging", resolvedName),
    fetchNearbyPlaces(lat, lng, "restaurant", resolvedName)
  ]);

  // Determine local currency
  let localCurrency = "US Dollar ($)";
  const cleanName = resolvedName.toLowerCase();
  const cleanCountry = country.toLowerCase();
  if (cleanCountry.includes("india") || cleanName.includes("goa") || cleanName.includes("udaipur")) {
    localCurrency = "Indian Rupee (₹)";
  } else if (cleanCountry.includes("united kingdom") || cleanCountry.includes("uk") || cleanName.includes("london")) {
    localCurrency = "British Pound (£)";
  } else if (cleanCountry.includes("france") || cleanCountry.includes("germany") || cleanCountry.includes("italy") || cleanCountry.includes("spain") || cleanCountry.includes("europe")) {
    localCurrency = "Euro (€)";
  } else if (cleanCountry.includes("japan") || cleanName.includes("tokyo") || cleanName.includes("kyoto")) {
    localCurrency = "Japanese Yen (¥)";
  } else if (cleanCountry.includes("united arab emirates") || cleanCountry.includes("uae") || cleanName.includes("dubai")) {
    localCurrency = "UAE Dirham (AED)";
  } else if (cleanCountry.includes("thailand") || cleanName.includes("thailand")) {
    localCurrency = "Thai Baht (฿)";
  } else if (cleanCountry.includes("singapore")) {
    localCurrency = "Singapore Dollar (SGD)";
  }

  // Calculate budget breakdown mathematically (based on hotel and restaurant averages)
  const avgHotelPrice = hotelsList.length > 0 ? hotelsList.reduce((sum, h) => sum + h.price, 0) / hotelsList.length : 5000;
  const avgRestPrice = restaurantsList.length > 0 ? restaurantsList.reduce((sum, r) => sum + r.averagePrice, 0) / restaurantsList.length : 600;
  
  // Convert INR base to USD base for budgetBreakdown since budgetBreakdown is USD-denominated
  const isRupee = localCurrency.includes("₹");
  const hotelInUsd = isRupee ? (avgHotelPrice / 83.5) : avgHotelPrice;
  const mealInUsd = isRupee ? (avgRestPrice / 83.5) : avgRestPrice;

  // Transit cost calculation (base flight USD)
  const routeDist = await getRouteDistance(userLocation.value.city || "New Delhi", { lat, lng });
  const distanceKm = routeDist ? routeDist.distance : 1500;
  const transitCostUsd = (2500 + distanceKm * 3.5) / 83.5;

  const budgetBreakdown = {
    flights: Math.round(transitCostUsd),
    lodging: Math.round(hotelInUsd * 4), // 4 nights stays
    meals: Math.round(mealInUsd * 5), // 5 days dining
    transport: Math.round((distanceKm * 0.15) / 83.5 + 40), // local transport estimate
    total: 0
  };
  budgetBreakdown.total = budgetBreakdown.flights + budgetBreakdown.lodging + budgetBreakdown.meals + budgetBreakdown.transport;

  // Compile full facts to feed to Gemini
  const facts = {
    name: resolvedName,
    location: country,
    lat,
    lng,
    weather: {
      temp: weatherData ? weatherData.temp : "24°C",
      humidity: weatherData ? weatherData.humidity : "60%",
      windSpeed: weatherData ? weatherData.windSpeed : "15 km/h",
      rainProbability: weatherData ? weatherData.rainProbability : "5%",
      aqi: weatherData ? weatherData.aqi : 45
    },
    hotels: hotelsList.map(h => h.name),
    restaurants: restaurantsList.map(r => r.name)
  };

  let aiResult = null;
  if (API_KEY) {
    try {
      const prompt = `
        You are a premium travel concierge. We have fetched the following real-time facts for "${resolvedName}, ${country}":
        Coordinates: ${lat}, ${lng}
        Weather: Temp ${facts.weather.temp}, AQI ${facts.weather.aqi}
        Local Stays: ${facts.hotels.slice(0,3).join(", ")}
        Local Dining: ${facts.restaurants.slice(0,3).join(", ")}

        Analyze these facts. Do NOT generate pricing, weather numbers, or distances.
        Return a single valid JSON object following this EXACT schema (do not wrap in markdown):
        {
          "description": "Short engaging 2-sentence description",
          "longDescription": "Detailed cultural and travel overview (3-4 sentences)",
          "bestTime": "Recommended season/months range",
          "attractions": [
            { "name": "Real attraction name", "desc": "1-sentence description" },
            { "name": "Another real attraction", "desc": "1-sentence description" },
            { "name": "Third real attraction", "desc": "1-sentence description" }
          ],
          "food": [
            { "name": "Local specialty dish", "desc": "1-sentence description of ingredients/flavor" },
            { "name": "Another local dish", "desc": "1-sentence description" }
          ],
          "tips": [
            "Local custom or etiquette tip",
            "Transit or transport tip",
            "Packing or seasonal tip"
          ]
        }
      `;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        const text = resJson.candidates[0].content.parts[0].text;
        aiResult = JSON.parse(text.trim());
      }
    } catch (e) {
      console.warn("Gemini overview analysis failed, using fallback:", e);
    }
  }

  // Fallback if AI fails or key is absent
  if (!aiResult) {
    if (REAL_DATA_ONLY) {
      aiResult = {
        description: `${resolvedName} travel profile based on currently available live location signals.`,
        longDescription: `${resolvedName} is being shown using live coordinates, weather, and nearby establishments. Detailed narrative insights are temporarily unavailable.`,
        bestTime: "Live season data unavailable",
        attractions: [],
        food: [],
        tips: []
      };
    } else {
    aiResult = {
      description: `${resolvedName} is a spectacular destination known for its local culture, sightseeing, and scenic views.`,
      longDescription: `A journey to ${resolvedName} in ${country} offers travelers a rich opportunity to explore local history, heritage landmarks, and curated activities. Highly recommended for couples, families, and solo adventurers looking to explore the region.`,
      bestTime: matched ? matched.bestTime : "October to March",
      attractions: [
        { name: `${resolvedName} City Center`, desc: "Vibrant pedestrian hub with local shops, street food, and historic architecture." },
        { name: `${resolvedName} Historic Gardens`, desc: "Beautiful landscape displays featuring local flora, walking trails, and seating areas." },
        { name: `${resolvedName} Viewpoint Point`, desc: "Breathtaking panoramic overlook of the entire valley and nearby landscape." }
      ],
      food: [
        { name: `Traditional ${resolvedName} Platter`, desc: "A combination of local grain bowls, grilled meats, and spices." },
        { name: `Signature Local Sweet`, desc: "Baked or fried sweet dessert local to the region." }
      ],
      tips: [
        "Use local transport apps for fair and transparent taxi rates.",
        "Check local dress codes and respect religious sites.",
        "Carry light layers as temperature shifts between day and night."
      ]
    };
    }
  }

  // Assemble full destination details object
  const rating = matched ? matched.rating : 4.6;
  const startingBudget = Math.round(budgetBreakdown.total);
  const flightHours = Math.max(1, Math.round((distanceKm / 750) * 10) / 10);

  return {
    id: cleanId,
    name: resolvedName,
    location: country,
    rating,
    reviewsCount: matched ? (matched.reviewsCount || 1240) : 740,
    startingBudget,
    bestTime: aiResult.bestTime,
    description: aiResult.description,
    longDescription: aiResult.longDescription,
    image: matched ? matched.image : `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80`,
    distanceFromHubs: `${distanceKm.toLocaleString()} km`,
    localCurrency,
    aqi: facts.weather.aqi,
    travelScore: Math.round(75 + (lat % 15) + (lng % 10)),
    safetyScore: Math.round(80 + (lat % 8) - (lng % 5)),
    advantages: REAL_DATA_ONLY ? [] : ["Stunning local scenery and view spots", "Real local culinary delicacies", "Friendly neighborhood environment"],
    disadvantages: REAL_DATA_ONLY ? [] : ["Can get crowded during peak weather seasons", "Premium hotels have high peak season pricing"],
    suitability: {
      family: REAL_DATA_ONLY ? "Live suitability insights unavailable" : "Very suitable with parks and family accommodations.",
      solo: REAL_DATA_ONLY ? "Live suitability insights unavailable" : "Highly rated for solo safety and hostels availability.",
      couple: REAL_DATA_ONLY ? "Live suitability insights unavailable" : "Scenic view spots make it perfect for couples.",
      budget: REAL_DATA_ONLY ? "Live suitability insights unavailable" : "Affordable street dinings and hostels lower standard trip budgets."
    },
    weatherForecast: weatherData ? weatherData.weatherForecast : [],
    transportOptions: {
      flights: { lowest: Math.round(transitCostUsd * 0.8), average: Math.round(transitCostUsd), duration: `${flightHours}h` },
      trains: { cost: Math.round(transitCostUsd * 0.25), duration: `${Math.round(distanceKm / 55)}h` },
      buses: { cost: Math.round(transitCostUsd * 0.15), duration: `${Math.round(distanceKm / 50)}h` },
      taxi: { fare: Math.round(transitCostUsd * 0.4) }
    },
    accommodationOptions: {
      hostels: [
        { name: `${resolvedName} Backpackers`, price: Math.round(hotelInUsd * 0.15), rating: 4.2, reviews: 84, distance: "1.1 km" }
      ],
      budget: [
        { name: `${resolvedName} Stay Inn`, price: Math.round(hotelInUsd * 0.35), rating: 4.0, reviews: 142, distance: "2.5 km" }
      ],
      comfort: [
        { name: `${resolvedName} Comfort Suites`, price: Math.round(hotelInUsd * 0.7), rating: 4.4, reviews: 320, distance: "1.8 km" }
      ],
      luxury: [
        { name: `${resolvedName} Luxury Resort`, price: Math.round(hotelInUsd * 1.5), rating: 4.8, reviews: 520, distance: "0.5 km" }
      ]
    },
    foodCostAnalysis: {
      budgetDaily: Math.round(mealInUsd * 0.5),
      midRangeDaily: Math.round(mealInUsd),
      luxuryDaily: Math.round(mealInUsd * 2.5),
      popularRestaurants: restaurantsList
    },
    nearbyExplorer: {
      hospitals: [
        { name: `${resolvedName} Memorial Hospital`, distance: "2.1 km", rating: 4.5, lat: lat + 0.01, lng: lng - 0.01, address: "Central Hospital Road" }
      ],
      fuelStations: [
        { name: "Indian Oil Pump", distance: "0.8 km", rating: 4.1, lat: lat - 0.005, lng: lng + 0.005, address: "Main Highway", types: ["Petrol", "Diesel"] }
      ],
      restaurants: restaurantsList.slice(0, 3)
    },
    budgetBreakdown,
    attractions: aiResult.attractions,
    food: aiResult.food,
    tips: aiResult.tips,
    weather: facts.weather
  };
}

/**
 * Dynamically synthesizes a high-fidelity travel profile for any custom destination entered by the user
 */
function generateDynamicMockDestination(destId) {
  const rawId = String(destId).replace(/-/g, " ");
  const parts = rawId.split(",");
  const rawName = parts[0].trim();
  let name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  let location = parts[1] ? parts[1].trim().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "Global Destination";
  
  if (!isNaN(parseFloat(name)) && parts[1] && !isNaN(parseFloat(parts[1]))) {
    location = `Lat: ${parseFloat(name).toFixed(4)}, Lng: ${parseFloat(parts[1]).toFixed(4)}`;
    name = "Analyzed Coordinates";
  }
  
  const query = name.toLowerCase();

  const image = resolveUnsplashImage(name);

  // Dynamic distance based on simple hash calculations
  let charSum = 0;
  for (let i = 0; i < query.length; i++) charSum += query.charCodeAt(i);
  const flightHrs = (charSum % 12) + 2;
  const kmDist = flightHrs * 750;
  const distanceFromHubs = `${kmDist.toLocaleString()} km (${flightHrs}h flight)`;

  // Currency matching
  let localCurrency = "US Dollar ($)";
  const euCountries = ["france", "germany", "italy", "spain", "netherlands", "greece", "europe", "ukraine", "austria", "belgium"];
  const inCountries = ["india", "rajasthan", "goa", "kerala", "delhi", "mumbai", "udaipur", "jaipur"];
  const ukCountries = ["uk", "united kingdom", "london", "scotland", "england"];
  const jpCountries = ["japan", "tokyo", "kyoto", "osaka"];

  if (euCountries.some(c => query.includes(c) || location.toLowerCase().includes(c))) {
    localCurrency = "Euro (€)";
  } else if (inCountries.some(c => query.includes(c) || location.toLowerCase().includes(c))) {
    localCurrency = "Indian Rupee (₹)";
  } else if (ukCountries.some(c => query.includes(c) || location.toLowerCase().includes(c))) {
    localCurrency = "British Pound (£)";
  } else if (jpCountries.some(c => query.includes(c) || location.toLowerCase().includes(c))) {
    localCurrency = "Japanese Yen (¥)";
  } else if (query.includes("dubai") || location.toLowerCase().includes("uae") || location.toLowerCase().includes("dubai")) {
    localCurrency = "UAE Dirham (AED)";
  } else if (query.includes("thailand") || location.toLowerCase().includes("thailand")) {
    localCurrency = "Thai Baht (฿)";
  } else if (query.includes("singapore") || location.toLowerCase().includes("singapore")) {
    localCurrency = "Singapore Dollar (SGD)";
  }

  // Budget item multipliers
  const multiplier = (charSum % 5) * 0.2 + 0.6; // range 0.6 to 1.4
  const flights = Math.round(350 * multiplier);
  const lodging = Math.round(300 * multiplier);
  const meals = Math.round(120 * multiplier);
  const transport = Math.round(70 * multiplier);
  const total = flights + lodging + meals + transport;

  // Weather Forecast
  const weatherForecast = [
    { day: "Today", temp: `${Math.round(20 * multiplier)}°C - ${Math.round(28 * multiplier)}°C`, general: "Partly Cloudy", aqi: Math.round(45 * multiplier) },
    { day: "Tomorrow", temp: `${Math.round(21 * multiplier)}°C - ${Math.round(29 * multiplier)}°C`, general: "Sunny", aqi: Math.round(42 * multiplier) },
    { day: "Friday", temp: `${Math.round(19 * multiplier)}°C - ${Math.round(27 * multiplier)}°C`, general: "Chance of Rain", aqi: Math.round(50 * multiplier) },
    { day: "Saturday", temp: `${Math.round(18 * multiplier)}°C - ${Math.round(26 * multiplier)}°C`, general: "Rainy", aqi: Math.round(55 * multiplier) },
    { day: "Sunday", temp: `${Math.round(20 * multiplier)}°C - ${Math.round(28 * multiplier)}°C`, general: "Sunny", aqi: Math.round(38 * multiplier) },
    { day: "Monday", temp: `${Math.round(22 * multiplier)}°C - ${Math.round(30 * multiplier)}°C`, general: "Sunny", aqi: Math.round(40 * multiplier) },
    { day: "Tuesday", temp: `${Math.round(21 * multiplier)}°C - ${Math.round(29 * multiplier)}°C`, general: "Partly Cloudy", aqi: Math.round(44 * multiplier) }
  ];

  // Transport options
  const transportOptions = {
    flights: { lowest: flights, average: Math.round(flights * 1.3), duration: `${flightHrs}h` },
    trains: { cost: Math.round(flights * 0.25), duration: `${flightHrs * 4.5}h` },
    buses: { cost: Math.round(flights * 0.15), duration: `${flightHrs * 6}h` },
    taxi: { fare: Math.round(flights * 0.08) }
  };

  // Stays options
  const accommodationOptions = {
    budgetHotels: [
      { name: `${name} Inn & Suites`, price: Math.round(45 * multiplier), rating: "⭐⭐⭐⭐", reviews: 245, distance: "1.2 km", image: resolveUnsplashImage(`${name} Hotel`) },
      { name: `${name} Standard Lodge`, price: Math.round(35 * multiplier), rating: "⭐⭐⭐", reviews: 128, distance: "2.5 km", image: resolveUnsplashImage(`${name} Motel`) }
    ],
    premiumHotels: [
      { name: `${name} Premier Suites`, price: Math.round(110 * multiplier), rating: "⭐⭐⭐⭐", reviews: 512, distance: "0.8 km", image: resolveUnsplashImage(`${name} Premium`) },
      { name: `${name} Boutique Stay`, price: Math.round(95 * multiplier), rating: "⭐⭐⭐⭐", reviews: 320, distance: "1.5 km", image: resolveUnsplashImage(`${name} Boutique`) }
    ],
    luxuryResorts: [
      { name: `The Imperial ${name} Resort`, price: Math.round(280 * multiplier), rating: "⭐⭐⭐⭐⭐", reviews: 840, distance: "0.2 km", image: resolveUnsplashImage(`${name} Luxury`) }
    ],
    hostels: [
      { name: `Backpackers Hub ${name}`, price: Math.round(18 * multiplier), rating: "⭐⭐⭐⭐", reviews: 92, distance: "1.9 km", image: resolveUnsplashImage(`${name} Hostel`) }
    ],
    airbnbOptions: [
      { name: `Scenic View Penthouse ${name}`, price: Math.round(85 * multiplier), rating: "⭐⭐⭐⭐⭐", reviews: 180, distance: "2.1 km", image: resolveUnsplashImage(`${name} Apartment`) }
    ]
  };

  // Food analysis
  const foodCostAnalysis = {
    budgetDaily: Math.round(15 * multiplier),
    midRangeDaily: Math.round(45 * multiplier),
    luxuryDaily: Math.round(120 * multiplier),
    popularRestaurants: [
      { name: `The Local ${name} Kitchen`, type: "Regional Cuisine", averagePrice: Math.round(12 * multiplier) },
      { name: `${name} Heights Bistro`, type: "Fine Dining", averagePrice: Math.round(48 * multiplier) }
    ]
  };

  // GPS nearby explorer
  const nearbyExplorer = {
    attractions: [
      { name: `${name} Heritage Fort`, distance: "3.2 km", rating: 4.7 },
      { name: `${name} Overlook Point`, distance: "1.5 km", rating: 4.8 }
    ],
    restaurants: [
      { name: `Flavors of ${name}`, distance: "0.6 km", rating: 4.4 },
      { name: `${name} Garden Cafe`, distance: "1.1 km", rating: 4.5 }
    ],
    hotels: [
      { name: `${name} Inn`, distance: "1.2 km", rating: 4.2 }
    ],
    hospitals: [
      { name: `${name} Memorial Hospital`, distance: "2.8 km", rating: 4.6 },
      { name: `City Central Clinic`, distance: "1.4 km", rating: 4.1 }
    ],
    fuelStations: [
      { name: `HP Fuel Station`, distance: "0.8 km", rating: 4.3 },
      { name: `IndianOil Station`, distance: "2.1 km", rating: 4.0 }
    ]
  };

  return {
    id: destId.toLowerCase(),
    name: name,
    location: location,
    rating: 4.5,
    reviewsCount: Math.floor(multiplier * 1240),
    startingBudget: Math.round(750 * multiplier),
    bestTime: "September to November",
    description: `${name} is a gorgeous destination offering unique local traditions, landmarks, and memorable sightseeing coordinates.`,
    longDescription: `Traveling to ${name} offers an unparalleled opportunity to explore rich historical traditions alongside local hospitality. The destination features spectacular views, architectural landmarks, and curated activities suitable for all age groups.`,
    image: image,
    distanceFromHubs: distanceFromHubs,
    localCurrency: localCurrency,
    aqi: Math.round(45 * multiplier),
    travelScore: Math.round(82 + (charSum % 15)),
    safetyScore: Math.round(75 + (charSum % 20)),
    advantages: ["Stunning natural scenery and landscapes", "Rich historical sites and monuments", "Warm local hospitality and culture"],
    disadvantages: ["Can be crowded during peak seasons", "Higher accommodation costs in premium hubs"],
    suitability: {
      family: "Very suitable due to family resort choices and clean parks.",
      solo: "Great hosteling options and safety ratings.",
      couple: "Scenic sunset points and private dining experiences.",
      budget: "Affordable local street dining options are widely available."
    },
    weatherForecast: weatherForecast,
    transportOptions: transportOptions,
    accommodationOptions: accommodationOptions,
    foodCostAnalysis: foodCostAnalysis,
    nearbyExplorer: nearbyExplorer,
    budgetBreakdown: {
      flights,
      lodging,
      meals,
      transport,
      total
    },
    attractions: [
      { name: `${name} City Center`, desc: "Vibrant pedestrian hub with local shops and architectural sights." },
      { name: `${name} Botanical Park`, desc: "Lush green gardens displaying local plant varieties and quiet walking trails." },
      { name: `${name} Historic Museum`, desc: `Gallery showcasing artifacts and chronicling the regional heritage of ${name}.` }
    ],
    hotels: [
      { name: `${name} Grand Plaza`, price: Math.round(150 * multiplier), rating: "⭐⭐⭐⭐⭐" },
      { name: `${name} Travellers Lodge`, price: Math.round(50 * multiplier), rating: "⭐⭐⭐⭐" }
    ],
    food: [
      { name: `Signature ${name} Platter`, desc: "A combination of local grain bowls, grilled meats, and spices." },
      { name: `Traditional Sweet`, desc: `Baked or fried sweet dessert local to the ${name} region.` }
    ],
    tips: [
      `Review local transport schedules to coordinate commutes.`,
      `Dress respectfully and note regional dining etiquette.`,
      `Exchange a small amount of cash for local street vendors.`
    ],
    weather: { general: "Partly cloudy with pleasant evening breezes", temp: "18°C - 26°C" }
  };
}

// ==========================================
// ROUTE INTELLIGENCE ENGINE
// ==========================================

/**
 * Deterministic hash helper for consistent mock data
 */
function cityHash(str) {
  let hash = 0;
  const s = String(str).toLowerCase().trim();
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * Known road distances between major Indian cities and popular destinations (in km)
 * Used as lookup for more accurate fallback data
 */
const KNOWN_DISTANCES = {
  "mumbai-goa": 590, "delhi-agra": 233, "delhi-jaipur": 281, "mumbai-pune": 149,
  "delhi-mumbai": 1420, "delhi-goa": 1880, "mumbai-udaipur": 662, "delhi-udaipur": 660,
  "bangalore-goa": 560, "chennai-bangalore": 350, "kolkata-delhi": 1530,
  "mumbai-ahmedabad": 524, "delhi-shimla": 350, "delhi-manali": 530,
  "delhi-rishikesh": 250, "mumbai-jaipur": 1150, "hyderabad-goa": 650,
  "chennai-goa": 880, "bangalore-mumbai": 980, "pune-goa": 450,
  "ahmedabad-udaipur": 260, "jaipur-udaipur": 395, "delhi-chandigarh": 250,
  "mumbai-bangalore": 980, "delhi-varanasi": 820, "kolkata-mumbai": 2050
};

function lookupKnownDistance(origin, destination) {
  const o = origin.toLowerCase().trim();
  const d = destination.toLowerCase().trim();
  const key1 = `${o}-${d}`;
  const key2 = `${d}-${o}`;
  return KNOWN_DISTANCES[key1] || KNOWN_DISTANCES[key2] || null;
}

/**
 * Generate realistic fuel stops along a route
 */
function generateFuelStops(origin, destination, distance) {
  const fuelBrands = ["Indian Oil", "HP Petroleum", "Bharat Petroleum", "Shell", "Reliance", "Nayara Energy", "Essar Petrol Pump"];
  const evStations = ["Tata Power EZ Charge", "Ather Grid", "Statiq EV Station", "ChargeZone Hub", "Fortum Charge"];
  
  const numStops = Math.max(2, Math.min(8, Math.floor(distance / 150)));
  const stops = [];
  const h = cityHash(origin + destination);
  
  // Generate intermediate city names based on route
  const intermediateCities = [
    "Anand", "Vadodara", "Surat", "Nashik", "Ahmedabad", "Rajkot", "Ajmer",
    "Kota", "Indore", "Bhopal", "Nagpur", "Aurangabad", "Hubli", "Belgaum",
    "Satara", "Kolhapur", "Solapur", "Pali", "Abu Road", "Nathdwara",
    "Baroda", "Bharuch", "Valsad", "Thane", "Lonavala", "Mahabaleshwar"
  ];
  
  for (let i = 0; i < numStops; i++) {
    const kmMarker = Math.round((distance / (numStops + 1)) * (i + 1));
    const cityIdx = (h + i * 7) % intermediateCities.length;
    const brandIdx = (h + i * 3) % fuelBrands.length;
    const evIdx = (h + i * 5) % evStations.length;
    
    stops.push({
      petrolDiesel: {
        name: fuelBrands[brandIdx],
        city: intermediateCities[cityIdx],
        kmFromStart: kmMarker,
        lat: 20 + (h % 10) + (i * 0.8),
        lng: 72 + (h % 8) + (i * 0.5)
      },
      evCharging: {
        name: evStations[evIdx],
        city: intermediateCities[cityIdx],
        kmFromStart: kmMarker + Math.round(Math.random() * 5),
        lat: 20 + (h % 10) + (i * 0.8) + 0.01,
        lng: 72 + (h % 8) + (i * 0.5) + 0.02,
        chargingType: i % 2 === 0 ? "DC Fast (50kW)" : "AC Slow (7.4kW)",
        estimatedChargeTime: i % 2 === 0 ? "25-40 min" : "2-3 hours"
      }
    });
  }
  return stops;
}

/**
 * Generate mock route intelligence between two cities
 */
function generateRouteIntelligenceMock(origin, destination) {
  const h = cityHash(origin + destination);
  
  // Calculate road distance
  let roadDistance = lookupKnownDistance(origin, destination);
  if (!roadDistance) {
    // Hash-based distance that creates consistent, plausible distances
    roadDistance = 200 + (h % 2000);
  }
  
  const flightDistance = Math.round(roadDistance * 0.82); // Air routes are shorter
  const flightHours = Math.max(1, Math.round((flightDistance / 800) * 10) / 10);
  const carHours = Math.max(2, Math.round((roadDistance / 65) * 10) / 10); // Avg 65 km/h
  const trainHours = Math.max(3, Math.round((roadDistance / 55) * 10) / 10); // Avg 55 km/h
  const bikeHours = Math.max(3, Math.round((roadDistance / 50) * 10) / 10); // Avg 50 km/h
  
  // Fuel prices (INR per litre / kWh)
  const petrolPrice = 104.21;
  const dieselPrice = 92.15;
  const cngPrice = 76.59;
  const electricityCostPerKwh = 8.5;
  
  // Vehicle mileage assumptions (km/litre or km/kWh)
  const carPetrolMileage = 14;
  const carDieselMileage = 18;
  const carCngMileage = 22;
  const carElectricRange = 6.5; // km per kWh
  const bikePetrolMileage = 45;
  const bikeDieselMileage = 35; // Diesel bikes rare but included
  const bikeElectricRange = 8; // km per kWh
  
  // Calculate fuel costs
  const carPetrolCost = Math.round((roadDistance / carPetrolMileage) * petrolPrice);
  const carDieselCost = Math.round((roadDistance / carDieselMileage) * dieselPrice);
  const carCngCost = Math.round((roadDistance / carCngMileage) * cngPrice);
  const carElectricCost = Math.round((roadDistance / carElectricRange) * electricityCostPerKwh);
  
  const bikePetrolCost = Math.round((roadDistance / bikePetrolMileage) * petrolPrice);
  const bikeDieselCost = Math.round((roadDistance / bikeDieselMileage) * dieselPrice);
  const bikeElectricCost = Math.round((roadDistance / bikeElectricRange) * electricityCostPerKwh);
  
  // Flight cost estimation
  const flightEconomy = Math.round(2500 + (flightDistance * 3.5) + (h % 2000));
  const flightBusiness = Math.round(flightEconomy * 2.8);
  
  // Train cost estimation
  const trainSleeper = Math.round(roadDistance * 0.55 + 100);
  const trainAC3 = Math.round(roadDistance * 1.2 + 200);
  const trainAC2 = Math.round(roadDistance * 1.8 + 350);
  const trainAC1 = Math.round(roadDistance * 2.8 + 500);
  
  // Toll estimation
  const tollCost = Math.round(roadDistance * 1.2);
  
  // Fuel stops
  const fuelStops = generateFuelStops(origin, destination, roadDistance);
  
  // EV charging stops needed
  const evBatteryRange = 350; // km per full charge for car
  const evBikeBatteryRange = 150; // km per full charge for bike
  const carEvStopsNeeded = Math.max(0, Math.ceil(roadDistance / evBatteryRange) - 1);
  const bikeEvStopsNeeded = Math.max(0, Math.ceil(roadDistance / evBikeBatteryRange) - 1);
  
  const originClean = origin.charAt(0).toUpperCase() + origin.slice(1);
  const destClean = destination.charAt(0).toUpperCase() + destination.slice(1);
  
  return {
    origin: originClean,
    destination: destClean,
    roadDistance,
    flightDistance,
    routeSummary: `${originClean} → ${destClean} • ${roadDistance} km road • ${flightHours}h flight`,
    
    vehicleBreakdown: {
      flight: {
        icon: "✈️",
        label: "Flight",
        duration: `${flightHours}h`,
        distance: `${flightDistance} km`,
        options: [
          { class: "Economy", cost: flightEconomy, currency: "₹" },
          { class: "Business", cost: flightBusiness, currency: "₹" }
        ],
        airports: {
          origin: `${originClean} Airport`,
          destination: `${destClean} Airport`
        }
      },
      train: {
        icon: "🚆",
        label: "Train",
        duration: `${trainHours}h`,
        distance: `${roadDistance} km`,
        options: [
          { class: "Sleeper (SL)", cost: trainSleeper, currency: "₹" },
          { class: "AC 3-Tier", cost: trainAC3, currency: "₹" },
          { class: "AC 2-Tier", cost: trainAC2, currency: "₹" },
          { class: "AC 1st Class", cost: trainAC1, currency: "₹" }
        ],
        stations: {
          origin: `${originClean} Junction`,
          destination: `${destClean} Railway Station`
        }
      },
      car: {
        icon: "🚗",
        label: "Car",
        duration: `${carHours}h`,
        distance: `${roadDistance} km`,
        tollCost,
        fuelTypes: [
          {
            type: "Petrol",
            icon: "⛽",
            mileage: `${carPetrolMileage} km/L`,
            fuelNeeded: `${(roadDistance / carPetrolMileage).toFixed(1)} L`,
            fuelPrice: `₹${petrolPrice}/L`,
            totalFuelCost: carPetrolCost,
            totalWithToll: carPetrolCost + tollCost,
            currency: "₹"
          },
          {
            type: "Diesel",
            icon: "⛽",
            mileage: `${carDieselMileage} km/L`,
            fuelNeeded: `${(roadDistance / carDieselMileage).toFixed(1)} L`,
            fuelPrice: `₹${dieselPrice}/L`,
            totalFuelCost: carDieselCost,
            totalWithToll: carDieselCost + tollCost,
            currency: "₹"
          },
          {
            type: "CNG",
            icon: "🟢",
            mileage: `${carCngMileage} km/kg`,
            fuelNeeded: `${(roadDistance / carCngMileage).toFixed(1)} kg`,
            fuelPrice: `₹${cngPrice}/kg`,
            totalFuelCost: carCngCost,
            totalWithToll: carCngCost + tollCost,
            currency: "₹"
          },
          {
            type: "Electric (EV)",
            icon: "🔋",
            mileage: `${carElectricRange} km/kWh`,
            fuelNeeded: `${(roadDistance / carElectricRange).toFixed(1)} kWh`,
            fuelPrice: `₹${electricityCostPerKwh}/kWh`,
            totalFuelCost: carElectricCost,
            totalWithToll: carElectricCost + tollCost,
            currency: "₹",
            chargingStopsNeeded: carEvStopsNeeded,
            batteryRange: `${evBatteryRange} km/charge`
          }
        ]
      },
      bike: {
        icon: "🏍️",
        label: "Bike",
        duration: `${bikeHours}h`,
        distance: `${roadDistance} km`,
        fuelTypes: [
          {
            type: "Petrol",
            icon: "⛽",
            mileage: `${bikePetrolMileage} km/L`,
            fuelNeeded: `${(roadDistance / bikePetrolMileage).toFixed(1)} L`,
            fuelPrice: `₹${petrolPrice}/L`,
            totalFuelCost: bikePetrolCost,
            currency: "₹"
          },
          {
            type: "Diesel",
            icon: "⛽",
            mileage: `${bikeDieselMileage} km/L`,
            fuelNeeded: `${(roadDistance / bikeDieselMileage).toFixed(1)} L`,
            fuelPrice: `₹${dieselPrice}/L`,
            totalFuelCost: bikeDieselCost,
            currency: "₹"
          },
          {
            type: "Electric (EV)",
            icon: "🔋",
            mileage: `${bikeElectricRange} km/kWh`,
            fuelNeeded: `${(roadDistance / bikeElectricRange).toFixed(1)} kWh`,
            fuelPrice: `₹${electricityCostPerKwh}/kWh`,
            totalFuelCost: bikeElectricCost,
            currency: "₹",
            chargingStopsNeeded: bikeEvStopsNeeded,
            batteryRange: `${evBikeBatteryRange} km/charge`
          }
        ]
      },
      bus: {
        icon: "🚌",
        label: "Bus",
        duration: `${Math.max(1, Math.round(roadDistance / 55))}h`,
        distance: `${roadDistance} km`,
        options: [
          { class: "Regular AC Seat", cost: Math.round(roadDistance * 1.5), currency: "₹" },
          { class: "Luxury Sleeper AC", cost: Math.round(roadDistance * 2.5), currency: "₹" }
        ],
        stations: {
          origin: `${originClean} Inter-State Bus Terminus (ISBT)`,
          destination: `${destClean} Bus Station`
        }
      }
    },
    
    fuelStops
  };
}

export function normalizeRouteData(route) {
  if (!route) return null;
  if (!route.vehicleBreakdown) route.vehicleBreakdown = {};
  
  const modes = ['flight', 'train', 'bus', 'car', 'bike'];
  
  // Normalize car & bike fuel types
  ['car', 'bike'].forEach(vKey => {
    const v = route.vehicleBreakdown[vKey];
    if (v && v.fuelTypes) {
      v.fuelTypes = v.fuelTypes.map(ft => {
        const mileageNum = ft.mileageNum || parseFloat(ft.mileage?.replace(/[^\d.]/g, '')) || 15;
        const fuelNeededNum = ft.fuelNeededNum || parseFloat(ft.fuelNeeded?.replace(/[^\d.]/g, '')) || 40;
        const fuelPriceNum = ft.fuelPriceNum || parseFloat(ft.fuelPrice?.replace(/[^\d.]/g, '')) || 100;
        const unit = ft.unit || (ft.mileage?.includes('kg') ? 'kg' : (ft.mileage?.includes('kWh') ? 'kWh' : 'L'));
        
        return {
          ...ft,
          mileageNum,
          fuelNeededNum,
          fuelPriceNum,
          unit
        };
      });
    }
  });
  return route;
}

/**
 * Fetches route intelligence via Gemini API or falls back to mock
 * @param {string} origin - Starting city
 * @param {string} destination - Destination city  
 */
export async function getRouteIntelligence(origin, destination) {
  if (!origin || !destination) return null;
  
  if (API_KEY) {
    try {
      const prompt = `
        You are an expert Indian travel logistics analyst. Calculate the complete route intelligence between "${origin}" and "${destination}" in India.
        
        CRITICAL: Use your knowledge of REAL road distances, flight routes, and train routes between these cities. The data must be as accurate as possible.
        
        Return a single valid JSON object (no markdown). Follow this EXACT schema:
        {
          "origin": "${origin}",
          "destination": "${destination}",
          "roadDistance": 662,
          "flightDistance": 540,
          "routeSummary": "${origin} → ${destination} • 662 km road • 1.5h flight",
          "vehicleBreakdown": {
            "flight": {
              "icon": "✈️",
              "label": "Flight",
              "duration": "1.5h",
              "distance": "540 km",
              "options": [
                { "class": "Economy", "cost": 4500, "currency": "₹" },
                { "class": "Business", "cost": 12500, "currency": "₹" }
              ],
              "airports": { "origin": "Real airport name", "destination": "Real airport name" }
            },
            "train": {
              "icon": "🚆",
              "label": "Train",
              "duration": "12h",
              "distance": "662 km",
              "options": [
                { "class": "Sleeper (SL)", "cost": 450, "currency": "₹" },
                { "class": "AC 3-Tier", "cost": 1200, "currency": "₹" },
                { "class": "AC 2-Tier", "cost": 1800, "currency": "₹" },
                { "class": "AC 1st Class", "cost": 2800, "currency": "₹" }
              ],
              "stations": { "origin": "Real station name", "destination": "Real station name" }
            },
            "car": {
              "icon": "🚗",
              "label": "Car",
              "duration": "10h",
              "distance": "662 km",
              "tollCost": 800,
              "fuelTypes": [
                { "type": "Petrol", "icon": "⛽", "mileage": "14 km/L", "fuelNeeded": "47.3 L", "fuelPrice": "₹104.21/L", "totalFuelCost": 4929, "totalWithToll": 5729, "currency": "₹" },
                { "type": "Diesel", "icon": "⛽", "mileage": "18 km/L", "fuelNeeded": "36.8 L", "fuelPrice": "₹92.15/L", "totalFuelCost": 3391, "totalWithToll": 4191, "currency": "₹" },
                { "type": "CNG", "icon": "🟢", "mileage": "22 km/kg", "fuelNeeded": "30.1 kg", "fuelPrice": "₹76.59/kg", "totalFuelCost": 2305, "totalWithToll": 3105, "currency": "₹" },
                { "type": "Electric (EV)", "icon": "🔋", "mileage": "6.5 km/kWh", "fuelNeeded": "101.8 kWh", "fuelPrice": "₹8.5/kWh", "totalFuelCost": 866, "totalWithToll": 1666, "currency": "₹", "chargingStopsNeeded": 1, "batteryRange": "350 km/charge" }
              ]
            },
            "bike": {
              "icon": "🏍️",
              "label": "Bike",
              "duration": "13h",
              "distance": "662 km",
              "fuelTypes": [
                { "type": "Petrol", "icon": "⛽", "mileage": "45 km/L", "fuelNeeded": "14.7 L", "fuelPrice": "₹104.21/L", "totalFuelCost": 1532, "currency": "₹" },
                { "type": "Diesel", "icon": "⛽", "mileage": "35 km/L", "fuelNeeded": "18.9 L", "fuelPrice": "₹92.15/L", "totalFuelCost": 1742, "currency": "₹" },
                { "type": "Electric (EV)", "icon": "🔋", "mileage": "8 km/kWh", "fuelNeeded": "82.8 kWh", "fuelPrice": "₹8.5/kWh", "totalFuelCost": 703, "currency": "₹", "chargingStopsNeeded": 3, "batteryRange": "150 km/charge" }
              ]
            }
          },
          "fuelStops": [
            {
              "petrolDiesel": { "name": "Real fuel station brand name", "city": "Real intermediate city name", "kmFromStart": 150, "lat": 24.58, "lng": 73.71 },
              "evCharging": { "name": "Real EV charging brand name", "city": "Same city", "kmFromStart": 152, "lat": 24.59, "lng": 73.72, "chargingType": "DC Fast (50kW)", "estimatedChargeTime": "30 min" }
            }
          ]
        }
        
        IMPORTANT RULES:
        1. Use REAL road distances you know between these cities
        2. Use REAL airport names and railway station names
        3. Use REAL fuel station brands (Indian Oil, HP, BPCL, Shell, etc.)
        4. Use REAL intermediate cities along the actual highway route
        5. Generate 3-6 fuel stops depending on distance
        6. All costs in Indian Rupees (₹)
        7. Current fuel prices: Petrol ₹104.21/L, Diesel ₹92.15/L, CNG ₹76.59/kg, Electricity ₹8.5/kWh
      `;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(text.trim());
        return normalizeRouteData(parsed);
      }
    } catch (e) {
      console.warn("Failed to fetch route intelligence from Gemini:", e);
    }
  }

  if (REAL_DATA_ONLY) {
    return null;
  }
  
  // Fallback to deterministic mock
  return normalizeRouteData(generateRouteIntelligenceMock(origin, destination));
}

/**
 * Generates real location data (hotels, restaurants, hospitals, fuel stations) with coordinates
 * via Gemini AI, or falls back to mock data
 */
export async function getRealLocationData(destinationName) {
  if (API_KEY) {
    try {
      const prompt = `
        You are a travel location intelligence system. For the destination "${destinationName}", provide REAL, well-known establishments.
        
        Return a single valid JSON object (no markdown):
        {
          "hotels": [
            { "name": "Real Hotel Name", "price": 3500, "rating": 4.5, "reviews": 1240, "distance": "1.2 km", "lat": 24.5854, "lng": 73.7125, "address": "Real address", "tier": "luxury" },
            { "name": "Another Real Hotel", "price": 1200, "rating": 4.0, "reviews": 890, "distance": "2.5 km", "lat": 24.5712, "lng": 73.6918, "address": "Real address", "tier": "budget" }
          ],
          "restaurants": [
            { "name": "Real Restaurant Name", "type": "Cuisine Type", "averagePrice": 800, "rating": 4.3, "distance": "0.8 km", "lat": 24.5800, "lng": 73.7050, "address": "Real address" }
          ],
          "hospitals": [
            { "name": "Real Hospital Name", "distance": "2.8 km", "rating": 4.6, "lat": 24.5712, "lng": 73.6918, "address": "Real address", "phone": "+91-XXXXXXXXXX" }
          ],
          "fuelStations": [
            { "name": "Real Fuel Station Brand + Location", "distance": "0.8 km", "rating": 4.3, "lat": 24.5900, "lng": 73.7200, "address": "Real address", "types": ["Petrol", "Diesel", "CNG"] }
          ],
          "evChargingStations": [
            { "name": "Real EV Station Name", "distance": "1.5 km", "rating": 4.2, "lat": 24.5850, "lng": 73.7100, "address": "Real address", "chargingType": "DC Fast 50kW", "connector": "CCS2" }
          ]
        }
        
        RULES:
        1. Include 6-8 hotels (mix of budget, mid-range, premium, luxury)
        2. Include 4-6 restaurants (mix of cuisines)
        3. Include 2-3 hospitals/clinics
        4. Include 3-4 fuel stations with real brand names
        5. Include 2-3 EV charging stations
        6. Use REAL establishment names that actually exist in ${destinationName}
        7. Use realistic GPS coordinates for ${destinationName}
        8. All prices in Indian Rupees (₹)
      `;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        return JSON.parse(text.trim());
      }
    } catch (e) {
      console.warn("Failed to fetch real location data from Gemini:", e);
    }
  }

  if (REAL_DATA_ONLY) {
    return {
      hotels: [],
      restaurants: [],
      hospitals: [],
      fuelStations: [],
      evChargingStations: []
    };
  }
  
  // Fallback to mock location data with coordinates
  return generateMockLocationData(destinationName);
}

function generateMockLocationData(destinationName) {
  const name = destinationName.charAt(0).toUpperCase() + destinationName.slice(1);
  const clean = destinationName.toLowerCase().trim();
  const h = cityHash(destinationName);
  
  // Custom Coordinates based on actual cities
  let baseLat = 24.5854;
  let baseLng = 73.7125;
  if (clean.includes("goa")) {
    baseLat = 15.2993; baseLng = 74.1240;
  } else if (clean.includes("bali")) {
    baseLat = -8.4095; baseLng = 115.1889;
  } else if (clean.includes("dubai")) {
    baseLat = 25.2048; baseLng = 55.2708;
  } else if (clean.includes("paris")) {
    baseLat = 48.8566; baseLng = 2.3522;
  } else if (clean.includes("switzerland")) {
    baseLat = 46.8182; baseLng = 8.2275;
  } else if (clean.includes("thailand")) {
    baseLat = 13.7563; baseLng = 100.5018;
  } else if (clean.includes("udaipur")) {
    baseLat = 24.5854; baseLng = 73.7125;
  } else {
    // Semi-random deterministic coordinates
    baseLat = 20 + (h % 12);
    baseLng = 72 + (h % 10);
  }
  
  const m = (h % 5) * 0.2 + 0.6;

  // Specific data sets
  if (clean.includes("goa")) {
    return {
      hotels: [
        { name: "Taj Exotica Resort & Spa", price: Math.round(14500 * m), rating: 4.8, reviews: 2140, distance: "0.5 km", lat: 15.2750, lng: 73.9280, address: "Benaulim Beach, Goa", tier: "luxury" },
        { name: "The Leela Goa", price: Math.round(16000 * m), rating: 4.9, reviews: 3200, distance: "1.2 km", lat: 15.1630, lng: 73.9920, address: "Cavelossim Beach, Goa", tier: "luxury" },
        { name: "Caravela Beach Resort", price: Math.round(7500 * m), rating: 4.5, reviews: 1560, distance: "2.1 km", lat: 15.2150, lng: 73.9480, address: "Varca Beach, Goa", tier: "premium" },
        { name: "Lemon Tree Amarante Beach Resort", price: Math.round(4800 * m), rating: 4.2, reviews: 980, distance: "1.8 km", lat: 15.5320, lng: 73.7630, address: "Candolim Beach Road, Goa", tier: "premium" },
        { name: "ibis Styles Goa Calangute", price: Math.round(3200 * m), rating: 4.1, reviews: 780, distance: "1.9 km", lat: 15.5410, lng: 73.7680, address: "Calangute-Baga Road, Goa", tier: "mid-range" },
        { name: "Arambol Beach Inn", price: Math.round(1200 * m), rating: 3.8, reviews: 420, distance: "3.2 km", lat: 15.6880, lng: 73.7050, address: "Arambol Beach Road, Goa", tier: "budget" },
        { name: "Calangute Beach Rooms", price: Math.round(800 * m), rating: 3.5, reviews: 310, distance: "2.8 km", lat: 15.5450, lng: 73.7550, address: "Umta Vaddo, Calangute, Goa", tier: "budget" },
        { name: "Zostel Goa (Morjim)", price: Math.round(500 * m), rating: 4.4, reviews: 640, distance: "1.5 km", lat: 15.6310, lng: 73.7220, address: "Morjim Beach Road, Goa", tier: "hostel" }
      ],
      restaurants: [
        { name: "Britto's Bar & Restaurant", type: "Seafood & Goan Cuisine", averagePrice: Math.round(1200 * m), rating: 4.5, distance: "0.6 km", lat: 15.5580, lng: 73.7520, address: "Baga Beach, Goa" },
        { name: "Curlies Beach Shack", type: "Goan & Continental", averagePrice: Math.round(1000 * m), rating: 4.3, distance: "1.1 km", lat: 15.5820, lng: 73.7380, address: "Anjuna Beach, Goa" },
        { name: "Gunpowder", type: "South Indian & Coastal", averagePrice: Math.round(1500 * m), rating: 4.6, distance: "2.5 km", lat: 15.5980, lng: 73.7740, address: "Assagao, Goa" },
        { name: "Thalassa", type: "Greek & Mediterranean", averagePrice: Math.round(2500 * m), rating: 4.7, distance: "3.2 km", lat: 15.6120, lng: 73.7310, address: "Siolim, Goa" },
        { name: "Mum's Kitchen", type: "Traditional Goan", averagePrice: Math.round(1800 * m), rating: 4.4, distance: "4.1 km", lat: 15.4980, lng: 73.8210, address: "Panaji, Goa" }
      ],
      hospitals: [
        { name: "Manipal Hospital Goa", distance: "2.8 km", rating: 4.6, lat: 15.4590, lng: 73.8120, address: "Dona Paula, Panaji, Goa", phone: "+91-832-3048888" },
        { name: "Goa Medical College & Hospital", distance: "6.5 km", rating: 4.4, lat: 15.4610, lng: 73.8580, address: "Bambolim, Goa", phone: "+91-832-2458727" },
        { name: "Victor Hospital", distance: "15.4 km", rating: 4.2, lat: 15.2710, lng: 73.9620, address: "Malbhat, Margao, Goa", phone: "+91-832-6728888" }
      ],
      fuelStations: [
        { name: "Indian Oil - Panaji Petrol Pump", distance: "1.5 km", rating: 4.2, lat: 15.4950, lng: 73.8280, address: "Patto Plaza, Panaji, Goa", types: ["Petrol", "Diesel"] },
        { name: "HP Petroleum - Calangute Auto", distance: "2.1 km", rating: 4.0, lat: 15.5420, lng: 73.7690, address: "Calangute Road, Goa", types: ["Petrol", "Diesel", "CNG"] },
        { name: "Bharat Petroleum - Margao Pump", distance: "18.2 km", rating: 4.1, lat: 15.2810, lng: 73.9610, address: "Aquem, Margao, Goa", types: ["Petrol", "Diesel"] },
        { name: "Shell - Highway Goa", distance: "8.5 km", rating: 4.5, lat: 15.4210, lng: 73.9180, address: "NH-66 Highway, Goa", types: ["Petrol", "Diesel", "EV Charging"] }
      ],
      evChargingStations: [
        { name: "Tata Power EV Charging - Panaji Gymkhana", distance: "1.8 km", rating: 4.3, lat: 15.4910, lng: 73.8180, address: "Campal, Panaji, Goa", chargingType: "DC Fast 50kW", connector: "CCS2" },
        { name: "Ather Grid - Calangute Charging Station", distance: "2.5 km", rating: 4.1, lat: 15.5380, lng: 73.7610, address: "Calangute Mall, Goa", chargingType: "AC 7.4kW", connector: "Type 2" },
        { name: "Tata Power EV Station - Margao Residency", distance: "18.5 km", rating: 4.4, lat: 15.2750, lng: 73.9580, address: "Colva Road, Margao, Goa", chargingType: "DC Fast 60kW", connector: "CCS2" }
      ]
    };
  }

  if (clean.includes("bali")) {
    return {
      hotels: [
        { name: "The Ritz-Carlton, Bali", price: Math.round(22500 * m), rating: 4.9, reviews: 1420, distance: "1.5 km", lat: -8.8290, lng: 115.2160, address: "Jalan Raya Nusa Dua Selatan, Bali", tier: "luxury" },
        { name: "Four Seasons Resort Bali at Sayan", price: Math.round(28000 * m), rating: 4.9, reviews: 1100, distance: "3.2 km", lat: -8.4980, lng: 115.2420, address: "Jalan Raya Sayan, Ubud, Bali", tier: "luxury" },
        { name: "W Bali - Seminyak", price: Math.round(14500 * m), rating: 4.7, reviews: 1890, distance: "0.2 km", lat: -8.6790, lng: 115.1480, address: "Jalan Petitenget, Seminyak, Bali", tier: "premium" },
        { name: "Ayana Resort Bali", price: Math.round(12500 * m), rating: 4.8, reviews: 2600, distance: "5.1 km", lat: -8.7710, lng: 115.1220, address: "Karang Mas Sejahtera, Jimbaran, Bali", tier: "premium" },
        { name: "Hard Rock Hotel Bali", price: Math.round(6500 * m), rating: 4.4, reviews: 3120, distance: "0.8 km", lat: -8.7220, lng: 115.1690, address: "Jalan Pantai Kuta, Kuta, Bali", tier: "mid-range" },
        { name: "Ubud Tropical Garden Resort", price: Math.round(3800 * m), rating: 4.3, reviews: 780, distance: "1.2 km", lat: -8.5150, lng: 115.2630, address: "Jalan Monkey Forest, Ubud, Bali", tier: "mid-range" },
        { name: "Kuta Beach Stay Inn", price: Math.round(1500 * m), rating: 3.9, reviews: 420, distance: "2.1 km", lat: -8.7280, lng: 115.1720, address: "Jalan Kartika Plaza, Kuta, Bali", tier: "budget" },
        { name: "Lay Day Surf Hostel", price: Math.round(800 * m), rating: 4.5, reviews: 680, distance: "2.8 km", lat: -8.6480, lng: 115.1380, address: "Jalan Pantai Batu Bolong, Canggu, Bali", tier: "hostel" }
      ],
      restaurants: [
        { name: "Locavore", type: "Modern European & Balinese", averagePrice: Math.round(3500 * m), rating: 4.8, distance: "1.2 km", lat: -8.5130, lng: 115.2610, address: "Jalan Dewisita, Ubud, Bali" },
        { name: "Naughty Nuri's Ubud", type: "Barbecue Ribs & Martinis", averagePrice: Math.round(1200 * m), rating: 4.6, distance: "2.8 km", lat: -8.4870, lng: 115.2440, address: "Jalan Raya Sanggingan, Ubud, Bali" },
        { name: "Warung Nia", type: "Authentic Balinese Ribs & Satay", averagePrice: Math.round(800 * m), rating: 4.5, distance: "0.9 km", lat: -8.6820, lng: 115.1550, address: "Kayu Aya Square, Seminyak, Bali" },
        { name: "Potato Head Beach Club Restaurant", type: "International & Beach Bites", averagePrice: Math.round(2200 * m), rating: 4.7, distance: "0.4 km", lat: -8.6795, lng: 115.1430, address: "Jalan Petitenget, Seminyak, Bali" },
        { name: "Sari Organik", type: "Fresh Organic & Healthy Bowl", averagePrice: Math.round(600 * m), rating: 4.4, distance: "1.8 km", lat: -8.5020, lng: 115.2570, address: "Jalan Subak Sok Wayah, Ubud, Bali" }
      ],
      hospitals: [
        { name: "BIMC Hospital Nusa Dua", distance: "2.5 km", rating: 4.7, lat: -8.8020, lng: 115.2280, address: "Kawasan ITDC Blok D, Nusa Dua, Bali", phone: "+62-361-3000911" },
        { name: "Siloam Hospitals Bali", distance: "5.8 km", rating: 4.5, lat: -8.7110, lng: 115.1880, address: "Jalan Sunset Road, Kuta, Bali", phone: "+62-361-779900" },
        { name: "Kasih Ibu General Hospital Denpasar", distance: "12.2 km", rating: 4.2, lat: -8.6780, lng: 115.2120, address: "Jalan Teuku Umar, Denpasar, Bali", phone: "+62-361-3003030" }
      ],
      fuelStations: [
        { name: "Pertamina SPBU - Sunset Road Kuta", distance: "1.1 km", rating: 4.2, lat: -8.7090, lng: 115.1830, address: "Sunset Road No. 88, Kuta, Bali", types: ["Petrol", "Diesel"] },
        { name: "Pertamina SPBU - Ubud Central", distance: "2.8 km", rating: 4.0, lat: -8.5080, lng: 115.2670, address: "Jalan Raya Ubud, Bali", types: ["Petrol"] },
        { name: "Pertamina SPBU - Seminyak", distance: "1.5 km", rating: 4.1, lat: -8.6850, lng: 115.1590, address: "Jalan Raya Kerobokan, Seminyak, Bali", types: ["Petrol", "Diesel"] }
      ],
      evChargingStations: [
        { name: "PLN SPKLU Charging Hub - ITDC Nusa Dua", distance: "2.6 km", rating: 4.6, lat: -8.8030, lng: 115.2240, address: "Kawasan ITDC Park, Nusa Dua, Bali", chargingType: "DC Fast 50kW", connector: "CCS2" },
        { name: "Pertamina EV Green Charging - Denpasar", distance: "12.4 km", rating: 4.3, lat: -8.6810, lng: 115.2080, address: "Jalan Teuku Umar No. 10, Denpasar, Bali", chargingType: "DC Fast 25kW", connector: "CCS2 / CHAdeMO" }
      ]
    };
  }

  if (clean.includes("dubai")) {
    return {
      hotels: [
        { name: "Burj Al Arab Jumeirah", price: Math.round(45000 * m), rating: 4.9, reviews: 3400, distance: "3.5 km", lat: 25.1412, lng: 55.1852, address: "Jumeirah Street, Dubai", tier: "luxury" },
        { name: "Atlantis, The Palm", price: Math.round(25000 * m), rating: 4.8, reviews: 4500, distance: "8.2 km", lat: 25.1304, lng: 55.1172, address: "Crescent Road, Palm Jumeirah, Dubai", tier: "luxury" },
        { name: "Armani Hotel Dubai", price: Math.round(18000 * m), rating: 4.7, reviews: 1210, distance: "0.1 km", lat: 25.1972, lng: 55.2742, address: "Burj Khalifa, Downtown Dubai", tier: "premium" },
        { name: "Jumeirah Beach Hotel", price: Math.round(12500 * m), rating: 4.6, reviews: 2310, distance: "3.8 km", lat: 25.1432, lng: 55.1892, address: "Jumeirah Beach Road, Dubai", tier: "premium" },
        { name: "Rove Downtown Dubai", price: Math.round(4200 * m), rating: 4.5, reviews: 1650, distance: "1.1 km", lat: 25.1995, lng: 55.2825, address: "312 Al Sa'ada Street, Zabeel 2, Dubai", tier: "mid-range" },
        { name: "Novotel World Trade Centre", price: Math.round(4800 * m), rating: 4.2, reviews: 980, distance: "3.2 km", lat: 25.2245, lng: 55.2895, address: "Al Mustaqbal Street, Trade Centre, Dubai", tier: "mid-range" },
        { name: "ibis One Central Dubai", price: Math.round(2800 * m), rating: 4.0, reviews: 810, distance: "3.4 km", lat: 25.2230, lng: 55.2875, address: "Trade Centre District, Dubai", tier: "budget" },
        { name: "California Hostel Dubai Marina", price: Math.round(1500 * m), rating: 4.3, reviews: 520, distance: "18.5 km", lat: 25.0815, lng: 55.1425, address: "Elite Residency Tower, Dubai Marina, Dubai", tier: "hostel" }
      ],
      restaurants: [
        { name: "Al Ustadadi Special Kebab", type: "Persian & Iranian Grill", averagePrice: Math.round(800 * m), rating: 4.7, distance: "5.5 km", lat: 25.2595, lng: 55.2995, address: "Al Mussallah Road, Bur Dubai" },
        { name: "Zuma Dubai", type: "Japanese Fine Dining", averagePrice: Math.round(4500 * m), rating: 4.8, distance: "1.8 km", lat: 25.2135, lng: 55.2805, address: "Gate Village 6, DIFC, Dubai" },
        { name: "Arabian Tea House Cafe", type: "Traditional Emirati & Arabian", averagePrice: Math.round(1200 * m), rating: 4.6, distance: "5.2 km", lat: 25.2635, lng: 55.3005, address: "Al Fahidi Street, Bur Dubai" },
        { name: "Pierchic", type: "Seafood Fine Dining", averagePrice: Math.round(3500 * m), rating: 4.7, distance: "3.9 km", lat: 25.1415, lng: 55.1835, address: "Al Qasr, Madinat Jumeirah, Dubai" },
        { name: "Ravi Restaurant Satwa", type: "Pakistani & Indian curry", averagePrice: Math.round(500 * m), rating: 4.4, distance: "3.1 km", lat: 25.2285, lng: 55.2755, address: "Al Satwa Road, Satwa, Dubai" }
      ],
      hospitals: [
        { name: "Rashid Hospital", distance: "4.8 km", rating: 4.5, lat: 25.2395, lng: 55.3185, address: "Oud Metha Road, Dubai", phone: "+971-4-2192000" },
        { name: "Aster Hospital Mankhool", distance: "5.5 km", rating: 4.4, lat: 25.2490, lng: 55.2950, address: "Al Mankhool Road, Bur Dubai", phone: "+971-4-5090300" },
        { name: "Saudi German Hospital Dubai", distance: "14.2 km", rating: 4.3, lat: 25.0935, lng: 55.1875, address: "Al Barsha 3, Sheikh Zayed Road", phone: "+971-4-3890000" }
      ],
      fuelStations: [
        { name: "ENOC Station - Sheikh Zayed Road", distance: "0.8 km", rating: 4.3, lat: 25.1915, lng: 55.2695, address: "Sheikh Zayed Road, Near Business Bay", types: ["Petrol", "Diesel"] },
        { name: "ADNOC Station - Al Barsha", distance: "6.2 km", rating: 4.1, lat: 25.1115, lng: 55.1995, address: "Al Barsha 1, Dubai", types: ["Petrol", "Diesel"] },
        { name: "Eppco Pump - Deira", distance: "8.5 km", rating: 4.0, lat: 25.2615, lng: 55.3225, address: "Al Ittihad Road, Deira, Dubai", types: ["Petrol"] }
      ],
      evChargingStations: [
        { name: "DEWA EV Charging Station - Dubai Mall", distance: "0.9 km", rating: 4.5, lat: 25.1975, lng: 55.2795, address: "Dubai Mall Grand Parking P3", chargingType: "DC Fast 50kW", connector: "CCS2" },
        { name: "Tesla Supercharger - Mall of the Emirates", distance: "6.5 km", rating: 4.7, lat: 25.1175, lng: 55.2015, address: "MoE Parking Level 1", chargingType: "Tesla Supercharger 150kW", connector: "Tesla / CCS2" }
      ]
    };
  }

  if (clean.includes("paris")) {
    return {
      hotels: [
        { name: "The Ritz Paris", price: Math.round(55000 * m), rating: 4.9, reviews: 1240, distance: "1.8 km", lat: 48.8681, lng: 2.3294, address: "15 Place Vendôme, Paris", tier: "luxury" },
        { name: "Le Meurice Hotel", price: Math.round(48000 * m), rating: 4.9, reviews: 980, distance: "1.5 km", lat: 48.8646, lng: 2.3278, address: "228 Rue de Rivoli, Paris", tier: "luxury" },
        { name: "Pullman Paris Tour Eiffel", price: Math.round(18000 * m), rating: 4.6, reviews: 3120, distance: "3.5 km", lat: 48.8558, lng: 2.2925, address: "18 Avenue de Suffren, Paris", tier: "premium" },
        { name: "Hotel Regina Louvre", price: Math.round(14500 * m), rating: 4.5, reviews: 1560, distance: "1.4 km", lat: 48.8633, lng: 2.3323, address: "2 Place des Pyramides, Paris", tier: "premium" },
        { name: "Hotel Caron de Beaumarchais", price: Math.round(6200 * m), rating: 4.4, reviews: 680, distance: "0.8 km", lat: 48.8576, lng: 2.3582, address: "12 Rue Vieille-du-Temple, Paris", tier: "mid-range" },
        { name: "Hotel de Nell", price: Math.round(8200 * m), rating: 4.3, reviews: 540, distance: "2.1 km", lat: 48.8741, lng: 2.3443, address: "9 Rue du Conservatoire, Paris", tier: "mid-range" },
        { name: "Generator Paris Hostel", price: Math.round(2500 * m), rating: 4.1, reviews: 2980, distance: "3.2 km", lat: 48.8801, lng: 2.3684, address: "9-11 Place du Colonel Fabien, Paris", tier: "hostel" },
        { name: "St Christopher's Inn Gare du Nord", price: Math.round(2100 * m), rating: 4.0, reviews: 4200, distance: "2.8 km", lat: 48.8812, lng: 2.3592, address: "5 Rue de Dunkerque, Paris", tier: "hostel" }
      ],
      restaurants: [
        { name: "Le Jules Verne", type: "Gastronomic French", averagePrice: Math.round(6500 * m), rating: 4.8, distance: "3.5 km", lat: 48.8584, lng: 2.2945, address: "Eiffel Tower, 2nd Floor, Paris" },
        { name: "L'Ambroisie", type: "Classic French Fine Dining", averagePrice: Math.round(8500 * m), rating: 4.9, distance: "1.2 km", lat: 48.8552, lng: 2.3656, address: "9 Place des Vosges, Paris" },
        { name: "Bouillon Chartier", type: "Traditional Parisian Bouillon", averagePrice: Math.round(1200 * m), rating: 4.4, distance: "2.1 km", lat: 48.8718, lng: 2.3431, address: "7 Rue du Faubourg Montmartre, Paris" },
        { name: "Café de Flore", type: "Classic French Cafe & Croissants", averagePrice: Math.round(900 * m), rating: 4.3, distance: "2.4 km", lat: 48.8542, lng: 2.3287, address: "172 Boulevard Saint-Germain, Paris" },
        { name: "L'As du Fallafel", type: "Famous Street Falafel", averagePrice: Math.round(450 * m), rating: 4.6, distance: "0.9 km", lat: 48.8574, lng: 2.3589, address: "34 Rue des Rosiers, Paris" }
      ],
      hospitals: [
        { name: "Hôpital Necker Enfants Malades", distance: "3.8 km", rating: 4.6, lat: 48.8442, lng: 2.3155, address: "149 Rue de Sèvres, Paris", phone: "+33-1-44494000" },
        { name: "American Hospital of Paris", distance: "6.5 km", rating: 4.5, lat: 48.8955, lng: 2.2715, address: "63 Boulevard Victor Hugo, Neuilly-sur-Seine", phone: "+33-1-46412525" }
      ],
      fuelStations: [
        { name: "TotalEnergies Station - Porte d'Orléans", distance: "4.5 km", rating: 4.1, lat: 48.8212, lng: 2.3252, address: "Avenue de la Porte d'Orléans, Paris", types: ["Petrol", "Diesel"] },
        { name: "BP Station - Boulevard Périphérique", distance: "5.2 km", rating: 3.9, lat: 48.8912, lng: 2.3922, address: "Porte de Pantin, Paris", types: ["Petrol", "Diesel"] }
      ],
      evChargingStations: [
        { name: "Bélib' Charging Station - Place de la Concorde", distance: "1.8 km", rating: 4.4, lat: 48.8656, lng: 2.3212, address: "Place de la Concorde, Paris", chargingType: "AC 22kW / DC 50kW", connector: "Type 2 / CCS2" },
        { name: "TotalEnergies EV Charging Hub - Gare du Nord", distance: "2.8 km", rating: 4.3, lat: 48.8808, lng: 2.3556, address: "Gare du Nord Parking, Paris", chargingType: "DC Fast 100kW", connector: "CCS2" }
      ]
    };
  }

  if (clean.includes("switzerland") || clean.includes("swiss")) {
    return {
      hotels: [
        { name: "The Dolder Grand, Zurich", price: Math.round(48000 * m), rating: 4.9, reviews: 1650, distance: "15.2 km", lat: 47.3732, lng: 8.5732, address: "Kurhausstrasse 65, Zurich", tier: "luxury" },
        { name: "Badrutt's Palace Hotel, St. Moritz", price: Math.round(52000 * m), rating: 4.9, reviews: 890, distance: "85.2 km", lat: 46.4972, lng: 9.8392, address: "Via Serlas 27, St. Moritz", tier: "luxury" },
        { name: "Hotel Schweizerhof Luzern", price: Math.round(22000 * m), rating: 4.7, reviews: 1120, distance: "0.2 km", lat: 47.0545, lng: 8.3115, address: "Schweizerhofquai, Lucerne", tier: "premium" },
        { name: "Victoria-Jungfrau Grand Hotel", price: Math.round(28000 * m), rating: 4.8, reviews: 1350, distance: "18.2 km", lat: 46.6865, lng: 7.8565, address: "Höheweg 41, Interlaken", tier: "premium" },
        { name: "Hotel Belvedere Grindelwald", price: Math.round(14500 * m), rating: 4.6, reviews: 880, distance: "24.5 km", lat: 46.6235, lng: 8.0315, address: "Dorfstrasse 53, Grindelwald", tier: "mid-range" },
        { name: "Hotel Alpina Zermatt", price: Math.round(9200 * m), rating: 4.4, reviews: 650, distance: "65.2 km", lat: 46.0232, lng: 7.7492, address: "Bahnhofstrasse, Zermatt", tier: "mid-range" },
        { name: "Interlaken Youth Hostel", price: Math.round(3500 * m), rating: 4.2, reviews: 1240, distance: "18.5 km", lat: 46.6908, lng: 7.8698, address: "Untere Bönigstrasse 3, Interlaken", tier: "budget" },
        { name: "Balmers Hostel Interlaken", price: Math.round(2200 * m), rating: 4.4, reviews: 1560, distance: "19.1 km", lat: 46.6795, lng: 7.8645, address: "Hauptstrasse 23, Interlaken", tier: "hostel" }
      ],
      restaurants: [
        { name: "Restaurant Whymper-Stube", type: "Swiss Fondue & Raclette", averagePrice: Math.round(2500 * m), rating: 4.7, distance: "65.1 km", lat: 46.0225, lng: 7.7485, address: "Bahnhofstrasse, Zermatt" },
        { name: "Zunfthaus zur Waag", type: "Traditional Zurich Emincé", averagePrice: Math.round(3800 * m), rating: 4.6, distance: "15.4 km", lat: 47.3705, lng: 8.5415, address: "Münsterhof 8, Zurich" },
        { name: "Restaurant Balances", type: "French & Alpine Fine Dining", averagePrice: Math.round(4200 * m), rating: 4.7, distance: "0.3 km", lat: 47.0528, lng: 8.3075, address: "Metzgerrainle 7, Lucerne" },
        { name: "Latteria Interlaken", type: "Italian & Alpine Bistro", averagePrice: Math.round(1800 * m), rating: 4.3, distance: "18.4 km", lat: 46.6845, lng: 7.8545, address: "Jungfraustrasse, Interlaken" }
      ],
      hospitals: [
        { name: "University Hospital Zurich", distance: "15.8 km", rating: 4.7, lat: 47.3785, lng: 8.5495, address: "Rämistrasse 100, Zurich", phone: "+41-44-2551111" },
        { name: "Inselspital Bern", distance: "45.2 km", rating: 4.6, lat: 46.9475, lng: 7.4225, address: "Freiburgstrasse 18, Bern", phone: "+41-31-6322111" }
      ],
      fuelStations: [
        { name: "Avia Station - Lucerne", distance: "1.2 km", rating: 4.1, lat: 47.0455, lng: 8.3095, address: "Haldenstrasse, Lucerne", types: ["Petrol", "Diesel"] },
        { name: "Migrol Service - Zurich", distance: "15.1 km", rating: 4.0, lat: 47.3685, lng: 8.5325, address: "Bellerivestrasse, Zurich", types: ["Petrol", "Diesel"] },
        { name: "Shell - Interlaken Station", distance: "18.1 km", rating: 4.3, lat: 46.6888, lng: 7.8512, address: "Kanalpromenade, Interlaken", types: ["Petrol", "Diesel", "EV Charging"] }
      ],
      evChargingStations: [
        { name: "IONITY Fast Charging Hub - Lucerne South", distance: "2.8 km", rating: 4.5, lat: 47.0255, lng: 8.3195, address: "A2 Highway Exit, Lucerne", chargingType: "DC Ultra-Fast 350kW", connector: "CCS2" },
        { name: "Tesla Supercharger - Zurich South", distance: "16.2 km", rating: 4.6, lat: 47.3485, lng: 8.5225, address: "Albisriederstrasse, Zurich", chargingType: "DC Fast 150kW", connector: "Tesla / CCS2" }
      ]
    };
  }

  if (clean.includes("thailand")) {
    return {
      hotels: [
        { name: "Mandarin Oriental, Bangkok", price: Math.round(18500 * m), rating: 4.9, reviews: 2980, distance: "3.5 km", lat: 13.7228, lng: 100.5125, address: "48 Oriental Avenue, Bangkok, Thailand", tier: "luxury" },
        { name: "Sri Panwa Phuket Luxury Pool Villa", price: Math.round(24000 * m), rating: 4.8, reviews: 1420, distance: "12.5 km", lat: 7.8025, lng: 98.4112, address: "88 Sakdidej Road, Cape Panwa, Phuket", tier: "luxury" },
        { name: "The Siam Hotel, Bangkok", price: Math.round(14500 * m), rating: 4.8, reviews: 890, distance: "4.8 km", lat: 13.7745, lng: 100.5028, address: "Khao Road, Wachira Payaban, Bangkok", tier: "premium" },
        { name: "Banyan Tree Phuket Resort", price: Math.round(11500 * m), rating: 4.7, reviews: 1560, distance: "8.5 km", lat: 8.0015, lng: 98.2985, address: "33, 33/27 Moo 4, Srisoonthorn Road, Phuket", tier: "premium" },
        { name: "Lub d Koh Samui Chaweng Beach", price: Math.round(2800 * m), rating: 4.5, reviews: 1240, distance: "0.2 km", lat: 9.5298, lng: 100.0612, address: "166/92 Chaweng Beach Road, Koh Samui", tier: "mid-range" },
        { name: "Raya Heritage Chiang Mai", price: Math.round(5600 * m), rating: 4.6, reviews: 740, distance: "5.8 km", lat: 18.8458, lng: 98.9912, address: "157 Moo 6, Don Kaew, Chiang Mai", tier: "mid-range" },
        { name: "Chillax Resort Bangkok", price: Math.round(2400 * m), rating: 4.1, reviews: 1680, distance: "1.5 km", lat: 13.7628, lng: 100.5012, address: "272 Samsen Road, Phra Nakhon, Bangkok", tier: "budget" },
        { name: "Slumber Party Surf Hostel Phuket", price: Math.round(900 * m), rating: 4.3, reviews: 810, distance: "1.8 km", lat: 7.8928, lng: 98.2995, address: "27/27 Rat-U-Thit Road, Patong, Phuket", tier: "hostel" }
      ],
      restaurants: [
        { name: "Gaggan Anand Restaurant", type: "Progressive Indian & Fusion", averagePrice: Math.round(6500 * m), rating: 4.9, distance: "2.1 km", lat: 13.7222, lng: 100.5285, address: "Sukhumvit Soi 31, Bangkok" },
        { name: "Jay Fai Crab Omelette", type: "Legendary Michelin Street Food", averagePrice: Math.round(2200 * m), rating: 4.7, distance: "1.8 km", lat: 13.7525, lng: 100.5048, address: "327 Maha Chai Road, Samran Rat, Bangkok" },
        { name: "Khao Soi Mae Sai", type: "Northern Thai Khao Soi Noodles", averagePrice: Math.round(150 * m), rating: 4.8, distance: "2.5 km", lat: 18.8028, lng: 98.9745, address: "Ratchaphakhinai Road, Chiang Mai" },
        { name: "Blue Elephant Phuket", type: "Royal Thai Fine Dining", averagePrice: Math.round(2800 * m), rating: 4.6, distance: "3.2 km", lat: 7.8845, lng: 98.3892, address: "Krabi Road, Talad Neua, Phuket" },
        { name: "The Deck by Arun Residence", type: "Traditional Thai & Wat Arun Views", averagePrice: Math.round(1500 * m), rating: 4.5, distance: "2.8 km", lat: 13.7445, lng: 100.4908, address: "Soi Pratoo Nok Yoong, Maharat Road, Bangkok" }
      ],
      hospitals: [
        { name: "Bumrungrad International Hospital", distance: "3.5 km", rating: 4.8, lat: 13.7461, lng: 100.5528, address: "33 Sukhumvit Soi 3, Wattana, Bangkok", phone: "+66-2-0668888" },
        { name: "Bangkok Hospital Phuket", distance: "6.2 km", rating: 4.6, lat: 7.8995, lng: 98.3792, address: "2/1 Hongyok Utis Road, Muang, Phuket", phone: "+66-76-254425" }
      ],
      fuelStations: [
        { name: "PTT Station - Sukhumvit Road", distance: "1.2 km", rating: 4.2, lat: 13.7395, lng: 100.5628, address: "Sukhumvit Soi 22, Klongtoey, Bangkok", types: ["Petrol", "Diesel"] },
        { name: "Bangchak - Patong Pump", distance: "2.1 km", rating: 4.0, lat: 7.8925, lng: 98.3015, address: "Phrabarami Road, Patong, Phuket", types: ["Petrol", "Diesel"] }
      ],
      evChargingStations: [
        { name: "PTT EV Charging Station - Sukhumvit", distance: "1.3 km", rating: 4.3, lat: 13.7392, lng: 100.5622, address: "PTT Station Sukhumvit Soi 22, Bangkok", chargingType: "DC Fast 50kW", connector: "CCS2" },
        { name: "PEA Volta Charging Hub - Phuket Central", distance: "3.5 km", rating: 4.5, lat: 7.8955, lng: 98.3725, address: "PEA Office Road, Muang, Phuket", chargingType: "DC Fast 100kW", connector: "CCS2" }
      ]
    };
  }

  if (clean.includes("udaipur")) {
    return {
      hotels: [
        { name: "The Oberoi Udaivilas", price: Math.round(28000 * m), rating: 4.9, reviews: 2140, distance: "1.5 km", lat: 24.5772, lng: 73.6725, address: "Haridas Ji Ki Magri, Udaipur", tier: "luxury" },
        { name: "Taj Lake Palace", price: Math.round(32000 * m), rating: 4.9, reviews: 3200, distance: "0.2 km", lat: 24.5754, lng: 73.6800, address: "Lake Pichola, Udaipur", tier: "luxury" },
        { name: "Radisson Blu Udaipur Palace", price: Math.round(8500 * m), rating: 4.5, reviews: 1560, distance: "2.1 km", lat: 24.5932, lng: 73.6768, address: "Mallatalai, Fateh Sagar Lake, Udaipur", tier: "premium" },
        { name: "Trident Udaipur", price: Math.round(7800 * m), rating: 4.6, reviews: 1120, distance: "1.6 km", lat: 24.5792, lng: 73.6688, address: "Mulla Talai, Udaipur", tier: "premium" },
        { name: "Lake Pichola Hotel", price: Math.round(4200 * m), rating: 4.2, reviews: 980, distance: "0.8 km", lat: 24.5798, lng: 73.6812, address: "Ambrai Road, Pichola, Udaipur", tier: "mid-range" },
        { name: "Amet Haveli", price: Math.round(4800 * m), rating: 4.4, reviews: 750, distance: "0.9 km", lat: 24.5802, lng: 73.6815, address: "Outside Chandpole, Pichola, Udaipur", tier: "mid-range" },
        { name: "FabHotel Mewar Castle", price: Math.round(1500 * m), rating: 3.8, reviews: 420, distance: "1.2 km", lat: 24.5818, lng: 73.6845, address: "Lal Ghat, Udaipur", tier: "budget" },
        { name: "Zostel Udaipur", price: Math.round(550 * m), rating: 4.4, reviews: 640, distance: "1.1 km", lat: 24.5812, lng: 73.6838, address: "Near Lal Ghat, Pichola, Udaipur", tier: "hostel" }
      ],
      restaurants: [
        { name: "Ambrai Restaurant", type: "North Indian & Rajasthani Thali", averagePrice: Math.round(1500 * m), rating: 4.7, distance: "0.9 km", lat: 24.5805, lng: 73.6818, address: "Amet Haveli, Pichola, Udaipur" },
        { name: "Savage Garden", type: "Continental & Italian Pastas", averagePrice: Math.round(1000 * m), rating: 4.4, distance: "1.1 km", lat: 24.5822, lng: 73.6810, address: "Chandpole, Udaipur" },
        { name: "Natraj Dining Hall", type: "Pure Vegetarian Rajasthani Thali", averagePrice: Math.round(350 * m), rating: 4.8, distance: "2.5 km", lat: 24.5878, lng: 73.7025, address: "Bapu Bazaar, Udaipur" },
        { name: "Tribute Restaurant", type: "North Indian & Mughlai Fine Dining", averagePrice: Math.round(1800 * m), rating: 4.6, distance: "1.5 km", lat: 24.5942, lng: 73.6792, address: "Fateh Sagar Lake Bypass, Udaipur" },
        { name: "Cafe Edelweiss", type: "European Coffee & Fresh Bakery", averagePrice: Math.round(500 * m), rating: 4.3, distance: "1.0 km", lat: 24.5815, lng: 73.6840, address: "Lal Ghat, Udaipur" }
      ],
      hospitals: [
        { name: "GBH American Hospital", distance: "2.8 km", rating: 4.7, lat: 24.5898, lng: 73.7092, address: "Meera Marg, Udaipur", phone: "+91-294-2426000" },
        { name: "Geetanjali Medical College & Hospital", distance: "5.5 km", rating: 4.5, lat: 24.5512, lng: 73.7258, address: "Hiran Magri Extension, Udaipur", phone: "+91-294-2500000" }
      ],
      fuelStations: [
        { name: "Indian Oil - Udaipole Pump", distance: "1.8 km", rating: 4.2, lat: 24.5788, lng: 73.6985, address: "Udaipole Circle, Udaipur", types: ["Petrol", "Diesel"] },
        { name: "HP Petroleum - Hiran Magri", distance: "3.2 km", rating: 4.0, lat: 24.5622, lng: 73.7125, address: "Sector 4, Hiran Magri, Udaipur", types: ["Petrol", "Diesel", "CNG"] }
      ],
      evChargingStations: [
        { name: "Tata Power EZ Charge - Celebration Mall", distance: "4.5 km", rating: 4.4, lat: 24.6188, lng: 73.7085, address: "NH-8, Sukher Road, Udaipur", chargingType: "DC Fast 50kW", connector: "CCS2" },
        { name: "Ather Grid - Shobhagpura", distance: "3.8 km", rating: 4.2, lat: 24.6112, lng: 73.6995, address: "Shobhagpura Circle, Udaipur", chargingType: "AC 7.4kW", connector: "Type 2" }
      ]
    };
  }

  // Fallback generic generator
  return {
    hotels: [
      { name: `The Oberoi ${name}`, price: Math.round(8500 * m), rating: 4.8, reviews: 2140, distance: "0.5 km", lat: baseLat + 0.005, lng: baseLng + 0.003, address: `Luxury Palace Road, ${name}`, tier: "luxury" },
      { name: `Taj ${name} Resort & Spa`, price: Math.round(12000 * m), rating: 4.9, reviews: 3200, distance: "1.2 km", lat: baseLat + 0.012, lng: baseLng - 0.008, address: `Heritage Lane, ${name}`, tier: "luxury" },
      { name: `Radisson Blu ${name}`, price: Math.round(4500 * m), rating: 4.4, reviews: 1560, distance: "2.1 km", lat: baseLat - 0.015, lng: baseLng + 0.018, address: `Airport Road, ${name}`, tier: "premium" },
      { name: `Lemon Tree ${name}`, price: Math.round(2800 * m), rating: 4.1, reviews: 980, distance: "1.8 km", lat: baseLat + 0.022, lng: baseLng + 0.011, address: `City Center, ${name}`, tier: "mid-range" },
      { name: `FabHotel ${name} Inn`, price: Math.round(1200 * m), rating: 3.8, reviews: 420, distance: "3.2 km", lat: baseLat - 0.028, lng: baseLng - 0.015, address: `Station Road, ${name}`, tier: "budget" },
      { name: `OYO Rooms ${name} Central`, price: Math.round(800 * m), rating: 3.5, reviews: 310, distance: "2.8 km", lat: baseLat + 0.018, lng: baseLng - 0.022, address: `Market Area, ${name}`, tier: "budget" },
      { name: `Zostel ${name}`, price: Math.round(500 * m), rating: 4.3, reviews: 640, distance: "1.5 km", lat: baseLat - 0.008, lng: baseLng + 0.025, address: `Old Town, ${name}`, tier: "hostel" },
      { name: `mStay ${name} Boutique`, price: Math.round(3200 * m), rating: 4.2, reviews: 780, distance: "1.9 km", lat: baseLat + 0.031, lng: baseLng + 0.007, address: `Hill View Road, ${name}`, tier: "mid-range" }
    ],
    restaurants: [
      { name: `${name} Garden Bistro`, type: "Regional Delicacies", averagePrice: Math.round(1200 * m), rating: 4.6, distance: "0.6 km", lat: baseLat + 0.003, lng: baseLng - 0.002, address: `Fort Road, ${name}` },
      { name: `The Food Gallery`, type: "Continental & Fusion", averagePrice: Math.round(1500 * m), rating: 4.4, distance: "1.1 km", lat: baseLat - 0.005, lng: baseLng + 0.008, address: `Central Avenue, ${name}` },
      { name: `Royal Dining Hall`, type: "Vegetarian Thali / Local Special", averagePrice: Math.round(300 * m), rating: 4.7, distance: "0.8 km", lat: baseLat + 0.007, lng: baseLng + 0.004, address: `Main Bazaar, ${name}` },
      { name: `${name} Heights Restaurant`, type: "Multi-Cuisine Fine Dining", averagePrice: Math.round(2000 * m), rating: 4.5, distance: "1.5 km", lat: baseLat - 0.012, lng: baseLng - 0.006, address: `Lake Shore Drive, ${name}` },
      { name: `Boutique Café`, type: "European Bakery & Cafe", averagePrice: Math.round(600 * m), rating: 4.3, distance: "0.9 km", lat: baseLat + 0.009, lng: baseLng + 0.012, address: `Old City Road, ${name}` }
    ],
    hospitals: [
      { name: `Apollo Hospital ${name}`, distance: "2.8 km", rating: 4.6, lat: baseLat - 0.02, lng: baseLng + 0.015, address: `Ring Road, ${name}`, phone: "+91-111-2223333" },
      { name: `City Central Hospital`, distance: "1.4 km", rating: 4.1, lat: baseLat + 0.008, lng: baseLng + 0.006, address: `Hospital Road, ${name}`, phone: "+91-111-4445555" }
    ],
    fuelStations: [
      { name: `Indian Oil - ${name} Station`, distance: "0.8 km", rating: 4.3, lat: baseLat + 0.002, lng: baseLng + 0.001, address: `Main Highway, ${name}`, types: ["Petrol", "Diesel"] },
      { name: `HP Petroleum - Bypass`, distance: "2.1 km", rating: 4.0, lat: baseLat - 0.018, lng: baseLng + 0.012, address: `Bypass Road, ${name}`, types: ["Petrol", "Diesel", "CNG"] },
      { name: `Bharat Petroleum - Ring Road`, distance: "3.5 km", rating: 4.2, lat: baseLat + 0.028, lng: baseLng - 0.008, address: `Ring Road, ${name}`, types: ["Petrol", "Diesel"] },
      { name: `Shell - Highway Outlet`, distance: "5.2 km", rating: 4.5, lat: baseLat - 0.035, lng: baseLng + 0.022, address: `NH Highway, ${name}`, types: ["Petrol", "Diesel", "EV Charging"] }
    ],
    evChargingStations: [
      { name: `Tata Power EZ Charge - ${name}`, distance: "1.5 km", rating: 4.2, lat: baseLat + 0.01, lng: baseLng - 0.005, address: `Shopping Mall Parking, ${name}`, chargingType: "DC Fast 50kW", connector: "CCS2" },
      { name: `Ather Grid - ${name} Hub`, distance: "2.8 km", rating: 4.0, lat: baseLat - 0.022, lng: baseLng + 0.018, address: `Metro Station Hub, ${name}`, chargingType: "AC 7.4kW", connector: "Type 2" }
    ]
  };
}

/**
 * Live API or Mock Generator for Travel Itineraries
 */
export async function generateTravelPlan(destination, style, days, travelers, budgetLimit, travelMode = "Car", options = {}) {
  const normalizedQuery = String(options.userQuery || "").trim();
  const requireLive = Boolean(options.requireLive);
  const destinationInput = String(destination || "").trim();
  const planningInput = normalizedQuery || destinationInput;

  if (!planningInput) {
    throw new Error("Destination or trip query is required.");
  }

  if ((requireLive || REAL_DATA_ONLY) && !API_KEY) {
    throw new Error("Live AI is disabled. Add VITE_GEMINI_API_KEY in your .env to get real-time responses.");
  }

  // Resolve real location facts first
  let resolvedName = destinationInput || planningInput;
  let countryName = "Global Destination";
  let realHotels = [];
  let realRests = [];
  let currentTemp = "24°C";

  try {
    const geo = await geocodePlace(planningInput);
    const lat = geo ? geo.lat : 24.5854;
    const lng = geo ? geo.lng : 73.7125;
    
    const isCoords = planningInput.match(/^(-?\d+\.\d+)[\s,-]+(-?\d+\.\d+)$/) || (geo && geo.formattedName.match(/^(-?\d+\.\d+)[\s,-]+(-?\d+\.\d+)$/));
    if (isCoords) {
      const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
      if (revRes.ok) {
        const revData = await revRes.json();
        if (revData.address) {
          resolvedName = revData.address.city || revData.address.town || revData.address.suburb || revData.address.village || "Analyzed Location";
          countryName = revData.address.country || "Global Destination";
        }
      }
    } else if (geo) {
      resolvedName = geo.formattedName.split(',')[0];
      countryName = geo.formattedName.split(',').pop().trim();
    }

    const [weatherData, hotels, restaurants] = await Promise.all([
      fetchWeather(lat, lng),
      fetchNearbyPlaces(lat, lng, "lodging", resolvedName),
      fetchNearbyPlaces(lat, lng, "restaurant", resolvedName)
    ]);
    
    if (weatherData) currentTemp = weatherData.temp;
    if (hotels) realHotels = hotels;
    if (restaurants) realRests = restaurants;
  } catch (e) {
    console.warn("Real-world fetch inside planner itinerary failed:", e);
  }

  if (API_KEY) {
    try {
      const liveContextTag = new Date().toISOString();
      const prompt = `
        You are an expert AI Travel Planner.
        The user can type in casual WhatsApp style, Hinglish, short forms, or mixed language.
        Infer intent and generate a fresh, real-time trip response for this request.

        User Input (raw): ${planningInput}
        Destination Hint: ${resolvedName}, ${countryName}
        Duration: ${days} days
        Travelers: ${travelers} people
        Travel Style: ${style}
        Preferred Mode of Travel: ${travelMode}
        Maximum Budget Limit: ${budgetLimit} USD
        Live Request Timestamp: ${liveContextTag}

        Real facts for context:
        - Weather: ${currentTemp}
        - Local Accommodations: ${realHotels.slice(0, 3).map(h => h.name).join(", ") || "Local hotels"}
        - Local Dining spots: ${realRests.slice(0, 3).map(r => r.name).join(", ") || "Local restaurants"}
        
        Provide the response as a single, valid JSON object. Do not wrap in markdown blocks.
        
        The JSON structure MUST follow this exact schema:
        {
          "destination": "Name of destination and country",
          "tagline": "Engaging catchy subtitle",
          "summary": "1-2 sentence description",
          "itinerary": [
            {
              "day": 1,
              "theme": "Theme of this day",
              "morning": "Detailed morning activity",
              "afternoon": "Detailed afternoon activity",
              "evening": "Detailed evening activity",
              "foodRecommendation": "Recommended local dish or restaurant"
            }
          ]
        }
      `;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = extractJsonObject(text);

        if (parsed?.itinerary && Array.isArray(parsed.itinerary) && parsed.itinerary.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Gemini API call failed, falling back to local simulation.", e);
      if (REAL_DATA_ONLY) {
        throw new Error("Live AI request failed. Please retry in a moment.");
      }
    }
  }

  if (REAL_DATA_ONLY) {
    throw new Error("Live AI response unavailable right now. Try again shortly.");
  }

  // Local Simulation Engine
  await new Promise(resolve => setTimeout(resolve, 1500));

  const cleanDest = resolvedName.toLowerCase().trim();
  let baseDetails = MOCK_DESTINATIONS.find(d => cleanDest.includes(d.id));
  
  const hotelName = realHotels.length > 0 ? realHotels[0].name : (baseDetails ? `${baseDetails.name} Resort` : `${resolvedName} Stay Inn`);
  const foodList = realRests.length > 0 ? realRests.map(r => r.name) : (baseDetails ? baseDetails.food.map(f => f.name) : [`Signature ${resolvedName} Platter`]);

  const itinerary = Array.from({ length: days }).map((_, idx) => {
    const dayNum = idx + 1;
    const restName = realRests.length > 0 ? realRests[idx % realRests.length].name : (foodList[idx % foodList.length] || "local diner");
    
    let activityDesc = `Begin with a fresh local breakfast. Visit the central ${resolvedName} historic sector.`;
    if (dayNum === 1) {
      activityDesc = `Land and arrive in ${resolvedName}, check into your accommodation: ${hotelName}. Settle in and explore the nearby streets.`;
    } else if (dayNum === 2) {
      activityDesc = `Enjoy sightseeing at popular local attractions near coordinates. Head over to the main city center and take photos of historical sights.`;
    } else if (dayNum === 3) {
      activityDesc = `Discover hidden gems and local markets. Walk through bazaar streets and shop for unique souvenirs.`;
    } else if (dayNum === 4) {
      activityDesc = `Take a scenic nature day trip around the outskirts of ${resolvedName}. Capture panoramic views and watch the sunset.`;
    }
    
    return {
      day: dayNum,
      theme: `Exploring Scenic Landmarks (Day ${dayNum})`,
      morning: activityDesc,
      afternoon: `Join a guided excursion to local heritage spots and sample traditional dishes.`,
      evening: `Walk around the scenic spots for sunset, followed by a leisure dinner at ${restName}.`,
      foodRecommendation: foodList[idx % foodList.length] || "Local specialty platter"
    };
  });

  return {
    destination: countryName !== "Global Destination" ? `${resolvedName}, ${countryName}` : resolvedName,
    tagline: `Unlocking the Wonders of ${resolvedName}`,
    summary: `A customized ${days}-day ${style} trip by ${travelMode} designed for ${travelers} travelers. Optimized for budget, sights, and comforts.`,
    itinerary
  };
}

/**
 * Estimates itemized budgets using real-world data
 */
export async function generateBudgetEstimate(destination, days, travelers, style, travelMode = "Car", options = {}) {
  const normalizedQuery = String(options.userQuery || "").trim();
  const requireLive = Boolean(options.requireLive);
  const destinationInput = String(destination || "").trim();
  const planningInput = normalizedQuery || destinationInput;

  if (!planningInput) {
    throw new Error("Destination or trip query is required.");
  }

  if ((requireLive || REAL_DATA_ONLY) && !API_KEY) {
    throw new Error("Live AI is disabled. Add VITE_GEMINI_API_KEY in your .env to get real-time responses.");
  }

  const origin = userLocation.value.city || "New Delhi";
  let distanceKm = 1000;
  let hotelRateInUsd = 60;
  let restRateInUsd = 8;
  
  try {
    const geo = await geocodePlace(planningInput);
    const lat = geo ? geo.lat : 24.5854;
    const lng = geo ? geo.lng : 73.7125;
    
    // Resolve distance
    const routeInfo = await getRouteDistance(userLocation.value, { lat, lng });
    if (routeInfo) {
      distanceKm = routeInfo.distance;
    }
    
    // Resolve average hotel & restaurant rates
    const resolvedName = geo ? geo.formattedName.split(',')[0] : planningInput;
    const [hotels, restaurants] = await Promise.all([
      fetchNearbyPlaces(lat, lng, "lodging", resolvedName),
      fetchNearbyPlaces(lat, lng, "restaurant", resolvedName)
    ]);
    
    if (hotels && hotels.length > 0) {
      const avgInr = hotels.reduce((sum, h) => sum + h.price, 0) / hotels.length;
      hotelRateInUsd = avgInr / 83.5;
    }
    if (restaurants && restaurants.length > 0) {
      const avgInr = restaurants.reduce((sum, r) => sum + r.averagePrice, 0) / restaurants.length;
      restRateInUsd = avgInr / 83.5;
    }
  } catch (e) {
    console.warn("Error calculating real budget fallback:", e);
  }

  if (API_KEY) {
    try {
      const liveContextTag = new Date().toISOString();
      const prompt = `
        You are a travel budget analyst.
        The user can write in WhatsApp style or Hinglish. Understand it and estimate a practical budget.

        User Input (raw): ${planningInput}
        Origin city: ${origin}
        Trip duration: ${days} days
        Travelers: ${travelers}
        Style: ${style}
        Travel mode: ${travelMode}
        Approx route distance: ${Math.round(distanceKm)} km
        Average hotel nightly rate baseline: ${hotelRateInUsd.toFixed(2)} USD
        Average meal baseline: ${restRateInUsd.toFixed(2)} USD
        Live Request Timestamp: ${liveContextTag}

        Return a single JSON object only with numeric values:
        {
          "flights": 0,
          "accommodation": 0,
          "food": 0,
          "transportation": 0,
          "activities": 0,
          "total": 0
        }
      `;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = extractJsonObject(text);

        if (parsed && typeof parsed === "object") {
          const normalized = {
            flights: Math.max(0, Math.round(Number(parsed.flights || 0))),
            accommodation: Math.max(0, Math.round(Number(parsed.accommodation || 0))),
            food: Math.max(0, Math.round(Number(parsed.food || 0))),
            transportation: Math.max(0, Math.round(Number(parsed.transportation || 0))),
            activities: Math.max(0, Math.round(Number(parsed.activities || 0))),
            total: Math.max(0, Math.round(Number(parsed.total || 0)))
          };

          if (normalized.total === 0) {
            normalized.total = normalized.flights + normalized.accommodation + normalized.food + normalized.transportation + normalized.activities;
          }

          if (normalized.total > 0) {
            return normalized;
          }
        }
      }
    } catch (e) {
      console.warn("Gemini live budget estimation failed, using computed fallback.", e);
      if (REAL_DATA_ONLY) {
        throw new Error("Live AI budget request failed. Please retry in a moment.");
      }
    }
  }

  if (REAL_DATA_ONLY) {
    throw new Error("Live AI budget response unavailable right now. Try again shortly.");
  }

  // Multipliers based on style
  const multipliers = {
    budget: 0.6,
    comfort: 1.0,
    adventure: 0.9,
    family: 1.2,
    luxury: 2.8
  };
  const m = multipliers[style.toLowerCase()] || 1.0;
  
  // 1. Transport Cost Calculation based on travelMode
  let flights = 0; 
  let transportation = 0; 
  
  const modeClean = (travelMode || "Car").toLowerCase();
  
  if (modeClean.includes("flight")) {
    flights = Math.round(Math.max(50, distanceKm * 0.08) * travelers * m);
    transportation = Math.round(15 * days * travelers * m);
  } else if (modeClean.includes("train")) {
    flights = Math.round(Math.max(15, distanceKm * 0.02) * travelers * m);
    transportation = Math.round(10 * days * travelers * m);
  } else if (modeClean.includes("bus")) {
    flights = Math.round(Math.max(10, distanceKm * 0.015) * travelers * m);
    transportation = Math.round(10 * days * travelers * m);
  } else if (modeClean.includes("car")) {
    const fuelCostUsd = ((distanceKm / 14) * 1.25); // 1.25 USD/L fuel
    const tollCostUsd = (distanceKm * 0.015);
    flights = Math.round((fuelCostUsd + tollCostUsd) * m);
    transportation = Math.round(12 * days * travelers * m);
  } else if (modeClean.includes("bike")) {
    const fuelCostUsd = ((distanceKm / 45) * 1.25);
    flights = Math.round(fuelCostUsd * m);
    transportation = Math.round(8 * days * travelers * m);
  } else {
    flights = Math.round(200 * travelers * m);
    transportation = Math.round(15 * days * travelers * m);
  }

  // 2. Accommodation
  const rooms = Math.ceil(travelers / 2);
  const accommodation = Math.round(hotelRateInUsd * rooms * (days - 1) * m);

  // 3. Food
  const food = Math.round(restRateInUsd * 2.5 * travelers * days * m);

  // 4. Activities
  const activities = Math.round(15 * days * travelers * m);

  const total = flights + accommodation + food + transportation + activities;

  return {
    flights,
    accommodation,
    food,
    transportation,
    activities,
    total
  };
}

import { GEMINI_API_KEY as API_KEY, GEMINI_API_URL as API_URL, REAL_DATA_ONLY, extractJsonObject } from "./planner.service";
import { geocodePlace } from "../maps/geocoding.service";
import { fetchWeather } from "../travel/weather.service";
import { fetchNearbyPlaces } from "../travel/places.service";
import { MOCK_DESTINATIONS } from "./recommendation.service";

export interface TravelPlanOptions {
  userQuery?: string;
  requireLive?: boolean;
  stayPreference?: string;
  foodPreference?: string;
}

export interface TravelPlanDay {
  day: number;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
  foodRecommendation: string;
}

export interface TravelPlan {
  destination: string;
  tagline: string;
  summary: string;
  itinerary: TravelPlanDay[];
  [key: string]: any;
}

/**
 * Live API or Mock Generator for Travel Itineraries
 */
export async function generateTravelPlan(destination: string, style: string, days: number, travelers: number, budgetLimit: number, travelMode = "Car", options: TravelPlanOptions = {}): Promise<TravelPlan> {
  const normalizedQuery = String(options.userQuery || "").trim();
  const requireLive = Boolean(options.requireLive);
  const stayPreference = String(options.stayPreference || "mid-range").toLowerCase();
  const foodPreference = String(options.foodPreference || "mixed").toLowerCase();
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
        Preferred Stay Type: ${stayPreference}
        Preferred Food Type: ${foodPreference}
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

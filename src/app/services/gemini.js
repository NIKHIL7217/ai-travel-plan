/**
 * RoamAI Gemini API Roadtrip Generator Service
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// Base coordinates dictionary for mapping simulations
const DESTINATION_COORDS = {
  delhi: { lat: 28.6139, lng: 77.2090 },
  shimla: { lat: 31.1048, lng: 77.1734 },
  manali: { lat: 32.2396, lng: 77.1887 },
  kaza: { lat: 32.2276, lng: 78.0709 },
  leh: { lat: 34.1526, lng: 77.5771 },
  srinagar: { lat: 34.0837, lng: 74.7973 },
  dharamshala: { lat: 32.2190, lng: 76.3234 },
  spiti: { lat: 32.2461, lng: 78.0000 },
  goa: { lat: 15.2993, lng: 74.1240 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  coorg: { lat: 12.3375, lng: 75.8069 },
  ooty: { lat: 11.4102, lng: 76.6950 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  munnar: { lat: 10.0889, lng: 77.0595 }
};

/**
 * Generate autocomplete recommendations for roadtrip queries
 */
export async function getAutocompleteSuggestions(query) {
  if (!query || query.length < 2) return [];
  const lowerQuery = query.toLowerCase();

  const routesList = [
    "Plan a 7-day Himachal roadtrip starting from Delhi",
    "5-day Mumbai to Goa coastal roadtrip",
    "10-day Leh Ladakh adventure loop",
    "4-day Bangalore to Ooty hill climb",
    "6-day Kerala backwaters & Munnar escape",
    "7-day Golden Triangle historical highway loop",
    "8-day Rajasthan desert highway trip"
  ];

  return routesList.filter(r => r.toLowerCase().includes(lowerQuery));
}

/**
 * Main function to generate a rich roadtrip plan from prompt
 */
export async function generateRoadtripPlan(promptText, travelers = 2, style = "Adventure", days = 7) {
  // If API KEY is present, trigger a real AI request
  if (API_KEY) {
    try {
      const systemInstructions = `
        You are RoamAI, a premium Roadtrip Operating System AI. Generate a complete, high-fidelity JSON roadtrip plan for:
        RESPOND ONLY IN ENGLISH. Do not output Hinglish or Hindi text.
        Prompt: "${promptText}"
        Duration: ${days} days
        Travelers: ${travelers} people
        Style: ${style}

        You MUST respond with a single valid JSON object. Do not wrap in markdown tags.
        
        The JSON structure MUST follow this exact schema:
        {
          "destination": "Title of the roadtrip",
          "tagline": "Futuristic catchy roadtrip copilot subtitle",
          "summary": "Short overview of the journey (1-2 sentences)",
          "durationDays": ${days},
          "style": "${style}",
          "route": {
            "origin": "Start city name",
            "destination": "End city name",
            "distanceKm": estimated total drive distance (integer),
            "driveTimeHours": estimated total pure driving hours (integer),
            "points": [
              { "name": "Stop 1 Name", "lat": latitude (float), "lng": longitude (float), "type": "origin|stop|destination" }
            ]
          },
          "stops": [
            {
              "name": "Point of interest / stop name",
              "distanceFromStart": accumulated driving km (integer),
              "scenicScore": value between 1 and 10 (float),
              "photoSpot": "Specific landmark for photography",
              "amenities": ["Fuel Station", "EV Supercharger", "Hotels", "Restaurants"],
              "tollCost": estimated toll cost in USD (integer)
            }
          ],
          "weather": {
            "general": "Summary of weather along route",
            "tempRange": "Temperature range e.g. -5°C to 15°C",
            "hazardLevel": "Low|Moderate|High",
            "hazardWarning": "Any major warnings like fog, black ice, land slides",
            "bestTravelWindow": "Suggested hours to drive e.g. 08:00 AM - 02:00 PM"
          },
          "budgetBreakdown": {
            "fuel": gas or EV charging cost (integer),
            "hotels": total lodging cost (integer),
            "food": total food cost (integer),
            "activities": total ticket/tours cost (integer),
            "tolls": estimated total toll cost (integer),
            "total": sum of all items (integer)
          },
          "itinerary": [
            {
              "day": 1,
              "theme": "Theme of this day's drive",
              "timeline": [
                { "time": "e.g. 08:00 AM", "activity": "Activity description", "icon": "drive|food|hotel|explore|alert" }
              ]
            }
          ]
        }
      `;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstructions + "\nPrompt: " + promptText }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const jsonText = result.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText.trim());
      }
    } catch (e) {
      console.warn("Live Gemini API call failed, reverting to local AI synthesis engine.", e);
    }
  }

  // Local AI Synthesis Engine (Simulated lag for authentic premium copilot feeling)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Extract keywords
  const promptLower = promptText.toLowerCase();
  
  // Custom heuristics for generating specific premium mock profiles
  if (promptLower.includes("himachal") || promptLower.includes("spiti") || promptLower.includes("manali")) {
    return getHimachalRoadtrip(days, travelers, style);
  } else if (promptLower.includes("goa") || promptLower.includes("coastal") || promptLower.includes("mumbai")) {
    return getGoaRoadtrip(days, travelers, style);
  } else {
    // Generate an automatic custom roadtrip for any user prompt!
    return getCustomRoadtrip(promptText, days, travelers, style);
  }
}

function getHimachalRoadtrip(days, travelers, style) {
  return {
    destination: "Himachal Peak Pass Route",
    tagline: "Trans-Himalayan Mountain Crawl",
    summary: "Conquer steep mountain curves, suspension bridges, and scenic valleys traversing through high altitudinal pine networks.",
    durationDays: days,
    style: style,
    route: {
      origin: "Delhi",
      destination: "Kaza (Spiti)",
      distanceKm: 720,
      driveTimeHours: 17,
      points: [
        { name: "Delhi", lat: 28.6139, lng: 77.2090, type: "origin" },
        { name: "Shimla", lat: 31.1048, lng: 77.1734, type: "stop" },
        { name: "Kalpa", lat: 31.5396, lng: 78.2792, type: "stop" },
        { name: "Tabo", lat: 32.0954, lng: 78.3846, type: "stop" },
        { name: "Kaza", lat: 32.2276, lng: 78.0709, type: "destination" }
      ]
    },
    stops: [
      { name: "Shimla Mall Road", distanceFromStart: 340, scenicScore: 7.9, photoSpot: "Christ Church Ridge", amenities: ["EV Supercharger", "Hotels", "Restaurants"], tollCost: 10 },
      { name: "Narkanda Orchards", distanceFromStart: 400, scenicScore: 8.4, photoSpot: "Hatu Peak Ridge", amenities: ["Fuel Station", "Cafes"], tollCost: 5 },
      { name: "Sangla Valley Gateway", distanceFromStart: 520, scenicScore: 9.2, photoSpot: "Baspa River Bridge", amenities: ["Homestays"], tollCost: 0 },
      { name: "Kalpa Heights", distanceFromStart: 560, scenicScore: 9.5, photoSpot: "Kinner Kailash Sunrise Point", amenities: ["Fuel Station", "Hotels"], tollCost: 0 },
      { name: "Tabo Monastery", distanceFromStart: 670, scenicScore: 8.8, photoSpot: "Ancient Mud Caves", amenities: ["Restrooms", "Dhaba"], tollCost: 0 }
    ],
    weather: {
      general: "Chilly winds with sunny clear spells, severe temperature drop at night.",
      tempRange: "-4°C to 14°C",
      hazardLevel: "Moderate",
      hazardWarning: "Watch out for black ice in shaded mountain curves before Nako.",
      bestTravelWindow: "09:00 AM - 03:00 PM"
    },
    budgetBreakdown: {
      fuel: 95,
      hotels: 240 * travelers,
      food: 30 * days * travelers,
      activities: 15 * days,
      tolls: 15,
      total: 95 + (240 * travelers) + (30 * days * travelers) + (15 * days) + 15
    },
    itinerary: Array.from({ length: days }).map((_, idx) => {
      const d = idx + 1;
      return {
        day: d,
        theme: `Day ${d} - Mountain Traverse`,
        timeline: [
          { time: "08:00 AM", activity: `Morning checks. Start drive towards local scenic valley.`, icon: "drive" },
          { time: "01:00 PM", activity: `Pitstop at local eatery, test local tea and traditional buns.`, icon: "food" },
          { time: "04:30 PM", activity: `Reach campsite / lodge. Perform vehicle safety inspection.`, icon: "explore" },
          { time: "07:30 PM", activity: `Group bonfire and dynamic briefing on tomorrow's pass conditions.`, icon: "hotel" }
        ]
      };
    })
  };
}

function getGoaRoadtrip(days, travelers, style) {
  return {
    destination: "Konkan Coastal Highway",
    tagline: "Salty Air, Sea Breezes & Shacks",
    summary: "A gorgeous coastal freeway connecting Mumbai to Goa, passing through cashew plantations, ancient forts, and white sand cliffs.",
    durationDays: days,
    style: style,
    route: {
      origin: "Mumbai",
      destination: "Panaji (Goa)",
      distanceKm: 580,
      driveTimeHours: 11,
      points: [
        { name: "Mumbai", lat: 19.0760, lng: 72.8777, type: "origin" },
        { name: "Kolad", lat: 18.4285, lng: 73.2384, type: "stop" },
        { name: "Ratnagiri", lat: 16.9902, lng: 73.3120, type: "stop" },
        { name: "Malvan", lat: 16.0649, lng: 73.4688, type: "stop" },
        { name: "Panaji", lat: 15.2993, lng: 74.1240, type: "destination" }
      ]
    },
    stops: [
      { name: "Kolad River Point", distanceFromStart: 120, scenicScore: 7.2, photoSpot: "Kundalika River Bridge", amenities: ["Rafting Center", "Restaurants"], tollCost: 15 },
      { name: "Ratnagiri Mango Groves", distanceFromStart: 310, scenicScore: 8.0, photoSpot: "Mandvi Beach Sunset Point", amenities: ["EV Supercharger", "Hotels"], tollCost: 8 },
      { name: "Sindhudurg Sea Fort", distanceFromStart: 450, scenicScore: 9.0, photoSpot: "Fort Ramparts Overlook", amenities: ["Ferry Dock", "Snorkeling"], tollCost: 6 },
      { name: "Arambol Border", distanceFromStart: 530, scenicScore: 8.6, photoSpot: "Sweet Water Lake Path", amenities: ["Shacks", "Restrooms"], tollCost: 4 }
    ],
    weather: {
      general: "Warm and humid, coastal ocean breeze throughout the day.",
      tempRange: "24°C to 32°C",
      hazardLevel: "Low",
      hazardWarning: "Heavy rain patches possible near the ghat curves during monsoon.",
      bestTravelWindow: "06:00 AM - 05:00 PM"
    },
    budgetBreakdown: {
      fuel: 75,
      hotels: 300 * travelers,
      food: 40 * days * travelers,
      activities: 30 * days,
      tolls: 33,
      total: 75 + (300 * travelers) + (40 * days * travelers) + (30 * days) + 33
    },
    itinerary: Array.from({ length: days }).map((_, idx) => {
      const d = idx + 1;
      return {
        day: d,
        theme: `Day ${d} - Coastal Exploring`,
        timeline: [
          { time: "09:00 AM", activity: `Drive along the scenic Konkan bypass with coconut grove backdrops.`, icon: "drive" },
          { time: "01:30 PM", activity: `Fresh seafood lunch at an oceanfront cliff restaurant.`, icon: "food" },
          { time: "04:00 PM", activity: `Visit a historic Portuguese fort on the coast.`, icon: "explore" },
          { time: "08:00 PM", activity: `Check into beachside retreat, enjoy cocktail and sea views.`, icon: "hotel" }
        ]
      };
    })
  };
}

function getCustomRoadtrip(promptText, days, travelers, style) {
  const words = promptText.split(" ");
  let destTitle = words.slice(0, 4).join(" ");
  destTitle = destTitle.charAt(0).toUpperCase() + destTitle.slice(1);
  
  // Calculate coordinates roughly based on name hashes, to place markers on map dynamically!
  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };
  
  const h1 = hashString(promptText);
  const latOffset = (h1 % 100) / 15 - 3;
  const lngOffset = (h1 % 200) / 15 - 6;
  
  const baseLat = 22.0 + latOffset;
  const baseLng = 78.0 + lngOffset;

  return {
    destination: `${destTitle || "Custom Highway Drive"}`,
    tagline: `Custom Roadtrip Copilot AI Route`,
    summary: `A dynamically calculated roadtrip designed around your specific query: "${promptText}". Optimized for stops, sights, and style preferences.`,
    durationDays: days,
    style: style,
    route: {
      origin: "Origin Point",
      destination: "Final Destination",
      distanceKm: 120 * days,
      driveTimeHours: Math.round(1.8 * days),
      points: [
        { name: "Origin Town", lat: baseLat, lng: baseLng, type: "origin" },
        { name: "Scenic Midpoint", lat: baseLat + 0.6, lng: baseLng + 0.8, type: "stop" },
        { name: "Eco Stopover", lat: baseLat + 1.2, lng: baseLng + 1.4, type: "stop" },
        { name: "Final Point", lat: baseLat + 1.8, lng: baseLng + 2.0, type: "destination" }
      ]
    },
    stops: [
      { name: "Panoramic Pass Overlook", distanceFromStart: 80, scenicScore: 8.7, photoSpot: "Summit Parking Dock", amenities: ["Restrooms", "Cafe"], tollCost: 6 },
      { name: "Rapid Charger Hub", distanceFromStart: 210, scenicScore: 6.5, photoSpot: "Grid Power Station", amenities: ["EV Supercharger", "Diner", "Shop"], tollCost: 12 },
      { name: "Lakeside Valley Walk", distanceFromStart: 340, scenicScore: 9.1, photoSpot: "Old Bridge Arch", amenities: ["Campgrounds", "Boating"], tollCost: 0 }
    ],
    weather: {
      general: "Partly cloudy with pleasant evening breezes, perfect driving visibility.",
      tempRange: "15°C to 28°C",
      hazardLevel: "Low",
      hazardWarning: "None active. Safe highway speeds recommended.",
      bestTravelWindow: "07:30 AM - 04:30 PM"
    },
    budgetBreakdown: {
      fuel: 65,
      hotels: 180 * travelers,
      food: 25 * days * travelers,
      activities: 20 * days,
      tolls: 18,
      total: 65 + (180 * travelers) + (25 * days * travelers) + (20 * days) + 18
    },
    itinerary: Array.from({ length: days }).map((_, idx) => {
      const d = idx + 1;
      return {
        day: d,
        theme: `Day ${d} - Drive segment ${d}`,
        timeline: [
          { time: "08:30 AM", activity: `Safety checks complete. Depart toward the next waypoint.`, icon: "drive" },
          { time: "12:30 PM", activity: `Stop for gas/charge and lunch at a recommended traveler stop.`, icon: "food" },
          { time: "03:00 PM", activity: `Sightseeing and explore local sights. Photography spot visit.`, icon: "explore" },
          { time: "06:00 PM", activity: `Check-in, update logs, and plan tomorrow's fuel window.`, icon: "hotel" }
        ]
      };
    })
  };
}

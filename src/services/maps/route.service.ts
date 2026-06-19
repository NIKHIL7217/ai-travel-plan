import { GEMINI_API_KEY as API_KEY, GEMINI_API_URL as API_URL, REAL_DATA_ONLY } from "../ai/planner.service";
import { geocodePlace } from "./geocoding.service";

export type RoutePoint = string | { lat: number; lng: number; city?: string };

export interface RouteDistance {
  distance: number;
  durationSeconds: Record<string, number>;
  originCoords: { lat: number; lng: number };
  destCoords: { lat: number; lng: number };
}

export interface TrafficInsights {
  level: string;
  averageCurrentSpeed: number;
  averageFreeFlowSpeed: number;
  congestionPercent: number;
  snapshots: Array<Record<string, unknown>>;
  updatedAt: string;
}

export interface RouteIntelligence {
  origin?: string;
  destination?: string;
  roadDistance?: number;
  flightDistance?: number;
  routeSummary?: string;
  vehicleBreakdown?: Record<string, any>;
  fuelStops?: Array<Record<string, any>>;
  [key: string]: any;
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY || "";

/**
 * Calculates straight-line distance in km using Haversine formula
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
 * Calculates travel distance and duration between two locations
 */
export async function getRouteDistance(origin: RoutePoint, destination: RoutePoint): Promise<RouteDistance | null> {
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

function normalizeTrafficLevel(currentSpeed, freeFlowSpeed) {
  if (!currentSpeed || !freeFlowSpeed) return "Unknown";
  const ratio = currentSpeed / freeFlowSpeed;
  if (ratio >= 0.8) return "Low";
  if (ratio >= 0.55) return "Moderate";
  return "High";
}

async function fetchTomTomFlowByPoint(lat, lng) {
  if (!TOMTOM_API_KEY) {
    return null;
  }

  const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${lat},${lng}&unit=KMPH&openLr=false&key=${TOMTOM_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  const fs = data?.flowSegmentData;
  if (!fs) {
    return null;
  }

  return {
    currentSpeed: Number(fs.currentSpeed || 0),
    freeFlowSpeed: Number(fs.freeFlowSpeed || 0),
    currentTravelTime: Number(fs.currentTravelTime || 0),
    freeFlowTravelTime: Number(fs.freeFlowTravelTime || 0),
    confidence: Number(fs.confidence || 0),
    roadClosure: Boolean(fs.roadClosure)
  };
}

export async function getTrafficInsights(origin: RoutePoint, destination: RoutePoint): Promise<TrafficInsights | null> {
  if (!origin || !destination) {
    return null;
  }

  const [originGeo, destinationGeo] = await Promise.all([
    geocodePlace(typeof origin === "string" ? origin : `${origin.lat},${origin.lng}`),
    geocodePlace(typeof destination === "string" ? destination : `${destination.lat},${destination.lng}`)
  ]);

  if (!originGeo || !destinationGeo) {
    return null;
  }

  const midLat = (originGeo.lat + destinationGeo.lat) / 2;
  const midLng = (originGeo.lng + destinationGeo.lng) / 2;

  const [originFlow, midFlow, destinationFlow] = await Promise.all([
    fetchTomTomFlowByPoint(originGeo.lat, originGeo.lng),
    fetchTomTomFlowByPoint(midLat, midLng),
    fetchTomTomFlowByPoint(destinationGeo.lat, destinationGeo.lng)
  ]);

  const snapshots = [
    originFlow ? { label: "Origin", ...originFlow } : null,
    midFlow ? { label: "Mid-route", ...midFlow } : null,
    destinationFlow ? { label: "Destination", ...destinationFlow } : null
  ].filter(Boolean);

  if (snapshots.length === 0) {
    return null;
  }

  const avgCurrent = snapshots.reduce((sum, s) => sum + s.currentSpeed, 0) / snapshots.length;
  const avgFree = snapshots.reduce((sum, s) => sum + s.freeFlowSpeed, 0) / snapshots.length;
  const level = normalizeTrafficLevel(avgCurrent, avgFree);

  return {
    level,
    averageCurrentSpeed: Math.round(avgCurrent),
    averageFreeFlowSpeed: Math.round(avgFree),
    congestionPercent: avgFree > 0 ? Math.max(0, Math.round((1 - avgCurrent / avgFree) * 100)) : 0,
    snapshots,
    updatedAt: new Date().toISOString()
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

export function normalizeRouteData(route: RouteIntelligence | null): RouteIntelligence | null {
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
export async function getRouteIntelligence(origin: string, destination: string): Promise<RouteIntelligence | null> {
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

import { ref } from "vue";
import { userLocation } from "./location";

// Real-time fuel prices by state/city (will be updated based on user location)
const fuelPricesCache = ref({
  lastUpdated: null,
  location: null,
  prices: {
    Petrol: 104.21,
    Diesel: 92.15,
    CNG: 76.59,
    Electric: 8.5
  }
});

// State-wise fuel prices (approximate real data for Indian states)
const STATE_FUEL_PRICES = {
  "Delhi": { Petrol: 96.72, Diesel: 89.62, CNG: 75.61, Electric: 8.0 },
  "Mumbai": { Petrol: 106.31, Diesel: 94.27, CNG: 76.00, Electric: 9.5 },
  "Maharashtra": { Petrol: 106.31, Diesel: 94.27, CNG: 76.00, Electric: 9.5 },
  "Karnataka": { Petrol: 102.86, Diesel: 88.94, CNG: 80.00, Electric: 7.5 },
  "Tamil Nadu": { Petrol: 102.63, Diesel: 94.24, CNG: 78.50, Electric: 8.0 },
  "Kerala": { Petrol: 107.71, Diesel: 96.78, CNG: 82.00, Electric: 7.0 },
  "Rajasthan": { Petrol: 108.48, Diesel: 93.72, CNG: 77.20, Electric: 7.8 },
  "Gujarat": { Petrol: 96.50, Diesel: 92.50, CNG: 68.50, Electric: 7.5 },
  "West Bengal": { Petrol: 106.03, Diesel: 92.76, CNG: 76.00, Electric: 8.2 },
  "Uttar Pradesh": { Petrol: 96.57, Diesel: 89.87, CNG: 75.00, Electric: 8.0 },
  "Haryana": { Petrol: 96.79, Diesel: 89.84, CNG: 75.50, Electric: 8.0 },
  "Punjab": { Petrol: 102.26, Diesel: 90.68, CNG: 76.80, Electric: 7.8 },
  "Telangana": { Petrol: 109.66, Diesel: 97.82, CNG: 79.00, Electric: 8.2 },
  "Andhra Pradesh": { Petrol: 106.56, Diesel: 98.46, CNG: 79.50, Electric: 7.5 },
  "Madhya Pradesh": { Petrol: 108.65, Diesel: 93.61, CNG: 77.00, Electric: 7.6 },
  "Goa": { Petrol: 94.19, Diesel: 87.88, CNG: 80.00, Electric: 7.2 },
  "Bihar": { Petrol: 107.24, Diesel: 95.76, CNG: 78.00, Electric: 8.0 },
  "Odisha": { Petrol: 103.19, Diesel: 96.96, CNG: 79.00, Electric: 7.8 },
  "Jharkhand": { Petrol: 101.85, Diesel: 94.24, CNG: 77.50, Electric: 7.9 }
};

// Default prices if state not found
const DEFAULT_PRICES = { Petrol: 104.21, Diesel: 92.15, CNG: 76.59, Electric: 8.5 };

/**
 * Get real-time fuel prices based on user location
 * @returns {Object} Fuel prices for current location
 */
export function getFuelPrices() {
  const currentState = userLocation.value.state || "Delhi";
  
  // Check if we need to update prices based on location change
  if (fuelPricesCache.value.location !== currentState) {
    const statePrices = STATE_FUEL_PRICES[currentState] || DEFAULT_PRICES;
    
    fuelPricesCache.value = {
      lastUpdated: new Date(),
      location: currentState,
      prices: { ...statePrices }
    };
  }
  
  return fuelPricesCache.value;
}

/**
 * Get price for a specific fuel type
 * @param {string} fuelType - Type of fuel (Petrol, Diesel, CNG, Electric)
 * @returns {number} Price per unit
 */
export function getFuelPrice(fuelType) {
  const prices = getFuelPrices();
  return prices.prices[fuelType] || DEFAULT_PRICES[fuelType] || 100;
}

/**
 * Get formatted fuel price info with location
 * @param {string} fuelType - Type of fuel
 * @returns {Object} Formatted price information
 */
export function getFuelPriceInfo(fuelType) {
  const priceData = getFuelPrices();
  const price = priceData.prices[fuelType];
  const unit = getUnitForFuel(fuelType);
  const location = priceData.location || "India";
  
  return {
    price,
    unit,
    location,
    formattedPrice: `₹${price.toFixed(2)}/${unit}`,
    lastUpdated: priceData.lastUpdated
  };
}

/**
 * Get unit for fuel type
 * @param {string} fuelType
 * @returns {string}
 */
function getUnitForFuel(fuelType) {
  if (fuelType === "Electric") return "kWh";
  if (fuelType === "CNG") return "kg";
  return "L";
}

/**
 * Fetch toll prices for a specific route (placeholder for real API integration)
 * In production, this would call a real toll API with route details
 * @param {Object} routeInfo - Route information (origin, destination, distance)
 * @returns {Promise<Object>} Toll information
 */
export async function getTollPricesForRoute(routeInfo) {
  // This is a placeholder. In production, integrate with:
  // - FASTag APIs
  // - Google Maps Toll API
  // - TollGuru API
  // - National Highway Authority of India (NHAI) APIs
  
  const { distanceKm = 0, travelMode = "Car", routeName = "Unknown Route" } = routeInfo;
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Mock toll data based on route
  const tollsPerKm = {
    "Car": 1.2,
    "Bike": 0.35,
    "Bus": 1.55
  };
  
  const baseRate = tollsPerKm[travelMode] || 1.2;
  const estimatedToll = distanceKm * baseRate;
  
  return {
    totalToll: Math.round(estimatedToll),
    tollPlazas: Math.ceil(distanceKm / 100), // Approximate: 1 toll per 100km
    route: routeName,
    breakdown: [
      {
        name: "NH Toll Plaza 1",
        amount: Math.round(estimatedToll * 0.4),
        location: "Approx 1/3 of route"
      },
      {
        name: "NH Toll Plaza 2",
        amount: Math.round(estimatedToll * 0.35),
        location: "Approx 2/3 of route"
      },
      {
        name: "State Highway Toll",
        amount: Math.round(estimatedToll * 0.25),
        location: "Near destination"
      }
    ]
  };
}

export { fuelPricesCache };

/**
 * Legacy compatibility surface for existing ../services/gemini imports.
 * Domain logic lives in src/services/ai, src/services/maps, and src/services/travel.
 */

export { isGeminiConfigured } from "./ai/planner.service";
export { generateTravelPlan } from "./ai/itinerary.service";
export { generateBudgetEstimate } from "./ai/budget.service";
export {
  generateDestinationSuggestions,
  getDestinationDetails,
  getRealLocationData,
  resolveUnsplashImage
} from "./ai/recommendation.service";
export { parseMapsInput, geocodePlace } from "./maps/geocoding.service";
export { getRouteIntelligence, normalizeRouteData } from "./maps/route.service";

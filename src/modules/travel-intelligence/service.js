import { getCostIntelligence } from "./services/cost-intelligence";
import { getCrowdIntelligence } from "./services/crowd-intelligence";
import { getSafetyIntelligence } from "./services/safety-intelligence";
import { getSeasonIntelligence } from "./services/season-intelligence";
import { getTrafficIntelligence } from "./services/traffic-intelligence";
import { getWeatherIntelligence } from "./services/weather-intelligence";

export async function getTravelIntelligenceDashboard(options = {}) {
  const location = options?.location || {};
  const trips = Array.isArray(options?.trips) ? options.trips : [];

  const weather = await getWeatherIntelligence(location);

  const [traffic, crowd] = await Promise.all([
    getTrafficIntelligence({
      city: location?.city,
      origin: options?.origin || location?.city || location?.country || "Current location",
      destination: options?.destination || `${location?.city || "city"} center`
    }),
    getCrowdIntelligence(location)
  ]);

  const season = getSeasonIntelligence({ weather });
  const safety = getSafetyIntelligence({ weather, traffic, crowd });
  const cost = getCostIntelligence({ trips, weather, crowd });

  return {
    weather,
    traffic,
    crowd,
    season,
    safety,
    cost,
    generatedAt: new Date().toISOString()
  };
}

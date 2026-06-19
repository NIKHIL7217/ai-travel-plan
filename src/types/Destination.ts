import type { LocationData, WeatherForecastDay } from "./Trip";

export interface DestinationSuggestion {
  id: string;
  name: string;
  location: string;
  rating: number;
  startingBudget: number;
  bestTime: string;
  description: string;
  image: string;
  [key: string]: unknown;
}

export interface DestinationProfile extends DestinationSuggestion {
  [key: string]: unknown;
}

export interface DestinationDetails extends DestinationProfile {
  reviewsCount?: number;
  localCurrency?: string;
  aqi?: number | null;
  travelScore?: number;
  safetyScore?: number;
  weatherForecast?: WeatherForecastDay[];
  budgetBreakdown?: Record<string, number>;
  locationData?: LocationData;
}

export interface DestinationOverview {
  description: string;
  longDescription: string;
  bestTime: string;
  attractions: Array<{ name: string; desc: string }>;
  food: Array<{ name: string; desc: string }>;
  tips: string[];
}

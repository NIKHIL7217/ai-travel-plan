export interface Coordinates {
  lat: number;
  lng: number;
}

export interface WeatherForecastDay {
  day: string;
  temp: string;
  general: string;
  aqi: number | null;
}

export interface WeatherReport {
  temp: string;
  humidity: string;
  windSpeed: string;
  rainProbability: string;
  aqi: number | null;
  weatherForecast: WeatherForecastDay[];
}

export type PlaceType = "lodging" | "restaurant" | "attraction" | "fuel" | "ev" | "hospital";

export interface NearbyPlace {
  name: string;
  rating?: number;
  reviews?: number;
  distance?: string;
  lat?: number;
  lng?: number;
  address?: string;
  price?: number;
  averagePrice?: number;
  tier?: string;
  type?: string;
  phone?: string;
  desc?: string;
  [key: string]: unknown;
}

export interface LocationData {
  hotels?: NearbyPlace[];
  restaurants?: NearbyPlace[];
  hospitals?: NearbyPlace[];
  fuelStations?: NearbyPlace[];
  evChargingStations?: NearbyPlace[];
  attractions?: NearbyPlace[];
  updatedAt?: string;
  [key: string]: unknown;
}

export type RoutePoint = string | { lat: number; lng: number; city?: string };

export interface RouteDistance {
  distance: number;
  durationSeconds: Record<string, number>;
  originCoords: Coordinates;
  destCoords: Coordinates;
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
  vehicleBreakdown?: Record<string, unknown>;
  fuelStops?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

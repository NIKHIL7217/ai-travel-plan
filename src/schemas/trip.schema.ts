import { z } from "zod";
import type {
  LocationData,
  NearbyPlace,
  RouteDistance,
  RouteIntelligence,
  TrafficInsights,
  WeatherForecastDay,
  WeatherReport
} from "../types/Trip";

export const coordinatesSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180)
});

export const weatherForecastDaySchema: z.ZodType<WeatherForecastDay> = z.object({
  day: z.string().min(1),
  temp: z.string().min(1),
  general: z.string().min(1),
  aqi: z.number().finite().nonnegative().nullable()
});

export const weatherReportSchema: z.ZodType<WeatherReport> = z.object({
  temp: z.string().min(1),
  humidity: z.string().min(1),
  windSpeed: z.string().min(1),
  rainProbability: z.string().min(1),
  aqi: z.number().finite().nonnegative().nullable(),
  weatherForecast: z.array(weatherForecastDaySchema)
});

export const nearbyPlaceSchema: z.ZodType<NearbyPlace> = z
  .object({
    name: z.string().min(1),
    rating: z.number().finite().min(0).max(5).optional(),
    reviews: z.number().finite().nonnegative().optional(),
    distance: z.string().optional(),
    lat: z.number().finite().min(-90).max(90).optional(),
    lng: z.number().finite().min(-180).max(180).optional(),
    address: z.string().optional(),
    price: z.number().finite().nonnegative().optional(),
    averagePrice: z.number().finite().nonnegative().optional(),
    tier: z.string().optional(),
    type: z.string().optional(),
    phone: z.string().optional(),
    desc: z.string().optional()
  })
  .passthrough();

export const nearbyPlacesSchema = z.array(nearbyPlaceSchema);

export const locationDataSchema: z.ZodType<LocationData> = z
  .object({
    hotels: nearbyPlacesSchema.optional(),
    restaurants: nearbyPlacesSchema.optional(),
    hospitals: nearbyPlacesSchema.optional(),
    fuelStations: nearbyPlacesSchema.optional(),
    evChargingStations: nearbyPlacesSchema.optional(),
    attractions: nearbyPlacesSchema.optional(),
    updatedAt: z.string().optional()
  })
  .passthrough();

export const routeDistanceSchema: z.ZodType<RouteDistance> = z.object({
  distance: z.number().finite().nonnegative(),
  durationSeconds: z.record(z.string(), z.number().finite().nonnegative()),
  originCoords: coordinatesSchema,
  destCoords: coordinatesSchema
});

export const trafficInsightsSchema: z.ZodType<TrafficInsights> = z.object({
  level: z.string().min(1),
  averageCurrentSpeed: z.number().finite().nonnegative(),
  averageFreeFlowSpeed: z.number().finite().nonnegative(),
  congestionPercent: z.number().finite().min(0).max(100),
  snapshots: z.array(z.record(z.string(), z.unknown())),
  updatedAt: z.string().min(1)
});

export const routeIntelligenceSchema: z.ZodType<RouteIntelligence> = z
  .object({
    origin: z.string().min(1),
    destination: z.string().min(1),
    roadDistance: z.number().finite().nonnegative(),
    flightDistance: z.number().finite().nonnegative(),
    routeSummary: z.string().min(1),
    vehicleBreakdown: z.record(z.string(), z.unknown()),
    fuelStops: z.array(z.record(z.string(), z.unknown()))
  })
  .passthrough();

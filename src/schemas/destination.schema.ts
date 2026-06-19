import { z } from "zod";
import type {
  DestinationDetails,
  DestinationOverview,
  DestinationSuggestion
} from "../types/Destination";
import { locationDataSchema, weatherForecastDaySchema } from "./trip.schema";

const namedDescriptionSchema = z
  .object({
    name: z.string().min(1),
    desc: z.string().min(1)
  })
  .passthrough();

export const destinationSuggestionSchema: z.ZodType<DestinationSuggestion> = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    location: z.string().min(1),
    rating: z.number().finite().min(0).max(5),
    startingBudget: z.number().finite().nonnegative(),
    bestTime: z.string().min(1),
    description: z.string().min(1),
    image: z.string().min(1)
  })
  .passthrough();

export const destinationSuggestionsSchema = z.array(destinationSuggestionSchema);

export const destinationOverviewSchema: z.ZodType<DestinationOverview> = z
  .object({
    description: z.string().min(1),
    longDescription: z.string().min(1),
    bestTime: z.string().min(1),
    attractions: z.array(namedDescriptionSchema),
    food: z.array(namedDescriptionSchema),
    tips: z.array(z.string().min(1))
  })
  .passthrough();

export const destinationDetailsSchema: z.ZodType<DestinationDetails> = destinationSuggestionSchema
  .extend({
    reviewsCount: z.number().finite().nonnegative().optional(),
    localCurrency: z.string().optional(),
    aqi: z.number().finite().nonnegative().nullable().optional(),
    travelScore: z.number().finite().optional(),
    safetyScore: z.number().finite().optional(),
    weatherForecast: z.array(weatherForecastDaySchema).optional(),
    budgetBreakdown: z.record(z.string(), z.number().finite().nonnegative()).optional(),
    attractions: z.array(namedDescriptionSchema).optional(),
    food: z.array(namedDescriptionSchema).optional(),
    hotels: z.array(z.record(z.string(), z.unknown())).optional(),
    locationData: locationDataSchema.optional()
  })
  .passthrough();

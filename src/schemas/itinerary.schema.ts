import { z } from "zod";
import type { TravelPlan, TravelPlanDay } from "../types/Itinerary";

export const travelPlanDaySchema: z.ZodType<TravelPlanDay> = z.object({
  day: z.number().finite().int().positive(),
  theme: z.string().min(1),
  morning: z.string().min(1),
  afternoon: z.string().min(1),
  evening: z.string().min(1),
  foodRecommendation: z.string().min(1)
});

export const travelPlanSchema: z.ZodType<TravelPlan> = z
  .object({
    destination: z.string().min(1),
    tagline: z.string().min(1),
    summary: z.string().min(1),
    itinerary: z.array(travelPlanDaySchema).min(1)
  })
  .passthrough();

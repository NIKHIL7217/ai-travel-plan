import { z } from "zod";
import type { BudgetEstimate } from "../types/Budget";

export const budgetEstimateSchema: z.ZodType<BudgetEstimate> = z.object({
  flights: z.number().finite().int().nonnegative(),
  accommodation: z.number().finite().int().nonnegative(),
  food: z.number().finite().int().nonnegative(),
  transportation: z.number().finite().int().nonnegative(),
  activities: z.number().finite().int().nonnegative(),
  total: z.number().finite().int().nonnegative()
});

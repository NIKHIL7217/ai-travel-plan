export interface BudgetEstimateOptions {
  userQuery?: string;
  requireLive?: boolean;
  stayPreference?: string;
  foodPreference?: string;
  budgetLimit?: number;
  sourceQuery?: string;
  memoryContext?: string;
}

export interface BudgetEstimate {
  flights: number;
  accommodation: number;
  food: number;
  transportation: number;
  activities: number;
  total: number;
}

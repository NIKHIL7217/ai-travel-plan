export interface TravelPlanOptions {
  userQuery?: string;
  requireLive?: boolean;
  fastPath?: boolean;
  allowFallbackWithoutLive?: boolean;
  stayPreference?: string;
  foodPreference?: string;
  sourceQuery?: string;
  memoryContext?: string;
}

export interface TravelPlanDay {
  day: number;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
  foodRecommendation: string;
}

export interface TravelPlan {
  destination: string;
  tagline: string;
  summary: string;
  itinerary: TravelPlanDay[];
  [key: string]: unknown;
}

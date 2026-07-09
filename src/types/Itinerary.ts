export interface TravelPlanOptions {
  userQuery?: string;
  requireLive?: boolean;
  fastPath?: boolean;
  allowFallbackWithoutLive?: boolean;
  stayPreference?: string;
  foodPreference?: string;
  sourceQuery?: string;
  memoryContext?: string;
  startDate?: string;
  endDate?: string;
}

export interface PlaceMetadata {
  officialName: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMaps: string | null;
  openingHours: string | null;
  closingHours: string | null;
  averageVisitDuration: string | null;
  entryFee: string | null;
  bookingRequired: boolean | null;
  officialWebsite: string | null;
  image_url: string | null;
}

export interface ItineraryTransportLeg {
  distanceKm: number | null;
  estimatedTravelTimeMinutes: number | null;
  recommendedTransport: string;
  cabCostInr: number | null;
  busCostInr: number | null;
  selfDrive: boolean;
  walking: boolean;
  parkingAvailability: string | null;
  roadCondition: string | null;
}

export interface ItineraryActivity {
  slot: string;
  startTime: string | null;
  endTime: string | null;
  activityType: string;
  title: string;
  description: string;
  whyVisit: string;
  location: PlaceMetadata;
  estimatedCostInr: number | null;
  suitableFor: string[];
  tags: string[];
  transportFromPrevious: ItineraryTransportLeg | null;
  seasonality: string | null;
}

export interface DailyWeatherBrief {
  temperature: string | null;
  rainChance: string | null;
  snowChance: string | null;
  packingSuggestion: string | null;
}

export interface DailyItinerary {
  day: number;
  date: string | null;
  theme: string;
  weather: DailyWeatherBrief;
  activities: ItineraryActivity[];
}

export interface HotelRecommendation {
  name: string;
  tier: string;
  rating: number | null;
  pricePerNightInr: number | null;
  googleMaps: string | null;
  bookingLink: string | null;
  amenities: string[];
  familyFriendly: boolean | null;
  coupleFriendly: boolean | null;
  parking: boolean | null;
  wifi: boolean | null;
  breakfast: boolean | null;
}

export interface TravelPlanDay {
  day: number;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
  foodRecommendation: string;
  detailedSchedule?: DailyItinerary;
}

export interface TravelPlan {
  trip?: {
    destination: string;
    travelers: number;
    days: number;
    style: string;
    travelMode: string;
    season: string;
  };
  destination: string;
  tagline: string;
  summary: string;
  itinerary: TravelPlanDay[];
  days?: DailyItinerary[];
  activities?: ItineraryActivity[];
  restaurants?: Array<Record<string, unknown>>;
  cafes?: Array<Record<string, unknown>>;
  hotels?: HotelRecommendation[];
  transport?: Record<string, unknown>;
  shopping?: Array<Record<string, unknown>>;
  foods?: Array<Record<string, unknown>>;
  weather?: Record<string, unknown>;
  events?: Array<Record<string, unknown>>;
  travelTips?: Array<Record<string, unknown>>;
  budget?: Record<string, unknown>;
  images?: Array<Record<string, unknown>>;
  maps?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

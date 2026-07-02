/**
 * Unified Discovery Service
 * 
 * Purpose: Ek baar mein saara destination data fetch karo aur cache karo.
 * Different sections (Premium Feed, Memory Feed, Trending, etc.) ke liye 
 * same data ko filter/slice karke use karo to minimize API calls.
 */

import { CacheBuckets, withCache } from "../../core/cache/dataCache";
import { generateDestinationSuggestions, resolveDestinationPhoto } from "./recommendation.service";
import { geocodePlace } from "../maps/geocoding.service";
import { getRouteDistance } from "../maps/route.service";
import type { DestinationSuggestion } from "../../types/Destination";

const UNIFIED_DATA_TTL_MS = 1000 * 60 * 20; // 20 minutes cache

export interface EnrichedDestination extends DestinationSuggestion {
  distanceKm?: number;
  lat?: number | null;
  lng?: number | null;
}

export interface UnifiedDiscoveryData {
  nearby: EnrichedDestination[];
  weekend: EnrichedDestination[];
  seasonal: EnrichedDestination[];
  trending: EnrichedDestination[];
  premium: EnrichedDestination[];
  hidden: EnrichedDestination[];
  budget: EnrichedDestination[];
  luxury: EnrichedDestination[];
  allDestinations: EnrichedDestination[];
  timestamp: number;
}

/**
 * Season label based on current month
 */
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if ([11, 0, 1].includes(month)) return "winter";
  if ([2, 3, 4].includes(month)) return "spring";
  if ([5, 6, 7].includes(month)) return "summer";
  return "autumn";
}

/**
 * Enrich destination with geo data and distance
 */
async function enrichDestination(
  dest: DestinationSuggestion,
  userLocation: { lat: number | null; lng: number | null; city?: string; country?: string }
): Promise<EnrichedDestination> {
  try {
    // Geocode destination
    const geo = await geocodePlace(`${dest.name}, ${dest.location}`);
    
    // Calculate distance if user location is available
    let distanceKm = 0;
    if (geo && userLocation.lat !== null && userLocation.lng !== null) {
      const route = await getRouteDistance(
        { lat: userLocation.lat, lng: userLocation.lng },
        { lat: geo.lat, lng: geo.lng }
      );
      distanceKm = Number(route?.distance || 0);
    }

    // Get better image
    const image = await resolveDestinationPhoto(dest.name, geo?.lat, geo?.lng);

    return {
      ...dest,
      distanceKm,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      image: image || dest.image
    };
  } catch (error) {
    console.warn(`Failed to enrich destination ${dest.name}:`, error);
    return {
      ...dest,
      distanceKm: 0,
      lat: null,
      lng: null
    };
  }
}

/**
 * Main unified data fetching function
 * Ek baar mein saara data fetch karta hai
 */
export async function fetchUnifiedDiscoveryData(
  userLocation: { lat: number | null; lng: number | null; city?: string; country?: string }
): Promise<UnifiedDiscoveryData> {
  const city = userLocation?.city || userLocation?.country || "your region";
  const season = getCurrentSeason();
  const cacheKey = `unified-discovery:${city}:${season}`.toLowerCase();

  return withCache(CacheBuckets.destination, cacheKey, UNIFIED_DATA_TTL_MS, async () => {
    console.log(`🔄 Fetching unified discovery data for ${city} (${season})...`);

    try {
      // Single comprehensive query to get diverse destinations
      const comprehensiveQuery = `
        Best travel destinations from ${city} including:
        - Nearby weekend getaways (under 500km)
        - Seasonal ${season} destinations
        - Trending popular places
        - Premium luxury experiences
        - Budget-friendly options
        - Hidden gems and offbeat locations
        Provide diverse mix of 40+ unique destinations
      `;

      // Fetch all destinations in ONE API call
      const rawDestinations = await generateDestinationSuggestions(comprehensiveQuery);
      
      if (!rawDestinations || rawDestinations.length === 0) {
        console.warn("⚠️ No destinations received from API, using demo data");
        return createDemoData(city);
      }

      console.log(`✅ Received ${rawDestinations.length} destinations from API`);

      // Enrich first 30 destinations with geo data (parallel processing)
      const destinationsToEnrich = rawDestinations.slice(0, 30);
      const enrichedDestinations = await Promise.all(
        destinationsToEnrich.map(dest => enrichDestination(dest, userLocation))
      );

      // Add remaining destinations without enrichment (for performance)
      const remainingDestinations = rawDestinations.slice(30).map(dest => ({
        ...dest,
        distanceKm: 0,
        lat: null,
        lng: null
      }));

      const allDestinations = [...enrichedDestinations, ...remainingDestinations];

      // Filter and categorize destinations
      const nearby = allDestinations
        .filter(d => d.distanceKm > 0 && d.distanceKm < 500)
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
        .slice(0, 12);

      const weekend = allDestinations
        .filter(d => d.distanceKm > 0 && d.distanceKm < 800)
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
        .slice(0, 12);

      const seasonal = allDestinations
        .filter(d => {
          const bestTime = (d.bestTime || "").toLowerCase();
          return bestTime.includes(season) || bestTime.includes(getCurrentMonthName());
        })
        .slice(0, 12);

      const trending = allDestinations
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 12);

      const premium = allDestinations
        .filter(d => (d.startingBudget || 0) > 80000)
        .sort((a, b) => (b.startingBudget || 0) - (a.startingBudget || 0))
        .slice(0, 12);

      const luxury = allDestinations
        .filter(d => (d.startingBudget || 0) > 100000)
        .slice(0, 10);

      const budget = allDestinations
        .filter(d => (d.startingBudget || 0) < 30000 && (d.startingBudget || 0) > 0)
        .sort((a, b) => (a.startingBudget || 0) - (b.startingBudget || 0))
        .slice(0, 12);

      const hidden = allDestinations
        .filter(d => (d.rating || 0) < 4.6) // Less popular = hidden gems
        .slice(0, 12);

      console.log(`📊 Categorized: Nearby=${nearby.length}, Weekend=${weekend.length}, Seasonal=${seasonal.length}, Trending=${trending.length}`);

      return {
        nearby: fillWithFallback(nearby, allDestinations, 8),
        weekend: fillWithFallback(weekend, allDestinations, 8),
        seasonal: fillWithFallback(seasonal, allDestinations, 8),
        trending: fillWithFallback(trending, allDestinations, 12),
        premium: fillWithFallback(premium, allDestinations, 10),
        hidden: fillWithFallback(hidden, allDestinations, 8),
        budget: fillWithFallback(budget, allDestinations, 10),
        luxury: fillWithFallback(luxury, allDestinations, 8),
        allDestinations,
        timestamp: Date.now()
      };
    } catch (error) {
      console.warn("⚠️ API error, using demo fallback data:", error);
      return createDemoData(city);
    }
  });
}

/**
 * Fill category with fallback destinations if needed
 */
function fillWithFallback(
  category: EnrichedDestination[],
  allDestinations: EnrichedDestination[],
  targetCount: number
): EnrichedDestination[] {
  if (category.length >= targetCount) {
    return category.slice(0, targetCount);
  }

  const existingIds = new Set(category.map(d => d.id));
  const fallback = allDestinations
    .filter(d => !existingIds.has(d.id))
    .slice(0, targetCount - category.length);

  return [...category, ...fallback].slice(0, targetCount);
}

/**
 * Get current month name for seasonal filtering
 */
function getCurrentMonthName(): string {
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  return months[new Date().getMonth()];
}

/**
 * Create empty data structure
 */
function createEmptyData(): UnifiedDiscoveryData {
  return {
    nearby: [],
    weekend: [],
    seasonal: [],
    trending: [],
    premium: [],
    hidden: [],
    budget: [],
    luxury: [],
    allDestinations: [],
    timestamp: Date.now()
  };
}

/**
 * Create demo/fallback data when API fails
 */
function createDemoData(city: string = "your region"): UnifiedDiscoveryData {
  // Realistic demo destinations based on Indian geography
  const demoDestinations: EnrichedDestination[] = [
    {
      id: "agra",
      name: "Agra",
      location: "Uttar Pradesh, India",
      rating: 4.8,
      startingBudget: 15000,
      bestTime: "Oct-Mar",
      description: "Home to the iconic Taj Mahal, one of the Seven Wonders of the World",
      image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80",
      distanceKm: 233,
      lat: 27.1767,
      lng: 78.0081
    },
    {
      id: "jaipur",
      name: "Jaipur",
      location: "Rajasthan, India",
      rating: 4.7,
      startingBudget: 18000,
      bestTime: "Nov-Feb",
      description: "The Pink City with magnificent forts and palaces",
      image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80",
      distanceKm: 280,
      lat: 26.9124,
      lng: 75.7873
    },
    {
      id: "shimla",
      name: "Shimla",
      location: "Himachal Pradesh, India",
      rating: 4.6,
      startingBudget: 22000,
      bestTime: "Mar-Jun",
      description: "Beautiful hill station with colonial architecture",
      image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80",
      distanceKm: 342,
      lat: 31.1048,
      lng: 77.1734
    },
    {
      id: "goa",
      name: "Goa",
      location: "India",
      rating: 4.7,
      startingBudget: 25000,
      bestTime: "Nov-Feb",
      description: "Beach paradise with vibrant nightlife and Portuguese heritage",
      image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
      distanceKm: 1465,
      lat: 15.2993,
      lng: 74.1240
    },
    {
      id: "manali",
      name: "Manali",
      location: "Himachal Pradesh, India",
      rating: 4.6,
      startingBudget: 20000,
      bestTime: "Oct-Jun",
      description: "Scenic mountain resort perfect for adventure and relaxation",
      image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80",
      distanceKm: 570,
      lat: 32.2396,
      lng: 77.1887
    },
    {
      id: "udaipur",
      name: "Udaipur",
      location: "Rajasthan, India",
      rating: 4.8,
      startingBudget: 24000,
      bestTime: "Sep-Mar",
      description: "The City of Lakes with stunning palaces and romantic ambiance",
      image: "https://images.unsplash.com/photo-1615568261314-e0c1f51ee19d?auto=format&fit=crop&w=800&q=80",
      distanceKm: 395,
      lat: 24.5854,
      lng: 73.7125
    },
    {
      id: "rishikesh",
      name: "Rishikesh",
      location: "Uttarakhand, India",
      rating: 4.7,
      startingBudget: 16000,
      bestTime: "Sep-Apr",
      description: "Yoga capital of the world with adventure sports on the Ganges",
      image: "https://images.unsplash.com/photo-1551879400-112000a66d66?auto=format&fit=crop&w=800&q=80",
      distanceKm: 238,
      lat: 30.0869,
      lng: 78.2676
    },
    {
      id: "varanasi",
      name: "Varanasi",
      location: "Uttar Pradesh, India",
      rating: 4.6,
      startingBudget: 14000,
      bestTime: "Oct-Mar",
      description: "Spiritual capital with ancient ghats along the holy Ganges",
      image: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80",
      distanceKm: 780,
      lat: 25.3176,
      lng: 82.9739
    },
    {
      id: "kerala",
      name: "Kerala",
      location: "India",
      rating: 4.8,
      startingBudget: 28000,
      bestTime: "Sep-Mar",
      description: "God's Own Country with backwaters, beaches, and lush greenery",
      image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80",
      distanceKm: 2100,
      lat: 10.8505,
      lng: 76.2711
    },
    {
      id: "mumbai",
      name: "Mumbai",
      location: "Maharashtra, India",
      rating: 4.5,
      startingBudget: 22000,
      bestTime: "Nov-Feb",
      description: "The City of Dreams with Bollywood, beaches, and bustling streets",
      image: "https://images.unsplash.com/photo-1562158074-a5e2f75a7c29?auto=format&fit=crop&w=800&q=80",
      distanceKm: 1150,
      lat: 19.0760,
      lng: 72.8777
    }
  ];

  console.log(`📦 Using demo data with ${demoDestinations.length} destinations for ${city}`);

  // Categorize demo data
  const nearby = demoDestinations.filter(d => d.distanceKm < 500);
  const weekend = demoDestinations.filter(d => d.distanceKm < 800);
  const seasonal = demoDestinations.filter(d => {
    const season = getCurrentSeason();
    return (d.bestTime || "").toLowerCase().includes(season);
  });
  const trending = [...demoDestinations].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const premium = demoDestinations.filter(d => (d.startingBudget || 0) > 20000);
  const budget = demoDestinations.filter(d => (d.startingBudget || 0) < 20000);
  const luxury = demoDestinations.filter(d => (d.startingBudget || 0) > 25000);
  const hidden = demoDestinations.filter(d => (d.rating || 0) < 4.7);

  return {
    nearby: nearby.slice(0, 8),
    weekend: weekend.slice(0, 8),
    seasonal: seasonal.slice(0, 8),
    trending: trending.slice(0, 12),
    premium: premium.slice(0, 10),
    hidden: hidden.slice(0, 8),
    budget: budget.slice(0, 10),
    luxury: luxury.slice(0, 8),
    allDestinations: demoDestinations,
    timestamp: Date.now()
  };
}

/**
 * Get specific category from unified data
 */
export function getCategoryDestinations(
  data: UnifiedDiscoveryData,
  category: keyof Omit<UnifiedDiscoveryData, "allDestinations" | "timestamp">
): EnrichedDestination[] {
  return data[category] || [];
}

/**
 * Get top N destinations from any category
 */
export function getTopDestinations(
  data: UnifiedDiscoveryData,
  category: keyof Omit<UnifiedDiscoveryData, "allDestinations" | "timestamp">,
  count: number = 10
): EnrichedDestination[] {
  return (data[category] || []).slice(0, count);
}

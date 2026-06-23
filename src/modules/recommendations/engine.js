import { generateDestinationSuggestions, getDestinationDetails } from "../../services/gemini";

const SEASON_MAP = {
  winter: [11, 0, 1],
  summer: [3, 4, 5],
  monsoon: [6, 7, 8],
  autumn: [9, 10, 2]
};

function getSeasonName(date = new Date()) {
  const month = Number(date?.getMonth?.() ?? new Date().getMonth());

  for (const [season, months] of Object.entries(SEASON_MAP)) {
    if (months.includes(month)) {
      return season;
    }
  }

  return "seasonal";
}

function normalizeList(values = []) {
  return values.map((value) => String(value || "").trim()).filter(Boolean);
}

function topFavoriteDestinations(profileMemory) {
  const favorites = Array.isArray(profileMemory?.preferences?.favoriteDestinations)
    ? profileMemory.preferences.favoriteDestinations
    : [];

  return favorites
    .slice(0, 3)
    .map((item) => item?.name)
    .filter(Boolean);
}

function buildPreferenceQuery({ profileMemory, personalityLabel, budgetTarget, season }) {
  const favorites = topFavoriteDestinations(profileMemory);
  const style = String(profileMemory?.preferences?.travelStyle || "balanced");
  const transport = String(profileMemory?.preferences?.transportPreference || "car");
  const budgetHint = Number(budgetTarget || profileMemory?.preferences?.budgetPreference?.target || 1500);
  const destinationHint = favorites.length > 0 ? favorites.join(", ") : "popular destinations";

  return `${season} ${style} ${destinationHint} ${personalityLabel || "traveler"} trips under ${budgetHint} budget by ${transport}`;
}

function activitySuggestions({ personalityLabel, season, budgetTarget }) {
  const personality = String(personalityLabel || "Explorer").toLowerCase();
  const budget = Number(budgetTarget || 1500);

  const base = [
    `Seasonal ${season} experiences near city center`,
    "Walkable local food and culture circuit",
    "Half-day flexible itinerary with buffer slots"
  ];

  if (personality.includes("food")) {
    return [
      "Chef-recommended local restaurants",
      "Street-food crawl with hygiene-safe stops",
      ...base
    ];
  }

  if (personality.includes("luxury")) {
    return [
      "Premium stay plus spa and skyline evening",
      "Curated reservation-first activities",
      ...base
    ];
  }

  if (personality.includes("road")) {
    return [
      "Scenic highway stop loop",
      "Sunrise and sunset photography points",
      "Fuel and toll optimized route segments",
      ...base
    ];
  }

  if (budget < 1000) {
    return [
      "Budget-friendly sightseeing clusters",
      "Public transit and walk-first mobility",
      ...base
    ];
  }

  return base;
}

function flattenDetailEntries(detailsList, selector) {
  const all = detailsList
    .flatMap((item) => selector(item || {}))
    .filter(Boolean)
    .map((item) => {
      if (typeof item === "string") {
        return { name: item };
      }
      return item;
    });

  const seen = new Set();
  return all.filter((item) => {
    const key = String(item?.name || "").trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function getSmartRecommendations({
  profileMemory,
  personalityLabel,
  budgetTarget,
  limit = 4
} = {}) {
  const season = getSeasonName();
  const query = buildPreferenceQuery({
    profileMemory,
    personalityLabel,
    budgetTarget,
    season
  });

  const destinations = await generateDestinationSuggestions(query);
  const pickedDestinations = (destinations || []).slice(0, Math.max(2, Number(limit || 4)));

  const detailSettled = await Promise.allSettled(
    pickedDestinations.slice(0, 2).map((destination) => getDestinationDetails(destination.name))
  );

  const details = detailSettled
    .filter((entry) => entry.status === "fulfilled")
    .map((entry) => entry.value)
    .filter(Boolean);

  const hotels = flattenDetailEntries(details, (item) => item.hotels || []).slice(0, 6);
  const attractions = flattenDetailEntries(details, (item) => item.attractions || []).slice(0, 6);
  const restaurants = flattenDetailEntries(details, (item) => item.food || []).slice(0, 6);
  const destinationNames = normalizeList(pickedDestinations.map((item) => item.name));

  return {
    generatedAt: new Date().toISOString(),
    season,
    query,
    destinations: pickedDestinations,
    hotels,
    attractions,
    restaurants,
    activities: activitySuggestions({
      personalityLabel,
      season,
      budgetTarget
    }),
    rationale: [
      `Matched to ${personalityLabel || "Explorer"} personality pattern`,
      `Adjusted for ${season} season`,
      `Optimized near budget target ${Math.round(Number(budgetTarget || 1500))}`,
      destinationNames.length ? `Anchored by favorite signals: ${destinationNames.join(", ")}` : "Using broad destination discovery"
    ]
  };
}

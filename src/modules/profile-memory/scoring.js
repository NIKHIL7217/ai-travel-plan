function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function distribution(values = []) {
  const map = new Map();
  values.forEach((value) => {
    const key = String(value || "").trim().toLowerCase();
    if (!key) {
      return;
    }
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function getDominantRatio(values = [], preferredValue = "") {
  const dist = distribution(values);
  const total = values.length;
  if (!total || dist.size === 0) {
    return { preferredRatio: 0, dominantRatio: 0 };
  }

  const preferredKey = String(preferredValue || "").trim().toLowerCase();
  const preferredRatio = preferredKey ? (dist.get(preferredKey) || 0) / total : 0;
  const dominantCount = Math.max(...dist.values());
  const dominantRatio = dominantCount / total;

  return { preferredRatio, dominantRatio };
}

function scorePreferenceConsistency(preferenceValue, values = [], base = 30) {
  if (!preferenceValue && values.length === 0) {
    return 0;
  }

  const { preferredRatio, dominantRatio } = getDominantRatio(values, preferenceValue);
  const ratio = preferredRatio || dominantRatio;
  const volumeBoost = Math.min(20, values.length * 2);

  return clamp(base + Math.round(ratio * 50) + volumeBoost);
}

function scoreBudget(preferences, previousTrips = []) {
  const target = Number(preferences?.budgetPreference?.target || 0);
  const budgets = previousTrips
    .map((trip) => Number(trip?.budgetTotal || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!target && budgets.length === 0) {
    return 0;
  }

  const mean = budgets.length > 0
    ? budgets.reduce((sum, value) => sum + value, 0) / budgets.length
    : target;

  const variance = budgets.length > 1
    ? budgets.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / budgets.length
    : 0;

  const stdDev = Math.sqrt(variance);
  const consistency = mean > 0 ? 1 - Math.min(1, stdDev / mean) : 0;

  const base = target > 0 ? 40 : 20;
  const historyBoost = Math.min(35, budgets.length * 4);
  const consistencyBoost = Math.round(consistency * 25);

  return clamp(base + historyBoost + consistencyBoost);
}

function scoreFavoriteDestinations(preferences, previousTrips = [], savedTrips = 0) {
  const favorites = Array.isArray(preferences?.favoriteDestinations)
    ? preferences.favoriteDestinations
    : [];

  const interactions = favorites.reduce((sum, item) => sum + Number(item?.count || 1), 0);
  const base = favorites.length > 0 ? 35 : 0;
  const depthBoost = Math.min(35, favorites.length * 8);
  const interactionBoost = Math.min(20, interactions * 2);
  const savedBoost = Math.min(10, savedTrips * 2);
  const historyBoost = Math.min(10, previousTrips.length);

  return clamp(base + depthBoost + interactionBoost + savedBoost + historyBoost);
}

export function computeMemoryScores(profileMemory) {
  const memory = profileMemory || {};
  const preferences = memory.preferences || {};
  const previousTrips = Array.isArray(memory.previousTrips) ? memory.previousTrips : [];
  const counters = memory.counters || {};

  const travelStyles = previousTrips.map((trip) => trip.travelStyle);
  const transportModes = previousTrips.map((trip) => trip.transportPreference);
  const foodModes = previousTrips.map((trip) => trip.foodPreference);

  const breakdown = {
    travelStyle: scorePreferenceConsistency(preferences.travelStyle, travelStyles, 35),
    budgetPreference: scoreBudget(preferences, previousTrips),
    favoriteDestinations: scoreFavoriteDestinations(preferences, previousTrips, Number(counters.savedTrips || 0)),
    transportPreference: scorePreferenceConsistency(preferences.transportPreference, transportModes, 35),
    foodPreference: scorePreferenceConsistency(preferences.foodPreference, foodModes, 35),
    previousTrips: clamp(previousTrips.length * 8 + Number(counters.savedTrips || 0) * 4)
  };

  const values = Object.values(breakdown);
  const overall = values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;

  const confidenceBand = overall >= 80 ? "High" : overall >= 55 ? "Medium" : "Low";

  return {
    overall,
    confidenceBand,
    breakdown,
    generatedAt: Date.now()
  };
}

import { computeMemoryScores } from "./scoring";

const DEFAULT_INPUTS = {
  style: "Comfort",
  maxBudget: 1500,
  travelMode: "Car",
  foodPreference: "mixed",
  stayPreference: "mid-range",
  days: 5,
  travelers: 2
};

function isUnset(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function shouldPromoteStored(currentValue, defaultValue, score) {
  return score >= 55 && (isUnset(currentValue) || currentValue === defaultValue);
}

function favoriteNames(memory) {
  const favorites = Array.isArray(memory?.preferences?.favoriteDestinations)
    ? memory.preferences.favoriteDestinations
    : [];

  return favorites
    .map((item) => (typeof item === "string" ? item : item?.name))
    .filter(Boolean);
}

function summarizeTrips(previousTrips = [], max = 4) {
  return previousTrips
    .slice(0, max)
    .map((trip) => `${trip.destination} (${trip.travelStyle}, ${trip.transportPreference}, ${trip.days}d)`)
    .join("; ");
}

function buildMemoryDirective(memory, scores) {
  if (!memory?.preferences) {
    return "MEMORY_CONTEXT: No historical memory found. Use provided input values only.";
  }

  const prefs = memory.preferences;
  const favorites = favoriteNames(memory).slice(0, 5);
  const recentTrips = summarizeTrips(memory.previousTrips || []);

  return [
    "MEMORY_CONTEXT:",
    `- Memory confidence score: ${scores.overall}/100 (${scores.confidenceBand})`,
    `- Preferred travel style: ${prefs.travelStyle || "Comfort"}`,
    `- Preferred budget target: ${prefs.budgetPreference?.target || DEFAULT_INPUTS.maxBudget}`,
    `- Preferred transport: ${prefs.transportPreference || "Car"}`,
    `- Preferred food: ${prefs.foodPreference || "mixed"}`,
    `- Preferred stay: ${prefs.stayPreference || "mid-range"}`,
    `- Favorite destinations: ${favorites.length ? favorites.join(", ") : "none"}`,
    `- Recent trips: ${recentTrips || "none"}`
  ].join("\n");
}

export function createPersonalizationPlan({ input, profileMemory }) {
  const rawInput = input || {};
  const memory = profileMemory || null;
  const memoryScores = computeMemoryScores(memory);

  const effectiveInput = {
    destination: String(rawInput.destination || "").trim(),
    naturalQuery: String(rawInput.naturalQuery || "").trim(),
    days: Number(rawInput.days || DEFAULT_INPUTS.days),
    travelers: Number(rawInput.travelers || DEFAULT_INPUTS.travelers),
    style: String(rawInput.style || DEFAULT_INPUTS.style),
    maxBudget: Number(rawInput.maxBudget || DEFAULT_INPUTS.maxBudget),
    travelMode: String(rawInput.travelMode || DEFAULT_INPUTS.travelMode),
    stayPreference: String(rawInput.stayPreference || DEFAULT_INPUTS.stayPreference),
    foodPreference: String(rawInput.foodPreference || DEFAULT_INPUTS.foodPreference)
  };

  if (memory?.preferences) {
    const prefs = memory.preferences;

    if (shouldPromoteStored(effectiveInput.style, DEFAULT_INPUTS.style, memoryScores.breakdown.travelStyle)) {
      effectiveInput.style = prefs.travelStyle || effectiveInput.style;
    }

    if (shouldPromoteStored(effectiveInput.travelMode, DEFAULT_INPUTS.travelMode, memoryScores.breakdown.transportPreference)) {
      effectiveInput.travelMode = prefs.transportPreference || effectiveInput.travelMode;
    }

    if (shouldPromoteStored(effectiveInput.foodPreference, DEFAULT_INPUTS.foodPreference, memoryScores.breakdown.foodPreference)) {
      effectiveInput.foodPreference = prefs.foodPreference || effectiveInput.foodPreference;
    }

    if (shouldPromoteStored(effectiveInput.stayPreference, DEFAULT_INPUTS.stayPreference, memoryScores.breakdown.travelStyle)) {
      effectiveInput.stayPreference = prefs.stayPreference || effectiveInput.stayPreference;
    }

    if (shouldPromoteStored(effectiveInput.maxBudget, DEFAULT_INPUTS.maxBudget, memoryScores.breakdown.budgetPreference)) {
      const target = Number(prefs?.budgetPreference?.target || effectiveInput.maxBudget);
      effectiveInput.maxBudget = Number.isFinite(target) && target > 0 ? Math.round(target) : effectiveInput.maxBudget;
    }

    if (isUnset(effectiveInput.destination)) {
      const topFavorite = favoriteNames(memory)[0];
      if (topFavorite) {
        effectiveInput.destination = topFavorite;
      }
    }
  }

  const memoryDirective = buildMemoryDirective(memory, memoryScores);
  const memoryQuery = effectiveInput.naturalQuery
    ? `${effectiveInput.naturalQuery}\n\n${memoryDirective}`
    : memoryDirective;

  const personalizationNotes = [
    `Memory score ${memoryScores.overall}/100 (${memoryScores.confidenceBand}).`,
    `Final style: ${effectiveInput.style}.`,
    `Final budget target: ${effectiveInput.maxBudget}.`,
    `Final transport: ${effectiveInput.travelMode}.`,
    `Final food: ${effectiveInput.foodPreference}.`,
    `Final stay: ${effectiveInput.stayPreference}.`
  ].join(" ");

  return {
    effectiveInput,
    memoryScores,
    personalizationNotes,
    memoryDirective,
    memoryQuery
  };
}

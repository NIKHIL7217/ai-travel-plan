import { GEMINI_API_KEY as API_KEY, GEMINI_API_URL as API_URL, REAL_DATA_ONLY, extractJsonObject } from "./planner.service";
import { geocodePlace } from "../maps/geocoding.service";
import { getRouteDistance } from "../maps/route.service";
import { fetchNearbyPlaces } from "../travel/places.service";
import { userLocation } from "../location";
import { budgetEstimateSchema } from "../../schemas/budget.schema";
import { parseWithSchema } from "../../schemas/parse";
import type { BudgetEstimate, BudgetEstimateOptions } from "../../types/Budget";
import { requestWithRetry } from "../../core/monitoring/request";

export type { BudgetEstimate, BudgetEstimateOptions } from "../../types/Budget";

function validateBudgetEstimate(value: unknown, context: string): BudgetEstimate | null {
  return parseWithSchema(budgetEstimateSchema, value, context);
}

/**
 * Estimates itemized budgets using real-world data
 */
function normalizeStayPreference(value) {
  const pref = String(value || "mid-range").toLowerCase();
  if (pref.includes("hostel")) return "hostel";
  if (pref.includes("budget")) return "budget";
  if (pref.includes("premium")) return "premium";
  if (pref.includes("luxury")) return "luxury";
  return "mid-range";
}

function normalizeFoodPreference(value) {
  const pref = String(value || "mixed").toLowerCase();
  if (pref.includes("street")) return "street";
  if (pref.includes("fine")) return "fine-dining";
  if (pref.includes("local")) return "local";
  return "mixed";
}

function getStyleMultiplier(style) {
  const multipliers = {
    budget: 0.8,
    comfort: 1.0,
    adventure: 0.95,
    family: 1.15,
    luxury: 1.9
  };
  return multipliers[String(style || "comfort").toLowerCase()] || 1;
}

function getStayTierMultiplier(stayPreference) {
  const map = {
    hostel: 0.55,
    budget: 0.75,
    "mid-range": 1,
    premium: 1.35,
    luxury: 2.1
  };
  return map[stayPreference] || 1;
}

function getFoodPreferenceConfig(foodPreference) {
  const map = {
    street: { multiplier: 0.55, mealsPerDay: 2.2 },
    local: { multiplier: 0.9, mealsPerDay: 2.5 },
    mixed: { multiplier: 1.1, mealsPerDay: 2.7 },
    "fine-dining": { multiplier: 2.15, mealsPerDay: 2.1 }
  };
  return map[foodPreference] || map.mixed;
}

function getDestinationCostSignal(destinationName) {
  const value = String(destinationName || "").toLowerCase();

  const expensiveKeywords = ["dubai", "singapore", "zurich", "switzerland", "london", "new york", "paris", "tokyo"];
  const moderateKeywords = ["bali", "bangkok", "phuket", "kuala lumpur", "istanbul", "seoul"];
  const valueKeywords = ["goa", "manali", "jaipur", "rishikesh", "udaipur", "vietnam", "hanoi", "ho chi minh"];

  if (expensiveKeywords.some((keyword) => value.includes(keyword))) {
    return {
      hotelMultiplier: 1.95,
      mealMultiplier: 1.7,
      activityMultiplier: 1.45,
      transportMultiplier: 1.3
    };
  }

  if (moderateKeywords.some((keyword) => value.includes(keyword))) {
    return {
      hotelMultiplier: 1.2,
      mealMultiplier: 1.15,
      activityMultiplier: 1.1,
      transportMultiplier: 1.05
    };
  }

  if (valueKeywords.some((keyword) => value.includes(keyword))) {
    return {
      hotelMultiplier: 0.86,
      mealMultiplier: 0.84,
      activityMultiplier: 0.88,
      transportMultiplier: 0.94
    };
  }

  return {
    hotelMultiplier: 1,
    mealMultiplier: 1,
    activityMultiplier: 1,
    transportMultiplier: 1
  };
}

function relativeGap(actual, expected) {
  const a = Number(actual || 0);
  const e = Number(expected || 0);
  if (e <= 0) {
    return a > 0 ? 1 : 0;
  }
  return Math.abs(a - e) / e;
}

function buildIndependentBudgetBenchmark({
  distanceKm,
  days,
  travelers,
  travelMode,
  effectiveHotelRateInUsd,
  effectiveMealRateInUsd,
  styleMultiplier,
  foodPrefConfig,
  activityCostMultiplier = 1,
  transportCostMultiplier = 1
}) {
  const tripDays = Math.max(1, Number(days || 1));
  const pax = Math.max(1, Number(travelers || 1));
  const distance = Math.max(40, Number(distanceKm || 0));
  const rooms = Math.ceil(pax / 2);

  let flights = 0;
  let transportation = 0;
  const mode = String(travelMode || "car").toLowerCase();

  if (mode.includes("flight")) {
    flights = Math.round(Math.max(85, distance * 0.095) * pax * styleMultiplier);
    transportation = Math.round(18 * tripDays * pax * styleMultiplier * transportCostMultiplier);
  } else if (mode.includes("train")) {
    transportation = Math.round((Math.max(20, distance * 0.026) * pax + 9 * tripDays * pax) * styleMultiplier * transportCostMultiplier);
  } else if (mode.includes("bus")) {
    transportation = Math.round((Math.max(14, distance * 0.019) * pax + 8 * tripDays * pax) * styleMultiplier * transportCostMultiplier);
  } else if (mode.includes("bike")) {
    transportation = Math.round((((distance / 40) * 1.22) + 7 * tripDays * pax) * styleMultiplier * transportCostMultiplier);
  } else {
    transportation = Math.round((((distance / 13) * 1.24) + (distance * 0.012) + 10 * tripDays * pax) * styleMultiplier * transportCostMultiplier);
  }

  const accommodation = Math.round(effectiveHotelRateInUsd * rooms * Math.max(1, tripDays - 1));
  const food = Math.round(effectiveMealRateInUsd * Number(foodPrefConfig?.mealsPerDay || 2.5) * pax * tripDays);

  const destinationCostIndex = Math.max(0.7, Math.min(1.8, (effectiveHotelRateInUsd / 60) * 0.55 + (effectiveMealRateInUsd / 8) * 0.45));
  const activities = Math.round(16 * tripDays * pax * styleMultiplier * destinationCostIndex * activityCostMultiplier);

  return normalizeBudgetForTravelMode({
    flights,
    accommodation,
    food,
    transportation,
    activities,
    total: flights + accommodation + food + transportation + activities
  }, travelMode);
}

function reconcileBudgetWithBenchmark(candidate: BudgetEstimate, benchmark: BudgetEstimate, travelMode: string, budgetLimit: number): BudgetEstimate {
  const categoryKeys = ["flights", "accommodation", "food", "transportation", "activities"];
  const averageGap = categoryKeys
    .map((key) => relativeGap(candidate[key], benchmark[key]))
    .reduce((sum, item) => sum + item, 0) / categoryKeys.length;

  if (averageGap <= 0.3) {
    return candidate;
  }

  const benchmarkWeight = averageGap > 0.65 ? 0.72 : 0.58;
  const candidateWeight = 1 - benchmarkWeight;
  const blended = categoryKeys.reduce((acc, key) => {
    acc[key] = Math.max(0, Math.round(benchmark[key] * benchmarkWeight + candidate[key] * candidateWeight));
    return acc;
  }, {} as Record<string, number>);

  let normalized = normalizeBudgetForTravelMode({
    flights: blended.flights,
    accommodation: blended.accommodation,
    food: blended.food,
    transportation: blended.transportation,
    activities: blended.activities,
    total: blended.flights + blended.accommodation + blended.food + blended.transportation + blended.activities
  }, travelMode);

  if (budgetLimit > 0 && normalized.total > budgetLimit * 1.08) {
    const shrink = Math.max(0.5, budgetLimit / normalized.total);
    normalized = normalizeBudgetForTravelMode({
      flights: Math.round(normalized.flights * shrink),
      accommodation: Math.round(normalized.accommodation * shrink),
      food: Math.round(normalized.food * shrink),
      transportation: Math.round(normalized.transportation * shrink),
      activities: Math.round(normalized.activities * shrink),
      total: 0
    }, travelMode);
  }

  return normalized;
}

function normalizeBudgetForTravelMode(rawBudget: Partial<BudgetEstimate>, travelMode: string): BudgetEstimate {
  const normalized: BudgetEstimate = {
    flights: Math.max(0, Math.round(Number(rawBudget?.flights || 0))),
    accommodation: Math.max(0, Math.round(Number(rawBudget?.accommodation || 0))),
    food: Math.max(0, Math.round(Number(rawBudget?.food || 0))),
    transportation: Math.max(0, Math.round(Number(rawBudget?.transportation || 0))),
    activities: Math.max(0, Math.round(Number(rawBudget?.activities || 0))),
    total: Math.max(0, Math.round(Number(rawBudget?.total || 0)))
  };

  const mode = String(travelMode || "").toLowerCase();
  if (!mode.includes("flight")) {
    normalized.transportation = Math.max(0, normalized.transportation + normalized.flights);
    normalized.flights = 0;
  }

  normalized.total = normalized.flights + normalized.accommodation + normalized.food + normalized.transportation + normalized.activities;
  return normalized;
}

function selectHotelsForPreference(hotels, stayPreference) {
  const list = Array.isArray(hotels) ? hotels : [];
  if (!list.length) return [];

  const target = normalizeStayPreference(stayPreference);
  const matching = list.filter((h) => String(h?.tier || "").toLowerCase() === target && Number(h?.price || 0) > 0);
  if (matching.length) return matching;

  const rankedByPrice = [...list].filter((h) => Number(h?.price || 0) > 0).sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  if (!rankedByPrice.length) return [];

  if (target === "hostel" || target === "budget") return rankedByPrice.slice(0, Math.max(1, Math.ceil(rankedByPrice.length * 0.35)));
  if (target === "premium" || target === "luxury") return rankedByPrice.slice(Math.floor(rankedByPrice.length * 0.55));
  return rankedByPrice.slice(Math.floor(rankedByPrice.length * 0.25), Math.max(1, Math.ceil(rankedByPrice.length * 0.75)));
}

export async function generateBudgetEstimate(destination: string, days: number, travelers: number, style: string, travelMode = "Car", options: BudgetEstimateOptions = {}): Promise<BudgetEstimate> {
  const normalizedQuery = String(options.userQuery || "").trim();
  const selectedCountry = String(options.selectedCountry || "").trim();
  const sourceQuery = String(options.sourceQuery || normalizedQuery || destination || "").trim();
  const memoryContext = String(options.memoryContext || "").trim();
  const requireLive = Boolean(options.requireLive);
  const fastPath = Boolean(options.fastPath);
  const allowFallbackWithoutLive = Boolean(options.allowFallbackWithoutLive);
  const stayPreference = normalizeStayPreference(options.stayPreference);
  const foodPreference = normalizeFoodPreference(options.foodPreference);
  const budgetLimit = Number(options.budgetLimit || 0);
  const destinationInput = String(destination || "").trim();
  const planningInput = normalizedQuery || destinationInput;
  const geoLookupInput = destinationInput || sourceQuery || planningInput;
  let resolvedCountryHint = selectedCountry;

  if (!planningInput) {
    throw new Error("Destination or trip query is required.");
  }

  if ((requireLive || REAL_DATA_ONLY) && !API_KEY && !allowFallbackWithoutLive) {
    throw new Error("Live AI is disabled. Add VITE_GEMINI_API_KEY in your .env to get real-time responses.");
  }

  const origin = userLocation.value.city || "New Delhi";
  let distanceKm = 1000;
  let hotelRateInUsd = 60;
  let restRateInUsd = 8;
  let hasLiveHotelRate = false;
  let hasLiveMealRate = false;

  if (!fastPath) {
    try {
      const geo = await geocodePlace(geoLookupInput);
      const lat = geo ? geo.lat : 24.5854;
      const lng = geo ? geo.lng : 73.7125;

      const routeInfo = await getRouteDistance(userLocation.value, { lat, lng });
      if (routeInfo) {
        distanceKm = routeInfo.distance;
      }

      const resolvedName = geo ? geo.formattedName.split(",")[0] : geoLookupInput;
      if (geo?.formattedName) {
        const parts = geo.formattedName.split(",").map((item) => String(item || "").trim()).filter(Boolean);
        if (parts.length > 1) {
          resolvedCountryHint = parts[parts.length - 1];
        }
      }
      const [hotels, restaurants] = await Promise.all([
        fetchNearbyPlaces(lat, lng, "lodging", resolvedName),
        fetchNearbyPlaces(lat, lng, "restaurant", resolvedName)
      ]);

      if (Array.isArray(hotels) && hotels.length > 0) {
        const allWithPrice = hotels.filter((h) => Number(h?.price || 0) > 0);
        const preferredHotels = selectHotelsForPreference(allWithPrice, stayPreference);
        const chosenHotels = preferredHotels.length ? preferredHotels : allWithPrice;
        if (chosenHotels.length > 0) {
          const avgInr = chosenHotels.reduce((sum, h) => sum + Number(h.price || 0), 0) / chosenHotels.length;
          hotelRateInUsd = avgInr / 83.5;
          hasLiveHotelRate = true;
        }
      }

      if (Array.isArray(restaurants) && restaurants.length > 0) {
        const restaurantsWithPrice = restaurants.filter((r) => Number(r?.averagePrice || 0) > 0);
        if (restaurantsWithPrice.length > 0) {
          const avgInr = restaurantsWithPrice.reduce((sum, r) => sum + Number(r.averagePrice || 0), 0) / restaurantsWithPrice.length;
          restRateInUsd = avgInr / 83.5;
          hasLiveMealRate = true;
        }
      }
    } catch (e) {
      console.warn("Error calculating real budget fallback:", e);
    }
  }

  const destinationCostSignal = getDestinationCostSignal(
    `${destinationInput || geoLookupInput} ${resolvedCountryHint}`.trim()
  );

  if (!hasLiveHotelRate) {
    hotelRateInUsd *= destinationCostSignal.hotelMultiplier;
  }
  if (!hasLiveMealRate) {
    restRateInUsd *= destinationCostSignal.mealMultiplier;
  }

  const effectiveHotelRateInUsd = hotelRateInUsd * getStayTierMultiplier(stayPreference);
  const foodPrefConfig = getFoodPreferenceConfig(foodPreference);
  const effectiveMealRateInUsd = restRateInUsd * foodPrefConfig.multiplier;
  const styleMultiplier = getStyleMultiplier(style);
  const independentBenchmarkBudget = buildIndependentBudgetBenchmark({
    distanceKm,
    days,
    travelers,
    travelMode,
    effectiveHotelRateInUsd,
    effectiveMealRateInUsd,
    styleMultiplier,
    foodPrefConfig,
    activityCostMultiplier: destinationCostSignal.activityMultiplier,
    transportCostMultiplier: destinationCostSignal.transportMultiplier
  });

  if (API_KEY) {
    try {
      const liveContextTag = new Date().toISOString();
      const budgetInstruction = budgetLimit > 0
        ? `Try to keep total close to user budget cap (${budgetLimit} USD) while preserving requested comfort preferences.`
        : "No strict budget cap provided by user.";
      const prompt = `
        You are a travel budget analyst.
        The user can write in WhatsApp style or Hinglish. Understand it and estimate a practical budget.

        User Input (raw): ${planningInput}
        Origin city: ${origin}
        Trip duration: ${days} days
        Travelers: ${travelers}
        Style: ${style}
        Travel mode: ${travelMode}
        Stay preference: ${stayPreference}
        Food preference: ${foodPreference}
        User budget cap: ${budgetLimit > 0 ? `${budgetLimit} USD` : "not provided"}
        Approx route distance: ${Math.round(distanceKm)} km
        Preferred hotel nightly baseline: ${effectiveHotelRateInUsd.toFixed(2)} USD
        Preferred meal baseline: ${effectiveMealRateInUsd.toFixed(2)} USD
        Pricing country context: ${resolvedCountryHint || "Not provided"}
        Live Request Timestamp: ${liveContextTag}
        Source Query: ${sourceQuery || "N/A"}

        Personalization Memory:
        ${memoryContext || "No memory context available."}

        Constraints:
        - Reflect user's travel mode and stay/food preferences.
        - If travel mode is not flight, set "flights" to 0 and include all movement costs in "transportation".
        - ${budgetInstruction}
        - Return integer numeric values only.

        Return a single JSON object only with numeric values:
        {
          "flights": 0,
          "accommodation": 0,
          "food": 0,
          "transportation": 0,
          "activities": 0,
          "total": 0
        }
      `;

      const response = await requestWithRetry(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }, {
        operation: "budget.gemini_estimate",
        timeoutMs: fastPath ? 5200 : 9000,
        retries: 0
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = extractJsonObject(text);

        if (parsed && typeof parsed === "object") {
          const normalized = normalizeBudgetForTravelMode({
            flights: Math.max(0, Math.round(Number(parsed.flights || 0))),
            accommodation: Math.max(0, Math.round(Number(parsed.accommodation || 0))),
            food: Math.max(0, Math.round(Number(parsed.food || 0))),
            transportation: Math.max(0, Math.round(Number(parsed.transportation || 0))),
            activities: Math.max(0, Math.round(Number(parsed.activities || 0))),
            total: Math.max(0, Math.round(Number(parsed.total || 0)))
          }, travelMode);

          if (normalized.total > 0) {
            const reconciled = reconcileBudgetWithBenchmark(normalized, independentBenchmarkBudget, travelMode, budgetLimit);
            const validated = validateBudgetEstimate(reconciled, "Gemini budget estimate");
            if (validated) {
              return validated;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Gemini live budget estimation failed, using computed fallback.", e);
      if (REAL_DATA_ONLY && !allowFallbackWithoutLive) {
        throw new Error("Live AI budget request failed. Please retry in a moment.");
      }
    }
  }

  if (REAL_DATA_ONLY && !allowFallbackWithoutLive) {
    throw new Error("Live AI budget response unavailable right now. Try again shortly.");
  }

  let flights = 0;
  let transportation = 0;
  const modeClean = (travelMode || "Car").toLowerCase();

  if (modeClean.includes("flight")) {
    flights = Math.round(Math.max(55, distanceKm * 0.085) * travelers * styleMultiplier);
    transportation = Math.round(16 * days * travelers * styleMultiplier * destinationCostSignal.transportMultiplier);
  } else if (modeClean.includes("train")) {
    const trainCost = Math.max(18, distanceKm * 0.022) * travelers * styleMultiplier;
    const localTransit = 11 * days * travelers * styleMultiplier;
    flights = 0;
    transportation = Math.round((trainCost + localTransit) * destinationCostSignal.transportMultiplier);
  } else if (modeClean.includes("bus")) {
    const busCost = Math.max(12, distanceKm * 0.017) * travelers * styleMultiplier;
    const localTransit = 9 * days * travelers * styleMultiplier;
    flights = 0;
    transportation = Math.round((busCost + localTransit) * destinationCostSignal.transportMultiplier);
  } else if (modeClean.includes("car")) {
    const fuelCostUsd = (distanceKm / 14) * 1.25;
    const tollCostUsd = distanceKm * 0.015;
    const localTransit = 12 * days * travelers * styleMultiplier;
    flights = 0;
    transportation = Math.round(((fuelCostUsd + tollCostUsd) * styleMultiplier + localTransit) * destinationCostSignal.transportMultiplier);
  } else if (modeClean.includes("bike")) {
    const fuelCostUsd = (distanceKm / 45) * 1.25;
    const localTransit = 8 * days * travelers * styleMultiplier;
    flights = 0;
    transportation = Math.round((fuelCostUsd * styleMultiplier + localTransit) * destinationCostSignal.transportMultiplier);
  } else {
    const baseTransfer = Math.max(24, distanceKm * 0.03) * travelers * styleMultiplier;
    const localTransit = 15 * days * travelers * styleMultiplier;
    flights = 0;
    transportation = Math.round((baseTransfer + localTransit) * destinationCostSignal.transportMultiplier);
  }

  const rooms = Math.ceil(travelers / 2);
  const accommodation = Math.round(effectiveHotelRateInUsd * rooms * Math.max(1, days - 1));
  const food = Math.round(effectiveMealRateInUsd * foodPrefConfig.mealsPerDay * travelers * days);
  const activityBase = styleMultiplier >= 1.5 ? 26 : styleMultiplier >= 1.1 ? 20 : 14;
  const activities = Math.round(activityBase * days * travelers * destinationCostSignal.activityMultiplier);

  let total = flights + accommodation + food + transportation + activities;

  if (budgetLimit > 0 && total > budgetLimit) {
    const excessRatio = total / budgetLimit;
    if (excessRatio > 1.12) {
      const reducedAccommodation = Math.round(accommodation * 0.9);
      const reducedFood = Math.round(food * 0.92);
      const reducedActivities = Math.round(activities * 0.88);
      total = flights + reducedAccommodation + reducedFood + transportation + reducedActivities;
      return validateBudgetEstimate({
        flights,
        accommodation: reducedAccommodation,
        food: reducedFood,
        transportation,
        activities: reducedActivities,
        total
      }, "reduced fallback budget estimate") || {
        flights,
        accommodation: reducedAccommodation,
        food: reducedFood,
        transportation,
        activities: reducedActivities,
        total
      };
    }
  }

  const normalizedFallbackBudget = normalizeBudgetForTravelMode({
    flights,
    accommodation,
    food,
    transportation,
    activities,
    total
  }, travelMode);

  const reconciledFallbackBudget = reconcileBudgetWithBenchmark(normalizedFallbackBudget, independentBenchmarkBudget, travelMode, budgetLimit);

  return validateBudgetEstimate(reconciledFallbackBudget, "fallback budget estimate") || {
    flights,
    accommodation,
    food,
    transportation,
    activities,
    total: flights + accommodation + food + transportation + activities
  };
}

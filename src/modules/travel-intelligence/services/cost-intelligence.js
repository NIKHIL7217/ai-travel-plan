import { userCurrency } from "../../../services/currency";
import { average, clamp, median } from "./utils";

function costAdvisory(costLevel, budgetPressure) {
  if (costLevel === "Low") {
    return "Cost conditions are favorable. You can add premium experiences without strong budget pressure.";
  }
  if (budgetPressure >= 72) {
    return "Budget pressure is high. Prefer pre-booked bundles and off-peak slots to control spend.";
  }
  if (costLevel === "Moderate") {
    return "Costs are balanced. Use selective reservations to optimize value across stays and dining.";
  }
  return "Destination cost profile is elevated. Keep contingency margin and prioritize high-value segments.";
}

export function createFallbackCostIntelligence() {
  return {
    currency: userCurrency.value?.currency || "USD",
    estimatedDailySpend: 115,
    estimatedTripSpend: 690,
    budgetPressure: 52,
    costLevel: "Moderate",
    savingsTip: "Pre-book stays and use weekday activity slots for better rates.",
    advisory: costAdvisory("Moderate", 52),
    updatedAt: new Date().toISOString()
  };
}

export function getCostIntelligence({ trips = [], weather = null, crowd = null } = {}) {
  if (!Array.isArray(trips) || trips.length === 0) {
    return createFallbackCostIntelligence();
  }

  const totals = trips
    .map((trip) => Number(trip?.budget?.total || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  const dayTotals = trips
    .map((trip) => {
      const total = Number(trip?.budget?.total || 0);
      const days = Math.max(1, Number(trip?.days || 1));
      return total > 0 ? total / days : null;
    })
    .filter((value) => value !== null);

  if (totals.length === 0 || dayTotals.length === 0) {
    return createFallbackCostIntelligence();
  }

  const baselineDaily = Math.round(median(dayTotals));
  const baselineTrip = Math.round(average(totals));

  let marketMultiplier = 1;
  const crowdIndex = Number(crowd?.crowdIndex || 0);
  if (crowdIndex >= 70) {
    marketMultiplier += 0.12;
  } else if (crowdIndex >= 50) {
    marketMultiplier += 0.06;
  }

  const rainProbability = Number(weather?.rainProbabilityPercent || weather?.rainProbability || 0);
  if (rainProbability >= 60) {
    marketMultiplier -= 0.04;
  }

  const estimatedDailySpend = Math.max(20, Math.round(baselineDaily * marketMultiplier));
  const estimatedTripSpend = Math.max(60, Math.round(baselineTrip * marketMultiplier));

  const budgetPressure = clamp(Math.round((estimatedDailySpend / Math.max(1, baselineDaily)) * 50), 20, 95);
  const costLevel = budgetPressure >= 68 ? "High" : budgetPressure >= 46 ? "Moderate" : "Low";

  const savingsTip = costLevel === "High"
    ? "Use price-lock bookings and shift premium activities to non-peak weekdays."
    : costLevel === "Moderate"
      ? "Bundle transit plus attraction passes to lower total daily spend."
      : "Use flexible booking windows to unlock occasional premium upgrades.";

  return {
    currency: userCurrency.value?.currency || "USD",
    estimatedDailySpend,
    estimatedTripSpend,
    budgetPressure,
    costLevel,
    savingsTip,
    advisory: costAdvisory(costLevel, budgetPressure),
    updatedAt: new Date().toISOString()
  };
}
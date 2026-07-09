import { describe, expect, it } from "vitest";
import { generateBudgetEstimate } from "../../src/services/ai/budget.service.ts";

function independentEstimate({ destination, days, travelers, style, travelMode }) {
  const costTierMap = {
    goa: 0.86,
    bali: 1.22,
    dubai: 1.92
  };

  const styleMap = {
    budget: 0.84,
    comfort: 1,
    adventure: 0.95,
    family: 1.14,
    luxury: 1.88
  };

  const destinationTier = costTierMap[String(destination || "").toLowerCase()] || 1;
  const styleMultiplier = styleMap[String(style || "comfort").toLowerCase()] || 1;
  const pax = Math.max(1, Number(travelers || 1));
  const tripDays = Math.max(1, Number(days || 1));
  const rooms = Math.ceil(pax / 2);

  let flights = 0;
  let transportation = 0;

  if (String(travelMode || "").toLowerCase().includes("flight")) {
    flights = Math.round(95 * pax * destinationTier * styleMultiplier);
    transportation = Math.round(22 * pax * tripDays * destinationTier);
  } else {
    transportation = Math.round(30 * pax + 16 * pax * tripDays * destinationTier * styleMultiplier);
  }

  const accommodation = Math.round(58 * rooms * Math.max(1, tripDays - 1) * destinationTier * styleMultiplier);
  const food = Math.round(20 * pax * tripDays * destinationTier * Math.min(1.35, styleMultiplier));
  const activities = Math.round(14 * pax * tripDays * destinationTier * styleMultiplier);

  const total = flights + transportation + accommodation + food + activities;
  return { flights, transportation, accommodation, food, activities, total };
}

function relativeGap(actual, expected) {
  if (expected <= 0) {
    return actual > 0 ? 1 : 0;
  }
  return Math.abs(actual - expected) / expected;
}

describe("budget accuracy reconciliation", () => {
  it("keeps app estimate within practical gap vs independent benchmark", async () => {
    const scenarios = [
      { destination: "Goa", days: 5, travelers: 2, style: "comfort", travelMode: "Car" },
      { destination: "Bali", days: 5, travelers: 2, style: "comfort", travelMode: "Flight" },
      { destination: "Dubai", days: 4, travelers: 2, style: "comfort", travelMode: "Flight" }
    ];

    const comparisons = [];

    for (const scenario of scenarios) {
      const app = await generateBudgetEstimate(
        scenario.destination,
        scenario.days,
        scenario.travelers,
        scenario.style,
        scenario.travelMode,
        {
          fastPath: true,
          requireLive: false,
          allowFallbackWithoutLive: true
        }
      );

      const independent = independentEstimate(scenario);
      const totalGap = relativeGap(app.total, independent.total);

      comparisons.push({
        ...scenario,
        appTotal: app.total,
        independentTotal: independent.total,
        totalGap
      });

      expect(totalGap).toBeLessThanOrEqual(0.35);
    }

    const byDestination = Object.fromEntries(comparisons.map((item) => [item.destination.toLowerCase(), item.appTotal]));
    expect(byDestination.dubai).toBeGreaterThan(byDestination.bali);
    expect(byDestination.bali).toBeGreaterThan(byDestination.goa);
  });
});

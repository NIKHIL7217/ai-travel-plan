import { describe, expect, it } from "vitest";
import { createPlanProfiles, rankItineraryOptions } from "../../src/modules/planner-options";

describe("planner-options/createPlanProfiles", () => {
  it("creates exactly budget, balanced, and premium profiles", () => {
    const profiles = createPlanProfiles({ maxBudget: 2000, style: "Comfort" });

    expect(profiles).toHaveLength(3);
    expect(profiles.map((item) => item.id)).toEqual(["budget", "balanced", "premium"]);
    expect(profiles[0].budgetLimit).toBeLessThan(profiles[1].budgetLimit);
    expect(profiles[2].budgetLimit).toBeGreaterThan(profiles[1].budgetLimit);
  });

  it("normalizes balanced style when base style is extreme", () => {
    const fromLuxury = createPlanProfiles({ maxBudget: 1000, style: "Luxury" });
    const fromBudget = createPlanProfiles({ maxBudget: 1000, style: "Budget" });

    expect(fromLuxury[1].style).toBe("Comfort");
    expect(fromBudget[1].style).toBe("Comfort");
  });
});

describe("planner-options/rankItineraryOptions", () => {
  const options = [
    {
      id: "budget",
      label: "Budget",
      style: "Budget",
      budgetLimit: 900,
      itinerary: {
        itinerary: [
          { day: 1, theme: "Street food", morning: "A", afternoon: "B", evening: "C", foodRecommendation: "D" },
          { day: 2, theme: "Markets", morning: "A", afternoon: "B", evening: "C", foodRecommendation: "D" }
        ]
      },
      budget: { total: 760 }
    },
    {
      id: "balanced",
      label: "Balanced",
      style: "Comfort",
      budgetLimit: 1200,
      itinerary: {
        itinerary: [
          { day: 1, theme: "Culture", morning: "A long museum block", afternoon: "Cafe and walk", evening: "Night market", foodRecommendation: "Local tasting" },
          { day: 2, theme: "Nature", morning: "Park", afternoon: "Viewpoint", evening: "Riverfront", foodRecommendation: "Fusion" },
          { day: 3, theme: "Old town", morning: "Heritage", afternoon: "Craft district", evening: "Music", foodRecommendation: "Regional" }
        ]
      },
      budget: { total: 1180 }
    },
    {
      id: "premium",
      label: "Premium",
      style: "Luxury",
      budgetLimit: 1700,
      itinerary: {
        itinerary: [
          { day: 1, theme: "Luxury check-in", morning: "A", afternoon: "B", evening: "C", foodRecommendation: "D" },
          { day: 2, theme: "Private tour", morning: "A", afternoon: "B", evening: "C", foodRecommendation: "D" },
          { day: 3, theme: "Spa", morning: "A", afternoon: "B", evening: "C", foodRecommendation: "D" }
        ]
      },
      budget: { total: 1810 }
    }
  ];

  it("returns ranked options with score details", () => {
    const ranked = rankItineraryOptions(options, {
      maxBudget: 1250,
      style: "Comfort",
      travelMode: "Car",
      stayPreference: "mid-range",
      foodPreference: "mixed"
    });

    expect(ranked).toHaveLength(3);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);

    ranked.forEach((item) => {
      expect(item.totalScore).toBeGreaterThanOrEqual(10);
      expect(item.totalScore).toBeLessThanOrEqual(100);
      expect(item.scores).toHaveProperty("budgetFit");
      expect(item.scores).toHaveProperty("experience");
      expect(item.scores).toHaveProperty("alignment");
      expect(typeof item.rankingReason).toBe("string");
    });
  });

  it("handles sparse itinerary and unknown option ids", () => {
    const ranked = rankItineraryOptions(
      [
        {
          id: "experimental",
          label: "Experimental",
          itinerary: { itinerary: [] },
          budget: { total: 4200 }
        },
        {
          id: "budget",
          label: "Budget",
          itinerary: { itinerary: [{ day: 1, theme: "walk" }] },
          budget: { total: 3000 }
        }
      ],
      {
        maxBudget: 900,
        style: "Budget",
        travelMode: "Bus",
        stayPreference: "hostel",
        foodPreference: "street"
      }
    );

    expect(ranked).toHaveLength(2);
    ranked.forEach((item) => {
      expect(item.totalScore).toBeGreaterThanOrEqual(10);
      expect(item.totalScore).toBeLessThanOrEqual(100);
    });

    expect(ranked.some((item) => item.rankingReason.includes("Viable alternative"))).toBe(true);
  });
});

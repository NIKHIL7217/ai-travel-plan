import { describe, expect, it } from "vitest";
import { getHiddenGems } from "../../src/modules/hidden-gems/service";

describe("hidden gems service", () => {
  it("returns ranked gems for known destinations", async () => {
    const result = await getHiddenGems({
      destinationName: "Goa",
      destinationLocation: "India",
      budgetPreference: "budget",
      crowdPreference: "low",
      limit: 3
    });

    expect(result.destination).toBe("Goa");
    expect(result.gems.length).toBe(3);
    expect(result.gems[0].relevanceScore).toBeGreaterThanOrEqual(result.gems[2].relevanceScore);
    expect(result.strategy.categoryMix.length).toBeGreaterThan(0);
  });

  it("provides fallback gems for unknown destinations", async () => {
    const result = await getHiddenGems({
      destinationName: "Ladakh",
      destinationLocation: "India",
      budgetPreference: "balanced",
      crowdPreference: "moderate",
      limit: 2
    });

    expect(result.gems.length).toBe(2);
    expect(result.gems[0].name.toLowerCase()).toContain("ladakh");
  });
});

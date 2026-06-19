import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/routes", () => ({
  getTrafficInsights: vi.fn()
}));

import { getTrafficInsights } from "../../src/services/routes";
import { getTrafficIntelligence } from "../../src/modules/travel-intelligence/services/traffic-intelligence";

describe("traffic-intelligence service", () => {
  it("maps live traffic into mobility metrics", async () => {
    getTrafficInsights.mockResolvedValueOnce({
      level: "Moderate",
      congestionPercent: 42,
      averageCurrentSpeed: 31,
      averageFreeFlowSpeed: 54,
      updatedAt: "2026-06-19T00:00:00Z"
    });

    const result = await getTrafficIntelligence({ city: "Bangalore", origin: "A", destination: "B" });

    expect(result.level).toBe("Moderate");
    expect(result.mobilityScore).toBe(58);
    expect(result.routeLabel).toBe("A to B");
  });

  it("falls back when upstream traffic data is unavailable", async () => {
    getTrafficInsights.mockResolvedValueOnce(null);
    const result = await getTrafficIntelligence({ city: "Mumbai" });

    expect(result.routeLabel).toContain("Mumbai");
    expect(result.congestionPercent).toBeGreaterThanOrEqual(0);
    expect(result.freeFlowSpeedKmh).toBe(52);
  });

  it("falls back when upstream throws", async () => {
    getTrafficInsights.mockRejectedValueOnce(new Error("timeout"));
    const result = await getTrafficIntelligence({ city: "Jaipur" });

    expect(result.routeLabel).toContain("Jaipur");
    expect(result.advisory.length).toBeGreaterThan(0);
  });

  it("uses heavy congestion advisory branch", async () => {
    getTrafficInsights.mockResolvedValueOnce({
      level: "High",
      congestionPercent: 71,
      averageCurrentSpeed: 19,
      averageFreeFlowSpeed: 48,
      updatedAt: "2026-06-19T00:00:00Z"
    });

    const result = await getTrafficIntelligence({ city: "Delhi", origin: "X", destination: "Y" });

    expect(result.level).toBe("High");
    expect(result.commuteRisk).toBe("Elevated");
    expect(result.advisory).toContain("Heavy slowdowns");
  });

  it("uses smooth corridor advisory branch", async () => {
    getTrafficInsights.mockResolvedValueOnce({
      level: "Low",
      congestionPercent: 18,
      averageCurrentSpeed: 52,
      averageFreeFlowSpeed: 55,
      updatedAt: "2026-06-19T00:00:00Z"
    });

    const result = await getTrafficIntelligence({ city: "Chennai", origin: "A", destination: "B" });

    expect(result.level).toBe("Low");
    expect(result.commuteRisk).toBe("Stable");
    expect(result.advisory).toContain("Smooth corridor");
  });
});

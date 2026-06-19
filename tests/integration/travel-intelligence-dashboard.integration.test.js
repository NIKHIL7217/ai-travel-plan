import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/weather", () => ({
  fetchWeather: vi.fn().mockResolvedValue({
    temp: "27°C",
    humidity: "60%",
    windSpeed: "11 km/h",
    rainProbability: "20%",
    aqi: 70,
    weatherForecast: [{ temp: "26°C", general: "Sunny" }, { temp: "27°C", general: "Cloudy" }]
  })
}));

vi.mock("../../src/services/routes", () => ({
  getTrafficInsights: vi.fn().mockResolvedValue({
    level: "Low",
    congestionPercent: 22,
    averageCurrentSpeed: 44,
    averageFreeFlowSpeed: 56,
    updatedAt: "2026-06-19T00:00:00Z"
  })
}));

vi.mock("../../src/services/places", () => ({
  fetchNearbyPlaces: vi.fn().mockImplementation(async (_lat, _lng, type) => {
    if (type === "attraction") {
      return [{ rating: 4.5 }, { rating: 4.2 }];
    }
    return [{ rating: 4.1 }, { rating: 4.0 }, { rating: 4.3 }];
  })
}));

vi.mock("../../src/services/currency", () => ({
  userCurrency: {
    value: {
      currency: "USD"
    }
  }
}));

import { getTravelIntelligenceDashboard } from "../../src/modules/travel-intelligence/service";

describe("travel-intelligence dashboard integration", () => {
  it("assembles weather, traffic, crowd, season, safety, and cost intelligence", async () => {
    const result = await getTravelIntelligenceDashboard({
      location: {
        city: "Pune",
        country: "India",
        lat: 18.5,
        lng: 73.8
      },
      trips: [
        { days: 3, budget: { total: 600 } },
        { days: 4, budget: { total: 900 } }
      ],
      origin: "Pune",
      destination: "Pune center"
    });

    expect(result).toHaveProperty("weather");
    expect(result).toHaveProperty("traffic");
    expect(result).toHaveProperty("crowd");
    expect(result).toHaveProperty("season");
    expect(result).toHaveProperty("safety");
    expect(result).toHaveProperty("cost");

    expect(result.weather.comfortScore).toBeGreaterThan(0);
    expect(result.traffic.mobilityScore).toBeGreaterThan(0);
    expect(result.crowd.crowdIndex).toBeGreaterThan(0);
    expect(result.cost.estimatedDailySpend).toBeGreaterThan(0);
  });

  it("builds dashboard with defaults when options are minimal", async () => {
    const result = await getTravelIntelligenceDashboard({});

    expect(result.weather.city).toBe("Your Area");
    expect(result.traffic.routeLabel).toContain("Current location");
    expect(result.crowd.city).toBe("Current city");
    expect(result.cost.costLevel).toMatch(/Low|Moderate|High/);
    expect(typeof result.generatedAt).toBe("string");
  });
});

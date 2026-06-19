import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/currency", () => ({
  userCurrency: {
    value: {
      currency: "USD"
    }
  }
}));

import {
  createFallbackSeasonIntelligence,
  getSeasonIntelligence
} from "../../src/modules/travel-intelligence/services/season-intelligence";
import {
  createFallbackSafetyIntelligence,
  getSafetyIntelligence
} from "../../src/modules/travel-intelligence/services/safety-intelligence";
import {
  createFallbackCostIntelligence,
  getCostIntelligence
} from "../../src/modules/travel-intelligence/services/cost-intelligence";

describe("season-intelligence service", () => {
  it("returns fallback season payload when no forecast available", () => {
    const result = createFallbackSeasonIntelligence();
    expect(result.seasonalScore).toBeGreaterThan(0);
    expect(result.currentSeason).toMatch(/Winter|Spring|Summer|Autumn/);
  });

  it("computes trend and score from weather forecast", () => {
    const result = getSeasonIntelligence({
      weather: {
        weatherForecast: [
          { temp: "20°C" },
          { temp: "24°C" },
          { temp: "28°C" }
        ]
      }
    });

    expect(result.thermalTrend).toBe("warming");
    expect(result.seasonalScore).toBeGreaterThan(0);
    expect(result.bestWindow.length).toBeGreaterThan(0);
  });

  it("computes cooling trend branch", () => {
    const result = getSeasonIntelligence({
      weather: {
        weatherForecast: [
          { temp: "30°C" },
          { temp: "24°C" },
          { temp: "19°C" }
        ]
      }
    });

    expect(result.thermalTrend).toBe("cooling");
    expect(result.advisory.toLowerCase()).toContain("cooler");
  });

  it("returns fallback when forecast cannot be parsed", () => {
    const result = getSeasonIntelligence({
      weather: {
        weatherForecast: [{ temp: "-" }, { temp: "-" }, { temp: "-" }]
      }
    });

    expect(result.seasonalScore).toBe(68);
    expect(result.thermalTrend).toBe("stable");
  });
});

describe("safety-intelligence service", () => {
  it("returns fallback when all signals are missing", () => {
    const result = createFallbackSafetyIntelligence();
    expect(result.level).toBe("Moderate");
    expect(result.riskDrivers).toContain("crowd-variance");
  });

  it("computes safety score and risk drivers", () => {
    const result = getSafetyIntelligence({
      weather: {
        rainProbabilityPercent: 70,
        temperatureC: 36,
        aqi: 160
      },
      traffic: {
        level: "High"
      },
      crowd: {
        level: "High"
      }
    });

    expect(result.level).toMatch(/High|Moderate|Watch/);
    expect(result.safetyScore).toBeLessThanOrEqual(96);
    expect(result.riskDrivers.length).toBeGreaterThan(0);
    expect(result.advisory.length).toBeGreaterThan(0);
  });

  it("returns high safety branch when all signals are calm", () => {
    const result = getSafetyIntelligence({
      weather: {
        rainProbabilityPercent: 5,
        temperatureC: 24,
        aqi: 48
      },
      traffic: {
        level: "Low"
      },
      crowd: {
        level: "Low"
      }
    });

    expect(result.level).toBe("High");
    expect(result.riskDrivers).toContain("normal-urban-variance");
    expect(result.advisory).toContain("stable travel safety profile");
  });

  it("returns traffic advisory branch when traffic is high and crowd is moderate", () => {
    const result = getSafetyIntelligence({
      weather: {
        rainProbabilityPercent: 20,
        temperatureC: 28,
        aqi: 80
      },
      traffic: {
        level: "High"
      },
      crowd: {
        level: "Moderate"
      }
    });

    expect(result.riskDrivers).toContain("high-traffic-friction");
    expect(result.advisory).toContain("Traffic risk is elevated");
  });

  it("returns AQI advisory branch when AQI risk dominates", () => {
    const result = getSafetyIntelligence({
      weather: {
        rainProbabilityPercent: 10,
        temperatureC: 25,
        aqi: 160
      },
      traffic: {
        level: "Low"
      },
      crowd: {
        level: "Low"
      }
    });

    expect(result.riskDrivers).toContain("air-quality-stress");
    expect(result.advisory).toContain("Air quality stress");
  });
});

describe("cost-intelligence service", () => {
  it("returns fallback cost profile without trips", () => {
    const result = createFallbackCostIntelligence();
    expect(result.currency).toBe("USD");
    expect(result.estimatedDailySpend).toBeGreaterThan(0);
  });

  it("computes cost profile from trip history", () => {
    const result = getCostIntelligence({
      trips: [
        { days: 4, budget: { total: 800 } },
        { days: 5, budget: { total: 1200 } },
        { days: 3, budget: { total: 600 } }
      ],
      weather: {
        rainProbabilityPercent: 20
      },
      crowd: {
        crowdIndex: 73
      }
    });

    expect(result.estimatedDailySpend).toBeGreaterThan(0);
    expect(result.estimatedTripSpend).toBeGreaterThan(0);
    expect(result.costLevel).toMatch(/Low|Moderate|High/);
    expect(result.advisory.length).toBeGreaterThan(0);
  });

  it("returns moderate-cost branch with reduced market multiplier", () => {
    const result = getCostIntelligence({
      trips: [
        { days: 4, budget: { total: 900 } },
        { days: 4, budget: { total: 880 } }
      ],
      weather: {
        rainProbabilityPercent: 65
      },
      crowd: {
        crowdIndex: 20
      }
    });

    expect(result.costLevel).toBe("Moderate");
    expect(result.savingsTip).toContain("Bundle transit");
    expect(result.advisory).toContain("balanced");
  });

  it("returns high-cost branch with high budget pressure", () => {
    const result = getCostIntelligence({
      trips: [
        { days: 2, budget: { total: 10 } },
        { days: 2, budget: { total: 12 } }
      ],
      weather: {
        rainProbabilityPercent: 5
      },
      crowd: {
        crowdIndex: 90
      }
    });

    expect(result.costLevel).toBe("High");
    expect(result.savingsTip).toContain("price-lock");
    expect(result.advisory).toContain("Budget pressure is high");
  });

  it("falls back when trip budgets are missing", () => {
    const result = getCostIntelligence({
      trips: [{ days: 3, budget: { total: 0 } }, { days: 4, budget: {} }],
      weather: null,
      crowd: null
    });

    expect(result.estimatedDailySpend).toBe(115);
    expect(result.costLevel).toBe("Moderate");
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/places", () => ({
  fetchNearbyPlaces: vi.fn()
}));

import { fetchNearbyPlaces } from "../../src/services/places";
import { getCrowdIntelligence } from "../../src/modules/travel-intelligence/services/crowd-intelligence";

describe("crowd-intelligence service", () => {
  it("computes crowd metrics from live attraction and restaurant density", async () => {
    fetchNearbyPlaces
      .mockResolvedValueOnce([
        { rating: 4.5 },
        { rating: 4.3 },
        { rating: 4.4 }
      ])
      .mockResolvedValueOnce([
        { rating: 4.2 },
        { rating: 4.1 }
      ]);

    const result = await getCrowdIntelligence({ city: "Udaipur", lat: 24.58, lng: 73.68 });

    expect(result.city).toBe("Udaipur");
    expect(result.attractionHotspots).toBe(3);
    expect(result.diningHotspots).toBe(2);
    expect(result.crowdIndex).toBeGreaterThan(0);
  });

  it("returns fallback payload when coordinates are missing", async () => {
    const result = await getCrowdIntelligence({ city: "Goa", lat: null, lng: null });

    expect(result.city).toBe("Goa");
    expect(result.peakWindow).toBe("18:00-21:00");
  });

  it("returns fallback payload on service failure", async () => {
    fetchNearbyPlaces.mockRejectedValueOnce(new Error("down"));

    const result = await getCrowdIntelligence({ city: "Kochi", lat: 9.9, lng: 76.2 });
    expect(result.city).toBe("Kochi");
    expect(result.level).toMatch(/High|Moderate|Low/);
  });

  it("uses moderate advisory branch for balanced density", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T13:00:00"));

    fetchNearbyPlaces
      .mockResolvedValueOnce([{ rating: 1 }])
      .mockResolvedValueOnce([{ rating: 1 }]);

    const result = await getCrowdIntelligence({ city: "Indore", lat: 22.7, lng: 75.8 });

    expect(result.level).toBe("Moderate");
    expect(result.advisory).toContain("Balanced activity");

    vi.useRealTimers();
  });

  it("uses low advisory branch when density is very low", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T23:00:00"));

    fetchNearbyPlaces
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getCrowdIntelligence({ city: "Mysuru", lat: 12.3, lng: 76.6 });

    expect(result.level).toBe("Low");
    expect(result.advisory).toContain("Low queue pressure");

    vi.useRealTimers();
  });
});

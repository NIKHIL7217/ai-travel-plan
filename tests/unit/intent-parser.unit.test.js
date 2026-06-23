import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/ai/planner.service", () => ({
  isGeminiConfigured: () => false,
  requestGeminiJson: async () => null
}));

import { extractTripIntent } from "../../src/services/ai/intent.service";

describe("intent.service/extractTripIntent multilingual normalization", () => {
  it("handles base short english destination prompt", async () => {
    const result = await extractTripIntent("Goa trip", {});

    expect(result.patch.destination).toBe("Goa");
    expect(result.explicitFields).toContain("destination");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("handles hinglish: goa ki trip", async () => {
    const result = await extractTripIntent("Goa ki trip", {});

    expect(result.patch.destination).toBe("Goa");
  });

  it("handles hinglish: goa ghumna hai", async () => {
    const result = await extractTripIntent("Goa ghumna hai", {});

    expect(result.patch.destination).toBe("Goa");
  });

  it("handles hinglish: goa jane ka plan", async () => {
    const result = await extractTripIntent("Goa jane ka plan", {});

    expect(result.patch.destination).toBe("Goa");
  });

  it("extracts origin and destination from hindi se pattern", async () => {
    const result = await extractTripIntent("Delhi se Goa trip", {});

    expect(result.patch.origin).toBe("Delhi");
    expect(result.patch.destination).toBe("Goa");
  });

  it("extracts duration, travelers, and budget from mixed prompt", async () => {
    const result = await extractTripIntent("Goa trip 5 din 3 bande budget 50000", {});

    expect(result.patch.destination).toBe("Goa");
    expect(result.patch.days).toBe(5);
    expect(result.patch.travelers).toBe(3);
    expect(result.patch.maxBudget).toBe(50000);
  });

  it("parses compact k budget tokens like tkk", async () => {
    const result = await extractTripIntent("Goa 5k tkk budget", {});

    expect(result.patch.destination).toBe("Goa");
    expect(result.patch.maxBudget).toBe(5000);
  });

  it("extracts style and mode from explicit travel language", async () => {
    const result = await extractTripIntent("Luxury Bali trip by flight", {});

    expect(result.patch.destination).toBe("Bali");
    expect(result.patch.style).toBe("Luxury");
    expect(result.patch.travelMode).toBe("Flight");
  });

  it("maps normal/regular style language to balanced", async () => {
    const result = await extractTripIntent("normal Goa trip", {});

    expect(result.patch.destination).toBe("Goa");
    expect(result.patch.style).toBe("Balanced");
  });

  it("returns empty intent for empty prompt", async () => {
    const result = await extractTripIntent("", {});

    expect(result.patch).toEqual({});
    expect(result.explicitFields).toEqual([]);
    expect(result.confidence).toBe(0);
  });
});

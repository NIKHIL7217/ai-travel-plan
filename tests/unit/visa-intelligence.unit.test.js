import { describe, expect, it } from "vitest";
import { getVisaIntelligence } from "../../src/modules/visa-intelligence/service";

describe("visa intelligence service", () => {
  it("returns visa-free advisory for common India-friendly destinations", async () => {
    const result = await getVisaIntelligence({
      destinationName: "Bali",
      destinationLocation: "Indonesia",
      nationality: "Indian",
      purpose: "tourism",
      durationDays: 7
    });

    expect(result.destinationCountry).toBe("Indonesia");
    expect(result.statusLabel.toLowerCase()).toContain("visa");
    expect(result.confidence).toBe("medium");
  });

  it("returns pre-approved visa advisory for stricter destinations", async () => {
    const result = await getVisaIntelligence({
      destinationName: "Paris",
      destinationLocation: "France",
      nationality: "Indian",
      purpose: "tourism",
      durationDays: 10
    });

    expect(result.visaRequired).toBe(true);
    expect(result.statusLabel.toLowerCase()).toContain("pre-approved");
    expect(result.documentsRequired.length).toBeGreaterThan(0);
  });

  it("returns domestic travel advisory when nationality matches destination", async () => {
    const result = await getVisaIntelligence({
      destinationName: "Delhi",
      destinationLocation: "India",
      nationality: "Indian",
      purpose: "tourism",
      durationDays: 5
    });

    expect(result.visaRequired).toBe(false);
    expect(result.statusLabel.toLowerCase()).toContain("no international visa");
  });
});

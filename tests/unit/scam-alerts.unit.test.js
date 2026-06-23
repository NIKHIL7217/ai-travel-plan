import { describe, expect, it } from "vitest";
import { getScamAlerts } from "../../src/modules/scam-alerts/service";

describe("scam alerts service", () => {
  it("returns destination-specific alerts with scored risk profile", async () => {
    const result = await getScamAlerts({
      destinationName: "Goa",
      destinationLocation: "India",
      travelMode: "car",
      timeBand: "evening"
    });

    expect(result.destination).toBe("Goa");
    expect(result.alerts.length).toBeGreaterThan(0);
    expect(result.safeZones.length).toBeGreaterThan(0);
    expect(result.riskScore).toBeGreaterThan(0);
    expect(["High", "Moderate", "Low"]).toContain(result.level);
    expect(result.alerts.some((alert) => alert.id === "night-party-bill-padding")).toBe(true);
  });

  it("increases risk score for night versus morning", async () => {
    const morning = await getScamAlerts({
      destinationName: "Paris",
      destinationLocation: "France",
      timeBand: "morning"
    });

    const night = await getScamAlerts({
      destinationName: "Paris",
      destinationLocation: "France",
      timeBand: "night"
    });

    expect(night.riskScore).toBeGreaterThan(morning.riskScore);
  });
});

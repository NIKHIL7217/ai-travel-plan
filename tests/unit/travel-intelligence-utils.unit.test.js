import { describe, expect, it } from "vitest";
import {
  average,
  clamp,
  dayPart,
  levelFromScore,
  median,
  parseNumber,
  parsePercent,
  parseTemperature
} from "../../src/modules/travel-intelligence/services/utils";

describe("travel-intelligence utils", () => {
  it("clamps numeric values", () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(56, 0, 100)).toBe(56);
  });

  it("parses numeric fields safely", () => {
    expect(parseNumber("56km/h", 0)).toBe(56);
    expect(parseNumber("invalid", 5)).toBe(0);
    expect(parseTemperature("31°C", 20)).toBe(31);
  });

  it("parses and clamps percentages", () => {
    expect(parsePercent("88%", 0)).toBe(88);
    expect(parsePercent("140%", 0)).toBe(100);
    expect(parsePercent("-4%", 30)).toBe(0);
  });

  it("computes average and median", () => {
    expect(average([10, 20, 30])).toBe(20);
    expect(median([5, 1, 10, 7])).toBe(6);
    expect(median([5, 1, 10])).toBe(5);
  });

  it("maps score to levels", () => {
    expect(levelFromScore(80)).toBe("High");
    expect(levelFromScore(60)).toBe("Moderate");
    expect(levelFromScore(20)).toBe("Low");
  });

  it("returns day part by hour", () => {
    expect(dayPart(new Date("2026-01-01T07:00:00"))).toBe("Morning");
    expect(dayPart(new Date("2026-01-01T13:00:00"))).toBe("Afternoon");
    expect(dayPart(new Date("2026-01-01T18:00:00"))).toBe("Evening");
    expect(dayPart(new Date("2026-01-01T23:00:00"))).toBe("Night");
  });
});

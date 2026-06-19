import { getTrafficInsights } from "../../../services/routes";
import { clamp } from "./utils";

function fallbackByTime(routeLabel) {
  const hour = new Date().getHours();
  const congestionPercent = hour >= 8 && hour <= 10
    ? 58
    : hour >= 17 && hour <= 20
      ? 64
      : hour >= 11 && hour <= 16
        ? 36
        : 22;

  const level = congestionPercent >= 60 ? "High" : congestionPercent >= 40 ? "Moderate" : "Low";
  const mobilityScore = clamp(100 - congestionPercent, 12, 95);

  return {
    routeLabel,
    level,
    congestionPercent,
    currentSpeedKmh: Math.round(52 * (1 - congestionPercent / 100)),
    freeFlowSpeedKmh: 52,
    mobilityScore,
    commuteRisk: level === "High" ? "Elevated" : level === "Moderate" ? "Watch" : "Stable",
    advisory: level === "High"
      ? "Plan departures outside peak windows and pad buffers for transfers."
      : "Traffic conditions are manageable with normal departure buffers.",
    updatedAt: new Date().toISOString()
  };
}

export async function getTrafficIntelligence(options = {}) {
  const city = String(options?.city || "Current city").trim();
  const origin = String(options?.origin || city || "Current location").trim();
  const destination = String(options?.destination || `${city} central district`).trim();
  const routeLabel = `${origin} to ${destination}`;

  try {
    const traffic = await getTrafficInsights(origin, destination);
    if (!traffic) {
      return fallbackByTime(routeLabel);
    }

    const congestionPercent = Math.max(0, Math.min(100, Number(traffic.congestionPercent || 0)));
    const currentSpeedKmh = Math.max(0, Math.round(Number(traffic.averageCurrentSpeed || 0)));
    const freeFlowSpeedKmh = Math.max(currentSpeedKmh, Math.round(Number(traffic.averageFreeFlowSpeed || currentSpeedKmh || 0)));
    const mobilityScore = clamp(Math.round(100 - congestionPercent), 12, 98);

    const commuteRisk = congestionPercent >= 60
      ? "Elevated"
      : congestionPercent >= 40
        ? "Watch"
        : "Stable";

    const advisory = congestionPercent >= 60
      ? "Heavy slowdowns detected. Shift critical travel windows away from rush periods."
      : congestionPercent >= 40
        ? "Moderate traffic. Keep 10-20 minute schedule padding for city transfers."
        : "Smooth corridor flow. Current route conditions support predictable travel times.";

    return {
      routeLabel,
      level: traffic.level || (congestionPercent >= 60 ? "High" : congestionPercent >= 40 ? "Moderate" : "Low"),
      congestionPercent,
      currentSpeedKmh,
      freeFlowSpeedKmh,
      mobilityScore,
      commuteRisk,
      advisory,
      updatedAt: traffic.updatedAt || new Date().toISOString()
    };
  } catch (_error) {
    return fallbackByTime(routeLabel);
  }
}

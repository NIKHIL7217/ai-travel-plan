import { fetchNearbyPlaces } from "../../../services/places";
import { average, clamp, dayPart, levelFromScore } from "./utils";

function fallbackPayload(city) {
  const hour = new Date().getHours();
  const baseIndex = hour >= 18 && hour <= 21 ? 74 : hour >= 12 && hour <= 15 ? 62 : 44;
  const level = levelFromScore(baseIndex, { high: 70, medium: 46 });
  const nextHourForecast = [
    { hourOffset: 1, expectedIndex: clamp(baseIndex + 5, 10, 96), expectedLevel: levelFromScore(clamp(baseIndex + 5, 10, 96), { high: 70, medium: 46 }) },
    { hourOffset: 2, expectedIndex: clamp(baseIndex + 2, 10, 96), expectedLevel: levelFromScore(clamp(baseIndex + 2, 10, 96), { high: 70, medium: 46 }) },
    { hourOffset: 3, expectedIndex: clamp(baseIndex - 4, 10, 96), expectedLevel: levelFromScore(clamp(baseIndex - 4, 10, 96), { high: 70, medium: 46 }) }
  ];

  return {
    city,
    level,
    crowdIndex: baseIndex,
    attractionHotspots: 0,
    diningHotspots: 0,
    waitTimeMinutes: {
      attractions: Math.round(baseIndex * 0.55),
      dining: Math.round(baseIndex * 0.42)
    },
    peakWindow: "18:00-21:00",
    offPeakWindow: "07:00-09:30",
    nextHourForecast,
    bestVisitWindows: ["07:00-09:30", "14:00-16:00"],
    advisory: level === "High"
      ? "High crowd pressure expected. Prioritize timed-entry attractions and reservations."
      : "Manageable crowd levels. Use early slots for popular landmarks.",
    updatedAt: new Date().toISOString()
  };
}

export async function getCrowdIntelligence(location = {}) {
  const city = String(location?.city || location?.country || "Current city").trim();
  const lat = location?.lat;
  const lng = location?.lng;

  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return fallbackPayload(city);
  }

  try {
    const [attractions, restaurants] = await Promise.all([
      fetchNearbyPlaces(lat, lng, "attraction", city),
      fetchNearbyPlaces(lat, lng, "restaurant", city)
    ]);

    const attractionHotspots = attractions.length;
    const diningHotspots = restaurants.length;
    const attractionRatings = attractions.map((item) => Number(item.rating || 0));
    const diningRatings = restaurants.map((item) => Number(item.rating || 0));

    const ratingSignal = average([...attractionRatings, ...diningRatings]) * 9;
    const densitySignal = attractionHotspots * 4.5 + diningHotspots * 3.8;

    const part = dayPart();
    const timeBoost = part === "Evening" ? 14 : part === "Afternoon" ? 8 : part === "Night" ? -6 : 3;

    const crowdIndex = clamp(Math.round(24 + densitySignal + ratingSignal + timeBoost), 12, 96);
    const level = levelFromScore(crowdIndex, { high: 72, medium: 48 });
    const attractionWait = Math.round(clamp(crowdIndex * 0.56, 8, 80));
    const diningWait = Math.round(clamp(crowdIndex * 0.4, 6, 60));

    const nextHourForecast = [
      { hourOffset: 1, expectedIndex: clamp(crowdIndex + (part === "Evening" ? 5 : 2), 10, 96), expectedLevel: levelFromScore(clamp(crowdIndex + (part === "Evening" ? 5 : 2), 10, 96), { high: 72, medium: 48 }) },
      { hourOffset: 2, expectedIndex: clamp(crowdIndex + (part === "Afternoon" ? 4 : 0), 10, 96), expectedLevel: levelFromScore(clamp(crowdIndex + (part === "Afternoon" ? 4 : 0), 10, 96), { high: 72, medium: 48 }) },
      { hourOffset: 3, expectedIndex: clamp(crowdIndex - 6, 10, 96), expectedLevel: levelFromScore(clamp(crowdIndex - 6, 10, 96), { high: 72, medium: 48 }) }
    ];

    const advisory = level === "High"
      ? "High occupancy windows detected. Reserve dining slots and pre-book major attractions."
      : level === "Moderate"
        ? "Balanced activity. Expect mild wait times at prime venues during evening windows."
        : "Low queue pressure right now. This is a good window for high-demand attractions.";

    return {
      city,
      level,
      crowdIndex,
      attractionHotspots,
      diningHotspots,
      waitTimeMinutes: {
        attractions: attractionWait,
        dining: diningWait
      },
      peakWindow: "18:00-21:00",
      offPeakWindow: "07:00-09:30",
      nextHourForecast,
      bestVisitWindows: ["07:00-09:30", "14:00-16:00"],
      advisory,
      updatedAt: new Date().toISOString()
    };
  } catch (_error) {
    return fallbackPayload(city);
  }
}

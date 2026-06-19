import { DEFAULT_SCENIC_CORRIDORS, ROAD_CONDITION_FACTORS, ROAD_PROFILE_BY_MODE } from "./constants";

function hashCode(input = "") {
  const text = String(input || "").toLowerCase();
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function computeRoadConditions(traffic = null, weather = null) {
  const congestion = Number(traffic?.congestionPercent || 0);
  const rainProbability = parseFloat(String(weather?.rainProbability || "0").replace(/[^\d.]/g, "")) || 0;
  const avgSpeed = Number(traffic?.averageCurrentSpeed || 0);

  let level = "moderate";
  if (congestion >= 60 || rainProbability >= 70) {
    level = "challenging";
  } else if (congestion >= 40 || rainProbability >= 45) {
    level = "rough";
  } else if (congestion <= 15 && rainProbability < 25 && avgSpeed >= 55) {
    level = "smooth";
  }

  const score = clamp(100 - congestion - Math.round(rainProbability * 0.45), 20, 95);

  return {
    level,
    score,
    congestionPercent: congestion,
    rainProbability,
    advice: level === "challenging"
      ? "Drive in daylight, extend buffers, and avoid tight mountain stretches after dark."
      : level === "rough"
        ? "Keep moderate pace and schedule short recovery breaks at major service towns."
        : level === "smooth"
          ? "Road conditions are favorable for longer uninterrupted drive windows."
          : "Standard mixed conditions expected. Keep flexible stop windows."
  };
}

export function planScenicRoute({
  origin = "Origin",
  destination = "Destination",
  distanceKm = 0,
  travelMode = "Car",
  days = 5,
  routeIntelligence = null,
  roadConditions = null
}) {
  const modeKey = String(travelMode || "Car").trim().toLowerCase();
  const profile = ROAD_PROFILE_BY_MODE[modeKey] || ROAD_PROFILE_BY_MODE.car;
  const condition = ROAD_CONDITION_FACTORS[roadConditions?.level] || ROAD_CONDITION_FACTORS.moderate;

  const baseDriveHours = distanceKm > 0
    ? Number((distanceKm / (profile.averageSpeedKmh * condition.speedFactor)).toFixed(1))
    : null;

  const scenicSeed = hashCode(`${origin}_${destination}_${distanceKm}`);
  const scenicRoads = DEFAULT_SCENIC_CORRIDORS.map((name, index) => {
    const scenicBonus = (scenicSeed + index * 11) % 18;
    return {
      id: `${name.toLowerCase().replace(/\s+/g, "-")}_${index}`,
      name,
      scenicScore: clamp(72 + scenicBonus, 70, 96),
      bestWindow: index % 2 === 0 ? "Sunrise to late morning" : "Golden hour to dusk",
      reason: index % 2 === 0
        ? "Low urban clutter with mountain or valley sightlines."
        : "Evening light and horizon depth make this corridor ideal for visual driving.",
      mapQuery: `${name} between ${origin} and ${destination}`
    };
  }).slice(0, 3);

  const summary = routeIntelligence?.routeSummary
    ? `${routeIntelligence.routeSummary}. Prioritized scenic alternatives and pacing windows added.`
    : `${origin} to ${destination} scenic drive plan generated with dynamic road pacing and photography priorities.`;

  return {
    summary,
    driveHours: baseDriveHours,
    routeDistanceKm: Number(distanceKm || 0),
    idealDrivingWindow: roadConditions?.level === "challenging" ? "06:00 - 16:30" : "05:45 - 18:45",
    daysSuggested: Math.max(2, Number(days || 2)),
    bestDrivingRoads: scenicRoads
  };
}

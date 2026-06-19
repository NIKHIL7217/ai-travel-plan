import { average, clamp, parseTemperature } from "./utils";

function getCurrentSeason(monthIndex) {
  const month = Number(monthIndex);
  if ([11, 0, 1].includes(month)) {
    return "Winter";
  }
  if ([2, 3, 4].includes(month)) {
    return "Spring";
  }
  if ([5, 6, 7].includes(month)) {
    return "Summer";
  }
  return "Autumn";
}

function seasonalTargetBand(season) {
  if (season === "Winter") {
    return { low: 14, high: 25 };
  }
  if (season === "Spring") {
    return { low: 18, high: 29 };
  }
  if (season === "Summer") {
    return { low: 22, high: 33 };
  }
  return { low: 16, high: 28 };
}

function seasonAdvisory(season, score, trend) {
  if (score >= 80) {
    return `${season} conditions look strong for itinerary execution and outdoor movement.`;
  }
  if (trend === "warming") {
    return `${season} is trending warmer. Prioritize shaded day plans and later evening activities.`;
  }
  if (trend === "cooling") {
    return `${season} is trending cooler. Keep layered clothing and warm evening options.`;
  }
  return `${season} has mixed signals this week. Keep flexible scheduling for peak comfort windows.`;
}

export function createFallbackSeasonIntelligence() {
  const currentSeason = getCurrentSeason(new Date().getMonth());
  return {
    currentSeason,
    thermalTrend: "stable",
    seasonalScore: 68,
    bestWindow: "Morning and late afternoon",
    advisory: `${currentSeason} profile is stable. Continue with balanced indoor-outdoor plans.`,
    updatedAt: new Date().toISOString()
  };
}

export function getSeasonIntelligence({ weather = null } = {}) {
  const currentSeason = getCurrentSeason(new Date().getMonth());

  if (!weather || !Array.isArray(weather.weatherForecast) || weather.weatherForecast.length === 0) {
    return createFallbackSeasonIntelligence();
  }

  const temps = weather.weatherForecast
    .map((day) => parseTemperature(day.temp, null))
    .filter((value) => value !== null);

  if (temps.length === 0) {
    return createFallbackSeasonIntelligence();
  }

  const avgTemp = average(temps);
  const firstTemp = Number(temps[0]);
  const lastTemp = Number(temps[temps.length - 1]);
  const trendDelta = Number((lastTemp - firstTemp).toFixed(1));
  const thermalTrend = trendDelta > 1.2 ? "warming" : trendDelta < -1.2 ? "cooling" : "stable";

  const band = seasonalTargetBand(currentSeason);
  const distanceFromBand = avgTemp < band.low
    ? band.low - avgTemp
    : avgTemp > band.high
      ? avgTemp - band.high
      : 0;

  const seasonalScore = clamp(Math.round(90 - distanceFromBand * 5.5 - Math.abs(trendDelta) * 2.2), 25, 96);
  const bestWindow = avgTemp >= 31
    ? "Early morning and evening"
    : avgTemp <= 14
      ? "Late morning and afternoon"
      : "Morning and late afternoon";

  return {
    currentSeason,
    thermalTrend,
    seasonalScore,
    avgTemp: Math.round(avgTemp),
    trendDelta,
    bestWindow,
    advisory: seasonAdvisory(currentSeason, seasonalScore, thermalTrend),
    updatedAt: new Date().toISOString()
  };
}

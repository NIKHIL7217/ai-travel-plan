import { fetchWeather } from "../../../services/weather";
import { clamp, parseNumber, parsePercent, parseTemperature } from "./utils";

function comfortBand(score) {
  if (score >= 82) {
    return "Excellent";
  }
  if (score >= 66) {
    return "Good";
  }
  if (score >= 46) {
    return "Moderate";
  }
  return "Harsh";
}

function weatherAdvisory(score, rainProbability, aqi, temperatureC) {
  if (score >= 80) {
    return "Conditions are favorable for outdoor plans and city exploration.";
  }
  if (rainProbability >= 60) {
    return "Keep a rain backup plan and prioritize indoor options during peak showers.";
  }
  if (aqi !== null && aqi >= 120) {
    return "Air quality is elevated. Reduce prolonged outdoor activity and stay hydrated.";
  }
  if (temperatureC >= 34) {
    return "Heat risk is elevated. Plan early starts and include cooling breaks.";
  }
  return "Mixed conditions expected. Keep a flexible itinerary and monitor hourly changes.";
}

function fallbackPayload(city) {
  const score = 72;
  return {
    city,
    condition: "Partly Cloudy",
    temperatureC: 24,
    humidityPercent: 62,
    windKmh: 12,
    rainProbabilityPercent: 15,
    aqi: 55,
    comfortScore: score,
    comfortBand: comfortBand(score),
    advisory: weatherAdvisory(score, 15, 55, 24),
    forecast: [],
    updatedAt: new Date().toISOString()
  };
}

export async function getWeatherIntelligence(location = {}) {
  const city = String(location?.city || location?.country || "Your Area").trim();
  const lat = location?.lat;
  const lng = location?.lng;

  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return fallbackPayload(city);
  }

  try {
    const report = location?.weather || (await fetchWeather(lat, lng));
    if (!report) {
      return fallbackPayload(city);
    }

    const temperatureC = parseTemperature(report.temp, 24);
    const humidityPercent = parsePercent(report.humidity, 60);
    const rainProbabilityPercent = parsePercent(report.rainProbability, 10);
    const windKmh = parseNumber(report.windSpeed, 12);
    const aqi = report.aqi === null || report.aqi === undefined ? null : Math.max(0, Math.round(Number(report.aqi)));

    let score = 84;
    score -= Math.max(0, Math.abs(temperatureC - 24) * 1.6);
    score -= Math.max(0, (humidityPercent - 60) * 0.35);
    score -= rainProbabilityPercent * 0.42;
    score -= Math.max(0, (windKmh - 20) * 0.55);
    if (aqi !== null) {
      score -= Math.max(0, (aqi - 60) * 0.2);
    }

    const comfortScore = clamp(Math.round(score), 10, 96);
    const condition = report?.weatherForecast?.[0]?.general || "Mixed";

    return {
      city,
      condition,
      temperatureC,
      humidityPercent,
      windKmh: Math.round(windKmh),
      rainProbabilityPercent,
      aqi,
      comfortScore,
      comfortBand: comfortBand(comfortScore),
      advisory: weatherAdvisory(comfortScore, rainProbabilityPercent, aqi, temperatureC),
      forecast: Array.isArray(report.weatherForecast) ? report.weatherForecast.slice(0, 3) : [],
      updatedAt: new Date().toISOString()
    };
  } catch (_error) {
    return fallbackPayload(city);
  }
}

import { clamp, parsePercent, parseTemperature } from "./utils";

function safetyAdvisory({ safetyScore, crowdLevel, trafficLevel, aqi, weatherRisk }) {
  if (safetyScore >= 82) {
    return "Current signals indicate a stable travel safety profile with normal precautions.";
  }

  if (crowdLevel === "High") {
    return "High crowd pressure detected. Secure reservations and avoid late-night congestion points.";
  }

  if (trafficLevel === "High") {
    return "Traffic risk is elevated. Keep transport buffers and avoid dense junction windows.";
  }

  if (aqi !== null && aqi >= 140) {
    return "Air quality stress detected. Limit prolonged outdoor exertion and keep hydration frequent.";
  }

  if (weatherRisk >= 55) {
    return "Weather variability is notable. Keep route alternates and contingency blocks in your plan.";
  }

  return "Mixed risk profile. Continue with balanced timing and standard urban travel safety practices.";
}

export function createFallbackSafetyIntelligence() {
  return {
    safetyScore: 70,
    level: "Moderate",
    riskDrivers: ["crowd-variance", "transit-delay"],
    advisory: "Baseline safety signals are moderate. Maintain routine travel precautions.",
    updatedAt: new Date().toISOString()
  };
}

export function getSafetyIntelligence({ weather = null, traffic = null, crowd = null } = {}) {
  if (!weather && !traffic && !crowd) {
    return createFallbackSafetyIntelligence();
  }

  const crowdLevel = String(crowd?.level || "Moderate");
  const trafficLevel = String(traffic?.level || "Moderate");

  const rainProbability = parsePercent(weather?.rainProbabilityPercent ?? weather?.rainProbability, 10);
  const temperature = parseTemperature(weather?.temperatureC ?? weather?.temp, 24);
  const aqi = weather?.aqi === null || weather?.aqi === undefined
    ? null
    : Math.max(0, Number(weather.aqi));

  const weatherRisk = Math.max(0, rainProbability * 0.5 + Math.max(0, temperature - 33) * 3 + (aqi !== null ? Math.max(0, aqi - 100) * 0.2 : 0));

  const crowdPenalty = crowdLevel === "High" ? 16 : crowdLevel === "Moderate" ? 8 : 2;
  const trafficPenalty = trafficLevel === "High" ? 18 : trafficLevel === "Moderate" ? 9 : 3;
  const weatherPenalty = Math.min(22, Math.round(weatherRisk));

  const safetyScore = clamp(Math.round(96 - crowdPenalty - trafficPenalty - weatherPenalty), 18, 96);
  const level = safetyScore >= 82 ? "High" : safetyScore >= 62 ? "Moderate" : "Watch";

  const riskDrivers = [];
  if (crowdLevel === "High") {
    riskDrivers.push("high-crowd-density");
  }
  if (trafficLevel === "High") {
    riskDrivers.push("high-traffic-friction");
  }
  if (rainProbability >= 55) {
    riskDrivers.push("rain-disruption-risk");
  }
  if (aqi !== null && aqi >= 140) {
    riskDrivers.push("air-quality-stress");
  }
  if (riskDrivers.length === 0) {
    riskDrivers.push("normal-urban-variance");
  }

  return {
    safetyScore,
    level,
    riskDrivers,
    advisory: safetyAdvisory({ safetyScore, crowdLevel, trafficLevel, aqi, weatherRisk }),
    updatedAt: new Date().toISOString()
  };
}

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
  const dimensions = {
    overall: 70,
    nightSafety: 64,
    soloFemaleSafety: 66,
    familySafety: 74,
    scamRisk: 42,
    healthRisk: 38
  };

  return {
    safetyScore: dimensions.overall,
    level: "Moderate",
    riskDrivers: ["crowd-variance", "transit-delay"],
    dimensions,
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

  const crowdIndex = Number(crowd?.crowdIndex || 0);
  const congestionPercent = Number(traffic?.congestionPercent || 0);
  const scamRisk = clamp(Math.round(28 + crowdIndex * 0.34 + congestionPercent * 0.22), 12, 92);
  const healthRisk = clamp(
    Math.round(
      16 +
      rainProbability * 0.3 +
      Math.max(0, temperature - 32) * 2.1 +
      (aqi !== null ? Math.max(0, aqi - 90) * 0.24 : 0)
    ),
    8,
    90
  );

  const nightSafety = clamp(Math.round(safetyScore - (crowdLevel === "High" ? 12 : 7) - (trafficLevel === "High" ? 9 : 4)), 10, 95);
  const soloFemaleSafety = clamp(Math.round(nightSafety - (crowdLevel === "High" ? 8 : 4)), 8, 92);
  const familySafety = clamp(Math.round(safetyScore + (crowdLevel === "Low" ? 6 : 1) - Math.round(healthRisk * 0.15)), 10, 96);

  const dimensions = {
    overall: safetyScore,
    nightSafety,
    soloFemaleSafety,
    familySafety,
    scamRisk,
    healthRisk
  };

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
  if (scamRisk >= 58) {
    riskDrivers.push("scam-risk-elevated");
  }
  if (healthRisk >= 55) {
    riskDrivers.push("health-risk-watch");
  }
  if (riskDrivers.length === 0) {
    riskDrivers.push("normal-urban-variance");
  }

  return {
    safetyScore,
    level,
    riskDrivers,
    dimensions,
    advisory: safetyAdvisory({ safetyScore, crowdLevel, trafficLevel, aqi, weatherRisk }),
    updatedAt: new Date().toISOString()
  };
}

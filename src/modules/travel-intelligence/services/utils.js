export function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

export function parseNumber(value, fallback = 0) {
  const numeric = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function parsePercent(value, fallback = 0) {
  const parsed = parseNumber(value, fallback);
  return clamp(parsed, 0, 100);
}

export function parseTemperature(value, fallback = 24) {
  return parseNumber(value, fallback);
}

export function average(values = []) {
  const normalized = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (normalized.length === 0) {
    return 0;
  }

  return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
}

export function median(values = []) {
  const normalized = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (normalized.length === 0) {
    return 0;
  }

  const mid = Math.floor(normalized.length / 2);
  if (normalized.length % 2 === 0) {
    return (normalized[mid - 1] + normalized[mid]) / 2;
  }
  return normalized[mid];
}

export function levelFromScore(score, thresholds = { high: 75, medium: 45 }) {
  const normalized = Number(score || 0);
  if (normalized >= thresholds.high) {
    return "High";
  }
  if (normalized >= thresholds.medium) {
    return "Moderate";
  }
  return "Low";
}

export function dayPart(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) {
    return "Morning";
  }
  if (hour >= 12 && hour < 17) {
    return "Afternoon";
  }
  if (hour >= 17 && hour < 22) {
    return "Evening";
  }
  return "Night";
}

const FLAG_STORAGE_KEY = "wanderai.feature_flags.overrides.v1";

const FLAG_CONFIG = {
  FEATURE_AI_INTENT: { env: "VITE_FEATURE_AI_INTENT", defaultValue: true, label: "AI intent extraction" },
  FEATURE_EVENTS_PROVIDER: { env: "VITE_FEATURE_EVENTS_PROVIDER", defaultValue: true, label: "Live events provider" },
  FEATURE_DYNAMIC_REPLAN: { env: "VITE_FEATURE_DYNAMIC_REPLAN", defaultValue: true, label: "Dynamic manual replan" },
  FEATURE_BOOKING_ANALYTICS: { env: "VITE_FEATURE_BOOKING_ANALYTICS", defaultValue: true, label: "Booking analytics pipeline" },
  FEATURE_ROUTE_COMPARISON: { env: "VITE_FEATURE_ROUTE_COMPARISON", defaultValue: true, label: "Roadtrip route comparison" }
};

function readFlagFromEnv(name, defaultValue = true) {
  const raw = import.meta.env[name];
  if (typeof raw === "undefined") {
    return defaultValue;
  }

  return String(raw).toLowerCase() !== "false";
}

function safeReadOverrides() {
  if (typeof localStorage === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(FLAG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeWriteOverrides(overrides) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(FLAG_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Best effort persistence.
  }
}

const envFlags = Object.fromEntries(
  Object.entries(FLAG_CONFIG).map(([key, config]) => [key, readFlagFromEnv(config.env, config.defaultValue)])
);

let overrides = safeReadOverrides();

function hasOverride(name) {
  return Object.prototype.hasOwnProperty.call(overrides, name);
}

export function isFeatureEnabled(name) {
  if (!Object.prototype.hasOwnProperty.call(FLAG_CONFIG, name)) {
    return false;
  }

  if (hasOverride(name)) {
    return Boolean(overrides[name]);
  }

  return Boolean(envFlags[name]);
}

export function setFeatureFlagOverride(name, enabled) {
  if (!Object.prototype.hasOwnProperty.call(FLAG_CONFIG, name)) {
    return false;
  }

  overrides = {
    ...overrides,
    [name]: Boolean(enabled)
  };
  safeWriteOverrides(overrides);
  return true;
}

export function clearFeatureFlagOverride(name) {
  if (!Object.prototype.hasOwnProperty.call(FLAG_CONFIG, name)) {
    return false;
  }

  if (!hasOverride(name)) {
    return true;
  }

  const next = { ...overrides };
  delete next[name];
  overrides = next;
  safeWriteOverrides(overrides);
  return true;
}

export function getFeatureFlagsSnapshot() {
  return Object.fromEntries(
    Object.keys(FLAG_CONFIG).map((name) => {
      const envEnabled = Boolean(envFlags[name]);
      const overrideEnabled = hasOverride(name) ? Boolean(overrides[name]) : null;
      const enabled = overrideEnabled === null ? envEnabled : overrideEnabled;

      return [name, {
        name,
        label: FLAG_CONFIG[name].label,
        envEnabled,
        overrideEnabled,
        enabled,
        source: overrideEnabled === null ? "env" : "override"
      }];
    })
  );
}

export const FEATURE_AI_INTENT = isFeatureEnabled("FEATURE_AI_INTENT");
export const FEATURE_EVENTS_PROVIDER = isFeatureEnabled("FEATURE_EVENTS_PROVIDER");
export const FEATURE_DYNAMIC_REPLAN = isFeatureEnabled("FEATURE_DYNAMIC_REPLAN");
export const FEATURE_BOOKING_ANALYTICS = isFeatureEnabled("FEATURE_BOOKING_ANALYTICS");
export const FEATURE_ROUTE_COMPARISON = isFeatureEnabled("FEATURE_ROUTE_COMPARISON");

import { createLogger } from "../logger";

const monitorLogger = createLogger("monitoring");
const MAX_EVENTS = 500;
const events = [];
const listeners = new Set();

function pushEvent(event) {
  events.push(event);
  if (events.length > MAX_EVENTS) {
    events.shift();
  }

  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (_error) {
      // Listener failures should not break monitoring.
    }
  });
}

export function trackEvent(type, payload = {}, level = "info") {
  const event = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    level,
    payload,
    timestamp: Date.now()
  };

  pushEvent(event);

  if (level === "error") {
    monitorLogger.error(`Event: ${type}`, payload);
  } else if (level === "warn") {
    monitorLogger.warn(`Event: ${type}`, payload);
  } else {
    monitorLogger.info(`Event: ${type}`, payload);
  }

  return event;
}

export function trackError(error, context = {}) {
  const payload = {
    name: error?.name || "Error",
    message: error?.message || "Unknown error",
    code: error?.code || "UNKNOWN",
    status: error?.status || null,
    retryable: Boolean(error?.retryable),
    context
  };

  return trackEvent("error.captured", payload, "error");
}

export function trackApiAttempt(payload) {
  return trackEvent("api.request.attempt", payload, "info");
}

export function trackApiSuccess(payload) {
  return trackEvent("api.request.success", payload, "info");
}

export function trackApiFailure(payload) {
  return trackEvent("api.request.failure", payload, "warn");
}

export function getMonitoringSnapshot() {
  return [...events];
}

export function subscribeMonitoring(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearMonitoringEvents() {
  events.length = 0;
}

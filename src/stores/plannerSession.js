import { defineStore } from "pinia";
import { ref } from "vue";

const STORAGE_KEY = "travel_os_planner_session_v1";

function safeReadStorage() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function normalizeContext(payload = {}) {
  const destination = String(payload.destination || "").trim();

  return {
    destination,
    origin: String(payload.origin || "Current Location").trim() || "Current Location",
    summary: String(payload.summary || "").trim(),
    style: String(payload.style || "Balanced").trim() || "Balanced",
    travelMode: String(payload.travelMode || "Car").trim() || "Car",
    days: Number(payload.days || 0),
    budgetTotal: Number(payload.budgetTotal || 0),
    suggestions: Array.isArray(payload.suggestions) ? payload.suggestions.slice(0, 6) : [],
    itineraryPreview: Array.isArray(payload.itineraryPreview) ? payload.itineraryPreview.slice(0, 3) : [],
    updatedAt: Number(payload.updatedAt || Date.now())
  };
}

export const usePlannerSessionStore = defineStore("plannerSession", () => {
  const activeContext = ref(null);

  function persist() {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      if (!activeContext.value) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeContext.value));
    } catch (_error) {
      // Non-blocking persistence path.
    }
  }

  function hydrate() {
    const stored = safeReadStorage();
    activeContext.value = stored ? normalizeContext(stored) : null;
  }

  function setActiveContext(payload = {}) {
    activeContext.value = normalizeContext(payload);
    persist();
  }

  function patchContext(payload = {}) {
    if (!activeContext.value) {
      setActiveContext(payload);
      return;
    }

    setActiveContext({
      ...activeContext.value,
      ...(payload || {}),
      updatedAt: Date.now()
    });
  }

  function clearContext() {
    activeContext.value = null;
    persist();
  }

  hydrate();

  return {
    activeContext,
    hydrate,
    setActiveContext,
    patchContext,
    clearContext
  };
});

const STORAGE_PREFIX = "roam_profile_memory_v1_";
const MAX_PREVIOUS_TRIPS = 40;
const MAX_FAVORITES = 12;

function now() {
  return Date.now();
}

function normalizeString(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function normalizeBudgetPreference(value = {}) {
  const target = Number(value?.target || 1500);
  const min = Number(value?.min || 400);
  const max = Number(value?.max || 5000);

  return {
    target: Number.isFinite(target) ? Math.max(100, Math.round(target)) : 1500,
    min: Number.isFinite(min) ? Math.max(50, Math.round(min)) : 400,
    max: Number.isFinite(max) ? Math.max(200, Math.round(max)) : 5000
  };
}

function normalizeFavoriteEntry(item) {
  if (!item) {
    return null;
  }

  if (typeof item === "string") {
    const name = normalizeString(item);
    if (!name) {
      return null;
    }

    return {
      name,
      count: 1,
      score: 1,
      lastInteractedAt: now()
    };
  }

  const name = normalizeString(item.name || item.destination || "");
  if (!name) {
    return null;
  }

  const count = Number(item.count || 1);
  const score = Number(item.score || count || 1);

  return {
    name,
    count: Number.isFinite(count) ? Math.max(1, Math.round(count)) : 1,
    score: Number.isFinite(score) ? Math.max(1, Number(score)) : 1,
    lastInteractedAt: Number(item.lastInteractedAt || now())
  };
}

function dedupeFavorites(items = []) {
  const lookup = new Map();

  items.forEach((item) => {
    const normalized = normalizeFavoriteEntry(item);
    if (!normalized) {
      return;
    }

    const key = normalized.name.toLowerCase();
    if (!lookup.has(key)) {
      lookup.set(key, normalized);
      return;
    }

    const existing = lookup.get(key);
    existing.count += normalized.count;
    existing.score += normalized.score;
    existing.lastInteractedAt = Math.max(existing.lastInteractedAt, normalized.lastInteractedAt);
  });

  return [...lookup.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_FAVORITES);
}

function createTripSnapshot(trip = {}, saved = false) {
  return {
    id: normalizeString(trip.id, `${saved ? "saved" : "gen"}_${now()}`),
    destination: normalizeString(trip.destination, "Unknown Destination"),
    travelStyle: normalizeString(trip.travelStyle || trip.style, "Comfort"),
    budgetTotal: Math.max(0, Number(trip.budgetTotal || trip.budget || 0)),
    transportPreference: normalizeString(trip.transportPreference || trip.travelMode, "Car"),
    foodPreference: normalizeString(trip.foodPreference, "mixed"),
    stayPreference: normalizeString(trip.stayPreference, "mid-range"),
    days: Math.max(1, Number(trip.days || 1)),
    travelers: Math.max(1, Number(trip.travelers || 1)),
    sourceQuery: normalizeString(trip.sourceQuery || ""),
    saved,
    createdAt: now()
  };
}

function getStorageKey(userId = "guest") {
  return `${STORAGE_PREFIX}${normalizeString(userId, "guest")}`;
}

function getDefaultPreferences() {
  return {
    travelStyle: "Comfort",
    budgetPreference: {
      target: 1500,
      min: 400,
      max: 5000
    },
    favoriteDestinations: [],
    transportPreference: "Car",
    foodPreference: "mixed",
    stayPreference: "mid-range"
  };
}

export function createEmptyProfileMemory(userId = "guest") {
  return {
    version: 1,
    userId: normalizeString(userId, "guest"),
    createdAt: now(),
    updatedAt: now(),
    preferences: getDefaultPreferences(),
    previousTrips: [],
    counters: {
      generations: 0,
      savedTrips: 0,
      preferenceUpdates: 0
    },
    metadata: {
      lastPersonalizationAt: null
    }
  };
}

export function normalizeProfileMemory(raw, userId = "guest") {
  if (!raw || typeof raw !== "object") {
    return createEmptyProfileMemory(userId);
  }

  const base = createEmptyProfileMemory(userId);
  const preferences = raw.preferences || {};
  const previousTrips = Array.isArray(raw.previousTrips) ? raw.previousTrips : [];

  return {
    ...base,
    ...raw,
    userId: normalizeString(raw.userId || userId, "guest"),
    updatedAt: Number(raw.updatedAt || now()),
    preferences: {
      travelStyle: normalizeString(preferences.travelStyle, base.preferences.travelStyle),
      budgetPreference: normalizeBudgetPreference(preferences.budgetPreference || base.preferences.budgetPreference),
      favoriteDestinations: dedupeFavorites(preferences.favoriteDestinations || []),
      transportPreference: normalizeString(preferences.transportPreference, base.preferences.transportPreference),
      foodPreference: normalizeString(preferences.foodPreference, base.preferences.foodPreference),
      stayPreference: normalizeString(preferences.stayPreference, base.preferences.stayPreference)
    },
    previousTrips: previousTrips
      .map((trip) => createTripSnapshot(trip, Boolean(trip?.saved)))
      .slice(0, MAX_PREVIOUS_TRIPS),
    counters: {
      generations: Math.max(0, Number(raw?.counters?.generations || 0)),
      savedTrips: Math.max(0, Number(raw?.counters?.savedTrips || 0)),
      preferenceUpdates: Math.max(0, Number(raw?.counters?.preferenceUpdates || 0))
    },
    metadata: {
      lastPersonalizationAt: Number(raw?.metadata?.lastPersonalizationAt || 0) || null
    }
  };
}

export function loadProfileMemory(userId = "guest") {
  if (typeof localStorage === "undefined") {
    return createEmptyProfileMemory(userId);
  }

  const key = getStorageKey(userId);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const empty = createEmptyProfileMemory(userId);
      localStorage.setItem(key, JSON.stringify(empty));
      return empty;
    }

    const parsed = JSON.parse(raw);
    return normalizeProfileMemory(parsed, userId);
  } catch (_error) {
    const empty = createEmptyProfileMemory(userId);
    localStorage.setItem(key, JSON.stringify(empty));
    return empty;
  }
}

export function saveProfileMemory(memory) {
  const normalized = normalizeProfileMemory(memory, memory?.userId || "guest");

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(getStorageKey(normalized.userId), JSON.stringify(normalized));
  }

  return normalized;
}

function mergeFavoriteDestinations(existing, incoming = []) {
  return dedupeFavorites([...(existing || []), ...(incoming || [])]);
}

export function saveEditablePreferences(userId = "guest", patch = {}) {
  const memory = loadProfileMemory(userId);
  const favoriteDestinations = mergeFavoriteDestinations(
    memory.preferences.favoriteDestinations,
    Array.isArray(patch.favoriteDestinations) ? patch.favoriteDestinations : []
  );

  memory.preferences = {
    ...memory.preferences,
    travelStyle: normalizeString(patch.travelStyle, memory.preferences.travelStyle),
    budgetPreference: normalizeBudgetPreference({
      ...memory.preferences.budgetPreference,
      ...(patch.budgetPreference || {})
    }),
    favoriteDestinations,
    transportPreference: normalizeString(patch.transportPreference, memory.preferences.transportPreference),
    foodPreference: normalizeString(patch.foodPreference, memory.preferences.foodPreference),
    stayPreference: normalizeString(patch.stayPreference, memory.preferences.stayPreference)
  };

  memory.counters.preferenceUpdates += 1;
  memory.updatedAt = now();

  return saveProfileMemory(memory);
}

function upsertFavoriteDestination(memory, destinationName, weight = 1) {
  const name = normalizeString(destinationName);
  if (!name) {
    return;
  }

  const favoriteDestinations = [...memory.preferences.favoriteDestinations];
  const idx = favoriteDestinations.findIndex((entry) => entry.name.toLowerCase() === name.toLowerCase());

  if (idx >= 0) {
    favoriteDestinations[idx].count += 1;
    favoriteDestinations[idx].score += weight;
    favoriteDestinations[idx].lastInteractedAt = now();
  } else {
    favoriteDestinations.push({
      name,
      count: 1,
      score: weight,
      lastInteractedAt: now()
    });
  }

  memory.preferences.favoriteDestinations = dedupeFavorites(favoriteDestinations);
}

function updateBudgetPreferenceFromTrip(memory, trip) {
  const budget = Number(trip?.budgetTotal || 0);
  if (!Number.isFinite(budget) || budget <= 0) {
    return;
  }

  const currentTarget = Number(memory.preferences.budgetPreference?.target || 1500);
  const generations = Math.max(1, Number(memory.counters.generations || 1));
  const blended = Math.round((currentTarget * (generations - 1) + budget) / generations);
  memory.preferences.budgetPreference.target = Math.max(100, blended);
}

export function recordGeneratedTrip(userId = "guest", trip = {}) {
  const memory = loadProfileMemory(userId);
  const snapshot = createTripSnapshot(trip, false);

  memory.previousTrips = [snapshot, ...memory.previousTrips].slice(0, MAX_PREVIOUS_TRIPS);
  memory.counters.generations += 1;
  memory.preferences.travelStyle = normalizeString(snapshot.travelStyle, memory.preferences.travelStyle);
  memory.preferences.transportPreference = normalizeString(snapshot.transportPreference, memory.preferences.transportPreference);
  memory.preferences.foodPreference = normalizeString(snapshot.foodPreference, memory.preferences.foodPreference);
  memory.preferences.stayPreference = normalizeString(snapshot.stayPreference, memory.preferences.stayPreference);

  updateBudgetPreferenceFromTrip(memory, snapshot);
  upsertFavoriteDestination(memory, snapshot.destination, 2);

  memory.updatedAt = now();
  return saveProfileMemory(memory);
}

export function recordSavedTrip(userId = "guest", trip = {}) {
  const memory = loadProfileMemory(userId);
  const destination = normalizeString(trip.destination);

  const existingIdx = memory.previousTrips.findIndex(
    (item) => item.destination.toLowerCase() === destination.toLowerCase() && item.saved === false
  );

  if (existingIdx >= 0) {
    memory.previousTrips[existingIdx].saved = true;
  } else {
    const snapshot = createTripSnapshot(trip, true);
    memory.previousTrips = [snapshot, ...memory.previousTrips].slice(0, MAX_PREVIOUS_TRIPS);
  }

  memory.counters.savedTrips += 1;
  upsertFavoriteDestination(memory, destination, 3);
  memory.updatedAt = now();

  return saveProfileMemory(memory);
}

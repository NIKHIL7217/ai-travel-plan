const STORAGE_PREFIX = "roam_profile_memory_v1_";
const MAX_PREVIOUS_TRIPS = 40;
const MAX_FAVORITES = 12;
const MAX_PREFERENCE_PROFILES = 5;

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

function normalizePreferenceSet(preferences = {}, fallback = getDefaultPreferences()) {
  const source = preferences || {};
  const fallbackBudget = fallback?.budgetPreference || getDefaultPreferences().budgetPreference;

  return {
    travelStyle: normalizeString(source.travelStyle || source.style, fallback.travelStyle),
    budgetPreference: normalizeBudgetPreference({
      ...fallbackBudget,
      ...(source.budgetPreference || {}),
      target: source.budgetTarget || source.maxBudget || source?.budgetPreference?.target || fallbackBudget.target
    }),
    favoriteDestinations: dedupeFavorites(source.favoriteDestinations || fallback.favoriteDestinations || []),
    transportPreference: normalizeString(source.transportPreference || source.travelMode, fallback.transportPreference),
    foodPreference: normalizeString(source.foodPreference, fallback.foodPreference),
    stayPreference: normalizeString(source.stayPreference, fallback.stayPreference)
  };
}

function createPreferenceProfile(profile = {}, fallbackPreferences = getDefaultPreferences(), index = 0) {
  const id = normalizeString(profile.id, `profile_${now()}_${index}`);
  const name = normalizeString(profile.name, `Traveler ${index + 1}`);
  const preferences = normalizePreferenceSet(profile.preferences || profile, fallbackPreferences);

  return {
    id,
    name,
    preferences,
    createdAt: Number(profile.createdAt || now()),
    updatedAt: Number(profile.updatedAt || now())
  };
}

function normalizePreferenceProfiles(rawProfiles = [], fallbackPreferences = getDefaultPreferences()) {
  const profiles = Array.isArray(rawProfiles) ? rawProfiles : [];
  const dedupe = new Map();

  profiles.forEach((profile, index) => {
    const normalized = createPreferenceProfile(profile, fallbackPreferences, index);
    if (!normalized.id) {
      return;
    }
    if (!dedupe.has(normalized.id)) {
      dedupe.set(normalized.id, normalized);
    }
  });

  const normalizedProfiles = [...dedupe.values()].slice(0, MAX_PREFERENCE_PROFILES);
  if (normalizedProfiles.length > 0) {
    return normalizedProfiles;
  }

  return [
    createPreferenceProfile(
      {
        id: "primary",
        name: "Primary",
        preferences: fallbackPreferences,
        createdAt: now(),
        updatedAt: now()
      },
      fallbackPreferences,
      0
    )
  ];
}

function syncRootPreferencesFromActiveProfile(memory) {
  const profiles = Array.isArray(memory?.preferenceProfiles) ? memory.preferenceProfiles : [];
  const activeProfile = profiles.find((profile) => profile.id === memory?.activePreferenceProfileId) || profiles[0] || null;

  if (!activeProfile) {
    const defaultPreferences = getDefaultPreferences();
    memory.preferences = normalizePreferenceSet(memory?.preferences || {}, defaultPreferences);
    return null;
  }

  memory.activePreferenceProfileId = activeProfile.id;
  memory.preferences = normalizePreferenceSet(activeProfile.preferences, memory?.preferences || getDefaultPreferences());
  return activeProfile;
}

export function createEmptyProfileMemory(userId = "guest") {
  const defaultPreferences = getDefaultPreferences();
  const primaryProfile = createPreferenceProfile(
    {
      id: "primary",
      name: "Primary",
      preferences: defaultPreferences,
      createdAt: now(),
      updatedAt: now()
    },
    defaultPreferences,
    0
  );

  return {
    version: 1,
    userId: normalizeString(userId, "guest"),
    createdAt: now(),
    updatedAt: now(),
    preferences: normalizePreferenceSet(defaultPreferences, defaultPreferences),
    preferenceProfiles: [primaryProfile],
    activePreferenceProfileId: primaryProfile.id,
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
  const preferences = normalizePreferenceSet(raw.preferences || {}, base.preferences);
  const preferenceProfiles = normalizePreferenceProfiles(raw.preferenceProfiles || [], preferences);
  const requestedActiveProfileId = normalizeString(raw.activePreferenceProfileId, preferenceProfiles[0]?.id || "primary");
  const activePreferenceProfile = preferenceProfiles.find((profile) => profile.id === requestedActiveProfileId) || preferenceProfiles[0];
  const previousTrips = Array.isArray(raw.previousTrips) ? raw.previousTrips : [];

  const normalized = {
    ...base,
    ...raw,
    userId: normalizeString(raw.userId || userId, "guest"),
    updatedAt: Number(raw.updatedAt || now()),
    preferences,
    preferenceProfiles,
    activePreferenceProfileId: activePreferenceProfile.id,
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

  syncRootPreferencesFromActiveProfile(normalized);
  return normalized;
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

  if (!Array.isArray(memory.preferenceProfiles) || memory.preferenceProfiles.length === 0) {
    memory.preferenceProfiles = normalizePreferenceProfiles([], memory.preferences || getDefaultPreferences());
  }

  const activeProfileId = normalizeString(memory.activePreferenceProfileId, memory.preferenceProfiles[0]?.id || "primary");
  const activeProfileIndex = memory.preferenceProfiles.findIndex((profile) => profile.id === activeProfileId);
  if (activeProfileIndex >= 0) {
    const currentProfile = memory.preferenceProfiles[activeProfileIndex];
    memory.preferenceProfiles[activeProfileIndex] = {
      ...currentProfile,
      preferences: normalizePreferenceSet(memory.preferences, currentProfile.preferences || memory.preferences),
      updatedAt: now()
    };
    memory.activePreferenceProfileId = memory.preferenceProfiles[activeProfileIndex].id;
  }

  memory.counters.preferenceUpdates += 1;
  memory.updatedAt = now();

  return saveProfileMemory(memory);
}

export function saveNamedPreferenceProfile(userId = "guest", payload = {}) {
  const memory = loadProfileMemory(userId);
  const existingProfiles = Array.isArray(memory.preferenceProfiles) ? memory.preferenceProfiles : [];
  const currentProfile = existingProfiles.find((profile) => profile.id === payload.id);
  const fallbackPreferences = currentProfile?.preferences || memory.preferences || getDefaultPreferences();
  const normalizedProfile = createPreferenceProfile(
    {
      id: payload.id,
      name: payload.name,
      preferences: payload.preferences,
      createdAt: currentProfile?.createdAt || now(),
      updatedAt: now()
    },
    fallbackPreferences,
    existingProfiles.length
  );

  const nextProfiles = existingProfiles.filter((profile) => profile.id !== normalizedProfile.id);
  nextProfiles.unshift(normalizedProfile);
  memory.preferenceProfiles = normalizePreferenceProfiles(nextProfiles, memory.preferences || getDefaultPreferences());

  const activeId = normalizeString(payload.setActive ? normalizedProfile.id : memory.activePreferenceProfileId, normalizedProfile.id);
  memory.activePreferenceProfileId = memory.preferenceProfiles.some((profile) => profile.id === activeId)
    ? activeId
    : memory.preferenceProfiles[0].id;

  syncRootPreferencesFromActiveProfile(memory);
  memory.counters.preferenceUpdates += 1;
  memory.updatedAt = now();

  return saveProfileMemory(memory);
}

export function deleteNamedPreferenceProfile(userId = "guest", profileId = "") {
  const memory = loadProfileMemory(userId);
  const targetId = normalizeString(
    typeof profileId === "string" ? profileId : profileId?.id
  );
  if (!targetId) {
    return memory;
  }

  const existingProfiles = Array.isArray(memory.preferenceProfiles) ? memory.preferenceProfiles : [];
  const remaining = existingProfiles.filter((profile) => profile.id !== targetId);
  memory.preferenceProfiles = normalizePreferenceProfiles(remaining, memory.preferences || getDefaultPreferences());

  if (!memory.preferenceProfiles.some((profile) => profile.id === memory.activePreferenceProfileId)) {
    memory.activePreferenceProfileId = memory.preferenceProfiles[0].id;
  }

  syncRootPreferencesFromActiveProfile(memory);
  memory.counters.preferenceUpdates += 1;
  memory.updatedAt = now();
  return saveProfileMemory(memory);
}

export function setActivePreferenceProfile(userId = "guest", profileId = "") {
  const memory = loadProfileMemory(userId);
  const targetId = normalizeString(profileId);

  if (!targetId) {
    return memory;
  }

  if (!Array.isArray(memory.preferenceProfiles) || memory.preferenceProfiles.length === 0) {
    memory.preferenceProfiles = normalizePreferenceProfiles([], memory.preferences || getDefaultPreferences());
  }

  const found = memory.preferenceProfiles.find((profile) => profile.id === targetId);
  if (!found) {
    return memory;
  }

  memory.activePreferenceProfileId = found.id;
  syncRootPreferencesFromActiveProfile(memory);
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

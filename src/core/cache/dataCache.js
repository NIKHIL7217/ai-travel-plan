const CACHE_PREFIX = "ai_travel_cache_v1";
const inMemoryCache = new Map();
const inFlightResolvers = new Map();

export const CacheBuckets = {
  destination: "destination_cache",
  search: "search_cache",
  weather: "weather_cache",
  photo: "photo_cache",
  route: "route_cache",
  events: "events_cache"
};

function now() {
  return Date.now();
}

function buildStorageKey(bucket, key) {
  return `${CACHE_PREFIX}:${bucket}:${key}`;
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function readFromStorage(storageKey) {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  const entry = safeParse(raw);
  if (!entry) {
    localStorage.removeItem(storageKey);
    return null;
  }

  return entry;
}

function writeToStorage(storageKey, entry) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(entry));
}

export function getCachedValue(bucket, key) {
  const storageKey = buildStorageKey(bucket, key);

  const memoryEntry = inMemoryCache.get(storageKey);
  if (memoryEntry && memoryEntry.expiresAt > now()) {
    return memoryEntry.value;
  }

  const storageEntry = readFromStorage(storageKey);
  if (!storageEntry) {
    return null;
  }

  if (Number(storageEntry.expiresAt || 0) <= now()) {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(storageKey);
    }
    inMemoryCache.delete(storageKey);
    return null;
  }

  inMemoryCache.set(storageKey, storageEntry);
  return storageEntry.value;
}

export function setCachedValue(bucket, key, value, ttlMs) {
  const ttl = Math.max(1000, Number(ttlMs || 0));
  const entry = {
    value,
    expiresAt: now() + ttl
  };

  const storageKey = buildStorageKey(bucket, key);
  inMemoryCache.set(storageKey, entry);
  writeToStorage(storageKey, entry);
  return value;
}

export async function withCache(bucket, key, ttlMs, resolver) {
  const cached = getCachedValue(bucket, key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const storageKey = buildStorageKey(bucket, key);
  if (inFlightResolvers.has(storageKey)) {
    return inFlightResolvers.get(storageKey);
  }

  const resolvePromise = (async () => {
    const resolved = await resolver();
    if (resolved !== null && resolved !== undefined) {
      setCachedValue(bucket, key, resolved, ttlMs);
    }

    return resolved;
  })();

  inFlightResolvers.set(storageKey, resolvePromise);

  try {
    return await resolvePromise;
  } finally {
    inFlightResolvers.delete(storageKey);
  }
}

const STORAGE_PREFIX = "roam_command_center_v1_";
const MAX_HISTORY = 24;
const MAX_SAVED = 24;

function now() {
  return Date.now();
}

function toId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePrompt(text) {
  return String(text || "").trim();
}

function base(userId = "guest") {
  return {
    userId: String(userId || "guest"),
    promptHistory: [],
    savedPrompts: [],
    updatedAt: now()
  };
}

function key(userId = "guest") {
  return `${STORAGE_PREFIX}${String(userId || "guest")}`;
}

function normalizeEntry(entry) {
  const prompt = normalizePrompt(entry?.prompt);
  if (!prompt) {
    return null;
  }

  return {
    id: String(entry?.id || toId()),
    prompt,
    destination: String(entry?.destination || ""),
    createdAt: Number(entry?.createdAt || now())
  };
}

function normalize(data, userId = "guest") {
  const fallback = base(userId);
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const history = Array.isArray(data.promptHistory) ? data.promptHistory : [];
  const saved = Array.isArray(data.savedPrompts) ? data.savedPrompts : [];

  return {
    userId: String(data.userId || userId || "guest"),
    promptHistory: history.map(normalizeEntry).filter(Boolean).slice(0, MAX_HISTORY),
    savedPrompts: saved.map(normalizeEntry).filter(Boolean).slice(0, MAX_SAVED),
    updatedAt: Number(data.updatedAt || now())
  };
}

export function loadPromptMemory(userId = "guest") {
  if (typeof localStorage === "undefined") {
    return base(userId);
  }

  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) {
      return base(userId);
    }

    return normalize(JSON.parse(raw), userId);
  } catch (_error) {
    return base(userId);
  }
}

export function savePromptMemory(userId = "guest", memory = {}) {
  const normalized = normalize(memory, userId);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key(userId), JSON.stringify(normalized));
  }

  return normalized;
}

function upsertUnique(list, entry, limit) {
  const promptKey = entry.prompt.toLowerCase();
  const filtered = list.filter((item) => item.prompt.toLowerCase() !== promptKey);
  return [entry, ...filtered].slice(0, limit);
}

export function addPromptToHistory(userId = "guest", payload = {}) {
  const prompt = normalizePrompt(payload.prompt);
  if (!prompt) {
    return loadPromptMemory(userId);
  }

  const memory = loadPromptMemory(userId);
  const entry = normalizeEntry({
    prompt,
    destination: payload.destination,
    createdAt: now()
  });

  memory.promptHistory = upsertUnique(memory.promptHistory, entry, MAX_HISTORY);
  memory.updatedAt = now();

  return savePromptMemory(userId, memory);
}

export function addSavedPrompt(userId = "guest", payload = {}) {
  const prompt = normalizePrompt(payload.prompt);
  if (!prompt) {
    return loadPromptMemory(userId);
  }

  const memory = loadPromptMemory(userId);
  const entry = normalizeEntry({
    prompt,
    destination: payload.destination,
    createdAt: now()
  });

  memory.savedPrompts = upsertUnique(memory.savedPrompts, entry, MAX_SAVED);
  memory.updatedAt = now();

  return savePromptMemory(userId, memory);
}

export function removeSavedPrompt(userId = "guest", promptId = "") {
  const memory = loadPromptMemory(userId);
  memory.savedPrompts = memory.savedPrompts.filter((item) => item.id !== promptId);
  memory.updatedAt = now();
  return savePromptMemory(userId, memory);
}

export function clearPromptHistory(userId = "guest") {
  const memory = loadPromptMemory(userId);
  memory.promptHistory = [];
  memory.updatedAt = now();
  return savePromptMemory(userId, memory);
}

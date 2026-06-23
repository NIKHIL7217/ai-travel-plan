import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { useNetworkStatus } from "../core/monitoring/network";

const STORAGE_PREFIX = "travel_os_offline_queue_";
const STORAGE_PACK_PREFIX = "travel_os_offline_packs_";

function readQueue(storageKey) {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function normalizeDraft(input = {}) {
  return {
    id: String(input.id || `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    source: String(input.source || "planner").trim() || "planner",
    destination: String(input.destination || "").trim(),
    days: Number(input.days || 0),
    travelMode: String(input.travelMode || "Car").trim() || "Car",
    budgetTotal: Number(input.budgetTotal || 0),
    status: String(input.status || "pending").trim() || "pending",
    createdAt: Number(input.createdAt || Date.now()),
    updatedAt: Number(input.updatedAt || Date.now()),
    payload: input.payload || null
  };
}

function readPacks(storageKey) {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function normalizePack(input = {}) {
  return {
    id: String(input.id || `pack_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    type: String(input.type || "itinerary").trim() || "itinerary",
    title: String(input.title || "Offline Pack").trim() || "Offline Pack",
    source: String(input.source || "manual").trim() || "manual",
    payload: input.payload || null,
    createdAt: Number(input.createdAt || Date.now()),
    updatedAt: Number(input.updatedAt || Date.now())
  };
}

export const useOfflineStore = defineStore("offline", () => {
  const userId = ref("guest");
  const drafts = ref([]);
  const packs = ref([]);
  const syncState = ref("idle");
  const lastSyncedAt = ref(0);

  const { isOnline } = useNetworkStatus();

  const storageKey = computed(() => `${STORAGE_PREFIX}${userId.value || "guest"}`);
  const packStorageKey = computed(() => `${STORAGE_PACK_PREFIX}${userId.value || "guest"}`);
  const pendingDrafts = computed(() => drafts.value.filter((draft) => draft.status !== "synced"));
  const pendingCount = computed(() => pendingDrafts.value.length);
  const itineraryPackCount = computed(() => packs.value.filter((pack) => pack.type === "itinerary").length);
  const mapsPackCount = computed(() => packs.value.filter((pack) => pack.type === "maps").length);
  const hotelsPackCount = computed(() => packs.value.filter((pack) => pack.type === "hotels").length);
  const emergencyPackCount = computed(() => packs.value.filter((pack) => pack.type === "emergency").length);
  const documentsPackCount = computed(() => packs.value.filter((pack) => pack.type === "documents").length);

  function persistDrafts() {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.setItem(storageKey.value, JSON.stringify(drafts.value));
    } catch (_error) {
      // Non-blocking persistence path.
    }
  }

  function persistPacks() {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.setItem(packStorageKey.value, JSON.stringify(packs.value));
    } catch (_error) {
      // Non-blocking persistence path.
    }
  }

  function initForUser(nextUserId = "guest") {
    userId.value = String(nextUserId || "guest").trim() || "guest";
    drafts.value = readQueue(storageKey.value).map((item) => normalizeDraft(item));
    packs.value = readPacks(packStorageKey.value).map((item) => normalizePack(item));
    syncState.value = isOnline.value ? "online" : "offline";
  }

  function queueDraft(input = {}) {
    const draft = normalizeDraft({
      ...input,
      status: isOnline.value ? "queued" : "offline",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    drafts.value = [draft, ...drafts.value].slice(0, 100);
    persistDrafts();

    return draft;
  }

  function queueOfflinePack(input = {}) {
    const pack = normalizePack({
      ...input,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    packs.value = [pack, ...packs.value].slice(0, 300);
    persistPacks();
    return pack;
  }

  function removeDraft(draftId) {
    drafts.value = drafts.value.filter((draft) => draft.id !== draftId);
    persistDrafts();
  }

  function removeOfflinePack(packId) {
    packs.value = packs.value.filter((pack) => pack.id !== packId);
    persistPacks();
  }

  function markDraftSynced(draftId) {
    drafts.value = drafts.value.map((draft) => {
      if (draft.id !== draftId) {
        return draft;
      }

      return {
        ...draft,
        status: "synced",
        updatedAt: Date.now()
      };
    });
    lastSyncedAt.value = Date.now();
    persistDrafts();
  }

  function clearDrafts() {
    drafts.value = [];
    persistDrafts();
  }

  function clearOfflinePacks() {
    packs.value = [];
    persistPacks();
  }

  async function flushDrafts(saveHandler) {
    if (!isOnline.value || typeof saveHandler !== "function") {
      return {
        synced: 0,
        failed: pendingCount.value
      };
    }

    syncState.value = "syncing";

    let synced = 0;
    let failed = 0;

    for (const draft of pendingDrafts.value) {
      try {
        await saveHandler(draft.payload, draft);
        markDraftSynced(draft.id);
        synced += 1;
      } catch (_error) {
        failed += 1;
      }
    }

    syncState.value = "online";

    return {
      synced,
      failed
    };
  }

  watch(
    () => isOnline.value,
    (online) => {
      syncState.value = online ? "online" : "offline";
    }
  );

  initForUser("guest");

  return {
    userId,
    drafts,
    packs,
    isOnline,
    syncState,
    lastSyncedAt,
    pendingDrafts,
    pendingCount,
    itineraryPackCount,
    mapsPackCount,
    hotelsPackCount,
    emergencyPackCount,
    documentsPackCount,
    initForUser,
    queueDraft,
    queueOfflinePack,
    removeDraft,
    removeOfflinePack,
    markDraftSynced,
    clearDrafts,
    clearOfflinePacks,
    flushDrafts
  };
});

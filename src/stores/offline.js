import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { useNetworkStatus } from "../core/monitoring/network";

const STORAGE_PREFIX = "travel_os_offline_queue_";

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

export const useOfflineStore = defineStore("offline", () => {
  const userId = ref("guest");
  const drafts = ref([]);
  const syncState = ref("idle");
  const lastSyncedAt = ref(0);

  const { isOnline } = useNetworkStatus();

  const storageKey = computed(() => `${STORAGE_PREFIX}${userId.value || "guest"}`);
  const pendingDrafts = computed(() => drafts.value.filter((draft) => draft.status !== "synced"));
  const pendingCount = computed(() => pendingDrafts.value.length);

  function persist() {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.setItem(storageKey.value, JSON.stringify(drafts.value));
    } catch (_error) {
      // Non-blocking persistence path.
    }
  }

  function initForUser(nextUserId = "guest") {
    userId.value = String(nextUserId || "guest").trim() || "guest";
    drafts.value = readQueue(storageKey.value).map((item) => normalizeDraft(item));
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
    persist();

    return draft;
  }

  function removeDraft(draftId) {
    drafts.value = drafts.value.filter((draft) => draft.id !== draftId);
    persist();
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
    persist();
  }

  function clearDrafts() {
    drafts.value = [];
    persist();
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
    isOnline,
    syncState,
    lastSyncedAt,
    pendingDrafts,
    pendingCount,
    initForUser,
    queueDraft,
    removeDraft,
    markDraftSynced,
    clearDrafts,
    flushDrafts
  };
});

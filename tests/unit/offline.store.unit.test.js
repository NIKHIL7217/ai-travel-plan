import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useOfflineStore } from "../../src/stores/offline";

function resetOfflineStorage() {
  if (typeof localStorage?.removeItem !== "function") {
    return;
  }

  localStorage.removeItem("travel_os_offline_queue_guest");
  localStorage.removeItem("travel_os_offline_queue_tester");
  localStorage.removeItem("travel_os_offline_packs_guest");
  localStorage.removeItem("travel_os_offline_packs_tester");
}

describe("offline store", () => {
  beforeEach(() => {
    resetOfflineStorage();
    setActivePinia(createPinia());
  });

  it("queues drafts and tracks pending count", () => {
    const store = useOfflineStore();
    store.initForUser("tester");

    store.queueDraft({
      source: "planner",
      destination: "Goa",
      days: 5,
      travelMode: "Car",
      budgetTotal: 1200,
      payload: { destination: "Goa" }
    });

    expect(store.pendingCount).toBe(1);
    expect(store.pendingDrafts[0].destination).toBe("Goa");
  });

  it("flushes pending drafts when online", async () => {
    const store = useOfflineStore();
    store.initForUser("tester");

    store.queueDraft({ source: "planner", destination: "Goa", payload: { destination: "Goa" } });
    store.queueDraft({ source: "roadtrip", destination: "Manali", payload: { destination: "Manali" } });

    const saved = [];
    const result = await store.flushDrafts(async (payload) => {
      saved.push(payload.destination);
    });

    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);
    expect(saved).toEqual(["Manali", "Goa"]);
    expect(store.pendingCount).toBe(0);
  });

  it("queues offline packs and tracks type counters", () => {
    const store = useOfflineStore();
    store.initForUser("tester");

    store.queueOfflinePack({
      type: "itinerary",
      title: "Goa itinerary",
      source: "planner",
      payload: { destination: "Goa" }
    });

    store.queueOfflinePack({
      type: "maps",
      title: "Goa maps",
      source: "planner",
      payload: { destination: "Goa" }
    });

    store.queueOfflinePack({
      type: "documents",
      title: "Goa docs",
      source: "documents",
      payload: { count: 2 }
    });

    expect(store.packs.length).toBe(3);
    expect(store.itineraryPackCount).toBe(1);
    expect(store.mapsPackCount).toBe(1);
    expect(store.documentsPackCount).toBe(1);
  });
});

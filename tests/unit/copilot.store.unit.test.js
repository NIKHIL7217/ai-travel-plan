import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCopilotStore } from "../../src/stores/copilot";
import { useOfflineStore } from "../../src/stores/offline";
import { usePlannerSessionStore } from "../../src/stores/plannerSession";

function resetCopilotStorage() {
  if (typeof localStorage?.removeItem !== "function") {
    return;
  }

  localStorage.removeItem("travel_os_copilot_session_v1");
  localStorage.removeItem("travel_os_planner_session_v1");
  localStorage.removeItem("travel_os_offline_queue_guest");
  localStorage.removeItem("travel_os_offline_queue_tester");
}

describe("copilot store", () => {
  beforeEach(() => {
    resetCopilotStorage();
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("answers budget query with planner context", async () => {
    const plannerSession = usePlannerSessionStore();
    plannerSession.setActiveContext({
      destination: "Goa",
      days: 5,
      budgetTotal: 1500,
      travelMode: "Car"
    });

    const offline = useOfflineStore();
    offline.initForUser("tester");

    const copilot = useCopilotStore();
    const sendPromise = copilot.sendMessage("budget update");

    await vi.runAllTimersAsync();
    await sendPromise;

    const lastMessage = copilot.messages[copilot.messages.length - 1];
    expect(lastMessage.role).toBe("assistant");
    expect(lastMessage.text.toLowerCase()).toContain("1500");
  });

  it("reports pending offline drafts in sync query", async () => {
    const offline = useOfflineStore();
    offline.initForUser("tester");
    offline.queueDraft({
      source: "planner",
      destination: "Manali",
      payload: { destination: "Manali" }
    });

    const copilot = useCopilotStore();
    const sendPromise = copilot.sendMessage("offline sync status");

    await vi.runAllTimersAsync();
    await sendPromise;

    const lastMessage = copilot.messages[copilot.messages.length - 1];
    expect(lastMessage.role).toBe("assistant");
    expect(lastMessage.text.toLowerCase()).toContain("1");
  });
});

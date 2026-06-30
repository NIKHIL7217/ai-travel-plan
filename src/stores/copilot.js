import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useOfflineStore } from "./offline";
import { usePlannerSessionStore } from "./plannerSession";
import { isChatConfigured, streamTravelChat } from "../services/ai/chat.service";

const STORAGE_KEY = "travel_os_copilot_session_v1";

function createMessage(role, text) {
  return {
    id: `${role}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    role,
    text: String(text || "").trim(),
    createdAt: Date.now()
  };
}

function defaultWelcome() {
  return createMessage(
    "assistant",
    "Hey! Main aapka Travel Copilot hoon. Mujhe kuch bhi pucho - trip plan karna, budget kam karna, din extend karna, safety, food, ya packing. Bas type karke batao, main real-time help karunga."
  );
}

function parseSession() {
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

function summarizeRoute(scope, plannerContext) {
  const routeName = String(scope.routeName || "Unknown").trim();
  const destination = String(plannerContext?.destination || "").trim();

  if (destination) {
    return `${routeName} context active with destination ${destination}.`;
  }

  return `${routeName} context active. Share destination to unlock deeper suggestions.`;
}

function buildReply(promptText, scope, plannerContext, offlineStore) {
  const query = String(promptText || "").toLowerCase();
  const destination = String(plannerContext?.destination || "your destination").trim();
  const budgetTotal = Number(plannerContext?.budgetTotal || 0);
  const days = Number(plannerContext?.days || 0);
  const mode = String(plannerContext?.travelMode || "Car").trim();

  if (query.includes("offline") || query.includes("sync") || query.includes("draft")) {
    const pending = Number(offlineStore.pendingCount || 0);
    if (offlineStore.isOnline) {
      return `You are online. Pending offline drafts: ${pending}. Use sync action to push them to cloud storage when needed.`;
    }
    return `Offline mode active. Drafts queue size: ${pending}. Save important plans as offline draft; they will sync once network returns.`;
  }

  if (query.includes("budget") || query.includes("cost") || query.includes("money")) {
    if (budgetTotal > 0) {
      return `Current projected budget for ${destination} is ${budgetTotal} USD across ${Math.max(days, 1)} days. I can also suggest cost-cut and premium swap options.`;
    }
    return "Budget context अभी empty hai. Generate ya open a trip first, then I will break down spend by category.";
  }

  if (query.includes("tonight") || query.includes("evening") || query.includes("today")) {
    if (plannerContext?.itineraryPreview?.length) {
      const tonight = plannerContext.itineraryPreview[0];
      return `Tonight suggestion for ${destination}: ${tonight}. Keep commute buffer 20 to 30 minutes for smoother flow.`;
    }
    return "Tonight planning ke liye active itinerary summary नहीं मिला. Planner me ek trip generate karo, then ask again.";
  }

  if (query.includes("safety") || query.includes("scam") || query.includes("risk")) {
    return `Safety brief for ${destination}: stay in well-lit routes, pre-book transport when possible, and keep digital copies of docs in Document Vault.`;
  }

  if (query.includes("food") || query.includes("eat") || query.includes("restaurant")) {
    return `Food strategy for ${destination}: lunch near major attractions, dinner reservations off-peak, and one local specialty trail to avoid generic tourist menus.`;
  }

  if (query.includes("route") || query.includes("roadtrip") || query.includes("drive")) {
    return `Route mode currently tuned for ${mode}. For roadtrips, add fuel and rest-stop windows every 2 to 3 hours and keep one weather fallback segment.`;
  }

  return `${summarizeRoute(scope, plannerContext)} Ask targeted prompts like 'budget left', 'tonight plan', 'safety', or 'offline sync'.`;
}

export const useCopilotStore = defineStore("copilot", () => {
  const isPanelOpen = ref(false);
  const isTyping = ref(false);
  const scope = ref({
    routeName: "Home",
    routePath: "/",
    updatedAt: Date.now()
  });
  const messages = ref([defaultWelcome()]);

  const plannerSessionStore = usePlannerSessionStore();
  const offlineStore = useOfflineStore();
  const isLiveAi = isChatConfigured();
  let activeAbort = null;

  function buildChatContext() {
    const planner = plannerSessionStore.activeContext || {};
    return {
      routeName: scope.value.routeName,
      destination: planner.destination,
      origin: planner.origin,
      days: planner.days,
      travelers: planner.travelers,
      budgetTotal: planner.budgetTotal,
      travelMode: planner.travelMode,
      isOnline: offlineStore.isOnline,
      pendingDrafts: offlineStore.pendingCount,
      itineraryPreview: Array.isArray(planner.itineraryPreview) ? planner.itineraryPreview : [],
      memoryContext: planner.memoryContext
    };
  }

  function persist() {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          scope: scope.value,
          messages: messages.value.slice(-40)
        })
      );
    } catch (_error) {
      // Persistence failure should not block interaction.
    }
  }

  function hydrate() {
    const parsed = parseSession();
    if (!parsed) {
      return;
    }

    if (parsed.scope && typeof parsed.scope === "object") {
      scope.value = {
        ...scope.value,
        ...parsed.scope
      };
    }

    if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
      messages.value = parsed.messages
        .map((item) => createMessage(item.role || "assistant", item.text || ""))
        .slice(-40);
    }
  }

  const quickActions = computed(() => {
    const destination = String(plannerSessionStore.activeContext?.destination || "this trip").trim() || "this trip";

    return [
      { id: "plan", label: "Plan a Trip", prompt: `Plan a great 3 day trip to ${destination}` },
      { id: "cheaper", label: "Make it Cheaper", prompt: `Make my ${destination} plan cheaper without killing the fun` },
      { id: "tonight", label: "Tonight Plan", prompt: `Suggest tonight plan in ${destination}` },
      { id: "safety", label: "Safety Cues", prompt: `Any safety or scam alerts for ${destination}?` },
      { id: "food", label: "Food Route", prompt: `Best local food to try in ${destination}?` }
    ];
  });

  function togglePanel() {
    isPanelOpen.value = !isPanelOpen.value;
  }

  function openPanel() {
    isPanelOpen.value = true;
  }

  function closePanel() {
    isPanelOpen.value = false;
  }

  function setScope(nextScope = {}) {
    scope.value = {
      ...scope.value,
      ...(nextScope || {}),
      updatedAt: Date.now()
    };
    persist();
  }

  function replaceMessageText(messageId, nextText) {
    messages.value = messages.value.map((message) =>
      message.id === messageId ? { ...message, text: nextText } : message
    );
  }

  async function sendMessage(text) {
    const query = String(text || "").trim();
    if (!query) {
      return;
    }

    messages.value = [...messages.value, createMessage("user", query)].slice(-40);
    isTyping.value = true;

    if (isLiveAi) {
      if (activeAbort) {
        activeAbort.abort();
      }
      activeAbort = new AbortController();

      const assistantMessage = createMessage("assistant", "");
      messages.value = [...messages.value, assistantMessage].slice(-40);

      const history = messages.value
        .filter((message) => message.id !== assistantMessage.id)
        .map((message) => ({ role: message.role, text: message.text }));

      try {
        const reply = await streamTravelChat({
          messages: history,
          context: buildChatContext(),
          signal: activeAbort.signal,
          onToken: (_chunk, fullText) => {
            replaceMessageText(assistantMessage.id, fullText);
          }
        });

        const finalText = String(reply || "").trim();
        if (finalText) {
          replaceMessageText(assistantMessage.id, finalText);
        } else {
          replaceMessageText(
            assistantMessage.id,
            buildReply(query, scope.value, plannerSessionStore.activeContext, offlineStore)
          );
        }
      } catch (_error) {
        replaceMessageText(
          assistantMessage.id,
          buildReply(query, scope.value, plannerSessionStore.activeContext, offlineStore)
        );
      } finally {
        activeAbort = null;
        isTyping.value = false;
        persist();
      }
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 420));

    const reply = buildReply(query, scope.value, plannerSessionStore.activeContext, offlineStore);
    messages.value = [...messages.value, createMessage("assistant", reply)].slice(-40);
    isTyping.value = false;

    persist();
  }

  function clearHistory() {
    messages.value = [defaultWelcome()];
    persist();
  }

  hydrate();

  return {
    isPanelOpen,
    isTyping,
    isLiveAi,
    scope,
    messages,
    quickActions,
    togglePanel,
    openPanel,
    closePanel,
    setScope,
    sendMessage,
    clearHistory
  };
});

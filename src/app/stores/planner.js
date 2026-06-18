import { defineStore } from "pinia";
import { ref } from "vue";
import { generateRoadtripPlan } from "../services/gemini";
import { useBudgetStore } from "./budget";

export const usePlannerStore = defineStore("planner", () => {
  const activeTrip = ref(null);
  const loading = ref(false);
  const loadingStatusText = ref("Idle");
  const promptQuery = ref("");
  const travelersCount = ref(2);
  const stylePreference = ref("Adventure");
  const durationDays = ref(7);

  // Suggested Prompts for Command Center
  const suggestedPrompts = [
    "Plan a 7-day Himachal roadtrip starting from Delhi",
    "5-day Mumbai to Goa coastal roadtrip",
    "10-day Leh Ladakh adventure loop",
    "4-day Bangalore to Ooty hill climb"
  ];

  const loadingMessages = [
    "Initializing RoamAI Copilot...",
    "Querying local terrain and pass reports...",
    "Optimizing GPS route coordinates...",
    "Locating EV charging and fuel stations...",
    "Calculating tolls and highway taxes...",
    "Fetching microclimate weather overlays...",
    "Structuring smart day-by-day dashboard..."
  ];

  const setPrompt = (text) => {
    promptQuery.value = text;
  };

  const executePlan = async (customPrompt) => {
    const promptToUse = customPrompt || promptQuery.value;
    if (!promptToUse) return;

    loading.value = true;
    activeTrip.value = null;
    
    // Cycle through loading status messages
    let msgIndex = 0;
    loadingStatusText.value = loadingMessages[0];
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      loadingStatusText.value = loadingMessages[msgIndex];
    }, 450);

    try {
      const plan = await generateRoadtripPlan(
        promptToUse,
        travelersCount.value,
        stylePreference.value,
        durationDays.value
      );
      
      activeTrip.value = plan;
      
      // Sync budget store
      const budgetStore = useBudgetStore();
      budgetStore.syncCosts(plan.baseCosts, plan.durationDays, travelersCount.value);
    } catch (e) {
      console.error("Failed to generate plan:", e);
    } finally {
      clearInterval(msgInterval);
      loading.value = false;
      loadingStatusText.value = "Complete";
    }
  };

  const resetPlanner = () => {
    activeTrip.value = null;
    promptQuery.value = "";
  };

  return {
    activeTrip,
    loading,
    loadingStatusText,
    promptQuery,
    travelersCount,
    stylePreference,
    durationDays,
    suggestedPrompts,
    setPrompt,
    executePlan,
    resetPlanner
  };
});

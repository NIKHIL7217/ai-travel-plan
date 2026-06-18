import { defineStore } from "pinia";
import { ref } from "vue";
import { usePlannerStore } from "./planner";

export const useAssistantStore = defineStore("assistant", () => {
  const isPanelOpen = ref(false);
  const isTyping = ref(false);
  
  const messages = ref([
    {
      id: 1,
      sender: "copilot",
      text: "Affirmative. RoamAI Copilot connected. Where are we steering our coordinates next?",
      timestamp: new Date()
    }
  ]);

  const togglePanel = () => {
    isPanelOpen.value = !isPanelOpen.value;
  };

  const openPanel = () => {
    isPanelOpen.value = true;
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // Append User message
    messages.value.push({
      id: Date.now(),
      sender: "user",
      text: text,
      timestamp: new Date()
    });

    isTyping.value = true;

    // Simulate thinking lag
    await new Promise(resolve => setTimeout(resolve, 1200));

    const plannerStore = usePlannerStore();
    const trip = plannerStore.activeTrip;
    
    let reply = "";

    // Simple context-aware responses
    if (trip) {
      const textLower = text.toLowerCase();
      if (textLower.includes("weather") || textLower.includes("rain") || textLower.includes("cold")) {
        reply = `Analyzing weather overlays for the ${trip.destination} route: Current outlook is: ${trip.weather.general}. Be aware of the warning: "${trip.weather.hazardWarning}". I suggest driving within: ${trip.weather.bestTravelWindow}.`;
      } else if (textLower.includes("stop") || textLower.includes("charger") || textLower.includes("fuel")) {
        const stopsList = trip.stops.map(s => s.name).join(", ");
        reply = `Affirmative. I've optimized stops along the highway. Key points include: ${stopsList}. Most points offer EV fast chargers and fuel stations.`;
      } else if (textLower.includes("budget") || textLower.includes("cost") || textLower.includes("money")) {
        reply = `Current telemetry indicates a total estimate of $${trip.budgetBreakdown.total} USD for this roadtrip. This covers fuel ($${trip.budgetBreakdown.fuel}), lodging ($${trip.budgetBreakdown.hotels}), and toll taxes ($${trip.budgetBreakdown.tolls}). We can fine-tune this in the budget forecaster.`;
      } else {
        reply = `Roger that. Regarding your route to ${trip.destination}, I've cataloged "${text}". I will monitor safety parameters, EV ranges, and toll gates as we drive. Let me know if you want me to adjust stops or suggest local culinary spots.`;
      }
    } else {
      reply = "No active roadtrip found in workspace. Enter a prompt in the central Command Center (e.g., 'Plan a 7-day Himachal roadtrip') and I will assemble the route and telemetry modules instantly.";
    }

    messages.value.push({
      id: Date.now() + 1,
      sender: "copilot",
      text: reply,
      timestamp: new Date()
    });

    isTyping.value = false;
  };

  const clearHistory = () => {
    messages.value = [
      {
        id: Date.now(),
        sender: "copilot",
        text: "System cache cleared. Core copilot telemetry online.",
        timestamp: new Date()
      }
    ];
  };

  return {
    isPanelOpen,
    isTyping,
    messages,
    togglePanel,
    openPanel,
    sendMessage,
    clearHistory
  };
});

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { extractTripIntent, generateTravelPlan, generateBudgetEstimate, isGeminiConfigured } from "../services/gemini";
import { getSavedTripsFromDb, saveTripToDb } from "../services/firebase";
import { formatPrice } from "../services/currency";
import { createLoadingState } from "../core/monitoring/loading";
import { getFriendlyErrorMessage } from "../core/errors";
import {
  computeMemoryScores,
  createPersonalizationPlan,
  loadProfileMemory,
  recordGeneratedTrip,
  recordSavedTrip,
  saveEditablePreferences
} from "../modules/profile-memory";
import {
  addPromptToHistory,
  addSavedPrompt,
  clearPromptHistory,
  loadPromptMemory,
  removeSavedPrompt
} from "../modules/command-center/prompt-memory";
import { generateRoadtripEngine, isRoadtripMode } from "../modules/roadtrip";
import GlassPanel from "../shared/ui/GlassPanel.vue";
import CommandComposer from "../features/command-center/CommandComposer.vue";
import ControlMatrix from "../features/command-center/ControlMatrix.vue";
import SuggestedActions from "../features/command-center/SuggestedActions.vue";
import QuickTemplates from "../features/command-center/QuickTemplates.vue";
import PromptCollection from "../features/command-center/PromptCollection.vue";
import RecentTripsPanel from "../features/command-center/RecentTripsPanel.vue";
import RoadtripIntelligencePanel from "../features/roadtrip/RoadtripIntelligencePanel.vue";
import PlanComparisonView from "../features/planner/PlanComparisonView.vue";
import { createPlanProfiles, rankItineraryOptions } from "../modules/planner-options";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const liveAiReady = isGeminiConfigured();
const generationLoading = createLoadingState(false);

const loading = generationLoading.isLoading;
const plannerError = ref("");
const roadtripWarning = ref("");
const saveStatus = ref(false);
const lastGenerationAt = ref(0);
const lastGenerationPayload = ref(null);
const intentAutoNote = ref("");
const intentFiltersNote = ref("");
const intentParsing = ref(false);
const fastMode = ref(true);
const enhancingOptions = ref(false);
const showEnhancementBlocks = ref(false);
const showSidebarBlocks = ref(false);
const showRoadtripBlock = ref(false);
let activeGenerationRunId = 0;
let promptIntentTimer = null;
let promptIntentRunId = 0;
const deferredUiTimers = [];

const promptInput = ref("");
const controls = ref({
  origin: "Current Location",
  destination: "",
  days: 5,
  travelers: 2,
  style: "Comfort",
  maxBudget: 1500,
  travelMode: "Car",
  stayPreference: "mid-range",
  foodPreference: "mixed"
});

const activeItinerary = ref(null);
const activeBudget = ref(null);
const activeRoadtrip = ref(null);
const roadtripLoading = ref(false);
const expandedDay = ref(1);
const generatedPlanOptions = ref([]);
const selectedPlanId = ref("");
const roadtripByPlanId = ref({});

const profileMemory = ref(null);
const memoryScores = ref({ overall: 0, confidenceBand: "Low", breakdown: {} });
const memoryNote = ref("");

const promptHistory = ref([]);
const savedPrompts = ref([]);
const recentTrips = ref([]);

const currentUserId = computed(() => authStore.user?.uid || "guest");
const selectedPlan = computed(() =>
  generatedPlanOptions.value.find((option) => option.id === selectedPlanId.value) || generatedPlanOptions.value[0] || null
);
const hasResults = computed(() => Boolean(activeItinerary.value && activeBudget.value));
const canSavePlan = computed(() => Boolean(selectedPlan.value?.itinerary && selectedPlan.value?.budget));
const canGenerate = computed(() => {
  if (loading.value || !liveAiReady) {
    return false;
  }

  const prompt = String(promptInput.value || "").trim();
  const destination = String(controls.value.destination || "").trim();
  return Boolean(prompt || destination);
});

const suggestedActions = [
  {
    id: "budget-tight",
    label: "Optimize for budget",
    text: "Keep the plan budget-tight while preserving must-visit highlights."
  },
  {
    id: "family-safe",
    label: "Family-safe plan",
    text: "Make it family friendly with low fatigue transitions and safe evening options."
  },
  {
    id: "food-focused",
    label: "Food-focused route",
    text: "Prioritize iconic local food spots and hidden cafe recommendations."
  },
  {
    id: "rain-proof",
    label: "Rain backup plan",
    text: "Include indoor backup activities in case of weather disruption."
  },
  {
    id: "photo-loop",
    label: "Photography itinerary",
    text: "Design each day around sunrise and sunset photography windows."
  },
  {
    id: "weekend-mode",
    label: "Weekend sprint",
    text: "Compress into a high-impact short trip with minimal transit waste."
  }
];

const quickTemplates = [
  {
    id: "template-coast",
    title: "Coastal Escape",
    subtitle: "5 days | Comfort | Mixed food",
    prompt: "Design a 5-day coastal escape with beach sunsets, local seafood, and one luxury stay night.",
    controls: {
      days: 5,
      style: "Comfort",
      travelMode: "Flight",
      foodPreference: "mixed",
      stayPreference: "mid-range"
    }
  },
  {
    id: "template-mountain",
    title: "Mountain Loop",
    subtitle: "6 days | Adventure | Local food",
    prompt: "Plan a 6-day mountain loop with scenic drives, trekking, and atmospheric local cafes.",
    controls: {
      days: 6,
      style: "Adventure",
      travelMode: "Car",
      foodPreference: "local",
      stayPreference: "budget"
    }
  },
  {
    id: "template-luxury",
    title: "Luxury City Break",
    subtitle: "4 days | Luxury | Fine dining",
    prompt: "Create a premium city break with curated luxury stays, nightlife, and fine dining experiences.",
    controls: {
      days: 4,
      style: "Luxury",
      travelMode: "Flight",
      foodPreference: "fine-dining",
      stayPreference: "luxury"
    }
  },
  {
    id: "template-backpack",
    title: "Backpacker Sprint",
    subtitle: "7 days | Budget | Street food",
    prompt: "Build a backpacker-friendly route with hostels, public transit, and authentic street food picks.",
    controls: {
      days: 7,
      style: "Budget",
      travelMode: "Train",
      foodPreference: "street",
      stayPreference: "hostel"
    }
  }
];

function updateControls(nextControls) {
  controls.value = {
    ...controls.value,
    ...(nextControls || {})
  };
}

function setFastMode(nextValue) {
  fastMode.value = Boolean(nextValue);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("planner_fast_mode", fastMode.value ? "true" : "false");
  }
}

function normalizeControlsValue(rawControls = {}) {
  const rawDays = Number(rawControls.days);
  const rawTravelers = Number(rawControls.travelers);
  const rawBudget = Number(rawControls.maxBudget);

  const days = Number.isFinite(rawDays) ? Math.max(2, Math.min(15, Math.round(rawDays))) : 5;
  const travelers = Number.isFinite(rawTravelers) ? Math.max(1, Math.min(8, Math.round(rawTravelers))) : 2;
  const maxBudget = Number.isFinite(rawBudget) ? Math.max(200, Math.min(100000, Math.round(rawBudget))) : 1500;

  const destination = String(rawControls.destination || "").trim();
  const originRaw = String(rawControls.origin || "").trim();
  const origin = originRaw || "Current Location";

  return {
    ...rawControls,
    origin,
    destination,
    days,
    travelers,
    maxBudget,
    style: String(rawControls.style || "Comfort"),
    travelMode: String(rawControls.travelMode || "Car"),
    stayPreference: String(rawControls.stayPreference || "mid-range"),
    foodPreference: String(rawControls.foodPreference || "mixed")
  };
}

function getValidationErrorMessage(sourcePrompt, effectiveInput) {
  if (!liveAiReady) {
    return "Live AI disabled hai. .env me VITE_GEMINI_API_KEY add karo.";
  }

  if (!sourcePrompt && !String(effectiveInput.destination || "").trim()) {
    return "Prompt ya destination enter karo.";
  }

  if (!Number.isFinite(Number(effectiveInput.days)) || Number(effectiveInput.days) < 2) {
    return "Trip days kam se kam 2 hone chahiye.";
  }

  if (!Number.isFinite(Number(effectiveInput.travelers)) || Number(effectiveInput.travelers) < 1) {
    return "Travelers count kam se kam 1 hona chahiye.";
  }

  if (!Number.isFinite(Number(effectiveInput.maxBudget)) || Number(effectiveInput.maxBudget) < 200) {
    return "Budget minimum 200 USD hona chahiye.";
  }

  return "";
}

function buildIntentNote(intentResult) {
  if (!intentResult?.explicitFields?.length) {
    return "";
  }

  const fieldsLabel = intentResult.explicitFields.join(", ");
  return `Auto-filled from prompt: ${fieldsLabel}.`;
}

function applyIntentPatchToControls(intentResult) {
  const patch = intentResult?.patch || {};
  const keys = Object.keys(patch);

  if (!keys.length) {
    return false;
  }

  updateControls(patch);
  intentAutoNote.value = buildIntentNote(intentResult);

  const filters = Array.isArray(intentResult?.filters) ? intentResult.filters : [];
  intentFiltersNote.value = filters.length ? `Applied filters: ${filters.join(" | ")}` : "";

  return true;
}

async function inferIntentFromPrompt(sourcePrompt, { silent = false } = {}) {
  const trimmed = String(sourcePrompt || "").trim();
  if (!trimmed) {
    if (!silent) {
      intentAutoNote.value = "";
      intentFiltersNote.value = "";
    }
    return null;
  }

  const runId = ++promptIntentRunId;
  if (!silent) {
    intentParsing.value = true;
  }

  try {
    const intentResult = await extractTripIntent(trimmed, controls.value);

    if (runId !== promptIntentRunId) {
      return null;
    }

    return intentResult;
  } catch (error) {
    if (!silent) {
      intentAutoNote.value = "";
      intentFiltersNote.value = "";
    }
    return null;
  } finally {
    if (!silent && runId === promptIntentRunId) {
      intentParsing.value = false;
    }
  }
}

function refreshPromptMemory() {
  const memory = loadPromptMemory(currentUserId.value);
  promptHistory.value = memory.promptHistory;
  savedPrompts.value = memory.savedPrompts;
}

function hydrateFromProfileMemory(memory) {
  if (!memory?.preferences) {
    return;
  }

  const prefs = memory.preferences;
  controls.value = {
    ...controls.value,
    style: prefs.travelStyle || controls.value.style,
    maxBudget: Number(prefs?.budgetPreference?.target || controls.value.maxBudget),
    travelMode: prefs.transportPreference || controls.value.travelMode,
    foodPreference: prefs.foodPreference || controls.value.foodPreference,
    stayPreference: prefs.stayPreference || controls.value.stayPreference
  };
}

async function refreshRecentTrips() {
  if (!authStore.user?.uid) {
    recentTrips.value = [];
    return;
  }

  try {
    const trips = await getSavedTripsFromDb(authStore.user.uid);
    recentTrips.value = [...trips]
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, 6);
  } catch (error) {
    console.error("Failed to load recent trips", error);
    recentTrips.value = [];
  }
}

function savePreferencesToMemory() {
  const updated = saveEditablePreferences(currentUserId.value, {
    travelStyle: controls.value.style,
    budgetPreference: {
      target: Number(controls.value.maxBudget),
      min: 200,
      max: 5000
    },
    favoriteDestinations: controls.value.destination ? [controls.value.destination] : [],
    transportPreference: controls.value.travelMode,
    foodPreference: controls.value.foodPreference,
    stayPreference: controls.value.stayPreference
  });

  profileMemory.value = updated;
  memoryScores.value = computeMemoryScores(updated);
}

function saveCurrentPrompt() {
  const prompt = String(promptInput.value || "").trim();
  if (!prompt) {
    return;
  }

  addSavedPrompt(currentUserId.value, {
    prompt,
    destination: controls.value.destination
  });

  refreshPromptMemory();
}

function usePromptEntry(entry) {
  if (!entry) {
    return;
  }

  promptInput.value = entry.prompt;
  if (entry.destination && !controls.value.destination) {
    controls.value.destination = entry.destination;
  }
}

function removeSavedPromptEntry(promptId) {
  removeSavedPrompt(currentUserId.value, promptId);
  refreshPromptMemory();
}

function clearHistory() {
  clearPromptHistory(currentUserId.value);
  refreshPromptMemory();
}

function applySuggestedAction(action) {
  if (!action?.text) {
    return;
  }

  if (!promptInput.value.trim()) {
    promptInput.value = action.text;
    return;
  }

  promptInput.value = `${promptInput.value}\n${action.text}`;
}

function applyTemplate(template) {
  if (!template) {
    return;
  }

  promptInput.value = template.prompt || "";
  updateControls(template.controls || {});
}

function useRecentTrip(trip) {
  if (!trip) {
    return;
  }

  const patched = {
    origin: trip.origin || controls.value.origin,
    destination: trip.destination || controls.value.destination,
    days: Number(trip.days || controls.value.days),
    travelers: Number(trip.travelers || controls.value.travelers),
    style: trip.style || controls.value.style,
    maxBudget: Number(trip?.budget?.total || controls.value.maxBudget),
    travelMode: trip.travelMode || controls.value.travelMode,
    stayPreference: trip.stayPreference || controls.value.stayPreference,
    foodPreference: trip.foodPreference || controls.value.foodPreference
  };

  updateControls(patched);
  promptInput.value = `Create an upgraded itinerary for ${patched.destination} with ${patched.style} style and updated local highlights.`;
}

function scaleBudgetEstimate(budget = {}, factor = 1) {
  const scale = Math.max(0.35, Number(factor || 1));
  const flights = Math.round(Number(budget.flights || 0) * scale);
  const accommodation = Math.round(Number(budget.accommodation || 0) * scale);
  const food = Math.round(Number(budget.food || 0) * scale);
  const transportation = Math.round(Number(budget.transportation || 0) * scale);
  const activities = Math.round(Number(budget.activities || 0) * scale);
  const total = flights + accommodation + food + transportation + activities;

  return {
    flights,
    accommodation,
    food,
    transportation,
    activities,
    total
  };
}

async function buildOptionFromProfile(profile, personalizationPlan, destinationHint, sourcePrompt) {
  const optionContextQuery = `${personalizationPlan.memoryQuery}\n\nOption Profile: ${profile.label} | ${profile.subtitle}`;

  const [itinerary, budget] = await Promise.all([
    generateTravelPlan(
      destinationHint,
      profile.style,
      personalizationPlan.effectiveInput.days,
      personalizationPlan.effectiveInput.travelers,
      profile.budgetLimit,
      personalizationPlan.effectiveInput.travelMode,
      {
        userQuery: optionContextQuery,
        sourceQuery: sourcePrompt,
        memoryContext: personalizationPlan.memoryDirective,
        requireLive: true,
        stayPreference: profile.stayPreference,
        foodPreference: profile.foodPreference,
        budgetLimit: profile.budgetLimit
      }
    ),
    generateBudgetEstimate(
      destinationHint,
      personalizationPlan.effectiveInput.days,
      personalizationPlan.effectiveInput.travelers,
      profile.style,
      personalizationPlan.effectiveInput.travelMode,
      {
        userQuery: optionContextQuery,
        sourceQuery: sourcePrompt,
        memoryContext: personalizationPlan.memoryDirective,
        requireLive: true,
        stayPreference: profile.stayPreference,
        foodPreference: profile.foodPreference,
        budgetLimit: profile.budgetLimit
      }
    )
  ]);

  return {
    id: profile.id,
    label: profile.label,
    subtitle: profile.subtitle,
    style: profile.style,
    budgetLimit: profile.budgetLimit,
    stayPreference: profile.stayPreference,
    foodPreference: profile.foodPreference,
    itinerary,
    budget
  };
}

function buildFallbackOptionFromAnchor(profile, anchorOption) {
  const scaleFactor = profile.budgetLimit / Math.max(1, Number(anchorOption?.budget?.total || profile.budgetLimit));
  return {
    ...anchorOption,
    id: profile.id,
    label: profile.label,
    subtitle: `${profile.subtitle} (fast synthesis)`,
    style: profile.style,
    budgetLimit: profile.budgetLimit,
    stayPreference: profile.stayPreference,
    foodPreference: profile.foodPreference,
    budget: scaleBudgetEstimate(anchorOption.budget, scaleFactor)
  };
}

function rankOptions(options, personalizationPlan) {
  return rankItineraryOptions(options, {
    maxBudget: personalizationPlan.effectiveInput.maxBudget,
    style: personalizationPlan.effectiveInput.style,
    travelMode: personalizationPlan.effectiveInput.travelMode,
    stayPreference: personalizationPlan.effectiveInput.stayPreference,
    foodPreference: personalizationPlan.effectiveInput.foodPreference
  });
}

function choosePrimaryProfile(planProfiles, effectiveInput) {
  const style = String(effectiveInput?.style || "").toLowerCase();
  if (style.includes("budget")) {
    return planProfiles.find((item) => item.id === "budget") || planProfiles[0];
  }
  if (style.includes("luxury") || style.includes("premium")) {
    return planProfiles.find((item) => item.id === "premium") || planProfiles[0];
  }
  return planProfiles.find((item) => item.id === "balanced") || planProfiles[0];
}

function syncSelectedPlanState() {
  const chosen = selectedPlan.value;
  if (!chosen) {
    activeItinerary.value = null;
    activeBudget.value = null;
    activeRoadtrip.value = null;
    return;
  }

  activeItinerary.value = chosen.itinerary;
  activeBudget.value = chosen.budget;
  activeRoadtrip.value = roadtripByPlanId.value?.[chosen.id] || null;
  expandedDay.value = 1;
}

async function ensureRoadtripForPlan(planOption, effectiveInput = controls.value) {
  if (!planOption || !isRoadtripMode(effectiveInput.travelMode)) {
    activeRoadtrip.value = null;
    return;
  }

  if (roadtripByPlanId.value?.[planOption.id]) {
    activeRoadtrip.value = roadtripByPlanId.value[planOption.id];
    return;
  }

  const roadtripDestination = String(
    planOption?.itinerary?.destination || effectiveInput.destination || ""
  ).trim();

  if (!roadtripDestination) {
    return;
  }

  try {
    roadtripLoading.value = true;
    const intelligence = await generateRoadtripEngine({
      origin: String(controls.value.origin || "Current Location").trim() || "Current Location",
      destination: roadtripDestination,
      travelMode: effectiveInput.travelMode,
      days: effectiveInput.days,
      travelers: effectiveInput.travelers
    });

    roadtripByPlanId.value = {
      ...roadtripByPlanId.value,
      [planOption.id]: intelligence
    };
    activeRoadtrip.value = intelligence;
  } catch (roadtripError) {
    console.warn("Roadtrip intelligence generation failed", roadtripError);
    roadtripWarning.value = "Roadtrip intelligence partial failure: itinerary ready hai, road telemetry retry ho sakta hai.";
  } finally {
    roadtripLoading.value = false;
  }
}

function handleSelectPlan(planId) {
  if (!planId) {
    return;
  }

  selectedPlanId.value = planId;
  saveStatus.value = false;
}

async function handleGenerate() {
  plannerError.value = "";
  roadtripWarning.value = "";

  const now = Date.now();
  if (now - lastGenerationAt.value < 1200) {
    plannerError.value = "Please wait for a second before generating again.";
    return;
  }

  const sourcePrompt = String(promptInput.value || "").trim();
  const intentFromPrompt = await inferIntentFromPrompt(sourcePrompt, { silent: true });
  if (intentFromPrompt?.patch && Object.keys(intentFromPrompt.patch).length > 0) {
    applyIntentPatchToControls(intentFromPrompt);
  }

  const effectiveInput = normalizeControlsValue({
    ...controls.value,
    ...(intentFromPrompt?.patch || {})
  });
  updateControls(effectiveInput);

  const validationError = getValidationErrorMessage(sourcePrompt, effectiveInput);
  if (validationError) {
    plannerError.value = validationError;
    return;
  }

  lastGenerationAt.value = now;
  lastGenerationPayload.value = {
    prompt: sourcePrompt,
    controls: { ...effectiveInput }
  };

  generationLoading.start();
  const generationRunId = Date.now();
  activeGenerationRunId = generationRunId;
  enhancingOptions.value = false;
  activeItinerary.value = null;
  activeBudget.value = null;
  activeRoadtrip.value = null;
  generatedPlanOptions.value = [];
  selectedPlanId.value = "";
  roadtripByPlanId.value = {};

  try {
    savePreferencesToMemory();

    addPromptToHistory(currentUserId.value, {
      prompt: sourcePrompt || `Plan trip to ${controls.value.destination}`,
      destination: controls.value.destination
    });
    refreshPromptMemory();

    const personalizationPlan = createPersonalizationPlan({
      input: {
        destination: effectiveInput.destination,
        naturalQuery: sourcePrompt,
        days: effectiveInput.days,
        travelers: effectiveInput.travelers,
        style: effectiveInput.style,
        maxBudget: effectiveInput.maxBudget,
        travelMode: effectiveInput.travelMode,
        stayPreference: effectiveInput.stayPreference,
        foodPreference: effectiveInput.foodPreference
      },
      profileMemory: profileMemory.value
    });

    memoryScores.value = personalizationPlan.memoryScores;
    memoryNote.value = personalizationPlan.personalizationNotes;

    updateControls({
      destination: personalizationPlan.effectiveInput.destination,
      style: personalizationPlan.effectiveInput.style,
      maxBudget: personalizationPlan.effectiveInput.maxBudget,
      travelMode: personalizationPlan.effectiveInput.travelMode,
      stayPreference: personalizationPlan.effectiveInput.stayPreference,
      foodPreference: personalizationPlan.effectiveInput.foodPreference,
      days: personalizationPlan.effectiveInput.days,
      travelers: personalizationPlan.effectiveInput.travelers
    });

    const destinationHint = String(personalizationPlan.effectiveInput.destination || sourcePrompt || "").trim();

    const planProfiles = createPlanProfiles(personalizationPlan.effectiveInput);
    let rankedOptions = [];

    if (fastMode.value) {
      const primaryProfile = choosePrimaryProfile(planProfiles, personalizationPlan.effectiveInput);
      const remainingProfiles = planProfiles.filter((item) => item.id !== primaryProfile.id);

      let primaryOption = null;
      try {
        primaryOption = await buildOptionFromProfile(primaryProfile, personalizationPlan, destinationHint, sourcePrompt);
      } catch (_error) {
        const fallbackSettled = await Promise.allSettled(
          remainingProfiles.map((profile) => buildOptionFromProfile(profile, personalizationPlan, destinationHint, sourcePrompt))
        );
        primaryOption = fallbackSettled.find((entry) => entry.status === "fulfilled")?.value || null;
      }

      if (!primaryOption) {
        throw new Error("No itinerary option could be generated.");
      }

      const fastOptions = planProfiles.map((profile) => {
        if (profile.id === primaryOption.id) {
          return primaryOption;
        }
        return buildFallbackOptionFromAnchor(profile, primaryOption);
      });

      rankedOptions = rankOptions(fastOptions, personalizationPlan);

      if (activeGenerationRunId === generationRunId) {
        generatedPlanOptions.value = rankedOptions;
        selectedPlanId.value = rankedOptions[0]?.id || "";
        syncSelectedPlanState();
      }

      enhancingOptions.value = remainingProfiles.length > 0;
      Promise.allSettled(
        remainingProfiles.map((profile) => buildOptionFromProfile(profile, personalizationPlan, destinationHint, sourcePrompt))
      ).then((backgroundSettled) => {
        if (activeGenerationRunId !== generationRunId) {
          return;
        }

        const successfulBackground = backgroundSettled
          .filter((entry) => entry.status === "fulfilled")
          .map((entry) => entry.value);

        const merged = planProfiles.map((profile) => {
          const exact = successfulBackground.find((item) => item.id === profile.id);
          if (exact) {
            return exact;
          }
          return rankedOptions.find((item) => item.id === profile.id) || buildFallbackOptionFromAnchor(profile, primaryOption);
        });

        const reranked = rankOptions(merged, personalizationPlan);
        generatedPlanOptions.value = reranked;

        if (!reranked.find((item) => item.id === selectedPlanId.value)) {
          selectedPlanId.value = reranked[0]?.id || "";
        }

        syncSelectedPlanState();
        enhancingOptions.value = false;
      }).catch(() => {
        if (activeGenerationRunId === generationRunId) {
          enhancingOptions.value = false;
        }
      });
    } else {
      const settledOptions = await Promise.allSettled(
        planProfiles.map((profile) => buildOptionFromProfile(profile, personalizationPlan, destinationHint, sourcePrompt))
      );

      const successful = settledOptions
        .filter((entry) => entry.status === "fulfilled")
        .map((entry) => entry.value);

      if (successful.length === 0) {
        throw new Error("No itinerary option could be generated.");
      }

      const anchorOption = successful[0];
      const fullOptions = planProfiles.map((profile) => {
        const exact = successful.find((item) => item.id === profile.id);
        if (exact) {
          return exact;
        }
        return buildFallbackOptionFromAnchor(profile, anchorOption);
      });

      rankedOptions = rankOptions(fullOptions, personalizationPlan);
    }

    generatedPlanOptions.value = rankedOptions;
    selectedPlanId.value = rankedOptions[0]?.id || "";
    syncSelectedPlanState();

    await ensureRoadtripForPlan(rankedOptions[0], personalizationPlan.effectiveInput);

    const updatedMemory = recordGeneratedTrip(currentUserId.value, {
      destination: destinationHint,
      travelStyle: rankedOptions[0]?.style || personalizationPlan.effectiveInput.style,
      budgetTotal: rankedOptions[0]?.budget?.total,
      transportPreference: personalizationPlan.effectiveInput.travelMode,
      foodPreference: personalizationPlan.effectiveInput.foodPreference,
      stayPreference: personalizationPlan.effectiveInput.stayPreference,
      days: personalizationPlan.effectiveInput.days,
      travelers: personalizationPlan.effectiveInput.travelers,
      sourceQuery: sourcePrompt
    });

    profileMemory.value = updatedMemory;
    memoryScores.value = computeMemoryScores(updatedMemory);
  } catch (error) {
    console.error("Command center generation failed", error);
    enhancingOptions.value = false;
    plannerError.value = getFriendlyErrorMessage(error, "AI plan generate nahi ho paya. Thodi der baad retry karo.");
  } finally {
    generationLoading.stop();
  }
}

async function handleSaveTrip() {
  if (!selectedPlan.value?.itinerary || !selectedPlan.value?.budget) {
    return;
  }

  if (!authStore.user?.uid) {
    router.push({ path: "/login", query: { redirect: "/planner" } });
    return;
  }

  const chosen = selectedPlan.value;
  const chosenRoadtrip = roadtripByPlanId.value?.[chosen.id] || activeRoadtrip.value || null;

  const record = {
    origin: controls.value.origin,
    destination: chosen.itinerary.destination,
    tagline: chosen.itinerary.tagline,
    summary: chosen.itinerary.summary,
    days: controls.value.days,
    travelers: controls.value.travelers,
    style: chosen.style,
    travelMode: controls.value.travelMode,
    stayPreference: chosen.stayPreference || controls.value.stayPreference,
    foodPreference: chosen.foodPreference || controls.value.foodPreference,
    itinerary: chosen.itinerary.itinerary,
    budget: chosen.budget,
    roadtripIntelligence: chosenRoadtrip,
    planType: chosen.label,
    planOptionId: chosen.id,
    planRank: chosen.rank,
    planScore: chosen.totalScore,
    planScores: chosen.scores
  };

  try {
    await saveTripToDb(record, authStore.user.uid);

    const updated = recordSavedTrip(currentUserId.value, {
      destination: record.destination,
      travelStyle: chosen.style,
      budgetTotal: record?.budget?.total,
      transportPreference: record.travelMode,
      foodPreference: record.foodPreference,
      stayPreference: record.stayPreference,
      days: record.days,
      travelers: record.travelers,
      sourceQuery: promptInput.value.trim()
    });

    profileMemory.value = updated;
    memoryScores.value = computeMemoryScores(updated);

    saveStatus.value = true;
    setTimeout(() => {
      saveStatus.value = false;
    }, 2500);

    await refreshRecentTrips();
  } catch (error) {
    plannerError.value = getFriendlyErrorMessage(error, "Trip save nahi ho paya.");
  }
}

function retryLastGeneration() {
  if (loading.value) {
    return;
  }

  if (lastGenerationPayload.value?.controls) {
    updateControls(lastGenerationPayload.value.controls);
  }
  if (typeof lastGenerationPayload.value?.prompt === "string") {
    promptInput.value = lastGenerationPayload.value.prompt;
  }

  handleGenerate();
}

function toggleDay(day) {
  expandedDay.value = expandedDay.value === day ? null : day;
}

watch(
  () => promptInput.value,
  (nextPrompt) => {
    if (promptIntentTimer) {
      clearTimeout(promptIntentTimer);
    }

    const trimmed = String(nextPrompt || "").trim();
    if (trimmed.length < 4) {
      intentParsing.value = false;
      intentAutoNote.value = "";
      intentFiltersNote.value = "";
      return;
    }

    promptIntentTimer = setTimeout(async () => {
      const intentResult = await inferIntentFromPrompt(trimmed, { silent: false });
      if (intentResult) {
        applyIntentPatchToControls(intentResult);
      }
    }, 450);
  }
);

onBeforeUnmount(() => {
  if (promptIntentTimer) {
    clearTimeout(promptIntentTimer);
    promptIntentTimer = null;
  }

  deferredUiTimers.forEach((timerId) => clearTimeout(timerId));
  deferredUiTimers.length = 0;
});

watch(
  () => selectedPlanId.value,
  async () => {
    syncSelectedPlanState();
    if (selectedPlan.value) {
      await ensureRoadtripForPlan(selectedPlan.value, controls.value);
    }
  }
);

onMounted(async () => {
  deferredUiTimers.push(
    setTimeout(() => {
      showEnhancementBlocks.value = true;
    }, 120)
  );
  deferredUiTimers.push(
    setTimeout(() => {
      showSidebarBlocks.value = true;
    }, 260)
  );
  deferredUiTimers.push(
    setTimeout(() => {
      showRoadtripBlock.value = true;
    }, 460)
  );

  if (typeof localStorage !== "undefined") {
    const storedMode = localStorage.getItem("planner_fast_mode");
    if (storedMode === "true" || storedMode === "false") {
      fastMode.value = storedMode === "true";
    }
  }

  await authStore.initAuth();

  const memory = loadProfileMemory(currentUserId.value);
  profileMemory.value = memory;
  memoryScores.value = computeMemoryScores(memory);
  hydrateFromProfileMemory(memory);

  const routeDestination = String(route.query.destination || "").trim();
  const routeOrigin = String(route.query.origin || "").trim();

  if (routeOrigin) {
    controls.value.origin = routeOrigin;
  }

  if (routeDestination) {
    controls.value.destination = routeDestination;
    promptInput.value = `Plan a ${controls.value.days}-day trip for ${routeDestination} with smart local recommendations.`;
  }

  refreshPromptMemory();
  await refreshRecentTrips();
});

watch(
  () => authStore.user?.uid,
  async () => {
    const memory = loadProfileMemory(currentUserId.value);
    profileMemory.value = memory;
    memoryScores.value = computeMemoryScores(memory);
    hydrateFromProfileMemory(memory);

    refreshPromptMemory();
    await refreshRecentTrips();
  }
);
</script>

<template>
  <div class="command-center-page container animate-fade-in" style="padding-top: 100px;">
    <div class="page-header">
      <span class="hud-badge">AI WORKSPACE</span>
      <h1>AI Travel Command Center</h1>
      <p>Prompt-first planning studio with memory-aware personalization, reusable templates, and trip intelligence context.</p>
    </div>

    <div class="workspace-grid mt-6">
      <section class="main-stack">
        <CommandComposer
          :prompt="promptInput"
          :loading="loading"
          :live-ai-ready="liveAiReady"
          :can-generate="canGenerate"
          :fast-mode="fastMode"
          :memory-score="memoryScores.overall"
          @update:prompt="promptInput = $event"
          @update:fast-mode="setFastMode"
          @generate="handleGenerate"
          @save-prompt="saveCurrentPrompt"
        />

        <ControlMatrix
          :controls="controls"
          @update:controls="updateControls"
          @save-preferences="savePreferencesToMemory"
        />

        <SuggestedActions
          v-if="showEnhancementBlocks"
          :actions="suggestedActions"
          @apply-action="applySuggestedAction"
        />
        <GlassPanel v-else class="deferred-card" heavy>
          <p class="deferred-note">Loading smart actions...</p>
        </GlassPanel>

        <QuickTemplates
          v-if="showEnhancementBlocks"
          :templates="quickTemplates"
          @apply-template="applyTemplate"
        />
        <GlassPanel v-else class="deferred-card" heavy>
          <p class="deferred-note">Loading quick templates...</p>
        </GlassPanel>
      </section>

      <aside class="side-stack" v-if="showSidebarBlocks">
        <PromptCollection
          title="Prompt History"
          :prompts="promptHistory"
          empty-label="No history yet."
          :show-clear="true"
          @use-prompt="usePromptEntry"
          @clear="clearHistory"
        />

        <PromptCollection
          title="Saved Prompts"
          :prompts="savedPrompts"
          empty-label="No saved prompts yet."
          :show-remove="true"
          @use-prompt="usePromptEntry"
          @remove-prompt="removeSavedPromptEntry"
        />

        <RecentTripsPanel
          :trips="recentTrips"
          @use-trip="useRecentTrip"
        />
      </aside>
      <aside class="side-stack" v-else>
        <GlassPanel class="deferred-card" heavy>
          <p class="deferred-note">Loading command memory...</p>
        </GlassPanel>
        <GlassPanel class="deferred-card" heavy>
          <p class="deferred-note">Loading recent trips...</p>
        </GlassPanel>
      </aside>
    </div>

    <div class="feedback-stack">
      <p v-if="intentParsing" class="memory-note">Reading prompt intent and syncing controls...</p>
      <p v-if="intentAutoNote" class="memory-note">{{ intentAutoNote }}</p>
      <p v-if="intentFiltersNote" class="memory-note">{{ intentFiltersNote }}</p>
      <p v-if="enhancingOptions" class="memory-note">Fast mode active: extra plan options are loading in background...</p>
      <p v-if="memoryNote" class="memory-note">{{ memoryNote }}</p>
      <p v-if="roadtripWarning" class="memory-note">{{ roadtripWarning }}</p>
      <div v-if="plannerError" class="planner-error-wrap">
        <p class="planner-error">{{ plannerError }}</p>
        <button type="button" class="btn btn-outline btn-sm" :disabled="loading" @click="retryLastGeneration">Retry</button>
      </div>
    </div>

    <section class="result-zone">
      <GlassPanel v-if="loading" class="loading-card" heavy>
        <div class="spinner"></div>
        <p>AI is structuring your personalized itinerary...</p>
      </GlassPanel>

      <GlassPanel v-else-if="!hasResults" class="empty-state" heavy>
        <h3>Awaiting Command</h3>
        <p>Type a rich travel prompt and run Generate Itinerary.</p>
      </GlassPanel>

      <GlassPanel v-else class="results-card" heavy>
        <PlanComparisonView
          :options="generatedPlanOptions"
          :selected-plan-id="selectedPlanId"
          :loading="loading"
          @select-plan="handleSelectPlan"
        />

        <div class="selected-plan-strip mt-4" v-if="selectedPlan">
          <span class="selected-label">Selected: {{ selectedPlan.label }}</span>
          <span class="selected-score">Rank #{{ selectedPlan.rank }} • Score {{ selectedPlan.totalScore }}/100</span>
        </div>

        <div class="result-head">
          <div>
            <span class="tagline">{{ activeItinerary.tagline }}</span>
            <h2>{{ activeItinerary.destination }}</h2>
            <p>{{ activeItinerary.summary }}</p>
          </div>
          <button type="button" class="btn btn-outline" :class="{ saved: saveStatus }" :disabled="!canSavePlan" @click="handleSaveTrip">
            {{ saveStatus ? "Saved" : "Save Preferred Plan" }}
          </button>
        </div>

        <div v-if="activeBudget" class="budget-grid mt-4">
          <article class="budget-cell">
            <span>Flights</span>
            <strong>{{ formatPrice(activeBudget.flights) }}</strong>
          </article>
          <article class="budget-cell">
            <span>Stay</span>
            <strong>{{ formatPrice(activeBudget.accommodation) }}</strong>
          </article>
          <article class="budget-cell">
            <span>Food</span>
            <strong>{{ formatPrice(activeBudget.food) }}</strong>
          </article>
          <article class="budget-cell">
            <span>Transport</span>
            <strong>{{ formatPrice(activeBudget.transportation) }}</strong>
          </article>
          <article class="budget-cell">
            <span>Activities</span>
            <strong>{{ formatPrice(activeBudget.activities) }}</strong>
          </article>
          <article class="budget-cell total">
            <span>Total</span>
            <strong>{{ formatPrice(activeBudget.total) }}</strong>
          </article>
        </div>

        <div class="itinerary-list mt-4">
          <article v-for="day in activeItinerary.itinerary" :key="day.day" class="day-card">
            <button type="button" class="day-head" @click="toggleDay(day.day)">
              <span>Day {{ day.day }} - {{ day.theme }}</span>
              <span>{{ expandedDay === day.day ? "-" : "+" }}</span>
            </button>
            <div v-if="expandedDay === day.day" class="day-body">
              <p><strong>Morning:</strong> {{ day.morning }}</p>
              <p><strong>Afternoon:</strong> {{ day.afternoon }}</p>
              <p><strong>Evening:</strong> {{ day.evening }}</p>
              <p class="food-line"><strong>Food:</strong> {{ day.foodRecommendation }}</p>
            </div>
          </article>
        </div>

        <RoadtripIntelligencePanel
          v-if="showRoadtripBlock && (activeRoadtrip || isRoadtripMode(controls.travelMode))"
          class="mt-4"
          :roadtrip="activeRoadtrip"
          :loading="loading || roadtripLoading"
        />
      </GlassPanel>
    </section>
  </div>
</template>

<style scoped>
.command-center-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 28px;
}

.page-header h1 {
  margin: 8px 0;
  font-size: clamp(1.9rem, 4vw, 2.7rem);
}

.page-header p {
  color: var(--color-text-secondary);
  max-width: 760px;
}

.hud-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
}

.mt-6 {
  margin-top: 24px;
}

.mt-4 {
  margin-top: 16px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
}

.main-stack,
.side-stack {
  display: grid;
  gap: 12px;
  align-content: start;
}

.feedback-stack {
  min-height: 20px;
  display: grid;
  gap: 6px;
}

.memory-note {
  font-size: 0.81rem;
  color: var(--color-text-secondary);
}

.deferred-card {
  border: 1px dashed var(--color-border);
  background: #ffffff !important;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.deferred-note {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.planner-error {
  color: #dc2626;
  font-size: 0.84rem;
}

.planner-error-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(220, 38, 38, 0.24);
  background: rgba(254, 226, 226, 0.6);
  border-radius: var(--radius-md);
  padding: 8px 10px;
}

.btn-sm {
  padding: 6px 10px;
  font-size: 0.78rem;
}

.result-zone {
  display: grid;
}

.selected-plan-strip {
  border: 1px solid rgba(37, 99, 235, 0.3);
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.selected-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-primary);
}

.selected-score {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.results-card,
.loading-card,
.empty-state {
  background: #ffffff !important;
}

.loading-card,
.empty-state {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 18px;
  text-align: center;
  color: var(--color-text-secondary);
}

.spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(37, 99, 235, 0.2);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  margin: 0 auto 10px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.result-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.tagline {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--color-secondary);
  margin-bottom: 4px;
}

.result-head h2 {
  font-size: 1.35rem;
}

.result-head p {
  margin-top: 6px;
  color: var(--color-text-secondary);
  max-width: 700px;
}

.btn.saved {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.45);
}

.budget-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.budget-cell {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px;
  background: #ffffff;
}

.budget-cell span {
  display: block;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.budget-cell strong {
  margin-top: 4px;
  display: block;
  font-size: 0.95rem;
  color: var(--color-text);
}

.budget-cell.total {
  border-color: rgba(37, 99, 235, 0.35);
  background: var(--color-primary-light);
}

.itinerary-list {
  display: grid;
  gap: 10px;
}

.day-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #ffffff;
}

.day-head {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 0.9rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  cursor: pointer;
}

.day-body {
  border-top: 1px solid var(--color-border);
  padding: 12px;
}

.day-body p {
  font-size: 0.83rem;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  line-height: 1.45;
}

.day-body .food-line {
  margin-bottom: 0;
}

@media (max-width: 1100px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .budget-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .selected-plan-strip {
    flex-direction: column;
    align-items: flex-start;
  }

  .result-head {
    flex-direction: column;
    align-items: stretch;
  }

  .budget-grid {
    grid-template-columns: 1fr;
  }
}
</style>

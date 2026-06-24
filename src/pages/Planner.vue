<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import {
  extractTripIntent,
  generateTravelPlan,
  generateBudgetEstimate,
  geocodePlace,
  getRouteDistance,
  isGeminiConfigured
} from "../services/gemini";
import { getSavedTripsFromDb, saveTripToDb } from "../services/firebase";
import { formatPrice, initUserCurrency, userCurrency } from "../services/currency";
import { createLoadingState } from "../core/monitoring/loading";
import { getFriendlyErrorMessage } from "../core/errors";
import { detectUserLocation, userLocation } from "../services/location";
import { fetchWeather } from "../services/travel/weather.service";
import { fetchNearbyPlaces } from "../services/travel/places.service";
import { useProfileMemoryStore } from "../stores/profileMemory";
import { useOfflineStore } from "../stores/offline";
import { usePlannerSessionStore } from "../stores/plannerSession";
import { useGroupTravelStore } from "../stores/groupTravel";
import { createPlanProfiles, rankItineraryOptions } from "../modules/planner-options";
import { generateRoadtripEngine, isRoadtripMode } from "../modules/roadtrip";
import PlanComparisonView from "../features/planner/PlanComparisonView.vue";
import RoadtripIntelligencePanel from "../features/roadtrip/RoadtripIntelligencePanel.vue";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const profileMemoryStore = useProfileMemoryStore();
const offlineStore = useOfflineStore();
const plannerSessionStore = usePlannerSessionStore();
const groupTravelStore = useGroupTravelStore();

const DEFAULT_PLANNER_SETTINGS = {
  budget: 1800,
  travelers: 2,
  style: "Balanced",
  stayPreference: "mid-range",
  travelMode: "Car"
};

const liveAiReady = isGeminiConfigured();
const generationLoading = createLoadingState(false);

const loading = generationLoading.isLoading;
const plannerError = ref("");
const saveStatus = ref(false);
const offlineDraftMessage = ref("");
const groupShareStatus = ref("");
const expandedDay = ref(1);
const showPreferencesModal = ref(false);
const preferencesLocked = ref(false);
const roadtripLoading = ref(false);
const activeRoadtrip = ref(null);
const generatedPlanOptions = ref([]);
const selectedPlanId = ref("");
const roadtripByPlanId = ref({});
const showSavedProfilesDrawer = ref(false);

const promptInput = ref("");
const conversationListRef = ref(null);

function createDefaultControls() {
  return {
    origin: "Current Location",
    destination: "",
    days: 5,
    travelers: DEFAULT_PLANNER_SETTINGS.travelers,
    style: DEFAULT_PLANNER_SETTINGS.style,
    maxBudget: DEFAULT_PLANNER_SETTINGS.budget,
    travelMode: DEFAULT_PLANNER_SETTINGS.travelMode,
    stayPreference: DEFAULT_PLANNER_SETTINGS.stayPreference,
    foodPreference: "mixed"
  };
}

const controls = ref(createDefaultControls());
const preferenceDraft = ref(createDefaultControls());

const activeItinerary = ref(null);
const activeBudget = ref(null);

const assistantReply = ref("");
const assistantSuggestions = ref([]);
const refinementPrompts = ref([]);
const conversation = ref([]);
const recentTrips = ref([]);

const tripSnapshotLoading = ref(false);
const tripSnapshot = ref({
  distance: "Distance unavailable",
  weather: null,
  attractions: [],
  hotels: [],
  restaurants: []
});

function getActiveCurrencyRate() {
  const nextRate = Number(userCurrency.value?.rate || 1);
  return Number.isFinite(nextRate) && nextRate > 0 ? nextRate : 1;
}

function toLocalBudget(usdAmount) {
  const nextAmount = Number(usdAmount || 0);
  if (!Number.isFinite(nextAmount)) {
    return 0;
  }
  return Math.round(nextAmount * getActiveCurrencyRate());
}

function toUsdBudget(localAmount) {
  const nextAmount = Number(localAmount || 0);
  if (!Number.isFinite(nextAmount)) {
    return DEFAULT_PLANNER_SETTINGS.budget;
  }
  return Math.round(nextAmount / getActiveCurrencyRate());
}

function promptMentionsUsd(prompt) {
  return /(\busd\b|\bdollar\b|\bdollars\b|\$)/i.test(String(prompt || ""));
}

function normalizePromptBudgetToUsd(rawBudget, sourcePrompt) {
  const numericBudget = Number(rawBudget);
  if (!Number.isFinite(numericBudget)) {
    return null;
  }

  if (promptMentionsUsd(sourcePrompt)) {
    return Math.round(numericBudget);
  }

  return toUsdBudget(numericBudget);
}

const activeCurrencyCode = computed(() => String(userCurrency.value?.currency || "USD"));
const activeCurrencyCountry = computed(() => String(userCurrency.value?.country || "your location"));
const budgetMinLocal = computed(() => toLocalBudget(200));
const budgetMaxLocal = computed(() => toLocalBudget(100000));
const budgetLocalHint = computed(() => {
  return `Total trip budget cap in ${activeCurrencyCode.value} for ${activeCurrencyCountry.value} (not per-day).`;
});

const hasResults = computed(() => Boolean(activeItinerary.value && activeBudget.value));
const canSavePlan = computed(() => Boolean(activeItinerary.value?.itinerary && activeBudget.value));
const isOnline = computed(() => Boolean(offlineStore.isOnline));
const pendingOfflineDrafts = computed(() => Number(offlineStore.pendingCount || 0));
const normalizedTravelMode = computed(() => String(controls.value.travelMode || "").toLowerCase());
const shouldShowFlights = computed(() => normalizedTravelMode.value.includes("flight"));
const transportModeBudgetLabel = computed(() => {
  if (normalizedTravelMode.value.includes("train")) return "Train + Local";
  if (normalizedTravelMode.value.includes("bus")) return "Bus + Local";
  if (normalizedTravelMode.value.includes("car")) return "Fuel + Toll + Local";
  if (normalizedTravelMode.value.includes("bike")) return "Bike Fuel + Local";
  return "Transport";
});
const selectedPlan = computed(() => {
  return generatedPlanOptions.value.find((option) => option.id === selectedPlanId.value) || generatedPlanOptions.value[0] || null;
});
const profileConfidence = computed(() => Number(profileMemoryStore?.scores?.overall || 0));
const personalityLabel = computed(() => profileMemoryStore?.personality?.label || "Explorer");
const savedPreferenceProfiles = computed(() => profileMemoryStore.preferenceProfiles || []);
const activePreferenceProfile = computed(() => profileMemoryStore.activePreferenceProfile || null);
const preferenceSummary = computed(() => {
  return [
    `${controls.value.style} style`,
    `${controls.value.travelMode}`,
    `${controls.value.days} days`,
    `${controls.value.travelers} travelers`,
    `${formatPrice(controls.value.maxBudget)} total trip cap`,
    `${controls.value.stayPreference} stay`,
    `${controls.value.foodPreference} food`
  ].join(" | ");
});
const appliedPreferenceRows = computed(() => {
  return [
    `Origin: ${controls.value.origin}`,
    `Destination: ${controls.value.destination || "From prompt"}`,
    `Duration: ${controls.value.days} days`,
    `Travelers: ${controls.value.travelers}`,
    `Style: ${controls.value.style}`,
    `Mode: ${controls.value.travelMode}`,
    `Total Trip Budget Cap: ${formatPrice(controls.value.maxBudget)} (${activeCurrencyCode.value})`,
    `Budget Basis: This cap is for complete ${controls.value.days}-day trip, not per-day.`,
    `Stay: ${controls.value.stayPreference}`,
    `Food: ${controls.value.foodPreference}`
  ];
});
const LOCKED_PREFERENCE_KEYS = new Set([
  "origin",
  "destination",
  "days",
  "travelers",
  "style",
  "maxBudget",
  "travelMode",
  "stayPreference",
  "foodPreference"
]);

function normalizeControlsValue(rawControls = {}) {
  const rawDays = Number(rawControls.days);
  const rawTravelers = Number(rawControls.travelers);
  const rawBudget = Number(rawControls.maxBudget);

  const days = Number.isFinite(rawDays) ? Math.max(2, Math.min(15, Math.round(rawDays))) : 5;
  const travelers = Number.isFinite(rawTravelers) ? Math.max(1, Math.min(8, Math.round(rawTravelers))) : 2;
  const maxBudget = Number.isFinite(rawBudget) ? Math.max(200, Math.min(100000, Math.round(rawBudget))) : DEFAULT_PLANNER_SETTINGS.budget;

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
    style: String(rawControls.style || DEFAULT_PLANNER_SETTINGS.style),
    travelMode: String(rawControls.travelMode || DEFAULT_PLANNER_SETTINGS.travelMode),
    stayPreference: String(rawControls.stayPreference || DEFAULT_PLANNER_SETTINGS.stayPreference),
    foodPreference: String(rawControls.foodPreference || "mixed")
  };
}

function updateControls(nextControls) {
  controls.value = normalizeControlsValue({
    ...controls.value,
    ...(nextControls || {})
  });
}

function updatePreferenceDraft(nextControls) {
  preferenceDraft.value = normalizeControlsValue({
    ...preferenceDraft.value,
    ...(nextControls || {})
  });
}

function openPreferencesModal() {
  if (showPreferencesModal.value) {
    closePreferencesModal();
    return;
  }

  preferenceDraft.value = normalizeControlsValue({ ...controls.value });
  showPreferencesModal.value = true;
}

function toggleSavedProfilesDrawer() {
  showSavedProfilesDrawer.value = !showSavedProfilesDrawer.value;
}

function closeSavedProfilesDrawer() {
  showSavedProfilesDrawer.value = false;
}

function closePreferencesModal() {
  showPreferencesModal.value = false;
}

function applyPreferences() {
  updateControls(preferenceDraft.value);
  preferencesLocked.value = true;
  showPreferencesModal.value = false;
  addConversation("assistant", `Trip preferences applied for current chat: ${preferenceSummary.value}.`);
}

function toPlannerControlsFromProfile(profile) {
  const prefs = profile?.preferences || {};
  const budgetTarget = Number(prefs?.budgetPreference?.target || 0);
  const topFavorite = Array.isArray(prefs?.favoriteDestinations)
    ? prefs.favoriteDestinations
      .map((item) => (typeof item === "string" ? item : item?.name))
      .find(Boolean)
    : "";

  return normalizeControlsValue({
    ...controls.value,
    destination: topFavorite || controls.value.destination,
    style: prefs.travelStyle || controls.value.style,
    travelMode: prefs.transportPreference || controls.value.travelMode,
    stayPreference: prefs.stayPreference || controls.value.stayPreference,
    foodPreference: prefs.foodPreference || controls.value.foodPreference,
    maxBudget: budgetTarget > 0 ? budgetTarget : controls.value.maxBudget
  });
}

function applyNamedPreferenceProfile(profileId) {
  const profile = savedPreferenceProfiles.value.find((item) => item.id === profileId);
  if (!profile) {
    return;
  }

  const nextControls = toPlannerControlsFromProfile(profile);
  updateControls(nextControls);
  preferenceDraft.value = normalizeControlsValue({ ...nextControls });
  preferencesLocked.value = true;
  closeSavedProfilesDrawer();
  profileMemoryStore.setActivePreferenceProfile(profile.id);

  addConversation(
    "assistant",
    `Applied saved preferences for ${profile.name}. Planner will now generate trip plan as per this profile.`
  );
}

function resetPreferencesToDefaults() {
  const defaults = createDefaultControls();
  controls.value = normalizeControlsValue(defaults);
  preferenceDraft.value = normalizeControlsValue(defaults);
  preferencesLocked.value = false;
  showPreferencesModal.value = false;
  addConversation("assistant", "Preferences reset to smart defaults. You can re-apply custom preferences anytime.");
}

function mergeIntentWithControls(intentPatch = {}) {
  const patch = { ...(intentPatch || {}) };

  if (preferencesLocked.value) {
    for (const key of Object.keys(patch)) {
      if (LOCKED_PREFERENCE_KEYS.has(key)) {
        delete patch[key];
      }
    }
  }

  return normalizeControlsValue({
    ...controls.value,
    ...patch
  });
}

function buildPreferenceContext(input) {
  const localBudgetCap = formatPrice(Number(input.maxBudget || DEFAULT_PLANNER_SETTINGS.budget));
  return [
    "User Preferences (must follow strictly):",
    `- Origin: ${String(input.origin || "Current Location").trim() || "Current Location"}`,
    `- Destination: ${String(input.destination || "").trim() || "From prompt"}`,
    `- Duration: ${Number(input.days || 5)} days`,
    `- Travelers: ${Number(input.travelers || 2)}`,
    `- Style: ${String(input.style || "Balanced")}`,
    `- Travel mode: ${String(input.travelMode || "Car")}`,
    `- Stay preference: ${String(input.stayPreference || "mid-range")}`,
    `- Food preference: ${String(input.foodPreference || "mixed")}`,
    `- Total trip budget cap (not per-day): ${localBudgetCap} (${activeCurrencyCode.value}, ${activeCurrencyCountry.value})`,
    `- Internal USD reference for calculations: ${Math.round(Number(input.maxBudget || DEFAULT_PLANNER_SETTINGS.budget))}`,
    "Do not ignore these preferences when creating itinerary, activities, stay suggestions, food suggestions, and budget split."
  ].join("\n");
}

function inferLikelyTransport(sourcePrompt, destinationName) {
  const normalized = `${String(sourcePrompt || "")} ${String(destinationName || "")}`.toLowerCase();
  if (/(roadtrip|drive|car|bike|scooter)/i.test(normalized)) return "Car";
  if (/(train|rail)/i.test(normalized)) return "Train";
  if (/(bus|coach)/i.test(normalized)) return "Bus";
  if (/(flight|plane|air|international|overseas|abroad)/i.test(normalized)) return "Flight";
  return DEFAULT_PLANNER_SETTINGS.travelMode;
}

function applyIntelligentDefaults(effectiveInput, sourcePrompt) {
  const destination = String(effectiveInput.destination || "").trim() || "Goa";
  const style = String(effectiveInput.style || "").trim() || DEFAULT_PLANNER_SETTINGS.style;
  const stayPreference = String(effectiveInput.stayPreference || "").trim() || DEFAULT_PLANNER_SETTINGS.stayPreference;
  const travelMode = String(effectiveInput.travelMode || "").trim() || inferLikelyTransport(sourcePrompt, destination);

  return {
    ...effectiveInput,
    destination,
    travelers: Number(effectiveInput.travelers || DEFAULT_PLANNER_SETTINGS.travelers) || DEFAULT_PLANNER_SETTINGS.travelers,
    maxBudget: Number(effectiveInput.maxBudget || DEFAULT_PLANNER_SETTINGS.budget) || DEFAULT_PLANNER_SETTINGS.budget,
    style,
    stayPreference,
    travelMode
  };
}

function getValidationErrorMessage(effectiveInput) {
  if (!Number.isFinite(Number(effectiveInput.days)) || Number(effectiveInput.days) < 2) {
    return "Trip days must be at least 2.";
  }

  if (!Number.isFinite(Number(effectiveInput.travelers)) || Number(effectiveInput.travelers) < 1) {
    return "Number of travelers must be at least 1.";
  }

  if (!Number.isFinite(Number(effectiveInput.maxBudget)) || Number(effectiveInput.maxBudget) < 200) {
    return `Minimum total trip budget cap must be at least ${formatPrice(200)}.`;
  }

  return "";
}

function normalizeBudgetByTravelMode(rawBudget, travelMode) {
  const safeBudget = {
    flights: Math.max(0, Math.round(Number(rawBudget?.flights || 0))),
    accommodation: Math.max(0, Math.round(Number(rawBudget?.accommodation || 0))),
    food: Math.max(0, Math.round(Number(rawBudget?.food || 0))),
    transportation: Math.max(0, Math.round(Number(rawBudget?.transportation || 0))),
    activities: Math.max(0, Math.round(Number(rawBudget?.activities || 0))),
    total: Math.max(0, Math.round(Number(rawBudget?.total || 0)))
  };

  const mode = String(travelMode || "").toLowerCase();
  if (!mode.includes("flight")) {
    safeBudget.transportation = Math.max(0, safeBudget.transportation + safeBudget.flights);
    safeBudget.flights = 0;
  }

  safeBudget.total = safeBudget.flights + safeBudget.accommodation + safeBudget.food + safeBudget.transportation + safeBudget.activities;
  return safeBudget;
}

function buildPreferenceChangeMessage(previousInput, nextInput) {
  const changes = [];

  if (String(previousInput.destination || "").trim() !== String(nextInput.destination || "").trim()) {
    changes.push(`destination to ${nextInput.destination || "your destination"}`);
  }
  if (Number(previousInput.days || 0) !== Number(nextInput.days || 0)) {
    changes.push(`duration to ${nextInput.days} days`);
  }
  if (Number(previousInput.travelers || 0) !== Number(nextInput.travelers || 0)) {
    changes.push(`travelers to ${nextInput.travelers}`);
  }
  if (String(previousInput.style || "") !== String(nextInput.style || "")) {
    changes.push(`style to ${nextInput.style}`);
  }
  if (String(previousInput.travelMode || "") !== String(nextInput.travelMode || "")) {
    changes.push(`travel mode to ${nextInput.travelMode}`);
  }
  if (Math.round(Number(previousInput.maxBudget || 0)) !== Math.round(Number(nextInput.maxBudget || 0))) {
    changes.push(`total budget cap to ${formatPrice(nextInput.maxBudget)}`);
  }

  if (changes.length === 0) {
    return "";
  }

  return `Understood. I updated your preferences from this chat: ${changes.join(", ")}.`;
}

function addConversation(role, text) {
  const messageText = String(text || "").trim();
  if (!messageText) {
    return;
  }

  const message = {
    id: `${role}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    role,
    text: messageText,
    at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  };

  conversation.value = [...conversation.value, message].slice(-18);
}

function scrollConversationToBottom() {
  if (!conversationListRef.value) {
    return;
  }

  requestAnimationFrame(() => {
    if (conversationListRef.value) {
      conversationListRef.value.scrollTop = conversationListRef.value.scrollHeight;
    }
  });
}

function buildRefinementPrompts(destinationName) {
  const destination = String(destinationName || "this destination").trim() || "this destination";
  return [
    `Make this ${destination} plan more budget friendly without missing key spots.`,
    `Make this ${destination} plan family friendly with low fatigue transitions.`,
    `Make this ${destination} plan food focused with local specialties.`
  ];
}

function buildAssistantReply(effectiveInput, itinerary, budget, snapshot) {
  const destination = String(itinerary?.destination || effectiveInput.destination || "your destination").trim();
  const totalBudget = formatPrice(Number(budget?.total || 0));
  const days = Number(itinerary?.itinerary?.length || effectiveInput.days || 0);
  const firstTheme = itinerary?.itinerary?.[0]?.theme || "arrival and local orientation";
  const topAttraction = snapshot?.attractions?.[0]?.name || "local highlights";
  const topHotel = snapshot?.hotels?.[0]?.name || "stay options";

  return `Great prompt. A ${days}-day itinerary for ${destination} is ready with your preferences applied: ${effectiveInput.style} style, ${effectiveInput.travelMode} mode, ${effectiveInput.stayPreference} stay, ${effectiveInput.foodPreference} food focus, and a total trip budget cap of ${formatPrice(effectiveInput.maxBudget)} (not per-day). Estimated total budget: ${totalBudget}. Day 1 focus: ${firstTheme}. Local highlights: ${topAttraction}. Recommended stay: ${topHotel}.`;
}

function planProsCons(planId, effectiveInput) {
  if (planId === "budget") {
    return {
      pros: [
        "Lowest total trip cost",
        "Great for long-duration affordability",
        "Strong fit for budget-first travelers"
      ],
      cons: [
        "Lower accommodation comfort",
        "Fewer premium activities",
        "Transit can be less convenient"
      ]
    };
  }

  if (planId === "premium") {
    return {
      pros: [
        "Best comfort and service quality",
        "Higher experience depth",
        "Convenient transport and premium stays"
      ],
      cons: [
        "Highest budget footprint",
        "Overkill for short/simple trips",
        "Lower cost-efficiency"
      ]
    };
  }

  return {
    pros: [
      "Balanced cost to experience ratio",
      "Moderate comfort with broad coverage",
      "Default best-fit for most trips"
    ],
    cons: [
      "Not the cheapest option",
      "Not fully premium",
      "Trade-offs in both cost and luxury"
    ]
  };
}

function buildAssistantSuggestions(itinerary, budget, snapshot) {
  const dayOne = itinerary?.itinerary?.[0];
  const dayTwo = itinerary?.itinerary?.[1];
  const attraction = snapshot?.attractions?.[0]?.name;
  const restaurant = snapshot?.restaurants?.[0]?.name;
  const distance = snapshot?.distance;

  const suggestions = [
    dayOne ? `Keep Day 1 focused on ${dayOne.theme} to ensure a stable trip start.` : "Make Day 1 a light arrival and orientation day for a smoother start.",
    dayTwo ? `For Day 2, prioritize ${dayTwo.theme} and consider pre-booking to reduce wait times.` : "Prioritize main attractions on Day 2 and lock key slots early.",
    Number(budget?.total || 0) > 0 ? `Current total is ${formatPrice(budget.total)}. Consider splitting bookings to ease cash flow.` : "Split your budget across transport, stay, food, and activities to track spending.",
    attraction ? `Top attraction: ${attraction}. Aim to avoid peak hours for a better experience.` : "Prefer earlier time slots for top attractions.",
    restaurant ? `Recommended food spot: ${restaurant}. Choose off-peak dining windows.` : "Choose off-peak dining times for local food spots.",
    distance ? `Approximate route distance: ${distance}. Add a transit buffer.` : "Include a 15–20% transit buffer for travel time.",
    `Preference mode is ${controls.value.travelMode}; plan pacing and transfers accordingly.`,
    `Style is ${controls.value.style}; tune activity intensity and spend priority to match this style.`
  ];

  return suggestions.filter(Boolean).slice(0, 6);
}

async function generateTripSnapshot(effectiveInput, itinerary) {
  tripSnapshotLoading.value = true;

  const destinationName = String(itinerary?.destination || effectiveInput.destination || "").trim();
  const originName = String(effectiveInput.origin || "Current Location").trim();

  let destinationGeo = null;
  let originGeo = null;
  let distanceKm = null;
  let weather = null;
  let attractions = [];
  let hotels = [];
  let restaurants = [];

  try {
    destinationGeo = await geocodePlace(destinationName);

    if (/^current location$/i.test(originName)) {
      if (userLocation.value?.lat === null || userLocation.value?.lng === null || userLocation.value?.lat === undefined || userLocation.value?.lng === undefined) {
        await detectUserLocation();
      }

      if (userLocation.value?.lat !== null && userLocation.value?.lng !== null) {
        originGeo = {
          lat: userLocation.value.lat,
          lng: userLocation.value.lng
        };
      }
    } else {
      originGeo = await geocodePlace(originName);
    }

    if (originGeo && destinationGeo) {
      try {
        const routeInfo = await getRouteDistance(
          { lat: originGeo.lat, lng: originGeo.lng },
          { lat: destinationGeo.lat, lng: destinationGeo.lng }
        );

        if (routeInfo?.distance) {
          distanceKm = Math.round(routeInfo.distance);
        }
      } catch (_routeError) {
        distanceKm = null;
      }
    }

    if (destinationGeo) {
      const [weatherResult, attractionsResult, hotelsResult, restaurantsResult] = await Promise.allSettled([
        fetchWeather(destinationGeo.lat, destinationGeo.lng),
        fetchNearbyPlaces(destinationGeo.lat, destinationGeo.lng, "attraction", destinationName),
        fetchNearbyPlaces(destinationGeo.lat, destinationGeo.lng, "lodging", destinationName),
        fetchNearbyPlaces(destinationGeo.lat, destinationGeo.lng, "restaurant", destinationName)
      ]);

      weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
      attractions = attractionsResult.status === "fulfilled" ? (attractionsResult.value || []).slice(0, 5) : [];
      hotels = hotelsResult.status === "fulfilled" ? (hotelsResult.value || []).slice(0, 5) : [];
      restaurants = restaurantsResult.status === "fulfilled" ? (restaurantsResult.value || []).slice(0, 5) : [];
    }

    tripSnapshot.value = {
      distance: Number.isFinite(distanceKm) ? `${distanceKm.toLocaleString()} km` : "Distance unavailable",
      weather,
      attractions,
      hotels,
      restaurants
    };
  } catch (_error) {
    tripSnapshot.value = {
      distance: "Distance unavailable",
      weather: null,
      attractions: [],
      hotels: [],
      restaurants: []
    };
  } finally {
    tripSnapshotLoading.value = false;
  }
}

async function buildRoadtripForOption(option, effectiveInput) {
  if (!option || !isRoadtripMode(effectiveInput.travelMode)) {
    activeRoadtrip.value = null;
    return;
  }

  if (roadtripByPlanId.value?.[option.id]) {
    activeRoadtrip.value = roadtripByPlanId.value[option.id];
    return;
  }

  roadtripLoading.value = true;
  try {
    const roadtrip = await generateRoadtripEngine({
      origin: String(effectiveInput.origin || "Current Location").trim() || "Current Location",
      destination: String(option?.itinerary?.destination || effectiveInput.destination || "").trim(),
      travelMode: effectiveInput.travelMode,
      days: effectiveInput.days,
      travelers: effectiveInput.travelers
    });

    roadtripByPlanId.value = {
      ...roadtripByPlanId.value,
      [option.id]: roadtrip
    };
    activeRoadtrip.value = roadtrip;
  } catch (_error) {
    activeRoadtrip.value = null;
  } finally {
    roadtripLoading.value = false;
  }
}

async function selectGeneratedPlan(planId) {
  if (!planId) {
    return;
  }

  const previousPlanId = selectedPlanId.value;
  const option = generatedPlanOptions.value.find((item) => item.id === planId);
  if (!option) {
    return;
  }

  selectedPlanId.value = option.id;
  activeItinerary.value = option.itinerary;
  activeBudget.value = option.budget;
  updateControls({
    style: option.style,
    stayPreference: option.stayPreference,
    foodPreference: option.foodPreference,
    maxBudget: option.budgetLimit
  });

  await generateTripSnapshot(controls.value, option.itinerary);
  assistantReply.value = buildAssistantReply(controls.value, option.itinerary, option.budget, tripSnapshot.value);
  assistantSuggestions.value = buildAssistantSuggestions(option.itinerary, option.budget, tripSnapshot.value);
  refinementPrompts.value = buildRefinementPrompts(option?.itinerary?.destination || controls.value.destination);
  await buildRoadtripForOption(option, controls.value);

  if (previousPlanId && previousPlanId !== option.id) {
    addConversation(
      "assistant",
      `Plan switched to ${option.label}. Travel mode ${controls.value.travelMode} and budget cap ${formatPrice(controls.value.maxBudget)} remain applied.`
    );
  }

  syncPlannerSessionContext();
}

function applyRefinementPrompt(nextPrompt) {
  promptInput.value = String(nextPrompt || "").trim();
  handleGenerate();
}

function toggleDay(day) {
  expandedDay.value = expandedDay.value === day ? null : day;
}

function useRecentTrip(trip) {
  if (!trip) {
    return;
  }

  updateControls({
    origin: trip.origin || controls.value.origin,
    destination: trip.destination || controls.value.destination,
    days: Number(trip.days || controls.value.days),
    travelers: Number(trip.travelers || controls.value.travelers),
    style: trip.style || controls.value.style,
    maxBudget: Number(trip?.budget?.total || controls.value.maxBudget),
    travelMode: trip.travelMode || controls.value.travelMode,
    stayPreference: trip.stayPreference || controls.value.stayPreference,
    foodPreference: trip.foodPreference || controls.value.foodPreference
  });

  promptInput.value = `Create an updated plan for ${trip.destination} with better local suggestions.`;
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

function createTripRecord() {
  return {
    origin: controls.value.origin,
    destination: activeItinerary.value?.destination,
    tagline: activeItinerary.value?.tagline,
    summary: activeItinerary.value?.summary,
    days: controls.value.days,
    travelers: controls.value.travelers,
    style: controls.value.style,
    travelMode: controls.value.travelMode,
    stayPreference: controls.value.stayPreference,
    foodPreference: controls.value.foodPreference,
    itinerary: activeItinerary.value?.itinerary || [],
    budget: activeBudget.value,
    planOptionId: selectedPlan.value?.id || "balanced",
    planType: selectedPlan.value?.label || "Balanced",
    planRank: selectedPlan.value?.rank || 1,
    planScore: selectedPlan.value?.totalScore || 0,
    planScores: selectedPlan.value?.scores || null,
    pros: selectedPlan.value?.pros || [],
    cons: selectedPlan.value?.cons || [],
    roadtripIntelligence: activeRoadtrip.value,
    assistantReply: assistantReply.value,
    assistantSuggestions: assistantSuggestions.value
  };
}

function syncPlannerSessionContext() {
  if (!activeItinerary.value || !activeBudget.value) {
    return;
  }

  plannerSessionStore.setActiveContext({
    origin: controls.value.origin,
    destination: activeItinerary.value.destination,
    summary: activeItinerary.value.summary,
    style: controls.value.style,
    travelMode: controls.value.travelMode,
    days: controls.value.days,
    budgetTotal: Number(activeBudget.value?.total || 0),
    suggestions: assistantSuggestions.value,
    itineraryPreview: Array.isArray(activeItinerary.value?.itinerary)
      ? activeItinerary.value.itinerary.map((day) => day.theme).filter(Boolean).slice(0, 3)
      : []
  });
}

function handleSaveOfflineDraft() {
  if (!canSavePlan.value) {
    return;
  }

  const record = createTripRecord();

  offlineStore.queueDraft({
    source: "planner",
    destination: record.destination,
    days: record.days,
    travelMode: record.travelMode,
    budgetTotal: Number(record?.budget?.total || 0),
    payload: record
  });

  syncPlannerSessionContext();
  offlineDraftMessage.value = "Offline draft queued. It will sync when network is stable.";
  setTimeout(() => {
    offlineDraftMessage.value = "";
  }, 2200);
}

async function handleGenerate() {
  if (loading.value) {
    return;
  }

  plannerError.value = "";
  saveStatus.value = false;
  generatedPlanOptions.value = [];
  selectedPlanId.value = "";
  activeRoadtrip.value = null;
  roadtripByPlanId.value = {};

  const rawPrompt = String(promptInput.value || "").trim();
  if (!rawPrompt && !String(controls.value.destination || "").trim()) {
    plannerError.value = "Please provide a prompt or destination to generate an itinerary.";
    return;
  }

  const sourcePrompt = rawPrompt || `Plan a ${controls.value.days}-day trip to ${controls.value.destination}`;
  promptInput.value = sourcePrompt;
  addConversation("user", sourcePrompt);
  const previousInput = normalizeControlsValue({ ...controls.value });

  let intentPatch = {};
  try {
    const intentResult = await extractTripIntent(sourcePrompt, controls.value);
    intentPatch = intentResult?.patch || {};
  } catch (_error) {
    intentPatch = {};
  }

  if (Number.isFinite(Number(intentPatch.maxBudget))) {
    const normalizedBudget = normalizePromptBudgetToUsd(intentPatch.maxBudget, sourcePrompt);
    if (normalizedBudget !== null) {
      intentPatch.maxBudget = normalizedBudget;
    }
  }

  const mergedInput = mergeIntentWithControls(intentPatch);
  const normalizedInput = applyIntelligentDefaults(mergedInput, sourcePrompt);

  const personalizationPlan = profileMemoryStore.createPlannerPersonalization({
    destination: normalizedInput.destination,
    naturalQuery: sourcePrompt,
    days: normalizedInput.days,
    travelers: normalizedInput.travelers,
    style: normalizedInput.style,
    maxBudget: normalizedInput.maxBudget,
    travelMode: normalizedInput.travelMode,
    stayPreference: normalizedInput.stayPreference,
    foodPreference: normalizedInput.foodPreference
  });

  const effectiveInput = applyIntelligentDefaults(personalizationPlan.effectiveInput, sourcePrompt);
  const preferenceContext = buildPreferenceContext(effectiveInput);
  const planningPrompt = `${sourcePrompt}\n\n${preferenceContext}\n\n${personalizationPlan.memoryDirective}`;
  const preferenceChangeMessage = buildPreferenceChangeMessage(previousInput, effectiveInput);

  updateControls(effectiveInput);

  const validationError = getValidationErrorMessage(effectiveInput);
  if (validationError) {
    plannerError.value = validationError;
    return;
  }

  generationLoading.start();

  try {
    const destinationHint = String(effectiveInput.destination || sourcePrompt || "Goa").trim();
    const profiles = createPlanProfiles(effectiveInput);

    const settled = await Promise.allSettled(
      profiles.map(async (profile) => {
        const profilePrompt = `${planningPrompt}\n\nPlan Profile: ${profile.label}. Keep trade-offs transparent.`;

        const [itinerary, budget] = await Promise.all([
          generateTravelPlan(
            destinationHint,
            profile.style,
            effectiveInput.days,
            effectiveInput.travelers,
            profile.budgetLimit,
            effectiveInput.travelMode,
            {
              userQuery: profilePrompt,
              sourceQuery: sourcePrompt,
              requireLive: false,
              allowFallbackWithoutLive: true,
              stayPreference: profile.stayPreference,
              foodPreference: profile.foodPreference,
              budgetLimit: profile.budgetLimit
            }
          ),
          generateBudgetEstimate(
            destinationHint,
            effectiveInput.days,
            effectiveInput.travelers,
            profile.style,
            effectiveInput.travelMode,
            {
              userQuery: profilePrompt,
              sourceQuery: sourcePrompt,
              requireLive: false,
              allowFallbackWithoutLive: true,
              stayPreference: profile.stayPreference,
              foodPreference: profile.foodPreference,
              budgetLimit: profile.budgetLimit
            }
          )
        ]);

        const normalizedBudget = normalizeBudgetByTravelMode(budget, effectiveInput.travelMode);

        const prosCons = planProsCons(profile.id, effectiveInput);

        return {
          id: profile.id,
          label: profile.label,
          style: profile.style,
          stayPreference: profile.stayPreference,
          foodPreference: profile.foodPreference,
          budgetLimit: profile.budgetLimit,
          itinerary,
          budget: normalizedBudget,
          transportation: effectiveInput.travelMode,
          hotels: itinerary?.hotels || [],
          activities: Array.isArray(itinerary?.itinerary) ? itinerary.itinerary.map((day) => day.theme).filter(Boolean) : [],
          pros: prosCons.pros,
          cons: prosCons.cons
        };
      })
    );

    const options = settled
      .filter((entry) => entry.status === "fulfilled")
      .map((entry) => entry.value);

    if (options.length === 0) {
      throw new Error("No plan option could be generated.");
    }

    const rankedOptions = rankItineraryOptions(options, {
      maxBudget: effectiveInput.maxBudget,
      style: effectiveInput.style,
      travelMode: effectiveInput.travelMode,
      stayPreference: effectiveInput.stayPreference,
      foodPreference: effectiveInput.foodPreference
    });

    generatedPlanOptions.value = rankedOptions;
    selectedPlanId.value = rankedOptions[0].id;
    activeItinerary.value = rankedOptions[0].itinerary;
    activeBudget.value = rankedOptions[0].budget;
    expandedDay.value = 1;

    await generateTripSnapshot(effectiveInput, rankedOptions[0].itinerary);
    await buildRoadtripForOption(rankedOptions[0], effectiveInput);

    assistantReply.value = buildAssistantReply(effectiveInput, rankedOptions[0].itinerary, rankedOptions[0].budget, tripSnapshot.value);
    assistantSuggestions.value = buildAssistantSuggestions(rankedOptions[0].itinerary, rankedOptions[0].budget, tripSnapshot.value);
    refinementPrompts.value = buildRefinementPrompts(rankedOptions[0]?.itinerary?.destination || destinationHint);

    profileMemoryStore.trackGeneratedTrip({
      destination: rankedOptions[0]?.itinerary?.destination || destinationHint,
      travelStyle: rankedOptions[0]?.style || effectiveInput.style,
      budgetTotal: rankedOptions[0]?.budget?.total,
      transportPreference: effectiveInput.travelMode,
      foodPreference: rankedOptions[0]?.foodPreference || effectiveInput.foodPreference,
      stayPreference: rankedOptions[0]?.stayPreference || effectiveInput.stayPreference,
      days: effectiveInput.days,
      travelers: effectiveInput.travelers,
      sourceQuery: sourcePrompt
    });

    if (preferenceChangeMessage) {
      addConversation("assistant", preferenceChangeMessage);
    }
    addConversation("assistant", assistantReply.value);
    syncPlannerSessionContext();
  } catch (error) {
    console.error("Planner generation failed", error);
    plannerError.value = getFriendlyErrorMessage(error, "AI plan generation failed. Please try again later.");
    addConversation("assistant", "I had an issue generating a response. Try simplifying the prompt and retry.");
  } finally {
    generationLoading.stop();
  }
}

async function handleSaveTrip() {
  if (!activeItinerary.value?.itinerary || !activeBudget.value) {
    return;
  }

  if (!authStore.user?.uid) {
    router.push({ path: "/login", query: { redirect: "/planner" } });
    return;
  }

  const record = createTripRecord();

  try {
    await saveTripToDb(record, authStore.user.uid);
    profileMemoryStore.trackSavedTrip({
      destination: record.destination,
      travelStyle: record.style,
      budgetTotal: record?.budget?.total,
      transportPreference: record.travelMode,
      foodPreference: record.foodPreference,
      stayPreference: record.stayPreference,
      days: record.days,
      travelers: record.travelers,
      sourceQuery: promptInput.value
    });

    saveStatus.value = true;
    setTimeout(() => {
      saveStatus.value = false;
    }, 2200);

    await refreshRecentTrips();
    syncPlannerSessionContext();
  } catch (error) {
    plannerError.value = getFriendlyErrorMessage(error, "Failed to save the trip.");
  }
}

async function handleCreateGroupTrip() {
  if (!canSavePlan.value) {
    return;
  }

  if (!authStore.user?.uid) {
    router.push({ path: "/login", query: { redirect: "/planner" } });
    return;
  }

  const record = createTripRecord();

  try {
    const group = await groupTravelStore.createFromPlanner({
      record,
      user: authStore.user,
      name: `${record.destination || "Trip"} Crew`
    });

    groupShareStatus.value = "Group workspace created. Redirecting to collaboration panel.";
    setTimeout(() => {
      groupShareStatus.value = "";
    }, 2200);

    router.push({ path: "/group-trips", query: { group: group.id } });
  } catch (error) {
    plannerError.value = getFriendlyErrorMessage(error, "Failed to create group trip.");
  }
}

onMounted(async () => {
  await authStore.initAuth();
  profileMemoryStore.initForUser(authStore.user?.uid || "guest");
  offlineStore.initForUser(authStore.user?.uid || "guest");
  groupTravelStore.initForUser(authStore.user || { uid: "guest" });

  try {
    await detectUserLocation();
    await initUserCurrency(userLocation.value);
  } catch (_currencyError) {
    // Currency fallback stays handled in currency service defaults.
  }

  const routeDestination = String(route.query.destination || "").trim();
  const routeOrigin = String(route.query.origin || "").trim();
  const routePrompt = String(route.query.q || route.query.prompt || route.query.search || "").trim();

  if (routeOrigin) {
    controls.value.origin = routeOrigin;
  }

  if (routeDestination) {
    controls.value.destination = routeDestination;
    promptInput.value = `Plan a ${controls.value.days}-day trip to ${routeDestination} with practical local suggestions.`;
  } else if (routePrompt) {
    promptInput.value = routePrompt;
  }

  await refreshRecentTrips();
});

watch(
  () => authStore.user?.uid,
  async (nextUserId) => {
    profileMemoryStore.initForUser(nextUserId || "guest");
    offlineStore.initForUser(nextUserId || "guest");
    groupTravelStore.initForUser(authStore.user || { uid: nextUserId || "guest" });
    showSavedProfilesDrawer.value = false;
    await refreshRecentTrips();
  }
);

watch(
  () => controls.value,
  (nextControls) => {
    if (!showPreferencesModal.value) {
      preferenceDraft.value = normalizeControlsValue({ ...nextControls });
    }
  },
  { deep: true }
);

watch(
  () => conversation.value.length,
  () => {
    scrollConversationToBottom();
  }
);

watch(
  () => loading.value,
  () => {
    scrollConversationToBottom();
  }
);
</script>

<template>
  <div class="planner-chat-page container animate-fade-in" style="padding-top: 100px;">
    <div class="planner-header">
      <span class="planner-badge">PLANNER CHAT</span>
      <h1>Talk To Your AI Trip Planner</h1>
      <p>
        Enter a normal prompt. The planner will interpret it and return practical suggestions, a budget split, and a day-wise itinerary.
      </p>
    </div>

    <div class="planner-layout mt-6">
      <section class="input-column">
        <article class="glass-card prompt-card">
          <h2>Live Planner Context</h2>
          <p class="prompt-intro mt-2">
            Chat below like WhatsApp. Every message can update itinerary, preferences, and budget planning in real time.
          </p>

          <p v-if="!liveAiReady" class="ai-status mt-2">
            Live Gemini API key is missing. Planner will use fallback intelligence.
          </p>

          <div class="offline-strip mt-2">
            <span class="offline-chip" :class="{ offline: !isOnline }">
              {{ isOnline ? "Online Sync Active" : "Offline Mode Active" }}
            </span>
            <span v-if="pendingOfflineDrafts > 0" class="offline-count">
              {{ pendingOfflineDrafts }} pending draft(s)
            </span>
          </div>

          <div class="context-note-grid mt-3">
            <article class="context-note">
              <strong>Budget Meaning</strong>
              <p>{{ budgetLocalHint }}</p>
            </article>
            <article class="context-note">
              <strong>Detected Budget Region</strong>
              <p>{{ activeCurrencyCountry }} | {{ activeCurrencyCode }}</p>
            </article>
          </div>
        </article>

        <article v-if="recentTrips.length > 0" class="glass-card recent-card">
          <div class="card-head">
            <h3>Recent Saved Trips</h3>
            <small>Reuse as baseline</small>
          </div>
          <div class="recent-list mt-3">
            <button
              v-for="trip in recentTrips"
              :key="trip.id"
              type="button"
              class="recent-item"
              @click="useRecentTrip(trip)"
            >
              <span>{{ trip.destination }}</span>
              <small>{{ trip.days }} days · {{ formatPrice(trip?.budget?.total || 0) }}</small>
            </button>
          </div>
        </article>

        <article class="glass-card conversation-card">
          <div class="card-head">
            <h3>Planner Chat</h3>
            <div class="card-head-actions">
              <div class="preferences-popover-host">
                <button
                  type="button"
                  class="btn btn-outline btn-xs"
                  :disabled="loading"
                  @click.stop="toggleSavedProfilesDrawer"
                >
                  Saved Preferences
                </button>

                <button
                  type="button"
                  class="btn btn-outline btn-xs"
                  :disabled="loading"
                  @click.stop="openPreferencesModal"
                >
                  Edit Preferences
                </button>

                <transition name="drawer-fade">
                  <button
                    v-if="showPreferencesModal"
                    type="button"
                    class="preferences-screen-backdrop"
                    aria-label="Close preferences drawer"
                    @click="closePreferencesModal"
                  ></button>
                </transition>

                <transition name="drawer-slide">
                  <article v-if="showSavedProfilesDrawer" class="preferences-drawer saved-profiles-drawer glass-card" @click.stop>
                    <div class="preferences-head">
                      <h3>Saved Preference Profiles</h3>
                      <button type="button" class="prefs-close" @click="closeSavedProfilesDrawer">x</button>
                    </div>

                    <p class="preferences-note">
                      Select a profile to apply trip preferences instantly. Manage names and details from Profile section.
                    </p>

                    <div class="memory-traits mt-3">
                      <span class="memory-pill">Personality: {{ personalityLabel }}</span>
                      <span class="memory-pill muted">Confidence: {{ profileConfidence }}/100</span>
                    </div>

                    <div class="saved-profile-list mt-3">
                      <button
                        v-for="profile in savedPreferenceProfiles"
                        :key="profile.id"
                        type="button"
                        class="saved-profile-item"
                        :class="{ active: activePreferenceProfile?.id === profile.id }"
                        @click="applyNamedPreferenceProfile(profile.id)"
                      >
                        <span class="saved-profile-name">{{ profile.name }}</span>
                        <small class="saved-profile-summary">{{ profile.summary }}</small>
                      </button>
                    </div>

                    <p v-if="savedPreferenceProfiles.length === 0" class="conversation-empty mt-2">
                      No saved preference profile found. Add profile entries from Profile page.
                    </p>
                  </article>
                </transition>

                <transition name="drawer-slide">
                  <article v-if="showPreferencesModal" class="preferences-drawer glass-card" @click.stop>
                    <div class="preferences-head">
                      <h3>Edit Trip Preferences</h3>
                      <button type="button" class="prefs-close" @click="closePreferencesModal">x</button>
                    </div>

                    <p class="preferences-note">
                      Update trip preferences for this chat only. To create or edit saved named profiles, use the Profile page.
                    </p>

                    <div class="control-grid mt-3">
                      <label>
                        <span>Origin</span>
                        <input
                          class="form-input"
                          :value="preferenceDraft.origin"
                          @input="updatePreferenceDraft({ origin: $event.target.value })"
                        />
                      </label>

                      <label>
                        <span>Destination</span>
                        <input
                          class="form-input"
                          :value="preferenceDraft.destination"
                          @input="updatePreferenceDraft({ destination: $event.target.value })"
                        />
                      </label>

                      <label>
                        <span>Days</span>
                        <input
                          class="form-input"
                          type="number"
                          min="2"
                          max="15"
                          :value="preferenceDraft.days"
                          @input="updatePreferenceDraft({ days: Number($event.target.value || preferenceDraft.days) })"
                        />
                      </label>

                      <label>
                        <span>Travelers</span>
                        <input
                          class="form-input"
                          type="number"
                          min="1"
                          max="8"
                          :value="preferenceDraft.travelers"
                          @input="updatePreferenceDraft({ travelers: Number($event.target.value || preferenceDraft.travelers) })"
                        />
                      </label>

                      <label>
                        <span>Style</span>
                        <select class="form-select" :value="preferenceDraft.style" @change="updatePreferenceDraft({ style: $event.target.value })">
                          <option value="Balanced">Balanced</option>
                          <option value="Budget">Budget</option>
                          <option value="Comfort">Comfort</option>
                          <option value="Luxury">Luxury</option>
                          <option value="Adventure">Adventure</option>
                        </select>
                      </label>

                      <label>
                        <span>Transport</span>
                        <select class="form-select" :value="preferenceDraft.travelMode" @change="updatePreferenceDraft({ travelMode: $event.target.value })">
                          <option value="Flight">Flight</option>
                          <option value="Train">Train</option>
                          <option value="Bus">Bus</option>
                          <option value="Car">Car</option>
                          <option value="Bike">Bike</option>
                        </select>
                      </label>

                      <label>
                        <span>Stay</span>
                        <select class="form-select" :value="preferenceDraft.stayPreference" @change="updatePreferenceDraft({ stayPreference: $event.target.value })">
                          <option value="hostel">Hostel</option>
                          <option value="budget">Budget</option>
                          <option value="mid-range">Mid-range</option>
                          <option value="premium">Premium</option>
                          <option value="luxury">Luxury</option>
                        </select>
                      </label>

                      <label>
                        <span>Food</span>
                        <select class="form-select" :value="preferenceDraft.foodPreference" @change="updatePreferenceDraft({ foodPreference: $event.target.value })">
                          <option value="street">Street</option>
                          <option value="local">Local</option>
                          <option value="mixed">Mixed</option>
                          <option value="fine-dining">Fine Dining</option>
                        </select>
                      </label>

                      <label>
                        <span>Total Budget Cap ({{ activeCurrencyCode }})</span>
                        <small class="budget-help">{{ budgetLocalHint }}</small>
                        <input
                          class="form-input"
                          type="number"
                          :min="budgetMinLocal"
                          :max="budgetMaxLocal"
                          step="50"
                          :value="toLocalBudget(preferenceDraft.maxBudget)"
                          @input="updatePreferenceDraft({ maxBudget: toUsdBudget(Number($event.target.value || toLocalBudget(preferenceDraft.maxBudget))) })"
                        />
                      </label>
                    </div>

                    <div class="preferences-actions mt-4">
                      <button type="button" class="btn btn-outline" :disabled="loading" @click="resetPreferencesToDefaults">Reset Defaults</button>
                      <button type="button" class="btn btn-outline" :disabled="loading" @click="closePreferencesModal">Cancel</button>
                      <button type="button" class="btn btn-primary" :disabled="loading" @click="applyPreferences">Apply Preferences</button>
                    </div>
                  </article>
                </transition>
              </div>
            </div>
          </div>

          <div class="preference-strip mt-2">
            <p>
              <strong>AI understood from your prompt:</strong> {{ preferenceSummary }}
            </p>
            <span class="preference-lock" :class="{ active: preferencesLocked }">
              {{ preferencesLocked ? "Manual Override On" : "Auto From Chat" }}
            </span>
          </div>

          <p v-if="conversation.length === 0 && !loading" class="conversation-empty mt-2">
            Start chatting with your trip request. Planner AI will respond here with suggestions and plan context.
          </p>

          <div v-else ref="conversationListRef" class="conversation-list mt-3">
            <article
              v-for="message in conversation"
              :key="message.id"
              class="chat-message"
              :class="message.role"
            >
              <div class="chat-meta">
                <strong>{{ message.role === "user" ? "You" : "Planner" }}</strong>
                <small>{{ message.at }}</small>
              </div>
              <p>{{ message.text }}</p>
            </article>

            <article v-if="loading" class="chat-message assistant typing">
              <div class="chat-meta">
                <strong>Planner</strong>
                <small>thinking...</small>
              </div>
              <p>Reading your prompt, understanding preferences, and drafting your plan...</p>
            </article>
          </div>

          <div class="chat-composer mt-3">
            <textarea
              v-model="promptInput"
              class="chat-composer-input"
              rows="2"
              placeholder="Type your trip message... for example: plan 6 days in Bali for couple, total budget under 1,20,000"
              @keydown.enter.exact.prevent="handleGenerate"
            ></textarea>
            <button type="button" class="btn btn-primary chat-send-btn" :disabled="loading" @click="handleGenerate">
              {{ loading ? "Sending..." : "Send" }}
            </button>
          </div>
          <p class="chat-composer-hint">Press Enter to send | Shift+Enter for next line</p>
          <p v-if="plannerError" class="planner-error mt-2">{{ plannerError }}</p>
          <p v-if="offlineDraftMessage" class="offline-message mt-2">{{ offlineDraftMessage }}</p>
          <p v-if="groupShareStatus" class="group-share-message mt-2">{{ groupShareStatus }}</p>
        </article>
      </section>

      <section class="result-column">
        <article v-if="loading" class="glass-card loading-card">
          <div class="spinner"></div>
          <p>AI planner is building your itinerary and suggestions...</p>
        </article>

        <article v-else-if="!hasResults" class="glass-card empty-card">
          <h3>Ready when you are</h3>
          <p>Send a natural prompt and I will return a clean, actionable plan.</p>
        </article>

        <article v-else class="glass-card result-card">
          <PlanComparisonView
            v-if="generatedPlanOptions.length > 0"
            :options="generatedPlanOptions"
            :selected-plan-id="selectedPlanId"
            :loading="loading"
            @select-plan="selectGeneratedPlan"
          />

          <div v-if="selectedPlan" class="selected-plan-strip mt-4">
            <span class="selected-label">Selected: {{ selectedPlan.label }}</span>
            <span class="selected-score">Rank #{{ selectedPlan.rank }} • Score {{ selectedPlan.totalScore }}/100</span>
          </div>

          <div class="result-header">
            <div>
              <span class="tagline">{{ activeItinerary.tagline }}</span>
              <h2>{{ activeItinerary.destination }}</h2>
              <p>{{ activeItinerary.summary }}</p>
            </div>

            <div class="result-actions">
              <button
                type="button"
                class="btn btn-outline"
                :disabled="!canSavePlan"
                @click="handleSaveOfflineDraft"
              >
                Save Offline Draft
              </button>

              <button
                type="button"
                class="btn btn-outline"
                :disabled="!canSavePlan"
                @click="handleCreateGroupTrip"
              >
                Create Group Trip
              </button>

              <button
                type="button"
                class="btn btn-outline"
                :class="{ saved: saveStatus }"
                :disabled="!canSavePlan"
                @click="handleSaveTrip"
              >
                {{ saveStatus ? "Saved" : "Save Trip" }}
              </button>
            </div>
          </div>

          <div v-if="assistantReply" class="assistant-reply-card mt-4">
            <h3>Assistant Response</h3>
            <p>{{ assistantReply }}</p>
          </div>

          <div class="assistant-suggestion-card mt-4">
            <h4>Applied Preferences</h4>
            <ul class="suggestion-list">
              <li v-for="item in appliedPreferenceRows" :key="item">{{ item }}</li>
            </ul>
          </div>

          <div v-if="assistantSuggestions.length > 0" class="assistant-suggestion-card mt-4">
            <h4>Suggested Next Moves</h4>
            <ul class="suggestion-list">
              <li v-for="(suggestion, index) in assistantSuggestions" :key="`suggestion-${index}`">{{ suggestion }}</li>
            </ul>
          </div>

          <div class="budget-grid mt-4">
            <article v-if="shouldShowFlights" class="budget-cell">
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
              <span>{{ transportModeBudgetLabel }}</span>
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

          <div class="snapshot-grid mt-4">
            <article class="snapshot-cell">
              <span>Distance</span>
              <strong>{{ tripSnapshot.distance }}</strong>
            </article>
            <article class="snapshot-cell">
              <span>Weather</span>
              <strong v-if="tripSnapshot.weather">{{ tripSnapshot.weather.temp }} · {{ tripSnapshot.weather.humidity }} humidity</strong>
              <strong v-else>{{ tripSnapshotLoading ? "Refreshing..." : "Unavailable" }}</strong>
            </article>
            <article class="snapshot-cell">
              <span>Top Attraction</span>
              <strong>{{ tripSnapshot.attractions[0]?.name || "Not available" }}</strong>
            </article>
            <article class="snapshot-cell">
              <span>Top Hotel</span>
              <strong>{{ tripSnapshot.hotels[0]?.name || "Not available" }}</strong>
            </article>
          </div>

          <RoadtripIntelligencePanel
            v-if="isRoadtripMode(controls.travelMode)"
            class="mt-4"
            :roadtrip="activeRoadtrip"
            :loading="roadtripLoading || loading"
          />

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

          <div class="refinement-card mt-4" v-if="refinementPrompts.length > 0">
            <h4>Refine This Plan</h4>
            <div class="refinement-row">
              <button
                v-for="suggestion in refinementPrompts"
                :key="suggestion"
                type="button"
                class="btn btn-outline"
                :disabled="loading"
                @click="applyRefinementPrompt(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>

  </div>
</template>

<style scoped>
.planner-chat-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 28px;
}

.planner-header h1 {
  margin: 8px 0;
  font-size: clamp(1.9rem, 4vw, 2.7rem);
}

.planner-header p {
  color: var(--color-text-secondary);
  max-width: 760px;
}

.planner-badge {
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

.mt-3 {
  margin-top: 12px;
}

.mt-2 {
  margin-top: 8px;
}

.planner-layout {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 16px;
}

.input-column,
.result-column {
  display: grid;
  gap: 12px;
  align-content: start;
}

.prompt-card,
.recent-card,
.conversation-card,
.loading-card,
.empty-card,
.result-card {
  background: #ffffff !important;
}

.conversation-card {
  position: relative;
  overflow: visible !important;
}

.prompt-card h2,
.recent-card h3,
.conversation-card h3 {
  font-size: 1rem;
}

.memory-card {
  border: 1px solid rgba(2, 132, 199, 0.25);
  background: linear-gradient(160deg, rgba(236, 254, 255, 0.7) 0%, rgba(248, 250, 252, 0.8) 100%) !important;
}

.memory-score {
  font-size: 0.72rem;
  font-weight: 700;
  color: #0f766e;
}

.memory-note {
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  line-height: 1.5;
}

.memory-traits {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.memory-pill {
  border: 1px solid rgba(37, 99, 235, 0.24);
  background: rgba(219, 234, 254, 0.52);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  padding: 5px 10px;
  font-size: 0.7rem;
  font-weight: 700;
}

.memory-pill.muted {
  border-color: var(--color-border);
  background: #ffffff;
  color: var(--color-text-secondary);
}

.saved-profiles-drawer {
  width: min(520px, calc(100vw - 40px));
}

.saved-profile-list {
  display: grid;
  gap: 8px;
}

.saved-profile-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #ffffff;
  padding: 10px;
  text-align: left;
  display: grid;
  gap: 4px;
  cursor: pointer;
}

.saved-profile-item:hover {
  border-color: rgba(37, 99, 235, 0.35);
}

.saved-profile-item.active {
  border-color: rgba(5, 150, 105, 0.45);
  background: rgba(209, 250, 229, 0.45);
}

.saved-profile-name {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--color-text);
}

.saved-profile-summary {
  font-size: 0.74rem;
  color: var(--color-text-secondary);
}

.planner-textarea {
  width: 100%;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  min-height: 160px;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.planner-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.prompt-action-row {
  justify-content: flex-end;
}

.prompt-intro {
  color: var(--color-text-secondary);
  font-size: 0.84rem;
  line-height: 1.55;
}

.context-note-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.context-note {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: rgba(248, 250, 252, 0.8);
  padding: 9px 10px;
}

.context-note strong {
  display: block;
  font-size: 0.74rem;
  color: var(--color-text);
}

.context-note p {
  margin-top: 5px;
  font-size: 0.76rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.planner-error {
  color: #dc2626;
  font-size: 0.82rem;
}

.ai-status {
  color: #92400e;
  font-size: 0.78rem;
}

.offline-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.offline-chip {
  border: 1px solid rgba(5, 150, 105, 0.25);
  border-radius: var(--radius-full);
  background: rgba(209, 250, 229, 0.6);
  color: #047857;
  padding: 5px 9px;
  font-size: 0.68rem;
  font-weight: 700;
}

.offline-chip.offline {
  border-color: rgba(220, 38, 38, 0.25);
  background: rgba(254, 226, 226, 0.72);
  color: #b91c1c;
}

.offline-count {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.offline-message {
  color: #0f766e;
  font-size: 0.82rem;
}

.group-share-message {
  color: #1d4ed8;
  font-size: 0.82rem;
}

.preference-strip {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: rgba(248, 250, 252, 0.82);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.preference-strip p {
  margin: 0;
  font-size: 0.74rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.preference-lock {
  border-radius: var(--radius-full);
  border: 1px solid rgba(37, 99, 235, 0.2);
  background: rgba(219, 234, 254, 0.5);
  color: var(--color-text-secondary);
  padding: 5px 9px;
  font-size: 0.68rem;
  font-weight: 700;
  white-space: nowrap;
}

.preference-lock.active {
  border-color: rgba(5, 150, 105, 0.35);
  background: rgba(209, 250, 229, 0.62);
  color: #047857;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.control-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.77rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.preferences-popover-host {
  position: relative;
}

.card-head small {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.btn-xs {
  font-size: 0.72rem;
  padding: 6px 10px;
}

.recent-list {
  display: grid;
  gap: 8px;
}

.recent-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #ffffff;
  padding: 9px 10px;
  text-align: left;
  display: grid;
  gap: 4px;
  cursor: pointer;
}

.recent-item span {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--color-text);
}

.recent-item small {
  font-size: 0.73rem;
  color: var(--color-text-muted);
}

.recent-item:hover {
  border-color: rgba(37, 99, 235, 0.4);
}

.conversation-empty {
  color: var(--color-text-muted);
  font-size: 0.82rem;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
}

.chat-message {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px;
  background: #ffffff;
  max-width: 88%;
}

.chat-message.user {
  border-color: rgba(37, 99, 235, 0.26);
  background: rgba(239, 246, 255, 0.8);
  margin-left: auto;
}

.chat-message.assistant {
  border-color: rgba(2, 132, 199, 0.25);
  background: rgba(236, 254, 255, 0.8);
  margin-right: auto;
}

.chat-message.typing {
  border-style: dashed;
  opacity: 0.95;
}

.chat-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}

.chat-message.user .chat-meta {
  flex-direction: row-reverse;
}

.chat-meta strong {
  font-size: 0.75rem;
}

.chat-meta small {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.chat-message p {
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--color-text);
}

.chat-message.user p {
  text-align: right;
}

.chat-composer {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: end;
}

.chat-composer-input {
  width: 100%;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-size: 0.86rem;
  line-height: 1.45;
  min-height: 74px;
  max-height: 140px;
  resize: vertical;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.chat-composer-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.chat-send-btn {
  min-width: 94px;
}

.chat-composer-hint {
  margin-top: 6px;
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.loading-card,
.empty-card {
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

.result-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.result-actions {
  display: grid;
  gap: 8px;
  justify-items: end;
}

.selected-plan-strip {
  border: 1px solid rgba(37, 99, 235, 0.28);
  border-radius: var(--radius-md);
  background: rgba(239, 246, 255, 0.72);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.selected-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-primary);
}

.selected-score {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.tagline {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--color-secondary);
  margin-bottom: 4px;
}

.result-header h2 {
  font-size: 1.35rem;
}

.result-header p {
  margin-top: 6px;
  color: var(--color-text-secondary);
  max-width: 700px;
}

.btn.saved {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.45);
}

.assistant-reply-card,
.assistant-suggestion-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px;
  background: #ffffff;
}

.assistant-reply-card h3,
.assistant-suggestion-card h4 {
  font-size: 0.95rem;
  margin-bottom: 8px;
}

.assistant-reply-card p {
  color: var(--color-text-secondary);
  line-height: 1.55;
  font-size: 0.88rem;
}

.suggestion-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.suggestion-list li {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  background: rgba(248, 250, 252, 0.8);
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

.snapshot-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.snapshot-cell {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px;
  background: #ffffff;
}

.snapshot-cell span {
  display: block;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.snapshot-cell strong {
  margin-top: 4px;
  display: block;
  font-size: 0.9rem;
  color: var(--color-text);
}

.itinerary-list {
  display: grid;
  gap: 8px;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  color: var(--color-text);
}

.day-body {
  border-top: 1px solid var(--color-border);
  padding: 10px 12px;
  display: grid;
  gap: 8px;
}

.day-body p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.84rem;
  line-height: 1.5;
}

.food-line {
  color: #0f766e;
}

.refinement-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px;
}

.refinement-card h4 {
  font-size: 0.92rem;
}

.refinement-row {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.preferences-drawer {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  left: auto;
  width: min(460px, calc(100vw - 40px));
  max-height: min(78vh, 720px);
  overflow-y: auto;
  z-index: 60;
  background: #ffffff !important;
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  box-shadow: var(--shadow-xl);
  transform-origin: top right;
}

.preferences-screen-backdrop {
  position: fixed;
  inset: 0;
  z-index: 58;
  border: none;
  background: rgba(15, 23, 42, 0.12);
  cursor: pointer;
}

.preferences-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  position: sticky;
  top: 0;
  background: #ffffff;
  z-index: 2;
  padding-bottom: 8px;
}

.preferences-head h3 {
  font-size: 1.05rem;
}

.prefs-close {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  width: 32px;
  height: 32px;
  background: #ffffff;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.preferences-note {
  margin-top: 8px;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.budget-help {
  margin-top: 4px;
  font-size: 0.68rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.preferences-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.16s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

@media (max-width: 1080px) {
  .planner-layout {
    grid-template-columns: 1fr;
  }

  .preferences-drawer {
    width: min(460px, calc(100vw - 24px));
    max-height: none;
    border-left-width: 1px;
  }
}

@media (max-width: 760px) {
  .context-note-grid,
  .control-grid,
  .budget-grid,
  .snapshot-grid {
    grid-template-columns: 1fr;
  }

  .preference-strip {
    flex-direction: column;
    align-items: flex-start;
  }

  .selected-plan-strip {
    flex-direction: column;
    align-items: flex-start;
  }

  .result-header {
    flex-direction: column;
  }

  .result-actions {
    width: 100%;
    justify-items: stretch;
  }

  .action-row {
    flex-direction: column;
    align-items: stretch;
  }

  .chat-composer {
    grid-template-columns: 1fr;
  }

  .preferences-actions {
    justify-content: stretch;
  }
}
</style>
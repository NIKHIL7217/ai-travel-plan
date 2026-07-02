<script setup>
import { computed, onMounted, ref } from "vue";
import { useAuthStore } from "../stores/auth";
import { useOfflineStore } from "../stores/offline";
import { usePlannerSessionStore } from "../stores/plannerSession";
import { getSavedTripsFromDb } from "../services/firebase";
import { generateRoadtripEngine, isRoadtripMode, estimateFuel, estimateToll, buildRouteStops } from "../modules/roadtrip";
import { extractTripIntent } from "../services/gemini";
import { getFuelPriceInfo, getTollPricesForRoute } from "../services/fuel-prices";
import { userLocation, detectUserLocation } from "../services/location";
// import RoadtripIntelligencePanel from "../features/roadtrip/RoadtripIntelligencePanel.vue";
import InteractiveTripMap from "../features/maps/InteractiveTripMap.vue";

const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const plannerSessionStore = usePlannerSessionStore();

const tripPrompt = ref("");
const controls = ref({
  origin: "Current Location",
  destination: "",
  travelMode: "Car",
  fuelType: "Petrol",
  days: 5,
  travelers: 2
});

// Vehicle mileage settings
const vehicleMileage = ref({
  enabled: false,
  mileage: 0
});

const showFuelPriceInfo = ref(false);
const detailedTollInfo = ref(null);

const FUEL_BY_MODE = {
  Car: ["Petrol", "Diesel", "CNG", "Electric"],
  Bike: ["Petrol", "Diesel", "Electric"],
  Bus: ["Diesel", "CNG", "Electric"]
};

const loading = ref(false);
const parsing = ref(false);
const plannerError = ref("");
const roadtrip = ref(null);
const routeStops = ref({ energyStops: [], attractionStops: [], foodStops: [] });
const selectedStopIds = ref([]);
const recentTrips = ref([]);
const offlineDraftMessage = ref("");

const fuelChoices = computed(() => FUEL_BY_MODE[controls.value.travelMode] || FUEL_BY_MODE.Car);
const isElectric = computed(() => String(controls.value.fuelType).toLowerCase() === "electric");
const conditionLevel = computed(() => roadtrip.value?.roadConditions?.level || "moderate");
const distanceKm = computed(() => Number(roadtrip.value?.mapTelemetry?.distanceKm || 0));
const driveHours = computed(() => Number(roadtrip.value?.scenicRoutePlan?.driveHours || 0));

// Custom mileage object to pass to estimateFuel
const customMileageConfig = computed(() => {
  if (vehicleMileage.value.enabled && vehicleMileage.value.mileage > 0) {
    return {
      fuelType: controls.value.fuelType,
      mileage: Number(vehicleMileage.value.mileage)
    };
  }
  return null;
});

const fuelEstimation = computed(() =>
  distanceKm.value
    ? estimateFuel(distanceKm.value, controls.value.travelMode, conditionLevel.value, controls.value.travelers, customMileageConfig.value)
    : null
);

const selectedFuelOption = computed(() => {
  const options = fuelEstimation.value?.options || [];
  return options.find((option) => option.type === controls.value.fuelType) || fuelEstimation.value?.recommended || null;
});

const tollEstimation = computed(() =>
  distanceKm.value ? estimateToll(distanceKm.value, controls.value.travelMode, conditionLevel.value) : null
);

// Get real-time fuel price info
const currentFuelPriceInfo = computed(() => {
  return getFuelPriceInfo(controls.value.fuelType);
});

const allStops = computed(() => [
  ...routeStops.value.energyStops,
  ...routeStops.value.attractionStops,
  ...routeStops.value.foodStops
]);

const selectedStops = computed(() => allStops.value.filter((stop) => selectedStopIds.value.includes(stop.id)));

function addCostForStop(stop) {
  const travelers = Number(controls.value.travelers || 1);
  if (stop.category === "food") {
    return Math.round((Number(stop.averagePrice) || 300) * travelers);
  }
  if (stop.category === "attraction") {
    return Math.round(250 * travelers);
  }
  return 0;
}

const energyCost = computed(() => Number(selectedFuelOption.value?.totalCost || 0));
const tollCost = computed(() => Number(tollEstimation.value?.estimated || 0));
const stopsCost = computed(() => selectedStops.value.reduce((sum, stop) => sum + addCostForStop(stop), 0));
const totalTripCost = computed(() => energyCost.value + tollCost.value + stopsCost.value);

function categoryLabel(category) {
  if (category === "ev") return "Charging stop";
  if (category === "fuel") return "Fuel stop";
  if (category === "food") return "Food & rest";
  return "Attraction";
}

function mapTypeFor(category) {
  if (category === "food") return "food";
  if (category === "attraction") return "attraction";
  return "stop";
}

const mapPoints = computed(() => {
  const telemetry = roadtrip.value?.mapTelemetry;
  const origin = telemetry?.originCoords;
  const destination = telemetry?.destinationCoords;
  if (!origin || !destination) {
    return [];
  }

  const start = { lat: Number(origin.lat), lng: Number(origin.lng), label: roadtrip.value.origin, sublabel: "Start", type: "start" };
  const end = { lat: Number(destination.lat), lng: Number(destination.lng), label: roadtrip.value.destination, sublabel: "Destination", type: "end" };
  const middle = selectedStops.value
    .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng))
    .slice()
    .sort((a, b) => a.kmFromStart - b.kmFromStart)
    .map((stop) => ({ lat: stop.lat, lng: stop.lng, label: stop.name, sublabel: categoryLabel(stop.category), type: mapTypeFor(stop.category) }));

  return [start, ...middle, end];
});

function isStopSelected(id) {
  return selectedStopIds.value.includes(id);
}

function toggleStop(id) {
  if (selectedStopIds.value.includes(id)) {
    selectedStopIds.value = selectedStopIds.value.filter((entry) => entry !== id);
  } else {
    selectedStopIds.value = [...selectedStopIds.value, id];
  }
}

function selectMode(mode) {
  controls.value.travelMode = mode;
  if (!fuelChoices.value.includes(controls.value.fuelType)) {
    controls.value.fuelType = fuelChoices.value[0];
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

async function loadRecentTrips() {
  if (!authStore.user?.uid) {
    recentTrips.value = [];
    return;
  }
  try {
    const trips = await getSavedTripsFromDb(authStore.user.uid);
    recentTrips.value = [...trips]
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, 5);
  } catch (_error) {
    recentTrips.value = [];
  }
}

function hydrateFromTrip(trip) {
  if (!trip) {
    return;
  }
  controls.value = {
    ...controls.value,
    origin: trip.origin || controls.value.origin,
    destination: trip.destination || controls.value.destination,
    travelMode: isRoadtripMode(trip.travelMode) ? trip.travelMode : "Car",
    days: Number(trip.days || controls.value.days),
    travelers: Number(trip.travelers || controls.value.travelers)
  };
  if (!fuelChoices.value.includes(controls.value.fuelType)) {
    controls.value.fuelType = fuelChoices.value[0];
  }
}

async function applyPrompt() {
  const prompt = String(tripPrompt.value || "").trim();
  if (!prompt) {
    return;
  }
  parsing.value = true;
  plannerError.value = "";
  try {
    const intent = await extractTripIntent(prompt, controls.value).catch(() => ({ patch: {} }));
    const patch = intent?.patch || {};
    if (patch.origin) controls.value.origin = patch.origin;
    if (patch.destination) controls.value.destination = patch.destination;
    if (patch.days) controls.value.days = Number(patch.days);
    if (patch.travelers) controls.value.travelers = Number(patch.travelers);
    if (patch.travelMode && isRoadtripMode(patch.travelMode)) {
      controls.value.travelMode = patch.travelMode;
    }
    if (/electric|ev\b|charging/i.test(prompt)) {
      controls.value.fuelType = "Electric";
    } else if (/diesel/i.test(prompt)) {
      controls.value.fuelType = "Diesel";
    } else if (/cng/i.test(prompt)) {
      controls.value.fuelType = "CNG";
    }
    if (!fuelChoices.value.includes(controls.value.fuelType)) {
      controls.value.fuelType = fuelChoices.value[0];
    }
  } finally {
    parsing.value = false;
  }
  await handleGenerateRoadtrip();
}

async function handleGenerateRoadtrip() {
  plannerError.value = "";

  const destination = String(controls.value.destination || "").trim();
  if (!destination) {
    plannerError.value = "Destination batao (ya prompt me likho) tabhi route plan ban paayega.";
    return;
  }
  if (!isRoadtripMode(controls.value.travelMode)) {
    plannerError.value = "Roadtrip ke liye Car, Bike, ya Bus choose karo.";
    return;
  }

  loading.value = true;
  selectedStopIds.value = [];
  routeStops.value = { energyStops: [], attractionStops: [], foodStops: [] };

  try {
    roadtrip.value = await generateRoadtripEngine({
      origin: String(controls.value.origin || "Current Location").trim() || "Current Location",
      destination,
      travelMode: controls.value.travelMode,
      days: Number(controls.value.days || 5),
      travelers: Number(controls.value.travelers || 2)
    });

    const telemetry = roadtrip.value?.mapTelemetry;
    routeStops.value = await buildRouteStops({
      originCoords: telemetry?.originCoords,
      destinationCoords: telemetry?.destinationCoords,
      distanceKm: Number(telemetry?.distanceKm || 0),
      fuelType: controls.value.fuelType,
      destinationName: destination
    });

    // Auto-select fuel/charging stops (needed for the journey); attractions and
    // food remain optional add-ons the user can toggle to update the cost.
    selectedStopIds.value = routeStops.value.energyStops.map((stop) => stop.id);

    plannerSessionStore.setActiveContext({
      origin: controls.value.origin,
      destination,
      summary: "Interactive roadtrip planned with live route stops and cost.",
      style: "Roadtrip",
      travelMode: controls.value.travelMode,
      days: Number(controls.value.days || 5),
      budgetTotal: totalTripCost.value,
      itineraryPreview: routeStops.value.attractionStops.map((stop) => stop.name).slice(0, 3)
    });
  } catch (error) {
    plannerError.value = error?.message || "Roadtrip plan generate nahi ho paaya. Dobara try karo.";
    roadtrip.value = null;
  } finally {
    loading.value = false;
  }
}

function saveRoadtripOfflineDraft() {
  if (!roadtrip.value) {
    return;
  }
  offlineStore.queueDraft({
    source: "roadtrip",
    destination: controls.value.destination,
    days: Number(controls.value.days || 0),
    travelMode: controls.value.travelMode,
    budgetTotal: totalTripCost.value,
    payload: {
      origin: controls.value.origin,
      destination: controls.value.destination,
      days: Number(controls.value.days || 0),
      travelers: Number(controls.value.travelers || 0),
      travelMode: controls.value.travelMode,
      fuelType: controls.value.fuelType,
      selectedStops: selectedStops.value,
      totalTripCost: totalTripCost.value,
      roadtripIntelligence: roadtrip.value
    }
  });
  offlineDraftMessage.value = "Roadtrip draft queued for offline sync.";
  setTimeout(() => {
    offlineDraftMessage.value = "";
  }, 2200);
}

function queueRoadtripOfflinePack(type) {
  if (!roadtrip.value) {
    return;
  }
  const payloadBase = {
    origin: controls.value.origin,
    destination: controls.value.destination,
    days: Number(controls.value.days || 0),
    travelers: Number(controls.value.travelers || 0),
    travelMode: controls.value.travelMode,
    updatedAt: Date.now()
  };

  if (type === "maps") {
    offlineStore.queueOfflinePack({
      type: "maps",
      title: `${controls.value.destination} road map`,
      source: "roadtrip",
      payload: { ...payloadBase, mapPoints: mapPoints.value, telemetry: roadtrip.value?.mapTelemetry || null }
    });
    offlineDraftMessage.value = "Roadtrip maps pack saved.";
  }

  if (type === "hotels") {
    offlineStore.queueOfflinePack({
      type: "hotels",
      title: `${controls.value.destination} stay stops`,
      source: "roadtrip",
      payload: { ...payloadBase, foodStops: routeStops.value.foodStops }
    });
    offlineDraftMessage.value = "Roadtrip stays pack saved.";
  }

  if (type === "emergency") {
    offlineStore.queueOfflinePack({
      type: "emergency",
      title: `${controls.value.destination} emergency route`,
      source: "roadtrip",
      payload: { ...payloadBase, roadConditions: roadtrip.value?.roadConditions || null }
    });
    offlineDraftMessage.value = "Roadtrip emergency pack saved.";
  }

  setTimeout(() => {
    offlineDraftMessage.value = "";
  }, 2200);
}

onMounted(async () => {
  await authStore.initAuth();
  offlineStore.initForUser(authStore.user?.uid || "guest");
  await loadRecentTrips();
  // Detect user location for real-time fuel prices
  await detectUserLocation({ allowGeolocationPrompt: false });
});

// Show detailed toll info
async function showTollBreakdown() {
  if (!roadtrip.value) return;
  
  const routeInfo = {
    distanceKm: distanceKm.value,
    travelMode: controls.value.travelMode,
    routeName: `${roadtrip.value.origin} to ${roadtrip.value.destination}`
  };
  
  detailedTollInfo.value = await getTollPricesForRoute(routeInfo);
}

</script>

<template>
  <div class="roadtrip-page container animate-fade-in" style="padding-top: 100px;">
    <div class="roadtrip-header">
      <span class="roadtrip-badge">ROADTRIP MODE</span>
      <h1>Plan your drive, stop-by-stop</h1>
      <p>Batao kahan ja rahe ho aur kis vehicle se — hum route, fuel/charging stops, raste ke famous spots aur real-time trip cost sab dikha denge.</p>
      <div class="offline-strip mt-2">
        <span class="offline-chip" :class="{ offline: !offlineStore.isOnline }">
          {{ offlineStore.isOnline ? "Online Sync Active" : "Offline Mode Active" }}
        </span>
        <span v-if="offlineStore.pendingCount > 0" class="offline-count">
          {{ offlineStore.pendingCount }} pending draft(s)
        </span>
      </div>
    </div>

    <!-- Prompt + controls -->
    <section class="glass-card prompt-card mt-6">
      <label class="prompt-field">
        <span>Where are you going?</span>
        <textarea
          v-model="tripPrompt"
          class="form-input prompt-input"
          rows="2"
          placeholder="e.g. Main Delhi se Jaipur khud ki electric car se ghumne ja raha hun, 2 log, 3 din"
          @keydown.enter.exact.prevent="applyPrompt"
        ></textarea>
      </label>

      <div class="mode-row">
        <div class="mode-group">
          <span class="mode-label">Vehicle</span>
          <div class="chip-row">
            <button
              v-for="mode in ['Car', 'Bike', 'Bus']"
              :key="mode"
              type="button"
              class="mode-chip"
              :class="{ active: controls.travelMode === mode }"
              @click="selectMode(mode)"
            >{{ mode }}</button>
          </div>
        </div>

        <div class="mode-group">
          <span class="mode-label">Fuel / Energy</span>
          <div class="chip-row">
            <button
              v-for="fuel in fuelChoices"
              :key="fuel"
              type="button"
              class="mode-chip"
              :class="{ active: controls.fuelType === fuel }"
              @click="controls.fuelType = fuel"
            >{{ fuel }}</button>
          </div>
        </div>
      </div>

      <div class="control-grid mt-3">
        <label>
          <span>Origin</span>
          <input class="form-input" :value="controls.origin" @input="controls.origin = $event.target.value" />
        </label>
        <label>
          <span>Destination</span>
          <input class="form-input" :value="controls.destination" @input="controls.destination = $event.target.value" />
        </label>
        <label>
          <span>Days</span>
          <input class="form-input" type="number" min="1" max="20" :value="controls.days" @input="controls.days = Number($event.target.value || 5)" />
        </label>
        <label>
          <span>Travelers</span>
          <input class="form-input" type="number" min="1" max="10" :value="controls.travelers" @input="controls.travelers = Number($event.target.value || 2)" />
        </label>
      </div>

      <!-- Vehicle Mileage/Average Section -->
      <div class="vehicle-mileage-section mt-4">
        <div class="mileage-header">
          <label class="checkbox-label">
            <input type="checkbox" v-model="vehicleMileage.enabled" />
            <span>Use my vehicle's actual average</span>
          </label>
          <small>Apni gaadi ka real average dalo for accurate fuel calculation</small>
        </div>
        <div v-if="vehicleMileage.enabled" class="mileage-input-row">
          <label>
            <span>Your {{ controls.fuelType }} mileage</span>
            <div class="input-with-unit">
              <input 
                class="form-input" 
                type="number" 
                min="1" 
                step="0.1" 
                :placeholder="isElectric ? 'km per kWh' : 'km per liter'" 
                v-model.number="vehicleMileage.mileage" 
              />
              <span class="input-unit">{{ isElectric ? 'km/kWh' : (controls.fuelType === 'CNG' ? 'km/kg' : 'km/L') }}</span>
            </div>
          </label>
        </div>
      </div>

      <div class="action-row mt-4">
        <button type="button" class="btn btn-primary" :disabled="loading || parsing" @click="applyPrompt">
          {{ parsing ? "Reading prompt…" : loading ? "Planning route…" : "Plan my trip" }}
        </button>
        <button type="button" class="btn btn-outline" :disabled="loading" @click="handleGenerateRoadtrip">
          Use inputs only
        </button>
      </div>

      <p v-if="plannerError" class="planner-error mt-2">{{ plannerError }}</p>
      <p v-if="offlineDraftMessage" class="offline-message mt-2">{{ offlineDraftMessage }}</p>
    </section>

    <!-- Results -->
    <div v-if="roadtrip" class="result-grid mt-6">
      <div class="result-main">
        <section class="glass-card map-card">
          <div class="map-head">
            <div>
              <h2>{{ roadtrip.origin }} → {{ roadtrip.destination }}</h2>
              <small>{{ roadtrip.mapTelemetry.routeSummary }}</small>
            </div>
            <span class="mode-tag">{{ controls.travelMode }} · {{ controls.fuelType }}</span>
          </div>

          <InteractiveTripMap v-if="mapPoints.length" :points="mapPoints" :show-route="true" height="340px" class="roadtrip-map" />

          <div class="route-stats">
            <div class="stat stat-distance">
              <span>Total Distance</span>
              <strong class="distance-value">{{ Math.round(distanceKm) }} km</strong>
              <small class="distance-sub">Real distance via {{ roadtrip.mapTelemetry.trafficLevel || 'normal' }} traffic</small>
            </div>
            <div class="stat"><span>Drive time</span><strong>{{ driveHours.toFixed(1) }} hrs</strong></div>
            <div class="stat"><span>Road</span><strong class="capitalize">{{ conditionLevel }}</strong></div>
            <div class="stat"><span>Traffic</span><strong>{{ roadtrip.mapTelemetry.congestionPercent }}%</strong></div>
          </div>
        </section>

        <!-- Fuel / charging stops -->
        <section class="glass-card stops-card">
          <div class="stops-head">
            <h3>{{ isElectric ? "⚡ Charging stops" : "⛽ Fuel stops" }} on the way</h3>
            <small>Auto-selected — deselect any you don't need</small>
          </div>
          <div v-if="routeStops.energyStops.length" class="stops-grid">
            <button
              v-for="stop in routeStops.energyStops"
              :key="stop.id"
              type="button"
              class="stop-card"
              :class="{ selected: isStopSelected(stop.id) }"
              @click="toggleStop(stop.id)"
            >
              <div class="stop-top">
                <span class="stop-name">{{ stop.name }}</span>
                <span class="stop-check">{{ isStopSelected(stop.id) ? "✓" : "+" }}</span>
              </div>
              <small class="stop-meta">~{{ stop.kmFromStart }} km · {{ stop.chargingType || 'Petrol / Diesel' }}</small>
              <div v-if="stop.nearby.length" class="stop-nearby">
                <span class="nearby-label">Nearby:</span>
                <span v-for="n in stop.nearby" :key="n.name" class="nearby-pill">{{ n.name }}</span>
              </div>
            </button>
          </div>
          <p v-else class="empty-hint">Is route pe live {{ isElectric ? 'charging' : 'fuel' }} stations nahi mile. Highway pe standard stations available honge.</p>
        </section>

        <!-- Attractions -->
        <section class="glass-card stops-card">
          <div class="stops-head">
            <h3>📸 Famous spots to stop at</h3>
            <small>Select to add to your route &amp; cost</small>
          </div>
          <div v-if="routeStops.attractionStops.length" class="stops-grid">
            <button
              v-for="stop in routeStops.attractionStops"
              :key="stop.id"
              type="button"
              class="stop-card"
              :class="{ selected: isStopSelected(stop.id) }"
              @click="toggleStop(stop.id)"
            >
              <div class="stop-top">
                <span class="stop-name">{{ stop.name }}</span>
                <span class="stop-check">{{ isStopSelected(stop.id) ? "✓" : "+" }}</span>
              </div>
              <small class="stop-meta">~{{ stop.kmFromStart }} km <template v-if="stop.rating">· ⭐ {{ stop.rating }}</template></small>
              <small class="stop-add">approx ₹{{ formatMoney(addCostForStop(stop)) }} for {{ controls.travelers }}</small>
            </button>
          </div>
          <p v-else class="empty-hint">Route pe live attractions nahi mile — destination reach karke explore section dekho.</p>
        </section>

        <!-- Food & rest -->
        <section class="glass-card stops-card">
          <div class="stops-head">
            <h3>🍽️ Food &amp; rest points</h3>
            <small>Mid-route dhaba/cafe options</small>
          </div>
          <div v-if="routeStops.foodStops.length" class="stops-grid">
            <button
              v-for="stop in routeStops.foodStops"
              :key="stop.id"
              type="button"
              class="stop-card"
              :class="{ selected: isStopSelected(stop.id) }"
              @click="toggleStop(stop.id)"
            >
              <div class="stop-top">
                <span class="stop-name">{{ stop.name }}</span>
                <span class="stop-check">{{ isStopSelected(stop.id) ? "✓" : "+" }}</span>
              </div>
              <small class="stop-meta">{{ stop.desc || 'Restaurant' }} <template v-if="stop.rating">· ⭐ {{ stop.rating }}</template></small>
              <small class="stop-add">approx ₹{{ formatMoney(addCostForStop(stop)) }} for {{ controls.travelers }}</small>
            </button>
          </div>
          <p v-else class="empty-hint">Mid-route food spots nahi mile.</p>
        </section>
      </div>

      <!-- Live cost sidebar -->
      <aside class="result-side">
        <section class="glass-card cost-card">
          <h3>Live trip cost</h3>
          <div class="cost-total">₹{{ formatMoney(totalTripCost) }}</div>
          <small class="cost-sub">{{ controls.travelMode }} · {{ controls.fuelType }} · {{ controls.travelers }} traveler(s)</small>
          <small class="location-tag">📍 Prices based on {{ userLocation.city }}, {{ userLocation.state }}</small>

          <div class="fuel-picker mt-3">
            <span class="picker-label">{{ isElectric ? "Charging energy" : "Fuel type" }}</span>
            <div class="chip-row">
              <button
                v-for="option in (fuelEstimation?.options || [])"
                :key="option.type"
                type="button"
                class="mode-chip small"
                :class="{ active: controls.fuelType === option.type }"
                @click="controls.fuelType = option.type"
              >{{ option.type }}</button>
            </div>
          </div>

          <ul class="cost-breakdown mt-3">
            <li class="fuel-cost-row">
              <span>
                {{ isElectric ? "Charging" : "Fuel" }}
                <template v-if="selectedFuelOption">
                  ({{ selectedFuelOption.usage }} {{ selectedFuelOption.unit }})
                  <span v-if="selectedFuelOption.isCustomMileage" class="custom-badge">Your avg</span>
                </template>
                <button 
                  type="button" 
                  class="info-btn" 
                  @click="showFuelPriceInfo = !showFuelPriceInfo"
                  :title="'Real-time ' + controls.fuelType + ' price'"
                >ⓘ</button>
              </span>
              <strong>₹{{ formatMoney(energyCost) }}</strong>
            </li>
            <li v-if="showFuelPriceInfo" class="fuel-price-detail">
              <div class="price-info-box">
                <p><strong>{{ currentFuelPriceInfo.formattedPrice }}</strong> in {{ currentFuelPriceInfo.location }}</p>
                <p class="price-note">Real-time price for {{ controls.fuelType }}</p>
              </div>
            </li>
            <li class="toll-cost-row">
              <span>
                Tolls (est.)
                <button 
                  type="button" 
                  class="info-btn" 
                  @click="showTollBreakdown"
                  title="View toll breakdown"
                >ⓘ</button>
              </span>
              <strong>₹{{ formatMoney(tollCost) }}</strong>
            </li>
            <li v-if="detailedTollInfo" class="toll-detail">
              <div class="toll-info-box">
                <p><strong>{{ detailedTollInfo.tollPlazas }}</strong> toll plazas expected</p>
                <div class="toll-breakdown">
                  <div v-for="(plaza, idx) in detailedTollInfo.breakdown" :key="idx" class="toll-item">
                    <span>{{ plaza.name }}</span>
                    <strong>₹{{ formatMoney(plaza.amount) }}</strong>
                  </div>
                </div>
              </div>
            </li>
            <li><span>Selected stops ({{ selectedStops.filter((s) => addCostForStop(s) > 0).length }})</span><strong>₹{{ formatMoney(stopsCost) }}</strong></li>
            <li class="total-row"><span>Total Road Trip Cost</span><strong>₹{{ formatMoney(totalTripCost) }}</strong></li>
          </ul>

          <div class="side-actions mt-3">
            <button type="button" class="btn btn-outline w-full" @click="saveRoadtripOfflineDraft">Save Offline Draft</button>
            <div class="pack-row">
              <button type="button" class="btn btn-outline" @click="queueRoadtripOfflinePack('maps')">Maps</button>
              <button type="button" class="btn btn-outline" @click="queueRoadtripOfflinePack('hotels')">Stays</button>
              <button type="button" class="btn btn-outline" @click="queueRoadtripOfflinePack('emergency')">Emergency</button>
            </div>
          </div>
        </section>

        <section class="glass-card recent-card" v-if="recentTrips.length > 0">
          <div class="card-head">
            <h3>Reuse Saved Trips</h3>
            <small>Hydrate roadtrip inputs fast</small>
          </div>
          <div class="recent-list mt-3">
            <button v-for="trip in recentTrips" :key="trip.id" type="button" class="recent-item" @click="hydrateFromTrip(trip)">
              <span>{{ trip.destination }}</span>
              <small>{{ trip.days }} days · {{ trip.travelMode || "Car" }}</small>
            </button>
          </div>
        </section>
      </aside>
    </div>

    <!-- <RoadtripIntelligencePanel v-if="roadtrip" class="mt-6" :roadtrip="roadtrip" :loading="loading" /> -->
  </div>
</template>

<style scoped src="./styles/RoadtripPlanner.css"></style>

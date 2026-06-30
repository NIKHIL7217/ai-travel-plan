<script setup>
import { onMounted, ref } from "vue";
import { useAuthStore } from "../stores/auth";
import { useOfflineStore } from "../stores/offline";
import { usePlannerSessionStore } from "../stores/plannerSession";
import { getSavedTripsFromDb } from "../services/firebase";
import { generateRoadtripEngine, isRoadtripMode } from "../modules/roadtrip";
import RoadtripIntelligencePanel from "../features/roadtrip/RoadtripIntelligencePanel.vue";

const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const plannerSessionStore = usePlannerSessionStore();

const controls = ref({
  origin: "Current Location",
  destination: "",
  travelMode: "Car",
  days: 5,
  travelers: 2
});

const loading = ref(false);
const plannerError = ref("");
const roadtrip = ref(null);
const recentTrips = ref([]);
const offlineDraftMessage = ref("");

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
    origin: trip.origin || controls.value.origin,
    destination: trip.destination || controls.value.destination,
    travelMode: isRoadtripMode(trip.travelMode) ? trip.travelMode : "Car",
    days: Number(trip.days || controls.value.days),
    travelers: Number(trip.travelers || controls.value.travelers)
  };
}

async function handleGenerateRoadtrip() {
  plannerError.value = "";

  const destination = String(controls.value.destination || "").trim();
  if (!destination) {
    plannerError.value = "Destination required hai for roadtrip intelligence.";
    return;
  }

  if (!isRoadtripMode(controls.value.travelMode)) {
    plannerError.value = "Roadtrip mode ke liye Car, Bike, ya Bus choose karo.";
    return;
  }

  loading.value = true;
  try {
    roadtrip.value = await generateRoadtripEngine({
      origin: String(controls.value.origin || "Current Location").trim() || "Current Location",
      destination,
      travelMode: controls.value.travelMode,
      days: Number(controls.value.days || 5),
      travelers: Number(controls.value.travelers || 2)
    });

    plannerSessionStore.setActiveContext({
      origin: controls.value.origin,
      destination,
      summary: "Roadtrip intelligence generated from dedicated roadtrip workspace.",
      style: "Roadtrip",
      travelMode: controls.value.travelMode,
      days: Number(controls.value.days || 5),
      budgetTotal: Number(roadtrip.value?.budgetBreakdown?.total || 0),
      itineraryPreview: Array.isArray(roadtrip.value?.dailyRoute)
        ? roadtrip.value.dailyRoute.map((item) => item.headline).filter(Boolean).slice(0, 3)
        : []
    });
  } catch (error) {
    plannerError.value = error?.message || "Roadtrip intelligence generate nahi ho paya.";
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
    budgetTotal: Number(roadtrip.value?.budgetBreakdown?.total || 0),
    payload: {
      origin: controls.value.origin,
      destination: controls.value.destination,
      days: Number(controls.value.days || 0),
      travelers: Number(controls.value.travelers || 0),
      travelMode: controls.value.travelMode,
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
      payload: {
        ...payloadBase,
        route: roadtrip.value?.route || null,
        dailyRoute: roadtrip.value?.dailyRoute || []
      }
    });
    offlineDraftMessage.value = "Roadtrip maps pack saved.";
  }

  if (type === "hotels") {
    offlineStore.queueOfflinePack({
      type: "hotels",
      title: `${controls.value.destination} stay stops`,
      source: "roadtrip",
      payload: {
        ...payloadBase,
        restStops: roadtrip.value?.recommendedStops?.restStops || []
      }
    });
    offlineDraftMessage.value = "Roadtrip stays pack saved.";
  }

  if (type === "emergency") {
    offlineStore.queueOfflinePack({
      type: "emergency",
      title: `${controls.value.destination} emergency route`,
      source: "roadtrip",
      payload: {
        ...payloadBase,
        safetyNotes: roadtrip.value?.safetyNotes || [],
        weatherWindows: roadtrip.value?.weatherWindows || []
      }
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
});
</script>

<template>
  <div class="roadtrip-page container animate-fade-in" style="padding-top: 100px;">
    <div class="roadtrip-header">
      <span class="roadtrip-badge">ROADTRIP MODE</span>
      <h1>Roadtrip Intelligence Studio</h1>
      <p>Plan fuel, tolls, EV stops, scenic windows, and route safety in one immersive workspace.</p>
      <div class="offline-strip mt-2">
        <span class="offline-chip" :class="{ offline: !offlineStore.isOnline }">
          {{ offlineStore.isOnline ? "Online Sync Active" : "Offline Mode Active" }}
        </span>
        <span v-if="offlineStore.pendingCount > 0" class="offline-count">
          {{ offlineStore.pendingCount }} pending draft(s)
        </span>
      </div>
    </div>

    <div class="roadtrip-grid mt-6">
      <section class="glass-card control-card">
        <h2>Roadtrip Inputs</h2>

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
            <span>Travel Mode</span>
            <select class="form-select" :value="controls.travelMode" @change="controls.travelMode = $event.target.value">
              <option value="Car">Car</option>
              <option value="Bike">Bike</option>
              <option value="Bus">Bus</option>
            </select>
          </label>

          <label>
            <span>Days</span>
            <input class="form-input" type="number" min="2" max="20" :value="controls.days" @input="controls.days = Number($event.target.value || 5)" />
          </label>

          <label>
            <span>Travelers</span>
            <input class="form-input" type="number" min="1" max="10" :value="controls.travelers" @input="controls.travelers = Number($event.target.value || 2)" />
          </label>
        </div>

        <div class="action-row mt-4">
          <button type="button" class="btn btn-outline" :disabled="!roadtrip" @click="saveRoadtripOfflineDraft">
            Save Offline Draft
          </button>
          <button type="button" class="btn btn-outline" :disabled="!roadtrip" @click="queueRoadtripOfflinePack('maps')">
            Save Maps Pack
          </button>
          <button type="button" class="btn btn-outline" :disabled="!roadtrip" @click="queueRoadtripOfflinePack('hotels')">
            Save Hotels Pack
          </button>
          <button type="button" class="btn btn-outline" :disabled="!roadtrip" @click="queueRoadtripOfflinePack('emergency')">
            Save Emergency Pack
          </button>
          <button type="button" class="btn btn-primary" :disabled="loading" @click="handleGenerateRoadtrip">
            {{ loading ? "Generating..." : "Generate Roadtrip Intelligence" }}
          </button>
        </div>

        <p v-if="plannerError" class="planner-error mt-2">{{ plannerError }}</p>
        <p v-if="offlineDraftMessage" class="offline-message mt-2">{{ offlineDraftMessage }}</p>
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
    </div>

    <RoadtripIntelligencePanel class="mt-6" :roadtrip="roadtrip" :loading="loading" />
  </div>
</template>

<style scoped src="./styles/RoadtripPlanner.css"></style>

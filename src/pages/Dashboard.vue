<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { getSavedTripsFromDb } from "../services/firebase";
import { formatPrice } from "../services/currency";
import { detectUserLocation, userLocation } from "../services/location";
import { fetchWeather } from "../services/weather";
import { fetchNearbyPlaces } from "../services/places";

const WeatherIntelligenceWidget = defineAsyncComponent(() =>
  import("../features/travel-intelligence").then((mod) => ({ default: mod.WeatherIntelligenceWidget }))
);
const TrafficIntelligenceWidget = defineAsyncComponent(() =>
  import("../features/travel-intelligence").then((mod) => ({ default: mod.TrafficIntelligenceWidget }))
);
const CrowdIntelligenceWidget = defineAsyncComponent(() =>
  import("../features/travel-intelligence").then((mod) => ({ default: mod.CrowdIntelligenceWidget }))
);
const SeasonIntelligenceWidget = defineAsyncComponent(() =>
  import("../features/travel-intelligence").then((mod) => ({ default: mod.SeasonIntelligenceWidget }))
);
const SafetyIntelligenceWidget = defineAsyncComponent(() =>
  import("../features/travel-intelligence").then((mod) => ({ default: mod.SafetyIntelligenceWidget }))
);
const CostIntelligenceWidget = defineAsyncComponent(() =>
  import("../features/travel-intelligence").then((mod) => ({ default: mod.CostIntelligenceWidget }))
);

let travelIntelligencePromise;

async function loadTravelIntelligenceModule() {
  if (!travelIntelligencePromise) {
    travelIntelligencePromise = import("../modules/travel-intelligence");
  }
  return travelIntelligencePromise;
}

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(true);
const trips = ref([]);
const liveLoading = ref(true);
const localWeather = ref(null);
const nearbyHotels = ref([]);
const nearbyRestaurants = ref([]);
const intelligenceLoading = ref(true);
const intelligence = ref(null);
const dashboardError = ref("");
const liveError = ref("");
const intelligenceError = ref("");

const recentTrips = computed(() =>
  [...trips.value]
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 4)
);

const totalBudget = computed(() =>
  trips.value.reduce((sum, trip) => sum + Number(trip?.budget?.total || 0), 0)
);

const totalDays = computed(() =>
  trips.value.reduce((sum, trip) => sum + Number(trip?.days || 0), 0)
);

const loadDashboardData = async () => {
  loading.value = true;
  liveLoading.value = true;
  intelligenceLoading.value = true;
  dashboardError.value = "";
  liveError.value = "";
  intelligenceError.value = "";

  try {
    await authStore.initAuth();
    if (!authStore.user?.uid) {
      router.replace("/login");
      return;
    }

    trips.value = await getSavedTripsFromDb(authStore.user.uid);

    try {
      await detectUserLocation();
      if (userLocation.value?.lat !== null && userLocation.value?.lng !== null) {
        const [weather, hotels, restaurants] = await Promise.all([
          fetchWeather(userLocation.value.lat, userLocation.value.lng),
          fetchNearbyPlaces(userLocation.value.lat, userLocation.value.lng, "lodging", userLocation.value.city),
          fetchNearbyPlaces(userLocation.value.lat, userLocation.value.lng, "restaurant", userLocation.value.city)
        ]);

        localWeather.value = weather;
        nearbyHotels.value = hotels || [];
        nearbyRestaurants.value = restaurants || [];
      }
    } catch (liveDataError) {
      localWeather.value = null;
      nearbyHotels.value = [];
      nearbyRestaurants.value = [];
      liveError.value = "Live location insights are currently unavailable.";
    } finally {
      liveLoading.value = false;
    }

    try {
      const { getTravelIntelligenceDashboard } = await loadTravelIntelligenceModule();

      intelligence.value = await getTravelIntelligenceDashboard({
        location: {
          lat: userLocation.value?.lat,
          lng: userLocation.value?.lng,
          city: userLocation.value?.city,
          country: userLocation.value?.country,
          weather: localWeather.value
        },
        trips: trips.value,
        origin: userLocation.value?.city || userLocation.value?.country || "Current location",
        destination: userLocation.value?.city
          ? `${userLocation.value.city} central district`
          : "city center"
      });
    } catch (intelLoadError) {
      intelligence.value = null;
      intelligenceError.value = "Travel intelligence widgets could not be loaded right now.";
    } finally {
      intelligenceLoading.value = false;
    }
  } catch (error) {
    console.error("Failed to load dashboard:", error);
    dashboardError.value = "Unable to load dashboard data right now.";
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadDashboardData();
});
</script>

<template>
  <div class="dashboard-page container animate-fade-in" style="padding-top: 100px;">
    <div class="welcome-panel">
      <div>
        <span class="hud-badge">USER PANEL</span>
        <h1>Hi, {{ authStore.displayName }}</h1>
        <p>
          Your profile dashboard shows private trip activity, budget footprint, and fast access to planning tools.
        </p>
      </div>
      <button type="button" class="btn btn-outline" @click="router.push('/planner')">Create New Plan</button>
    </div>

    <div v-if="loading" class="stats-grid mt-6">
      <div v-for="n in 4" :key="n" class="stat-card skeleton"></div>
    </div>

    <template v-else>
      <section v-if="dashboardError" class="glass-card panel-error mt-6">
        <h3>Unable to Load Dashboard</h3>
        <p>{{ dashboardError }}</p>
        <button type="button" class="btn btn-primary mt-4" @click="loadDashboardData">Retry</button>
      </section>

      <template v-else>
        <div class="stats-grid mt-6">
          <article class="stat-card glass-card">
            <span>Total Saved Trips</span>
            <strong>{{ trips.length }}</strong>
          </article>
          <article class="stat-card glass-card">
            <span>Total Planned Days</span>
            <strong>{{ totalDays }}</strong>
          </article>
          <article class="stat-card glass-card">
            <span>Budget Footprint</span>
            <strong>{{ formatPrice(totalBudget) }}</strong>
          </article>
          <article class="stat-card glass-card">
            <span>Account Email</span>
            <strong class="small">{{ authStore.user?.email }}</strong>
          </article>
        </div>

        <div class="dashboard-grid mt-8">
          <section class="glass-card quick-actions">
            <h3>Quick Actions</h3>
            <div class="actions-grid mt-4">
              <button type="button" class="btn btn-primary" @click="router.push('/planner')">AI Planner</button>
              <button type="button" class="btn btn-outline" @click="router.push('/saved-trips')">My Saved Trips</button>
              <button type="button" class="btn btn-outline" @click="router.push('/destination')">Explore Destinations</button>
            </div>
          </section>

          <section class="glass-card recent-list">
            <div class="recent-head">
              <h3>Recent Plans</h3>
              <button type="button" class="link-btn" @click="router.push('/saved-trips')">View all</button>
            </div>

            <div v-if="recentTrips.length === 0" class="empty-state">
              <h4>No trips yet</h4>
              <p>Start by creating your first AI itinerary and it will appear here.</p>
            </div>

            <ul v-else class="recent-items">
              <li v-for="trip in recentTrips" :key="trip.id" class="recent-item">
                <div>
                  <h4>{{ trip.destination }}</h4>
                  <p>{{ trip.days }} Days • {{ trip.style }}</p>
                </div>
                <strong>{{ formatPrice(trip?.budget?.total || 0) }}</strong>
              </li>
            </ul>
          </section>
        </div>

        <section class="glass-card live-panel mt-8">
          <div class="live-head">
            <h3>Live Geo Snapshot</h3>
            <span class="live-pill">{{ userLocation.city || userLocation.country || "Unknown location" }}</span>
          </div>

          <div v-if="liveLoading" class="stats-grid mt-4">
            <div v-for="n in 4" :key="n" class="stat-card skeleton"></div>
          </div>

          <div v-else-if="liveError" class="panel-error mt-4">
            <h4>Live Snapshot Unavailable</h4>
            <p>{{ liveError }}</p>
            <button type="button" class="btn btn-outline mt-4" @click="loadDashboardData">Retry Live Data</button>
          </div>

          <div v-else-if="!localWeather && nearbyHotels.length === 0 && nearbyRestaurants.length === 0" class="panel-empty mt-4">
            <h4>No Live Snapshot Available</h4>
            <p>We could not find live weather or nearby places for your current location.</p>
          </div>

          <div v-else class="live-grid mt-4">
            <article class="live-card">
              <span>Current Temperature</span>
              <strong>{{ localWeather?.temp || "N/A" }}</strong>
            </article>
            <article class="live-card">
              <span>Humidity</span>
              <strong>{{ localWeather?.humidity || "N/A" }}</strong>
            </article>
            <article class="live-card">
              <span>Nearby Stays</span>
              <strong>{{ nearbyHotels.length }}</strong>
            </article>
            <article class="live-card">
              <span>Nearby Food Spots</span>
              <strong>{{ nearbyRestaurants.length }}</strong>
            </article>
          </div>
        </section>

        <section class="glass-card intelligence-panel mt-8">
          <div class="live-head">
            <h3>Travel Intelligence Dashboard</h3>
            <span class="live-pill">Independent Widgets</span>
          </div>

          <div v-if="intelligenceLoading" class="stats-grid mt-4">
            <div v-for="n in 3" :key="n" class="stat-card skeleton"></div>
          </div>

          <div v-else-if="intelligenceError" class="panel-error mt-4">
            <h4>Travel Intelligence Unavailable</h4>
            <p>{{ intelligenceError }}</p>
            <button type="button" class="btn btn-outline mt-4" @click="loadDashboardData">Retry Widgets</button>
          </div>

          <div v-else-if="!intelligence" class="panel-empty mt-4">
            <h4>No Intelligence Data</h4>
            <p>Generate a plan or refresh the page to load travel intelligence modules.</p>
          </div>

          <div v-else class="intelligence-grid mt-4">
            <WeatherIntelligenceWidget :data="intelligence?.weather" :loading="intelligenceLoading" />
            <TrafficIntelligenceWidget :data="intelligence?.traffic" :loading="intelligenceLoading" />
            <CrowdIntelligenceWidget :data="intelligence?.crowd" :loading="intelligenceLoading" />
            <SeasonIntelligenceWidget :data="intelligence?.season" :loading="intelligenceLoading" />
            <SafetyIntelligenceWidget :data="intelligence?.safety" :loading="intelligenceLoading" />
            <CostIntelligenceWidget :data="intelligence?.cost" :loading="intelligenceLoading" />
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.welcome-panel {
  border-radius: var(--radius-xl);
  padding: 28px;
  color: white;
  background: linear-gradient(120deg, #0f172a 0%, #1e3a8a 45%, #0ea5e9 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.welcome-panel h1 {
  margin: 8px 0;
  color: white;
  font-size: clamp(1.7rem, 4vw, 2.4rem);
}

.welcome-panel p {
  color: rgba(226, 232, 240, 0.95);
  max-width: 720px;
}

.hud-badge {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #bfdbfe;
}

.mt-6 {
  margin-top: 24px;
}

.mt-8 {
  margin-top: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  min-height: 110px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.stat-card span {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.stat-card strong {
  font-size: 1.5rem;
  letter-spacing: -0.02em;
}

.stat-card strong.small {
  font-size: 1.05rem;
  line-break: anywhere;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 16px;
}

.quick-actions,
.recent-list {
  padding: 22px;
}

.actions-grid {
  display: grid;
  gap: 10px;
}

.recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-weight: 700;
  cursor: pointer;
}

.recent-items {
  margin-top: 12px;
  list-style: none;
  display: grid;
  gap: 10px;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px;
}

.recent-item p {
  color: var(--color-text-secondary);
  font-size: 0.88rem;
  margin-top: 4px;
}

.empty-state {
  margin-top: 18px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 18px;
}

.empty-state p {
  margin-top: 6px;
  color: var(--color-text-secondary);
}

.live-panel {
  padding: 20px;
}

.intelligence-panel {
  padding: 20px;
}

.live-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.live-pill {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
  padding: 5px 10px;
}

.live-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.intelligence-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.live-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.live-card span {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.live-card strong {
  font-size: 1.25rem;
}

.panel-error,
.panel-empty {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  background: #ffffff;
}

.panel-error p,
.panel-empty p {
  margin-top: 6px;
  color: var(--color-text-secondary);
}

@media (max-width: 1050px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .live-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .intelligence-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .welcome-panel {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 520px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .live-grid {
    grid-template-columns: 1fr;
  }

  .intelligence-grid {
    grid-template-columns: 1fr;
  }
}
</style>

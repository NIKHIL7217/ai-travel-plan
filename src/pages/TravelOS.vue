<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { formatPrice } from "../services/currency";
import { detectUserLocation, userLocation } from "../services/location";
import { fetchWeather } from "../services/weather";
import { getSavedTripsFromDb } from "../services/firebase";
import { getSmartRecommendations } from "../modules/recommendations/engine";
import { useAuthStore } from "../stores/auth";
import { useCommunityStore } from "../stores/community";
import { useOfflineStore } from "../stores/offline";
import { useProfileMemoryStore } from "../stores/profileMemory";

const router = useRouter();
const authStore = useAuthStore();
const profileMemoryStore = useProfileMemoryStore();
const communityStore = useCommunityStore();
const offlineStore = useOfflineStore();

const loading = ref(true);
const trips = ref([]);
const weatherSnapshot = ref(null);
const recommendations = ref(null);
const loadError = ref("");

const isAdminUser = computed(() => {
  const email = String(authStore.user?.email || "").toLowerCase();
  return email.includes("admin") || email.endsWith("@wanderai.local");
});

const sidebarItems = [
  { id: "home", label: "Home", to: "/" },
  { id: "trips", label: "Trips", to: "/trips?section=past" },
  { id: "planner", label: "Planner", to: "/planner" },
  { id: "roadtrips", label: "Roadtrips", to: "/roadtrips" },
  { id: "destinations", label: "Destinations", to: "/destination" },
  { id: "budgets", label: "Budgets", to: "/trips?section=stats" },
  { id: "documents", label: "Documents", to: "/profile?section=vault" },
  { id: "saved_places", label: "Saved Places", to: "/destination" },
  { id: "travel_history", label: "Travel History", to: "/profile" },
  { id: "community", label: "Community", to: "/community" },
  { id: "admin", label: "Admin", to: "/admin" },
  { id: "settings", label: "Settings", to: "/profile?tab=settings" }
];

const recentTrips = computed(() => {
  return [...trips.value]
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 4);
});

const upcomingTrips = computed(() => recentTrips.value.slice(0, 3));

const history = computed(() => profileMemoryStore.historySummary);
const timeline = computed(() => profileMemoryStore.timeline.slice(0, 5));
const personality = computed(() => profileMemoryStore.personality);

const budgetSummary = computed(() => {
  const total = Number(history.value?.totalBudgetSpent || 0);
  const tripsCount = Number(history.value?.totalTrips || 0);
  const avg = tripsCount > 0 ? Math.round(total / tripsCount) : 0;

  return {
    total,
    average: avg,
    tripsCount
  };
});

const intelligenceHighlights = computed(() => {
  const pulse = communityStore.pulse;

  return [
    `Personality: ${personality.value?.label || "Explorer"}`,
    `Confidence: ${profileMemoryStore.scores?.overall || 0}/100`,
    pulse
      ? `Community Pulse: ${pulse.totalPosts} posts, ${pulse.totalReviews} reviews`
      : "Community Pulse: unavailable",
    weatherSnapshot.value
      ? `Weather: ${weatherSnapshot.value.temp}, humidity ${weatherSnapshot.value.humidity}`
      : "Weather: unavailable"
  ];
});

function openSection(path) {
  if (path === "/admin" && !isAdminUser.value) {
    router.push("/trips");
    return;
  }

  router.push(path);
}

function formatDate(timestamp) {
  return new Date(Number(timestamp || Date.now())).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

async function loadTravelOS() {
  loading.value = true;
  loadError.value = "";

  try {
    await authStore.initAuth();
    if (!authStore.user?.uid) {
      router.replace({ path: "/login", query: { redirect: "/travel-os" } });
      return;
    }

    profileMemoryStore.initForUser(authStore.user.uid);
    communityStore.initForUser(authStore.user);
    offlineStore.initForUser(authStore.user.uid);

    const topDestination = profileMemoryStore.topDestinations[0] || "Global";

    const [tripsResult, locationResult, recommendationsResult] = await Promise.allSettled([
      getSavedTripsFromDb(authStore.user.uid),
      detectUserLocation(),
      getSmartRecommendations({
        profileMemory: profileMemoryStore.memory,
        personalityLabel: profileMemoryStore.personality?.label,
        budgetTarget: profileMemoryStore.budgetTarget || 1500,
        limit: 4
      })
    ]);

    if (tripsResult.status === "fulfilled") {
      trips.value = tripsResult.value || [];
    }

    if (recommendationsResult.status === "fulfilled") {
      recommendations.value = recommendationsResult.value;
    }

    if (locationResult.status === "fulfilled") {
      const lat = userLocation.value?.lat;
      const lng = userLocation.value?.lng;
      if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
        try {
          weatherSnapshot.value = await fetchWeather(lat, lng);
        } catch (_error) {
          weatherSnapshot.value = null;
        }
      }
    }

    try {
      communityStore.loadForDestination(topDestination);
    } catch (_error) {
      // Community signals are non-blocking for this panel.
    }
  } catch (error) {
    loadError.value = error?.message || "Unable to load Travel OS panel.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadTravelOS);
</script>

<template>
  <div class="travel-os-page container animate-fade-in" style="padding-top: 100px;">
    <div class="page-head">
      <span class="panel-badge">TRAVEL OPERATING SYSTEM</span>
      <h1>WanderAI Experience Hub</h1>
      <p>Unified command layer for planning, memory, intelligence, and offline readiness.</p>
    </div>

    <div v-if="loadError" class="glass-card error-card mt-6">
      {{ loadError }}
    </div>

    <div class="layout mt-6" v-if="!loading">
      <aside class="sidebar glass-card">
        <h3>Navigation</h3>
        <div class="sidebar-list mt-3">
          <button
            v-for="item in sidebarItems"
            :key="item.id"
            type="button"
            class="sidebar-item"
            @click="openSection(item.to)"
          >
            {{ item.label }}
          </button>
        </div>
      </aside>

      <section class="widgets-grid">
        <article class="glass-card widget">
          <h3>Upcoming Trips</h3>
          <ul class="simple-list mt-3" v-if="upcomingTrips.length > 0">
            <li v-for="trip in upcomingTrips" :key="trip.id">
              <strong>{{ trip.destination }}</strong>
              <span>{{ trip.days }} days · {{ formatPrice(trip?.budget?.total || 0) }}</span>
            </li>
          </ul>
          <p v-else class="empty">No upcoming trips yet.</p>
        </article>

        <article class="glass-card widget">
          <h3>Recent Trips</h3>
          <ul class="simple-list mt-3" v-if="recentTrips.length > 0">
            <li v-for="trip in recentTrips" :key="`recent-${trip.id}`">
              <strong>{{ trip.destination }}</strong>
              <span>{{ formatDate(trip.createdAt) }}</span>
            </li>
          </ul>
          <p v-else class="empty">No recent trips available.</p>
        </article>

        <article class="glass-card widget">
          <h3>Travel Statistics</h3>
          <ul class="metric-list mt-3">
            <li><span>Total Trips</span><strong>{{ history.totalTrips }}</strong></li>
            <li><span>Average Group Size</span><strong>{{ Number(history.avgGroupSize || 0).toFixed(1) }}</strong></li>
            <li><span>Favorite Type</span><strong>{{ history.favoriteDestinationType }}</strong></li>
            <li><span>Style Evolution</span><strong>{{ (history.travelStyleEvolution || []).join(" -> ") || "Learning" }}</strong></li>
          </ul>
        </article>

        <article class="glass-card widget">
          <h3>Offline Readiness</h3>
          <ul class="metric-list mt-3">
            <li><span>Draft Queue</span><strong>{{ offlineStore.pendingCount }}</strong></li>
            <li><span>Itinerary Packs</span><strong>{{ offlineStore.itineraryPackCount }}</strong></li>
            <li><span>Maps Packs</span><strong>{{ offlineStore.mapsPackCount }}</strong></li>
            <li><span>Hotels Packs</span><strong>{{ offlineStore.hotelsPackCount }}</strong></li>
            <li><span>Emergency Packs</span><strong>{{ offlineStore.emergencyPackCount }}</strong></li>
            <li><span>Document Packs</span><strong>{{ offlineStore.documentsPackCount }}</strong></li>
          </ul>
        </article>

        <article class="glass-card widget">
          <h3>Budget Summary</h3>
          <ul class="metric-list mt-3">
            <li><span>Total Spent</span><strong>{{ formatPrice(budgetSummary.total) }}</strong></li>
            <li><span>Average Trip Cost</span><strong>{{ formatPrice(budgetSummary.average) }}</strong></li>
            <li><span>Trips Count</span><strong>{{ budgetSummary.tripsCount }}</strong></li>
          </ul>
        </article>

        <article class="glass-card widget">
          <h3>Recommendations</h3>
          <ul class="simple-list mt-3" v-if="recommendations?.destinations?.length">
            <li v-for="item in recommendations.destinations.slice(0, 4)" :key="item.id || item.name">
              <strong>{{ item.name }}</strong>
              <span>{{ item.location }}</span>
            </li>
          </ul>
          <p v-else class="empty">Recommendations unavailable.</p>
        </article>

        <article class="glass-card widget">
          <h3>Travel Intelligence</h3>
          <ul class="simple-list mt-3">
            <li v-for="(line, idx) in intelligenceHighlights" :key="`intel-${idx}`">
              <span>{{ line }}</span>
            </li>
          </ul>
        </article>

        <article class="glass-card widget">
          <h3>Weather Snapshot</h3>
          <div class="weather-row mt-3" v-if="weatherSnapshot">
            <strong>{{ weatherSnapshot.temp }}</strong>
            <span>Humidity {{ weatherSnapshot.humidity }}</span>
            <span>Wind {{ weatherSnapshot.wind }}</span>
          </div>
          <p v-else class="empty">Weather data not available.</p>
        </article>

        <article class="glass-card widget">
          <h3>Activity Feed</h3>
          <ul class="simple-list mt-3" v-if="timeline.length > 0">
            <li v-for="event in timeline" :key="event.id">
              <strong>{{ event.destination }}</strong>
              <span>{{ event.summary }}</span>
            </li>
          </ul>
          <p v-else class="empty">No recent activity yet.</p>
        </article>
      </section>
    </div>

    <section v-else class="glass-card loading-card mt-6">
      <p>Loading Travel OS widgets...</p>
    </section>
  </div>
</template>

<style scoped>
.travel-os-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 34px;
}

.page-head h1 {
  margin: 8px 0;
  font-size: clamp(2.2rem, 5vw, 3rem);
  letter-spacing: -0.03em;
}

.page-head p {
  color: var(--color-text-secondary);
  max-width: 760px;
}

.panel-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #0f766e;
  background: rgba(209, 250, 229, 0.9);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
}

.mt-6 {
  margin-top: 24px;
}

.mt-3 {
  margin-top: 12px;
}

.layout {
  display: grid;
  grid-template-columns: 286px 1fr;
  gap: 14px;
}

.sidebar {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.9));
  align-self: start;
  padding: 14px;
}

.sidebar-list {
  display: grid;
  gap: 8px;
}

.sidebar-item {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text-secondary);
  text-align: left;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 9px 10px;
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.sidebar-item:hover {
  border-color: rgba(14, 165, 233, 0.34);
  color: #0369a1;
  transform: translateY(-2px);
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.widget {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.88));
  border-radius: var(--radius-lg);
}

.simple-list,
.metric-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.simple-list li,
.metric-list li {
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: var(--radius-sm);
  padding: 8px 9px;
  display: grid;
  gap: 2px;
  background: rgba(255, 255, 255, 0.9);
}

.simple-list strong,
.metric-list strong {
  font-size: 0.82rem;
  color: var(--color-text);
}

.simple-list span,
.metric-list span {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.metric-list li {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.weather-row {
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: var(--radius-sm);
  padding: 10px;
  display: grid;
  gap: 4px;
  background: rgba(255, 255, 255, 0.9);
}

.weather-row strong {
  font-size: 1rem;
}

.weather-row span {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.empty {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.error-card,
.loading-card {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.88));
  padding: 14px;
}

.error-card {
  border-color: rgba(220, 38, 38, 0.3);
  color: #b91c1c;
}

@media (max-width: 1080px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .widgets-grid {
    grid-template-columns: 1fr;
  }
}
</style>

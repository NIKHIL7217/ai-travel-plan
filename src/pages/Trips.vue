<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { formatPrice } from "../services/currency";
import { getSavedTripsFromDb } from "../services/firebase";
import { useAuthStore } from "../stores/auth";
import { useOfflineStore } from "../stores/offline";
import { useProfileMemoryStore } from "../stores/profileMemory";
import { useVaultStore } from "../stores/vault";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const profileMemoryStore = useProfileMemoryStore();
const vaultStore = useVaultStore();

const loading = ref(true);
const loadError = ref("");
const trips = ref([]);
const selectedSection = ref("upcoming");

const sections = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "drafts", label: "Drafts" },
  { id: "offline", label: "Offline Packs" },
  { id: "stats", label: "Statistics" },
  { id: "timeline", label: "Timeline" },
  { id: "achievements", label: "Achievements" }
];

const sortedTrips = computed(() => {
  return [...trips.value].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
});

const upcomingTrips = computed(() => {
  return sortedTrips.value.filter((trip) => {
    const createdAt = Number(trip.createdAt || 0);
    return Date.now() - createdAt < 1000 * 60 * 60 * 24 * 90;
  });
});

const pastTrips = computed(() => {
  return sortedTrips.value.filter((trip) => !upcomingTrips.value.find((candidate) => candidate.id === trip.id));
});

const draftTrips = computed(() => offlineStore.pendingDrafts || []);
const offlinePacks = computed(() => offlineStore.packs || []);

const history = computed(() => profileMemoryStore.historySummary);
const timeline = computed(() => profileMemoryStore.timeline || []);

const stats = computed(() => {
  const totalTrips = Number(history.value?.totalTrips || 0);
  const totalBudget = Number(history.value?.totalBudgetSpent || 0);
  const averageCost = totalTrips > 0 ? Math.round(totalBudget / totalTrips) : 0;

  return {
    totalTrips,
    totalBudget,
    averageCost,
    avgGroupSize: Number(history.value?.avgGroupSize || 0),
    destinationType: history.value?.favoriteDestinationType || "Mixed",
    styleEvolution: (history.value?.travelStyleEvolution || []).join(" -> ") || "Balanced"
  };
});

const achievements = computed(() => {
  const rows = [];
  const tripCount = stats.value.totalTrips;
  const packCount = Number(offlinePacks.value.length || 0);

  if (tripCount >= 1) rows.push({ id: "first", title: "First Journey", detail: "Saved your first trip." });
  if (tripCount >= 5) rows.push({ id: "five", title: "Frequent Planner", detail: "Saved at least 5 trips." });
  if (stats.value.totalBudget >= 5000) rows.push({ id: "budget", title: "Big Explorer", detail: "Crossed a major travel budget milestone." });
  if (packCount >= 3) rows.push({ id: "offline", title: "Offline Ready", detail: "Prepared multiple offline packs." });
  if (rows.length === 0) rows.push({ id: "starter", title: "Start Your Story", detail: "Generate and save trips to unlock milestones." });

  return rows;
});

function tripCover(destination, style = "travel") {
  const label = String(destination || "travel").trim() || "travel";
  const hint = String(style || "travel").trim() || "travel";
  return `https://source.unsplash.com/1200x800/?${encodeURIComponent(`${label} ${hint} travel`)}`;
}

function formatDate(value) {
  return new Date(Number(value || Date.now())).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function applyQuerySection() {
  const next = String(route.query.section || "").trim().toLowerCase();
  if (!next) return;
  if (sections.find((section) => section.id === next)) {
    selectedSection.value = next;
  }
}

function openPlannerWithTrip(trip) {
  if (!trip) return;

  router.push({
    path: "/planner",
    query: {
      destination: trip.destination,
      prompt: `Create a refreshed ${trip.days}-day plan for ${trip.destination} with better local experiences.`
    }
  });
}

async function loadTripsExperience() {
  loading.value = true;
  loadError.value = "";

  try {
    await authStore.initAuth();
    if (!authStore.user?.uid) {
      router.replace({ path: "/login", query: { redirect: "/trips" } });
      return;
    }

    profileMemoryStore.initForUser(authStore.user.uid);
    offlineStore.initForUser(authStore.user.uid);
    vaultStore.initForUser(authStore.user.uid);
    trips.value = await getSavedTripsFromDb(authStore.user.uid);

    applyQuerySection();
  } catch (error) {
    loadError.value = error?.message || "Unable to load trips right now.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadTripsExperience);
</script>

<template>
  <div class="trips-page container animate-fade-in" style="padding-top: 100px;">
    <section class="trips-hero">
      <div>
        <span class="trips-badge">TRIPS EXPERIENCE</span>
        <h1>Your Entire Travel Story In One Place</h1>
        <p>Upcoming plans, completed journeys, offline readiness, memory timeline, and achievements now live in one immersive flow.</p>
      </div>
      <button type="button" class="btn btn-primary" @click="router.push('/planner')">Plan New Trip</button>
    </section>

    <section class="section-tabs mt-6">
      <button
        v-for="section in sections"
        :key="section.id"
        type="button"
        class="section-tab"
        :class="{ active: selectedSection === section.id }"
        @click="selectedSection = section.id"
      >
        {{ section.label }}
      </button>
    </section>

    <section v-if="loading" class="glass-card loading-panel mt-6">
      <p>Loading trips experience...</p>
    </section>

    <section v-else-if="loadError" class="glass-card error-panel mt-6">
      <h3>Unable to load Trips</h3>
      <p>{{ loadError }}</p>
      <button type="button" class="btn btn-primary mt-3" @click="loadTripsExperience">Retry</button>
    </section>

    <template v-else>
      <section v-if="selectedSection === 'upcoming'" class="content-panel mt-6">
        <article class="glass-card stream-panel">
          <h3>Upcoming Trips</h3>
          <p class="panel-copy">Everything you are likely to travel soon.</p>

          <div v-if="upcomingTrips.length === 0" class="panel-empty mt-3">
            <p>No upcoming trips yet. Start one from Planner.</p>
          </div>

          <div v-else class="trip-gallery mt-4 stagger-grid">
            <article v-for="trip in upcomingTrips" :key="trip.id" class="trip-gallery-card glass-card hover-lift">
              <img :src="tripCover(trip.destination, trip.style)" :alt="trip.destination" loading="lazy" />
              <div class="trip-gallery-overlay">
                <strong>{{ trip.destination }}</strong>
                <p>{{ trip.days }} days · {{ trip.travelMode || 'Car' }} · {{ formatDate(trip.createdAt) }}</p>
                <div class="trip-gallery-meta">
                  <span>{{ formatPrice(trip?.budget?.total || 0) }}</span>
                  <button type="button" class="btn btn-outline btn-xs" @click="openPlannerWithTrip(trip)">Refresh Plan</button>
                </div>
              </div>
            </article>
          </div>
        </article>
      </section>

      <section v-if="selectedSection === 'past'" class="content-panel mt-6">
        <article class="glass-card stream-panel">
          <h3>Past Trips</h3>
          <p class="panel-copy">Journeys you already planned and completed.</p>

          <div v-if="pastTrips.length === 0" class="panel-empty mt-3">
            <p>No archived trips yet.</p>
          </div>

          <div v-else class="trip-gallery mt-4 stagger-grid">
            <article v-for="trip in pastTrips" :key="trip.id" class="trip-gallery-card glass-card hover-lift compact">
              <img :src="tripCover(trip.destination, trip.style)" :alt="trip.destination" loading="lazy" />
              <div class="trip-gallery-overlay">
                <strong>{{ trip.destination }}</strong>
                <p>{{ trip.days }} days · {{ trip.style || 'Balanced' }} · {{ formatDate(trip.createdAt) }}</p>
                <div class="trip-gallery-meta">
                  <span>{{ formatPrice(trip?.budget?.total || 0) }}</span>
                  <button type="button" class="btn btn-outline btn-xs" @click="openPlannerWithTrip(trip)">Replan</button>
                </div>
              </div>
            </article>
          </div>
        </article>
      </section>

      <section v-if="selectedSection === 'drafts'" class="content-panel mt-6">
        <article class="glass-card stream-panel">
          <h3>Draft Trips</h3>
          <p class="panel-copy">Unsynced drafts prepared while planning offline.</p>

          <div v-if="draftTrips.length === 0" class="panel-empty mt-3">
            <p>No pending drafts right now.</p>
          </div>

          <div v-else class="trip-stream mt-4">
            <article v-for="draft in draftTrips" :key="draft.id" class="trip-item">
              <div>
                <strong>{{ draft.destination || 'Unnamed trip' }}</strong>
                <p>{{ draft.days || 0 }} days · {{ draft.travelMode }} · {{ formatDate(draft.updatedAt) }}</p>
              </div>
              <div class="trip-item-right">
                <span>{{ formatPrice(draft.budgetTotal || 0) }}</span>
              </div>
            </article>
          </div>
        </article>
      </section>

      <section v-if="selectedSection === 'offline'" class="content-panel mt-6">
        <article class="glass-card stream-panel">
          <h3>Offline Packs</h3>
          <p class="panel-copy">Ready-to-carry packs for itinerary, maps, hotels, emergency, and documents.</p>

          <div class="pack-stats mt-4">
            <article class="pack-stat"><span>Itinerary</span><strong>{{ offlineStore.itineraryPackCount }}</strong></article>
            <article class="pack-stat"><span>Maps</span><strong>{{ offlineStore.mapsPackCount }}</strong></article>
            <article class="pack-stat"><span>Hotels</span><strong>{{ offlineStore.hotelsPackCount }}</strong></article>
            <article class="pack-stat"><span>Emergency</span><strong>{{ offlineStore.emergencyPackCount }}</strong></article>
            <article class="pack-stat"><span>Documents</span><strong>{{ offlineStore.documentsPackCount }}</strong></article>
          </div>

          <div v-if="offlinePacks.length === 0" class="panel-empty mt-4">
            <p>No offline packs saved yet.</p>
          </div>

          <div v-else class="trip-stream mt-4">
            <article v-for="pack in offlinePacks.slice(0, 20)" :key="pack.id" class="trip-item">
              <div>
                <strong>{{ pack.title }}</strong>
                <p>{{ pack.type }} · {{ pack.source }} · {{ formatDate(pack.updatedAt) }}</p>
              </div>
            </article>
          </div>
        </article>
      </section>

      <section v-if="selectedSection === 'stats'" class="content-panel mt-6">
        <article class="glass-card stream-panel">
          <h3>Travel Statistics</h3>
          <div class="stats-grid mt-4">
            <article class="stat"><span>Total Trips</span><strong>{{ stats.totalTrips }}</strong></article>
            <article class="stat"><span>Total Budget</span><strong>{{ formatPrice(stats.totalBudget) }}</strong></article>
            <article class="stat"><span>Average Cost</span><strong>{{ formatPrice(stats.averageCost) }}</strong></article>
            <article class="stat"><span>Avg Group Size</span><strong>{{ Number(stats.avgGroupSize).toFixed(1) }}</strong></article>
            <article class="stat"><span>Favorite Type</span><strong>{{ stats.destinationType }}</strong></article>
            <article class="stat"><span>Style Evolution</span><strong>{{ stats.styleEvolution }}</strong></article>
          </div>
        </article>
      </section>

      <section v-if="selectedSection === 'timeline'" class="content-panel mt-6">
        <article class="glass-card stream-panel">
          <h3>Travel Timeline</h3>

          <div v-if="timeline.length === 0" class="panel-empty mt-3">
            <p>Your timeline will appear as you generate and save trips.</p>
          </div>

          <div v-else class="timeline-ribbon mt-4">
            <article v-for="event in timeline" :key="event.id" class="timeline-item">
              <div>
                <strong>{{ event.destination }}</strong>
                <p>{{ event.summary }}</p>
              </div>
              <small>{{ formatDate(event.createdAt) }}</small>
            </article>
          </div>
        </article>
      </section>

      <section v-if="selectedSection === 'achievements'" class="content-panel mt-6">
        <article class="glass-card stream-panel">
          <h3>Travel Achievements</h3>
          <div class="achievement-grid mt-4 stagger-grid">
            <article v-for="achievement in achievements" :key="achievement.id" class="achievement-item">
              <span class="achievement-burst">Unlocked</span>
              <strong>{{ achievement.title }}</strong>
              <p>{{ achievement.detail }}</p>
            </article>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<style scoped src="./styles/Trips.css"></style>
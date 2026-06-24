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

<style scoped>
.trips-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 40px;
}

.trips-hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-end;
  padding: 22px;
  border-radius: var(--radius-xl);
  border: 1px solid rgba(8, 145, 178, 0.24);
  background:
    radial-gradient(circle at 88% 18%, rgba(14, 165, 233, 0.14), rgba(14, 165, 233, 0)),
    linear-gradient(140deg, rgba(240, 249, 255, 0.96), rgba(236, 253, 245, 0.9));
}

.trips-badge {
  display: inline-block;
  font-size: 0.72rem;
  letter-spacing: 0.11em;
  font-weight: 800;
  color: #0f766e;
  background: rgba(209, 250, 229, 0.86);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}

.trips-hero h1 {
  margin-top: 10px;
  font-size: clamp(2rem, 4.8vw, 3.2rem);
  letter-spacing: -0.03em;
}

.trips-hero p {
  margin-top: 8px;
  color: var(--color-text-secondary);
  max-width: 760px;
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

.section-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-tab {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-full);
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.section-tab.active {
  border-color: rgba(14, 165, 233, 0.34);
  background: rgba(224, 242, 254, 0.74);
  color: #0369a1;
}

.loading-panel,
.error-panel,
.stream-panel {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.9));
}

.stream-panel {
  border: 1px solid rgba(148, 163, 184, 0.28);
}

.error-panel {
  border-color: rgba(220, 38, 38, 0.3);
}

.panel-copy {
  margin-top: 8px;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
}

.panel-empty {
  border: 1px dashed rgba(148, 163, 184, 0.45);
  border-radius: var(--radius-md);
  padding: 14px;
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.84);
}

.trip-stream,
.timeline-list,
.achievement-grid {
  display: grid;
  gap: 10px;
}

.trip-gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.trip-gallery-card {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  min-height: 220px;
}

.trip-gallery-card.compact {
  min-height: 190px;
}

.trip-gallery-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.trip-gallery-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: 12px;
  background: linear-gradient(180deg, rgba(2, 8, 23, 0), rgba(2, 8, 23, 0.8));
}

.trip-gallery-overlay strong {
  color: #f8fafc;
  font-size: 0.88rem;
}

.trip-gallery-overlay p {
  margin-top: 4px;
  color: rgba(226, 232, 240, 0.9);
  font-size: 0.74rem;
}

.trip-gallery-meta {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.trip-gallery-meta span {
  border: 1px solid rgba(226, 232, 240, 0.34);
  border-radius: var(--radius-full);
  background: rgba(15, 23, 42, 0.5);
  color: #f8fafc;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 4px 8px;
}

.trip-item,
.timeline-item,
.achievement-item {
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: var(--radius-md);
  padding: 10px;
  background: rgba(255, 255, 255, 0.92);
}

.trip-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.trip-item strong,
.timeline-item strong,
.achievement-item strong {
  font-size: 0.9rem;
}

.trip-item p,
.timeline-item p,
.achievement-item p {
  margin-top: 4px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.trip-item-right {
  display: grid;
  gap: 6px;
  justify-items: end;
}

.pack-stats,
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.pack-stat,
.stat {
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: var(--radius-md);
  padding: 10px;
  background: rgba(255, 255, 255, 0.92);
}

.pack-stat span,
.stat span {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.pack-stat strong,
.stat strong {
  margin-top: 4px;
  display: block;
  font-size: 0.92rem;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.timeline-ribbon {
  display: grid;
  gap: 8px;
}

.timeline-ribbon .timeline-item {
  position: relative;
  padding-left: 18px;
}

.timeline-ribbon .timeline-item::before {
  content: "";
  position: absolute;
  left: 8px;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.66), rgba(16, 185, 129, 0.5));
}

.timeline-item small {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.achievement-item {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.96), rgba(240, 249, 255, 0.9));
}

.achievement-burst {
  display: inline-block;
  border: 1px solid rgba(14, 165, 233, 0.24);
  border-radius: var(--radius-full);
  background: rgba(224, 242, 254, 0.72);
  color: #0369a1;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 8px;
  margin-bottom: 7px;
}

@media (max-width: 980px) {
  .trips-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .pack-stats,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .trip-gallery {
    grid-template-columns: 1fr;
  }

  .trip-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .trip-item-right {
    justify-items: start;
  }
}
</style>
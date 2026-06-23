<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { formatPrice } from "../services/currency";
import { getSavedTripsFromDb } from "../services/firebase";
import { useAuthStore } from "../stores/auth";
import { useProfileMemoryStore } from "../stores/profileMemory";
import { useVaultStore } from "../stores/vault";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const profileMemoryStore = useProfileMemoryStore();
const vaultStore = useVaultStore();

const loading = ref(true);
const trips = ref([]);
const loadError = ref("");

const selectedSection = computed(() => String(route.query.section || "overview").trim().toLowerCase());
const history = computed(() => profileMemoryStore.historySummary);
const personality = computed(() => profileMemoryStore.personality);
const preferences = computed(() => profileMemoryStore.memory?.preferences || {});
const timeline = computed(() => profileMemoryStore.timeline || []);

const uniqueDestinations = computed(() => {
  const names = trips.value
    .map((trip) => String(trip?.destination || "").trim())
    .filter(Boolean);

  return [...new Set(names)];
});

const countriesVisited = computed(() => {
  const countries = uniqueDestinations.value
    .map((destination) => {
      const parts = destination.split(",").map((part) => part.trim()).filter(Boolean);
      return parts.length > 1 ? parts[parts.length - 1] : "";
    })
    .filter(Boolean);

  return [...new Set(countries)];
});

const citiesVisited = computed(() => {
  const cities = uniqueDestinations.value
    .map((destination) => destination.split(",")[0]?.trim() || "")
    .filter(Boolean);

  return [...new Set(cities)];
});

const averageTripCost = computed(() => {
  const totalTrips = Number(history.value?.totalTrips || 0);
  if (!totalTrips) {
    return 0;
  }

  return Math.round(Number(history.value?.totalBudgetSpent || 0) / totalTrips);
});

const travelStyleCounts = computed(() => {
  const counts = {};
  for (const trip of trips.value) {
    const style = String(trip?.style || "Balanced").trim() || "Balanced";
    counts[style] = (counts[style] || 0) + 1;
  }

  return counts;
});

const favoriteStyle = computed(() => {
  const pairs = Object.entries(travelStyleCounts.value);
  if (!pairs.length) {
    return preferences.value.travelStyle || "Balanced";
  }

  return pairs.sort((left, right) => Number(right[1]) - Number(left[1]))[0]?.[0] || "Balanced";
});

const budgetPattern = computed(() => {
  const values = trips.value
    .map((trip) => Number(trip?.budget?.total || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!values.length) {
    return {
      label: "Getting Started",
      detail: "Save a few trips to unlock your spending pattern.",
      min: 0,
      max: 0,
      avg: 0
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

  let label = "Balanced Curator";
  let detail = "You optimize cost and comfort with steady spending.";

  if (avg < 1200) {
    label = "Lean Explorer";
    detail = "You maximize travel frequency with efficient budgets.";
  } else if (avg > 2800) {
    label = "Premium Voyager";
    detail = "You prefer high-comfort travel experiences.";
  }

  return {
    label,
    detail,
    min,
    max,
    avg
  };
});

const travelMapPins = computed(() => {
  const list = uniqueDestinations.value.slice(0, 14);
  return list.map((destination, index) => {
    const seed = destination.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const top = 10 + ((seed + index * 17) % 72);
    const left = 8 + ((seed + index * 23) % 82);

    return {
      id: `${destination}-${index}`,
      label: destination.split(",")[0] || destination,
      style: {
        top: `${top}%`,
        left: `${left}%`
      }
    };
  });
});

const achievements = computed(() => {
  const rows = [];
  const totalTrips = Number(history.value?.totalTrips || 0);
  const avgGroupSize = Number(history.value?.avgGroupSize || 0);
  const score = Number(profileMemoryStore.scores?.overall || 0);

  if (totalTrips >= 1) rows.push({ id: "first", title: "First Journey", detail: "You started your travel memory timeline." });
  if (totalTrips >= 5) rows.push({ id: "streak", title: "Explorer Streak", detail: "You completed 5 or more saved trips." });
  if (totalTrips >= 10) rows.push({ id: "collector", title: "Memory Collector", detail: "Your travel story is now rich and diverse." });
  if (avgGroupSize >= 3) rows.push({ id: "group", title: "Group Navigator", detail: "You often plan for larger travel groups." });
  if (score >= 65) rows.push({ id: "profile", title: "High Confidence Profile", detail: "Personalization confidence is now advanced." });

  if (!rows.length) {
    rows.push({ id: "starter", title: "Ready To Wrap", detail: "Save more trips to unlock profile milestones." });
  }

  return rows;
});

const vaultDocs = computed(() => vaultStore.documents || []);

function formatDate(timestamp) {
  return new Date(Number(timestamp || Date.now())).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function openSection(sectionId) {
  router.replace({
    path: "/profile",
    query: {
      ...route.query,
      section: sectionId
    }
  });
}

async function removeVaultDocument(documentId) {
  vaultStore.removeDocument(documentId);
}

async function loadProfile() {
  loading.value = true;
  loadError.value = "";

  try {
    await authStore.initAuth();
    if (!authStore.user?.uid) {
      router.replace({ path: "/login", query: { redirect: "/profile" } });
      return;
    }

    profileMemoryStore.initForUser(authStore.user.uid);
    vaultStore.initForUser(authStore.user.uid);
    trips.value = await getSavedTripsFromDb(authStore.user.uid);
  } catch (error) {
    loadError.value = error?.message || "Unable to load profile summary.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadProfile);

watch(
  () => authStore.user?.uid,
  (nextUserId) => {
    if (!nextUserId) {
      return;
    }

    profileMemoryStore.initForUser(nextUserId);
    vaultStore.initForUser(nextUserId);
  }
);
</script>

<template>
  <div class="profile-page container animate-fade-in" style="padding-top: 100px;">
    <header class="profile-hero glass-card">
      <div>
        <span class="hero-badge">TRAVEL WRAPPED</span>
        <h1>Your Year In Travel</h1>
        <p>From personality to milestones, your full journey identity is now one cinematic profile.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="btn btn-outline" @click="openSection('overview')">Overview</button>
        <button type="button" class="btn btn-outline" @click="openSection('vault')">Vault</button>
      </div>
    </header>

    <section v-if="loading" class="glass-card loading-panel mt-6">
      <p>Loading your travel wrapped profile...</p>
    </section>

    <section v-else-if="loadError" class="glass-card error-panel mt-6">
      <p>{{ loadError }}</p>
    </section>

    <template v-else>
      <section class="kpi-grid mt-6">
        <article class="glass-card kpi">
          <span>Total Trips</span>
          <strong>{{ history.totalTrips }}</strong>
        </article>
        <article class="glass-card kpi">
          <span>Countries Visited</span>
          <strong>{{ countriesVisited.length }}</strong>
        </article>
        <article class="glass-card kpi">
          <span>Cities Visited</span>
          <strong>{{ citiesVisited.length }}</strong>
        </article>
        <article class="glass-card kpi">
          <span>Avg Trip Cost</span>
          <strong>{{ formatPrice(averageTripCost) }}</strong>
        </article>
      </section>

      <section class="identity-grid mt-6">
        <article class="glass-card identity-card">
          <div class="card-head">
            <h3>Travel Personality</h3>
            <span class="score-pill">{{ profileMemoryStore.scores?.overall || 0 }}/100</span>
          </div>
          <h4>{{ personality?.label }}</h4>
          <p class="card-copy">{{ personality?.description }}</p>
          <div class="tag-row mt-3">
            <span v-for="trait in personality?.traits || []" :key="trait" class="tag-pill">{{ trait }}</span>
          </div>
        </article>

        <article class="glass-card identity-card">
          <h3>Favorite Style</h3>
          <h4>{{ favoriteStyle }}</h4>
          <p class="card-copy">Preferred transport: {{ preferences.transportPreference || 'Car' }}</p>
          <p class="card-copy">Food pattern: {{ preferences.foodPreference || 'Mixed' }}</p>
          <p class="card-copy">Stay preference: {{ preferences.stayPreference || 'Mid-range' }}</p>
        </article>

        <article class="glass-card identity-card">
          <h3>Budget Pattern</h3>
          <h4>{{ budgetPattern.label }}</h4>
          <p class="card-copy">{{ budgetPattern.detail }}</p>
          <div class="budget-range mt-3">
            <span>Min: {{ formatPrice(budgetPattern.min) }}</span>
            <span>Avg: {{ formatPrice(budgetPattern.avg) }}</span>
            <span>Max: {{ formatPrice(budgetPattern.max) }}</span>
          </div>
        </article>
      </section>

      <section v-if="selectedSection !== 'vault'" class="map-layout mt-6">
        <article class="glass-card map-card">
          <div class="card-head">
            <h3>Travel Map</h3>
            <small>{{ uniqueDestinations.length }} pinned destinations</small>
          </div>
          <div class="map-canvas mt-3">
            <div v-for="pin in travelMapPins" :key="pin.id" class="map-pin" :style="pin.style">
              <span>{{ pin.label }}</span>
            </div>
          </div>
        </article>

        <article class="glass-card list-card">
          <h3>Countries Visited</h3>
          <div class="pill-list mt-3" v-if="countriesVisited.length > 0">
            <span v-for="country in countriesVisited" :key="country" class="outline-pill">{{ country }}</span>
          </div>
          <p v-else class="empty-copy mt-3">Countries list will grow as destination details become richer.</p>

          <h3 class="mt-6">Cities Visited</h3>
          <div class="pill-list mt-3" v-if="citiesVisited.length > 0">
            <span v-for="city in citiesVisited" :key="city" class="outline-pill">{{ city }}</span>
          </div>
          <p v-else class="empty-copy mt-3">Cities list will appear from saved trips.</p>
        </article>
      </section>

      <section v-if="selectedSection !== 'vault'" class="detail-grid mt-6">
        <article class="glass-card detail-card">
          <h3>Achievements</h3>
          <div class="achievement-list mt-3">
            <article v-for="achievement in achievements" :key="achievement.id" class="achievement-item">
              <strong>{{ achievement.title }}</strong>
              <p>{{ achievement.detail }}</p>
            </article>
          </div>
        </article>

        <article class="glass-card detail-card">
          <h3>Timeline</h3>
          <div class="timeline-list mt-3" v-if="timeline.length > 0">
            <article v-for="event in timeline" :key="event.id" class="timeline-item">
              <div>
                <strong>{{ event.destination }}</strong>
                <p>{{ event.summary }}</p>
              </div>
              <small>{{ formatDate(event.createdAt) }}</small>
            </article>
          </div>
          <p v-else class="empty-copy mt-3">Timeline appears after generating and saving journeys.</p>
        </article>
      </section>

      <section v-if="selectedSection === 'vault'" class="glass-card vault-panel mt-6">
        <div class="card-head">
          <h3>Document Vault</h3>
          <small>{{ vaultStore.encryptionStatusLabel }}</small>
        </div>

        <div class="vault-kpis mt-4">
          <article class="vault-kpi">
            <span>Total Docs</span>
            <strong>{{ vaultDocs.length }}</strong>
          </article>
          <article class="vault-kpi">
            <span>Encrypted</span>
            <strong>{{ vaultStore.encryptedDocumentCount }}</strong>
          </article>
          <article class="vault-kpi">
            <span>Emergency Pack</span>
            <strong>{{ vaultStore.emergencyPackCount }}</strong>
          </article>
          <article class="vault-kpi">
            <span>Storage</span>
            <strong>{{ vaultStore.totalSizeLabel }}</strong>
          </article>
        </div>

        <div v-if="vaultDocs.length === 0" class="empty-copy mt-4">No vault documents uploaded yet.</div>

        <div v-else class="vault-list mt-4">
          <article v-for="doc in vaultDocs" :key="doc.id" class="vault-item">
            <div>
              <strong>{{ doc.name }}</strong>
              <p>{{ doc.tag }} | {{ doc.sizeLabel }} | key v{{ doc.keyVersion }}</p>
            </div>
            <button type="button" class="btn btn-danger btn-xs" @click="removeVaultDocument(doc.id)">Remove</button>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 36px;
}

.profile-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  padding: 22px;
  background: linear-gradient(140deg, rgba(224, 242, 254, 0.84), rgba(236, 253, 245, 0.8));
  border: 1px solid rgba(14, 165, 233, 0.24);
}

.hero-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #0369a1;
  background: rgba(224, 242, 254, 0.9);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
}

.profile-hero h1 {
  margin-top: 8px;
  font-size: clamp(2rem, 5vw, 3.2rem);
  letter-spacing: -0.04em;
}

.profile-hero p {
  margin-top: 6px;
  color: var(--color-text-secondary);
  max-width: 760px;
}

.hero-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.kpi {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.9));
}

.kpi span {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.kpi strong {
  display: block;
  margin-top: 4px;
  font-size: 1rem;
}

.identity-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.identity-card,
.map-card,
.list-card,
.detail-card,
.vault-panel,
.loading-panel,
.error-panel {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.9));
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.score-pill {
  border: 1px solid rgba(14, 165, 233, 0.26);
  border-radius: var(--radius-full);
  background: rgba(224, 242, 254, 0.72);
  color: #0369a1;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 5px 10px;
}

.identity-card h4 {
  margin-top: 8px;
  font-size: 1.1rem;
}

.card-copy {
  margin-top: 6px;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-pill {
  border: 1px solid rgba(14, 165, 233, 0.24);
  border-radius: var(--radius-full);
  background: rgba(224, 242, 254, 0.74);
  color: #0369a1;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 5px 10px;
}

.budget-range {
  display: grid;
  gap: 5px;
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.map-layout {
  display: grid;
  grid-template-columns: 1.45fr 0.85fr;
  gap: 10px;
}

.map-canvas {
  position: relative;
  min-height: 340px;
  border-radius: var(--radius-lg);
  border: 1px dashed rgba(14, 165, 233, 0.34);
  background:
    radial-gradient(circle at 16% 24%, rgba(14, 165, 233, 0.16) 0%, rgba(14, 165, 233, 0) 34%),
    radial-gradient(circle at 78% 68%, rgba(16, 185, 129, 0.14) 0%, rgba(16, 185, 129, 0) 34%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(240, 249, 255, 0.9));
  overflow: hidden;
}

.map-pin {
  position: absolute;
  transform: translate(-50%, -50%);
}

.map-pin span {
  display: inline-block;
  border: 1px solid rgba(14, 165, 233, 0.32);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.92);
  color: #0369a1;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 5px 8px;
  white-space: nowrap;
}

.pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.outline-pill {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-full);
  background: #ffffff;
  color: var(--color-text-secondary);
  padding: 5px 10px;
  font-size: 0.72rem;
  font-weight: 700;
}

.empty-copy {
  color: var(--color-text-muted);
  font-size: 0.82rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.achievement-list,
.timeline-list,
.vault-list {
  display: grid;
  gap: 8px;
}

.achievement-item,
.timeline-item,
.vault-item {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.9);
  padding: 9px;
}

.achievement-item p,
.timeline-item p,
.vault-item p {
  margin-top: 4px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.timeline-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.timeline-item small {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.vault-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.vault-kpi {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.92);
  padding: 8px;
}

.vault-kpi span {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.vault-kpi strong {
  display: block;
  margin-top: 4px;
  font-size: 0.86rem;
}

.vault-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.btn-xs {
  font-size: 0.72rem;
  padding: 6px 9px;
}

@media (max-width: 1100px) {
  .kpi-grid,
  .identity-grid,
  .detail-grid,
  .vault-kpis {
    grid-template-columns: 1fr 1fr;
  }

  .map-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .profile-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .kpi-grid,
  .identity-grid,
  .detail-grid,
  .vault-kpis {
    grid-template-columns: 1fr;
  }

  .timeline-item,
  .vault-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
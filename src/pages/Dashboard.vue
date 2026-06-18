<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { getSavedTripsFromDb } from "../services/firebase";
import { formatPrice } from "../services/currency";

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(true);
const trips = ref([]);

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

onMounted(async () => {
  try {
    await authStore.initAuth();
    if (!authStore.user?.uid) {
      router.replace("/login");
      return;
    }

    trips.value = await getSavedTripsFromDb(authStore.user.uid);
  } catch (error) {
    console.error("Failed to load dashboard:", error);
  } finally {
    loading.value = false;
  }
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

@media (max-width: 1050px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
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
}
</style>

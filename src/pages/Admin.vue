<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { formatPrice } from "../services/currency";
import { getSavedTripsFromDb } from "../services/firebase";
import { useAuthStore } from "../stores/auth";
import { useCommunityStore } from "../stores/community";

const router = useRouter();
const authStore = useAuthStore();
const communityStore = useCommunityStore();

const loading = ref(true);
const activeTab = ref("dashboard");
const adminMessage = ref("");
const trips = ref([]);
const users = ref([]);
const destinations = ref([
  { id: "goa", name: "Goa", featured: true, seasonal: "winter" },
  { id: "bali", name: "Bali", featured: true, seasonal: "summer" },
  { id: "paris", name: "Paris", featured: false, seasonal: "autumn" },
  { id: "tokyo", name: "Tokyo", featured: false, seasonal: "spring" }
]);
const aiHealth = ref({
  requests: 1280,
  failures: 24,
  avgLatencyMs: 1280,
  tokenUsage: 482000,
  costUsd: 226
});

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "Users" },
  { id: "trips", label: "Trips" },
  { id: "destinations", label: "Destinations" },
  { id: "community", label: "Community" },
  { id: "analytics", label: "Analytics" },
  { id: "ai", label: "AI Monitoring" },
  { id: "settings", label: "Settings" }
];

const isAdminUser = computed(() => {
  const email = String(authStore.user?.email || "").toLowerCase();
  return email.includes("admin") || email.endsWith("@wanderai.local");
});

const metrics = computed(() => {
  const totalUsers = users.value.length;
  const activeUsers = users.value.filter((user) => user.status === "active").length;
  const generatedTrips = trips.value.length;
  const savedTrips = trips.value.filter((trip) => Number(trip?.budget?.total || 0) > 0).length;
  const revenue = trips.value.reduce((sum, trip) => sum + Number(trip?.budget?.total || 0) * 0.02, 0);
  const errorRate = aiHealth.value.requests > 0
    ? Number(((aiHealth.value.failures / aiHealth.value.requests) * 100).toFixed(1))
    : 0;

  return {
    totalUsers,
    activeUsers,
    generatedTrips,
    savedTrips,
    destinationsViewed: destinations.value.length * 24,
    revenue,
    aiRequests: aiHealth.value.requests,
    errorRate,
    apiUsage: aiHealth.value.tokenUsage,
    growth: 14
  };
});

const reportedContent = computed(() => {
  const posts = communityStore.posts.slice(0, 5).map((post) => ({
    id: `post-${post.id}`,
    type: "post",
    summary: `${post.authorName}: ${post.text}`,
    reason: "Manual moderation sample"
  }));

  const reviews = communityStore.reviews.slice(0, 5).map((review) => ({
    id: `review-${review.id}`,
    type: "review",
    summary: `${review.authorName}: ${review.title}`,
    reason: "Quality check queue"
  }));

  return [...posts, ...reviews];
});

const chartRows = computed(() => {
  return [
    { label: "User Growth", value: 72 },
    { label: "Trip Creation", value: 84 },
    { label: "Destination Popularity", value: 66 },
    { label: "Retention", value: 58 },
    { label: "Engagement", value: 79 }
  ];
});

function setMessage(message) {
  adminMessage.value = message;
  setTimeout(() => {
    adminMessage.value = "";
  }, 2200);
}

function updateUserStatus(userId, status) {
  users.value = users.value.map((user) =>
    user.id === userId
      ? {
          ...user,
          status
        }
      : user
  );
  setMessage(`User status updated to ${status}.`);
}

function deleteUser(userId) {
  users.value = users.value.filter((user) => user.id !== userId);
  setMessage("User deleted.");
}

function toggleFeatured(destinationId) {
  destinations.value = destinations.value.map((destination) =>
    destination.id === destinationId
      ? {
          ...destination,
          featured: !destination.featured
        }
      : destination
  );
  setMessage("Destination feature flag updated.");
}

function deleteDestination(destinationId) {
  destinations.value = destinations.value.filter((destination) => destination.id !== destinationId);
  setMessage("Destination removed from admin list.");
}

async function loadAdminData() {
  loading.value = true;

  try {
    await authStore.initAuth();
    if (!authStore.user?.uid) {
      router.replace({ path: "/login", query: { redirect: "/admin" } });
      return;
    }

    trips.value = await getSavedTripsFromDb(authStore.user.uid);
    communityStore.initForUser(authStore.user);
    communityStore.loadForDestination("Global");

    users.value = [
      {
        id: `u-${authStore.user.uid}`,
        name: authStore.displayName,
        email: authStore.user?.email || "",
        role: isAdminUser.value ? "admin" : "member",
        status: "active",
        tripCount: trips.value.length
      },
      {
        id: "u-demo-1",
        name: "Aditi Sharma",
        email: "aditi@example.com",
        role: "member",
        status: "active",
        tripCount: 9
      },
      {
        id: "u-demo-2",
        name: "Rohan Verma",
        email: "rohan@example.com",
        role: "member",
        status: "suspended",
        tripCount: 3
      }
    ];
  } finally {
    loading.value = false;
  }
}

onMounted(loadAdminData);
</script>

<template>
  <div class="admin-page container animate-fade-in" style="padding-top: 100px;">
    <div class="admin-head">
      <span class="admin-badge">SAAS ADMIN</span>
      <h1>WanderAI Ops Console</h1>
      <p>Operate users, destinations, moderation, analytics, and AI health from one premium control surface.</p>
    </div>

    <section v-if="loading" class="glass-card loading-card mt-6">
      <p>Loading admin console...</p>
    </section>

    <section v-else-if="!isAdminUser" class="glass-card restricted-card mt-6">
      <h3>Admin Access Required</h3>
      <p>This account is not configured as admin. Use an admin email containing admin or @wanderai.local.</p>
      <button type="button" class="btn btn-outline mt-3" @click="router.push('/trips')">Back to Trips</button>
    </section>

    <template v-else>
      <div class="tabs-row mt-6">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <p v-if="adminMessage" class="admin-msg mt-3">{{ adminMessage }}</p>

      <section v-if="activeTab === 'dashboard'" class="mt-6">
        <div class="metrics-grid">
          <article class="glass-card metric"><span>Total Users</span><strong>{{ metrics.totalUsers }}</strong></article>
          <article class="glass-card metric"><span>Active Users</span><strong>{{ metrics.activeUsers }}</strong></article>
          <article class="glass-card metric"><span>Trips Generated</span><strong>{{ metrics.generatedTrips }}</strong></article>
          <article class="glass-card metric"><span>Trips Saved</span><strong>{{ metrics.savedTrips }}</strong></article>
          <article class="glass-card metric"><span>Destinations Viewed</span><strong>{{ metrics.destinationsViewed }}</strong></article>
          <article class="glass-card metric"><span>Revenue</span><strong>{{ formatPrice(metrics.revenue) }}</strong></article>
          <article class="glass-card metric"><span>AI Requests</span><strong>{{ metrics.aiRequests }}</strong></article>
          <article class="glass-card metric"><span>Error Rate</span><strong>{{ metrics.errorRate }}%</strong></article>
          <article class="glass-card metric"><span>API Usage</span><strong>{{ metrics.apiUsage }}</strong></article>
          <article class="glass-card metric"><span>Growth</span><strong>{{ metrics.growth }}%</strong></article>
        </div>
      </section>

      <section v-if="activeTab === 'users'" class="glass-card block-card mt-6">
        <h3>User Management</h3>
        <div class="table mt-3">
          <article v-for="user in users" :key="user.id" class="row">
            <div>
              <strong>{{ user.name }}</strong>
              <p>{{ user.email }}</p>
            </div>
            <div class="meta">{{ user.role }} · {{ user.tripCount }} trips · {{ user.status }}</div>
            <div class="actions">
              <button type="button" class="btn btn-outline btn-xs" @click="updateUserStatus(user.id, 'suspended')">Suspend</button>
              <button type="button" class="btn btn-outline btn-xs" @click="updateUserStatus(user.id, 'banned')">Ban</button>
              <button type="button" class="btn btn-outline btn-xs" @click="updateUserStatus(user.id, 'active')">Activate</button>
              <button type="button" class="btn btn-danger btn-xs" @click="deleteUser(user.id)">Delete</button>
            </div>
          </article>
        </div>
      </section>

      <section v-if="activeTab === 'trips'" class="glass-card block-card mt-6">
        <h3>Trip Management</h3>
        <div class="table mt-3" v-if="trips.length > 0">
          <article v-for="trip in trips.slice(0, 12)" :key="trip.id" class="row">
            <div>
              <strong>{{ trip.destination }}</strong>
              <p>{{ trip.days }} days · {{ trip.travelMode || 'Car' }}</p>
            </div>
            <div class="meta">{{ formatPrice(trip?.budget?.total || 0) }}</div>
            <div class="actions">
              <button type="button" class="btn btn-outline btn-xs">View</button>
              <button type="button" class="btn btn-outline btn-xs">Edit</button>
              <button type="button" class="btn btn-danger btn-xs">Delete</button>
            </div>
          </article>
        </div>
        <p v-else class="empty mt-3">No trips available for management.</p>
      </section>

      <section v-if="activeTab === 'destinations'" class="glass-card block-card mt-6">
        <h3>Destination Management</h3>
        <div class="table mt-3">
          <article v-for="destination in destinations" :key="destination.id" class="row">
            <div>
              <strong>{{ destination.name }}</strong>
              <p>Season: {{ destination.seasonal }}</p>
            </div>
            <div class="meta">{{ destination.featured ? 'Featured' : 'Standard' }}</div>
            <div class="actions">
              <button type="button" class="btn btn-outline btn-xs" @click="toggleFeatured(destination.id)">
                {{ destination.featured ? 'Unfeature' : 'Feature' }}
              </button>
              <button type="button" class="btn btn-danger btn-xs" @click="deleteDestination(destination.id)">Delete</button>
            </div>
          </article>
        </div>
      </section>

      <section v-if="activeTab === 'community'" class="glass-card block-card mt-6">
        <h3>Community Moderation</h3>
        <div class="table mt-3" v-if="reportedContent.length > 0">
          <article v-for="item in reportedContent" :key="item.id" class="row">
            <div>
              <strong>{{ item.type.toUpperCase() }}</strong>
              <p>{{ item.summary }}</p>
            </div>
            <div class="meta">{{ item.reason }}</div>
            <div class="actions">
              <button type="button" class="btn btn-outline btn-xs">Approve</button>
              <button type="button" class="btn btn-danger btn-xs">Remove</button>
            </div>
          </article>
        </div>
        <p v-else class="empty mt-3">Moderation queue is empty.</p>
      </section>

      <section v-if="activeTab === 'analytics'" class="glass-card block-card mt-6">
        <h3>Analytics</h3>
        <div class="chart-list mt-3">
          <article v-for="row in chartRows" :key="row.label" class="chart-row">
            <div class="label">{{ row.label }}</div>
            <div class="bar"><span :style="{ width: `${row.value}%` }"></span></div>
            <strong>{{ row.value }}%</strong>
          </article>
        </div>
      </section>

      <section v-if="activeTab === 'ai'" class="glass-card block-card mt-6">
        <h3>AI Admin Tools</h3>
        <ul class="metric-list mt-3">
          <li><span>Prompt Analytics</span><strong>{{ aiHealth.requests }} requests</strong></li>
          <li><span>Model Usage</span><strong>Gemini + local fallback</strong></li>
          <li><span>Token Usage</span><strong>{{ aiHealth.tokenUsage }}</strong></li>
          <li><span>Cost Tracking</span><strong>{{ formatPrice(aiHealth.costUsd) }}</strong></li>
          <li><span>Failure Tracking</span><strong>{{ aiHealth.failures }} failures</strong></li>
          <li><span>AI Health Dashboard</span><strong>{{ aiHealth.avgLatencyMs }} ms avg latency</strong></li>
        </ul>
      </section>

      <section v-if="activeTab === 'settings'" class="glass-card block-card mt-6">
        <h3>Admin Settings</h3>
        <p class="empty mt-3">Role policies, moderation thresholds, and automation rules can be configured here.</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.admin-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 34px;
}

.admin-head h1 {
  margin: 8px 0;
  font-size: clamp(2.2rem, 5vw, 3rem);
  letter-spacing: -0.03em;
}

.admin-head p {
  color: var(--color-text-secondary);
  max-width: 760px;
}

.admin-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #0369a1;
  background: rgba(224, 242, 254, 0.86);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
}

.mt-6 {
  margin-top: 24px;
}

.mt-3 {
  margin-top: 12px;
}

.tabs-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tab-btn {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 7px 12px;
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.tab-btn.active {
  border-color: rgba(13, 148, 136, 0.35);
  background: rgba(209, 250, 229, 0.8);
  color: #0f766e;
}

.tab-btn:hover {
  transform: translateY(-2px);
}

.admin-msg {
  color: #0f766e;
  font-size: 0.82rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.metric {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.9));
}

.metric span {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.metric strong {
  display: block;
  margin-top: 5px;
  font-size: 0.96rem;
}

.block-card,
.loading-card,
.restricted-card {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.9));
}

.table {
  display: grid;
  gap: 8px;
}

.row {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  padding: 9px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
}

.row p {
  margin-top: 2px;
  font-size: 0.74rem;
  color: var(--color-text-secondary);
}

.meta {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.btn-xs {
  font-size: 0.7rem;
  padding: 6px 9px;
}

.chart-list {
  display: grid;
  gap: 10px;
}

.chart-row {
  display: grid;
  grid-template-columns: 160px 1fr 56px;
  gap: 8px;
  align-items: center;
}

.chart-row .label {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.chart-row .bar {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-full);
  height: 12px;
  overflow: hidden;
  background: rgba(248, 250, 252, 0.9);
}

.chart-row .bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #0ea5e9 0%, #14b8a6 100%);
}

.chart-row strong {
  font-size: 0.76rem;
  color: #0f766e;
}

.metric-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.metric-list li {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
}

.metric-list span {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.metric-list strong {
  font-size: 0.78rem;
}

.empty {
  color: var(--color-text-muted);
  font-size: 0.82rem;
}

.restricted-card {
  border: 1px solid rgba(220, 38, 38, 0.24);
}

@media (max-width: 1180px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .row {
    grid-template-columns: 1fr;
  }

  .actions {
    justify-content: flex-start;
  }

  .chart-row {
    grid-template-columns: 1fr;
  }
}
</style>

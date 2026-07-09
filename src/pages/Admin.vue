<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { formatPrice } from "../services/currency";
import { getSavedTripsFromDb } from "../services/firebase";
import {
  backendAdminDeleteUser,
  backendAdminGetOverview,
  backendAdminListUsers,
  backendAdminUpdateUser,
  backendListTrips
} from "../services/api/backendClient";
import {
  clearFeatureFlagOverride,
  getFeatureFlagsSnapshot,
  setFeatureFlagOverride
} from "../config/featureFlags";
import { isAdminUser as hasAdminAccess } from "../utils/adminAccess";
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
const overview = ref({
  metrics: {
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    bannedUsers: 0,
    verifiedUsers: 0,
    totalRevenue: 0,
    totalTrips: 0,
    loginsToday: 0
  },
  recentUsers: [],
  recentRevenueEvents: []
});
const destinations = ref([
  { id: "goa", name: "Goa", featured: true, seasonal: "winter" },
  { id: "bali", name: "Bali", featured: true, seasonal: "summer" },
  { id: "paris", name: "Paris", featured: false, seasonal: "autumn" },
  { id: "tokyo", name: "Tokyo", featured: false, seasonal: "spring" }
]);
const featureFlags = ref(getFeatureFlagsSnapshot());

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

const isAdminUser = computed(() => hasAdminAccess(authStore.user));

const metrics = computed(() => {
  const base = overview.value?.metrics || {};
  const generatedTrips = Number(base.totalTrips || 0);
  const savedTrips = trips.value.filter((trip) => Number(trip?.budget?.total || 0) > 0).length;
  const revenue = Number(base.totalRevenue || 0);
  const verifiedUsers = Number(base.verifiedUsers || 0);
  const totalUsers = Number(base.totalUsers || users.value.length);
  const verificationRate = totalUsers > 0 ? Number(((verifiedUsers / totalUsers) * 100).toFixed(1)) : 0;

  return {
    totalUsers: Number(base.totalUsers || users.value.length),
    activeUsers: Number(base.activeUsers || users.value.filter((user) => user.status === "active").length),
    suspendedUsers: Number(base.suspendedUsers || 0),
    bannedUsers: Number(base.bannedUsers || 0),
    verifiedUsers,
    verificationRate,
    generatedTrips,
    savedTrips,
    destinationsViewed: destinations.value.length * 24,
    revenue,
    loginsToday: Number(base.loginsToday || 0),
    growth: Number(base.totalUsers || 0) > 0 ? 12 : 0
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

const featureFlagRows = computed(() => Object.values(featureFlags.value || {}));

function setMessage(message) {
  adminMessage.value = message;
  setTimeout(() => {
    adminMessage.value = "";
  }, 2200);
}

function refreshFeatureFlags() {
  featureFlags.value = getFeatureFlagsSnapshot();
}

function toggleFeatureFlag(name, enabled) {
  const ok = setFeatureFlagOverride(name, enabled);
  if (!ok) {
    setMessage("Feature flag update failed.");
    return;
  }
  refreshFeatureFlags();
  setMessage(`Feature ${name} set to ${enabled ? "ON" : "OFF"}.`);
}

function resetFeatureFlag(name) {
  const ok = clearFeatureFlagOverride(name);
  if (!ok) {
    setMessage("Could not reset feature flag.");
    return;
  }
  refreshFeatureFlags();
  setMessage(`Feature ${name} reset to env default.`);
}

async function refreshAdminOverview() {
  const remoteOverview = await backendAdminGetOverview();
  if (remoteOverview?.metrics) {
    overview.value = remoteOverview;
  }
}

async function updateUserStatus(userId, status) {
  const updated = await backendAdminUpdateUser(userId, { status });
  if (!updated) {
    setMessage("User status update failed. Check backend server.");
    return;
  }

  users.value = users.value.map((user) => (user.id === userId ? updated : user));
  await refreshAdminOverview();
  setMessage(`User status updated to ${status}.`);
}

async function deleteUser(userId) {
  const removed = await backendAdminDeleteUser(userId);
  if (!removed) {
    setMessage("User delete failed. Check backend server.");
    return;
  }

  users.value = users.value.filter((user) => user.id !== userId);
  await refreshAdminOverview();
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

    const [remoteTrips, remoteUsers, remoteOverview] = await Promise.all([
      backendListTrips(""),
      backendAdminListUsers(),
      backendAdminGetOverview()
    ]);

    trips.value = Array.isArray(remoteTrips) ? remoteTrips : await getSavedTripsFromDb(authStore.user.uid);
    users.value = Array.isArray(remoteUsers) && remoteUsers.length > 0
      ? remoteUsers
      : [
          {
            id: String(authStore.user.uid || "guest"),
            displayName: authStore.displayName,
            email: authStore.user?.email || "",
            role: isAdminUser.value ? "admin" : "member",
            status: "active",
            totalTrips: trips.value.length,
            isVerified: true
          }
        ];

    if (remoteOverview?.metrics) {
      overview.value = remoteOverview;
    }

    communityStore.initForUser(authStore.user);
    communityStore.loadForDestination("Global");
  } finally {
    loading.value = false;
  }
}

onMounted(loadAdminData);
</script>

<template>
  <div class="admin-page container animate-fade-in" style="padding-top: 100px;">
    <div class="admin-head">
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
          <article class="glass-card metric"><span>Verified Users</span><strong>{{ metrics.verifiedUsers }}</strong></article>
          <article class="glass-card metric"><span>Verification Rate</span><strong>{{ metrics.verificationRate }}%</strong></article>
          <article class="glass-card metric"><span>Suspended Users</span><strong>{{ metrics.suspendedUsers }}</strong></article>
          <article class="glass-card metric"><span>Banned Users</span><strong>{{ metrics.bannedUsers }}</strong></article>
          <article class="glass-card metric"><span>Trips Generated</span><strong>{{ metrics.generatedTrips }}</strong></article>
          <article class="glass-card metric"><span>Trips Saved</span><strong>{{ metrics.savedTrips }}</strong></article>
          <article class="glass-card metric"><span>Destinations Viewed</span><strong>{{ metrics.destinationsViewed }}</strong></article>
          <article class="glass-card metric"><span>Revenue</span><strong>{{ formatPrice(metrics.revenue) }}</strong></article>
          <article class="glass-card metric"><span>Logins Today</span><strong>{{ metrics.loginsToday }}</strong></article>
          <article class="glass-card metric"><span>Growth</span><strong>{{ metrics.growth }}%</strong></article>
        </div>
      </section>

      <section v-if="activeTab === 'users'" class="glass-card block-card mt-6">
        <h3>User Management</h3>
        <div class="table mt-3">
          <article v-for="user in users" :key="user.id" class="row">
            <div>
              <strong>{{ user.displayName || user.name || 'Traveler' }}</strong>
              <p>{{ user.email }}</p>
            </div>
            <div class="meta">{{ user.role }} · {{ user.totalTrips || user.tripCount || 0 }} trips · {{ user.status }}</div>
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
        <h3>Real Tracking Snapshot</h3>
        <ul class="metric-list mt-3">
          <li><span>Unique Users</span><strong>{{ metrics.totalUsers }}</strong></li>
          <li><span>Verified Accounts</span><strong>{{ metrics.verifiedUsers }} ({{ metrics.verificationRate }}%)</strong></li>
          <li><span>Total Trips Tracked</span><strong>{{ metrics.generatedTrips }}</strong></li>
          <li><span>Total Revenue Tracked</span><strong>{{ formatPrice(metrics.revenue) }}</strong></li>
          <li><span>Recent Revenue Events</span><strong>{{ overview.recentRevenueEvents?.length || 0 }}</strong></li>
          <li><span>Logins Today</span><strong>{{ metrics.loginsToday }}</strong></li>
        </ul>
      </section>

      <section v-if="activeTab === 'settings'" class="glass-card block-card mt-6">
        <h3>Admin Settings</h3>
        <p class="empty mt-3">Runtime kill switches for high-risk features. Changes are persisted in browser override storage.</p>

        <div class="table mt-3">
          <article v-for="flag in featureFlagRows" :key="flag.name" class="row">
            <div>
              <strong>{{ flag.label }}</strong>
              <p>{{ flag.name }} · Source: {{ flag.source }}</p>
            </div>
            <div class="meta">Current: {{ flag.enabled ? 'ON' : 'OFF' }} · ENV default: {{ flag.envEnabled ? 'ON' : 'OFF' }}</div>
            <div class="actions">
              <button type="button" class="btn btn-outline btn-xs" @click="toggleFeatureFlag(flag.name, true)">Enable</button>
              <button type="button" class="btn btn-outline btn-xs" @click="toggleFeatureFlag(flag.name, false)">Disable</button>
              <button type="button" class="btn btn-danger btn-xs" @click="resetFeatureFlag(flag.name)">Reset</button>
            </div>
          </article>
        </div>

        <p class="empty mt-3">Tip: Open a new tab or navigate again to quickly validate switched behavior in Planner/Roadtrip modules.</p>
      </section>
    </template>
  </div>
</template>

<style scoped src="./styles/Admin.css"></style>

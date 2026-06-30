<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { getSavedTripsFromDb } from "../services/firebase";
import { formatPrice } from "../services/currency";
import { detectUserLocation, userLocation } from "../services/location";
import { fetchWeather } from "../services/weather";
import { fetchNearbyPlaces } from "../services/places";
import { useProfileMemoryStore } from "../stores/profileMemory";
import { useCommunityStore } from "../stores/community";
import { getSmartRecommendations } from "../modules/recommendations/engine";
import { getScamAlerts } from "../modules/scam-alerts/service";
import { getHiddenGems } from "../modules/hidden-gems/service";

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
const profileMemoryStore = useProfileMemoryStore();
const communityStore = useCommunityStore();

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
const recommendationsLoading = ref(true);
const recommendationsError = ref("");
const recommendations = ref(null);
const communityLoading = ref(true);
const communityError = ref("");
const phaseThreeLoading = ref(true);
const phaseThreeError = ref("");
const liveScamAlerts = ref(null);
const hiddenGemsSpotlight = ref(null);

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

const averageTripCost = computed(() => {
  if (trips.value.length === 0) {
    return 0;
  }

  return Math.round(totalBudget.value / trips.value.length);
});

const citiesVisited = computed(() => {
  const cities = trips.value
    .map((trip) => String(trip?.destination || "").split(",")[0].trim())
    .filter(Boolean);

  return new Set(cities).size;
});

const countriesVisited = computed(() => {
  const countries = trips.value
    .map((trip) => {
      const parts = String(trip?.destination || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length > 1) {
        return parts[parts.length - 1];
      }

      return "";
    })
    .filter(Boolean);

  return new Set(countries).size;
});

const memoryTimelinePreview = computed(() => profileMemoryStore.timeline.slice(0, 5));
const travelHistorySummary = computed(() => profileMemoryStore.historySummary);
const communityPulse = computed(() => communityStore.pulse);
const communityPostsPreview = computed(() => communityStore.posts.slice(0, 3));
const communityReviewsPreview = computed(() => communityStore.reviews.slice(0, 3));
const liveScamClass = computed(() => {
  const level = String(liveScamAlerts.value?.level || "").toLowerCase();
  if (level === "high") return "risk-high";
  if (level === "moderate") return "risk-medium";
  return "risk-low";
});

const loadDashboardData = async () => {
  loading.value = true;
  liveLoading.value = true;
  intelligenceLoading.value = true;
  recommendationsLoading.value = true;
  communityLoading.value = true;
  phaseThreeLoading.value = true;
  dashboardError.value = "";
  liveError.value = "";
  intelligenceError.value = "";
  recommendationsError.value = "";
  communityError.value = "";
  phaseThreeError.value = "";

  try {
    await authStore.initAuth();
    if (!authStore.user?.uid) {
      router.replace("/login");
      return;
    }

    profileMemoryStore.initForUser(authStore.user.uid);
    communityStore.initForUser(authStore.user);
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

    try {
      recommendations.value = await getSmartRecommendations({
        profileMemory: profileMemoryStore.memory,
        personalityLabel: profileMemoryStore.personality?.label,
        budgetTarget: profileMemoryStore.budgetTarget || averageTripCost.value || 1500,
        limit: 5
      });
    } catch (_recommendationError) {
      recommendations.value = null;
      recommendationsError.value = "Personalized recommendations are temporarily unavailable.";
    } finally {
      recommendationsLoading.value = false;
    }

    try {
      const topDestination = recentTrips.value[0]?.destination || profileMemoryStore.topDestinations?.[0] || "Global";
      communityStore.loadForDestination(topDestination);
    } catch (_communityLoadError) {
      communityError.value = "Community pulse is temporarily unavailable.";
    } finally {
      communityLoading.value = false;
    }

    try {
      const topDestination =
        recentTrips.value[0]?.destination ||
        profileMemoryStore.topDestinations?.[0] ||
        userLocation.value?.city ||
        "Global";
      const style = String(profileMemoryStore.preferredSettings?.style || "balanced").toLowerCase();
      const budgetPreference = style.includes("budget") ? "budget" : style.includes("lux") ? "premium" : "balanced";

      const [scamResult, gemsResult] = await Promise.all([
        getScamAlerts({
          destinationName: topDestination,
          destinationLocation: userLocation.value?.city || userLocation.value?.country,
          travelMode: "general",
          timeBand: "auto"
        }),
        getHiddenGems({
          destinationName: topDestination,
          destinationLocation: userLocation.value?.city || userLocation.value?.country,
          budgetPreference,
          crowdPreference: "low",
          limit: 4
        })
      ]);

      liveScamAlerts.value = scamResult;
      hiddenGemsSpotlight.value = gemsResult;
    } catch (_phaseThreeLoadError) {
      liveScamAlerts.value = null;
      hiddenGemsSpotlight.value = null;
      phaseThreeError.value = "Phase 3 live intelligence is temporarily unavailable.";
    } finally {
      phaseThreeLoading.value = false;
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
        <span class="hud-badge">EXPERIENCE COMMAND CENTER</span>
        <h1>Welcome Back, {{ authStore.displayName }}</h1>
        <p>
          Track your travel memory, live signals, and planning momentum from one premium cockpit.
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
              <button type="button" class="btn btn-outline" @click="router.push('/roadtrips')">Roadtrip Workspace</button>
              <button type="button" class="btn btn-outline" @click="router.push('/group-trips')">Group Trips</button>
              <button type="button" class="btn btn-outline" @click="router.push('/community')">Community Hub</button>
              <button type="button" class="btn btn-outline" @click="router.push('/documents')">Document Vault</button>
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

        <section class="memory-history-grid mt-8">
          <article class="glass-card profile-memory-panel">
            <div class="panel-head">
              <h3>Travel Personality</h3>
              <span class="live-pill">{{ profileMemoryStore.scores.overall }}/100</span>
            </div>
            <h4>{{ profileMemoryStore.personality?.label }}</h4>
            <p class="panel-copy">{{ profileMemoryStore.personality?.description }}</p>
            <div class="personality-tags mt-3">
              <span v-for="trait in profileMemoryStore.personality?.traits || []" :key="trait" class="trait-pill">{{ trait }}</span>
            </div>
            <p class="panel-copy mt-3">{{ profileMemoryStore.profileNudge }}</p>

            <div class="timeline-list mt-4" v-if="memoryTimelinePreview.length > 0">
              <article v-for="event in memoryTimelinePreview" :key="event.id" class="timeline-item">
                <strong>{{ event.destination }}</strong>
                <small>{{ event.summary }}</small>
              </article>
            </div>
          </article>

          <article class="glass-card travel-history-panel">
            <div class="panel-head">
              <h3>Travel History Dashboard</h3>
              <span class="live-pill">Phase 1</span>
            </div>

            <div class="history-grid mt-4">
              <article class="history-card">
                <span>Total Trips</span>
                <strong>{{ travelHistorySummary.totalTrips }}</strong>
              </article>
              <article class="history-card">
                <span>Countries Visited</span>
                <strong>{{ countriesVisited }}</strong>
              </article>
              <article class="history-card">
                <span>Cities Visited</span>
                <strong>{{ citiesVisited }}</strong>
              </article>
              <article class="history-card">
                <span>Total Budget Spent</span>
                <strong>{{ formatPrice(travelHistorySummary.totalBudgetSpent) }}</strong>
              </article>
              <article class="history-card">
                <span>Average Trip Cost</span>
                <strong>{{ formatPrice(averageTripCost) }}</strong>
              </article>
              <article class="history-card">
                <span>Favorite Destination Type</span>
                <strong>{{ travelHistorySummary.favoriteDestinationType }}</strong>
              </article>
            </div>

            <div class="style-evolution mt-4">
              <span>Travel Style Evolution</span>
              <p>{{ (travelHistorySummary.travelStyleEvolution || []).join(" → ") || "Learning style evolution from saved trips" }}</p>
            </div>
          </article>
        </section>

        <section class="glass-card recommendations-panel mt-8">
          <div class="live-head">
            <h3>Smart Recommendations</h3>
            <span class="live-pill">Memory + Season + Budget</span>
          </div>

          <div v-if="recommendationsLoading" class="stats-grid mt-4">
            <div v-for="n in 3" :key="n" class="stat-card skeleton"></div>
          </div>

          <div v-else-if="recommendationsError" class="panel-error mt-4">
            <h4>Recommendations Unavailable</h4>
            <p>{{ recommendationsError }}</p>
            <button type="button" class="btn btn-outline mt-4" @click="loadDashboardData">Retry Recommendations</button>
          </div>

          <div v-else-if="!recommendations" class="panel-empty mt-4">
            <h4>No Recommendation Signals</h4>
            <p>Create and save more trips to unlock stronger recommendation quality.</p>
          </div>

          <div v-else class="recommendation-grid mt-4">
            <article class="recommendation-card">
              <h4>Destinations</h4>
              <ul>
                <li v-for="destination in recommendations.destinations || []" :key="destination.id || destination.name">{{ destination.name }} - {{ destination.location }}</li>
              </ul>
            </article>

            <article class="recommendation-card">
              <h4>Hotels and Attractions</h4>
              <ul>
                <li v-for="hotel in (recommendations.hotels || []).slice(0, 4)" :key="`hotel-${hotel.name}`">Hotel: {{ hotel.name }}</li>
                <li v-for="spot in (recommendations.attractions || []).slice(0, 3)" :key="`spot-${spot.name}`">Attraction: {{ spot.name }}</li>
              </ul>
            </article>

            <article class="recommendation-card">
              <h4>Activities and Rationale</h4>
              <ul>
                <li v-for="activity in recommendations.activities || []" :key="`activity-${activity}`">{{ activity }}</li>
              </ul>
              <p class="recommendation-rationale mt-3">{{ (recommendations.rationale || []).join(" | ") }}</p>
            </article>
          </div>
        </section>

        <section class="glass-card phase-three-panel mt-8">
          <div class="live-head">
            <h3>Phase 3 Live Signals</h3>
            <span class="live-pill">Scam Watch + Hidden Gems</span>
          </div>

          <div v-if="phaseThreeLoading" class="stats-grid mt-4">
            <div v-for="n in 2" :key="`phase-three-loading-${n}`" class="stat-card skeleton"></div>
          </div>

          <div v-else-if="phaseThreeError" class="panel-error mt-4">
            <h4>Live Phase 3 Signals Unavailable</h4>
            <p>{{ phaseThreeError }}</p>
            <button type="button" class="btn btn-outline mt-4" @click="loadDashboardData">Retry Phase 3</button>
          </div>

          <div v-else-if="!liveScamAlerts && !hiddenGemsSpotlight" class="panel-empty mt-4">
            <h4>No Phase 3 Signals</h4>
            <p>Create and save trips to strengthen hidden gems and scam alerts context.</p>
          </div>

          <div v-else class="phase-three-grid mt-4">
            <article class="phase-three-card">
              <div class="phase-three-head">
                <h4>Live Scam Watch</h4>
                <span class="risk-pill" :class="liveScamClass">{{ liveScamAlerts?.level || "Low" }} Risk</span>
              </div>
              <p class="phase-three-meta">Destination: {{ liveScamAlerts?.destination || "Current context" }}</p>
              <p class="phase-three-meta">Risk Score: {{ liveScamAlerts?.riskScore ?? "N/A" }}/100</p>
              <ul>
                <li v-for="alert in (liveScamAlerts?.alerts || []).slice(0, 3)" :key="alert.id">
                  <strong>{{ alert.title }}:</strong> {{ alert.hotspot }}
                </li>
              </ul>
            </article>

            <article class="phase-three-card">
              <div class="phase-three-head">
                <h4>Hidden Gems Spotlight</h4>
                <button type="button" class="btn btn-outline btn-xs" @click="router.push('/community')">Open Community</button>
              </div>
              <p class="phase-three-meta">Destination: {{ hiddenGemsSpotlight?.destination || "Current context" }}</p>
              <ul>
                <li v-for="gem in hiddenGemsSpotlight?.gems || []" :key="gem.id">
                  <strong>{{ gem.name }}</strong> - {{ gem.category }} - {{ gem.relevanceScore }}/100
                </li>
              </ul>
            </article>
          </div>
        </section>

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

        <section class="glass-card community-panel mt-8">
          <div class="live-head">
            <h3>Community Pulse & Reviews</h3>
            <span class="live-pill">Phase 3</span>
          </div>

          <div v-if="communityLoading" class="stats-grid mt-4">
            <div v-for="n in 3" :key="`community-loading-${n}`" class="stat-card skeleton"></div>
          </div>

          <div v-else-if="communityError" class="panel-error mt-4">
            <h4>Community Feed Unavailable</h4>
            <p>{{ communityError }}</p>
            <button type="button" class="btn btn-outline mt-4" @click="loadDashboardData">Retry Community</button>
          </div>

          <div v-else-if="!communityPulse" class="panel-empty mt-4">
            <h4>No Community Signals</h4>
            <p>Community pulse will appear as destination posts and reviews grow.</p>
          </div>

          <div v-else class="community-grid mt-4">
            <article class="community-card">
              <h4>Pulse Overview</h4>
              <ul>
                <li>Destination: {{ communityPulse.destination }}</li>
                <li>Total Posts: {{ communityPulse.totalPosts }}</li>
                <li>Total Reviews: {{ communityPulse.totalReviews }}</li>
                <li>Avg Rating: {{ communityPulse.avgRating || "N/A" }}</li>
                <li>Top Tags: {{ (communityPulse.topTags || []).join(" | ") || "No tags yet" }}</li>
              </ul>
            </article>

            <article class="community-card">
              <h4>Recent Community Posts</h4>
              <ul>
                <li v-for="post in communityPostsPreview" :key="post.id">
                  <strong>{{ post.authorName }}</strong>: {{ post.text }}
                </li>
              </ul>
            </article>

            <article class="community-card">
              <h4>Recent Destination Reviews</h4>
              <ul>
                <li v-for="review in communityReviewsPreview" :key="review.id">
                  <strong>{{ review.rating }}/5</strong> - {{ review.title }}
                </li>
              </ul>
            </article>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped src="./styles/Dashboard.css"></style>

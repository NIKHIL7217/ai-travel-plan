<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { formatPrice } from "../services/currency";
import { saveTripToDb } from "../services/firebase";
import { getRouteIntelligence, getTrafficInsights } from "../services/routes";
import { getDestinationDetails, getRealLocationData } from "../services/gemini";
import { getFriendlyErrorMessage } from "../core/errors";
import { getVisaIntelligence } from "../modules/visa-intelligence/service";
import { getScamAlerts } from "../modules/scam-alerts/service";
import { getHiddenGems } from "../modules/hidden-gems/service";
import { useAuthStore } from "../stores/auth";
import { useCommunityStore } from "../stores/community";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const communityStore = useCommunityStore();

const loading = ref(true);
const detailsError = ref("");
const destination = ref(null);
const liveLocations = ref(null);
const locationError = ref("");

const heroActionMessage = ref("");
const activeSection = ref("overview");
const originCity = ref("");
const routeLoading = ref(false);
const routeError = ref("");
const routeData = ref(null);
const trafficData = ref(null);

const visaNationality = ref("Indian");
const visaPurpose = ref("tourism");
const visaDurationDays = ref(7);
const visaLoading = ref(false);
const visaError = ref("");
const visaData = ref(null);

const scamLoading = ref(false);
const scamError = ref("");
const scamData = ref(null);

const gemsLoading = ref(false);
const gemsError = ref("");
const gemsData = ref(null);

const communityLoading = ref(false);
const communityError = ref("");

const reviewTitle = ref("");
const reviewBody = ref("");
const reviewRating = ref(4);
const reviewCostLevel = ref("moderate");
const reviewVisitType = ref("solo");
const reviewMessage = ref("");

const sections = [
  { id: "overview", label: "Overview" },
  { id: "experiences", label: "Experiences" },
  { id: "stays", label: "Stays" },
  { id: "food", label: "Food" },
  { id: "route", label: "Route" },
  { id: "safety", label: "Safety" }
];

const destinationName = computed(() => String(destination.value?.name || "Destination"));

const liveAttractions = computed(() => {
  const local = liveLocations.value?.attractions || [];
  if (local.length > 0) {
    return local;
  }

  return (destination.value?.attractions || []).map((item, index) => ({
    id: `${item.name || "attraction"}-${index}`,
    name: item.name,
    desc: item.desc || "Must-see place"
  }));
});

const stayOptions = computed(() => {
  const local = liveLocations.value?.hotels || [];
  if (local.length > 0) {
    return local;
  }

  return destination.value?.hotels || [];
});

const foodOptions = computed(() => {
  const local = liveLocations.value?.restaurants || [];
  if (local.length > 0) {
    return local;
  }

  return destination.value?.food || [];
});

const nearbyHospitals = computed(() => liveLocations.value?.hospitals || destination.value?.nearbyExplorer?.hospitals || []);
const nearbyFuel = computed(() => liveLocations.value?.fuelStations || destination.value?.nearbyExplorer?.fuelStations || []);

const destinationReviews = computed(() => communityStore.reviews.slice(0, 6));
const communityPosts = computed(() => communityStore.posts.slice(0, 4));
const communityPulse = computed(() => communityStore.pulse || null);

const averageReview = computed(() => {
  if (!destinationReviews.value.length) {
    return 0;
  }

  const total = destinationReviews.value.reduce((sum, row) => sum + Number(row.rating || 0), 0);
  return Number((total / destinationReviews.value.length).toFixed(1));
});

const scamRiskClass = computed(() => {
  const level = String(scamData.value?.level || "").toLowerCase();
  if (level === "high") return "status-high";
  if (level === "moderate") return "status-medium";
  return "status-low";
});

const heroBackgroundStyle = computed(() => {
  const image = destination.value?.image || "";
  return {
    backgroundImage: `linear-gradient(150deg, rgba(8,47,73,0.74), rgba(15,118,110,0.5)), url('${image}')`
  };
});

const destinationSummary = computed(() => {
  const budget = Number(destination.value?.startingBudget || 0);
  const distance = destination.value?.distanceFromHubs || "Distance unavailable";
  return {
    season: destination.value?.bestTime || "Season data unavailable",
    budget,
    distance,
    currency: destination.value?.localCurrency || "USD ($)",
    travelScore: destination.value?.travelScore || 0,
    safetyScore: destination.value?.safetyScore || 0,
    aqi: destination.value?.aqi
  };
});

function formatRelativeTime(timestamp) {
  const diffMs = Date.now() - Number(timestamp || Date.now());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function openPlanner() {
  if (!destination.value?.name) {
    return;
  }

  router.push({
    path: "/planner",
    query: {
      destination: destination.value.name,
      q: `Plan a ${destination.value.name} trip with best local experiences and practical routing.`
    }
  });
}

async function saveDestinationTrip() {
  if (!destination.value) {
    return;
  }

  await authStore.initAuth();
  if (!authStore.user?.uid) {
    router.push({ path: "/login", query: { redirect: route.fullPath } });
    return;
  }

  try {
    await saveTripToDb(
      {
        destination: destination.value.name,
        days: 4,
        travelers: 2,
        style: "Balanced",
        travelMode: "Flight",
        stayPreference: "mid-range",
        foodPreference: "mixed",
        budget: {
          total: Number(destination.value.startingBudget || 0),
          accommodation: Math.round(Number(destination.value.startingBudget || 0) * 0.35),
          food: Math.round(Number(destination.value.startingBudget || 0) * 0.2),
          transportation: Math.round(Number(destination.value.startingBudget || 0) * 0.2),
          activities: Math.round(Number(destination.value.startingBudget || 0) * 0.15),
          flights: Math.round(Number(destination.value.startingBudget || 0) * 0.1)
        },
        itinerary: (destination.value.attractions || []).slice(0, 4).map((item, index) => ({
          day: index + 1,
          theme: item.name || `Day ${index + 1}`,
          morning: item.desc || "Explore local highlights",
          afternoon: "Discover neighborhood food and culture",
          evening: "Relax and local walks",
          foodRecommendation: (destination.value.food || [])[0]?.name || "Local cuisine"
        }))
      },
      authStore.user.uid
    );

    heroActionMessage.value = "Destination saved to your Trips.";
  } catch (error) {
    heroActionMessage.value = getFriendlyErrorMessage(error, "Unable to save this destination right now.");
  }

  setTimeout(() => {
    heroActionMessage.value = "";
  }, 2400);
}

function shareDestination() {
  const target = destination.value?.name || "destination";
  const shareText = `Check this destination on WanderAI: ${target}`;

  if (navigator.share) {
    navigator.share({
      title: `Explore ${target}`,
      text: shareText,
      url: window.location.href
    }).catch(() => {
      // Share cancel is non-blocking.
    });
    return;
  }

  navigator.clipboard?.writeText(window.location.href).then(() => {
    heroActionMessage.value = "Link copied. Share it with your crew.";
    setTimeout(() => {
      heroActionMessage.value = "";
    }, 2200);
  });
}

function openMapSearch(name, lat, lng) {
  const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  const query = hasCoords ? `${lat},${lng}` : String(name || destinationName.value);
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function analyzeRoute() {
  if (!originCity.value.trim() || !destination.value?.name) {
    return;
  }

  routeLoading.value = true;
  routeError.value = "";

  try {
    const [routeResult, trafficResult] = await Promise.all([
      getRouteIntelligence(originCity.value.trim(), destination.value.name),
      getTrafficInsights(originCity.value.trim(), destination.value.name)
    ]);

    routeData.value = routeResult;
    trafficData.value = trafficResult;
  } catch (error) {
    routeError.value = getFriendlyErrorMessage(error, "Route intelligence is unavailable right now.");
  } finally {
    routeLoading.value = false;
  }
}

async function refreshVisa() {
  if (!destination.value?.name) {
    visaData.value = null;
    return;
  }

  visaLoading.value = true;
  visaError.value = "";

  try {
    visaData.value = await getVisaIntelligence({
      destinationName: destination.value.name,
      destinationLocation: destination.value.location,
      nationality: visaNationality.value,
      purpose: visaPurpose.value,
      durationDays: visaDurationDays.value
    });
  } catch (error) {
    visaData.value = null;
    visaError.value = getFriendlyErrorMessage(error, "Visa intelligence is unavailable right now.");
  } finally {
    visaLoading.value = false;
  }
}

async function refreshSafetySignals() {
  if (!destination.value?.name) {
    return;
  }

  scamLoading.value = true;
  gemsLoading.value = true;
  scamError.value = "";
  gemsError.value = "";

  try {
    scamData.value = await getScamAlerts({
      destinationName: destination.value.name,
      destinationLocation: destination.value.location,
      travelMode: "general",
      timeBand: "auto"
    });
  } catch (error) {
    scamData.value = null;
    scamError.value = getFriendlyErrorMessage(error, "Scam alerts are unavailable right now.");
  } finally {
    scamLoading.value = false;
  }

  try {
    gemsData.value = await getHiddenGems({
      destinationName: destination.value.name,
      destinationLocation: destination.value.location,
      budgetPreference: "balanced",
      crowdPreference: "low",
      limit: 6
    });
  } catch (error) {
    gemsData.value = null;
    gemsError.value = getFriendlyErrorMessage(error, "Hidden gems are unavailable right now.");
  } finally {
    gemsLoading.value = false;
  }
}

async function refreshCommunity() {
  if (!destination.value?.name) {
    return;
  }

  communityLoading.value = true;
  communityError.value = "";

  try {
    communityStore.loadForDestination(destination.value.name);
  } catch (error) {
    communityError.value = getFriendlyErrorMessage(error, "Community feed is unavailable right now.");
  } finally {
    communityLoading.value = false;
  }
}

async function submitReview() {
  if (!destination.value?.name) {
    return;
  }

  if (!reviewTitle.value.trim() || !reviewBody.value.trim()) {
    reviewMessage.value = "Review title and details are required.";
    return;
  }

  reviewMessage.value = "";

  try {
    communityStore.createReview({
      destination: destination.value.name,
      rating: reviewRating.value,
      title: reviewTitle.value,
      body: reviewBody.value,
      costLevel: reviewCostLevel.value,
      visitType: reviewVisitType.value,
      user: {
        uid: authStore.user?.uid || "guest",
        displayName: authStore.displayName || "Traveler"
      }
    });

    reviewTitle.value = "";
    reviewBody.value = "";
    reviewRating.value = 4;
    reviewCostLevel.value = "moderate";
    reviewVisitType.value = "solo";
    reviewMessage.value = "Review submitted to destination community.";
  } catch (error) {
    reviewMessage.value = getFriendlyErrorMessage(error, "Unable to submit review right now.");
  }
}

async function loadDestination() {
  loading.value = true;
  detailsError.value = "";
  locationError.value = "";

  const routeId = String(route.params.id || "").trim();
  const sourceInput = String(route.query.mapsQuery || routeId).trim();

  if (!sourceInput) {
    detailsError.value = "Destination identifier is missing.";
    loading.value = false;
    return;
  }

  try {
    const [destinationResult, locationResult] = await Promise.allSettled([
      getDestinationDetails(sourceInput),
      getRealLocationData(sourceInput)
    ]);

    if (destinationResult.status !== "fulfilled" || !destinationResult.value) {
      throw destinationResult.reason || new Error("No destination details returned.");
    }

    destination.value = destinationResult.value;

    if (locationResult.status === "fulfilled") {
      liveLocations.value = locationResult.value;
    } else {
      liveLocations.value = null;
      locationError.value = getFriendlyErrorMessage(locationResult.reason, "Live place data unavailable.");
    }

    await Promise.all([refreshVisa(), refreshSafetySignals(), refreshCommunity()]);
  } catch (error) {
    destination.value = null;
    liveLocations.value = null;
    detailsError.value = getFriendlyErrorMessage(error, "Failed to load destination details right now.");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await authStore.initAuth();
  communityStore.initForUser(authStore.user || { uid: "guest", displayName: authStore.displayName || "Traveler" });
  await loadDestination();
});

watch(
  () => [route.params.id, route.query.mapsQuery],
  async () => {
    await loadDestination();
  }
);
</script>

<template>
  <div v-if="loading" class="container details-loading" style="padding-top: 120px;">
    <article class="glass-card skeleton-card">
      <p>Loading destination guide...</p>
    </article>
  </div>

  <div v-else-if="detailsError" class="container" style="padding-top: 120px;">
    <article class="glass-card error-card">
      <h3>Unable to Load Destination</h3>
      <p>{{ detailsError }}</p>
      <button type="button" class="btn btn-primary mt-4" @click="loadDestination">Retry</button>
    </article>
  </div>

  <div v-else-if="destination" class="destination-guide animate-fade-in">
    <section class="guide-hero" :style="heroBackgroundStyle">
      <div class="container hero-inner">
        <span class="hero-badge">CITY GUIDE</span>
        <h1>{{ destination.name }}</h1>
        <p>{{ destination.description }}</p>
        <div class="hero-meta">
          <span>{{ destination.location }}</span>
          <span>Rating {{ destination.rating }}</span>
          <span>{{ destinationSummary.distance }}</span>
        </div>

        <div class="hero-actions mt-4">
          <button type="button" class="btn btn-primary" @click="openPlanner">Plan</button>
          <button type="button" class="btn btn-outline" @click="saveDestinationTrip">Save</button>
          <button type="button" class="btn btn-outline" @click="shareDestination">Share</button>
        </div>

        <p v-if="heroActionMessage" class="hero-message mt-3">{{ heroActionMessage }}</p>
      </div>
    </section>

    <section class="container quick-stats mt-6">
      <article class="quick-stat glass-card">
        <span>Best Season</span>
        <strong>{{ destinationSummary.season }}</strong>
      </article>
      <article class="quick-stat glass-card">
        <span>Starter Budget</span>
        <strong>{{ formatPrice(destinationSummary.budget) }}</strong>
      </article>
      <article class="quick-stat glass-card">
        <span>Travel Score</span>
        <strong>{{ destinationSummary.travelScore }}/100</strong>
      </article>
      <article class="quick-stat glass-card">
        <span>Safety Score</span>
        <strong>{{ destinationSummary.safetyScore }}/100</strong>
      </article>
    </section>

    <section class="container section-tabs mt-6">
      <button
        v-for="item in sections"
        :key="item.id"
        type="button"
        class="section-tab"
        :class="{ active: activeSection === item.id }"
        @click="activeSection = item.id"
      >
        {{ item.label }}
      </button>
    </section>

    <section class="container content-grid mt-6">
      <main class="main-col">
        <article v-if="activeSection === 'overview'" class="glass-card panel">
          <h3>Overview</h3>
          <p class="panel-copy mt-3">{{ destination.longDescription || destination.description }}</p>

          <div class="tips-grid mt-4">
            <article class="tip-card" v-for="(tip, idx) in destination.tips || []" :key="`tip-${idx}`">
              {{ tip }}
            </article>
          </div>

          <div class="visa-card mt-6">
            <div class="panel-head">
              <h4>Visa Intelligence</h4>
              <button type="button" class="btn btn-outline btn-xs" :disabled="visaLoading" @click="refreshVisa">
                {{ visaLoading ? "Checking..." : "Refresh" }}
              </button>
            </div>

            <div class="visa-controls mt-3">
              <input v-model="visaNationality" class="form-input" placeholder="Nationality" />
              <select v-model="visaPurpose" class="form-select">
                <option value="tourism">Tourism</option>
                <option value="business">Business</option>
                <option value="student">Student</option>
              </select>
              <input v-model.number="visaDurationDays" type="number" min="1" max="180" class="form-input" placeholder="Days" />
            </div>

            <p v-if="visaError" class="error-text mt-3">{{ visaError }}</p>
            <div v-else-if="visaData" class="visa-grid mt-3">
              <article><span>Status</span><strong>{{ visaData.statusLabel }}</strong></article>
              <article><span>Type</span><strong>{{ visaData.visaType }}</strong></article>
              <article><span>Processing</span><strong>{{ visaData.processingTime }}</strong></article>
              <article><span>Estimated Cost</span><strong>{{ formatPrice(visaData.estimatedCostUsd || 0) }}</strong></article>
            </div>
          </div>
        </article>

        <article v-if="activeSection === 'experiences'" class="glass-card panel">
          <h3>Experiences</h3>
          <p class="panel-copy">Popular attractions and high-value hidden gems.</p>

          <div class="card-grid mt-4">
            <article v-for="(item, idx) in liveAttractions.slice(0, 12)" :key="`exp-${idx}`" class="info-card">
              <strong>{{ item.name }}</strong>
              <p>{{ item.desc || item.address || "Attraction details" }}</p>
              <button type="button" class="btn btn-outline btn-xs" @click="openMapSearch(item.name, item.lat, item.lng)">Open Map</button>
            </article>
          </div>

          <div class="signals-card mt-6">
            <div class="panel-head">
              <h4>Hidden Gems</h4>
              <button type="button" class="btn btn-outline btn-xs" :disabled="gemsLoading" @click="refreshSafetySignals">Refresh</button>
            </div>
            <p v-if="gemsError" class="error-text mt-3">{{ gemsError }}</p>
            <div v-else-if="gemsLoading" class="panel-copy mt-3">Refreshing hidden gems...</div>
            <div v-else class="card-grid mt-3">
              <article v-for="gem in gemsData?.gems || []" :key="gem.id" class="info-card">
                <strong>{{ gem.name }}</strong>
                <p>{{ gem.highlight }}</p>
                <small>{{ gem.relevanceScore }}/100 | {{ gem.bestWindow }}</small>
              </article>
            </div>
          </div>
        </article>

        <article v-if="activeSection === 'stays'" class="glass-card panel">
          <h3>Stays</h3>
          <p class="panel-copy">Shortlisted hotels with distance and ratings.</p>

          <p v-if="locationError" class="error-text mt-3">{{ locationError }}</p>

          <div class="card-grid mt-4">
            <article v-for="(hotel, idx) in stayOptions.slice(0, 12)" :key="`hotel-${idx}`" class="info-card">
              <strong>{{ hotel.name }}</strong>
              <p>
                <span v-if="hotel.distance">{{ hotel.distance }}</span>
                <span v-if="hotel.rating"> | Rating {{ hotel.rating }}</span>
              </p>
              <small v-if="hotel.price">From {{ formatPrice(hotel.price) }}</small>
              <button type="button" class="btn btn-outline btn-xs" @click="openMapSearch(hotel.name, hotel.lat, hotel.lng)">Open Map</button>
            </article>
          </div>
        </article>

        <article v-if="activeSection === 'food'" class="glass-card panel">
          <h3>Food</h3>
          <p class="panel-copy">Local dishes and restaurants worth trying.</p>

          <div class="card-grid mt-4">
            <article v-for="(food, idx) in foodOptions.slice(0, 12)" :key="`food-${idx}`" class="info-card">
              <strong>{{ food.name }}</strong>
              <p>{{ food.desc || food.type || food.address || "Popular local choice" }}</p>
              <small v-if="food.averagePrice">Average {{ formatPrice(food.averagePrice) }}</small>
              <button type="button" class="btn btn-outline btn-xs" @click="openMapSearch(food.name, food.lat, food.lng)">Open Map</button>
            </article>
          </div>
        </article>

        <article v-if="activeSection === 'route'" class="glass-card panel">
          <h3>Route</h3>
          <p class="panel-copy">Analyze route, travel modes, and traffic from your city.</p>

          <form class="route-form mt-4" @submit.prevent="analyzeRoute">
            <input v-model="originCity" class="form-input" placeholder="Enter origin city" />
            <button type="submit" class="btn btn-primary" :disabled="routeLoading">
              {{ routeLoading ? "Analyzing..." : "Analyze Route" }}
            </button>
          </form>

          <p v-if="routeError" class="error-text mt-3">{{ routeError }}</p>

          <div v-if="routeData" class="route-panel mt-4">
            <strong>{{ routeData.routeSummary }}</strong>
            <div class="route-grid mt-3">
              <article>
                <span>Flight</span>
                <strong>{{ routeData.vehicleBreakdown?.flight?.duration || "N/A" }}</strong>
              </article>
              <article>
                <span>Train</span>
                <strong>{{ routeData.vehicleBreakdown?.train?.duration || "N/A" }}</strong>
              </article>
              <article>
                <span>Car</span>
                <strong>{{ routeData.vehicleBreakdown?.car?.duration || "N/A" }}</strong>
              </article>
              <article>
                <span>Bus</span>
                <strong>{{ routeData.vehicleBreakdown?.bus?.duration || "N/A" }}</strong>
              </article>
            </div>
            <div v-if="trafficData" class="traffic-chip mt-3">
              Traffic: {{ trafficData.level }} | Congestion {{ trafficData.congestionPercent }}%
            </div>
          </div>
        </article>

        <article v-if="activeSection === 'safety'" class="glass-card panel">
          <h3>Safety Signals</h3>
          <p class="panel-copy">Scam alerts, nearby hospitals, fuel points, and community recommendations.</p>

          <div class="signals-card mt-4">
            <div class="panel-head">
              <h4>Scam Alerts</h4>
              <button type="button" class="btn btn-outline btn-xs" :disabled="scamLoading" @click="refreshSafetySignals">Refresh</button>
            </div>
            <p v-if="scamError" class="error-text mt-3">{{ scamError }}</p>
            <div v-else-if="scamLoading" class="panel-copy mt-3">Refreshing scam alerts...</div>
            <template v-else-if="scamData">
              <div class="risk-row mt-3">
                <span class="risk-pill" :class="scamRiskClass">{{ scamData.level }} Risk</span>
                <small>{{ scamData.riskScore }}/100</small>
              </div>
              <div class="card-grid mt-3">
                <article v-for="alert in (scamData.alerts || []).slice(0, 6)" :key="alert.id" class="info-card">
                  <strong>{{ alert.title }}</strong>
                  <p>{{ alert.description }}</p>
                  <small>{{ alert.hotspot }} | {{ alert.timeWindow }}</small>
                </article>
              </div>
            </template>
          </div>

          <div class="card-grid mt-6">
            <article v-for="(hospital, idx) in nearbyHospitals.slice(0, 4)" :key="`hospital-${idx}`" class="info-card">
              <strong>{{ hospital.name }}</strong>
              <p>{{ hospital.address || hospital.distance }}</p>
              <button type="button" class="btn btn-outline btn-xs" @click="openMapSearch(hospital.name, hospital.lat, hospital.lng)">Hospital Map</button>
            </article>

            <article v-for="(fuel, idx) in nearbyFuel.slice(0, 4)" :key="`fuel-${idx}`" class="info-card">
              <strong>{{ fuel.name }}</strong>
              <p>{{ fuel.address || fuel.distance }}</p>
              <button type="button" class="btn btn-outline btn-xs" @click="openMapSearch(fuel.name, fuel.lat, fuel.lng)">Fuel Map</button>
            </article>
          </div>
        </article>
      </main>

      <aside class="side-col">
        <article class="glass-card side-panel">
          <div class="panel-head">
            <h4>Community Snapshot</h4>
            <button type="button" class="btn btn-outline btn-xs" :disabled="communityLoading" @click="refreshCommunity">Refresh</button>
          </div>

          <p v-if="communityError" class="error-text mt-3">{{ communityError }}</p>

          <div class="metric-list mt-3">
            <article><span>Reviews</span><strong>{{ destinationReviews.length }}</strong></article>
            <article><span>Avg Rating</span><strong>{{ averageReview || communityPulse?.avgRating || 0 }}</strong></article>
            <article><span>Posts</span><strong>{{ communityPulse?.totalPosts || communityPosts.length }}</strong></article>
          </div>

          <div class="side-list mt-4" v-if="destinationReviews.length > 0">
            <article v-for="review in destinationReviews" :key="review.id" class="mini-item">
              <strong>{{ review.title }}</strong>
              <p>{{ review.body }}</p>
              <small>{{ review.authorName }} | {{ review.rating }}/5 | {{ formatRelativeTime(review.createdAt) }}</small>
            </article>
          </div>
          <p v-else class="panel-copy mt-3">No destination reviews yet.</p>
        </article>

        <article class="glass-card side-panel mt-4">
          <h4>Share Your Review</h4>

          <input v-model="reviewTitle" class="form-input mt-3" placeholder="Review title" />
          <textarea v-model="reviewBody" class="form-input mt-2" rows="4" placeholder="Tell travelers what to do and avoid"></textarea>

          <div class="review-controls mt-2">
            <label>
              <span>Rating</span>
              <select v-model.number="reviewRating" class="form-select">
                <option :value="5">5</option>
                <option :value="4">4</option>
                <option :value="3">3</option>
                <option :value="2">2</option>
                <option :value="1">1</option>
              </select>
            </label>

            <label>
              <span>Cost</span>
              <select v-model="reviewCostLevel" class="form-select">
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </label>

            <label>
              <span>Visit Type</span>
              <select v-model="reviewVisitType" class="form-select">
                <option value="solo">Solo</option>
                <option value="friends">Friends</option>
                <option value="family">Family</option>
                <option value="couple">Couple</option>
              </select>
            </label>
          </div>

          <button type="button" class="btn btn-primary mt-3" @click="submitReview">Submit Review</button>
          <p v-if="reviewMessage" class="panel-copy mt-3">{{ reviewMessage }}</p>
        </article>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.destination-guide {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 34px;
}

.guide-hero {
  min-height: 430px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
}

.hero-inner {
  padding-bottom: 40px;
  color: #f8fafc;
}

.hero-badge {
  display: inline-block;
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  font-weight: 800;
  color: #a7f3d0;
}

.hero-inner h1 {
  margin-top: 10px;
  font-size: clamp(2.5rem, 6vw, 4rem);
  letter-spacing: -0.04em;
}

.hero-inner p {
  margin-top: 8px;
  max-width: 760px;
  color: rgba(241, 245, 249, 0.94);
  line-height: 1.55;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.hero-meta span {
  border: 1px solid rgba(226, 232, 240, 0.35);
  border-radius: var(--radius-full);
  background: rgba(15, 23, 42, 0.4);
  padding: 5px 10px;
  font-size: 0.74rem;
  font-weight: 700;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-message {
  font-size: 0.8rem;
  color: #bbf7d0;
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

.mt-2 {
  margin-top: 8px;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.quick-stat {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
}

.quick-stat span {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.quick-stat strong {
  display: block;
  margin-top: 4px;
  font-size: 0.94rem;
}

.section-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-tab {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 8px 12px;
  cursor: pointer;
}

.section-tab.active {
  border-color: rgba(13, 148, 136, 0.35);
  background: rgba(209, 250, 229, 0.78);
  color: #0f766e;
}

.content-grid {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr;
  gap: 14px;
}

.main-col,
.side-col {
  display: grid;
  align-content: start;
  gap: 10px;
}

.panel,
.side-panel,
.error-card,
.skeleton-card {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
}

.panel-copy {
  color: var(--color-text-secondary);
  font-size: 0.84rem;
  line-height: 1.5;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.btn-xs {
  font-size: 0.72rem;
  padding: 6px 10px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.info-card {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.92);
  padding: 9px;
  display: grid;
  gap: 5px;
}

.info-card strong {
  font-size: 0.82rem;
}

.info-card p {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.info-card small {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.tips-grid {
  display: grid;
  gap: 8px;
}

.tip-card {
  border: 1px dashed rgba(148, 163, 184, 0.42);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.88);
  padding: 10px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.visa-card,
.signals-card,
.route-panel {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
}

.visa-controls,
.route-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.visa-grid,
.metric-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.visa-grid article,
.metric-list article {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  padding: 8px;
  background: rgba(255, 255, 255, 0.95);
}

.visa-grid span,
.metric-list span {
  display: block;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.visa-grid strong,
.metric-list strong {
  margin-top: 4px;
  display: block;
  font-size: 0.82rem;
}

.route-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.route-grid article {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  padding: 8px;
  background: rgba(255, 255, 255, 0.95);
}

.route-grid span {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.route-grid strong {
  display: block;
  margin-top: 4px;
  font-size: 0.82rem;
}

.traffic-chip {
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: var(--radius-full);
  display: inline-block;
  padding: 6px 10px;
  font-size: 0.74rem;
  font-weight: 700;
  color: #0369a1;
  background: rgba(224, 242, 254, 0.78);
}

.risk-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.risk-pill {
  border-radius: var(--radius-full);
  padding: 5px 9px;
  font-size: 0.7rem;
  font-weight: 700;
}

.risk-pill.status-high {
  border: 1px solid rgba(220, 38, 38, 0.3);
  background: rgba(254, 226, 226, 0.74);
  color: #b91c1c;
}

.risk-pill.status-medium {
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: rgba(254, 243, 199, 0.84);
  color: #b45309;
}

.risk-pill.status-low {
  border: 1px solid rgba(5, 150, 105, 0.3);
  background: rgba(209, 250, 229, 0.78);
  color: #047857;
}

.side-list {
  display: grid;
  gap: 8px;
}

.mini-item {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.92);
  padding: 8px;
}

.mini-item strong {
  font-size: 0.8rem;
}

.mini-item p {
  margin-top: 4px;
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.mini-item small {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.review-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.review-controls label {
  display: grid;
  gap: 4px;
}

.review-controls span {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.error-text {
  color: #b91c1c;
  font-size: 0.8rem;
}

.details-loading {
  display: grid;
}

.skeleton-card,
.error-card {
  padding: 18px;
}

@media (max-width: 1100px) {
  .quick-stats {
    grid-template-columns: 1fr 1fr;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .quick-stats,
  .card-grid,
  .visa-controls,
  .route-form,
  .visa-grid,
  .metric-list,
  .route-grid,
  .review-controls {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
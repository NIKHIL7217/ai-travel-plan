<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getDestinationDetails, resolveUnsplashImage, getRouteIntelligence, getRealLocationData } from "../services/gemini";
import { formatPrice } from "../services/currency";
import GlassPanel from "../shared/ui/GlassPanel.vue";
import Icons from "../shared/icons/Icons.vue";
import { getTrafficInsights } from "../services/routes";
import { getFriendlyErrorMessage } from "../core/errors";

const route = useRoute();
const router = useRouter();

const destId = ref("");
const destData = ref(null);
const loading = ref(true);
const detailsError = ref("");
const activeTab = ref("overview"); // overview | attractions | hotels | food | transport | weather

// Route Intelligence State
const originCity = ref("");
const routeData = ref(null);
const routeLoading = ref(false);
const routeAnalyzed = ref(false);
const activeVehicle = ref("car"); // flight | train | bus | car | bike
const selectedVehicleMode = ref(null);
const showFuelStops = ref(false);
const trafficInsights = ref(null);
const routeError = ref("");
let autoRefreshIntervalId = null;

// Real Location Data
const realLocations = ref(null);
const locationsLoading = ref(false);
const locationsError = ref("");
const mapsQuery = computed(() => String(route.query.mapsQuery || "").trim());

const attractionsToShow = computed(() => {
  if (realLocations.value?.attractions?.length) {
    return realLocations.value.attractions;
  }
  return destData.value?.attractions || [];
});

const nearbyHospitals = computed(() => realLocations.value?.hospitals || destData.value?.nearbyExplorer?.hospitals || []);
const nearbyFuelStations = computed(() => realLocations.value?.fuelStations || destData.value?.nearbyExplorer?.fuelStations || []);
const nearbyRestaurants = computed(() => realLocations.value?.restaurants || destData.value?.nearbyExplorer?.restaurants || []);
const restaurantOptions = computed(() => realLocations.value?.restaurants || destData.value?.foodCostAnalysis?.popularRestaurants || []);

const loadDestinationDetails = async () => {
  destId.value = route.params.id;
  const sourceInput = mapsQuery.value || String(destId.value || "");
  if (!sourceInput) return;

  loading.value = true;
  detailsError.value = "";
  locationsError.value = "";
  try {
    destData.value = await getDestinationDetails(sourceInput);
    if (!destData.value) {
      throw new Error("No destination details returned.");
    }

    // Load real location data in parallel
    locationsLoading.value = true;
    try {
      realLocations.value = await getRealLocationData(destData.value.name);
    } catch (locationError) {
      realLocations.value = null;
      locationsError.value = getFriendlyErrorMessage(locationError, "Live location intelligence is unavailable right now.");
    } finally {
      locationsLoading.value = false;
    }
  } catch (e) {
    console.error("Failed to load details:", e);
    destData.value = null;
    detailsError.value = getFriendlyErrorMessage(e, "Failed to load destination details right now.");
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadDestinationDetails();

  // Auto-refresh live destination intelligence every 90 seconds.
  autoRefreshIntervalId = window.setInterval(async () => {
    if (!destData.value?.name || locationsLoading.value) return;
    await refreshLiveLocationData();
    if (routeAnalyzed.value && originCity.value.trim()) {
      await refreshTrafficInsights();
    }
  }, 90000);
});

watch(
  () => [route.params.id, route.query.mapsQuery],
  async () => {
    await loadDestinationDetails();
  }
);

onUnmounted(() => {
  if (autoRefreshIntervalId) {
    clearInterval(autoRefreshIntervalId);
    autoRefreshIntervalId = null;
  }
});

const refreshLiveLocationData = async () => {
  if (!destData.value?.name) return;
  locationsLoading.value = true;
  locationsError.value = "";
  try {
    realLocations.value = await getRealLocationData(destData.value.name);
  } catch (error) {
    console.error("Failed to refresh live location data:", error);
    locationsError.value = getFriendlyErrorMessage(error, "Unable to refresh live location data right now.");
  } finally {
    locationsLoading.value = false;
  }
};

const refreshTrafficInsights = async () => {
  if (!originCity.value.trim() || !destData.value?.name) return;
  try {
    trafficInsights.value = await getTrafficInsights(originCity.value.trim(), destData.value.name);
  } catch (error) {
    console.error("Failed to refresh live traffic insights:", error);
    routeError.value = getFriendlyErrorMessage(error, "Unable to refresh traffic insights right now.");
  }
};

const handlePlanClick = () => {
  if (destData.value) {
    router.push({ path: "/planner", query: { destination: destData.value.name } });
  }
};

const analyzeRoute = async () => {
  if (!originCity.value.trim() || !destData.value) return;
  routeLoading.value = true;
  routeError.value = "";
  routeAnalyzed.value = false;
  selectedVehicleMode.value = null;
  trafficInsights.value = null;
  try {
    const [routeResult, trafficResult] = await Promise.all([
      getRouteIntelligence(originCity.value.trim(), destData.value.name),
      getTrafficInsights(originCity.value.trim(), destData.value.name)
    ]);

    routeData.value = routeResult;
    trafficInsights.value = trafficResult;
    routeAnalyzed.value = Boolean(routeResult);
  } catch (e) {
    console.error("Route intelligence failed:", e);
    routeData.value = null;
    routeError.value = getFriendlyErrorMessage(e, "Route intelligence is unavailable right now.");
  } finally {
    routeLoading.value = false;
  }
};

const openGoogleMaps = (lat, lng, name) => {
  const query = name ? `${name} ${lat},${lng}` : `${lat},${lng}`;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  window.open(url, '_blank');
};

const getCheapestFuel = (vehicle) => {
  if (!vehicle?.fuelTypes) return null;
  return vehicle.fuelTypes.reduce((min, ft) => ft.totalFuelCost < min.totalFuelCost ? ft : min, vehicle.fuelTypes[0]);
};

const getAqiText = (aqi) => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Sensitive";
  return "Unhealthy";
};

const getAqiClass = (aqi) => {
  if (aqi <= 50) return "aqi-good";
  if (aqi <= 100) return "aqi-moderate";
  if (aqi <= 150) return "aqi-sensitive";
  return "aqi-unhealthy";
};

const getWeatherEmoji = (general) => {
  const gen = (general || "").toLowerCase();
  if (gen.includes("sunny") || gen.includes("clear")) return "☀️";
  if (gen.includes("cloud")) return "⛅";
  if (gen.includes("rain")) return "🌧️";
  if (gen.includes("thunder")) return "⛈️";
  if (gen.includes("snow")) return "❄️";
  return "🌡️";
};

const getTierLabel = (tier) => {
  const labels = { luxury: "👑 Luxury", premium: "🏢 Premium", "mid-range": "🏨 Mid-Range", budget: "💰 Budget", hostel: "🎒 Hostel" };
  return labels[tier] || "🏨 Hotel";
};

const getTierClass = (tier) => {
  return `tier-${tier || 'budget'}`;
};

const hotelsByTier = computed(() => {
  if (!realLocations.value?.hotels) return {};
  const grouped = {};
  realLocations.value.hotels.forEach(h => {
    const tier = h.tier || 'budget';
    if (!grouped[tier]) grouped[tier] = [];
    grouped[tier].push(h);
  });
  return grouped;
});
</script>

<template>
  <div v-if="loading" class="details-loading container" style="padding-top: 120px;">
    <div class="skeleton banner-sk"></div>
    <div class="details-skeleton-grid mt-8">
      <div class="skeleton side-sk"></div>
      <div class="skeleton main-sk"></div>
    </div>
  </div>
  <div v-else-if="detailsError" class="container" style="padding-top: 120px;">
    <div class="tab-state-card error">
      <h3>Unable to Load Destination</h3>
      <p>{{ detailsError }}</p>
      <button type="button" class="btn btn-primary mt-4" @click="loadDestinationDetails">Retry</button>
    </div>
  </div>

  <div v-else-if="destData" class="details-page-layout animate-fade-in">
    <!-- Large Hero Banner -->
    <section 
      class="details-hero-banner" 
      :style="{ backgroundImage: `url(${destData.image})` }"
    >
      <div class="banner-overlay"></div>
      <div class="container banner-content">
        <span class="banner-loc">{{ destData.location }}</span>
        <h1>{{ destData.name }}</h1>
        <p class="banner-desc">{{ destData.description }}</p>
        <div class="banner-rating">
          ⭐ <span class="monospaced">{{ destData.rating }}</span> ({{ destData.reviewsCount || '1,240' }} Reviews)
        </div>
      </div>
    </section>

    <!-- Route Origin Input Bar -->
    <section class="route-origin-bar container">
      <div class="origin-card glass-card">
        <div class="origin-left">
          <span class="origin-icon">📍</span>
          <div class="origin-info">
            <span class="origin-label">YOUR STARTING POINT</span>
            <span class="origin-sublabel">Enter your city to get real-time route intelligence</span>
          </div>
        </div>
        <form @submit.prevent="analyzeRoute" class="origin-form">
          <input 
            v-model="originCity" 
            type="text" 
            placeholder="e.g. Mumbai, Delhi, Bangalore..." 
            class="origin-input"
          />
          <button type="submit" class="btn btn-primary origin-btn" :disabled="routeLoading">
            <span v-if="routeLoading" class="btn-spinner"></span>
            {{ routeLoading ? 'Analyzing...' : '🔍 Analyze Route' }}
          </button>
        </form>
      </div>
      
      <!-- Route Summary Badge -->
      <div v-if="routeAnalyzed && routeData" class="route-summary-badge animate-fade-in">
        <span class="route-badge-icon">🛣️</span>
        <span class="route-badge-text">{{ routeData.routeSummary }}</span>
        <div class="route-quick-stats">
          <span class="rq-stat">🚗 {{ routeData.vehicleBreakdown?.car?.duration }}</span>
          <span class="rq-stat">🚆 {{ routeData.vehicleBreakdown?.train?.duration }}</span>
          <span class="rq-stat">✈️ {{ routeData.vehicleBreakdown?.flight?.duration }}</span>
        </div>
      </div>
    </section>

    <!-- Content Workspace -->
    <div class="container details-workspace mt-12">
      <!-- Main Content Tabs -->
      <div class="details-main-col">
        <!-- Quick Stats Cards Row -->
        <div class="quick-stats-row">
          <div class="stat-card glass-card">
            <span class="stat-icon">📅</span>
            <div class="stat-txt">
              <span class="s-lbl">BEST SEASON</span>
              <span class="s-val">{{ destData.bestTime }}</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <span class="stat-icon">💳</span>
            <div class="stat-txt">
              <span class="s-lbl">MIN BUDGET</span>
              <span class="s-val monospaced">{{ formatPrice(destData.startingBudget) }}</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <span class="stat-icon">⏱️</span>
            <div class="stat-txt">
              <span class="s-lbl">DISTANCE/FLIGHT</span>
              <span class="s-val">{{ destData.distanceFromHubs || 'N/A' }}</span>
            </div>
          </div>

          <div class="stat-card glass-card">
            <span class="stat-icon">🪙</span>
            <div class="stat-txt">
              <span class="s-lbl">LOCAL CURRENCY</span>
              <span class="s-val">{{ destData.localCurrency || 'USD ($)' }}</span>
            </div>
          </div>
        </div>

        <!-- Section 6 Tabs Header -->
        <div class="details-tabs-header">
          <button 
            type="button" 
            :class="['details-tab', activeTab === 'overview' ? 'active' : '']" 
            @click="activeTab = 'overview'"
          >
            Overview & AI Report
          </button>
          <button 
            type="button" 
            :class="['details-tab', activeTab === 'attractions' ? 'active' : '']" 
            @click="activeTab = 'attractions'"
          >
            Attractions & Nearby
          </button>
          <button 
            type="button" 
            :class="['details-tab', activeTab === 'hotels' ? 'active' : '']" 
            @click="activeTab = 'hotels'"
          >
            Stays Options
          </button>
          <button 
            type="button" 
            :class="['details-tab', activeTab === 'food' ? 'active' : '']" 
            @click="activeTab = 'food'"
          >
            Food & Dining
          </button>
          <button 
            type="button" 
            :class="['details-tab', activeTab === 'transport' ? 'active' : '']" 
            @click="activeTab = 'transport'"
          >
            Transport & Fuel
          </button>
          <button 
            type="button" 
            :class="['details-tab', activeTab === 'weather' ? 'active' : '']" 
            @click="activeTab = 'weather'"
          >
            Weather & AQI
          </button>
        </div>

        <!-- Tabs Body -->
        <div class="details-tab-body glass-card">
          
          <!-- Tab 1: Overview & AI Report -->
          <div v-if="activeTab === 'overview'" class="tab-pane">
            <div class="overview-grid">
              <div class="overview-main">
                <h3>About {{ destData.name }}</h3>
                <p class="overview-txt">{{ destData.description }}</p>
                <p class="overview-txt mt-4">{{ destData.longDescription }}</p>
              </div>

              <!-- Scores -->
              <div class="scores-panel glass-card">
                <div class="score-item">
                  <div class="score-header">
                    <span class="score-label">✈️ Travel Score</span>
                    <span class="score-value monospaced">{{ destData.travelScore }}/100</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill primary-bg" :style="{ width: destData.travelScore + '%' }"></div>
                  </div>
                </div>

                <div class="score-item mt-4">
                  <div class="score-header">
                    <span class="score-label">🛡️ Safety Rating</span>
                    <span class="score-value monospaced">{{ destData.safetyScore }}/100</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill accent-bg" :style="{ width: destData.safetyScore + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Advantages & Disadvantages -->
            <div class="pros-cons-grid mt-6">
              <div class="pros-box glass-card">
                <h4>👍 Advantages</h4>
                <ul class="pros-cons-list">
                  <li v-for="adv in destData.advantages" :key="adv">
                    <span class="pro-icon">✓</span> {{ adv }}
                  </li>
                </ul>
              </div>
              <div class="cons-box glass-card">
                <h4>👎 Disadvantages</h4>
                <ul class="pros-cons-list">
                  <li v-for="dis in destData.disadvantages" :key="dis">
                    <span class="con-icon">✗</span> {{ dis }}
                  </li>
                </ul>
              </div>
            </div>

            <!-- Crowd Suitability -->
            <div class="suitability-box glass-card mt-6">
              <h4>👥 Crowd Suitability</h4>
              <div class="suitability-grid mt-4">
                <div class="suit-item">
                  <span class="suit-badge">Family</span>
                  <p>{{ destData.suitability?.family }}</p>
                </div>
                <div class="suit-item">
                  <span class="suit-badge">Solo Travelers</span>
                  <p>{{ destData.suitability?.solo }}</p>
                </div>
                <div class="suit-item">
                  <span class="suit-badge">Couples</span>
                  <p>{{ destData.suitability?.couple }}</p>
                </div>
                <div class="suit-item">
                  <span class="suit-badge">Budget</span>
                  <p>{{ destData.suitability?.budget }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 2: Attractions & Nearby -->
          <div v-if="activeTab === 'attractions'" class="tab-pane">
            <div class="section-title-wrap">
              <h3>Top Attractions</h3>
              <button type="button" class="btn btn-outline btn-sm" @click="refreshLiveLocationData" :disabled="locationsLoading">
                {{ locationsLoading ? 'Refreshing...' : 'Refresh Live Data' }}
              </button>
            </div>

            <div v-if="locationsError" class="tab-state-card error mt-4">
              <h4>Live Location Feed Unavailable</h4>
              <p>{{ locationsError }}</p>
              <button type="button" class="btn btn-outline mt-4" @click="refreshLiveLocationData">Retry Live Feed</button>
            </div>

            <div v-if="locationsLoading" class="tab-state-card loading mt-4">
              <h4>Refreshing Live Data</h4>
              <p>Fetching updated nearby attractions and geo points.</p>
            </div>

            <div v-else-if="!attractionsToShow.length" class="tab-state-card empty mt-4">
              <h4>No Attractions Available</h4>
              <p>No live attractions were found for this destination.</p>
            </div>

            <div v-else class="attractions-gallery mt-4">
              <div 
                v-for="att in attractionsToShow" 
                :key="att.name" 
                class="gallery-item glass-card"
              >
                <div class="gallery-photo-placeholder">
                  <img :src="resolveUnsplashImage(att.name)" :alt="att.name" class="gallery-photo" loading="lazy" />
                </div>
                <div class="gallery-info">
                  <h4>{{ att.name }}</h4>
                  <p>{{ att.desc }}</p>
                  <button
                    v-if="att.lat && att.lng"
                    class="coord-badge small mt-2"
                    @click="openGoogleMaps(att.lat, att.lng, att.name)"
                  >
                    🗺️ {{ att.lat?.toFixed(4) }}, {{ att.lng?.toFixed(4) }}
                  </button>
                </div>
              </div>
            </div>

            <div class="nearby-explorer-section mt-8">
              <div class="section-title-wrap">
                <h3>📡 GPS Nearby Explorer</h3>
                <p class="section-subtitle">Real locations with GPS coordinates near {{ destData.name }}</p>
              </div>

              <div class="nearby-grid mt-4">
                <!-- Hospitals -->
                <div class="nearby-category-card glass-card">
                  <h5>🏥 Hospitals & Clinics</h5>
                  <ul class="nearby-list">
                    <li v-for="hosp in nearbyHospitals" :key="hosp.name">
                      <div class="nearby-item-main">
                        <span class="item-name">{{ hosp.name }}</span>
                        <span v-if="hosp.address" class="item-address">{{ hosp.address }}</span>
                      </div>
                      <div class="nearby-item-actions">
                        <span class="item-meta">📍 {{ hosp.distance }} • ⭐ {{ hosp.rating }}</span>
                        <button 
                          v-if="hosp.lat && hosp.lng" 
                          class="coord-badge" 
                          @click="openGoogleMaps(hosp.lat, hosp.lng, hosp.name)"
                          :title="`Open ${hosp.name} in Google Maps`"
                        >
                          🗺️ {{ hosp.lat?.toFixed(4) }}, {{ hosp.lng?.toFixed(4) }}
                        </button>
                      </div>
                    </li>
                    <li v-if="!nearbyHospitals.length" class="nearby-empty-item">No nearby hospital data available.</li>
                  </ul>
                </div>

                <!-- Fuel Stations -->
                <div class="nearby-category-card glass-card">
                  <h5>⛽ Fuel Stations</h5>
                  <ul class="nearby-list">
                    <li v-for="fuel in nearbyFuelStations" :key="fuel.name">
                      <div class="nearby-item-main">
                        <span class="item-name">{{ fuel.name }}</span>
                        <span v-if="fuel.types" class="item-types">{{ fuel.types.join(' • ') }}</span>
                      </div>
                      <div class="nearby-item-actions">
                        <span class="item-meta">📍 {{ fuel.distance }} • ⭐ {{ fuel.rating }}</span>
                        <button 
                          v-if="fuel.lat && fuel.lng" 
                          class="coord-badge" 
                          @click="openGoogleMaps(fuel.lat, fuel.lng, fuel.name)"
                        >
                          🗺️ {{ fuel.lat?.toFixed(4) }}, {{ fuel.lng?.toFixed(4) }}
                        </button>
                      </div>
                    </li>
                    <li v-if="!nearbyFuelStations.length" class="nearby-empty-item">No nearby fuel station data available.</li>
                  </ul>
                </div>

                <!-- EV Charging -->
                <div v-if="realLocations?.evChargingStations" class="nearby-category-card glass-card">
                  <h5>🔋 EV Charging Stations</h5>
                  <ul class="nearby-list">
                    <li v-for="ev in realLocations.evChargingStations" :key="ev.name">
                      <div class="nearby-item-main">
                        <span class="item-name">{{ ev.name }}</span>
                        <span class="item-types">{{ ev.chargingType }} • {{ ev.connector }}</span>
                      </div>
                      <div class="nearby-item-actions">
                        <span class="item-meta">📍 {{ ev.distance }} • ⭐ {{ ev.rating }}</span>
                        <button 
                          v-if="ev.lat && ev.lng" 
                          class="coord-badge" 
                          @click="openGoogleMaps(ev.lat, ev.lng, ev.name)"
                        >
                          🗺️ {{ ev.lat?.toFixed(4) }}, {{ ev.lng?.toFixed(4) }}
                        </button>
                      </div>
                    </li>
                  </ul>
                </div>

                <!-- Restaurants -->
                <div class="nearby-category-card glass-card">
                  <h5>🍽️ Restaurants & Cafes</h5>
                  <ul class="nearby-list">
                    <li v-for="rest in nearbyRestaurants" :key="rest.name">
                      <div class="nearby-item-main">
                        <span class="item-name">{{ rest.name }}</span>
                        <span v-if="rest.type" class="item-types">{{ rest.type }}</span>
                      </div>
                      <div class="nearby-item-actions">
                        <span class="item-meta">📍 {{ rest.distance }} • ⭐ {{ rest.rating }}</span>
                        <button 
                          v-if="rest.lat && rest.lng" 
                          class="coord-badge" 
                          @click="openGoogleMaps(rest.lat, rest.lng, rest.name)"
                        >
                          🗺️ {{ rest.lat?.toFixed(4) }}, {{ rest.lng?.toFixed(4) }}
                        </button>
                      </div>
                    </li>
                    <li v-if="!nearbyRestaurants.length" class="nearby-empty-item">No nearby restaurant data available.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 3: Stays Options with Real Location Data -->
          <div v-if="activeTab === 'hotels'" class="tab-pane">
            <div class="section-title-wrap">
              <h3>Accommodations & Stays</h3>
              <p class="section-subtitle">Real hotels near {{ destData.name }} with GPS coordinates and pricing</p>
            </div>

            <!-- Real Location Hotels grouped by tier -->
            <div v-if="realLocations?.hotels" class="stays-tiers-list mt-6">
              <div v-for="(hotels, tier) in hotelsByTier" :key="tier" class="stay-tier-section" :class="{ 'mt-6': tier !== Object.keys(hotelsByTier)[0] }">
                <h4>{{ getTierLabel(tier) }}</h4>
                <div class="stays-grid">
                  <div v-for="hotel in hotels" :key="hotel.name" class="stay-card glass-card">
                    <img :src="resolveUnsplashImage(hotel.name + ' hotel')" class="stay-img" loading="lazy" />
                    <div class="stay-body">
                      <h5>{{ hotel.name }}</h5>
                      <div class="stay-meta">
                        <span>⭐ {{ hotel.rating }}</span>
                        <span>• {{ hotel.reviews }} reviews</span>
                        <span>• {{ hotel.distance }} away</span>
                      </div>
                      <span v-if="hotel.address" class="stay-address">📍 {{ hotel.address }}</span>
                      <div class="stay-footer">
                        <span class="stay-price monospaced">{{ formatPrice(hotel.price, 'INR') }}<span class="stay-lbl">/night</span></span>
                        <button 
                          v-if="hotel.lat && hotel.lng" 
                          class="coord-badge small" 
                          @click="openGoogleMaps(hotel.lat, hotel.lng, hotel.name)"
                        >
                          🗺️ {{ hotel.lat?.toFixed(4) }}, {{ hotel.lng?.toFixed(4) }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Fallback to original accommodation data -->
            <div v-else class="stays-tiers-list mt-6">
              <div v-if="destData.accommodationOptions?.hostels?.length" class="stay-tier-section">
                <h4>🎒 Hostels & Shared Dorms</h4>
                <div class="stays-grid">
                  <div v-for="stay in destData.accommodationOptions.hostels" :key="stay.name" class="stay-card glass-card">
                    <img :src="stay.image || resolveUnsplashImage('hostel')" class="stay-img" loading="lazy" />
                    <div class="stay-body">
                      <h5>{{ stay.name }}</h5>
                      <div class="stay-meta">
                        <span>⭐ {{ stay.rating }}</span>
                        <span>• {{ stay.reviews }} reviews</span>
                        <span>• {{ stay.distance }} away</span>
                      </div>
                      <div class="stay-footer">
                        <span class="stay-price monospaced">{{ formatPrice(stay.price) }}<span class="stay-lbl">/night</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 4: Food & Dining with Coordinates -->
          <div v-if="activeTab === 'food'" class="tab-pane">
            <h3>Average Daily Dining Budget</h3>
            <div class="food-budget-row mt-4">
              <div class="food-budget-card glass-card">
                <span class="budget-tier-icon">🥪</span>
                <h5>Budget Dining</h5>
                <p class="budget-cost monospaced">{{ formatPrice(destData.foodCostAnalysis?.budgetDaily) }} / day</p>
                <p class="budget-desc">Local street food, bakeries, and casual diners.</p>
              </div>

              <div class="food-budget-card glass-card">
                <span class="budget-tier-icon">🍝</span>
                <h5>Mid-Range Bistro</h5>
                <p class="budget-cost monospaced">{{ formatPrice(destData.foodCostAnalysis?.midRangeDaily) }} / day</p>
                <p class="budget-desc">Sit-down family restaurants and local cafes.</p>
              </div>

              <div class="food-budget-card glass-card">
                <span class="budget-tier-icon">🍷</span>
                <h5>Luxury Fine Dining</h5>
                <p class="budget-cost monospaced">{{ formatPrice(destData.foodCostAnalysis?.luxuryDaily) }} / day</p>
                <p class="budget-desc">Upscale culinary experiences and hotel bistros.</p>
              </div>
            </div>

            <h3 class="mt-8">Popular Restaurants with Locations</h3>
            <div v-if="restaurantOptions.length" class="restaurant-list mt-4">
              <div v-for="rest in restaurantOptions" :key="rest.name" class="restaurant-card glass-card">
                <div class="rest-details">
                  <h4>🍽️ {{ rest.name }}</h4>
                  <span class="rest-cuisine">{{ rest.type }}</span>
                  <span v-if="rest.address" class="rest-address">📍 {{ rest.address }}</span>
                </div>
                <div class="rest-right">
                  <span class="rest-price monospaced">Avg: {{ formatPrice(rest.averagePrice || 0, 'INR') }}</span>
                  <span v-if="rest.rating" class="rest-rating">⭐ {{ rest.rating }}</span>
                  <button 
                    v-if="rest.lat && rest.lng" 
                    class="coord-badge small"
                    @click="openGoogleMaps(rest.lat, rest.lng, rest.name)"
                  >
                    🗺️ {{ rest.lat?.toFixed(4) }}, {{ rest.lng?.toFixed(4) }}
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="tab-state-card empty mt-4">
              <h4>No Restaurant Data Available</h4>
              <p>Live nearby dining data is currently unavailable for this destination.</p>
            </div>

            <h3 class="mt-8">Must-Try Local Delicacies</h3>
            <div class="food-list mt-4">
              <div v-for="dish in destData.food" :key="dish.name" class="food-item glass-card">
                <h4>🔥 {{ dish.name }}</h4>
                <p>{{ dish.desc }}</p>
              </div>
            </div>
          </div>

          <!-- Tab 5: Transport & Fuel (COMPLETE REDESIGN) -->
          <div v-if="activeTab === 'transport'" class="tab-pane">
            <div v-if="routeError" class="tab-state-card error mb-4">
              <h4>Route Intelligence Error</h4>
              <p>{{ routeError }}</p>
              <button type="button" class="btn btn-outline mt-4" @click="analyzeRoute">Retry Route Analysis</button>
            </div>
            
            <!-- No route analyzed prompt -->
            <div v-if="!routeAnalyzed" class="transport-prompt glass-card">
              <div class="prompt-icon">🛣️</div>
              <h3>Enter Your Starting City</h3>
              <p>Use the route analyzer above to get detailed transport costs between your city and {{ destData.name }}.</p>
              <p class="prompt-hint">Includes: Flight, Train, Car & Bike costs with Petrol/Diesel/CNG/Electric breakdowns</p>
              <form @submit.prevent="analyzeRoute" class="prompt-form mt-4">
                <input v-model="originCity" type="text" placeholder="Enter your city (e.g. Mumbai)" class="form-input" />
                <button type="submit" class="btn btn-primary" :disabled="routeLoading">
                  {{ routeLoading ? 'Analyzing...' : 'Analyze Route' }}
                </button>
              </form>
            </div>

            <!-- Route Intelligence Dashboard -->
            <div v-else-if="routeData" class="route-dashboard animate-fade-in">
              
              <!-- Step 1: Select Travel Mode Card Selection Screen -->
              <div v-if="!selectedVehicleMode" class="travel-mode-choice-screen glass-card">
                <h3>Choose Your Mode of Travel</h3>
                <p class="subtitle">Select how you want to travel to {{ destData.name }} to calculate dynamic real-time costs and routes.</p>
                
                <div class="travel-modes-grid mt-6">
                  <div 
                    v-for="v in ['flight', 'train', 'bus', 'car', 'bike']" 
                    :key="v" 
                    class="mode-choice-card glass-card"
                    @click="selectedVehicleMode = v; activeVehicle = v;"
                  >
                    <span class="mode-icon-lg">{{ routeData.vehicleBreakdown?.[v]?.icon }}</span>
                    <h4>{{ routeData.vehicleBreakdown?.[v]?.label }}</h4>
                    <span class="mode-duration monospaced">{{ routeData.vehicleBreakdown?.[v]?.duration }}</span>
                    <span class="mode-select-btn mt-4">Select Mode</span>
                  </div>
                </div>
              </div>

              <!-- Step 2: Show Details for the chosen vehicle mode -->
              <div v-else class="mode-details-area">
                <button class="btn btn-outline btn-sm mb-4" @click="selectedVehicleMode = null">
                  ← Change Travel Mode
                </button>

                <!-- Route Header -->
                <div class="route-header glass-card">
                  <div class="route-header-main">
                    <div class="route-endpoints">
                      <span class="route-city origin">{{ routeData.origin }}</span>
                      <span class="route-arrow">→</span>
                      <span class="route-city dest">{{ routeData.destination }}</span>
                    </div>
                    <div class="route-distances">
                      <span class="rd-item">🛣️ Road: <strong>{{ routeData.roadDistance }} km</strong></span>
                      <span class="rd-item">✈️ Air: <strong>{{ routeData.flightDistance }} km</strong></span>
                    </div>
                  </div>
                </div>

                <div v-if="trafficInsights" class="traffic-card glass-card mt-4">
                  <div class="traffic-head">
                    <h4>Live Traffic Update</h4>
                    <span class="traffic-level" :class="`traffic-${trafficInsights.level?.toLowerCase() || 'unknown'}`">{{ trafficInsights.level || 'Unknown' }}</span>
                  </div>
                  <div class="traffic-metrics">
                    <span>Current Avg Speed: <strong>{{ trafficInsights.averageCurrentSpeed }} km/h</strong></span>
                    <span>Free Flow Speed: <strong>{{ trafficInsights.averageFreeFlowSpeed }} km/h</strong></span>
                    <span>Congestion: <strong>{{ trafficInsights.congestionPercent }}%</strong></span>
                  </div>
                  <p v-if="trafficInsights.updatedAt" class="traffic-updated">Updated: {{ new Date(trafficInsights.updatedAt).toLocaleString() }}</p>
                </div>

                <!-- Vehicle Type Tab Strip (Quick switcher) -->
                <div class="vehicle-selector mt-6">
                  <button 
                    v-for="v in ['flight', 'train', 'bus', 'car', 'bike']" 
                    :key="v" 
                    :class="['vehicle-tab', activeVehicle === v ? 'active' : '']"
                    @click="activeVehicle = v; selectedVehicleMode = v;"
                  >
                    <span class="v-icon">{{ routeData.vehicleBreakdown?.[v]?.icon }}</span>
                    <span class="v-label">{{ routeData.vehicleBreakdown?.[v]?.label }}</span>
                    <span class="v-duration">{{ routeData.vehicleBreakdown?.[v]?.duration }}</span>
                  </button>
                </div>

                <!-- Flight Details -->
                <div v-if="activeVehicle === 'flight'" class="vehicle-details mt-4 animate-fade-in">
                  <div class="vd-header">
                    <h4>✈️ Flight Options</h4>
                    <span class="vd-distance">Distance: {{ routeData.vehicleBreakdown?.flight?.distance }}</span>
                  </div>
                  <div class="vd-stations">
                    <span>🛫 {{ routeData.vehicleBreakdown?.flight?.airports?.origin }}</span>
                    <span class="station-arrow">✈️ →</span>
                    <span>🛬 {{ routeData.vehicleBreakdown?.flight?.airports?.destination }}</span>
                  </div>
                  <div class="fare-options-grid mt-4">
                    <div v-for="opt in routeData.vehicleBreakdown?.flight?.options" :key="opt.class" class="fare-option-card glass-card">
                      <span class="fare-class">{{ opt.class }}</span>
                      <span class="fare-cost monospaced">{{ formatPrice(opt.cost, 'INR') }}</span>
                      <span class="fare-per">per person</span>
                    </div>
                  </div>
                </div>

                <!-- Train Details -->
                <div v-if="activeVehicle === 'train'" class="vehicle-details mt-4 animate-fade-in">
                  <div class="vd-header">
                    <h4>🚆 Train Options</h4>
                    <span class="vd-distance">Distance: {{ routeData.vehicleBreakdown?.train?.distance }}</span>
                  </div>
                  <div class="vd-stations">
                    <span>🚉 {{ routeData.vehicleBreakdown?.train?.stations?.origin }}</span>
                    <span class="station-arrow">🚆 →</span>
                    <span>🚉 {{ routeData.vehicleBreakdown?.train?.stations?.destination }}</span>
                  </div>
                  <div class="fare-options-grid mt-4">
                    <div v-for="opt in routeData.vehicleBreakdown?.train?.options" :key="opt.class" class="fare-option-card glass-card">
                      <span class="fare-class">{{ opt.class }}</span>
                      <span class="fare-cost monospaced">{{ formatPrice(opt.cost, 'INR') }}</span>
                      <span class="fare-per">per person</span>
                    </div>
                  </div>
                </div>

                <!-- Bus Details -->
                <div v-if="activeVehicle === 'bus'" class="vehicle-details mt-4 animate-fade-in">
                  <div class="vd-header">
                    <h4>🚌 Bus Options</h4>
                    <span class="vd-distance">Distance: {{ routeData.vehicleBreakdown?.bus?.distance }}</span>
                  </div>
                  <div class="vd-stations">
                    <span>🚌 {{ routeData.vehicleBreakdown?.bus?.stations?.origin }}</span>
                    <span class="station-arrow">🚌 →</span>
                    <span>🚌 {{ routeData.vehicleBreakdown?.bus?.stations?.destination }}</span>
                  </div>
                  <div class="fare-options-grid mt-4">
                    <div v-for="opt in routeData.vehicleBreakdown?.bus?.options" :key="opt.class" class="fare-option-card glass-card">
                      <span class="fare-class">{{ opt.class }}</span>
                      <span class="fare-cost monospaced">{{ formatPrice(opt.cost, 'INR') }}</span>
                      <span class="fare-per">per person</span>
                    </div>
                  </div>
                </div>

                <!-- Car Details with Visual Calculations -->
                <div v-if="activeVehicle === 'car'" class="vehicle-details mt-4 animate-fade-in">
                  <div class="vd-header">
                    <h4>🚗 Car - Road Trip Analysis</h4>
                    <span class="vd-distance">{{ routeData.vehicleBreakdown?.car?.distance }} • {{ routeData.vehicleBreakdown?.car?.duration }}</span>
                  </div>
                  
                  <div class="toll-badge mt-2">
                    <span>🛣️ Estimated Toll Cost: <strong class="monospaced">{{ formatPrice(routeData.vehicleBreakdown?.car?.tollCost, 'INR') }}</strong></span>
                  </div>

                  <div class="fuel-subtypes-grid mt-4">
                    <div v-for="ft in routeData.vehicleBreakdown?.car?.fuelTypes" :key="ft.type" class="fuel-subtype-card glass-card">
                      <div class="fst-header">
                        <span class="fst-icon">{{ ft.icon }}</span>
                        <span class="fst-type">{{ ft.type }}</span>
                      </div>
                      
                      <!-- Visual Equations Block -->
                      <div class="visual-math-box mt-3 mb-3">
                        <div class="math-step">
                          <span class="math-label">Fuel Needed Equation:</span>
                          <div class="math-line monospaced">
                            <span>{{ routeData.roadDistance }} km (Dist)</span>
                            <span>÷</span>
                            <span>{{ ft.mileageNum }} km/{{ ft.unit }}</span>
                            <span>=</span>
                            <span class="font-bold text-cyan">{{ ft.fuelNeededNum }} {{ ft.unit }}</span>
                          </div>
                        </div>
                        <div class="math-step mt-2">
                          <span class="math-label">Fuel Cost Equation:</span>
                          <div class="math-line monospaced">
                            <span>{{ ft.fuelNeededNum }} {{ ft.unit }}</span>
                            <span>×</span>
                            <span>{{ formatPrice(ft.fuelPriceNum, 'INR') }}/{{ ft.unit }}</span>
                            <span>=</span>
                            <span class="font-bold text-primary">{{ formatPrice(ft.totalFuelCost, 'INR') }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="fst-stats">
                        <div class="fst-row highlight">
                          <span class="fst-label">Fuel Cost</span>
                          <span class="fst-value monospaced text-primary font-bold">{{ formatPrice(ft.totalFuelCost, 'INR') }}</span>
                        </div>
                        <div v-if="ft.totalWithToll" class="fst-row total">
                          <span class="fst-label">Total + Toll</span>
                          <span class="fst-value monospaced text-accent font-bold">{{ formatPrice(ft.totalWithToll, 'INR') }}</span>
                        </div>
                        <div v-if="ft.chargingStopsNeeded !== undefined" class="fst-row">
                          <span class="fst-label">Charging Stops</span>
                          <span class="fst-value monospaced">{{ ft.chargingStopsNeeded }} stops</span>
                        </div>
                        <div v-if="ft.batteryRange" class="fst-row">
                          <span class="fst-label">Battery Range</span>
                          <span class="fst-value monospaced">{{ ft.batteryRange }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Bike Details with Visual Calculations -->
                <div v-if="activeVehicle === 'bike'" class="vehicle-details mt-4 animate-fade-in">
                  <div class="vd-header">
                    <h4>🏍️ Bike - Road Trip Analysis</h4>
                    <span class="vd-distance">{{ routeData.vehicleBreakdown?.bike?.distance }} • {{ routeData.vehicleBreakdown?.bike?.duration }}</span>
                  </div>

                  <div class="fuel-subtypes-grid mt-4">
                    <div v-for="ft in routeData.vehicleBreakdown?.bike?.fuelTypes" :key="ft.type" class="fuel-subtype-card glass-card">
                      <div class="fst-header">
                        <span class="fst-icon">{{ ft.icon }}</span>
                        <span class="fst-type">{{ ft.type }}</span>
                      </div>
                      
                      <!-- Visual Equations Block -->
                      <div class="visual-math-box mt-3 mb-3">
                        <div class="math-step">
                          <span class="math-label">Fuel Needed Equation:</span>
                          <div class="math-line monospaced">
                            <span>{{ routeData.roadDistance }} km</span>
                            <span>÷</span>
                            <span>{{ ft.mileageNum }} km/{{ ft.unit }}</span>
                            <span>=</span>
                            <span class="font-bold text-cyan">{{ ft.fuelNeededNum }} {{ ft.unit }}</span>
                          </div>
                        </div>
                        <div class="math-step mt-2">
                          <span class="math-label">Total Fuel Cost Equation:</span>
                          <div class="math-line monospaced">
                            <span>{{ ft.fuelNeededNum }} {{ ft.unit }}</span>
                            <span>×</span>
                            <span>{{ formatPrice(ft.fuelPriceNum, 'INR') }}</span>
                            <span>=</span>
                            <span class="font-bold text-primary">{{ formatPrice(ft.totalFuelCost, 'INR') }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="fst-stats">
                        <div class="fst-row highlight">
                          <span class="fst-label">Total Fuel Cost</span>
                          <span class="fst-value monospaced text-primary font-bold">{{ formatPrice(ft.totalFuelCost, 'INR') }}</span>
                        </div>
                        <div v-if="ft.chargingStopsNeeded !== undefined" class="fst-row">
                          <span class="fst-label">Charging Stops</span>
                          <span class="fst-value monospaced">{{ ft.chargingStopsNeeded }} stops</span>
                        </div>
                        <div v-if="ft.batteryRange" class="fst-row">
                          <span class="fst-label">Battery Range</span>
                          <span class="fst-value monospaced">{{ ft.batteryRange }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Fuel Stops Along Route -->
                <div v-if="(activeVehicle === 'car' || activeVehicle === 'bike') && routeData.fuelStops?.length" class="fuel-stops-section mt-8">
                  <div class="section-title-wrap">
                    <h3>⛽ Fuel & Charging Stops Along Route</h3>
                    <p class="section-subtitle">Recommended stops from {{ routeData.origin }} to {{ routeData.destination }}</p>
                    <button class="btn btn-outline btn-sm mt-2" @click="showFuelStops = !showFuelStops">
                      {{ showFuelStops ? 'Hide Stops' : 'Show All Stops' }} ({{ routeData.fuelStops.length }})
                    </button>
                  </div>

                  <div v-if="showFuelStops" class="fuel-stops-timeline mt-4 animate-fade-in">
                    <!-- Start Point -->
                    <div class="timeline-point start">
                      <div class="tp-marker">🟢</div>
                      <div class="tp-content">
                        <span class="tp-city">{{ routeData.origin }}</span>
                        <span class="tp-km">0 km</span>
                      </div>
                    </div>

                    <!-- Fuel Stops -->
                    <div v-for="(stop, idx) in routeData.fuelStops" :key="idx" class="timeline-point stop">
                      <div class="tp-marker">⛽</div>
                      <div class="tp-content">
                        <div class="tp-stop-dual">
                          <div class="tp-fuel-type">
                            <span class="tp-brand">{{ stop.petrolDiesel.name }}</span>
                            <span class="tp-city">{{ stop.petrolDiesel.city }}</span>
                            <span class="tp-km monospaced">{{ stop.petrolDiesel.kmFromStart }} km</span>
                            <button 
                              v-if="stop.petrolDiesel.lat" 
                              class="coord-badge small" 
                              @click="openGoogleMaps(stop.petrolDiesel.lat, stop.petrolDiesel.lng, stop.petrolDiesel.name)"
                            >
                              🗺️ {{ stop.petrolDiesel.lat?.toFixed(2) }}, {{ stop.petrolDiesel.lng?.toFixed(2) }}
                            </button>
                          </div>
                          <div class="tp-fuel-type ev">
                            <span class="tp-brand">🔋 {{ stop.evCharging.name }}</span>
                            <span class="tp-ev-info">{{ stop.evCharging.chargingType }} • {{ stop.evCharging.estimatedChargeTime }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- End Point -->
                    <div class="timeline-point end">
                      <div class="tp-marker">🔴</div>
                      <div class="tp-content">
                        <span class="tp-city">{{ routeData.destination }}</span>
                        <span class="tp-km">{{ routeData.roadDistance }} km</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <!-- Fallback: Old transport data when no route analyzed -->
            <div v-if="!routeAnalyzed" class="old-transport-fallback mt-6">
              <h3>General Transit Fares (from major hubs)</h3>
              <div class="transit-fares-grid mt-4">
                <div class="transit-fare-card glass-card">
                  <span class="transit-icon">✈️</span>
                  <div class="transit-body">
                    <h5>Flights (Round-trip)</h5>
                    <div class="fare-rates">
                      <span class="rate-item">Lowest: <strong class="monospaced">{{ formatPrice(destData.transportOptions?.flights?.lowest) }}</strong></span>
                      <span class="rate-item">Avg: <strong class="monospaced">{{ formatPrice(destData.transportOptions?.flights?.average) }}</strong></span>
                    </div>
                    <span class="transit-time">⏱️ Duration: {{ destData.transportOptions?.flights?.duration }}</span>
                  </div>
                </div>
                <div class="transit-fare-card glass-card">
                  <span class="transit-icon">🚆</span>
                  <div class="transit-body">
                    <h5>Trains (AC Tier)</h5>
                    <div class="fare-rates">
                      <span class="rate-item">Fare: <strong class="monospaced">{{ formatPrice(destData.transportOptions?.trains?.cost) }}</strong></span>
                    </div>
                    <span class="transit-time">⏱️ Duration: {{ destData.transportOptions?.trains?.duration }}</span>
                  </div>
                </div>
                <div class="transit-fare-card glass-card">
                  <span class="transit-icon">🚌</span>
                  <div class="transit-body">
                    <h5>Intercity Buses</h5>
                    <div class="fare-rates">
                      <span class="rate-item">Fare: <strong class="monospaced">{{ formatPrice(destData.transportOptions?.buses?.cost) }}</strong></span>
                    </div>
                    <span class="transit-time">⏱️ Duration: {{ destData.transportOptions?.buses?.duration }}</span>
                  </div>
                </div>
                <div class="transit-fare-card glass-card">
                  <span class="transit-icon">🚕</span>
                  <div class="transit-body">
                    <h5>Taxi / Cab Rental</h5>
                    <div class="fare-rates">
                      <span class="rate-item">Day Fare: <strong class="monospaced">{{ formatPrice(destData.transportOptions?.taxi?.fare) }}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 6: Weather & AQI -->
          <div v-if="activeTab === 'weather'" class="tab-pane">
            <div class="aqi-outlook-header glass-card">
              <div class="aqi-header-txt">
                <h3>Air Quality Index (AQI) Status</h3>
                <p class="subtitle">Current pollution levels and safety index overlay</p>
              </div>

              <div :class="['aqi-meter-badge', getAqiClass(destData.aqi)]">
                <span class="aqi-val monospaced">{{ destData.aqi || 45 }}</span>
                <span class="aqi-lbl">{{ getAqiText(destData.aqi) }}</span>
              </div>
            </div>

            <h3 class="mt-8">7-Day Weather & Air Quality Forecast</h3>
            <div class="weather-forecast-grid mt-4">
              <div 
                v-for="forecast in destData.weatherForecast" 
                :key="forecast.day" 
                class="forecast-card glass-card"
              >
                <span class="forecast-day">{{ forecast.day }}</span>
                <span class="forecast-icon">{{ getWeatherEmoji(forecast.general) }}</span>
                <span class="forecast-temp monospaced">{{ forecast.temp }}</span>
                <span class="forecast-desc">{{ forecast.general }}</span>
                <span :class="['forecast-aqi-badge', getAqiClass(forecast.aqi)]">AQI: {{ forecast.aqi }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Sidebar Column -->
      <div class="details-side-col">
        <!-- Budget Breakdown Summary Widget -->
        <GlassPanel class="summary-widget" heavy>
          <h3>Budget Estimation</h3>
          <p class="widget-desc">Estimated standard 5-day budget breakdown for 1 person.</p>
          
          <div class="breakdown-list mt-4">
            <div class="b-item">
              <span>✈️ Flights estimate</span>
              <span class="monospaced">{{ formatPrice(destData.budgetBreakdown?.flights || 350) }}</span>
            </div>
            <div class="b-item">
              <span>🏨 Lodging (4 Nights)</span>
              <span class="monospaced">{{ formatPrice(destData.budgetBreakdown?.lodging || (destData.startingBudget * 0.4)) }}</span>
            </div>
            <div class="b-item">
              <span>🍔 Meals & Dinings</span>
              <span class="monospaced">{{ formatPrice(destData.budgetBreakdown?.meals || 120) }}</span>
            </div>
            <div class="b-item">
              <span>🚗 Local Transport</span>
              <span class="monospaced">{{ formatPrice(destData.budgetBreakdown?.transport || 70) }}</span>
            </div>
            <div class="b-item total">
              <span>Estimated Total</span>
              <span class="monospaced font-bold">{{ formatPrice(destData.budgetBreakdown?.total || (350 + (destData.startingBudget * 0.4) + 120 + 70)) }}</span>
            </div>
          </div>

          <button 
            type="button" 
            class="btn btn-primary w-full mt-6" 
            @click="handlePlanClick"
          >
            Generate AI Plan
          </button>
        </GlassPanel>

        <!-- Route Quick Compare (shows after route analysis) -->
        <GlassPanel v-if="routeAnalyzed && routeData" class="route-compare-widget mt-6 animate-fade-in" heavy>
          <h3>🚀 Quick Compare</h3>
          <p class="widget-desc">Cheapest option per vehicle from {{ routeData.origin }}</p>
          <div class="compare-list mt-4">
            <div class="compare-item">
              <span class="ci-icon">✈️</span>
              <span class="ci-label">Flight</span>
              <span class="ci-cost monospaced">{{ formatPrice(routeData.vehicleBreakdown?.flight?.options?.[0]?.cost, 'INR') }}</span>
            </div>
            <div class="compare-item">
              <span class="ci-icon">🚆</span>
              <span class="ci-label">Train</span>
              <span class="ci-cost monospaced">{{ formatPrice(routeData.vehicleBreakdown?.train?.options?.[0]?.cost, 'INR') }}</span>
            </div>
            <div class="compare-item" v-if="routeData.vehicleBreakdown?.bus">
              <span class="ci-icon">🚌</span>
              <span class="ci-label">Bus</span>
              <span class="ci-cost monospaced">{{ formatPrice(routeData.vehicleBreakdown?.bus?.options?.[0]?.cost, 'INR') }}</span>
            </div>
            <div class="compare-item">
              <span class="ci-icon">🚗</span>
              <span class="ci-label">Car</span>
              <span class="ci-cost monospaced">{{ formatPrice(getCheapestFuel(routeData.vehicleBreakdown?.car)?.totalFuelCost, 'INR') }}</span>
            </div>
            <div class="compare-item">
              <span class="ci-icon">🏍️</span>
              <span class="ci-label">Bike</span>
              <span class="ci-cost monospaced">{{ formatPrice(getCheapestFuel(routeData.vehicleBreakdown?.bike)?.totalFuelCost, 'INR') }}</span>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>

  </div>
  <div v-else class="container" style="padding-top: 120px;">
    <div class="tab-state-card empty">
      <h3>Destination Not Found</h3>
      <p>We could not find live details for this destination right now.</p>
      <button type="button" class="btn btn-outline mt-4" @click="$router.push('/destination')">Back to Directory</button>
    </div>
  </div>
</template>

<style scoped>
.details-page-layout {
  display: flex;
  flex-direction: column;
}

.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.mt-8 { margin-top: 32px; }
.mt-12 { margin-top: 48px; }
.w-full { width: 100%; }

/* Loading state */
.details-loading {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.banner-sk {
  height: 300px;
  border-radius: var(--radius-xl);
}

.details-skeleton-grid {
  display: grid;
  grid-template-columns: 1fr 2.5fr;
  gap: 24px;
  flex-grow: 1;
}

.side-sk, .main-sk {
  height: 400px;
  border-radius: var(--radius-lg);
}

/* Hero Banner */
.details-hero-banner {
  position: relative;
  height: 380px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding-bottom: 40px;
  padding-top: 72px;
  color: white;
}

.banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.45) 80%, rgba(15, 23, 42, 0.1) 100%);
  z-index: 1;
}

.banner-content {
  position: relative;
  z-index: 2;
}

.banner-loc {
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--color-secondary);
  text-transform: uppercase;
  margin-bottom: 8px;
  display: inline-block;
}

.banner-content h1 {
  font-size: 2.8rem;
  font-weight: 800;
  letter-spacing: -1px;
  margin-bottom: 8px;
  text-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.banner-desc {
  font-size: 1.05rem;
  color: #E2E8F0;
  max-width: 720px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.banner-rating {
  font-size: 0.92rem;
}

/* ========================================
   ROUTE ORIGIN INPUT BAR
   ======================================== */
.route-origin-bar {
  margin-top: -30px;
  position: relative;
  z-index: 10;
}

.origin-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(37, 99, 235, 0.15);
  box-shadow: 0 8px 32px rgba(37, 99, 235, 0.08), 0 2px 8px rgba(0,0,0,0.04);
  gap: 20px;
  flex-wrap: wrap;
}

.origin-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.origin-icon {
  font-size: 1.6rem;
  padding: 10px;
  background: linear-gradient(135deg, #2563EB, #0EA5E9);
  border-radius: var(--radius-md);
  filter: drop-shadow(0 2px 4px rgba(37, 99, 235, 0.3));
}

.origin-info {
  display: flex;
  flex-direction: column;
}

.origin-label {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--color-primary);
}

.origin-sublabel {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.origin-form {
  display: flex;
  gap: 10px;
  flex-grow: 1;
  max-width: 500px;
}

.origin-input {
  flex-grow: 1;
  padding: 10px 16px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-family: inherit;
  background: #F8FAFC;
  transition: all 0.2s;
}

.origin-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  background: white;
}

.origin-btn {
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px !important;
  font-size: 0.85rem !important;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Route Summary Badge */
.route-summary-badge {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
  padding: 12px 20px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(14, 165, 233, 0.06));
  border: 1px solid rgba(37, 99, 235, 0.15);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
}

.route-badge-icon {
  font-size: 1.2rem;
}

.route-badge-text {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.route-quick-stats {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.rq-stat {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  background: white;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

/* ========================================
   WORKSPACE LAYOUT
   ======================================== */
.details-workspace {
  display: grid;
  grid-template-columns: 2.2fr 0.8fr;
  gap: 32px;
  align-items: start;
}

@media (max-width: 960px) {
  .details-workspace {
    grid-template-columns: 1fr;
  }
}

.details-main-col {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

/* Quick Stats Row */
.quick-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 900px) {
  .quick-stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .quick-stats-row {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px !important;
  background-color: white !important;
}

.stat-icon {
  font-size: 1.6rem;
  padding: 8px;
  background-color: var(--color-primary-light);
  border-radius: var(--radius-md);
}

.stat-txt {
  display: flex;
  flex-direction: column;
}

.s-lbl {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

.s-val {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-top: 2px;
}

/* Tabs list */
.details-tabs-header {
  display: flex;
  gap: 16px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 10px;
  overflow-x: auto;
}

.details-tab {
  background: transparent;
  border: none;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 8px 12px;
  position: relative;
  white-space: nowrap;
}

.details-tab:hover {
  color: var(--color-primary);
}

.details-tab.active {
  color: var(--color-primary);
}

.details-tab.active::after {
  content: '';
  position: absolute;
  bottom: -11.5px;
  left: 0;
  right: 0;
  height: 2.5px;
  background-color: var(--color-primary);
  border-radius: var(--radius-full);
}

/* Tabs Body */
.details-tab-body {
  padding: 24px !important;
  background-color: #FFFFFF !important;
}

.tab-pane h3 {
  font-size: 1.35rem;
  font-weight: 800;
  margin-bottom: 14px;
}

.overview-txt {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

/* Tab 1: Overview Styles */
.overview-grid {
  display: grid;
  grid-template-columns: 1.6fr 0.9fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}

.scores-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px !important;
  background-color: #F8FAFC !important;
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.score-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.score-value {
  font-size: 1rem;
  font-weight: 800;
  color: var(--color-primary);
}

.progress-bar-bg {
  height: 8px;
  background-color: var(--color-border);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width var(--transition-slow);
}

.primary-bg {
  background-color: var(--color-primary);
}

.accent-bg {
  background-color: var(--color-accent);
}

.pros-cons-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 600px) {
  .pros-cons-grid {
    grid-template-columns: 1fr;
  }
}

.pros-box, .cons-box {
  padding: 20px !important;
  background-color: white !important;
}

.pros-box h4, .cons-box h4 {
  font-size: 1.05rem;
  font-weight: 800;
  margin-bottom: 12px;
}

.pros-cons-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pros-cons-list li {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
}

.pro-icon {
  color: #10B981;
  font-weight: 800;
}

.con-icon {
  color: #EF4444;
  font-weight: 800;
}

.suitability-box {
  padding: 20px !important;
  background-color: white !important;
}

.suitability-box h4 {
  font-size: 1.05rem;
  font-weight: 800;
}

.suitability-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 600px) {
  .suitability-grid {
    grid-template-columns: 1fr;
  }
}

.suit-item {
  background-color: #F8FAFC;
  border: 1px solid var(--color-border);
  padding: 16px;
  border-radius: var(--radius-md);
}

.suit-badge {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  display: inline-block;
  margin-bottom: 6px;
}

.suit-item p {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

/* Tab 2: Attractions & Nearby */
.attractions-gallery {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 600px) {
  .attractions-gallery {
    grid-template-columns: 1fr;
  }
}

.gallery-item {
  display: flex;
  gap: 16px;
  padding: 12px !important;
  background-color: #FFFFFF !important;
}

.gallery-photo-placeholder {
  width: 64px;
  height: 64px;
  background-color: var(--color-primary-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
}

.gallery-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-info h4 {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.gallery-info p {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.nearby-explorer-section {
  border-top: 1px solid var(--color-border);
  padding-top: 24px;
}

.section-subtitle {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.nearby-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 600px) {
  .nearby-grid {
    grid-template-columns: 1fr;
  }
}

.nearby-category-card {
  padding: 16px !important;
  background-color: white !important;
}

.nearby-category-card h5 {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--color-text-primary);
  border-bottom: 1.5px solid var(--color-border);
  padding-bottom: 6px;
  margin-bottom: 10px;
}

.nearby-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nearby-list li {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.82rem;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}

.nearby-list li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.nearby-empty-item {
  color: var(--color-text-muted);
  font-style: italic;
}

.nearby-item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.item-address {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.item-types {
  font-size: 0.68rem;
  color: var(--color-primary);
  font-weight: 600;
}

.nearby-item-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.item-meta {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* Coordinate Badge */
.coord-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(14, 165, 233, 0.06));
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: var(--radius-sm);
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
}

.coord-badge:hover {
  background: rgba(37, 99, 235, 0.12);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}

.coord-badge.small {
  font-size: 0.6rem;
  padding: 2px 6px;
}

/* Tab 3: Stays */
.stay-tier-section h4 {
  font-size: 1.05rem;
  font-weight: 800;
  margin-bottom: 12px;
  color: var(--color-text-primary);
}

.stays-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 600px) {
  .stays-grid {
    grid-template-columns: 1fr;
  }
}

.stay-card {
  display: flex;
  flex-direction: row;
  overflow: hidden;
  background-color: white !important;
  border: 1px solid var(--color-border);
  padding: 10px !important;
  gap: 12px;
}

.stay-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.stay-body {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-grow: 1;
  min-width: 0;
}

.stay-body h5 {
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stay-meta {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.stay-address {
  font-size: 0.68rem;
  color: var(--color-text-muted);
}

.stay-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  gap: 8px;
}

.stay-price {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--color-primary);
}

.stay-lbl {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  font-weight: normal;
}

/* Tab 4: Food & Dining */
.food-budget-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .food-budget-row {
    grid-template-columns: 1fr;
  }
}

.food-budget-card {
  padding: 20px !important;
  background-color: white !important;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.budget-tier-icon {
  font-size: 1.8rem;
}

.food-budget-card h5 {
  font-size: 0.95rem;
  font-weight: 800;
  margin: 0;
}

.budget-cost {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--color-primary);
  margin: 0;
}

.budget-desc {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.restaurant-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.restaurant-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px !important;
  background-color: white !important;
  gap: 12px;
  flex-wrap: wrap;
}

.restaurant-card h4 {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

.rest-cuisine {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.rest-address {
  font-size: 0.68rem;
  color: var(--color-text-muted);
  display: block;
  margin-top: 2px;
}

.rest-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.rest-price {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.rest-rating {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.food-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 600px) {
  .food-list {
    grid-template-columns: 1fr;
  }
}

.food-item {
  padding: 16px !important;
  background-color: #FFFFFF !important;
}

.food-item h4 {
  font-size: 1.02rem;
  font-weight: 700;
  margin-bottom: 6px;
}

.food-item p {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* ========================================
   TAB 5: TRANSPORT INTELLIGENCE (NEW)
   ======================================== */

.transport-prompt {
  text-align: center;
  padding: 48px 32px !important;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.03), rgba(14, 165, 233, 0.02)) !important;
  border: 2px dashed rgba(37, 99, 235, 0.2);
}

.prompt-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.transport-prompt h3 {
  margin-bottom: 8px;
}

.transport-prompt p {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  max-width: 500px;
  margin: 0 auto;
}

.prompt-hint {
  font-size: 0.78rem !important;
  color: var(--color-primary) !important;
  font-weight: 600;
  margin-top: 8px !important;
}

.prompt-form {
  display: flex;
  gap: 10px;
  max-width: 400px;
  margin: 0 auto;
}

/* Route Dashboard */
.route-header {
  padding: 20px !important;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(14, 165, 233, 0.04)) !important;
  border: 1px solid rgba(37, 99, 235, 0.12);
}

.route-header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.route-endpoints {
  display: flex;
  align-items: center;
  gap: 12px;
}

.route-city {
  font-size: 1.2rem;
  font-weight: 800;
}

.route-city.origin {
  color: #10B981;
}

.route-city.dest {
  color: var(--color-primary);
}

.route-arrow {
  font-size: 1.5rem;
  color: var(--color-text-muted);
}

.route-distances {
  display: flex;
  gap: 16px;
}

.rd-item {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.rd-item strong {
  color: var(--color-text-primary);
}

/* Vehicle Selector */
.vehicle-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.vehicle-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 12px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: white;
  cursor: pointer;
  transition: all 0.25s;
}

.vehicle-tab:hover {
  border-color: rgba(37, 99, 235, 0.3);
  background: rgba(37, 99, 235, 0.02);
}

.vehicle-tab.active {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(14, 165, 233, 0.04));
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.12);
}

.v-icon {
  font-size: 1.5rem;
}

.v-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.v-duration {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  font-weight: 600;
}

/* Vehicle Details */
.vd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.vd-header h4 {
  font-size: 1.1rem;
  font-weight: 800;
}

.vd-distance {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.vd-stations {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #F8FAFC;
  border-radius: var(--radius-md);
  margin-top: 10px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
}

.station-arrow {
  font-size: 1rem;
}

/* Fare Options Grid */
.fare-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.fare-option-card {
  text-align: center;
  padding: 16px !important;
  background: white !important;
  border: 1px solid var(--color-border);
}

.fare-class {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  display: block;
  margin-bottom: 6px;
}

.fare-cost {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--color-primary);
  display: block;
}

.fare-per {
  font-size: 0.68rem;
  color: var(--color-text-muted);
}

/* Toll Badge */
.toll-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  color: #92400E;
}

/* Fuel Subtypes Grid */
.fuel-subtypes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.fuel-subtype-card {
  padding: 16px !important;
  background: white !important;
  border: 1px solid var(--color-border);
  transition: all 0.2s;
}

.fuel-subtype-card:hover {
  border-color: rgba(37, 99, 235, 0.3);
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.08);
}

.fst-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 10px;
}

.fst-icon {
  font-size: 1.2rem;
}

.fst-type {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--color-text-primary);
}

.fst-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fst-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.fst-label {
  color: var(--color-text-muted);
  font-weight: 600;
}

.fst-value {
  color: var(--color-text-primary);
  font-weight: 700;
}

.fst-row.highlight {
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
}

.fst-row.total {
  padding-top: 6px;
  border-top: 1px dashed rgba(37, 99, 235, 0.2);
  margin-top: 2px;
}

.text-primary { color: var(--color-primary); }
.text-accent { color: var(--color-accent); }
.font-bold { font-weight: 800; }

/* ========================================
   FUEL STOPS TIMELINE
   ======================================== */
.fuel-stops-section {
  border-top: 1px solid var(--color-border);
  padding-top: 24px;
}

.btn-outline {
  background: white;
  border: 1.5px solid var(--color-border);
  color: var(--color-text-secondary);
  font-weight: 600;
  padding: 6px 14px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-outline:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-sm {
  font-size: 0.78rem;
  padding: 5px 12px;
}

.traffic-card {
  padding: 14px;
  border: 1px solid var(--color-border);
}

.traffic-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.traffic-level {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-full);
}

.traffic-low {
  color: #065f46;
  background: #d1fae5;
}

.traffic-moderate {
  color: #92400e;
  background: #fef3c7;
}

.traffic-high {
  color: #991b1b;
  background: #fee2e2;
}

.traffic-unknown {
  color: #1e3a8a;
  background: #dbeafe;
}

.traffic-metrics {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  font-size: 0.84rem;
  color: var(--color-text-secondary);
}

.traffic-updated {
  margin-top: 8px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

@media (max-width: 840px) {
  .traffic-metrics {
    grid-template-columns: 1fr;
  }
}

.fuel-stops-timeline {
  position: relative;
  padding-left: 32px;
}

.fuel-stops-timeline::before {
  content: '';
  position: absolute;
  left: 14px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #10B981, var(--color-primary), #EF4444);
  border-radius: 2px;
}

.timeline-point {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 0;
}

.tp-marker {
  position: absolute;
  left: -26px;
  font-size: 1rem;
  background: white;
  padding: 2px;
  z-index: 2;
}

.tp-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-grow: 1;
}

.tp-city {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.tp-km {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 600;
}

.tp-stop-dual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 600px) {
  .tp-stop-dual {
    grid-template-columns: 1fr;
  }
}

.tp-fuel-type {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  background: #F8FAFC;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.tp-fuel-type.ev {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.04), rgba(20, 184, 166, 0.04));
  border-color: rgba(16, 185, 129, 0.2);
}

.tp-brand {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.tp-ev-info {
  font-size: 0.7rem;
  color: #10B981;
  font-weight: 600;
}

/* Old transport fallback */
.transit-fares-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 600px) {
  .transit-fares-grid {
    grid-template-columns: 1fr;
  }
}

.transit-fare-card {
  display: flex;
  gap: 16px;
  padding: 16px !important;
  background-color: white !important;
}

.transit-icon {
  font-size: 1.8rem;
  padding: 8px;
  background-color: var(--color-primary-light);
  border-radius: var(--radius-md);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.transit-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.transit-body h5 {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

.transit-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.3;
}

.fare-rates {
  display: flex;
  gap: 10px;
  font-size: 0.8rem;
}

.transit-time {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* Tab 6: Weather & AQI */
.aqi-outlook-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px !important;
  background-color: white !important;
}

.aqi-outlook-header h3 {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0 0 2px 0;
}

.aqi-outlook-header .subtitle {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.aqi-meter-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  min-width: 100px;
}

.aqi-good { background-color: #10B981; }
.aqi-moderate { background-color: #F59E0B; }
.aqi-sensitive { background-color: #EF4444; }
.aqi-unhealthy { background-color: #7C3AED; }

.aqi-val {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
}

.aqi-lbl {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
}

.weather-forecast-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

@media (max-width: 900px) {
  .weather-forecast-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 600px) {
  .weather-forecast-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.forecast-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 6px !important;
  background-color: white !important;
  text-align: center;
  gap: 6px;
}

.forecast-day {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.forecast-icon {
  font-size: 1.4rem;
}

.forecast-temp {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.forecast-desc {
  font-size: 0.68rem;
  color: var(--color-text-muted);
  min-height: 24px;
  line-height: 1.2;
}

.forecast-aqi-badge {
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  color: white;
  font-weight: 700;
}

/* ========================================
   SIDEBAR
   ======================================== */
.details-side-col {
  position: sticky;
  top: 92px;
}

.summary-widget {
  background-color: #FFFFFF !important;
}

.summary-widget h3 {
  font-size: 1.15rem;
  font-weight: 800;
  margin-bottom: 4px;
}

.widget-desc {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.b-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  color: var(--color-text-secondary);
}

.b-item.total {
  border-top: 1.5px solid var(--color-border);
  padding-top: 14px;
  margin-top: 4px;
  font-size: 1rem;
  color: var(--color-text);
}

/* Route Compare Widget */
.route-compare-widget {
  background-color: #FFFFFF !important;
}

.route-compare-widget h3 {
  font-size: 1.05rem;
  font-weight: 800;
  margin-bottom: 4px;
}

.compare-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.compare-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #F8FAFC;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.ci-icon {
  font-size: 1.2rem;
}

.ci-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  flex-grow: 1;
}

.ci-cost {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--color-primary);
}

@media (max-width: 600px) {
  .origin-card {
    flex-direction: column;
    align-items: stretch;
  }
  
  .origin-form {
    max-width: 100%;
    flex-direction: column;
  }
  
  .vehicle-selector {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .fuel-subtypes-grid {
    grid-template-columns: 1fr;
  }
  
  .route-endpoints {
    flex-direction: column;
    gap: 4px;
  }
  
  .route-distances {
    flex-direction: column;
    gap: 4px;
  }
}

/* Interactive Travel Mode Choice Screen & Visual Equations */
.travel-mode-choice-screen {
  padding: 32px 24px !important;
  text-align: center;
  background-color: #FFFFFF !important;
  border: 1px solid var(--color-border);
}

.travel-modes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 16px;
}

.mode-choice-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px !important;
  cursor: pointer;
  transition: all var(--transition-medium);
  background-color: #F8FAFC !important;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
}

.mode-choice-card:hover {
  transform: translateY(-4px);
  border-color: var(--color-primary);
  background-color: white !important;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.08);
}

.mode-icon-lg {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.mode-choice-card h4 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 4px 0 2px;
}

.mode-duration {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.mode-select-btn {
  font-size: 0.78rem;
  font-weight: 700;
  color: white;
  background-color: var(--color-primary);
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  display: inline-block;
}

.visual-math-box {
  background-color: #F8FAFC;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  text-align: left;
}

.math-step {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.math-label {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.math-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
}

.text-cyan {
  color: #0891B2;
}

.font-bold {
  font-weight: 700;
}

.tab-state-card {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 18px;
  background: #ffffff;
}

.tab-state-card p {
  margin-top: 6px;
  color: var(--color-text-secondary);
}

.tab-state-card.error {
  border-color: rgba(220, 38, 38, 0.35);
}

.tab-state-card.loading {
  border-color: rgba(37, 99, 235, 0.3);
}
</style>

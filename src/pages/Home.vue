<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { formatPrice, initUserCurrency } from "../services/currency";
import { detectUserLocation, userLocation } from "../services/location";
import { getFriendlyErrorMessage } from "../core/errors";
import { getDynamicTrendingData } from "../modules/trending/engine";

const router = useRouter();

const searchQuery = ref("");
const homeLoading = ref(true);
const locationLabel = ref("your region");
const popularDestinations = ref([]);
const destinationDistances = ref({});
const homeError = ref("");
const trendingLoading = ref(true);
const trendingError = ref("");
const trendingCategories = ref([]);

const quickPrompts = [
  "Plan a 5 day Goa trip",
  "Weekend roadtrip from Jaipur",
  "Family trip under 50000 INR"
];
const FALLBACK_DESTINATION_IMAGE = "/images/destinations/goa.png";

let aiServicePromise;

async function loadAiServices() {
  if (!aiServicePromise) {
    aiServicePromise = import("../services/gemini");
  }
  return aiServicePromise;
}

const handleSearch = () => {
  const query = String(searchQuery.value || "").trim();
  if (query) {
    router.push({ path: "/planner", query: { q: query } });
    return;
  }
  router.push("/destination");
};

const usePrompt = (prompt) => {
  searchQuery.value = prompt;
  handleSearch();
};

const goToDetails = (id) => {
  router.push(`/destination/${id}`);
};

const openWorkspace = (name) => {
  router.push({ path: "/planner", query: { destination: name } });
};

const getDistanceLabel = (destId) => {
  const km = destinationDistances.value[destId];
  if (km === null || km === undefined) {
    return "Distance unavailable";
  }
  return `${km.toLocaleString()} km from your location`;
};

const formatTrendDistance = (km) => {
  const value = Number(km || 0);
  if (!value) {
    return "Distance unavailable";
  }
  return `${value.toLocaleString()} km away`;
};

onMounted(async () => {
  homeLoading.value = true;
  trendingLoading.value = true;
  homeError.value = "";
  trendingError.value = "";

  try {
    const { generateDestinationSuggestions, resolveDestinationPhoto, getRouteDistance, geocodePlace } = await loadAiServices();

    await detectUserLocation();
    initUserCurrency(userLocation.value).catch(() => {
      // Currency init is non-blocking for first render.
    });
    locationLabel.value = userLocation.value?.city || userLocation.value?.country || "your region";

    const [trendingResult, liveListResult] = await Promise.allSettled([
      getDynamicTrendingData(userLocation.value),
      generateDestinationSuggestions(`top destinations for travelers from ${locationLabel.value}`)
    ]);

    if (trendingResult.status === "fulfilled") {
      trendingCategories.value = trendingResult.value;
      trendingError.value = "";
    } else {
      trendingError.value = getFriendlyErrorMessage(trendingResult.reason, "Trending engine is temporarily unavailable.");
      trendingCategories.value = [];
    }

    const liveList = liveListResult.status === "fulfilled" ? liveListResult.value : [];

    popularDestinations.value = (liveList || []).slice(0, 6).map((dest, idx) => ({
      id: dest.id || String(dest.name || `destination-${idx}`).toLowerCase().replace(/\s+/g, "-"),
      name: dest.name || "Destination",
      location: dest.location || "Global",
      budget: Number(dest.startingBudget || 0),
      rating: Number(dest.rating || 4.4),
      description: dest.description || "Live destination profile.",
      image: FALLBACK_DESTINATION_IMAGE
    }));

    if (popularDestinations.value.length > 0) {
      Promise.allSettled(
        popularDestinations.value.map((dest) => resolveDestinationPhoto(dest.name || "travel"))
      ).then((photos) => {
        popularDestinations.value = popularDestinations.value.map((dest, idx) => {
          const nextImage = photos[idx]?.status === "fulfilled" ? photos[idx].value : dest.image;
          return {
            ...dest,
            image: nextImage || dest.image
          };
        });
      });
    }

    homeLoading.value = false;

    if (userLocation.value?.lat !== null && userLocation.value?.lng !== null) {
      const distanceEntries = await Promise.allSettled(
        popularDestinations.value.map(async (dest) => {
          try {
            const geo = await geocodePlace(`${dest.name}, ${dest.location}`);
            if (!geo) return [dest.id, null];

            const route = await getRouteDistance(
              { lat: userLocation.value.lat, lng: userLocation.value.lng },
              { lat: geo.lat, lng: geo.lng }
            );
            return [dest.id, route?.distance ? Math.round(route.distance) : null];
          } catch (_error) {
            return [dest.id, null];
          }
        })
      );

      destinationDistances.value = Object.fromEntries(
        distanceEntries
          .filter((entry) => entry.status === "fulfilled")
          .map((entry) => entry.value)
      );
    }

    if (popularDestinations.value.length === 0) {
      homeError.value = "Live destinations temporarily unavailable.";
    }
  } catch (error) {
    console.error("Home live data load failed:", error);
    homeError.value = getFriendlyErrorMessage(error, "Unable to load live destinations right now.");
  } finally {
    if (homeLoading.value) {
      homeLoading.value = false;
    }
    trendingLoading.value = false;
  }
});
</script>

<template>
  <div class="home-page-layout animate-fade-in">
    <section class="hero-section" style="background-image: url('/images/hero_bg.png')">
      <div class="hero-overlay-gradient"></div>
      <div class="container hero-content">
        <span class="hero-tag">AI SEARCH COMMAND CENTER</span>
        <h1 class="hero-title">Plan Your Trip In One Command</h1>
        <p class="hero-desc">Type what you want in normal language. We will convert it into a complete trip workspace with live data.</p>

        <form @submit.prevent="handleSearch" class="hero-search-bar">
          <span class="search-icon">Search</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Plan a 5 day Goa trip"
            class="hero-search-input"
          />
          <button type="submit" class="btn btn-primary hero-search-btn">Start Planning</button>
        </form>

        <div class="quick-prompt-row">
          <button v-for="prompt in quickPrompts" :key="prompt" type="button" class="prompt-chip" @click="usePrompt(prompt)">
            {{ prompt }}
          </button>
        </div>
      </div>
    </section>

    <section class="container mt-16">
      <div class="section-header">
        <span class="section-badge">TRENDING NEAR ME</span>
        <h2>Live Recommendations For {{ locationLabel }}</h2>
        <p class="section-subtitle">Weekend escapes, roadtrip ideas, and seasonal picks generated from your current context.</p>
      </div>

      <div v-if="trendingLoading" class="trending-category-grid">
        <div v-for="n in 4" :key="n" class="glass-card" style="height: 220px;"></div>
      </div>

      <div v-else-if="trendingError" class="home-empty-state glass-card">
        <h3>Trending data unavailable</h3>
        <p>{{ trendingError }}</p>
        <button type="button" class="btn btn-primary mt-4" @click="router.push('/destination')">Explore Destinations</button>
      </div>

      <div v-else class="trending-category-grid">
        <article v-for="category in trendingCategories" :key="category.title" class="glass-card trend-panel">
          <div class="trend-head">
            <h3>{{ category.title }}</h3>
            <button type="button" class="btn btn-outline trend-action" @click="router.push({ path: '/destination', query: { search: category.query } })">
              View All
            </button>
          </div>

          <div v-if="category.state === 'empty'" class="trend-empty">
            <p>{{ category.message }}</p>
            <button type="button" class="btn btn-primary" @click="router.push('/destination')">Explore All</button>
          </div>

          <div v-else class="trend-item-grid">
            <div v-for="item in category.items.slice(0, 2)" :key="`${category.title}-${item.id}`" class="trend-item">
              <img :src="item.image" :alt="item.name" loading="lazy" class="trend-item-img" />
              <div class="trend-item-body">
                <strong>{{ item.name }}</strong>
                <span>{{ item.location }}</span>
                <small>{{ formatTrendDistance(item.distanceKm) }}</small>
                <div class="trend-actions">
                  <button type="button" class="btn btn-outline btn-xs" @click="goToDetails(item.id)">Details</button>
                  <button type="button" class="btn btn-primary btn-xs" @click="openWorkspace(item.name)">Plan</button>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="container mt-16">
      <div class="section-header">
        <span class="section-badge">DESTINATION SNAPSHOT</span>
        <h2>Popular Right Now</h2>
        <p class="section-subtitle">Instantly compare budget, rating, and distance before opening your trip workspace.</p>
      </div>

      <div v-if="homeLoading" class="destinations-grid">
        <div v-for="n in 6" :key="n" class="glass-card" style="height: 300px;"></div>
      </div>

      <div v-else-if="popularDestinations.length > 0" class="destinations-grid">
        <article v-for="dest in popularDestinations" :key="dest.id" class="destination-card glass-card">
          <div class="card-img-wrap">
            <img :src="dest.image" :alt="dest.name" class="card-img" loading="lazy" />
            <div class="card-rating">{{ dest.rating }}</div>
          </div>
          <div class="card-body">
            <span class="card-loc">{{ dest.location }}</span>
            <h3 class="card-title">{{ dest.name }}</h3>
            <p class="distance-line">{{ getDistanceLabel(dest.id) }}</p>
            <div class="card-footer">
              <span class="card-budget">From {{ formatPrice(dest.budget) }}</span>
            </div>
            <div class="card-actions mt-4">
              <button type="button" class="btn btn-outline" @click="goToDetails(dest.id)">View</button>
              <button type="button" class="btn btn-primary" @click="openWorkspace(dest.name)">Open Workspace</button>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="home-empty-state glass-card">
        <h3>No live destinations found</h3>
        <p>{{ homeError || "Please try again in a moment." }}</p>
        <button type="button" class="btn btn-primary mt-4" @click="router.push('/destination')">Open Destinations</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page-layout {
  display: flex;
  flex-direction: column;
  padding-bottom: 32px;
}

.mt-16 {
  margin-top: 64px;
}

.mt-4 {
  margin-top: 16px;
}

.hero-section {
  position: relative;
  min-height: 560px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  padding-top: 72px;
  color: white;
}

.hero-overlay-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.82) 100%);
  z-index: 1;
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 840px;
}

.hero-tag {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: #93c5fd;
  font-weight: 800;
  margin-bottom: 12px;
}

.hero-title {
  font-size: clamp(2.2rem, 6vw, 3.6rem);
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.1;
  margin-bottom: 14px;
}

.hero-desc {
  font-size: 1.04rem;
  color: #e2e8f0;
  max-width: 640px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.hero-search-bar {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: var(--radius-md);
  padding: 8px 10px;
  width: 100%;
  max-width: 640px;
  box-shadow: var(--shadow-xl);
}

.search-icon {
  margin: 0 10px 0 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.hero-search-input {
  flex-grow: 1;
  border: none;
  outline: none;
  font-size: 0.95rem;
  color: var(--color-text);
  font-family: inherit;
  padding: 10px 0;
}

.hero-search-btn {
  padding: 10px 20px !important;
}

.quick-prompt-row {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.prompt-chip {
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  font-size: 0.76rem;
  font-weight: 700;
  padding: 7px 12px;
  cursor: pointer;
}

.section-header {
  text-align: center;
  margin-bottom: 24px;
}

.section-badge {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #1e3a8a;
  background-color: #dbeafe;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  display: inline-block;
  margin-bottom: 8px;
}

.section-header h2 {
  font-size: 1.9rem;
  font-weight: 800;
  margin-bottom: 6px;
}

.section-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

.trending-category-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.trend-panel {
  padding: 14px;
}

.trend-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.trend-action {
  padding: 7px 10px;
  font-size: 0.75rem;
}

.trend-item-grid {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.trend-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #ffffff;
  display: grid;
  grid-template-columns: 84px 1fr;
  overflow: hidden;
}

.trend-item-img {
  width: 84px;
  height: 94px;
  object-fit: cover;
}

.trend-item-body {
  display: grid;
  gap: 2px;
  padding: 8px;
}

.trend-item-body span {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.trend-item-body small {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.trend-actions {
  margin-top: 6px;
  display: flex;
  gap: 6px;
}

.btn-xs {
  font-size: 0.72rem;
  padding: 6px 10px;
}

.destinations-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.destination-card {
  overflow: hidden;
}

.card-img-wrap {
  height: 190px;
  position: relative;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-rating {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.94);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.76rem;
  font-weight: 700;
}

.card-body {
  padding: 16px;
}

.card-loc {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 800;
  margin: 4px 0 8px;
}

.distance-line {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin-bottom: 10px;
}

.card-footer {
  border-top: 1px solid var(--color-border);
  padding-top: 10px;
  font-size: 0.84rem;
  color: var(--color-text-secondary);
}

.card-actions {
  display: flex;
  gap: 8px;
}

.home-empty-state {
  padding: 24px;
  text-align: center;
}

.home-empty-state p {
  margin-top: 8px;
  color: var(--color-text-secondary);
}

@media (max-width: 980px) {
  .trending-category-grid {
    grid-template-columns: 1fr;
  }

  .destinations-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .destinations-grid {
    grid-template-columns: 1fr;
  }

  .hero-search-bar {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }

  .hero-search-btn {
    width: 100%;
  }
}
</style>

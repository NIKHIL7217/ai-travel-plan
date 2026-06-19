<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { formatPrice } from "../services/currency";
import { detectUserLocation, userLocation } from "../services/location";
import { initUserCurrency } from "../services/currency";
import { getFriendlyErrorMessage } from "../core/errors";
import { getDynamicTrendingData } from "../modules/trending/engine";

const router = useRouter();
const searchQuery = ref("");
const homeLoading = ref(true);
const locationLabel = ref("your region");
const popularDestinations = ref([]);
const recommendations = ref([]);
const destinationDistances = ref({});
const homeError = ref("");
const trendingLoading = ref(true);
const trendingError = ref("");
const trendingCategories = ref([]);

let aiServicePromise;

async function loadAiServices() {
  if (!aiServicePromise) {
    aiServicePromise = import("../services/gemini");
  }
  return aiServicePromise;
}

onMounted(async () => {
  homeLoading.value = true;
  trendingLoading.value = true;
  homeError.value = "";
  trendingError.value = "";

  try {
    const { generateDestinationSuggestions, resolveDestinationPhoto, getRouteDistance, geocodePlace } = await loadAiServices();

    await detectUserLocation();
    await initUserCurrency(userLocation.value);

    locationLabel.value = userLocation.value?.city || userLocation.value?.country || "your region";

    try {
      trendingCategories.value = await getDynamicTrendingData(userLocation.value);
    } catch (error) {
      trendingError.value = getFriendlyErrorMessage(error, "Trending engine is temporarily unavailable.");
      trendingCategories.value = [];
    }

    const query = `top destinations for travelers from ${locationLabel.value}`;
    const liveList = await generateDestinationSuggestions(query);

    popularDestinations.value = await Promise.all(
      (liveList || []).slice(0, 6).map(async (dest, idx) => ({
        id: dest.id || String(dest.name || `destination-${idx}`).toLowerCase().replace(/\s+/g, "-"),
        name: dest.name || "Destination",
        location: dest.location || "Global",
        budget: Number(dest.startingBudget || 0),
        rating: Number(dest.rating || 4.4),
        description: dest.description || "Live destination profile.",
        image: await resolveDestinationPhoto(dest.name || "travel")
      }))
    );

    recommendations.value = popularDestinations.value.slice(0, 3).map((dest, idx) => ({
      title: idx === 0 ? "Popular Right Now" : idx === 1 ? "Smart City Break" : "Scenic Escape",
      desc: dest.description,
      image: dest.image,
      query: dest.id
    }));

    if (userLocation.value?.lat !== null && userLocation.value?.lng !== null) {
      const distanceEntries = await Promise.all(
        popularDestinations.value.map(async (dest) => {
          try {
            const geo = await geocodePlace(`${dest.name}, ${dest.location}`);
            if (!geo) {
              return [dest.id, null];
            }

            const route = await getRouteDistance(
              { lat: userLocation.value.lat, lng: userLocation.value.lng },
              { lat: geo.lat, lng: geo.lng }
            );

            return [dest.id, route?.distance ? Math.round(route.distance) : null];
          } catch (error) {
            return [dest.id, null];
          }
        })
      );

      destinationDistances.value = Object.fromEntries(distanceEntries);
    }

    if (popularDestinations.value.length === 0) {
      homeError.value = "Live destinations temporarily unavailable.";
    }

    recommendations.value =
      trendingCategories.value.find((category) => category.title === "Trending Destinations")?.items.slice(0, 3).map((item, idx) => ({
        title: idx === 0 ? "Popular Right Now" : idx === 1 ? "Smart City Break" : "Scenic Escape",
        desc: item.description,
        image: item.image,
        query: item.id
      })) || [];
  } catch (error) {
    console.error("Home live data load failed:", error);
    homeError.value = getFriendlyErrorMessage(error, "Unable to load live destinations right now.");
  } finally {
    homeLoading.value = false;
    trendingLoading.value = false;
  }
});

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: "/destination", query: { search: searchQuery.value } });
  } else {
    router.push("/destination");
  }
};

const goToDetails = (id) => {
  router.push(`/destination/${id}`);
};

const goToPlanner = (destName) => {
  router.push({ path: "/planner", query: { destination: destName } });
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
</script>

<template>
  <div class="home-page-layout animate-fade-in">
    
    <!-- Section 2: Hero Section -->
    <section class="hero-section" style="background-image: url('/images/hero_bg.png')">
      <div class="hero-overlay-gradient"></div>
      <div class="container hero-content">
        <span class="hero-tag">✦ NEXT GENERATION ITINERARIES</span>
        <h1 class="hero-title">Plan Your Dream Journey With AI</h1>
        <p class="hero-desc">
          Discover amazing destinations, generate personalized itineraries, and travel smarter with artificial intelligence.
        </p>

        <!-- Search Bar Overlay -->
        <form @submit.prevent="handleSearch" class="hero-search-bar">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Where do you want to go?" 
            class="hero-search-input"
          />
          <button type="submit" class="btn btn-primary hero-search-btn">Search</button>
        </form>

        <!-- CTAs -->
        <div class="hero-ctas">
          <button type="button" class="btn btn-primary" @click="router.push('/destination')">
            Explore Destinations
          </button>
          <button type="button" class="btn btn-outline-white" @click="router.push('/planner')">
            Generate AI Plan
          </button>
        </div>
      </div>
    </section>

    <!-- Section 3: Popular Destinations -->
    <section class="popular-section container mt-16">
      <div class="section-header">
        <span class="section-badge">POPULAR CHOICES</span>
        <h2>Trending Destinations</h2>
        <p class="section-subtitle">Live recommendations for {{ locationLabel }} based on real-time destination intelligence.</p>
      </div>

      <div v-if="homeLoading" class="destinations-grid">
        <div v-for="n in 6" :key="n" class="glass-card" style="height: 300px;"></div>
      </div>

      <div v-else-if="popularDestinations.length > 0" class="destinations-grid">
        <div 
          v-for="dest in popularDestinations" 
          :key="dest.id" 
          class="destination-card glass-card"
          @click="goToDetails(dest.id)"
        >
          <div class="card-img-wrap">
            <img :src="dest.image" :alt="dest.name" class="card-img" loading="lazy" />
            <div class="card-rating">
              ⭐ <span class="monospaced">{{ dest.rating }}</span>
            </div>
          </div>
          <div class="card-body">
            <span class="card-loc">{{ dest.location }}</span>
            <h3 class="card-title">{{ dest.name }}</h3>
            <p class="distance-line">{{ getDistanceLabel(dest.id) }}</p>
            <div class="card-footer">
              <span class="card-budget">Starts from <span class="monospaced font-bold">{{ formatPrice(dest.budget) }}</span></span>
              <span class="view-details-txt">View Details →</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="home-empty-state glass-card">
        <h3>No live destinations found</h3>
        <p>{{ homeError || "Please try again in a moment." }}</p>
        <button type="button" class="btn btn-primary mt-4" @click="router.push('/destination')">Open Destinations</button>
      </div>
    </section>

    <section class="recommendations-section container mt-16">
      <div class="section-header">
        <span class="section-badge">TRENDING ENGINE</span>
        <h2>Dynamic Travel Signals</h2>
        <p class="section-subtitle">Nearby, weekend, seasonal, and trending destinations are generated from live user location intelligence.</p>
      </div>

      <div v-if="trendingLoading" class="recommendations-grid">
        <div v-for="n in 4" :key="n" class="glass-card" style="height: 220px;"></div>
      </div>

      <div v-else-if="trendingError" class="home-empty-state glass-card">
        <h3>Trending engine unavailable</h3>
        <p>{{ trendingError }}</p>
        <button type="button" class="btn btn-primary mt-4" @click="router.push('/destination')">Explore Destinations</button>
      </div>

      <div v-else class="trending-category-grid">
        <article v-for="category in trendingCategories" :key="category.title" class="glass-card trend-panel">
          <div class="trend-head">
            <h3>{{ category.title }}</h3>
            <button type="button" class="btn btn-outline trend-action" @click="router.push({ path: '/destination', query: { search: category.query } })">
              Open Search
            </button>
          </div>

          <div v-if="category.state === 'empty'" class="trend-empty">
            <p>{{ category.message }}</p>
            <button type="button" class="btn btn-primary" @click="router.push('/destination')">Explore All</button>
          </div>

          <div v-else class="trend-item-grid">
            <button type="button" v-for="item in category.items.slice(0, 2)" :key="`${category.title}-${item.id}`" class="trend-item" @click="goToDetails(item.id)">
              <img :src="item.image" :alt="item.name" loading="lazy" class="trend-item-img" />
              <div class="trend-item-body">
                <strong>{{ item.name }}</strong>
                <span>{{ item.location }}</span>
                <small>{{ formatTrendDistance(item.distanceKm) }}</small>
              </div>
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- Section 4: AI Recommendations -->
    <section class="recommendations-section container mt-20">
      <div class="section-header">
        <span class="section-badge">AI CORRELATIONS</span>
        <h2>Curated Recommendations</h2>
        <p class="section-subtitle">Choose a lifestyle theme and discover top recommendations.</p>
      </div>

      <div v-if="recommendations.length > 0" class="recommendations-grid">
        <div 
          v-for="rec in recommendations" 
          :key="rec.title" 
          class="rec-card glass-card"
        >
          <div class="rec-img-wrap">
            <img :src="rec.image" :alt="rec.title" class="rec-img" loading="lazy" />
          </div>
          <div class="rec-body">
            <h3>{{ rec.title }}</h3>
            <p>{{ rec.desc }}</p>
            <button 
              type="button" 
              class="btn btn-outline w-full mt-4" 
              @click="goToDetails(rec.query)"
            >
              Explore Theme
            </button>
          </div>
        </div>
      </div>

      <div v-else class="home-empty-state glass-card">
        <h3>Curated recommendations unavailable</h3>
        <p>Recommendations are generated from live destination data and will appear when available.</p>
      </div>
    </section>

  </div>
</template>

<style scoped>
.home-page-layout {
  display: flex;
  flex-direction: column;
}

.mt-16 { margin-top: 64px; }
.mt-20 { margin-top: 80px; }
.w-full { width: 100%; }

/* Hero Section */
.hero-section {
  position: relative;
  height: 580px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  padding-top: 72px; /* Header offset */
  color: white;
}

.hero-overlay-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.8) 100%);
  z-index: 1;
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 800px;
}

.hero-tag {
  font-size: 0.72rem;
  letter-spacing: 0.15em;
  color: var(--color-secondary);
  font-weight: 800;
  margin-bottom: 14px;
}

.hero-title {
  font-size: clamp(2.4rem, 6vw, 3.8rem);
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.15;
  margin-bottom: 16px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.hero-desc {
  font-size: 1.12rem;
  color: #E2E8F0;
  max-width: 620px;
  line-height: 1.6;
  margin-bottom: 32px;
}

/* Hero Search Bar Overlay */
.hero-search-bar {
  display: flex;
  align-items: center;
  background-color: #FFFFFF;
  border-radius: var(--radius-md);
  padding: 8px 10px;
  width: 100%;
  max-width: 580px;
  box-shadow: var(--shadow-xl);
  margin-bottom: 28px;
  position: relative;
}

.search-icon {
  margin: 0 10px 0 6px;
  font-size: 1.1rem;
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

.hero-search-input::placeholder {
  color: var(--color-text-muted);
}

.hero-search-btn {
  padding: 10px 24px !important;
}

.hero-ctas {
  display: flex;
  gap: 16px;
}

.btn-outline-white {
  background-color: transparent;
  color: white;
  border: 1.5px solid white;
}

.btn-outline-white:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

/* Sections headers */
.section-header {
  text-align: center;
  margin-bottom: 40px;
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
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 6px;
  letter-spacing: -0.5px;
}

.section-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

/* Destinations Cards Grid */
.destinations-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 900px) {
  .destinations-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .destinations-grid {
    grid-template-columns: 1fr;
  }
}

.destination-card {
  overflow: hidden;
  cursor: pointer;
}

.card-img-wrap {
  height: 200px;
  position: relative;
  overflow: hidden;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}

.destination-card:hover .card-img {
  transform: scale(1.06);
}

.card-rating {
  position: absolute;
  top: 12px;
  right: 12px;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

.card-body {
  padding: 18px;
}

.card-loc {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 4px 0 8px;
  color: var(--color-text);
}

.distance-line {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
  font-size: 0.85rem;
}

.card-budget {
  color: var(--color-text-secondary);
}

.font-bold {
  font-weight: 700;
  color: var(--color-text);
}

.view-details-txt {
  font-weight: 700;
  color: var(--color-primary);
}

.destination-card:hover .view-details-txt {
  color: var(--color-secondary);
}

/* Recommendations grid */
.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 900px) {
  .recommendations-grid {
    grid-template-columns: 1fr;
  }
}

.rec-card {
  overflow: hidden;
  padding: 0 !important;
}

.rec-img-wrap {
  height: 180px;
  overflow: hidden;
}

.rec-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rec-body {
  padding: 20px;
}

.rec-body h3 {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.rec-body p {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.55;
  min-height: 66px;
}

.home-empty-state {
  padding: 24px;
  text-align: center;
}

.home-empty-state p {
  margin-top: 8px;
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

.trend-empty {
  margin-top: 10px;
}

.trend-empty p {
  color: var(--color-text-secondary);
  font-size: 0.84rem;
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
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}

.trend-item-img {
  width: 84px;
  height: 84px;
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

@media (max-width: 900px) {
  .trending-category-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { generateDestinationSuggestions, parseMapsInput } from "../services/gemini";
import { formatPrice } from "../services/currency";

const route = useRoute();
const router = useRouter();

const searchQuery = ref("");
const selectedBudget = ref("all");
const selectedTime = ref("all");

const destinations = ref([]);
const loading = ref(false);

const mapsInput = ref("");
const analyzing = ref(false);
const analyzerError = ref("");

const handleAnalyze = async () => {
  analyzerError.value = "";
  if (!mapsInput.value.trim()) return;

  const parsed = parseMapsInput(mapsInput.value);
  if (!parsed) {
    analyzerError.value = "Invalid input. Please enter valid coordinates (e.g. 24.5854, 73.7125) or a Google Maps URL link.";
    return;
  }

  analyzing.value = true;
  try {
    const searchSlug = parsed.query.toLowerCase().replace(/\s+/g, "-").replace(/,/g, "");
    router.push(`/destination/${searchSlug}`);
  } catch (e) {
    analyzerError.value = "Failed to analyze location.";
  } finally {
    analyzing.value = false;
  }
};

const fetchDestinations = async () => {
  loading.value = true;
  try {
    const list = await generateDestinationSuggestions(searchQuery.value);
    
    // Apply filters
    destinations.value = list.filter((d) => {
      // Budget filter
      if (selectedBudget.value !== "all") {
        const cap = parseInt(selectedBudget.value);
        if (d.startingBudget > cap) return false;
      }
      
      // Best time filter
      if (selectedTime.value !== "all") {
        if (!d.bestTime.toLowerCase().includes(selectedTime.value.toLowerCase())) {
          return false;
        }
      }
      
      return true;
    });
  } catch (e) {
    console.error("Failed to load destinations:", e);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  // Sync search queries from home
  if (route.query.search) {
    searchQuery.value = route.query.search;
  }
  fetchDestinations();
});

// Watch route queries or parameters changes
watch(() => route.query.search, (val) => {
  searchQuery.value = val || "";
  fetchDestinations();
});

const handleSearch = () => {
  fetchDestinations();
};

const resetFilters = () => {
  searchQuery.value = "";
  selectedBudget.value = "all";
  selectedTime.value = "all";
  fetchDestinations();
};

const goToDetails = (id) => {
  router.push(`/destination/${id}`);
};
</script>

<template>
  <div class="destinations-directory container animate-fade-in" style="padding-top: 100px;">
    
    <!-- Title Area -->
    <div class="directory-header">
      <span class="hud-badge">EXPLORE DIRECTORY</span>
      <h1>Discover Your Next Escape</h1>
      <p class="subtitle">Browse curations, filter by seasons/budgets, and initialize customized planners.</p>
    </div>

    <!-- Google Maps URL & Coordinates Analyzer Card -->
    <div class="maps-analyzer-card glass-card">
      <div class="analyzer-header">
        <span class="analyzer-badge">📡 LIVE ANALYZER</span>
        <h3>Analyze Google Maps Link or Coordinates</h3>
        <p class="analyzer-desc">Enter any coordinates (e.g., 24.5854, 73.7125) or maps.app.goo.gl link to fetch real-time weather, hotels, and cost analysis.</p>
      </div>

      <form @submit.prevent="handleAnalyze" class="analyzer-form">
        <div class="analyzer-input-wrap">
          <span class="analyzer-icon">🗺️</span>
          <input 
            v-model="mapsInput" 
            type="text" 
            placeholder="Paste Google Maps link or Lat, Lng coordinates..." 
            class="analyzer-input"
          />
        </div>
        <button type="submit" class="btn btn-primary analyze-btn" :disabled="analyzing">
          {{ analyzing ? 'Analyzing...' : 'Analyze Location' }}
        </button>
      </form>
      <div v-if="analyzerError" class="analyzer-error mt-2">
        ⚠️ {{ analyzerError }}
      </div>
    </div>

    <!-- Filter Bar Grid -->
    <div class="filter-controls-panel glass-card">
      <div class="filter-row">
        <!-- Search -->
        <div class="filter-input-wrap search">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search destination or country..." 
            class="form-input search-box"
            @input="handleSearch"
          />
        </div>

        <!-- Budget Cap -->
        <div class="filter-input-wrap">
          <select v-model="selectedBudget" class="form-select" @change="fetchDestinations">
            <option value="all">Budget: Any</option>
            <option value="300">Under {{ formatPrice(300) }}</option>
            <option value="600">Under {{ formatPrice(600) }}</option>
            <option value="1200">Under {{ formatPrice(1200) }}</option>
          </select>
        </div>

        <!-- Best Season -->
        <div class="filter-input-wrap">
          <select v-model="selectedTime" class="form-select" @change="fetchDestinations">
            <option value="all">Season: Any</option>
            <option value="november">Winter (Nov-Feb)</option>
            <option value="april">Summer (Apr-Oct)</option>
          </select>
        </div>

        <button type="button" class="btn btn-outline reset-filters-btn" @click="resetFilters">
          Reset
        </button>
      </div>
    </div>

    <!-- Grid Listing -->
    <div v-if="loading" class="listing-loading-skeleton">
      <div v-for="n in 6" :key="n" class="skeleton-card glass-card">
        <div class="skeleton img-sk"></div>
        <div class="card-sk-body">
          <div class="skeleton title-sk"></div>
          <div class="skeleton text-sk"></div>
        </div>
      </div>
    </div>

    <div v-else-if="destinations.length > 0" class="directory-grid">
      <div 
        v-for="dest in destinations" 
        :key="dest.id" 
        class="directory-card glass-card"
      >
        <div class="img-container">
          <img :src="dest.image" :alt="dest.name" class="dest-grid-img" loading="lazy" />
          <div class="dest-rating">
            ⭐ <span class="monospaced">{{ dest.rating }}</span>
          </div>
        </div>

        <div class="dest-card-body">
          <span class="dest-location-badge">{{ dest.location }}</span>
          <h3>{{ dest.name }}</h3>
          <p class="dest-desc">{{ dest.description }}</p>

          <div class="dest-meta-stats">
            <div class="meta-item">
              <span class="m-lbl">BEST SEASON</span>
              <span class="m-val">{{ dest.bestTime }}</span>
            </div>
            <div class="meta-item">
              <span class="m-lbl">EST. BUDGET</span>
              <span class="m-val monospaced font-bold">{{ formatPrice(dest.startingBudget) }}</span>
            </div>
          </div>

          <button 
            type="button" 
            class="btn btn-primary w-full mt-4" 
            @click="goToDetails(dest.id)"
          >
            View Details
          </button>
        </div>
      </div>
    </div>

    <div v-else class="empty-directory glass-card">
      <span>🔍</span>
      <h3>No Destinations Found</h3>
      <p>Try widening your search terms or adjusting the budget filters.</p>
      <button type="button" class="btn btn-primary mt-4" @click="resetFilters">
        Reset Search Filters
      </button>
    </div>

  </div>
</template>

<style scoped>
.destinations-directory {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.directory-header {
  text-align: left;
}

.directory-header h1 {
  font-size: 2.2rem;
  font-weight: 800;
  margin: 6px 0;
  letter-spacing: -0.5px;
}

.hud-badge {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  display: inline-block;
}

.subtitle {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

/* Filter Controls Panel */
.filter-controls-panel {
  padding: 14px 20px !important;
  background-color: #FFFFFF !important;
}

.filter-row {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-input-wrap {
  flex-grow: 1;
}

.filter-input-wrap.search {
  flex-grow: 2;
  min-width: 250px;
}

.search-box {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 12px 50%;
  background-size: 16px;
  padding-left: 38px !important;
}

.reset-filters-btn {
  padding: 10px 20px !important;
}

/* Grid Layout definitions (3 Column Desktop / 2 Tablet / 1 Mobile) */
.directory-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 900px) {
  .directory-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .directory-grid {
    grid-template-columns: 1fr;
  }
}

.directory-card {
  overflow: hidden;
}

.img-container {
  height: 200px;
  position: relative;
  overflow: hidden;
}

.dest-grid-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}

.directory-card:hover .dest-grid-img {
  transform: scale(1.06);
}

.dest-rating {
  position: absolute;
  top: 12px;
  right: 12px;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  box-shadow: var(--shadow-sm);
}

.dest-card-body {
  padding: 20px;
}

.dest-location-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dest-card-body h3 {
  font-size: 1.25rem;
  font-weight: 800;
  margin: 4px 0 10px;
}

.dest-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 16px;
  min-height: 64px;
}

.dest-meta-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  border-top: 1px solid var(--color-border);
  padding-top: 14px;
}

.meta-item {
  display: flex;
  flex-direction: column;
}

.m-lbl {
  font-size: 0.62rem;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.m-val {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.font-bold {
  font-weight: 700;
}

/* Skeletons loader */
.listing-loading-skeleton {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 900px) {
  .listing-loading-skeleton {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .listing-loading-skeleton {
    grid-template-columns: 1fr;
  }
}

.skeleton-card {
  height: 380px;
  overflow: hidden;
}

.img-sk {
  height: 200px;
}

.card-sk-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.title-sk {
  height: 22px;
  width: 60%;
  border-radius: var(--radius-sm);
}

.text-sk {
  height: 14px;
  width: 90%;
  border-radius: var(--radius-sm);
}

/* Empty State */
.empty-directory {
  text-align: center;
  padding: 40px !important;
  background-color: #FFFFFF !important;
}

.empty-directory span {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 12px;
}

.empty-directory p {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.w-full { width: 100%; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }

/* Maps Analyzer CSS */
.maps-analyzer-card {
  padding: 20px 24px !important;
  background-color: #FFFFFF !important;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  margin-top: 24px;
}

.analyzer-header h3 {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 4px 0 2px;
}

.analyzer-badge {
  font-size: 0.62rem;
  font-weight: 800;
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  display: inline-block;
}

.analyzer-desc {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.analyzer-form {
  display: flex;
  gap: 16px;
  margin-top: 16px;
}

@media (max-width: 600px) {
  .analyzer-form {
    flex-direction: column;
  }
}

.analyzer-input-wrap {
  flex-grow: 1;
  display: flex;
  align-items: center;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 14px;
  background-color: #F8FAFC;
  transition: all var(--transition-fast);
}

.analyzer-input-wrap:focus-within {
  border-color: var(--color-primary);
  background-color: white;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.analyzer-icon {
  font-size: 1rem;
  margin-right: 8px;
}

.analyzer-input {
  border: none !important;
  outline: none !important;
  background: transparent !important;
  padding: 10px 0 !important;
  width: 100%;
  font-size: 0.9rem;
}

.analyze-btn {
  padding: 10px 24px !important;
  white-space: nowrap;
}

.analyzer-error {
  font-size: 0.8rem;
  color: #EF4444;
  font-weight: 600;
}
</style>

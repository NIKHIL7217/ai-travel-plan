<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { formatPrice } from "../services/currency";
import { getFriendlyErrorMessage } from "../core/errors";

const route = useRoute();
const router = useRouter();

const searchQuery = ref("");
const selectedBudget = ref("all");
const selectedTime = ref("all");

const destinations = ref([]);
const loading = ref(false);
const directoryError = ref("");

const mapsInput = ref("");
const analyzing = ref(false);
const analyzerError = ref("");

let geminiServicePromise;

async function loadGeminiService() {
  if (!geminiServicePromise) {
    geminiServicePromise = import("../services/gemini");
  }
  return geminiServicePromise;
}

const handleAnalyze = async () => {
  analyzerError.value = "";
  if (!mapsInput.value.trim()) return;

  const { parseMapsInput } = await loadGeminiService();
  const parsed = parseMapsInput(mapsInput.value);
  if (!parsed) {
    analyzerError.value = "Invalid input. Please enter valid coordinates (e.g. 24.5854, 73.7125) or a Google Maps URL link.";
    return;
  }

  analyzing.value = true;
  try {
    const searchSlug = parsed.query.toLowerCase().replace(/\s+/g, "-").replace(/,/g, "");
    router.push({
      path: `/destination/${searchSlug}`,
      query: {
        mapsQuery: parsed.query
      }
    });
  } catch (e) {
    analyzerError.value = getFriendlyErrorMessage(e, "Failed to analyze location.");
  } finally {
    analyzing.value = false;
  }
};

const fetchDestinations = async () => {
  loading.value = true;
  directoryError.value = "";
  try {
    const { generateDestinationSuggestions } = await loadGeminiService();
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
    destinations.value = [];
    directoryError.value = getFriendlyErrorMessage(e, "Failed to load destinations right now.");
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

    <div v-else-if="directoryError" class="empty-directory glass-card">
      <span>⚠️</span>
      <h3>Unable to Load Destinations</h3>
      <p>{{ directoryError }}</p>
      <button type="button" class="btn btn-primary mt-4" @click="fetchDestinations">
        Retry
      </button>
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

<style scoped src="./styles/Destination.css"></style>

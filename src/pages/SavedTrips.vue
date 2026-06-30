<script setup>
import { defineAsyncComponent, ref, onMounted } from "vue";
import { getSavedTripsFromDb, deleteTripFromDb } from "../services/firebase";
import Icons from "../shared/icons/Icons.vue";
import GlassPanel from "../shared/ui/GlassPanel.vue";
import { formatPrice } from "../services/currency";
import { useAuthStore } from "../stores/auth";

const RoadtripIntelligencePanel = defineAsyncComponent(() => import("../features/roadtrip/RoadtripIntelligencePanel.vue"));

const savedTrips = ref([]);
const loading = ref(true);
const loadError = ref("");
const deleteError = ref("");
const deletingTripId = ref("");
const authStore = useAuthStore();

// Modal states for full itinerary review
const activeOverlayTrip = ref(null);
const isOverlayOpen = ref(false);
const overlayRoadtripLoading = ref(false);

const coverImageMap = ref({});
let geminiServicePromise;

async function loadGeminiService() {
  if (!geminiServicePromise) {
    geminiServicePromise = import("../services/gemini");
  }
  return geminiServicePromise;
}

function getTripCoverImage(destination) {
  return coverImageMap.value[destination] || "";
}

const fetchSavedTrips = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const userId = authStore.user?.uid;
    savedTrips.value = userId ? await getSavedTripsFromDb(userId) : [];

    if (savedTrips.value.length) {
      const { resolveUnsplashImage } = await loadGeminiService();
      coverImageMap.value = savedTrips.value.reduce((acc, trip) => {
        acc[trip.destination] = resolveUnsplashImage(trip.destination);
        return acc;
      }, {});
    } else {
      coverImageMap.value = {};
    }
  } catch (e) {
    console.error("Failed to load saved trips:", e);
    savedTrips.value = [];
    loadError.value = "Unable to load your saved trips right now.";
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchSavedTrips();
});

const handleDelete = async (id) => {
  deleteError.value = "";
  if (confirm("Are you sure you want to delete this trip from your archives?")) {
    deletingTripId.value = id;
    try {
      const success = await deleteTripFromDb(id, authStore.user?.uid);
      if (success) {
        savedTrips.value = savedTrips.value.filter(t => t.id !== id);
      } else {
        deleteError.value = "Could not delete this trip. Please try again.";
      }
    } catch (error) {
      deleteError.value = "Could not delete this trip. Please try again.";
    } finally {
      deletingTripId.value = "";
    }
  }
};

const openOverlay = (trip) => {
  activeOverlayTrip.value = trip;
  overlayRoadtripLoading.value = false;
  isOverlayOpen.value = true;
};

const closeOverlay = () => {
  isOverlayOpen.value = false;
  activeOverlayTrip.value = null;
  overlayRoadtripLoading.value = false;
};
</script>

<template>
  <div class="saved-trips-page container animate-fade-in" style="padding-top: 100px;">
    
    <!-- Title -->
    <div class="archives-header">
      <span class="hud-badge">ARCHIVES</span>
      <h1>Journey Archive Gallery</h1>
      <p class="subtitle">Revisit every saved itinerary, reopen context, and relaunch plans in seconds.</p>
      <p v-if="deleteError" class="error-inline mt-2">{{ deleteError }}</p>
    </div>

    <!-- Loading Skeletons -->
    <div v-if="loading" class="skeletons-list mt-8">
      <div v-for="n in 3" :key="n" class="skeleton skeleton-trip-bar mt-4"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="loadError" class="empty-archives glass-card mt-8">
      <span>⚠️</span>
      <h3>Unable to Load Saved Plans</h3>
      <p>{{ loadError }}</p>
      <button 
        type="button" 
        class="btn btn-primary mt-4" 
        @click="fetchSavedTrips"
      >
        Retry
      </button>
    </div>

    <div v-else-if="savedTrips.length === 0" class="empty-archives glass-card mt-8">
      <span>❤️</span>
      <h3>No Saved Travel Plans</h3>
      <p>Save plans in the AI Trip Planner to list them in your account.</p>
      <button 
        type="button" 
        class="btn btn-primary mt-4" 
        @click="$router.push('/planner')"
      >
        Go to AI Planner
      </button>
    </div>

    <!-- Grid of Saved Trips -->
    <div v-else class="archives-grid mt-8">
      <div 
        v-for="trip in savedTrips" 
        :key="trip.id" 
        class="trip-archive-card glass-card"
      >
        <!-- Mock visual banner based on style -->
        <div 
          class="card-cover-art" 
          :style="{ backgroundImage: 'url(' + getTripCoverImage(trip.destination) + ')' }"
        >
          <div class="cover-art-overlay"></div>
          <span class="saved-date-tag monospaced">{{ trip.savedAt }}</span>
          <span class="style-tag">{{ trip.style }}</span>
        </div>

        <div class="card-contents">
          <h3>{{ trip.destination }}</h3>
          <p class="summary-txt">{{ trip.summary }}</p>

          <div class="meta-row monospaced">
            <span>⏱️ {{ trip.days }} Days</span>
            <span>•</span>
            <span>👥 {{ trip.travelers }} Person</span>
            <span>•</span>
            <span class="text-glow-cyan font-bold">{{ formatPrice(trip.budget.total) }}</span>
          </div>

          <div class="actions-row mt-4">
            <button 
              type="button" 
              class="btn btn-outline flex-grow" 
              @click="openOverlay(trip)"
            >
              View Itinerary
            </button>
            <button 
              type="button" 
              class="btn btn-danger delete-icon-btn" 
              @click="handleDelete(trip.id)"
              :disabled="deletingTripId === trip.id"
              title="Delete archived trip"
            >
              {{ deletingTripId === trip.id ? 'Deleting...' : '🗑️' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 9: Full Itinerary Expandable Modal Overlay -->
    <transition name="fade">
      <div v-if="isOverlayOpen && activeOverlayTrip" class="modal-overlay" @click.self="closeOverlay">
        <div class="modal-content glass-card animate-fade-in">
          
          <div class="modal-header">
            <div>
              <span class="badge">{{ activeOverlayTrip.style }} • {{ activeOverlayTrip.days }} Days</span>
              <h2>{{ activeOverlayTrip.destination }}</h2>
            </div>
            <button type="button" class="btn-close-modal" @click="closeOverlay">✕</button>
          </div>

          <div class="modal-body os-scrollbar">
            <!-- Summary -->
            <div class="modal-summary">
              <p>{{ activeOverlayTrip.summary }}</p>
              <div class="budget-capsule mt-2">
                <span>ESTIMATED TOTAL:</span>
                <strong class="monospaced">{{ formatPrice(activeOverlayTrip.budget.total) }}</strong>
              </div>
            </div>

            <!-- Day schedule list -->
            <div class="modal-days-list mt-6">
              <div 
                v-for="day in activeOverlayTrip.itinerary" 
                :key="day.day" 
                class="modal-day-card glass-card"
              >
                <h4>Day {{ day.day }} - {{ day.theme }}</h4>
                <div class="day-details-grid">
                  <div class="det-item">
                    <strong>🌅 Morning:</strong>
                    <p>{{ day.morning }}</p>
                  </div>
                  <div class="det-item">
                    <strong>☀️ Afternoon:</strong>
                    <p>{{ day.afternoon }}</p>
                  </div>
                  <div class="det-item">
                    <strong>🌃 Evening:</strong>
                    <p>{{ day.evening }}</p>
                  </div>
                  <div class="det-item food">
                    <strong>🍽️ Local Dish:</strong>
                    <p>{{ day.foodRecommendation }}</p>
                  </div>
                </div>
              </div>
            </div>

            <RoadtripIntelligencePanel
              v-if="activeOverlayTrip.roadtripIntelligence"
              class="mt-6"
              :roadtrip="activeOverlayTrip.roadtripIntelligence"
              :loading="overlayRoadtripLoading"
            />
          </div>

        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped src="./styles/SavedTrips.css"></style>

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
      <h1>My Saved Plans</h1>
      <p class="subtitle">Access your stored AI itineraries, review itemized budgets, and load prior guides.</p>
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

<style scoped>
.saved-trips-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.archives-header {
  text-align: left;
}

.archives-header h1 {
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

.mt-8 { margin-top: 32px; }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.mt-2 { margin-top: 8px; }
.flex-grow { flex-grow: 1; }

.error-inline {
  color: #dc2626;
  font-size: 0.9rem;
}

/* Skeletons */
.skeletons-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-trip-bar {
  height: 90px;
  border-radius: var(--radius-lg);
}

/* Empty Archives */
.empty-archives {
  text-align: center;
  padding: 40px !important;
  background-color: #FFFFFF !important;
}

.empty-archives span {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 12px;
}

.empty-archives p {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

/* Archives Grid */
.archives-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 900px) {
  .archives-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .archives-grid {
    grid-template-columns: 1fr;
  }
}

.trip-archive-card {
  overflow: hidden;
}

.card-cover-art {
  height: 120px;
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 12px 16px;
  background-size: cover;
  background-position: center;
}

.cover-art-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(15, 23, 42, 0.65) 0%, rgba(15, 23, 42, 0.15) 80%);
  z-index: 1;
}

.saved-date-tag {
  font-size: 0.68rem;
  color: white;
  background-color: rgba(0, 0, 0, 0.4);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.style-tag {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: white;
  background-color: rgba(0, 0, 0, 0.35);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.card-contents {
  padding: 20px;
}

.card-contents h3 {
  font-size: 1.2rem;
  font-weight: 800;
  margin-bottom: 4px;
}

.summary-txt {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
  min-height: 54px;
  margin-bottom: 12px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.text-glow-cyan {
  color: var(--color-primary);
}

.font-bold {
  font-weight: 700;
}

.actions-row {
  display: flex;
  gap: 10px;
}

.delete-icon-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

/* Modal Overlay Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  background-color: #FFFFFF !important;
  width: min(720px, 100%);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 800;
  margin-top: 4px;
}

.badge {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  display: inline-block;
}

.btn-close-modal {
  background: transparent;
  border: none;
  font-size: 1.3rem;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
}

.btn-close-modal:hover {
  color: var(--color-text);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex-grow: 1;
}

.modal-summary {
  background-color: var(--color-bg);
  padding: 16px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.budget-capsule {
  display: flex;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--color-text-primary);
}

.budget-capsule strong {
  color: var(--color-primary);
  font-size: 1rem;
}

.modal-days-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-day-card {
  padding: 16px !important;
  background-color: #FFFFFF !important;
}

.modal-day-card h4 {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--color-primary);
}

.day-details-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.det-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.det-item strong {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.det-item p {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.det-item.food {
  background-color: var(--color-primary-light);
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px dashed rgba(37, 99, 235, 0.15);
}

.det-item.food strong {
  color: var(--color-primary);
}
</style>

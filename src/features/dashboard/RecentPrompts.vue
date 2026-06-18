<script setup>
import { usePlannerStore } from "../../app/stores/planner";
import { useTripsStore } from "../../app/stores/trips";
import Icons from "../../shared/icons/Icons.vue";

const plannerStore = usePlannerStore();
const tripsStore = useTripsStore();

const loadSavedTrip = (trip) => {
  plannerStore.activeTrip = trip;
  plannerStore.promptQuery = trip.destination;
};
</script>

<template>
  <div class="recent-prompts-container">
    
    <!-- Suggested Prompt Commands -->
    <div class="section-block">
      <span class="block-tag">TELEMETRY SUGGESTIONS</span>
      <div class="suggested-list">
        <button 
          type="button" 
          v-for="prompt in plannerStore.suggestedPrompts" 
          :key="prompt"
          class="prompt-suggest-card glass-panel"
          @click="plannerStore.executePlan(prompt)"
        >
          <span class="suggest-sparkle">✦</span>
          <p class="suggest-txt">{{ prompt }}</p>
          <Icons name="arrow-right" class="arrow-icon" />
        </button>
      </div>
    </div>

    <!-- Saved Logged Roadtrips -->
    <div v-if="tripsStore.savedTrips.length > 0" class="section-block mt-8">
      <span class="block-tag">SAVED WORKSPACE ARCHIVES</span>
      <div class="saved-trips-list">
        <div 
          v-for="trip in tripsStore.savedTrips" 
          :key="trip.id" 
          class="saved-trip-item glass-panel"
        >
          <div class="item-details">
            <div class="details-top">
              <span class="trip-saved-at monospaced">{{ trip.savedAt }}</span>
              <span class="style-badge">{{ trip.style }}</span>
            </div>
            <h4>{{ trip.destination }}</h4>
            <p class="trip-summary-txt">{{ trip.summary }}</p>
          </div>
          
          <div class="item-actions">
            <button 
              type="button" 
              class="load-btn" 
              @click="loadSavedTrip(trip)"
              title="Load trip into active view"
            >
              📊 Load Telemetry
            </button>
            <button 
              type="button" 
              class="delete-btn" 
              @click="tripsStore.deleteTrip(trip.id)"
              title="Remove archived record"
            >
              <Icons name="trash" class="trash-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.recent-prompts-container {
  display: flex;
  flex-direction: column;
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block-tag {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.suggested-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Prompt Suggest Card */
.prompt-suggest-card {
  display: flex;
  align-items: center;
  padding: 14px 18px !important;
  background: rgba(255, 255, 255, 0.02) !important;
  border-color: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  text-align: left;
}

.prompt-suggest-card:hover {
  background: rgba(37, 99, 235, 0.05) !important;
  border-color: rgba(37, 99, 235, 0.25);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.prompt-suggest-card:hover .arrow-icon {
  transform: translateX(4px);
  color: var(--color-secondary);
}

.suggest-sparkle {
  color: var(--color-secondary);
  font-size: 1.1rem;
  margin-right: 12px;
}

.suggest-txt {
  flex-grow: 1;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.arrow-icon {
  color: var(--color-text-muted);
  transition: transform var(--transition-fast);
}

/* Saved Trips List */
.mt-8 {
  margin-top: 32px;
}

.saved-trips-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.saved-trip-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px !important;
  background: rgba(15, 23, 42, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.05);
  gap: 20px;
}

@media (max-width: 640px) {
  .saved-trip-item {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }
}

.item-details {
  flex-grow: 1;
}

.details-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.trip-saved-at {
  font-size: 0.68rem;
  color: var(--color-text-muted);
}

.style-badge {
  font-size: 0.6rem;
  font-weight: 800;
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-secondary);
  border: 1px solid rgba(6, 182, 212, 0.15);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.item-details h4 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.trip-summary-txt {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.load-btn {
  white-space: nowrap;
  padding: 8px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.load-btn:hover {
  background: rgba(37, 99, 235, 0.2);
  border-color: var(--color-primary);
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  background: transparent;
  border: 1px solid var(--border-glass);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.delete-btn:hover {
  border-color: #EF4444;
  color: #EF4444;
  background: rgba(239, 68, 68, 0.05);
}

.trash-icon {
  width: 14px;
  height: 14px;
}
</style>

<script setup>
import GlassPanel from "../../shared/ui/GlassPanel.vue";
import { formatPrice } from "../../services/currency";

defineProps({
  trips: {
    type: Array,
    default: () => []
  }
});

defineEmits(["use-trip"]);
</script>

<template>
  <GlassPanel class="recent-card">
    <h3>Recent Trips</h3>

    <p v-if="trips.length === 0" class="empty">No saved trips yet. Save a plan to see it here.</p>

    <div v-else class="trip-list">
      <button
        v-for="trip in trips"
        :key="trip.id"
        type="button"
        class="trip-item"
        @click="$emit('use-trip', trip)"
      >
        <span class="trip-name">{{ trip.destination }}</span>
        <span class="trip-meta">{{ trip.days }} Days • {{ trip.style }} • {{ formatPrice(trip?.budget?.total || 0) }}</span>
      </button>
    </div>
  </GlassPanel>
</template>

<style scoped>
.recent-card {
  background: #ffffff !important;
}

.recent-card h3 {
  margin-bottom: 10px;
  font-size: 1rem;
}

.empty {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.trip-list {
  display: grid;
  gap: 8px;
}

.trip-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #ffffff;
  text-align: left;
  padding: 10px;
  cursor: pointer;
}

.trip-item:hover {
  border-color: rgba(37, 99, 235, 0.35);
}

.trip-name {
  display: block;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--color-text);
}

.trip-meta {
  display: block;
  margin-top: 4px;
  font-size: 0.74rem;
  color: var(--color-text-muted);
}
</style>

<script setup>
defineProps({
  options: { type: Array, default: () => [] },
  selectedPlanId: { type: String, default: "" },
  loading: { type: Boolean, default: false }
});

const emit = defineEmits(["select-plan"]);

function selectPlan(id) {
  emit("select-plan", id);
}
</script>

<template>
  <div class="plan-comparison">
    <h2>Plan Comparison</h2>

    <div v-if="loading" class="loading-state">
      <p>Generating and ranking plan options…</p>
    </div>

    <div v-else-if="options.length === 0" class="empty-state">
      <p>No generated options available yet</p>
    </div>

    <div v-else class="options-list">
      <div
        v-for="option in options"
        :key="option.id"
        :class="['option-card', { selected: option.id === selectedPlanId }]"
      >
        <div class="option-header">
          <span class="option-label">{{ option.label }}</span>
          <span class="option-rank">Rank #{{ option.rank }}</span>
        </div>

        <div class="option-scores">
          <span>Score: {{ option.totalScore }}</span>
          <span>Budget Fit: {{ option.scores.budgetFit }}</span>
          <span>Experience: {{ option.scores.experience }}</span>
          <span>Alignment: {{ option.scores.alignment }}</span>
        </div>

        <p class="ranking-reason">{{ option.rankingReason }}</p>

        <button @click="selectPlan(option.id)">Choose This Plan</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plan-comparison {
  padding: 1rem;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.option-card {
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.75rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  transition: border-color 0.2s;
}

.option-card.selected {
  border-color: rgba(99, 179, 237, 0.6);
  background: rgba(99, 179, 237, 0.08);
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.option-label {
  font-weight: 600;
  font-size: 1.05rem;
}

.option-rank {
  font-size: 0.85rem;
  opacity: 0.7;
}

.option-scores {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.ranking-reason {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 0.75rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 2rem;
  opacity: 0.7;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: none;
  background: rgba(99, 179, 237, 0.3);
  color: inherit;
  cursor: pointer;
  font-size: 0.9rem;
}

button:hover {
  background: rgba(99, 179, 237, 0.5);
}
</style>

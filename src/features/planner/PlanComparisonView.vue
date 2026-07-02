<template>
  <div class="plan-comparison">
    <h3 class="comparison-title">Plan Comparison</h3>

    <div v-if="loading" class="comparison-loading">
      <p>Generating and ranking plan options.</p>
    </div>

    <div v-else-if="!options || options.length === 0" class="comparison-empty">
      <p>No generated options available yet</p>
    </div>

    <div v-else class="options-grid">
      <div
        v-for="option in options"
        :key="option.id"
        class="option-card"
        :class="{ selected: option.id === selectedPlanId }"
      >
        <div class="option-header">
          <span class="option-rank">#{{ option.rank }}</span>
          <strong class="option-label">{{ option.label }}</strong>
          <span class="option-score">{{ option.totalScore }}</span>
        </div>

        <p class="option-reason">{{ option.rankingReason }}</p>

        <div v-if="option.scores" class="option-scores">
          <div class="score-row">
            <span>Budget Fit</span>
            <span>{{ option.scores.budgetFit }}</span>
          </div>
          <div class="score-row">
            <span>Experience</span>
            <span>{{ option.scores.experience }}</span>
          </div>
          <div class="score-row">
            <span>Alignment</span>
            <span>{{ option.scores.alignment }}</span>
          </div>
        </div>

        <div v-if="option.budget" class="option-budget">
          <span>Est. Cost</span>
          <strong>₹{{ (option.budget.total ?? 0).toLocaleString() }}</strong>
        </div>

        <button
          type="button"
          class="choose-btn"
          @click="$emit('select-plan', option.id)"
        >
          Choose This Plan
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  options: {
    type: Array,
    default: () => []
  },
  selectedPlanId: {
    type: String,
    default: ""
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(["select-plan"]);
</script>

<style scoped>
.plan-comparison {
  padding: 16px;
}

.comparison-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.comparison-loading,
.comparison-empty {
  color: var(--color-text-secondary, #64748b);
  padding: 24px 0;
  text-align: center;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.option-card {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.2s;
}

.option-card.selected {
  border-color: var(--color-primary, #3b82f6);
  background: var(--color-primary-light, #eff6ff);
}

.option-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-rank {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #64748b);
}

.option-label {
  flex: 1;
  font-size: 1rem;
}

.option-score {
  font-size: 0.85rem;
  font-weight: 600;
}

.option-reason {
  font-size: 0.82rem;
  color: var(--color-text-secondary, #64748b);
  margin: 0;
}

.option-scores {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.option-budget {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  border-top: 1px solid var(--color-border, #e2e8f0);
  padding-top: 8px;
}

.choose-btn {
  margin-top: auto;
  padding: 8px;
  border: 1px solid var(--color-primary, #3b82f6);
  border-radius: 6px;
  background: transparent;
  color: var(--color-primary, #3b82f6);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.choose-btn:hover {
  background: var(--color-primary, #3b82f6);
  color: #fff;
}
</style>

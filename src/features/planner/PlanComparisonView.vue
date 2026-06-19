<script setup>
import GlassPanel from "../../shared/ui/GlassPanel.vue";
import { formatPrice } from "../../services/currency";

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

const emit = defineEmits(["select-plan"]);

function selectPlan(optionId) {
  emit("select-plan", optionId);
}

function perDayCost(option) {
  const total = Number(option?.budget?.total || 0);
  const days = Math.max(1, Number(option?.itinerary?.itinerary?.length || 1));
  return formatPrice(Math.round(total / days));
}
</script>

<template>
  <GlassPanel class="comparison-panel">
    <div class="head">
      <h3>Plan Comparison</h3>
      <span class="hint">3 itinerary options ranked by scoring engine</span>
    </div>

    <div v-if="loading" class="loading-note">Generating and ranking plan options...</div>
    <div v-else-if="options.length === 0" class="loading-note">No generated options available yet.</div>

    <div v-else class="grid">
      <article
        v-for="option in options"
        :key="option.id"
        class="option-card"
        :class="{ selected: selectedPlanId === option.id }"
      >
        <div class="card-head">
          <div>
            <span class="type-pill">{{ option.label }}</span>
            <h4>{{ option.itinerary?.destination || "Destination" }}</h4>
          </div>
          <div class="meta">
            <span class="rank">#{{ option.rank }}</span>
            <span class="score">{{ option.totalScore }}/100</span>
          </div>
        </div>

        <div class="budget-line">
          <span>Total: <strong>{{ formatPrice(option?.budget?.total || 0) }}</strong></span>
          <span>Per day: <strong>{{ perDayCost(option) }}</strong></span>
        </div>

        <div class="score-grid">
          <div class="score-item">
            <span>Budget Fit</span>
            <strong>{{ option?.scores?.budgetFit || 0 }}</strong>
          </div>
          <div class="score-item">
            <span>Experience</span>
            <strong>{{ option?.scores?.experience || 0 }}</strong>
          </div>
          <div class="score-item">
            <span>Alignment</span>
            <strong>{{ option?.scores?.alignment || 0 }}</strong>
          </div>
          <div class="score-item">
            <span>Budget Cap</span>
            <strong>{{ formatPrice(option?.budgetLimit || 0) }}</strong>
          </div>
        </div>

        <p class="reason">{{ option.rankingReason }}</p>

        <button
          type="button"
          class="btn"
          :class="selectedPlanId === option.id ? 'btn-outline' : 'btn-primary'"
          @click="selectPlan(option.id)"
        >
          {{ selectedPlanId === option.id ? "Selected Plan" : "Choose This Plan" }}
        </button>
      </article>
    </div>
  </GlassPanel>
</template>

<style scoped>
.comparison-panel {
  background: #ffffff !important;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.head h3 {
  font-size: 1rem;
}

.hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.loading-note {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.option-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px;
  display: grid;
  gap: 10px;
  background: #ffffff;
}

.option-card.selected {
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.08);
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.type-pill {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
  padding: 3px 8px;
  margin-bottom: 4px;
}

.card-head h4 {
  font-size: 0.9rem;
}

.meta {
  text-align: right;
  display: grid;
  gap: 4px;
}

.rank {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.score {
  font-size: 0.78rem;
  font-weight: 700;
  color: #0f766e;
}

.budget-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.budget-line strong {
  color: var(--color-text);
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.score-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 6px;
}

.score-item span {
  display: block;
  font-size: 0.67rem;
  color: var(--color-text-muted);
}

.score-item strong {
  display: block;
  font-size: 0.8rem;
  margin-top: 2px;
}

.reason {
  font-size: 0.74rem;
  color: var(--color-text-muted);
  line-height: 1.45;
}

@media (max-width: 1080px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>

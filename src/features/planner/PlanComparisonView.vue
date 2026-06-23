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

function hotelPreview(option) {
  const hotels = Array.isArray(option?.hotels) ? option.hotels : [];
  if (hotels.length === 0) {
    return "Hotels assigned by AI plan";
  }

  return hotels
    .slice(0, 2)
    .map((item) => item?.name)
    .filter(Boolean)
    .join(" | ");
}

function activityPreview(option) {
  const activities = Array.isArray(option?.activities) ? option.activities : [];
  if (activities.length === 0) {
    return "Balanced city + local experiences";
  }

  return activities.slice(0, 3).join(" | ");
}

function listOrDefault(values = [], fallback = "No details") {
  const filtered = values.map((value) => String(value || "").trim()).filter(Boolean);
  if (filtered.length === 0) {
    return [fallback];
  }

  return filtered.slice(0, 3);
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

        <div class="detail-grid">
          <div class="detail-item">
            <span>Transportation</span>
            <strong>{{ option.transportation || "Car" }}</strong>
          </div>
          <div class="detail-item">
            <span>Hotels</span>
            <strong>{{ hotelPreview(option) }}</strong>
          </div>
          <div class="detail-item full">
            <span>Activities</span>
            <strong>{{ activityPreview(option) }}</strong>
          </div>
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

        <div class="tradeoff-grid">
          <div>
            <span class="tradeoff-head">Pros</span>
            <ul class="tradeoff-list">
              <li v-for="pro in listOrDefault(option.pros, 'Good overall fit')" :key="`pro-${option.id}-${pro}`">{{ pro }}</li>
            </ul>
          </div>
          <div>
            <span class="tradeoff-head">Cons</span>
            <ul class="tradeoff-list">
              <li v-for="con in listOrDefault(option.cons, 'Minor trade-offs')" :key="`con-${option.id}-${con}`">{{ con }}</li>
            </ul>
          </div>
        </div>

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

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.detail-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 6px;
  background: #f8fafc;
}

.detail-item.full {
  grid-column: span 2;
}

.detail-item span {
  display: block;
  font-size: 0.66rem;
  color: var(--color-text-muted);
}

.detail-item strong {
  margin-top: 2px;
  display: block;
  font-size: 0.74rem;
  line-height: 1.35;
  color: var(--color-text-secondary);
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

.tradeoff-grid {
  border-top: 1px solid var(--color-border);
  padding-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.tradeoff-head {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.tradeoff-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.tradeoff-list li {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  line-height: 1.35;
}

@media (max-width: 1080px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .detail-item.full {
    grid-column: auto;
  }

  .tradeoff-grid {
    grid-template-columns: 1fr;
  }
}
</style>

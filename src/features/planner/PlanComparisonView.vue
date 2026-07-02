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

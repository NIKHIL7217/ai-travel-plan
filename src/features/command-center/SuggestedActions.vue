<script setup>
import GlassPanel from "../../shared/ui/GlassPanel.vue";

defineProps({
  actions: {
    type: Array,
    default: () => []
  }
});

defineEmits(["apply-action"]);
</script>

<template>
  <GlassPanel class="action-card">
    <h3>Suggested Actions</h3>
    <div class="actions-wrap">
      <button
        v-for="item in actions"
        :key="item.id"
        type="button"
        class="action-chip"
        @click="$emit('apply-action', item)"
      >
        {{ item.label }}
      </button>
    </div>
  </GlassPanel>
</template>

<style scoped>
.action-card {
  background: #ffffff !important;
}

.action-card h3 {
  margin-bottom: 10px;
  font-size: 1rem;
}

.actions-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-chip {
  border: 1px solid var(--color-border);
  background: #ffffff;
  color: var(--color-text-secondary);
  border-radius: var(--radius-full);
  padding: 7px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-chip:hover {
  color: var(--color-primary);
  border-color: rgba(37, 99, 235, 0.35);
  background: var(--color-primary-light);
}
</style>

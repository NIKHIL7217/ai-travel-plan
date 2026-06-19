<script setup>
import GlassPanel from "../../shared/ui/GlassPanel.vue";

defineProps({
  templates: {
    type: Array,
    default: () => []
  }
});

defineEmits(["apply-template"]);
</script>

<template>
  <GlassPanel class="template-card">
    <h3>Quick Templates</h3>
    <div class="template-grid">
      <button
        v-for="item in templates"
        :key="item.id"
        type="button"
        class="template-item"
        @click="$emit('apply-template', item)"
      >
        <span class="template-title">{{ item.title }}</span>
        <span class="template-sub">{{ item.subtitle }}</span>
      </button>
    </div>
  </GlassPanel>
</template>

<style scoped>
.template-card {
  background: #ffffff !important;
}

.template-card h3 {
  margin-bottom: 10px;
  font-size: 1rem;
}

.template-grid {
  display: grid;
  gap: 8px;
}

.template-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #ffffff;
  text-align: left;
  padding: 10px;
  cursor: pointer;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.template-item:hover {
  border-color: rgba(37, 99, 235, 0.35);
  transform: translateY(-1px);
}

.template-title {
  display: block;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--color-text);
}

.template-sub {
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>

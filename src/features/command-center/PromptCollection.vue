<script setup>
import GlassPanel from "../../shared/ui/GlassPanel.vue";

defineProps({
  title: {
    type: String,
    required: true
  },
  emptyLabel: {
    type: String,
    default: "No prompts yet."
  },
  prompts: {
    type: Array,
    default: () => []
  },
  showClear: {
    type: Boolean,
    default: false
  },
  showRemove: {
    type: Boolean,
    default: false
  }
});

defineEmits(["use-prompt", "clear", "remove-prompt"]);
</script>

<template>
  <GlassPanel class="collection-card">
    <div class="head">
      <h3>{{ title }}</h3>
      <button v-if="showClear" type="button" class="link-btn" @click="$emit('clear')">Clear</button>
    </div>

    <div v-if="prompts.length === 0" class="empty">{{ emptyLabel }}</div>

    <div v-else class="list">
      <article v-for="item in prompts" :key="item.id" class="item">
        <button type="button" class="prompt-btn" @click="$emit('use-prompt', item)">
          <span class="prompt-line">{{ item.prompt }}</span>
          <span class="meta">{{ item.destination || "General" }}</span>
        </button>
        <button
          v-if="showRemove"
          type="button"
          class="remove-btn"
          title="Remove saved prompt"
          @click="$emit('remove-prompt', item.id)"
        >
          ✕
        </button>
      </article>
    </div>
  </GlassPanel>
</template>

<style scoped>
.collection-card {
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

.link-btn {
  border: none;
  background: transparent;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-primary);
  cursor: pointer;
}

.empty {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.list {
  display: grid;
  gap: 8px;
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prompt-btn {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #ffffff;
  padding: 9px;
  text-align: left;
  cursor: pointer;
}

.prompt-btn:hover {
  border-color: rgba(37, 99, 235, 0.35);
}

.prompt-line {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.35;
}

.meta {
  display: block;
  margin-top: 4px;
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.remove-btn {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: #ffffff;
  color: var(--color-text-muted);
  cursor: pointer;
}

.remove-btn:hover {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.45);
}
</style>

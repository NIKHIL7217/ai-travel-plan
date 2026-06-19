<script setup>
import GlassPanel from "../../shared/ui/GlassPanel.vue";

const props = defineProps({
  prompt: {
    type: String,
    default: ""
  },
  loading: {
    type: Boolean,
    default: false
  },
  liveAiReady: {
    type: Boolean,
    default: true
  },
  canGenerate: {
    type: Boolean,
    default: true
  },
  fastMode: {
    type: Boolean,
    default: true
  },
  memoryScore: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(["update:prompt", "update:fast-mode", "generate", "save-prompt"]);

const updatePrompt = (event) => {
  emit("update:prompt", event.target.value);
};
</script>

<template>
  <GlassPanel class="composer-card" heavy>
    <div class="composer-head">
      <div>
        <span class="badge">AI COMMAND CENTER</span>
        <h2>Build Your Trip Prompt</h2>
      </div>
      <span class="memory-indicator">Memory {{ memoryScore }}/100</span>
    </div>

    <textarea
      :value="prompt"
      class="composer-input"
      rows="7"
      placeholder="Example: Plan me a 6-day comfort trip from Delhi to Bali with cafe culture, sunset beaches, and moderate budget under 1800 USD..."
      @input="updatePrompt"
    ></textarea>

    <p v-if="!liveAiReady" class="warning">Live AI is not configured. Add VITE_GEMINI_API_KEY in .env.</p>

    <div class="mode-toggle-row">
      <span class="mode-label">Response Mode</span>
      <button
        type="button"
        class="mode-toggle"
        :class="{ active: fastMode }"
        :disabled="loading"
        @click="$emit('update:fast-mode', !fastMode)"
      >
        {{ fastMode ? "Fast (first result quick)" : "Full (all options first)" }}
      </button>
    </div>

    <div class="composer-actions">
      <button type="button" class="btn btn-outline" @click="$emit('save-prompt')">Save Prompt</button>
      <button type="button" class="btn btn-primary" :disabled="loading || !canGenerate" @click="$emit('generate')">
        {{ loading ? "Generating..." : "Generate Itinerary" }}
      </button>
    </div>

    <p v-if="!loading && !canGenerate" class="warning">Prompt ya destination add karke generate karo.</p>
  </GlassPanel>
</template>

<style scoped>
.composer-card {
  background: #ffffff !important;
}

.composer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
}

.composer-head h2 {
  margin-top: 8px;
  font-size: 1.2rem;
}

.memory-indicator {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-secondary);
  background: rgba(14, 165, 233, 0.08);
  border-radius: var(--radius-full);
  padding: 6px 10px;
}

.composer-input {
  width: 100%;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  min-height: 180px;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.composer-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.composer-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.mode-toggle-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mode-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.mode-toggle {
  border: 1px solid var(--color-border);
  background: #ffffff;
  color: var(--color-text-secondary);
  border-radius: var(--radius-full);
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-toggle.active {
  border-color: rgba(37, 99, 235, 0.38);
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.mode-toggle:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.warning {
  margin-top: 10px;
  color: #d97706;
  font-size: 0.82rem;
}
</style>

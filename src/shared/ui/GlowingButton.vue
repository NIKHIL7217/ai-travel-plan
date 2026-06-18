<script setup>
defineProps({
  variant: {
    type: String,
    default: "standard" // primary, secondary, danger, standard
  },
  disabled: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: "button"
  }
});

defineEmits(["click"]);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="[
      'glow-btn-base',
      variant === 'primary' ? 'glow-btn-primary' : '',
      variant === 'secondary' ? 'glow-btn-secondary' : '',
      variant === 'danger' ? 'btn-danger' : '',
      variant === 'standard' ? 'glow-btn' : ''
    ]"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.glow-btn-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 22px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-glass);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  gap: 8px;
}

.glow-btn-base:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.btn-danger {
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25);
}

.btn-danger:hover {
  background: linear-gradient(135deg, #F87171 0%, #EF4444 100%);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.45);
  transform: translateY(-1px);
}
</style>

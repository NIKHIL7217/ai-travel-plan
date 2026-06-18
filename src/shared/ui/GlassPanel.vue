<script setup>
defineProps({
  heavy: {
    type: Boolean,
    default: false
  },
  class: {
    type: String,
    default: ""
  }
});
</script>

<template>
  <div 
    :class="[
      heavy ? 'glass-panel-heavy' : 'glass-panel', 
      'glass-container',
      $props.class
    ]"
  >
    <slot />
  </div>
</template>

<style scoped>
.glass-container {
  border-radius: var(--radius-lg);
  padding: 20px;
  color: var(--color-text-primary);
  transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
}
</style>

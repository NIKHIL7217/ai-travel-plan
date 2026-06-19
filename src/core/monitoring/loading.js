import { computed, ref } from "vue";

export function createLoadingState(initial = false) {
  const pending = ref(initial ? 1 : 0);
  const lastError = ref(null);

  const isLoading = computed(() => pending.value > 0);

  function start() {
    pending.value += 1;
  }

  function stop() {
    pending.value = Math.max(0, pending.value - 1);
  }

  function reset() {
    pending.value = 0;
    lastError.value = null;
  }

  async function run(task) {
    start();
    try {
      return await task();
    } catch (error) {
      lastError.value = error;
      throw error;
    } finally {
      stop();
    }
  }

  return {
    pending,
    isLoading,
    lastError,
    start,
    stop,
    reset,
    run
  };
}

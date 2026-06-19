import { computed, readonly, ref } from "vue";
import { createLogger } from "../logger";
import { trackEvent } from "./index";

const networkLogger = createLogger("network");

const networkState = ref({
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  lastChangedAt: Date.now()
});

let initialized = false;

function updateOnlineState(online) {
  networkState.value = {
    online,
    lastChangedAt: Date.now()
  };

  trackEvent("network.status.changed", {
    online,
    lastChangedAt: networkState.value.lastChangedAt
  });

  if (online) {
    networkLogger.info("Network reconnected");
  } else {
    networkLogger.warn("Network disconnected");
  }
}

export function initNetworkMonitoring() {
  if (initialized || typeof window === "undefined") {
    return;
  }

  initialized = true;

  window.addEventListener("online", () => updateOnlineState(true));
  window.addEventListener("offline", () => updateOnlineState(false));
}

export function useNetworkStatus() {
  return {
    networkStatus: readonly(networkState),
    isOnline: computed(() => networkState.value.online)
  };
}

export function isNetworkOnline() {
  return networkState.value.online;
}

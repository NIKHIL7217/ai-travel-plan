<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useCopilotStore } from "../../stores/copilot";
import { useOfflineStore } from "../../stores/offline";
import { usePlannerSessionStore } from "../../stores/plannerSession";

const route = useRoute();
const copilotStore = useCopilotStore();
const offlineStore = useOfflineStore();
const plannerSessionStore = usePlannerSessionStore();

const promptInput = ref("");
const messagesRef = ref(null);

const plannerContext = computed(() => plannerSessionStore.activeContext);

function updateScopeFromRoute() {
  copilotStore.setScope({
    routeName: String(route.name || "Unknown").trim() || "Unknown",
    routePath: route.fullPath
  });
}

async function handleSend() {
  const nextPrompt = String(promptInput.value || "").trim();
  if (!nextPrompt) {
    return;
  }

  promptInput.value = "";
  await copilotStore.sendMessage(nextPrompt);
}

async function runQuickAction(action) {
  if (!action?.prompt) {
    return;
  }

  promptInput.value = action.prompt;
  await handleSend();
}

function scrollMessagesToBottom() {
  if (!messagesRef.value) {
    return;
  }

  messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
}

watch(
  () => route.fullPath,
  () => {
    updateScopeFromRoute();
  },
  { immediate: true }
);

watch(
  () => plannerContext.value?.destination,
  (destination) => {
    if (!destination) {
      return;
    }

    copilotStore.setScope({
      destination
    });
  }
);

watch(
  () => {
    const last = copilotStore.messages[copilotStore.messages.length - 1];
    return `${copilotStore.messages.length}:${last?.text?.length || 0}`;
  },
  async () => {
    await nextTick();
    scrollMessagesToBottom();
  }
);

watch(
  () => copilotStore.isPanelOpen,
  async (open) => {
    if (!open) {
      return;
    }

    await nextTick();
    scrollMessagesToBottom();
  }
);
</script>

<template>
  <div class="copilot-root">
    <button
      v-if="!copilotStore.isPanelOpen"
      type="button"
      class="copilot-fab"
      @click="copilotStore.openPanel"
      title="Open AI Travel Copilot"
    >
      <span class="fab-title">AI Copilot</span>
      <small>Live</small>
    </button>

    <transition name="copilot-slide">
      <aside v-if="copilotStore.isPanelOpen" class="copilot-panel">
        <header class="panel-header">
          <div>
            <h3>AI Travel Copilot</h3>
            <p>
              <span class="live-dot" :class="{ demo: !copilotStore.isLiveAi }"></span>
              {{ copilotStore.isLiveAi ? "Live AI · Gemini" : "Smart guide mode" }}
            </p>
          </div>
          <div class="header-actions">
            <button type="button" class="mini-btn" @click="copilotStore.clearHistory">Reset</button>
            <button type="button" class="mini-btn" @click="copilotStore.closePanel">Close</button>
          </div>
        </header>

        <div class="context-row">
          <span class="context-chip">Route: {{ copilotStore.scope.routeName }}</span>
          <span v-if="plannerContext?.destination" class="context-chip">Destination: {{ plannerContext.destination }}</span>
          <span class="context-chip" :class="{ offline: !offlineStore.isOnline }">
            {{ offlineStore.isOnline ? "Online" : "Offline" }}
            <template v-if="offlineStore.pendingCount > 0"> · {{ offlineStore.pendingCount }} pending</template>
          </span>
        </div>

        <div class="quick-actions">
          <button
            v-for="action in copilotStore.quickActions"
            :key="action.id"
            type="button"
            class="quick-action-btn"
            @click="runQuickAction(action)"
          >
            {{ action.label }}
          </button>
        </div>

        <div ref="messagesRef" class="messages-wrap">
          <article
            v-for="message in copilotStore.messages"
            :key="message.id"
            class="message"
            :class="message.role"
          >
            <strong>{{ message.role === "user" ? "You" : "Copilot" }}</strong>
            <p v-if="message.text">{{ message.text }}<span v-if="copilotStore.isTyping && message.role === 'assistant' && message === copilotStore.messages[copilotStore.messages.length - 1]" class="stream-caret"></span></p>
            <p v-else class="thinking">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </p>
          </article>

          <article
            v-if="copilotStore.isTyping && copilotStore.messages[copilotStore.messages.length - 1]?.role !== 'assistant'"
            class="message assistant"
          >
            <strong>Copilot</strong>
            <p class="thinking">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </p>
          </article>
        </div>

        <form class="composer" @submit.prevent="handleSend">
          <input
            v-model="promptInput"
            type="text"
            class="form-input"
            placeholder="Ask anything: plan, budget, cheaper, safety, food..."
          />
          <button type="submit" class="btn btn-primary" :disabled="!promptInput.trim() || copilotStore.isTyping">
            Send
          </button>
        </form>
      </aside>
    </transition>
  </div>
</template>

<style scoped>
.copilot-root {
  position: fixed;
  right: 20px;
  bottom: 84px;
  z-index: 1300;
}

.copilot-fab {
  border: 1px solid rgba(37, 99, 235, 0.3);
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb 0%, #0284c7 100%);
  color: #ffffff;
  padding: 10px 14px;
  min-width: 116px;
  box-shadow: 0 14px 24px rgba(37, 99, 235, 0.28);
  cursor: pointer;
  display: grid;
  gap: 2px;
  text-align: left;
}

.fab-title {
  font-size: 0.77rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.copilot-fab small {
  font-size: 0.68rem;
  opacity: 0.9;
}

.copilot-panel {
  width: min(390px, calc(100vw - 24px));
  max-height: min(78vh, 720px);
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 24px 40px rgba(15, 23, 42, 0.22);
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  overflow: hidden;
}

.panel-header {
  padding: 14px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.panel-header h3 {
  font-size: 0.98rem;
}

.panel-header p {
  margin-top: 3px;
  font-size: 0.74rem;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #16a34a;
  box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.45);
  animation: live-pulse 1.8s infinite;
}

.live-dot.demo {
  background: #d97706;
  animation: none;
}

@keyframes live-pulse {
  0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
  100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
}

.header-actions {
  display: flex;
  gap: 6px;
}

.mini-btn {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 4px 10px;
  background: #ffffff;
  color: var(--color-text-secondary);
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
}

.context-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
}

.context-chip {
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 999px;
  background: rgba(219, 234, 254, 0.56);
  color: #1d4ed8;
  padding: 4px 8px;
  font-size: 0.66rem;
  font-weight: 700;
}

.context-chip.offline {
  border-color: rgba(220, 38, 38, 0.25);
  background: rgba(254, 226, 226, 0.66);
  color: #b91c1c;
}

.quick-actions {
  padding: 10px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  border-bottom: 1px solid var(--color-border);
}

.quick-action-btn {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
  color: var(--color-text-secondary);
  padding: 6px 9px;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
}

.quick-action-btn:hover {
  border-color: rgba(37, 99, 235, 0.4);
  color: #1d4ed8;
}

.messages-wrap {
  padding: 12px 14px;
  overflow: auto;
  display: grid;
  gap: 8px;
  background: #f8fafc;
}

.message {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 9px;
  background: #ffffff;
}

.message strong {
  font-size: 0.7rem;
}

.message p {
  margin-top: 5px;
  font-size: 0.81rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.stream-caret {
  display: inline-block;
  width: 7px;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: #2563eb;
  border-radius: 1px;
  animation: caret-blink 1s steps(2) infinite;
}

@keyframes caret-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.thinking {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.thinking .dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-text-muted);
  animation: thinking-bounce 1.2s infinite ease-in-out both;
}

.thinking .dot:nth-child(2) { animation-delay: 0.16s; }
.thinking .dot:nth-child(3) { animation-delay: 0.32s; }

@keyframes thinking-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.message.user {
  border-color: rgba(37, 99, 235, 0.25);
  background: rgba(239, 246, 255, 0.86);
}

.composer {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--color-border);
  background: #ffffff;
}

.composer .form-input {
  flex: 1;
  padding: 10px 12px;
  font-size: 0.82rem;
}

.composer .btn {
  padding: 10px 14px;
  font-size: 0.79rem;
}

.copilot-slide-enter-active,
.copilot-slide-leave-active {
  transition: all 0.22s ease;
}

.copilot-slide-enter-from,
.copilot-slide-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

@media (max-width: 768px) {
  .copilot-root {
    right: 12px;
    bottom: 74px;
  }

  .copilot-panel {
    width: min(360px, calc(100vw - 20px));
    max-height: min(72vh, 620px);
  }
}
</style>

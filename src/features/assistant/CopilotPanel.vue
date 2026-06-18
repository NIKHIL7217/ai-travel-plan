<script setup>
import { ref, watch, nextTick } from "vue";
import { useAssistantStore } from "../../app/stores/assistant";
import Icons from "../../shared/icons/Icons.vue";

const assistantStore = useAssistantStore();
const chatText = ref("");
const chatScrollRef = ref(null);

const handleSend = () => {
  if (!chatText.value.trim()) return;
  assistantStore.sendMessage(chatText.value);
  chatText.value = "";
};

// Auto scroll chat to bottom when messages append
watch(() => assistantStore.messages.length, async () => {
  await nextTick();
  if (chatScrollRef.value) {
    chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight;
  }
});

// Watch panel toggle to focus/scroll
watch(() => assistantStore.isPanelOpen, async (val) => {
  if (val) {
    await nextTick();
    if (chatScrollRef.value) {
      chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight;
    }
  }
});
</script>

<template>
  <div>
    <!-- Floating Circular Trigger Orb -->
    <button 
      type="button" 
      :class="['copilot-trigger-orb', assistantStore.isPanelOpen ? 'active' : '']"
      @click="assistantStore.togglePanel"
      title="Toggle AI Copilot"
    >
      <span class="sparkle-pulse">✨</span>
      <span class="orb-lbl">Copilot</span>
    </button>

    <!-- Slide-in Drawer -->
    <transition name="slide-drawer">
      <div v-if="assistantStore.isPanelOpen" class="copilot-drawer glass-panel-heavy">
        
        <!-- Drawer Header -->
        <div class="drawer-header">
          <div class="header-title-wrap">
            <span class="active-dot pulse-glow">●</span>
            <div>
              <h3>AI Copilot</h3>
              <span class="telemetry-span">CONTEXT OVERLAY LOADED</span>
            </div>
          </div>
          <div class="header-actions">
            <button 
              type="button" 
              class="action-btn" 
              @click="assistantStore.clearHistory" 
              title="Clear cache memory"
            >
              Reset
            </button>
            <button 
              type="button" 
              class="close-btn" 
              @click="assistantStore.togglePanel"
            >
              <Icons name="close" />
            </button>
          </div>
        </div>

        <!-- Messages Area -->
        <div ref="chatScrollRef" class="chat-logs-area os-scrollbar">
          <div 
            v-for="msg in assistantStore.messages" 
            :key="msg.id" 
            :class="['chat-bubble-row', msg.sender]"
          >
            <div class="bubble glass-panel">
              <span class="sender-tag">{{ msg.sender.toUpperCase() }}</span>
              <p class="bubble-txt">{{ msg.text }}</p>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div v-if="assistantStore.isTyping" class="chat-bubble-row copilot typing">
            <div class="bubble glass-panel">
              <span class="sender-tag">COPILOT</span>
              <div class="typing-loader">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Box -->
        <form @submit.prevent="handleSend" class="drawer-input-row">
          <div class="input-glow-wrap">
            <input 
              v-model="chatText" 
              type="text" 
              placeholder="Ask Copilot (e.g., 'What's the weather warning?')" 
              class="neon-input drawer-input"
            />
            <button type="button" class="voice-mock-btn" title="Voice copilot command (mock)">
              <Icons name="mic" class="mic-icon" />
            </button>
          </div>
          <button type="submit" class="glow-btn-primary send-btn" :disabled="!chatText.trim()">
            <Icons name="arrow-right" />
          </button>
        </form>

      </div>
    </transition>
  </div>
</template>

<style scoped>
/* Floating Orb Trigger */
.copilot-trigger-orb {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 60px;
  height: 60px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 30px rgba(37, 99, 235, 0.35), 0 0 15px rgba(20, 184, 166, 0.25);
  cursor: pointer;
  z-index: 950;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: white;
  transition: all var(--transition-normal);
}

.copilot-trigger-orb:hover {
  transform: scale(1.08) translateY(-2px);
  box-shadow: 0 12px 35px rgba(37, 99, 235, 0.5), 0 0 25px rgba(20, 184, 166, 0.45);
}

.copilot-trigger-orb.active {
  transform: rotate(90deg) scale(0.9);
  background: #1e293b;
  border-color: var(--border-glass);
  box-shadow: none;
  opacity: 0.1;
  pointer-events: none; /* Hide or make inactive when drawer is active */
}

.sparkle-pulse {
  font-size: 1.2rem;
  animation: pulseGlow 2s infinite alternate ease-in-out;
}

.orb-lbl {
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Slide-in Drawer Panel */
.copilot-drawer {
  position: fixed;
  top: 50px; /* Offset status bar */
  right: 0;
  width: 380px;
  height: calc(100vh - 50px);
  border-left: 1px solid var(--border-glass);
  border-radius: 0;
  display: flex;
  flex-direction: column;
  z-index: 960;
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.6);
}

@media (max-width: 480px) {
  .copilot-drawer {
    width: 100vw;
  }
}

/* Header */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-glass);
}

.header-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.active-dot {
  color: var(--color-accent);
}

.drawer-header h3 {
  font-size: 1rem;
  font-family: var(--font-display);
}

.telemetry-span {
  font-size: 0.58rem;
  color: var(--color-text-muted);
  letter-spacing: 0.06em;
  font-weight: 700;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.action-btn:hover {
  color: var(--color-text-primary);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
}

.close-btn:hover {
  color: var(--color-text-primary);
}

/* Chat Logs Scroll Area */
.chat-logs-area {
  flex-grow: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chat-bubble-row {
  display: flex;
  width: 100%;
}

.chat-bubble-row.user {
  justify-content: flex-end;
}

.chat-bubble-row.copilot {
  justify-content: flex-start;
}

.bubble {
  max-width: 85%;
  padding: 10px 14px !important;
  border-radius: var(--radius-md) !important;
}

.chat-bubble-row.user .bubble {
  background: rgba(37, 99, 235, 0.15) !important;
  border-color: rgba(37, 99, 235, 0.3) !important;
  border-bottom-right-radius: 2px !important;
}

.chat-bubble-row.copilot .bubble {
  background: rgba(255, 255, 255, 0.02) !important;
  border-color: rgba(255, 255, 255, 0.05) !important;
  border-bottom-left-radius: 2px !important;
}

.sender-tag {
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
  display: block;
}

.chat-bubble-row.user .sender-tag {
  color: var(--color-secondary);
  text-align: right;
}

.chat-bubble-row.copilot .sender-tag {
  color: var(--color-accent);
}

.bubble-txt {
  font-size: 0.88rem;
  color: var(--color-text-primary);
  line-height: 1.4;
}

/* Typing Indicator Animation */
.typing-loader {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.typing-loader span {
  width: 6px;
  height: 6px;
  background-color: var(--color-accent);
  border-radius: var(--radius-full);
  animation: typingDot 1.4s infinite ease-in-out both;
}

.typing-loader span:nth-child(1) { animation-delay: -0.32s; }
.typing-loader span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typingDot {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

/* Input Row */
.drawer-input-row {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--border-glass);
}

.input-glow-wrap {
  position: relative;
  flex-grow: 1;
}

.drawer-input {
  padding-right: 40px !important;
}

.voice-mock-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
}

.voice-mock-btn:hover {
  color: var(--color-text-primary);
}

.send-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
}

/* Transition Animations */
.slide-drawer-enter-active,
.slide-drawer-leave-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
}

.slide-drawer-enter-from,
.slide-drawer-leave-to {
  transform: translateX(100%);
  opacity: 0.9;
}
</style>

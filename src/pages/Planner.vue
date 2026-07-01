<template>
  <div class="planner-layout">
    <div class="main-workspace">
      <aside class="chat-sidebar" :class="{ collapsed: !sidebarOpen }">
        <button class="new-chat-btn" @click="startNewChat">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New chat
        </button>
        <div class="sidebar-label-row">
          <div class="sidebar-label">{{ showArchived ? "Archived chats" : "Previous chats" }}</div>
          <button
            v-if="showArchived || archivedSessions.length"
            class="sidebar-archive-toggle"
            @click="toggleArchivedView"
          >
            <template v-if="showArchived">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
              Back
            </template>
            <template v-else>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1" /><path d="M4 8v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
              Archived ({{ archivedSessions.length }})
            </template>
          </button>
        </div>
        <div class="sidebar-list">
          <div
            v-for="session in visibleSessions"
            :key="session.id"
            class="sidebar-item"
            :class="{ active: session.id === activeSessionId, 'menu-open': openMenuId === session.id }"
          >
            <input
              v-if="renamingId === session.id"
              :ref="(el) => registerRenameInput(session.id, el)"
              v-model="renameText"
              class="sidebar-item-rename"
              type="text"
              @keydown.enter.prevent="commitRename(session)"
              @keydown.esc.prevent="cancelRename"
              @blur="commitRename(session)"
            >
            <button v-else class="sidebar-item-main" @click="openChat(session.id)">
              <svg class="sidebar-item-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <span class="sidebar-item-title">{{ session.title }}</span>
            </button>

            <button class="sidebar-item-menu-btn" aria-label="Chat options" @click.stop="toggleSessionMenu(session.id)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
            </button>

            <div v-if="openMenuId === session.id" class="session-menu" @click.stop>
              <button class="session-menu-item" @click="handleSessionAction('share', session)">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                Share
              </button>
              <button class="session-menu-item" @click="handleSessionAction('rename', session)">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                Rename
              </button>
              <button v-if="session.archived" class="session-menu-item" @click="handleSessionAction('unarchive', session)">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1" /><path d="M4 8v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8" /><polyline points="9 15 12 12 15 15" /><line x1="12" y1="12" x2="12" y2="18" /></svg>
                Unarchive
              </button>
              <button v-else class="session-menu-item" @click="handleSessionAction('archive', session)">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1" /><path d="M4 8v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
                Archive
              </button>
              <button class="session-menu-item danger" @click="handleSessionAction('delete', session)">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                Delete
              </button>
              <div class="session-menu-divider"></div>
              <button class="session-menu-item" @click="handleSessionAction('settings', session)">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
                Settings
              </button>
            </div>
          </div>
          <p v-if="!visibleSessions.length" class="sidebar-empty">{{ showArchived ? "No archived chats." : "No previous chats yet." }}</p>
        </div>
        <div v-if="openMenuId" class="session-menu-backdrop" @click="closeSessionMenu"></div>
      </aside>
      <aside class="left_panel">
        <div class="left_panel-header">
          <div class="ai-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>
          </div>
          <div class="ai-title">
            <strong>Wander AI</strong>
            <span class="status"><span class="dot"></span> Active</span>
          </div>
          <button class="sidebar-toggle" :aria-label="sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'" :aria-pressed="sidebarOpen" @click="toggleSidebar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
          </button>
        </div>

        <div ref="chatContainerRef" class="chat-container">
          <div v-if="showChatEmptyState" class="chat-empty-state">
            <div class="chat-empty-icon">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            <h3>How can I help you plan your trip?</h3>
            <p>Share your ideas, preferences, or questions and I'll help you create a perfect itinerary.</p>
          </div>
          <template v-for="message in displayMessages" :key="message.id">
            <div v-if="message.role === 'assistant'" class="ai-message">
              <div class="ai-avatar">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
              </div>
              <div class="ai-content">
                <p v-if="message.thinking" class="thinking-line">
                  {{ message.text }}<span class="tdot"></span><span class="tdot"></span><span class="tdot"></span>
                </p>
                <p v-else>{{ message.text }}</p>

                <div v-if="message.preview" class="itin-preview">
                  <div class="itin-title">
                    <span>🌴</span> {{ planner.destination }} <span class="days">• {{ dayPlans.length }} Days</span>
                  </div>
                  <div class="itin-badges">
                    <span class="badge badge-green">₹{{ formatInr(totalBudget) }}</span>
                    <span class="badge badge-orange">{{ planner.travelers }} Travelers</span>
                  </div>
                  <div class="itin-desc">{{ planner.summary }}</div>
                </div>

                <div v-if="message.chips?.length" class="chip-group">
                  <span
                    v-for="chip in message.chips"
                    :key="`${message.id}-${chip}`"
                    class="chip"
                    :class="{ cyan: message.cyanChips }"
                    @click="applyChipPrompt(chip)"
                  >
                    {{ chip }}
                  </span>
                </div>
              </div>
            </div>

            <div v-else class="user-message">
              <div class="user-content">{{ message.text }}</div>
            </div>
          </template>
        </div>

        <div class="chat-input-area">
          <div class="input-wrapper">
            <svg class="icon-attach" viewBox="0 0 24 24" width="20" height="20" fill="#94a3b8" role="button" tabindex="0" @click="handleAttach" @keydown.enter.prevent="handleAttach"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-3.31-2.69-6-6-6S3 1.69 3 5v12.5c0 3.31 2.69 6 6 6s6-2.69 6-6V6h-1.5z" /></svg>
            <input v-model="chatInput" type="text" :placeholder="isGenerating ? 'Generating your plan…' : 'Ask me to plan, modify, or optimize your trip...'" :disabled="isGenerating" @keydown.enter.prevent="sendChatMessage">
            <svg class="icon-mic" viewBox="0 0 24 24" width="20" height="20" fill="#94a3b8" role="button" tabindex="0" @click="handleMic" @keydown.enter.prevent="handleMic"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6.3 6.92V22h1.4v-4.08A7 7 0 0 0 19 11h-2z" /></svg>
            <button class="btn-send" @click="sendChatMessage"><svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" /></svg></button>
          </div>
        </div>
      </aside>

      <main class="content-area">
        <div v-if="!hasPlan" class="planner-empty">
          <div class="planner-empty-inner">
            <div class="planner-empty-spark">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
            </div>
            <h1>Let's plan your perfect trip</h1>
            <p class="planner-empty-sub">Tell me about your travel preferences and I'll create a personalized itinerary for you.</p>
            <div class="suggestion-grid">
              <button v-for="s in tripSuggestions" :key="s.title" class="suggestion-card" :disabled="isGenerating" @click="applySuggestion(s)">
                <span class="suggestion-icon" :class="s.tone">{{ s.emoji }}</span>
                <span class="suggestion-text">
                  <strong>{{ s.title }}</strong>
                  <small>{{ s.subtitle }}</small>
                </span>
              </button>
            </div>
            <div class="planner-empty-foot">
              <div class="foot-spark">✈️</div>
              <strong>Not sure where to start?</strong>
              <p>Share any idea, even a vague one. I'll help you figure it out!</p>
            </div>
          </div>
        </div>

        <div v-if="hasPlan" class="hero-header">
          <div class="hero-bg"></div>
          <div class="hero-content">
            <div class="hero-top">
              <div>
                <div class="badge-row">
                  <span class="badge-ai">AI GENERATED</span>
                  <span class="updated-time">• Updated {{ planner.updatedAt }}</span>
                </div>
                <h1>{{ planner.destination }}</h1>
                <p class="subtitle">{{ planner.subtitle }}</p>
              </div>
              <div class="hero-actions">
                <button class="btn btn-outline-light" @click="handleEditPlan">Edit</button>
                <button class="btn btn-outline-light" :disabled="isGenerating" @click="handleRegeneratePlan">{{ isGenerating ? "Generating…" : "Regenerate" }}</button>
                <button class="btn btn-outline-light" @click="router.push('/bookings')">Book</button>
              </div>
            </div>

            <div class="stats-row">
              <div class="stat-card" v-for="stat in stats" :key="stat.label">
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-value" :class="stat.valueClass">{{ stat.value }}</div>
                <div class="stat-subtext" :class="stat.subtextClass">{{ stat.subtext }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="hasPlan" class="main-tabs-container">
          <div class="main-tabs">
            <button class="tab-btn" :class="{ active: activeTab === 'itinerary' }" @click="handleTabClick('itinerary')">Itinerary</button>
            <button class="tab-btn" :class="{ active: activeTab === 'hotels' }" @click="handleTabClick('hotels')">Hotels</button>
            <button class="tab-btn" :class="{ active: activeTab === 'restaurants' }" @click="handleTabClick('restaurants')">Restaurants</button>
            <button class="tab-btn" :class="{ active: activeTab === 'budget' }" @click="handleTabClick('budget')">Budget</button>
            <button class="tab-btn" :class="{ active: activeTab === 'map' }" @click="handleTabClick('map')">Map</button>
            <button class="tab-btn" :class="{ active: activeTab === 'tips' }" @click="handleTabClick('tips')">AI Tips</button>
          </div>

          <div v-if="activeTab === 'itinerary'" class="day-tabs">
            <button v-for="day in dayPlans" :key="day.id" class="day-tab" :class="{ active: selectedDayId === day.id }" @click="handleDaySelect(day.id)">
              <strong>Day {{ day.day }}</strong> <span>{{ day.date }}</span>
            </button>
          </div>

          <div class="timeline-section">
            <template v-if="activeTab === 'itinerary'">
              <div class="timeline-header">
                <div>
                  <h2>Day {{ selectedDay.day }} — {{ selectedDay.theme }}</h2>
                  <p>{{ selectedDay.dateLabel }} • {{ selectedDay.area }}</p>
                </div>
                <div class="day-cost">Day cost: <strong>₹{{ formatInr(selectedDay.cost) }}</strong></div>
              </div>

              <div v-if="selectedDay.items.length" class="timeline-list">
                <div v-for="(item, index) in selectedDay.items" :key="item.id" class="timeline-card" @click="handleTimelineItemClick(item)">
                  <div v-if="index < selectedDay.items.length - 1" class="timeline-line"></div>
                  <div class="t-icon-box" :class="item.iconTone">
                    <svg v-if="item.icon === 'sun'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                    <svg v-else-if="item.icon === 'food'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><line x1="6" y1="2" x2="6" y2="4" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="14" y1="2" x2="14" y2="4" /></svg>
                    <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                  </div>
                  <div class="t-content">
                    <div class="t-time" :class="item.timeTone">{{ item.slot }} • {{ item.time }} <span v-if="item.aiPick" class="ai-pick">AI Pick</span></div>
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.description }}</p>
                    <div class="t-tags">
                      <span class="t-tag" @click.stop="handleTimelineTagClick(item, 'duration', item.duration)">{{ item.duration }}</span>
                      <span class="t-tag" @click.stop="handleTimelineTagClick(item, 'cost', `₹${formatInr(item.cost)}`)">₹{{ formatInr(item.cost) }}</span>
                      <span v-for="tag in item.tags" :key="`${item.id}-${tag.text}`" class="t-tag" :class="{ highlight: tag.highlight }" @click.stop="handleTimelineTagClick(item, 'meta', tag.text)">{{ tag.text }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="timeline-list">
                <div class="timeline-card">
                  <div class="t-icon-box cyan">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /></svg>
                  </div>
                  <div class="t-content">
                    <h3>No activities added for this day yet</h3>
                    <p>Use chat to add plans like "Add sunset beach dinner on Day {{ selectedDay.day }}".</p>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="activeTab === 'hotels'">
              <div class="timeline-header"><div><h2>Recommended Hotels</h2><p>Options based on your itinerary</p></div></div>
              <div class="timeline-list">
                <div v-for="hotel in hotels" :key="hotel.name" class="timeline-card" @click="handleHotelCardClick(hotel)">
                  <div class="t-icon-box orange">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z" /></svg>
                  </div>
                  <div class="t-content">
                    <h3>{{ hotel.name }}</h3>
                    <p>{{ hotel.area }} • {{ hotel.summary }}</p>
                    <div class="t-tags"><span class="t-tag">{{ hotel.rating }}</span><span class="t-tag">₹{{ formatInr(hotel.nightly) }}/night</span></div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="activeTab === 'restaurants'">
              <div class="timeline-header"><div><h2>Restaurant Picks</h2><p>Food recommendations by area</p></div></div>
              <div class="timeline-list">
                <div v-for="restaurant in restaurants" :key="restaurant.name" class="timeline-card" @click="handleRestaurantCardClick(restaurant)">
                  <div class="t-icon-box pink">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                  </div>
                  <div class="t-content">
                    <h3>{{ restaurant.name }}</h3>
                    <p>{{ restaurant.type }} • {{ restaurant.area }}</p>
                    <div class="t-tags"><span class="t-tag">{{ restaurant.rating }}</span><span class="t-tag">₹{{ formatInr(restaurant.avgCost) }} avg</span></div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="activeTab === 'budget'">
              <div class="timeline-header"><div><h2>Budget Breakdown</h2><p>Category-wise spend view</p></div></div>
              <div class="timeline-list">
                <div v-for="row in budgetRows" :key="row.label" class="timeline-card" @click="handleBudgetRowClick(row)">
                  <div class="t-icon-box cyan">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>
                  </div>
                  <div class="t-content"><h3>{{ row.label }}</h3><div class="t-tags"><span class="t-tag">₹{{ formatInr(row.amount) }}</span></div></div>
                </div>
              </div>
            </template>

            <template v-else-if="activeTab === 'map'">
              <div class="timeline-header"><div><h2>Route Intelligence</h2><p>{{ mapSummary.route }}</p></div></div>
              <InteractiveTripMap v-if="mapPoints.length" :points="mapPoints" :show-route="true" height="320px" class="planner-map" />
              <div class="timeline-list">
                <div class="timeline-card" @click="handleMapCardClick('distance')"><div class="t-icon-box orange"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg></div><div class="t-content"><h3>Distance</h3><p>{{ mapSummary.distance }}</p></div></div>
                <div class="timeline-card" @click="handleMapCardClick('transfer')"><div class="t-icon-box pink"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 11h-2V7h2zm0 4h-2v-2h2z" /></svg></div><div class="t-content"><h3>Transfer Time</h3><p>{{ mapSummary.transfer }}</p></div></div>
              </div>
            </template>

            <template v-else>
              <div class="timeline-header"><div><h2>AI Tips</h2><p>Suggestions to optimize this trip</p></div></div>
              <div class="timeline-list">
                <div v-for="tip in aiTips" :key="tip" class="timeline-card" @click="handleTipClick(tip)"><div class="t-icon-box cyan"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" /></svg></div><div class="t-content"><p>{{ tip }}</p></div></div>
              </div>
            </template>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  generateTravelPlan,
  generateBudgetEstimate,
  extractTripIntent,
  getRealLocationData
} from "../services/gemini";
import { usePlannerSessionStore } from "../stores/plannerSession";
import InteractiveTripMap from "../features/maps/InteractiveTripMap.vue";

const router = useRouter();
const plannerSession = usePlannerSessionStore();
const isGenerating = ref(false);
const mapPoints = ref([]);
const INR_RATE = 83.5;

const activeTab = ref("itinerary");
const chatInput = ref("");
const chatContainerRef = ref(null);
const hasPlan = ref(false);

const STORAGE_KEY = "planner.page.state.v2";

function genId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyPlanner() {
  return {
    destination: "",
    subtitle: "",
    summary: "",
    travelers: 2,
    updatedAt: "",
    weather: "",
    score: ""
  };
}

function createGreetingMessage() {
  return {
    id: "a-greeting",
    role: "assistant",
    text: "Hello! I'm your AI travel planner. Tell me about your dream trip and I'll create a complete itinerary for you. ✨",
    chips: ["Beach getaway", "Adventure trip", "Honeymoon", "Family vacation"]
  };
}

const tripSuggestions = [
  { emoji: "🏖️", tone: "blue", title: "I want a relaxing beach vacation", subtitle: "Sun, sand, and relaxation", prompt: "Plan a relaxing beach vacation for 2 people with sun, sand and relaxation." },
  { emoji: "⛰️", tone: "green", title: "Looking for an adventure trip", subtitle: "Thrilling activities and nature", prompt: "Plan an adventure trip with thrilling activities and nature for 2 people." },
  { emoji: "💜", tone: "purple", title: "Planning a romantic getaway", subtitle: "Perfect for couples", prompt: "Plan a romantic getaway perfect for a couple." },
  { emoji: "👨‍👩‍👧", tone: "orange", title: "Family vacation with kids", subtitle: "Kid-friendly activities", prompt: "Plan a family vacation with kid-friendly activities." },
  { emoji: "📅", tone: "yellow", title: "I have specific dates in mind", subtitle: "Plan around my schedule", prompt: "Help me plan a trip around specific dates in my schedule." },
  { emoji: "₹", tone: "teal", title: "I have a budget in mind", subtitle: "Plan within my budget", prompt: "Help me plan a trip within a specific budget." }
];

const planner = ref(createEmptyPlanner());

const dayPlans = ref([]);
const selectedDayId = ref("");
const hotels = ref([]);
const restaurants = ref([]);
const budgetBuckets = ref({ flights: 0, stay: 0, food: 0, transport: 0, activities: 0 });
const mapSummary = ref({ route: "", distance: "", transfer: "" });
const aiTips = ref([]);
const chatMessages = ref([createGreetingMessage()]);

const chatSessions = ref([]);
const activeSessionId = ref(genId("session"));

const sidebarOpen = ref(true);
const openMenuId = ref(null);
const renamingId = ref(null);
const renameText = ref("");
const renameInputs = new Map();
const showArchived = ref(false);

const showChatEmptyState = computed(() => !chatMessages.value.some((message) => message.role === "user"));
const displayMessages = computed(() => (showChatEmptyState.value ? [] : chatMessages.value));

function sortByRecent(list) {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

const activeSessions = computed(() => sortByRecent(chatSessions.value.filter((session) => !session.archived)));
const archivedSessions = computed(() => sortByRecent(chatSessions.value.filter((session) => session.archived)));
const visibleSessions = computed(() => (showArchived.value ? archivedSessions.value : activeSessions.value));

const selectedDay = computed(
  () => dayPlans.value.find((day) => day.id === selectedDayId.value) || dayPlans.value[0] || { day: 1, theme: "", dateLabel: "", area: "", cost: 0, items: [] }
);
const totalBudget = computed(() => {
  const { flights, stay, food, transport, activities } = budgetBuckets.value;
  return flights + stay + food + transport + activities;
});

const budgetRows = computed(() => {
  const { flights, stay, food, transport, activities } = budgetBuckets.value;
  return [
    { label: "Flights", amount: flights },
    { label: "Stay", amount: stay },
    { label: "Food", amount: food },
    { label: "Transport", amount: transport },
    { label: "Activities", amount: activities },
    { label: "Total", amount: totalBudget.value }
  ];
});

const stats = computed(() => [
  { label: "Duration", value: `${dayPlans.value.length} Days`, valueClass: "text-dark", subtext: "4 Nights", subtextClass: "text-muted" },
  { label: "Travelers", value: String(planner.value.travelers), valueClass: "text-dark", subtext: "Couple", subtextClass: "text-muted" },
  { label: "Budget", value: "₹1.5L", valueClass: "text-green", subtext: "Per person", subtextClass: "text-muted" },
  { label: "Est. Cost", value: `₹${formatInr(totalBudget.value)}`, valueClass: "text-orange", subtext: "Under budget", subtextClass: "text-green" },
  { label: "Weather", value: planner.value.weather, valueClass: "text-dark", subtext: "Sunny", subtextClass: "text-muted" },
  { label: "Trip Score", value: planner.value.score, valueClass: "text-purple", subtext: "Excellent", subtextClass: "text-muted" },
  { label: "Dates", value: dayPlans.value[0]?.date || "", valueClass: "text-dark", subtext: `→ ${dayPlans.value[dayPlans.value.length - 1]?.date || ""}`, subtextClass: "text-muted" }
]);

function formatInr(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function applyChipPrompt(chip) {
  chatInput.value = chip;
  sendChatMessage();
}

function applyBudgetDelta(field, delta) {
  if (!(field in budgetBuckets.value)) {
    return;
  }
  budgetBuckets.value[field] = Math.max(0, budgetBuckets.value[field] + delta);
}

function scrollChatToBottom() {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
    }
  });
}

const ITINERARY_SLOTS = [
  { key: "morning", slot: "Morning", time: "8:00 AM", icon: "sun", iconTone: "orange" },
  { key: "afternoon", slot: "Afternoon", time: "1:00 PM", icon: "camera", iconTone: "cyan" },
  { key: "evening", slot: "Evening", time: "7:00 PM", icon: "food", iconTone: "pink" }
];

function buildDateMeta(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return {
    short: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    label: date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  };
}

function deriveTitle(text, fallback) {
  const clean = String(text || "").trim();
  if (!clean) {
    return fallback;
  }
  const firstSentence = clean.split(/[.!?]/)[0];
  const words = firstSentence.split(/\s+/).slice(0, 7).join(" ");
  return words || fallback;
}

function mapPlanToDays(plan, perDayCost) {
  return (plan.itinerary || []).map((dayData, index) => {
    const meta = buildDateMeta(index);
    const items = ITINERARY_SLOTS.map((slot, slotIndex) => {
      const text = dayData[slot.key];
      if (!text) {
        return null;
      }
      const tags = [];
      if (slotIndex === 2 && dayData.foodRecommendation) {
        tags.push({ text: dayData.foodRecommendation.split(/[(,]/)[0].slice(0, 24), highlight: true });
      }
      return {
        id: `d${index + 1}-${slotIndex}`,
        icon: slot.icon,
        iconTone: slot.iconTone,
        timeTone: slot.iconTone,
        slot: slot.slot,
        time: slot.time,
        title: deriveTitle(text, `${slot.slot} plan`),
        description: text,
        duration: "2 hrs",
        cost: Math.round(perDayCost / 3),
        aiPick: slotIndex === 0,
        tags
      };
    }).filter(Boolean);

    return {
      id: `d${index + 1}`,
      day: dayData.day || index + 1,
      date: meta.short,
      dateLabel: meta.label,
      area: dayData.theme || `Day ${index + 1}`,
      theme: dayData.theme || `Day ${index + 1} Plan`,
      cost: perDayCost,
      items
    };
  });
}

function applyLocationData(location) {
  if (!location) {
    return;
  }

  const liveHotels = Array.isArray(location.hotels) ? location.hotels : [];
  if (liveHotels.length) {
    hotels.value = liveHotels.slice(0, 6).map((hotel) => ({
      name: hotel.name,
      area: hotel.address || hotel.distance || "Central area",
      summary: [hotel.tier, hotel.distance].filter(Boolean).join(" • ") || "Recommended stay",
      rating: String(hotel.rating ?? "4.5"),
      nightly: Math.round(Number(hotel.price || 0)) || 6500
    }));
  }

  const liveFood = Array.isArray(location.restaurants) ? location.restaurants : [];
  if (liveFood.length) {
    restaurants.value = liveFood.slice(0, 6).map((restaurant) => ({
      name: restaurant.name,
      type: restaurant.type || "Local cuisine",
      area: restaurant.address || restaurant.distance || "City center",
      rating: String(restaurant.rating ?? "4.4"),
      avgCost: Math.round(Number(restaurant.averagePrice || 0)) || 700
    }));
  }

  const points = [
    ...(location.attractions || []).map((item) => ({ lat: item.lat, lng: item.lng, label: item.name, sublabel: "Attraction", type: "attraction" })),
    ...liveHotels.map((item) => ({ lat: item.lat, lng: item.lng, label: item.name, sublabel: "Stay", type: "hotel" })),
    ...liveFood.map((item) => ({ lat: item.lat, lng: item.lng, label: item.name, sublabel: "Food", type: "food" }))
  ].filter((point) => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)));

  if (points.length) {
    mapPoints.value = points;
  }

  if (location.weather?.temp) {
    planner.value.weather = String(location.weather.temp);
  }
}

function applyBudgetEstimate(budget, fallbackTotal) {
  if (!budget) {
    return;
  }
  budgetBuckets.value = {
    flights: Math.round((Number(budget.flights) || 0) * INR_RATE),
    stay: Math.round((Number(budget.accommodation) || 0) * INR_RATE),
    food: Math.round((Number(budget.food) || 0) * INR_RATE),
    transport: Math.round((Number(budget.transportation) || 0) * INR_RATE),
    activities: Math.round((Number(budget.activities) || 0) * INR_RATE)
  };
  if (!totalBudget.value && fallbackTotal) {
    budgetBuckets.value.activities += Math.round(fallbackTotal);
  }
}

async function generateRealPlan(query) {
  if (isGenerating.value) {
    return;
  }
  isGenerating.value = true;

  const thinkingId = `a-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  chatMessages.value.push({ id: thinkingId, role: "assistant", text: "Generating your itinerary…", thinking: true });
  scrollChatToBottom();

  try {
    const intent = await extractTripIntent(query).catch(() => ({ patch: {} }));
    const patch = intent.patch || {};

    const hasNewDestination = Boolean(patch.destination);
    const destination = patch.destination || planner.value.destination || query;
    const days = patch.days || dayPlans.value.length || 5;
    const travelers = patch.travelers || planner.value.travelers || 2;
    const style = patch.style || "Balanced";
    const travelMode = patch.travelMode || "Flight";
    const budgetLimit = patch.maxBudget || 0;
    const stayPreference = patch.stayPreference || "mid-range";
    const foodPreference = patch.foodPreference || "mixed";
    const effectiveQuery = hasNewDestination ? query : `${destination} trip — ${query}`;

    const planOptions = {
      userQuery: effectiveQuery,
      sourceQuery: query,
      allowFallbackWithoutLive: true,
      stayPreference,
      foodPreference
    };

    const [plan, budget, location] = await Promise.all([
      generateTravelPlan(destination, style, days, travelers, budgetLimit, travelMode, planOptions),
      generateBudgetEstimate(destination, days, travelers, style, travelMode, { ...planOptions, budgetLimit }).catch(() => null),
      getRealLocationData(destination).catch(() => null)
    ]);

    if (!plan || !Array.isArray(plan.itinerary) || plan.itinerary.length === 0) {
      throw new Error("No itinerary returned");
    }

    const resolvedDays = plan.itinerary.length;
    const totalEstimate = budget?.total ? Math.round(budget.total * INR_RATE) : 0;
    const perDayCost = Math.round((totalEstimate || 90000) / Math.max(1, resolvedDays));

    planner.value = {
      ...planner.value,
      destination: plan.destination || destination,
      subtitle: plan.tagline || planner.value.subtitle,
      summary: plan.summary || plan.itinerary.map((day) => day.theme).filter(Boolean).slice(0, 5).join(" → "),
      travelers,
      updatedAt: "just now",
      score: planner.value.score
    };

    dayPlans.value = mapPlanToDays(plan, perDayCost);
    selectedDayId.value = dayPlans.value[0]?.id || "d1";

    applyBudgetEstimate(budget, perDayCost * resolvedDays);
    applyLocationData(location);

    mapSummary.value = {
      route: dayPlans.value.map((day) => day.area).join(" → "),
      distance: `${resolvedDays}-day route across ${planner.value.destination}`,
      transfer: `${travelMode} based travel · ${travelers} traveller(s)`
    };

    if (Array.isArray(plan.tips) && plan.tips.length) {
      aiTips.value = plan.tips.slice(0, 6);
    }

    plannerSession.setActiveContext({
      destination: planner.value.destination,
      origin: patch.origin || "Current Location",
      summary: planner.value.summary,
      style,
      travelMode,
      days: resolvedDays,
      budgetTotal: totalBudget.value,
      suggestions: aiTips.value,
      itineraryPreview: dayPlans.value.slice(0, 3).map((day) => `Day ${day.day}: ${day.theme}`)
    });

    const previewMessage = {
      id: thinkingId,
      role: "assistant",
      text: `Here's your ${resolvedDays}-day ${planner.value.destination} itinerary! ✨`,
      preview: true,
      chips: ["Make it cheaper", "Add more adventure", "Upgrade hotels"],
      cyanChips: true
    };
    const index = chatMessages.value.findIndex((message) => message.id === thinkingId);
    if (index >= 0) {
      chatMessages.value[index] = previewMessage;
    } else {
      chatMessages.value.push(previewMessage);
    }

    activeTab.value = "itinerary";
    hasPlan.value = true;
  } catch (_error) {
    const errorMessage = {
      id: thinkingId,
      role: "assistant",
      text: "Sorry, plan generate karne me dikkat aa gayi. Destination aur days ke saath dobara try karo (e.g. \"Plan a 5 day trip to Manali for 2\")."
    };
    const index = chatMessages.value.findIndex((message) => message.id === thinkingId);
    if (index >= 0) {
      chatMessages.value[index] = errorMessage;
    } else {
      chatMessages.value.push(errorMessage);
    }
  } finally {
    isGenerating.value = false;
    scrollChatToBottom();
  }
}

function sendChatMessage() {
  const text = String(chatInput.value || "").trim();
  if (!text || isGenerating.value) {
    return;
  }
  chatMessages.value.push({ id: `u-${Date.now()}`, role: "user", text });
  chatInput.value = "";
  scrollChatToBottom();
  generateRealPlan(text);
}

function applySuggestion(suggestion) {
  chatInput.value = suggestion.prompt;
  sendChatMessage();
}

function handleEditPlan() {
  activeTab.value = "itinerary";
}

function handleRegeneratePlan() {
  generateRealPlan(`Regenerate a fresh, well-balanced ${planner.value.destination} itinerary`);
}

function handleTabClick(tab) {
  activeTab.value = tab;
}

function handleDaySelect(dayId) {
  selectedDayId.value = dayId;
}

function handleHotelCardClick(hotel) {
  const nights = Math.max(1, dayPlans.value.length - 1);
  const newStay = hotel.nightly * nights;
  budgetBuckets.value.stay = newStay;
  hotels.value = hotels.value.map((entry) => ({ ...entry, selected: entry.name === hotel.name }));
  planner.value.updatedAt = "just now";
}

function handleRestaurantCardClick(restaurant) {
  const day = selectedDay.value;
  const alreadyAdded = day.items.some((item) => item.title === `Dinner at ${restaurant.name}`);
  if (alreadyAdded) {
    return;
  }
  day.items.push({
    id: `${day.id}-meal-${Date.now()}`,
    icon: "food",
    iconTone: "pink",
    timeTone: "pink",
    slot: "Dinner",
    time: "8:00 PM",
    title: `Dinner at ${restaurant.name}`,
    description: `${restaurant.type} dinner experience in ${restaurant.area}.`,
    duration: "1.5 hrs",
    cost: restaurant.avgCost,
    tags: [{ text: restaurant.rating, highlight: true }]
  });
  day.cost += restaurant.avgCost;
  applyBudgetDelta("food", restaurant.avgCost);
  activeTab.value = "itinerary";
  planner.value.updatedAt = "just now";
}

function handleTimelineItemClick() {}

function handleTimelineTagClick() {}

function handleBudgetRowClick() {}

function handleMapCardClick() {}

function handleTipClick(tip) {
  chatInput.value = tip;
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
  if (!sidebarOpen.value) {
    closeSessionMenu();
  }
}

function toggleSessionMenu(sessionId) {
  openMenuId.value = openMenuId.value === sessionId ? null : sessionId;
}

function closeSessionMenu() {
  openMenuId.value = null;
}

function registerRenameInput(sessionId, el) {
  if (el) {
    renameInputs.set(sessionId, el);
  } else {
    renameInputs.delete(sessionId);
  }
}

function startRename(session) {
  renamingId.value = session.id;
  renameText.value = session.title;
  nextTick(() => {
    const input = renameInputs.get(session.id);
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function commitRename(session) {
  if (renamingId.value !== session.id) {
    return;
  }
  const nextTitle = renameText.value.trim();
  const target = chatSessions.value.find((entry) => entry.id === session.id);
  if (target && nextTitle) {
    target.title = nextTitle;
  }
  renamingId.value = null;
  renameText.value = "";
  saveToStorage();
}

function cancelRename() {
  renamingId.value = null;
  renameText.value = "";
}

function archiveSession(session) {
  const target = chatSessions.value.find((entry) => entry.id === session.id);
  if (target) {
    target.archived = true;
  }
  if (session.id === activeSessionId.value) {
    startFreshWorkingState();
  }
  saveToStorage();
}

function unarchiveSession(session) {
  const target = chatSessions.value.find((entry) => entry.id === session.id);
  if (target) {
    target.archived = false;
  }
  if (!archivedSessions.value.length) {
    showArchived.value = false;
  }
  saveToStorage();
}

function deleteSession(session) {
  const wasActive = session.id === activeSessionId.value;
  chatSessions.value = chatSessions.value.filter((entry) => entry.id !== session.id);
  if (wasActive) {
    startFreshWorkingState();
  }
  if (showArchived.value && !archivedSessions.value.length) {
    showArchived.value = false;
  }
  saveToStorage();
}

function toggleArchivedView() {
  showArchived.value = !showArchived.value;
  closeSessionMenu();
}

async function shareSession(session) {
  const shareText = `Wander AI trip plan: ${session.title}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Wander AI", text: shareText });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText);
    }
  } catch {
    // User dismissed the share sheet or clipboard is unavailable; no action needed.
  }
}

function handleSessionAction(action, session) {
  closeSessionMenu();
  switch (action) {
    case "share":
      shareSession(session);
      break;
    case "rename":
      startRename(session);
      break;
    case "archive":
      archiveSession(session);
      break;
    case "unarchive":
      unarchiveSession(session);
      break;
    case "delete":
      deleteSession(session);
      break;
    case "settings":
      router.push("/security");
      break;
    default:
      break;
  }
}

function handleAttach() {}

function handleMic() {}

function snapshotState() {
  return {
    planner: planner.value,
    dayPlans: dayPlans.value,
    hotels: hotels.value,
    restaurants: restaurants.value,
    budgetBuckets: budgetBuckets.value,
    mapSummary: mapSummary.value,
    aiTips: aiTips.value,
    chatMessages: chatMessages.value,
    activeTab: activeTab.value,
    selectedDayId: selectedDayId.value,
    hasPlan: hasPlan.value
  };
}

function restoreState(state) {
  if (!state || typeof state !== "object") {
    return;
  }
  planner.value = state.planner || createEmptyPlanner();
  dayPlans.value = Array.isArray(state.dayPlans) ? state.dayPlans : [];
  hotels.value = Array.isArray(state.hotels) ? state.hotels : [];
  restaurants.value = Array.isArray(state.restaurants) ? state.restaurants : [];
  budgetBuckets.value = state.budgetBuckets || { flights: 0, stay: 0, food: 0, transport: 0, activities: 0 };
  mapSummary.value = state.mapSummary || { route: "", distance: "", transfer: "" };
  aiTips.value = Array.isArray(state.aiTips) ? state.aiTips : [];
  chatMessages.value = Array.isArray(state.chatMessages) && state.chatMessages.length ? state.chatMessages : [createGreetingMessage()];
  activeTab.value = typeof state.activeTab === "string" ? state.activeTab : "itinerary";
  selectedDayId.value = typeof state.selectedDayId === "string" ? state.selectedDayId : "";
  hasPlan.value = Boolean(state.hasPlan);
}

function deriveSessionTitle() {
  if (planner.value.destination) {
    return planner.value.destination;
  }
  const firstUser = chatMessages.value.find((message) => message.role === "user");
  if (firstUser) {
    return firstUser.text.split(/\s+/).slice(0, 6).join(" ");
  }
  return "New chat";
}

function persistActiveSession() {
  if (!activeSessionId.value) {
    return;
  }
  const hasUserMessage = chatMessages.value.some((message) => message.role === "user");
  if (!hasUserMessage && !hasPlan.value) {
    return;
  }
  const snapshot = snapshotState();
  const title = deriveSessionTitle();
  const existing = chatSessions.value.find((session) => session.id === activeSessionId.value);
  if (existing) {
    existing.state = snapshot;
    existing.title = title;
    existing.updatedAt = Date.now();
  } else {
    chatSessions.value.push({ id: activeSessionId.value, title, updatedAt: Date.now(), state: snapshot });
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        chatSessions: chatSessions.value,
        activeSessionId: activeSessionId.value,
        active: snapshotState()
      })
    );
  } catch {
    // Ignore quota or serialization errors and keep the in-memory state.
  }
}

function resetWorkingState() {
  planner.value = createEmptyPlanner();
  dayPlans.value = [];
  hotels.value = [];
  restaurants.value = [];
  budgetBuckets.value = { flights: 0, stay: 0, food: 0, transport: 0, activities: 0 };
  mapSummary.value = { route: "", distance: "", transfer: "" };
  aiTips.value = [];
  chatMessages.value = [createGreetingMessage()];
  selectedDayId.value = "";
  activeTab.value = "itinerary";
  hasPlan.value = false;
}

function startNewChat() {
  persistActiveSession();
  activeSessionId.value = genId("session");
  resetWorkingState();
  scrollChatToBottom();
}

// Resets the working view to a blank chat WITHOUT persisting the current
// session first. Used after deleting/archiving the active chat so it is not
// re-saved back into the sidebar history.
function startFreshWorkingState() {
  activeSessionId.value = genId("session");
  resetWorkingState();
  scrollChatToBottom();
}

function openChat(sessionId) {
  if (sessionId === activeSessionId.value) {
    return;
  }
  persistActiveSession();
  const session = chatSessions.value.find((entry) => entry.id === sessionId);
  if (!session) {
    return;
  }
  activeSessionId.value = sessionId;
  restoreState(session.state);
  scrollChatToBottom();
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") {
      return;
    }
    if (Array.isArray(saved.chatSessions)) {
      chatSessions.value = saved.chatSessions;
    }
    const activeHasUser = Array.isArray(saved.active?.chatMessages) && saved.active.chatMessages.some((message) => message.role === "user");
    if (saved.active && (activeHasUser || saved.active.hasPlan)) {
      restoreState(saved.active);
      activeSessionId.value = saved.activeSessionId || genId("session");
    }
  } catch {
    // Ignore malformed local state and continue with a fresh new-chat view.
  }
});

watch(
  [planner, dayPlans, hotels, restaurants, budgetBuckets, mapSummary, aiTips, chatMessages, activeTab, selectedDayId, hasPlan],
  () => {
    persistActiveSession();
    saveToStorage();
  },
  { deep: true }
);
</script>

<style scoped src="./styles/Planner.css"></style>

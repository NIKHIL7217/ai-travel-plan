<template>
  <div class="planner-layout">
    <div class="main-workspace">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="ai-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          </div>
          <div class="ai-title">
            <strong>AI Travel Planner</strong>
            <span class="status"><span class="dot"></span> Active</span>
          </div>
          <button class="more-options">⋮</button>
        </div>

        <div class="chat-container">
          <!-- AI Message 1 -->
          <div class="ai-message">
            <div class="ai-avatar">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            </div>
            <div class="ai-content">
              <p>Hello! I'm your AI travel planner. Tell me about your dream trip and I'll create a complete itinerary for you. ✨</p>
              <div class="chip-group">
                <span class="chip">🏖️ Beach getaway</span>
                <span class="chip">🏕️ Adventure trip</span>
                <span class="chip">💒 Honeymoon</span>
                <span class="chip">👨‍👩‍👧‍👦 Family vacation</span>
              </div>
            </div>
          </div>

          <!-- User Message 1 -->
          <div class="user-message">
            <div class="user-content">
              Plan a 5-day trip to Bali for 2 people under ₹1,50,000. Mix of adventure and relaxation.
            </div>
          </div>

          <!-- AI Message 2 -->
          <div class="ai-message">
            <div class="ai-avatar">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            </div>
            <div class="ai-content">
              <p>I've crafted a perfect 5-day Bali itinerary! Here's what I've planned:</p>
              
              <div class="itin-preview">
                <div class="itin-title">
                  <span>🌴</span> Bali, Indonesia <span class="days">• 5 Days</span>
                </div>
                <div class="itin-badges">
                  <span class="badge badge-green">₹1,42,500</span>
                  <span class="badge badge-orange">2 Travelers</span>
                </div>
                <div class="itin-desc">
                  Ubud temples → Rice terraces → Water sports → Beach sunset → Spa day
                </div>
              </div>

              <p>Your complete itinerary is ready in the workspace. Want me to adjust anything?</p>
              <div class="chip-group">
                <span class="chip cyan">Make it cheaper</span>
                <span class="chip cyan">Add more adventure</span>
                <span class="chip cyan">Upgrade hotels</span>
              </div>
            </div>
          </div>

          <!-- User Message 2 -->
          <div class="user-message">
            <div class="user-content">
              Can you add a sunrise trek on Day 3
            </div>
          </div>
        </div>

        <div class="chat-input-area">
          <div class="input-wrapper">
            <svg class="icon-attach" viewBox="0 0 24 24" width="20" height="20" fill="#94a3b8"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-3.31-2.69-6-6-6S3 1.69 3 5v12.5c0 3.31 2.69 6 6 6s6-2.69 6-6V6h-1.5z"/></svg>
            <input type="text" placeholder="Ask me to plan, modify, or optimize your trip...">
            <svg class="icon-mic" viewBox="0 0 24 24" width="20" height="20" fill="#94a3b8"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6.3 6.92V22h1.4v-4.08A7 7 0 0 0 19 11h-2z"/></svg>
            <button class="btn-send"><svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg></button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="content-area">
        <div class="hero-header">
          <div class="hero-bg"></div>
          <div class="hero-content">
            <div class="hero-top">
              <div>
                <div class="badge-row">
                  <span class="badge-ai">AI GENERATED</span>
                  <span class="updated-time">• Updated 2 min ago</span>
                </div>
                <h1>Bali, Indonesia</h1>
                <p class="subtitle">A perfect blend of adventure, culture, and tropical relaxation</p>
              </div>
              <div class="hero-actions">
                <button class="btn btn-outline-light">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  Edit
                </button>
                <button class="btn btn-outline-light">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                  Regenerate
                </button>
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

        <div class="main-tabs-container">
          <div class="main-tabs">
            <button class="tab-btn active">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
              Itinerary
            </button>
            <button class="tab-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/></svg>
              Hotels
            </button>
            <button class="tab-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>
              Restaurants
            </button>
            <button class="tab-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
              Budget
            </button>
            <button class="tab-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              Map
            </button>
            <button class="tab-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/></svg>
              AI Tips
            </button>
          </div>

          <div class="day-tabs">
            <div class="day-tab active">
              <strong>Day 1</strong> <span>Mar 15</span>
            </div>
            <div class="day-tab">
              <strong>Day 2</strong> <span>Mar 16</span>
            </div>
            <div class="day-tab">
              <strong>Day 3</strong> <span>Mar 17</span>
            </div>
            <div class="day-tab">
              <strong>Day 4</strong> <span>Mar 18</span>
            </div>
            <div class="day-tab">
              <strong>Day 5</strong> <span>Mar 19</span>
            </div>
          </div>

          <div class="timeline-section">
            <div class="timeline-header">
              <div>
                <h2>Day 1 — Arrival & Ubud Exploration</h2>
                <p>Saturday, March 15, 2025 • Ubud Area</p>
              </div>
              <div class="day-cost">
                Day cost: <strong>₹28,500</strong>
              </div>
            </div>

            <div class="timeline-list">
              <!-- Timeline Card 1 -->
              <div class="timeline-card">
                <div class="timeline-line"></div>
                <div class="t-icon-box orange">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                </div>
                <div class="t-content">
                  <div class="t-time orange">Morning • 6:00 AM</div>
                  <h3>Arrive at Ngurah Rai Airport</h3>
                  <p>Private transfer to Ubud hotel. Enjoy the scenic drive through rice paddies and traditional villages.</p>
                  <div class="t-tags">
                    <span class="t-tag"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-13h2v6l4.2 2.1-1 1.7L11 13V7z"/></svg> 1.5 hrs</span>
                    <span class="t-tag"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.66 7C13.1 5.82 11.9 5 10.5 5H6V3h12v2h-3.26c.48.58.84 1.25 1.05 2H18v2h-2.12c-.36 2.45-2.22 4.41-4.63 4.96L17.5 21H15l-5.66-6.59H6v-2h4.5c1.47 0 2.76-.92 3.27-2.27H6V9h7.77c-.12-.4-.28-.78-.47-1.14L13.66 7z"/></svg> 2,500</span>
                    <span class="t-tag"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg> 45 min drive</span>
                  </div>
                </div>
              </div>

              <!-- Timeline Card 2 -->
              <div class="timeline-card">
                <div class="timeline-line"></div>
                <div class="t-icon-box pink">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>
                </div>
                <div class="t-content">
                  <div class="t-time pink">
                    Breakfast • 8:30 AM
                    <span class="ai-pick">AI Pick</span>
                  </div>
                  <h3>Breakfast at Sari Organik</h3>
                  <p>Farm-to-table organic breakfast with panoramic rice terrace views. Try the Nasi Goreng.</p>
                  <div class="t-tags">
                    <span class="t-tag"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-13h2v6l4.2 2.1-1 1.7L11 13V7z"/></svg> 1 hr</span>
                    <span class="t-tag"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.66 7C13.1 5.82 11.9 5 10.5 5H6V3h12v2h-3.26c.48.58.84 1.25 1.05 2H18v2h-2.12c-.36 2.45-2.22 4.41-4.63 4.96L17.5 21H15l-5.66-6.59H6v-2h4.5c1.47 0 2.76-.92 3.27-2.27H6V9h7.77c-.12-.4-.28-.78-.47-1.14L13.66 7z"/></svg> 800</span>
                    <span class="t-tag highlight"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> 4.7</span>
                    <span class="t-tag"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/></svg> 7AM–3PM</span>
                  </div>
                </div>
              </div>

              <!-- Timeline Card 3 -->
              <div class="timeline-card">
                <div class="t-icon-box cyan">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                </div>
                <div class="t-content">
                  <div class="t-time cyan">Sightseeing • 10:00 AM</div>
                  <h3>Tegallalang Rice Terraces</h3>
                  <p>Explore the iconic UNESCO-listed rice terraces. Walk through the jungle swing and take stunning photos.</p>
                  <div class="t-tags">
                    <span class="t-tag"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-13h2v6l4.2 2.1-1 1.7L11 13V7z"/></svg> 2.5 hrs</span>
                    <span class="t-tag"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.66 7C13.1 5.82 11.9 5 10.5 5H6V3h12v2h-3.26c.48.58.84 1.25 1.05 2H18v2h-2.12c-.36 2.45-2.22 4.41-4.63 4.96L17.5 21H15l-5.66-6.59H6v-2h4.5c1.47 0 2.76-.92 3.27-2.27H6V9h7.77c-.12-.4-.28-.78-.47-1.14L13.66 7z"/></svg> 1,200</span>
                    <span class="t-tag"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg> 20 min</span>
                    <span class="t-tag"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/></svg> 8AM–6PM</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const stats = ref([
  { label: 'Duration', value: '5 Days', valueClass: 'text-dark', subtext: '4 Nights', subtextClass: 'text-muted' },
  { label: 'Travelers', value: '2', valueClass: 'text-dark', subtext: 'Couple', subtextClass: 'text-muted' },
  { label: 'Budget', value: '₹1.5L', valueClass: 'text-green', subtext: 'Per person', subtextClass: 'text-muted' },
  { label: 'Est. Cost', value: '₹1.45L', valueClass: 'text-orange', subtext: 'Under budget', subtextClass: 'text-green' },
  { label: 'Weather', value: '28°C', valueClass: 'text-dark', subtext: 'Sunny', subtextClass: 'text-muted' },
  { label: 'Trip Score', value: '9.2', valueClass: 'text-purple', subtext: 'Excellent', subtextClass: 'text-muted' },
  { label: 'Dates', value: 'Mar 15', valueClass: 'text-dark', subtext: '→ Mar 19', subtextClass: 'text-muted' },
])
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Inter', sans-serif;
}

body {
  background-color: #f8fafc;
  color: #1e293b;
}

.planner-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: #f8fafc;
}

/* TOP NAV */
.top-nav {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}

.nav-left, .nav-right {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  margin-right: 40px;
}

.logo-icon-bg {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.logo-title {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.nav-links {
  display: flex;
  gap: 8px;
}

.nav-links a {
  text-decoration: none;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 999px;
  transition: all 0.2s;
}

.nav-links a:hover {
  background: #f1f5f9;
}

.nav-links a.active {
  background: #eef2ff;
  color: #4f46e5;
  font-weight: 600;
}

.btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-outline {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.btn-primary {
  background: #4f46e5;
  color: #ffffff;
}

.btn-outline-light {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.nav-right .btn {
  margin-right: 16px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

/* MAIN WORKSPACE */
.main-workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* SIDEBAR */
.sidebar {
  width: 380px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  padding: 0 20px;
  flex-shrink: 0;
}

.ai-icon {
  width: 36px;
  height: 36px;
  background: #eef2ff;
  color: #4f46e5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.ai-title {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ai-title strong {
  font-size: 14px;
  color: #1e293b;
}

.ai-title .status {
  font-size: 12px;
  color: #10b981;
  display: flex;
  align-items: center;
  font-weight: 500;
  margin-top: 2px;
}

.dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  margin-right: 6px;
}

.more-options {
  background: none;
  border: none;
  font-size: 20px;
  color: #94a3b8;
  cursor: pointer;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chat-container::-webkit-scrollbar {
  display: none;
}

/* AI Message */
.ai-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.ai-avatar {
  width: 28px;
  height: 28px;
  background: #6366f1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  margin-top: 4px;
}

.ai-content {
  background: #ffffff;
  padding: 16px;
  border-radius: 16px;
  border-top-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  max-width: 85%;
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
  border: 1px solid #f1f5f9;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.chip {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #e0e7ff;
  color: #4f46e5;
  cursor: pointer;
}

.chip.cyan {
  border-color: #cffafe;
  color: #0891b2;
}

.chip:hover {
  background: #f8fafc;
}

/* User Message */
.user-message {
  display: flex;
  justify-content: flex-end;
}

.user-content {
  background: #6366f1;
  color: #ffffff;
  padding: 12px 16px;
  border-radius: 16px;
  border-top-right-radius: 4px;
  max-width: 85%;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 2px 8px rgba(99,102,241,0.2);
}

/* Itinerary Preview Card */
.itin-preview {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  margin-top: 12px;
  margin-bottom: 12px;
}

.itin-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
}

.itin-title span.days {
  color: #64748b;
  font-weight: 400;
  font-size: 12px;
}

.itin-badges {
  display: flex;
  gap: 8px;
  margin: 10px 0;
}

.badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.badge-green {
  background: #ecfdf5;
  color: #059669;
}

.badge-orange {
  background: #fff7ed;
  color: #ea580c;
}

.itin-desc {
  font-size: 12px;
  color: #64748b;
}

/* Chat Input */
.chat-input-area {
  padding: 20px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  width: 100%;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 12px 90px 12px 40px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.input-wrapper input:focus {
  border-color: #6366f1;
}

.icon-attach {
  position: absolute;
  left: 12px;
  cursor: pointer;
}

.icon-mic {
  position: absolute;
  right: 48px;
  cursor: pointer;
}

.btn-send {
  position: absolute;
  right: 8px;
  width: 32px;
  height: 32px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* MAIN CONTENT */
.content-area {
  flex: 1;
  overflow-y: auto;
  background: #f8fafc;
  position: relative;
}

.content-area::-webkit-scrollbar {
  display: none;
}

.hero-header {
  position: relative;
  padding: 40px 40px 20px 40px;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(248, 250, 252, 0.4), #f8fafc 90%), url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1600&q=80') center/cover;
  opacity: 0.6;
  z-index: 0;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.badge-ai {
  background: #6366f1;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.updated-time {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.hero-top h1 {
  font-size: 36px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 15px;
  color: #475569;
}

.hero-actions {
  display: flex;
  gap: 12px;
}

.stats-row {
  display: flex;
  gap: 12px;
  margin-top: 32px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.stats-row::-webkit-scrollbar {
  display: none;
}

.stat-card {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  padding: 16px;
  min-width: 120px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 4px;
}

.stat-subtext {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.text-green { color: #10b981; }
.text-orange { color: #d97706; }
.text-purple { color: #6366f1; }
.text-dark { color: #0f172a; }
.text-muted { color: #94a3b8; }

.main-tabs-container {
  padding: 0 40px;
}

.main-tabs {
  display: flex;
  align-items: center;
  gap: 24px;
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 0;
}

.tab-btn {
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
}

.tab-btn.active {
  background: #6366f1;
  color: white;
  border-radius: 999px;
  padding: 8px 20px;
}

.tab-btn.active svg {
  fill: white;
}

.tab-btn svg {
  fill: #94a3b8;
}

.day-tabs {
  display: flex;
  gap: 12px;
  padding: 24px 0;
}

.day-tab {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 10px 24px;
  border-radius: 999px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.day-tab strong {
  color: #334155;
}

.day-tab span {
  color: #94a3b8;
}

.day-tab.active {
  background: #6366f1;
  border-color: #6366f1;
}

.day-tab.active strong, .day-tab.active span {
  color: #ffffff;
}

.day-tab.active span {
  opacity: 0.8;
}

.timeline-section {
  max-width: 800px;
  padding-bottom: 60px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}

.timeline-header h2 {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 6px;
}

.timeline-header p {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.day-cost {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.day-cost strong {
  font-size: 16px;
  color: #10b981;
  font-weight: 800;
}

/* Timeline Cards */
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
}

.timeline-card {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 20px;
  padding: 24px;
  display: flex;
  gap: 24px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.02);
  position: relative;
  z-index: 1;
}

.t-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 2;
  background-color: white; /* to cover line */
}

.t-icon-box.orange { background: #fff7ed; color: #ea580c; }
.t-icon-box.pink { background: #fdf2f8; color: #db2777; }
.t-icon-box.cyan { background: #ecfeff; color: #0891b2; }

.t-content {
  flex: 1;
}

.t-time {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.t-time.orange { color: #ea580c; }
.t-time.pink { color: #db2777; }
.t-time.cyan { color: #0891b2; }

.ai-pick {
  background: #6366f1;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0;
}

.t-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.t-content p {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  margin-bottom: 16px;
}

.t-tags {
  display: flex;
  align-items: center;
  gap: 20px;
}

.t-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.t-tag.highlight {
  color: #d97706;
  font-weight: 700;
}

/* Connecting line */
.timeline-line {
  position: absolute;
  left: 47px; /* 24px padding + 23px half icon box (approx) */
  top: 72px; /* 24px padding + 48px icon box */
  bottom: -24px; /* to bridge gap */
  width: 2px;
  background: #e2e8f0;
  z-index: 0;
}
</style>

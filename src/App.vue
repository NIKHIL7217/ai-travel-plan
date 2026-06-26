<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterView, RouterLink, useRoute, useRouter } from "vue-router";
import { initUserCurrency } from "./services/currency";
import { useAuthStore } from "./stores/auth";
import { useOfflineStore } from "./stores/offline";
import { detectUserLocation, userLocation } from "./services/location";
import TravelCopilotWidget from "./features/copilot/TravelCopilotWidget.vue";

const NAVBAR_HEIGHT = 78;
const HERO_EXIT_OFFSET = 28;

const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const route = useRoute();
const router = useRouter();
const profileMenuOpen = ref(false);
const profileWrapRef = ref(null);
const geoLoading = ref(true);
const isHeroNavbarTransparent = ref(false);
const currentYear = new Date().getFullYear();

const profileName = computed(() => authStore.displayName);
const mobileProfilePath = computed(() => (authStore.isAuthenticated ? "/profile" : "/login"));
const isAdminUser = computed(() => {
  const email = String(authStore.user?.email || "").toLowerCase();
  return email.includes("admin") || email.endsWith("@wanderai.local");
});
const geoLabel = computed(() => {
  if (geoLoading.value) return "Detecting";
  if (!userLocation.value?.loaded) return "Unknown";
  return userLocation.value.city || userLocation.value.country || "Unknown";
});
const geoTitle = computed(() => {
  if (geoLoading.value) return "Detecting geolocation";
  if (!userLocation.value?.loaded) return "Geolocation unavailable";
  return `Geolocation active: ${geoLabel.value}`;
});
const offlineLabel = computed(() => (offlineStore.isOnline ? "Online Sync" : "Offline Mode"));
const offlineTitle = computed(() => {
  const pending = Number(offlineStore.pendingCount || 0);
  if (offlineStore.isOnline) {
    return pending > 0 ? `${pending} offline draft(s) pending sync` : "All offline drafts synced";
  }

  return pending > 0
    ? `${pending} draft(s) queued while offline`
    : "Offline mode active";
});

  const isExploreRoute = computed(() => route.path === "/");

const toggleProfileMenu = () => {
  profileMenuOpen.value = !profileMenuOpen.value;
};

const closeProfileMenu = () => {
  profileMenuOpen.value = false;
};

const handleClickOutsideProfileMenu = (event) => {
  if (!profileMenuOpen.value) {
    return;
  }

  const host = profileWrapRef.value;
  if (!host) {
    return;
  }

  if (event.target instanceof Node && !host.contains(event.target)) {
    closeProfileMenu();
  }
};

const handleEscapeForProfileMenu = (event) => {
  if (event.key === "Escape") {
    closeProfileMenu();
  }
};

const handleLogout = async () => {
  await authStore.logout();
  closeProfileMenu();

  if (route.meta?.requiresAuth) {
    router.push("/");
  }
};

const getHeroBottomOffset = () => {
  if (!isExploreRoute.value) {
    return null;
  }

  const heroSection = document.querySelector(".wander-home .hero");
  if (!(heroSection instanceof HTMLElement)) {
    return null;
  }

  const rect = heroSection.getBoundingClientRect();
  return window.scrollY + rect.top + rect.height;
};

const syncNavbarVisualState = () => {
  if (!isExploreRoute.value) {
    isHeroNavbarTransparent.value = false;
    return;
  }

  const heroBottom = getHeroBottomOffset();
  if (!heroBottom) {
    isHeroNavbarTransparent.value = window.scrollY < NAVBAR_HEIGHT;
    return;
  }

  const darkTriggerPoint = Math.max(0, heroBottom - NAVBAR_HEIGHT - HERO_EXIT_OFFSET);
  isHeroNavbarTransparent.value = window.scrollY < darkTriggerPoint;
};

const handleWindowScroll = () => {
  syncNavbarVisualState();
};

const handleWindowResize = () => {
  syncNavbarVisualState();
};

watch(
  () => route.fullPath,
  async () => {
    closeProfileMenu();
    await nextTick();
    syncNavbarVisualState();
    window.requestAnimationFrame(syncNavbarVisualState);
  }
);

watch(
  () => authStore.user?.uid,
  (nextUserId) => {
    offlineStore.initForUser(nextUserId || "guest");
  },
  { immediate: true }
);

onMounted(() => {
  document.addEventListener("pointerdown", handleClickOutsideProfileMenu);
  document.addEventListener("keydown", handleEscapeForProfileMenu);
  window.addEventListener("scroll", handleWindowScroll, { passive: true });
  window.addEventListener("resize", handleWindowResize);

  detectUserLocation()
    .then(() => initUserCurrency(userLocation.value))
    .finally(() => {
      geoLoading.value = false;
    });
  authStore.initAuth();
  offlineStore.initForUser(authStore.user?.uid || "guest");

  nextTick(() => {
    syncNavbarVisualState();
  });
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleClickOutsideProfileMenu);
  document.removeEventListener("keydown", handleEscapeForProfileMenu);
  window.removeEventListener("scroll", handleWindowScroll);
  window.removeEventListener("resize", handleWindowResize);
});
</script>

<template>
  <div class="app-shell pb-24">
    <!-- Section 1: Sticky Glass Navbar -->
    <header class="navbar-header glass-navbar" :class="{ 'hero-transparent': isHeroNavbarTransparent }">
      <div class="container nav-content">
        <!-- Logo -->
        <RouterLink to="/" class="brand-logo">
          <span class="logo-circle">🗺️</span>
          <span class="logo-txt">Wander<span class="logo-blue">AI</span></span>
        </RouterLink>

        <!-- Desktop Navigation Menu -->
        <nav class="nav-links-desktop">
          <RouterLink to="/" class="nav-link" active-class="active">Explore</RouterLink>
          <RouterLink to="/planner" class="nav-link" active-class="active">Planner</RouterLink>
          <RouterLink v-if="authStore.isAuthenticated" to="/trips" class="nav-link" active-class="active">Trips</RouterLink>
          <RouterLink v-if="authStore.isAuthenticated" to="/community" class="nav-link" active-class="active">Community</RouterLink>
          <RouterLink v-if="authStore.isAuthenticated" to="/profile" class="nav-link" active-class="active">Profile</RouterLink>
          <RouterLink v-else to="/login" class="nav-link" active-class="active">Profile</RouterLink>
        </nav>

        <div class="nav-right-cluster">
          <div class="geo-indicator" :title="geoTitle">
            <span class="geo-icon">📡</span>
            <span class="geo-text">{{ geoLabel }}</span>
          </div>

          <div class="offline-indicator" :class="{ offline: !offlineStore.isOnline }" :title="offlineTitle">
            <span class="offline-dot"></span>
            <span class="offline-text">{{ offlineLabel }}</span>
          </div>

          <!-- Profile Avatar -->
          <div ref="profileWrapRef" class="nav-profile-wrap">
            <button
              type="button"
              class="profile-avatar-circle"
              :title="authStore.isAuthenticated ? `${profileName} (Profile)` : 'Login / Signup'"
              @click="toggleProfileMenu"
            >
              <span class="avatar-txt">{{ authStore.userInitials }}</span>
            </button>

            <transition name="fade-route">
              <div v-if="profileMenuOpen" class="profile-menu">
                <p class="profile-menu-name">{{ profileName }}</p>
                <p class="profile-menu-email">{{ authStore.user?.email || 'Login to personalize your travel profile' }}</p>

                <div class="profile-actions" @click="closeProfileMenu">
                  <RouterLink v-if="authStore.isAuthenticated" to="/profile" class="profile-action-link">
                    Open Profile
                  </RouterLink>
                  <RouterLink v-if="authStore.isAuthenticated" to="/trips" class="profile-action-link">
                    Trips Hub
                  </RouterLink>
                  <RouterLink
                    v-if="authStore.isAuthenticated"
                    to="/group-trips"
                    class="profile-action-link"
                  >
                    Group Planning
                  </RouterLink>
                  <RouterLink v-if="authStore.isAuthenticated" to="/destination" class="profile-action-link">
                    Destination Guides
                  </RouterLink>
                  <RouterLink
                    v-if="authStore.isAuthenticated"
                    to="/community"
                    class="profile-action-link"
                  >
                    Community Feed
                  </RouterLink>
                  <RouterLink to="/roadtrips" class="profile-action-link">
                    Roadtrip Mode
                  </RouterLink>
                  <RouterLink to="/help" class="profile-action-link">
                    Help Center
                  </RouterLink>
                  <RouterLink v-if="authStore.isAuthenticated && isAdminUser" to="/admin" class="profile-action-link">
                    Admin Console
                  </RouterLink>
                  <RouterLink
                    v-if="!authStore.isAuthenticated"
                    to="/login"
                    class="profile-action-link"
                  >
                    Login / Signup
                  </RouterLink>
                  <button
                    v-if="authStore.isAuthenticated"
                    type="button"
                    class="profile-action-link logout"
                    @click="handleLogout"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </header>

    <!-- Main View Section -->
    <main class="app-main-viewport">
      <RouterView v-slot="{ Component }">
        <Suspense timeout="0">
          <template #default>
            <transition name="fade-route" mode="out-in">
              <component :is="Component" />
            </transition>
          </template>
          <template #fallback>
            <section class="route-skeleton container" aria-live="polite">
              <div class="skeleton-line skeleton-wide"></div>
              <div class="skeleton-grid">
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
              </div>
            </section>
          </template>
        </Suspense>
      </RouterView>
    </main>

    <!-- Footer -->
    <footer v-if="!route.meta?.hideFooter" class="app-footer">
      <div class="container footer-content">
        <div class="footer-brand">
          <span class="brand-name">WanderAI</span>
          <p class="brand-desc">From inspiration to itinerary in one flow. Explore, plan, and relive journeys with AI-crafted travel experiences.</p>
        </div>

        <div class="footer-links-grid">
          <div class="links-column">
            <h4>Journey</h4>
            <RouterLink to="/">Explore</RouterLink>
            <RouterLink to="/planner">Planner</RouterLink>
            <RouterLink v-if="authStore.isAuthenticated" to="/trips">Trips</RouterLink>
            <RouterLink v-if="authStore.isAuthenticated" to="/community">Community</RouterLink>
            <RouterLink v-if="authStore.isAuthenticated" to="/profile">Profile</RouterLink>
            <RouterLink to="/destination">Destination Guides</RouterLink>
            <RouterLink to="/roadtrips">Roadtrip Mode</RouterLink>
            <RouterLink to="/group-trips">Group Planning</RouterLink>
          </div>
          <div class="links-column">
            <h4>Account</h4>
            <RouterLink v-if="authStore.isAuthenticated" to="/profile?section=vault">Document Vault</RouterLink>
            <RouterLink v-if="authStore.isAuthenticated && isAdminUser" to="/admin">Admin Console</RouterLink>
            <RouterLink v-if="!authStore.isAuthenticated" to="/login">Login / Signup</RouterLink>
          </div>
          <div class="links-column">
            <h4>Support</h4>
            <RouterLink to="/help">Help Center</RouterLink>
          </div>
        </div>
      </div>
      
      <div class="container footer-bottom">
        <p class="copyright">&copy; {{ currentYear }} AI Travel Planner. All rights reserved.</p>
      </div>
    </footer>

    <TravelCopilotWidget />

    <!-- Section 10: Mobile Bottom Navigation -->
    <nav class="mobile-bottom-navbar glass-navbar">
      <RouterLink to="/" class="mobile-nav-link" active-class="active">
        <span class="mob-icon">🌍</span>
        <span class="mob-lbl">Explore</span>
      </RouterLink>
      <RouterLink to="/planner" class="mobile-nav-link" active-class="active">
        <span class="mob-icon">🧠</span>
        <span class="mob-lbl">Planner</span>
      </RouterLink>
      <RouterLink to="/trips" class="mobile-nav-link" active-class="active">
        <span class="mob-icon">🧳</span>
        <span class="mob-lbl">Trips</span>
      </RouterLink>
      <RouterLink to="/community" class="mobile-nav-link" active-class="active">
        <span class="mob-icon">🗣️</span>
        <span class="mob-lbl">Community</span>
      </RouterLink>
      <RouterLink :to="mobileProfilePath" class="mobile-nav-link" active-class="active">
        <span class="mob-avatar">{{ authStore.userInitials }}</span>
        <span class="mob-lbl">Profile</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style>
/* Viewport and Shell */
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-bg);
}

.app-main-viewport {
  flex-grow: 1;
}

.route-skeleton {
  padding-top: 104px;
  padding-bottom: 28px;
}

.skeleton-line {
  height: 18px;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%);
  background-size: 240% 100%;
  animation: skeleton-pulse 1.2s linear infinite;
}

.skeleton-wide {
  width: min(580px, 92%);
  margin-bottom: 14px;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.skeleton-card {
  height: 140px;
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%);
  background-size: 240% 100%;
  animation: skeleton-pulse 1.2s linear infinite;
}

@keyframes skeleton-pulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 900px) {
  .skeleton-grid {
    grid-template-columns: 1fr;
  }
}

/* Navbar styles */
.navbar-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 78px;
  z-index: 1000;
  display: flex;
  align-items: center;
  transition: background 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease, -webkit-backdrop-filter 0.28s ease, backdrop-filter 0.28s ease;
}

.navbar-header .container {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0 20px;
}

.navbar-header.hero-transparent {
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.22), rgba(2, 6, 23, 0.04));
  border-bottom-color: transparent;
  box-shadow: none;
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}

.navbar-header.hero-transparent .brand-logo {
  color: #f8fafc;
}

.navbar-header.hero-transparent .logo-blue {
  color: #7dd3fc;
}

.navbar-header.hero-transparent .nav-link {
  color: rgba(248, 250, 252, 0.9);
}

.navbar-header.hero-transparent .nav-link:hover,
.navbar-header.hero-transparent .nav-link.active {
  color: #ffffff;
}

.navbar-header.hero-transparent .nav-link::after {
  background-color: rgba(226, 232, 240, 0.95);
}

.navbar-header.hero-transparent .geo-indicator {
  border-color: rgba(226, 232, 240, 0.36);
  background: rgba(2, 6, 23, 0.44);
  color: #e2e8f0;
}

.navbar-header.hero-transparent .offline-indicator {
  border-color: rgba(110, 231, 183, 0.34);
  background: rgba(6, 78, 59, 0.4);
  color: #d1fae5;
}

.navbar-header.hero-transparent .offline-indicator.offline {
  border-color: rgba(252, 165, 165, 0.42);
  background: rgba(127, 29, 29, 0.46);
  color: #fee2e2;
}

.navbar-header.hero-transparent .profile-avatar-circle {
  border-color: rgba(255, 255, 255, 0.86);
  box-shadow: 0 8px 22px rgba(2, 6, 23, 0.42);
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-heading);
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.5px;
}

.logo-circle {
  font-size: 1.45rem;
}

.logo-blue {
  color: var(--color-primary);
}

.nav-links-desktop {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-right-cluster {
  display: flex;
  align-items: center;
  gap: 14px;
}

.geo-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: #ffffff;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
}

.geo-icon {
  font-size: 0.82rem;
}

.geo-text {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.offline-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(5, 150, 105, 0.25);
  background: rgba(209, 250, 229, 0.52);
  color: #047857;
  font-size: 0.74rem;
  font-weight: 700;
}

.offline-indicator.offline {
  border-color: rgba(220, 38, 38, 0.25);
  background: rgba(254, 226, 226, 0.72);
  color: #b91c1c;
}

.offline-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: currentColor;
}

.offline-text {
  white-space: nowrap;
}

.nav-link {
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  padding: 8px 0;
  position: relative;
  transition: color var(--transition-fast);
}

.nav-link:hover {
  color: var(--color-primary);
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2.5px;
  background-color: var(--color-primary);
  transition: all var(--transition-fast);
  transform: translateX(-50%);
  border-radius: var(--radius-full);
}

.nav-link.active {
  color: var(--color-primary);
}

.nav-link.active::after {
  width: 24px;
}

/* Avatar circle */
.nav-profile-wrap {
  position: relative;
  display: flex;
  align-items: center;
  isolation: isolate;
}

.profile-avatar-circle {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.15);
  cursor: pointer;
  border: 2px solid white;
  border-color: #ffffff;
  outline: none;
}

.avatar-txt {
  color: white;
  font-size: 0.82rem;
  font-weight: 800;
}

.nav-profile-wrap .profile-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  left: auto;
  width: min(312px, calc(100vw - 24px));
  max-height: min(72vh, calc(100vh - 120px));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.84));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  box-shadow: var(--shadow-xl);
  z-index: 1300;
}

.nav-profile-wrap .profile-menu:hover {
  transform: none;
  border-color: var(--color-border);
  box-shadow: var(--shadow-xl);
}

.profile-menu-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
}

.profile-menu-email {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  line-break: anywhere;
}

.profile-actions {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.profile-action-link {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
  background: #ffffff;
  text-align: left;
}

.profile-action-link:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.profile-action-link.logout {
  cursor: pointer;
}

/* Footer styles */
.app-footer {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(248, 250, 252, 0.88));
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  padding: 52px 0 28px;
  margin-top: 36px;
}

.footer-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 44px;
  margin-bottom: 28px;
}

@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    gap: 32px;
  }
}

.footer-brand {
  max-width: 360px;
}

.brand-name {
  font-family: var(--font-heading);
  font-size: 1.12rem;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 8px;
  display: block;
}

.brand-desc {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  opacity: 0.9;
}

.footer-links-grid {
  display: flex;
  gap: 44px;
}

@media (max-width: 480px) {
  .footer-links-grid {
    gap: 30px;
    justify-content: space-between;
    width: 100%;
  }
}

.links-column {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.links-column h4 {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 3px;
}

.links-column a {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  opacity: 0.9;
}

.links-column a:hover {
  color: var(--color-primary);
}

.footer-bottom {
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
  text-align: center;
}

.copyright {
  font-size: 0.74rem;
  color: var(--color-text-muted);
  opacity: 0.85;
}

/* Section 10: Mobile Bottom Navigation */
.mobile-bottom-navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 74px;
  z-index: 1000;
  display: none;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  justify-items: center;
  border-top: 1px solid rgba(148, 163, 184, 0.3);
  padding-bottom: 8px;
}

@media (max-width: 768px) {
  .mobile-bottom-navbar {
    display: grid;
  }
  .nav-links-desktop {
    display: none;
  }
  .nav-profile-wrap {
    display: none;
  }
  .geo-indicator {
    padding: 6px 8px;
  }
  .geo-text {
    max-width: 64px;
  }
  .offline-indicator {
    display: none;
  }
}

.mobile-nav-link, .profile-link-mock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.mob-icon {
  font-size: 1.06rem;
}

.mob-lbl {
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.mobile-nav-link.active {
  color: var(--color-primary);
}

.mob-avatar {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  font-size: 0.55rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Route transitions fade */
.fade-route-enter-active,
.fade-route-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-route-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-route-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

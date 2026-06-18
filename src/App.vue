<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { RouterView, RouterLink, useRoute, useRouter } from "vue-router";
import { initUserCurrency } from "./services/currency";
import { useAuthStore } from "./stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const profileMenuOpen = ref(false);

const profileName = computed(() => authStore.displayName);
const mobileProfilePath = computed(() => (authStore.isAuthenticated ? "/dashboard" : "/login"));

const toggleProfileMenu = () => {
  profileMenuOpen.value = !profileMenuOpen.value;
};

const handleLogout = async () => {
  await authStore.logout();
  profileMenuOpen.value = false;

  if (route.meta?.requiresAuth) {
    router.push("/");
  }
};

watch(
  () => route.fullPath,
  () => {
    profileMenuOpen.value = false;
  }
);

onMounted(() => {
  initUserCurrency();
  authStore.initAuth();
});
</script>

<template>
  <div class="app-shell pb-24">
    <!-- Section 1: Sticky Glass Navbar -->
    <header class="navbar-header glass-navbar">
      <div class="container nav-content">
        <!-- Logo -->
        <RouterLink to="/" class="brand-logo">
          <span class="logo-circle">🗺️</span>
          <span class="logo-txt">AI Travel <span class="logo-blue">Planner</span></span>
        </RouterLink>

        <!-- Desktop Navigation Menu -->
        <nav class="nav-links-desktop">
          <RouterLink to="/" class="nav-link" active-class="active">Home</RouterLink>
          <RouterLink to="/destination" class="nav-link" active-class="active">Destinations</RouterLink>
          <RouterLink to="/planner" class="nav-link" active-class="active">Planner</RouterLink>
          <RouterLink v-if="authStore.isAuthenticated" to="/dashboard" class="nav-link" active-class="active">Dashboard</RouterLink>
          <RouterLink to="/saved-trips" class="nav-link" active-class="active">Saved Trips</RouterLink>
        </nav>

        <!-- Profile Avatar -->
        <div class="nav-profile-wrap">
          <button
            type="button"
            class="profile-avatar-circle"
            :title="authStore.isAuthenticated ? `${profileName} (Profile)` : 'Login / Signup'"
            @click="toggleProfileMenu"
          >
            <span class="avatar-txt">{{ authStore.userInitials }}</span>
          </button>

          <transition name="fade-route">
            <div v-if="profileMenuOpen" class="profile-menu glass-card">
              <p class="profile-menu-name">{{ profileName }}</p>
              <p class="profile-menu-email">{{ authStore.user?.email || 'Login to personalize dashboard' }}</p>

              <div class="profile-actions">
                <RouterLink
                  v-if="authStore.isAuthenticated"
                  to="/dashboard"
                  class="profile-action-link"
                >
                  Open Dashboard
                </RouterLink>
                <RouterLink
                  v-if="authStore.isAuthenticated"
                  to="/saved-trips"
                  class="profile-action-link"
                >
                  My Saved Trips
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
    </header>

    <!-- Main View Section -->
    <main class="app-main-viewport">
      <RouterView v-slot="{ Component }">
        <transition name="fade-route" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <div class="container footer-content">
        <div class="footer-brand">
          <span class="brand-name">AI Travel Planner</span>
          <p class="brand-desc">Plan your dream journey with artificial intelligence. Discover destinations, budget, and customize itineraries instantly.</p>
        </div>

        <div class="footer-links-grid">
          <div class="links-column">
            <h4>Application</h4>
            <RouterLink to="/">Home</RouterLink>
            <RouterLink to="/destination">Destinations</RouterLink>
            <RouterLink to="/planner">Trip Planner</RouterLink>
            <RouterLink to="/saved-trips">Saved Archives</RouterLink>
          </div>
          <div class="links-column">
            <h4>Support</h4>
            <a href="#">Guides</a>
            <a href="#">Security</a>
            <a href="#">FAQ</a>
            <a href="#">API Keys</a>
          </div>
        </div>
      </div>
      
      <div class="container footer-bottom">
        <p class="copyright">&copy; 2026 AI Travel Planner. All rights reserved.</p>
      </div>
    </footer>

    <!-- Section 10: Mobile Bottom Navigation -->
    <nav class="mobile-bottom-navbar glass-navbar">
      <RouterLink to="/" class="mobile-nav-link" active-class="active">
        <span class="mob-icon">🏠</span>
        <span class="mob-lbl">Home</span>
      </RouterLink>
      <RouterLink to="/destination" class="mobile-nav-link" active-class="active">
        <span class="mob-icon">📍</span>
        <span class="mob-lbl">Explore</span>
      </RouterLink>
      <RouterLink to="/planner" class="mobile-nav-link" active-class="active">
        <span class="mob-icon">📆</span>
        <span class="mob-lbl">Planner</span>
      </RouterLink>
      <RouterLink to="/saved-trips" class="mobile-nav-link" active-class="active">
        <span class="mob-icon">❤️</span>
        <span class="mob-lbl">Saved</span>
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

/* Navbar styles */
.navbar-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 72px;
  z-index: 1000;
  display: flex;
  align-items: center;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  gap: 32px;
}

.nav-link {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 6px 0;
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
}

.profile-avatar-circle {
  width: 38px;
  height: 38px;
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

.profile-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 260px;
  padding: 14px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  z-index: 1200;
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
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.profile-action-link {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 0.85rem;
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
  background-color: #FFFFFF;
  border-top: 1px solid var(--color-border);
  padding: 60px 0 30px;
  margin-top: 60px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  gap: 48px;
  margin-bottom: 40px;
}

@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    gap: 32px;
  }
}

.footer-brand {
  max-width: 400px;
}

.brand-name {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 12px;
  display: block;
}

.brand-desc {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.footer-links-grid {
  display: flex;
  gap: 60px;
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
  gap: 12px;
}

.links-column h4 {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 6px;
}

.links-column a {
  font-size: 0.88rem;
  color: var(--color-text-muted);
}

.links-column a:hover {
  color: var(--color-primary);
}

.footer-bottom {
  border-top: 1px solid var(--color-border);
  padding-top: 24px;
  text-align: center;
}

.copyright {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

/* Section 10: Mobile Bottom Navigation */
.mobile-bottom-navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  z-index: 1000;
  display: none;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  justify-items: center;
  border-top: 1px solid var(--color-border);
  padding-bottom: 4px; /* spacing for home bar */
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
}

.mobile-nav-link, .profile-link-mock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.mob-icon {
  font-size: 1.2rem;
}

.mob-lbl {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.02em;
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

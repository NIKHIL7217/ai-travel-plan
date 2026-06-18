<script setup>
import { computed, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const mode = ref("login");
const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const errorText = ref("");

const isSignup = computed(() => mode.value === "signup");
const ctaLabel = computed(() => (isSignup.value ? "Create Account" : "Login"));
const titleText = computed(() => (isSignup.value ? "Create Your Travel Profile" : "Welcome Back, Traveler"));

watchEffect(() => {
  if (authStore.isAuthenticated) {
    const redirect = String(route.query.redirect || "/dashboard");
    router.replace(redirect.startsWith("/") ? redirect : "/dashboard");
  }
});

const switchMode = () => {
  mode.value = isSignup.value ? "login" : "signup";
  errorText.value = "";
};

const handleSubmit = async () => {
  errorText.value = "";

  if (!email.value.trim() || !password.value.trim()) {
    errorText.value = "Email and password are required.";
    return;
  }

  if (isSignup.value) {
    if (password.value.length < 6) {
      errorText.value = "Password must be at least 6 characters.";
      return;
    }

    if (password.value !== confirmPassword.value) {
      errorText.value = "Passwords do not match.";
      return;
    }
  }

  try {
    if (isSignup.value) {
      await authStore.signup({
        name: name.value,
        email: email.value.trim(),
        password: password.value
      });
    } else {
      await authStore.login(email.value.trim(), password.value);
    }

    const redirect = String(route.query.redirect || "/dashboard");
    router.replace(redirect.startsWith("/") ? redirect : "/dashboard");
  } catch (error) {
    errorText.value = error?.message || "Login failed. Please try again.";
  }
};
</script>

<template>
  <div class="auth-page container animate-fade-in" style="padding-top: 110px;">
    <div class="auth-shell glass-card">
      <div class="auth-art">
        <span class="pill">PROFILE ACCESS</span>
        <h1>{{ titleText }}</h1>
        <p>
          Secure your account, track personalized itineraries, and access your private travel dashboard.
        </p>
        <ul class="auth-points">
          <li>Personal dashboard for your trip activity</li>
          <li>Saved plans synced with your profile</li>
          <li>Fast switch between planning and archives</li>
        </ul>
      </div>

      <div class="auth-form-wrap">
        <h2>{{ isSignup ? "Sign Up" : "Login" }}</h2>

        <form @submit.prevent="handleSubmit" class="auth-form mt-4">
          <div v-if="isSignup" class="form-group">
            <label class="form-lbl">FULL NAME</label>
            <input v-model="name" class="form-input" type="text" placeholder="Your name" />
          </div>

          <div class="form-group">
            <label class="form-lbl">EMAIL</label>
            <input v-model="email" class="form-input" type="email" placeholder="you@example.com" required />
          </div>

          <div class="form-group">
            <label class="form-lbl">PASSWORD</label>
            <input v-model="password" class="form-input" type="password" placeholder="••••••••" required />
          </div>

          <div v-if="isSignup" class="form-group">
            <label class="form-lbl">CONFIRM PASSWORD</label>
            <input v-model="confirmPassword" class="form-input" type="password" placeholder="Repeat password" required />
          </div>

          <p v-if="errorText" class="error-text">{{ errorText }}</p>

          <button type="submit" class="btn btn-primary w-full" :disabled="authStore.loading">
            {{ authStore.loading ? "Please wait..." : ctaLabel }}
          </button>
        </form>

        <div class="switch-row">
          <span>{{ isSignup ? "Already have an account?" : "New user?" }}</span>
          <button type="button" class="switch-btn" @click="switchMode">
            {{ isSignup ? "Login" : "Create account" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  padding-bottom: 40px;
}

.auth-shell {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  overflow: hidden;
  min-height: 520px;
  border-radius: var(--radius-xl);
}

.auth-art {
  padding: 44px;
  color: white;
  background: radial-gradient(circle at 20% 15%, rgba(45, 212, 191, 0.45) 0%, rgba(37, 99, 235, 0.3) 35%, rgba(15, 23, 42, 0.9) 100%),
    linear-gradient(130deg, #0f172a 0%, #1e293b 48%, #334155 100%);
}

.pill {
  display: inline-block;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  color: #dbeafe;
  border: 1px solid rgba(219, 234, 254, 0.4);
}

.auth-art h1 {
  margin-top: 16px;
  margin-bottom: 12px;
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  line-height: 1.1;
  color: white;
}

.auth-art p {
  color: rgba(226, 232, 240, 0.95);
  line-height: 1.7;
}

.auth-points {
  list-style: none;
  margin-top: 22px;
  display: grid;
  gap: 10px;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.auth-points li {
  padding-left: 18px;
  position: relative;
}

.auth-points li::before {
  content: "";
  position: absolute;
  top: 8px;
  left: 0;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background-color: #2dd4bf;
}

.auth-form-wrap {
  padding: 44px;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.auth-form-wrap h2 {
  font-size: 1.4rem;
}

.auth-form {
  display: grid;
  gap: 2px;
}

.w-full {
  width: 100%;
  margin-top: 12px;
}

.error-text {
  color: #dc2626;
  font-size: 0.85rem;
  margin-top: 6px;
}

.switch-row {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
}

.switch-btn {
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 960px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }

  .auth-art,
  .auth-form-wrap {
    padding: 28px;
  }
}
</style>

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
    const redirect = String(route.query.redirect || "/trips");
    router.replace(redirect.startsWith("/") ? redirect : "/trips");
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

    const redirect = String(route.query.redirect || "/trips");
    router.replace(redirect.startsWith("/") ? redirect : "/trips");
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
          Secure your account, track personalized itineraries, and access your private travel hub.
        </p>
        <ul class="auth-points">
          <li>Personal trip hub for your travel activity</li>
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

<style scoped src="./styles/Login.css"></style>

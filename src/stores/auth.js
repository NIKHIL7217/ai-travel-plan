import { defineStore } from "pinia";
import {
  getAuthSession,
  observeAuthSession,
  loginWithEmail,
  signupWithEmail,
  logoutCurrentUser
} from "../services/firebase";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    initialized: false,
    loading: false,
    _unsubscribe: null,
    _initPromise: null
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user?.uid),
    displayName: (state) => state.user?.displayName || state.user?.email || "Traveler",
    userInitials(state) {
      const source = state.user?.displayName || state.user?.email || "Traveler";
      const parts = source
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length === 0) {
        return "TR";
      }

      const first = parts[0].charAt(0).toUpperCase();
      const second = parts.length > 1 ? parts[1].charAt(0).toUpperCase() : "";
      return `${first}${second}`.slice(0, 2);
    }
  },
  actions: {
    async initAuth() {
      if (this.initialized) {
        return;
      }

      if (this._initPromise) {
        return this._initPromise;
      }

      this._initPromise = new Promise((resolve) => {
        const immediateSession = getAuthSession();
        if (immediateSession) {
          this.user = immediateSession;
        }

        let firstCallbackHandled = false;
        this._unsubscribe = observeAuthSession((sessionUser) => {
          this.user = sessionUser;
          this.initialized = true;

          if (!firstCallbackHandled) {
            firstCallbackHandled = true;
            resolve();
          }
        });

        setTimeout(() => {
          if (!firstCallbackHandled) {
            this.initialized = true;
            firstCallbackHandled = true;
            resolve();
          }
        }, 150);
      });

      return this._initPromise;
    },

    async login(email, password) {
      this.loading = true;
      try {
        const user = await loginWithEmail(email, password);
        this.user = user;
        this.initialized = true;
        return user;
      } finally {
        this.loading = false;
      }
    },

    async signup({ name, email, password }) {
      this.loading = true;
      try {
        const user = await signupWithEmail({ name, email, password });
        this.user = user;
        this.initialized = true;
        return user;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.loading = true;
      try {
        await logoutCurrentUser();
        this.user = null;
      } finally {
        this.loading = false;
      }
    }
  }
});

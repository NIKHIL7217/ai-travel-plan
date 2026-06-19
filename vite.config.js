import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { visualizer } from "rollup-plugin-visualizer";

function createManualChunks(id) {
  if (id.includes("node_modules")) {
    if (id.includes("node_modules/vue") || id.includes("node_modules/@vue")) {
      return "vendor-vue";
    }

    if (id.includes("node_modules/vue-router") || id.includes("node_modules/pinia")) {
      return "vendor-vue-ecosystem";
    }

    if (id.includes("node_modules/firebase/auth")) {
      return "vendor-firebase-auth";
    }

    if (id.includes("node_modules/firebase/firestore")) {
      return "vendor-firebase-firestore";
    }

    if (id.includes("node_modules/firebase/app")) {
      return "vendor-firebase-app";
    }

    if (id.includes("node_modules/firebase")) {
      return "vendor-firebase-core";
    }

    if (id.includes("node_modules/zod")) {
      return "vendor-zod";
    }

    return "vendor-misc";
  }

  if (
    id.includes("/src/services/ai/") ||
    id.includes("/src/modules/profile-memory/") ||
    id.includes("/src/modules/command-center/")
  ) {
    return "feature-ai";
  }

  if (
    id.includes("/src/services/maps/") ||
    id.includes("/src/modules/roadtrip/") ||
    id.includes("/src/features/roadtrip/")
  ) {
    return "feature-maps-roadtrip";
  }

  if (
    id.includes("/src/modules/travel-intelligence/") ||
    id.includes("/src/features/travel-intelligence/")
  ) {
    return "feature-intelligence";
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    ...(process.env.ANALYZE_BUNDLE === "true"
      ? [
          visualizer({
            filename: "dist/bundle-analysis.html",
            template: "treemap",
            gzipSize: true,
            brotliSize: true
          })
        ]
      : [])
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: createManualChunks
      }
    }
  }
});

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./index.css";
import { useAuthStore } from "./stores/auth";
import { installGlobalErrorHandlers } from "./core/monitoring/global";
import { initNetworkMonitoring } from "./core/monitoring/network";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

initNetworkMonitoring();
installGlobalErrorHandlers(app);

const authStore = useAuthStore();
authStore.initAuth();

app.mount("#app");
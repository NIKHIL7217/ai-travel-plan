import { createApp } from "vue";
import { createPinia } from "pinia";
import { createVuetify } from "vuetify";
import "vuetify/styles";
import App from "./App.vue";
import router from "./router";
import "./index.css";
import { useAuthStore } from "./stores/auth";
import { installGlobalErrorHandlers } from "./core/monitoring/global";
import { initNetworkMonitoring } from "./core/monitoring/network";

const app = createApp(App);
const pinia = createPinia();
const vuetify = createVuetify();

app.use(pinia);
app.use(router);
app.use(vuetify);

initNetworkMonitoring();
installGlobalErrorHandlers(app);

const authStore = useAuthStore();
authStore.initAuth();

app.mount("#app");
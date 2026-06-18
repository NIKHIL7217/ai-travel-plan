import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import Home from "../pages/Home.vue";
import Destination from "../pages/Destination.vue";
import DestinationDetails from "../pages/DestinationDetails.vue";
import Planner from "../pages/Planner.vue";
import SavedTrips from "../pages/SavedTrips.vue";
import NotFound from "../pages/NotFound.vue";
import Login from "../pages/Login.vue";
import Dashboard from "../pages/Dashboard.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home
  },
  {
    path: "/destination",
    name: "Destination",
    component: Destination
  },
  {
    path: "/destination/:id",
    name: "DestinationDetails",
    component: DestinationDetails
  },
  {
    path: "/planner",
    name: "Planner",
    component: Planner
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: {
      guestOnly: true
    }
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: Dashboard,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: "/saved-trips",
    name: "SavedTrips",
    component: SavedTrips,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: NotFound
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0, behavior: "smooth" };
    }
  }
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  await authStore.initAuth();

  if (to.meta?.requiresAuth && !authStore.isAuthenticated) {
    return {
      path: "/login",
      query: {
        redirect: to.fullPath
      }
    };
  }

  if (to.meta?.guestOnly && authStore.isAuthenticated) {
    return "/dashboard";
  }

  return true;
});

export default router;

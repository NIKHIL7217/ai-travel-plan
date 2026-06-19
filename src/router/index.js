import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const Home = () => import("../pages/Home.vue");
const Destination = () => import("../pages/Destination.vue");
const DestinationDetails = () => import("../pages/DestinationDetails.vue");
const Planner = () => import("../pages/Planner.vue");
const SavedTrips = () => import("../pages/SavedTrips.vue");
const NotFound = () => import("../pages/NotFound.vue");
const Login = () => import("../pages/Login.vue");
const Dashboard = () => import("../pages/Dashboard.vue");
const Guides = () => import("../pages/Guides.vue");
const Security = () => import("../pages/Security.vue");
const Faq = () => import("../pages/Faq.vue");
const ApiKeys = () => import("../pages/ApiKeys.vue");

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
    path: "/guides",
    name: "Guides",
    component: Guides
  },
  {
    path: "/security",
    name: "Security",
    component: Security
  },
  {
    path: "/faq",
    name: "Faq",
    component: Faq
  },
  {
    path: "/api-keys",
    name: "ApiKeys",
    component: ApiKeys
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

import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const Home = () => import("../pages/Home.vue");
const Destination = () => import("../pages/Destination.vue");
const DestinationDetails = () => import("../pages/DestinationDetails.vue");
const Planner = () => import("../pages/Planner.vue");
const RoadtripPlanner = () => import("../pages/RoadtripPlanner.vue");
const SavedTrips = () => import("../pages/SavedTrips.vue");
const NotFound = () => import("../pages/NotFound.vue");
const Login = () => import("../pages/Login.vue");
const Dashboard = () => import("../pages/Dashboard.vue");
const Community = () => import("../pages/Community.vue");
const Documents = () => import("../pages/Documents.vue");
const GroupTravel = () => import("../pages/GroupTravel.vue");
const Help = () => import("../pages/Help.vue");

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
    path: "/roadtrips",
    name: "RoadtripPlanner",
    component: RoadtripPlanner
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
    path: "/community",
    name: "Community",
    component: Community,
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
    path: "/documents",
    name: "Documents",
    component: Documents,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: "/group-trips",
    name: "GroupTravel",
    component: GroupTravel,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: "/group-travel",
    redirect: "/group-trips"
  },
  {
    path: "/help",
    name: "Help",
    component: Help
  },
  {
    path: "/guides",
    redirect: { path: "/help", query: { topic: "overview" } }
  },
  {
    path: "/security",
    redirect: { path: "/help", query: { topic: "security" } }
  },
  {
    path: "/faq",
    redirect: { path: "/help", query: { topic: "overview" } }
  },
  {
    path: "/api-keys",
    redirect: { path: "/help", query: { topic: "api" } }
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

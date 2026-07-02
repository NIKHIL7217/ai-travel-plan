import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const Home = () => import("../pages/Home.vue");
const Destination = () => import("../pages/Destination.vue");
const DestinationDetails = () => import("../pages/DestinationDetails.vue");
const Planner = () => import("../pages/Planner.vue");
const NotFound = () => import("../pages/NotFound.vue");
const Login = () => import("../pages/Login.vue");
const GroupTravel = () => import("../pages/GroupTravel.vue");
const Help = () => import("../pages/Help.vue");
const Profile = () => import("../pages/Profile.vue");
const Admin = () => import("../pages/Admin.vue");

function isAdminUser(user) {
  const email = String(user?.email || "").toLowerCase();
  return email.includes("admin") || email.endsWith("@wanderai.local");
}

const routes = [
  {
    path: "/",
    name: "Explore",
    component: Home
  },
  {
    path: "/explore",
    redirect: "/"
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
    component: Planner,
    meta: {
      hideFooter: true,
    }
  },
  {
    path: "/trips",
    redirect: { path: "/planner", query: { tab: "trips" } }
  },
  {
    path: "/roadtrips",
    redirect: { path: "/planner", query: { tab: "travel-plan" } }
  },
  {
    path: "/bookings",
    redirect: { path: "/planner", query: { tab: "travel-plan" } }
  },
  {
    path: "/stay",
    redirect: { path: "/planner", query: { tab: "travel-plan" } }
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
    path: "/community",
    redirect: { path: "/planner", query: { tab: "community" } }
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
    path: "/profile",
    name: "Profile",
    component: Profile,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: "/admin",
    name: "Admin",
    component: Admin,
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: "/group-travel",
    redirect: "/group-trips"
  },
  {
    path: "/dashboard",
    redirect: { path: "/trips", query: { section: "stats" } }
  },
  {
    path: "/saved-trips",
    redirect: { path: "/planner", query: { tab: "trips" } }
  },
  {
    path: "/travel-os",
    redirect: { path: "/planner", query: { tab: "trips" } }
  },
  {
    path: "/documents",
    redirect: { path: "/planner", query: { tab: "documents" } }
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
    return "/trips";
  }

  if (to.meta?.requiresAdmin && !isAdminUser(authStore.user)) {
    return {
      path: "/trips",
      query: {
        denied: "admin"
      }
    };
  }

  return true;
});

export default router;

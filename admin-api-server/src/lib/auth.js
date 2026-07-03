import process from "node:process";
import { findTrackedUserByIdentity } from "../store/adminStore.js";

const ADMIN_API_SECRET = String(process.env.ADMIN_API_SECRET || "").trim();
const ENFORCE_ADMIN_SECRET = String(process.env.ENFORCE_ADMIN_SECRET || "true").toLowerCase() === "true";

let warnedInsecureMode = false;

function toLower(value) {
  return String(value || "").trim().toLowerCase();
}

function isAdminRole(value) {
  return toLower(value) === "admin";
}

function extractRequesterClaims(req) {
  const userId = String(req.headers["x-user-id"] || req.body?.userId || req.query?.userId || "").trim();
  const email = String(req.headers["x-user-email"] || req.body?.email || "").trim().toLowerCase();

  return {
    userId,
    email
  };
}

async function resolveRequester(req) {
  const claims = extractRequesterClaims(req);
  const trackedUser = await findTrackedUserByIdentity({
    userId: claims.userId,
    email: claims.email
  });

  const role = trackedUser?.role || "member";

  return {
    userId: trackedUser?.id || claims.userId,
    email: trackedUser?.email || claims.email,
    role,
    isAdmin: isAdminRole(role),
    trackedUser
  };
}

function isAdminSecretSatisfied(req) {
  if (!ADMIN_API_SECRET) {
    return !ENFORCE_ADMIN_SECRET;
  }

  const headerSecret = String(req.headers["x-admin-secret"] || "").trim();
  return headerSecret === ADMIN_API_SECRET;
}

export async function requireRequester(req, res, next) {
  req.requester = await resolveRequester(req);

  if (!req.requester.userId) {
    return res.status(401).json({
      error: "Requester context missing or unknown. Login/signup first so user exists in tracked users."
    });
  }

  return next();
}

export async function requireAdmin(req, res, next) {
  req.requester = await resolveRequester(req);

  if (!req.requester.isAdmin) {
    return res.status(403).json({ error: "Admin access required." });
  }

  if (!isAdminSecretSatisfied(req)) {
    return res.status(401).json({ error: "Admin secret missing or invalid." });
  }

  if (!ADMIN_API_SECRET && !warnedInsecureMode) {
    warnedInsecureMode = true;
    console.warn("[security] ADMIN_API_SECRET is not configured. Admin routes are role-gated only.");
  }

  return next();
}

export function assertUserAccessOrAdmin(requester, targetUserId) {
  const normalizedTarget = String(targetUserId || "").trim();
  if (!normalizedTarget) {
    return false;
  }

  if (requester?.isAdmin) {
    return true;
  }

  return String(requester?.userId || "").trim() === normalizedTarget;
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, "..", "..", "data");
const USERS_FILE = join(DATA_DIR, "users.json");
const EVENTS_FILE = join(DATA_DIR, "admin-events.json");
const MAX_USERS = 10000;
const MAX_EVENTS = 50000;
const ADMIN_BOOTSTRAP_EMAILS = String(process.env.ADMIN_BOOTSTRAP_EMAILS || "")
  .split(",")
  .map((entry) => normalizeEmail(entry))
  .filter(Boolean);

let writeChain = Promise.resolve();

function now() {
  return Date.now();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function getBootstrapRoleForEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return "member";
  }

  return ADMIN_BOOTSTRAP_EMAILS.includes(normalized) ? "admin" : "member";
}

function resolveRole({ email, explicitRole, currentRole }) {
  if (hasValue(explicitRole)) {
    return String(explicitRole).trim().toLowerCase();
  }

  const bootstrapRole = getBootstrapRoleForEmail(email);
  if (bootstrapRole === "admin") {
    return "admin";
  }

  if (hasValue(currentRole)) {
    return String(currentRole).trim().toLowerCase();
  }

  return "member";
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readJson(filePath) {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return asArray(parsed);
  } catch (_error) {
    return [];
  }
}

async function persistJson(filePath, value) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function queueWrite(mutator) {
  writeChain = writeChain.then(async () => {
    const users = await readJson(USERS_FILE);
    const events = await readJson(EVENTS_FILE);
    const result = await mutator({ users, events });

    await Promise.all([
      persistJson(USERS_FILE, asArray(result.users).slice(0, MAX_USERS)),
      persistJson(EVENTS_FILE, asArray(result.events).slice(0, MAX_EVENTS))
    ]);

    return result.value;
  });

  return writeChain;
}

function sanitizeUserPatch(payload = {}) {
  const patch = {};

  if (hasValue(payload.role)) {
    patch.role = String(payload.role).trim().toLowerCase();
  }

  if (hasValue(payload.status)) {
    patch.status = String(payload.status).trim().toLowerCase();
  }

  if (hasValue(payload.displayName)) {
    patch.displayName = String(payload.displayName).trim() || "Traveler";
  }

  if (hasValue(payload.email)) {
    patch.email = normalizeEmail(payload.email);
  }

  if (payload.isVerified !== undefined) {
    patch.isVerified = Boolean(payload.isVerified);
  }

  return patch;
}

function ensureUserShape(user = {}) {
  const createdAt = toNumber(user.createdAt, now());
  const updatedAt = toNumber(user.updatedAt, createdAt);
  const loginCount = toNumber(user.loginCount, 0);
  const totalTrips = toNumber(user.totalTrips, 0);
  const totalRevenue = toNumber(user.totalRevenue, 0);

  return {
    id: String(user.id || `usr_${createdAt}_${Math.random().toString(16).slice(2)}`),
    email: normalizeEmail(user.email),
    displayName: String(user.displayName || "Traveler").trim() || "Traveler",
    role: String(user.role || "member"),
    status: String(user.status || "active"),
    isVerified: Boolean(user.isVerified),
    signupSource: String(user.signupSource || "app"),
    createdAt,
    updatedAt,
    lastLoginAt: toNumber(user.lastLoginAt, 0),
    loginCount,
    totalTrips,
    totalRevenue
  };
}

function recordEvent(events, payload = {}) {
  const event = {
    id: `evt_${now()}_${Math.random().toString(16).slice(2)}`,
    type: String(payload.type || "unknown"),
    userId: String(payload.userId || "guest"),
    meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {},
    amount: toNumber(payload.amount, 0),
    createdAt: now()
  };

  return [event, ...events].slice(0, MAX_EVENTS);
}

function summarize(users = [], events = []) {
  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === "active").length;
  const suspendedUsers = users.filter((user) => user.status === "suspended").length;
  const bannedUsers = users.filter((user) => user.status === "banned").length;
  const verifiedUsers = users.filter((user) => user.isVerified).length;
  const totalRevenue = users.reduce((sum, user) => sum + toNumber(user.totalRevenue, 0), 0);
  const totalTrips = users.reduce((sum, user) => sum + toNumber(user.totalTrips, 0), 0);
  const loginsToday = events.filter((event) => {
    if (event.type !== "auth.login") {
      return false;
    }
    const delta = now() - toNumber(event.createdAt, 0);
    return delta >= 0 && delta <= 24 * 60 * 60 * 1000;
  }).length;

  return {
    totalUsers,
    activeUsers,
    suspendedUsers,
    bannedUsers,
    verifiedUsers,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalTrips,
    loginsToday
  };
}

export async function listUsers() {
  const users = await readJson(USERS_FILE);
  return users
    .map((user) => ensureUserShape(user))
    .sort((a, b) => toNumber(b.updatedAt, 0) - toNumber(a.updatedAt, 0));
}

export async function upsertUser(payload = {}) {
  const userId = String(payload.id || payload.uid || "").trim();
  const email = normalizeEmail(payload.email);
  const userPatch = sanitizeUserPatch(payload);

  if (!userId && !email) {
    throw new Error("User id or email is required.");
  }

  return queueWrite(async ({ users, events }) => {
    const normalizedUsers = users.map((user) => ensureUserShape(user));
    const index = normalizedUsers.findIndex((user) => {
      if (userId && user.id === userId) {
        return true;
      }
      return Boolean(email) && user.email === email;
    });

    const timestamp = now();
    let nextUsers = normalizedUsers;
    let record;

    if (index >= 0) {
      const existing = normalizedUsers[index];
      const nextEmail = userPatch.email || existing.email;
      record = ensureUserShape({
        ...existing,
        ...userPatch,
        role: resolveRole({
          email: nextEmail,
          explicitRole: userPatch.role,
          currentRole: existing.role
        }),
        id: existing.id,
        email: nextEmail,
        status: userPatch.status || existing.status,
        displayName: userPatch.displayName || existing.displayName,
        isVerified: userPatch.isVerified !== undefined ? userPatch.isVerified : existing.isVerified,
        createdAt: existing.createdAt,
        updatedAt: timestamp
      });
      nextUsers = [...normalizedUsers];
      nextUsers[index] = record;
    } else {
      const assignedRole = resolveRole({
        email,
        explicitRole: userPatch.role,
        currentRole: "member"
      });

      record = ensureUserShape({
        id: userId || `usr_${timestamp}_${Math.random().toString(16).slice(2)}`,
        email,
        displayName: userPatch.displayName || "Traveler",
        role: assignedRole,
        status: userPatch.status || "active",
        isVerified: userPatch.isVerified !== undefined ? userPatch.isVerified : false,
        signupSource: String(payload.signupSource || "app"),
        createdAt: timestamp,
        updatedAt: timestamp,
        lastLoginAt: 0,
        loginCount: 0,
        totalTrips: 0,
        totalRevenue: 0
      });
      nextUsers = [record, ...normalizedUsers].slice(0, MAX_USERS);
    }

    const nextEvents = recordEvent(events, {
      type: "user.upsert",
      userId: record.id,
      meta: {
        email: record.email,
        role: record.role,
        status: record.status
      }
    });

    return { users: nextUsers, events: nextEvents, value: record };
  });
}

export async function trackAuthEvent(payload = {}) {
  const authType = String(payload.type || "login").toLowerCase();
  if (!["login", "signup", "logout"].includes(authType)) {
    throw new Error("Unsupported auth event type.");
  }

  const userId = String(payload.userId || payload.uid || "").trim();
  const email = normalizeEmail(payload.email);
  const displayName = String(payload.displayName || "Traveler").trim() || "Traveler";

  if (!userId && !email) {
    throw new Error("userId or email is required.");
  }

  return queueWrite(async ({ users, events }) => {
    const normalizedUsers = users.map((user) => ensureUserShape(user));
    const index = normalizedUsers.findIndex((user) => {
      if (userId && user.id === userId) {
        return true;
      }
      return Boolean(email) && user.email === email;
    });

    const timestamp = now();
    let nextUsers = normalizedUsers;
    let targetUser;

    if (index >= 0) {
      const current = normalizedUsers[index];
      const nextLoginCount = authType === "logout" ? current.loginCount : current.loginCount + 1;
      const resolvedRole = resolveRole({
        email: email || current.email,
        explicitRole: payload.role,
        currentRole: current.role
      });

      targetUser = ensureUserShape({
        ...current,
        email: email || current.email,
        displayName: displayName || current.displayName,
        role: resolvedRole,
        isVerified: authType !== "logout" ? true : current.isVerified,
        lastLoginAt: authType === "logout" ? current.lastLoginAt : timestamp,
        loginCount: nextLoginCount,
        updatedAt: timestamp
      });
      nextUsers = [...normalizedUsers];
      nextUsers[index] = targetUser;
    } else {
      const assignedRole = resolveRole({
        email,
        explicitRole: payload.role,
        currentRole: "member"
      });

      targetUser = ensureUserShape({
        id: userId || `usr_${timestamp}_${Math.random().toString(16).slice(2)}`,
        email,
        displayName,
        role: assignedRole,
        status: "active",
        isVerified: authType !== "logout",
        signupSource: "app",
        createdAt: timestamp,
        updatedAt: timestamp,
        lastLoginAt: authType === "logout" ? 0 : timestamp,
        loginCount: authType === "logout" ? 0 : 1,
        totalTrips: 0,
        totalRevenue: 0
      });
      nextUsers = [targetUser, ...normalizedUsers].slice(0, MAX_USERS);
    }

    const nextEvents = recordEvent(events, {
      type: `auth.${authType}`,
      userId: targetUser.id,
      meta: {
        email: targetUser.email,
        displayName: targetUser.displayName
      }
    });

    return { users: nextUsers, events: nextEvents, value: targetUser };
  });
}

export async function trackTripEvent(payload = {}) {
  const userId = String(payload.userId || "").trim();
  const tripId = String(payload.tripId || "").trim();
  const amount = Math.max(0, toNumber(payload.amount, 0));
  const destination = String(payload.destination || "").trim();

  if (!userId) {
    throw new Error("userId is required for trip event.");
  }

  return queueWrite(async ({ users, events }) => {
    const normalizedUsers = users.map((user) => ensureUserShape(user));
    const index = normalizedUsers.findIndex((user) => user.id === userId);
    if (index < 0) {
      throw new Error("User not found. Track auth/signup first.");
    }

    const timestamp = now();
    const current = normalizedUsers[index];
    const nextUser = ensureUserShape({
      ...current,
      totalTrips: current.totalTrips + 1,
      totalRevenue: Number((current.totalRevenue + amount).toFixed(2)),
      updatedAt: timestamp
    });

    const nextUsers = [...normalizedUsers];
    nextUsers[index] = nextUser;

    const nextEvents = recordEvent(events, {
      type: "trip.saved",
      userId,
      amount,
      meta: {
        tripId,
        destination
      }
    });

    return { users: nextUsers, events: nextEvents, value: nextUser };
  });
}

export async function updateUser(userId, patch = {}) {
  const normalizedId = String(userId || "").trim();
  if (!normalizedId) {
    throw new Error("userId is required.");
  }

  return queueWrite(async ({ users, events }) => {
    const normalizedUsers = users.map((user) => ensureUserShape(user));
    const index = normalizedUsers.findIndex((user) => user.id === normalizedId);
    if (index < 0) {
      throw new Error("User not found.");
    }

    const current = normalizedUsers[index];
    const nextEmail = hasValue(patch.email) ? normalizeEmail(patch.email) : current.email;
    const nextPatch = sanitizeUserPatch({
      ...current,
      ...patch,
      email: nextEmail,
      role: resolveRole({
        email: nextEmail,
        explicitRole: patch.role,
        currentRole: current.role
      })
    });

    const next = ensureUserShape({
      ...current,
      ...nextPatch,
      updatedAt: now()
    });

    const nextUsers = [...normalizedUsers];
    nextUsers[index] = next;
    const nextEvents = recordEvent(events, {
      type: "user.update",
      userId: next.id,
      meta: {
        status: next.status,
        role: next.role
      }
    });

    return { users: nextUsers, events: nextEvents, value: next };
  });
}

export async function removeUser(userId) {
  const normalizedId = String(userId || "").trim();
  if (!normalizedId) {
    throw new Error("userId is required.");
  }

  return queueWrite(async ({ users, events }) => {
    const normalizedUsers = users.map((user) => ensureUserShape(user));
    const exists = normalizedUsers.some((user) => user.id === normalizedId);
    const nextUsers = normalizedUsers.filter((user) => user.id !== normalizedId);

    const nextEvents = recordEvent(events, {
      type: "user.remove",
      userId: normalizedId,
      meta: { removed: exists }
    });

    return { users: nextUsers, events: nextEvents, value: exists };
  });
}

export async function getOverview() {
  const users = (await readJson(USERS_FILE)).map((user) => ensureUserShape(user));
  const events = await readJson(EVENTS_FILE);

  const metrics = summarize(users, events);
  const recentUsers = [...users]
    .sort((a, b) => toNumber(b.createdAt, 0) - toNumber(a.createdAt, 0))
    .slice(0, 8);
  const recentRevenueEvents = events
    .filter((event) => event.type === "trip.saved")
    .slice(0, 12);

  return {
    metrics,
    recentUsers,
    recentRevenueEvents
  };
}

export async function findTrackedUserByIdentity({ userId, email } = {}) {
  const normalizedId = String(userId || "").trim();
  const normalizedEmail = normalizeEmail(email);
  const users = (await readJson(USERS_FILE)).map((user) => ensureUserShape(user));

  return (
    users.find((user) => {
      if (normalizedId && user.id === normalizedId) {
        return true;
      }
      return Boolean(normalizedEmail) && user.email === normalizedEmail;
    }) || null
  );
}

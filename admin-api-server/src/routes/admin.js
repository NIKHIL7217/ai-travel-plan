import { Router } from "express";
import { requireAdmin } from "../lib/auth.js";
import {
  getOverview,
  listUsers,
  removeUser,
  trackAuthEvent,
  trackTripEvent,
  updateUser,
  upsertUser
} from "../store/adminStore.js";

const router = Router();

router.use(requireAdmin);

router.get("/overview", async (_req, res) => {
  const overview = await getOverview();
  res.json(overview);
});

router.get("/users", async (_req, res) => {
  const users = await listUsers();
  res.json({ users });
});

router.post("/users/upsert", async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "User body is required." });
  }

  try {
    const user = await upsertUser(req.body);
    return res.status(201).json({ user });
  } catch (error) {
    return res.status(400).json({ error: String(error?.message || "Failed to upsert user.") });
  }
});

router.patch("/users/:id", async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Patch body is required." });
  }

  try {
    const user = await updateUser(req.params.id, req.body);
    return res.json({ user });
  } catch (error) {
    return res.status(400).json({ error: String(error?.message || "Failed to update user.") });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const removed = await removeUser(req.params.id);
    return res.json({ removed });
  } catch (error) {
    return res.status(400).json({ error: String(error?.message || "Failed to delete user.") });
  }
});

router.post("/events/auth", async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Event body is required." });
  }

  try {
    const user = await trackAuthEvent(req.body);
    return res.status(201).json({ user });
  } catch (error) {
    return res.status(400).json({ error: String(error?.message || "Failed to track auth event.") });
  }
});

router.post("/events/trip", async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Event body is required." });
  }

  try {
    const user = await trackTripEvent(req.body);
    return res.status(201).json({ user });
  } catch (error) {
    return res.status(400).json({ error: String(error?.message || "Failed to track trip event.") });
  }
});

export default router;

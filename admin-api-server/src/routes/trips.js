import { Router } from "express";
import { assertUserAccessOrAdmin, requireRequester } from "../lib/auth.js";
import { createTrip, deleteTrip, getTrip, listTrips } from "../store/tripStore.js";

const router = Router();

router.use(requireRequester);

router.get("/", async (req, res) => {
  const scopedUserId = req.requester?.isAdmin
    ? String(req.query.userId || "")
    : String(req.requester?.userId || "");

  const trips = await listTrips(scopedUserId);
  res.json({ trips });
});

router.get("/:id", async (req, res) => {
  const trip = await getTrip(req.params.id);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found." });
  }

  if (!assertUserAccessOrAdmin(req.requester, trip.userId)) {
    return res.status(403).json({ error: "You are not allowed to access this trip." });
  }

  return res.json({ trip });
});

router.post("/", async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Trip body is required." });
  }

  const payload = {
    ...req.body,
    userId: req.requester?.isAdmin
      ? String(req.body.userId || req.requester?.userId || "guest")
      : String(req.requester?.userId || "guest")
  };

  const trip = await createTrip(payload);
  return res.status(201).json({ trip });
});

router.delete("/:id", async (req, res) => {
  const trip = await getTrip(req.params.id);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found." });
  }

  if (!assertUserAccessOrAdmin(req.requester, trip.userId)) {
    return res.status(403).json({ error: "You are not allowed to delete this trip." });
  }

  const removed = await deleteTrip(req.params.id);
  return res.json({ removed });
});

export default router;

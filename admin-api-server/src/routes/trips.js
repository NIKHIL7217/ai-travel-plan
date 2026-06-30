import { Router } from "express";
import { createTrip, deleteTrip, getTrip, listTrips } from "../store/tripStore.js";

const router = Router();

router.get("/", async (req, res) => {
  const trips = await listTrips(String(req.query.userId || ""));
  res.json({ trips });
});

router.get("/:id", async (req, res) => {
  const trip = await getTrip(req.params.id);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found." });
  }
  return res.json({ trip });
});

router.post("/", async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Trip body is required." });
  }
  const trip = await createTrip(req.body);
  return res.status(201).json({ trip });
});

router.delete("/:id", async (req, res) => {
  const removed = await deleteTrip(req.params.id);
  return res.json({ removed });
});

export default router;

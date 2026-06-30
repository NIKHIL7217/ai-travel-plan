import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, "..", "..", "data");
const DATA_FILE = join(DATA_DIR, "trips.json");

let writeChain = Promise.resolve();

async function readAll() {
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

async function persist(trips) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(trips, null, 2), "utf-8");
}

// Serialize writes to avoid lost updates under concurrent requests.
function queueWrite(mutator) {
  writeChain = writeChain.then(async () => {
    const trips = await readAll();
    const result = await mutator(trips);
    await persist(result.trips);
    return result.value;
  });
  return writeChain;
}

export async function listTrips(userId) {
  const trips = await readAll();
  const scoped = userId ? trips.filter((trip) => trip.userId === userId) : trips;
  return scoped.sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
}

export async function getTrip(id) {
  const trips = await readAll();
  return trips.find((trip) => trip.id === id) || null;
}

export async function createTrip(payload) {
  const record = {
    id: `trip_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    userId: String(payload?.userId || "guest"),
    title: String(payload?.title || "Untitled Trip"),
    destination: String(payload?.destination || ""),
    data: payload?.data ?? null,
    savedAt: Date.now()
  };

  return queueWrite(async (trips) => ({
    trips: [record, ...trips].slice(0, 2000),
    value: record
  }));
}

export async function deleteTrip(id) {
  return queueWrite(async (trips) => {
    const next = trips.filter((trip) => trip.id !== id);
    return { trips: next, value: next.length !== trips.length };
  });
}

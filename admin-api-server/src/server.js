import process from "node:process";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { isConfigured } from "./lib/gemini.js";
import aiRoutes from "./routes/ai.js";
import adminRoutes from "./routes/admin.js";
import tripRoutes from "./routes/trips.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8787);

const allowedOrigins = String(process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:5174,http://localhost:5175")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / tools with no Origin header, and whitelisted origins.
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed: ${origin}`));
    }
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    aiConfigured: isConfigured(),
    time: new Date().toISOString()
  });
});

app.use("/api/ai", aiRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.use((_err, _req, res, _next) => {
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`WanderAI API server running on http://localhost:${PORT}`);
  console.log(`Gemini configured: ${isConfigured() ? "yes" : "no (set GEMINI_API_KEY in admin-api-server/.env)"}`);
});

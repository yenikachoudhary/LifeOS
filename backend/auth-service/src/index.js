import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";

const app = express();

const corsOrigin = config.corsOrigins.includes("*") ? "*" : config.corsOrigins;
app.use(cors({ origin: corsOrigin, methods: ["GET", "POST"], allowedHeaders: ["Authorization", "Content-Type"] }));
app.use(express.json({ limit: "10kb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Brute-force protection on credential endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, try again in a few minutes" },
});
app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);
app.use("/auth", authRoutes);

app.use((_req, res) => res.status(404).json({ message: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON" });
  console.error(err.message); // never log request bodies (contain passwords)
  res.status(500).json({ message: "Internal server error" });
});

try {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  app.listen(config.port, () => console.log(`Auth service listening on http://localhost:${config.port}`));
} catch (err) {
  console.error("Could not connect to MongoDB:", err.message);
  process.exit(1);
}

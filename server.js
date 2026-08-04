import dotenv from "dotenv";
dotenv.config();

import { validateEnv } from "./config/validateEnv.js";
validateEnv();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import "express-async-errors";

import { connectDB } from "./config/database.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import mongoSanitize from "express-mongo-sanitize";

import authRoutes      from "./routes/auth.routes.js";
import pgListingRoutes from "./routes/pgListing.routes.js";
import bookingRoutes   from "./routes/booking.routes.js";
import reviewRoutes    from "./routes/review.routes.js";
import adminRoutes     from "./routes/admin.routes.js";
import supportRoutes   from "./routes/support.routes.js";

const app  = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

/* ================= 1. CORS — SABSE PEHLE ================= */
// CORS aur OPTIONS handler MUST be first — helmet/limiter se pehle
// Warna preflight (OPTIONS) request block ho jaati hai bina headers ke

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://rentkaroo-frontend.vercel.app",  // sirf yeh exact production domain
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.error(`CORS blocked: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
// wildcard regex hata diya — sirf exact domains allow honge
app.use(cors(corsOptions));

// Preflight (OPTIONS) requests ko explicitly handle karo — CORS ke turant baad
app.options("*", cors(corsOptions));

/* ================= 2. SECURITY & OPTIMIZATION ================= */
app.use(helmet());
app.use(compression());

/* ================= 3. RATE LIMITER — CORS ke baad ================= */
// Agar pehle lagao toh OPTIONS preflight count ho jaati hai limit mein
app.use(generalLimiter);

/* ================= 4. BODY PARSERS ================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(mongoSanitize());  // body parsers ke baad add karo

/* ================= 5. ROUTES ================= */
app.use("/api/v1/auth",        authRoutes);
app.use("/api/v1/pg-listings", pgListingRoutes);
app.use("/api/v1/bookings",    bookingRoutes);
app.use("/api/v1/reviews",     reviewRoutes);
app.use("/api/v1/admin",       adminRoutes);
app.use("/api/v1/support",     supportRoutes);

/* ================= 6. HEALTH & 404 ================= */
app.get("/", (_req, res) => res.send("🚀 RentKaroo API running"));

app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

/* ================= 7. GLOBAL ERROR HANDLER ================= */
app.use(errorHandler);

/* ================= 8. START ================= */
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;
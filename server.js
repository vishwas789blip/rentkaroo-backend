import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "express-async-errors";
import cookieParser from "cookie-parser";
import compression from "compression";

import { connectDB } from "./config/database.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.routes.js";
import pgListingRoutes from "./routes/pgListing.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import supportRoutes from "./routes/support.routes.js";

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;

/* ================= SECURITY ================= */

app.use(helmet());
app.use(compression());

/* ================= CORS ================= */

const allowedOrigins = [
  "http://localhost:5173",
  "https://rentkaroo-frontend.vercel.app",
  "https://rentkaroo-frontend-5wai0vgnw.vercel.app",
  "https://rentkaroo-frontend-git-main-vishwasprajapati7980-7769s-projects.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("Blocked CORS origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ================= LOGGER ================= */

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* ================= BODY PARSER ================= */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/* ================= HOME ROUTE ================= */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "RentKaroo PG Booking API 🚀",
    version: "1.0.0",
    healthCheck: "/api/v1/health"
  });
});

/* ================= API ROUTES ================= */

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/pg-listings", pgListingRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/support", supportRoutes);

/* ================= HEALTH CHECK ================= */

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server running successfully",
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

/* ================= 404 HANDLER ================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl
  });
});

/* ================= GLOBAL ERROR HANDLER ================= */

app.use(errorHandler);

/* ================= PROCESS ERROR HANDLING ================= */

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

/* ================= START SERVER ================= */

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;
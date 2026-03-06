import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import "express-async-errors";

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

/* ================= SECURITY & OPTIMIZATION ================= */
app.use(helmet());
app.use(compression());

/* ================= ROBUST CORS CONFIGURATION ================= */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://rentkaroo-frontend.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      // Check if origin is in whitelist OR is a Vercel subdomain
      const isAllowed = allowedOrigins.includes(origin) || 
                        /\.vercel\.app$/.test(origin);

      if (isAllowed) {
        return callback(null, true);
      } else {
        console.error(`CORS blocked for origin: ${origin}`);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Explicitly handle preflight OPTIONS requests
app.options("*", cors());

/* ================= BODY PARSERS ================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* ================= API ROUTES ================= */
// All routes now correctly prefixed according to your file structure
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/pg-listings", pgListingRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/support", supportRoutes);

/* ================= HEALTH & 404 ================= */
app.get("/", (req, res) => res.send("🚀 RentKaroo API running"));

app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

/* ================= GLOBAL ERROR HANDLER ================= */
app.use(errorHandler);

/* ================= START SERVER ================= */
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;
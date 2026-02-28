import express from "express";
import { asyncWrapper } from "../middleware/asyncWrapper.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { bookingLimiter } from "../middleware/rateLimiter.js";
import * as bookingController from "../controllers/booking.controller.js";

const router = express.Router();

// ================= USER ROUTES =================

// Create booking
router.post(
  "/",
  authenticate,
  authorize("user" ),
  bookingLimiter,
  asyncWrapper(bookingController.createBooking)
);

// Get logged-in user bookings
router.get(
  "/my",
  authenticate,
  authorize("user", "pg_owner"),
  asyncWrapper(bookingController.getUserBookings)
);

// Cancel booking
router.post(
  "/:id/cancel",
  authenticate,
  authorize("user"),
  asyncWrapper(bookingController.cancelBooking)
);

// ================= OWNER ROUTES =================

// Get owner bookings
router.get(
  "/owner",
  authenticate,
  authorize("pg_owner", "admin"),
  asyncWrapper(bookingController.getOwnerBookings)
);

// Approve booking
router.post(
  "/:id/approve",
  authenticate,
  authorize("pg_owner", "admin"),
  asyncWrapper(bookingController.approveBooking)
);

// Reject booking
router.post(
  "/:id/reject",
  authenticate,
  authorize("pg_owner", "admin"),
  asyncWrapper(bookingController.rejectBooking)
);

// Owner analytics
router.get(
  "/owner/analytics",
  authenticate,
  authorize("pg_owner", "admin"),
  asyncWrapper(bookingController.getOwnerAnalytics)
);

// ================= SINGLE BOOKING (KEEP LAST) =================
router.get(
  "/:id",
  authenticate,
  asyncWrapper(bookingController.getBooking)
);

export default router;
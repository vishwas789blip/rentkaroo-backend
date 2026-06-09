import express from "express";
import { createBookingSchema } from "../joi/booking.joi.js"; 
import { asyncWrapper } from "../middleware/asyncWrapper.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { bookingLimiter } from "../middleware/rateLimiter.js";
import  validateBody  from "../middleware/validation.middleware.js"; 
import * as bookingController from "../controllers/booking.controller.js";

const router = express.Router();

// Create Booking (Validation added)
router.post(
  "/",
  authenticate,
  authorize("user"),
  bookingLimiter,
  validateBody(createBookingSchema),
  asyncWrapper(bookingController.createBooking)
);

// Get logged-in user bookings
router.get(
  "/my",
  authenticate,
  authorize("user", "pg_owner", "admin"),
  asyncWrapper(bookingController.getUserBookings)
);

// Cancel booking
router.patch(
  "/:id/cancel",
  authenticate,
  authorize("user"),
  asyncWrapper(bookingController.cancelBooking)
);

// Get owner bookings
router.get(
  "/owner",
  authenticate,
  authorize("pg_owner", "admin"),
  asyncWrapper(bookingController.getOwnerBookings)
);

// Approve booking
router.patch(
  "/:id/approve",
  authenticate,
  authorize("pg_owner", "admin"),
  asyncWrapper(bookingController.approveBooking)
);

// Reject booking
router.patch(
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

// Get all bookings (admin)
router.get(
  "/admin/all",
  authenticate,
  authorize("admin"),
  asyncWrapper(bookingController.getAllBookingsAdmin)
);

router.get(
  "/:id",
  authenticate,
  asyncWrapper(bookingController.getBooking)
);

export default router;
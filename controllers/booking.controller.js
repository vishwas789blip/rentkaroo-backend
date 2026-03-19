import Joi from "joi";
import { BookingService } from "../services/booking.service.js";
import { validate } from "../utils/validate.js";

/* ===============================
   Validation Schema
=============================== */

const createBookingSchema = Joi.object({
  pgListingId: Joi.string().required(),

  checkInDate: Joi.date()
    .min("now") // Prevents past bookings
    .required(),

  checkOutDate: Joi.date()
    .greater(Joi.ref("checkInDate"))
    .min(Joi.ref("checkInDate", {
      adjust: (value) => {
        const d = new Date(value);
        return d.setMonth(d.getMonth() + 1); // Adds exactly 1 calendar month
      }
    }))
    .max(Joi.ref("checkInDate", {
      adjust: (value) => {
        const d = new Date(value);
        return d.setFullYear(d.getFullYear() + 1); // Adds exactly 1 year
      }
    }))
    .required()
    .messages({
      "date.min": "Booking must be at least 1 month long",
      "date.max": "Booking cannot exceed 1 year"
    }),

  numberOfRooms: Joi.number()
    .min(1)
    .required(),

  guests: Joi.array().items(
    Joi.object({
      name: Joi.string().min(2).required(),
      email: Joi.string().email().required(),
      phone: Joi.string().pattern(/^[0-9]{10}$/).required()
    })
  ),

  specialRequests: Joi.string().allow("")
});

/* ===============================
   Create Booking
=============================== */

export const createBooking = async (req, res) => {

  try {

    const value = validate(createBookingSchema, req.body);

    const booking = await BookingService.createBooking(
      value,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking
    });

  } catch (error) {

    console.error("Create Booking Error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });

  }

};


/* ===============================
   User Bookings
=============================== */

export const getUserBookings = async (req, res) => {
  try {
    const bookings = await BookingService.getUserBookings(
      req.user.id
    );
    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error("User Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===============================
   Owner Bookings
=============================== */

export const getOwnerBookings = async (req, res) => {
  try {
    const bookings = await BookingService.getOwnerBookings(
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error("Owner Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===============================
   Get Single Booking
=============================== */

export const getBooking = async (req, res) => {

  try {

    const booking = await BookingService.getBookingById(
      req.params.id,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error("Get Booking Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===============================
   Approve Booking
=============================== */

export const approveBooking = async (req, res) => {
  try {
    const booking = await BookingService.approveBooking(
      req.params.id,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: "Booking approved successfully",
      data: booking
    });

  } catch (error) {
    console.error("Approve Booking Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===============================
   Reject Booking
=============================== */

export const rejectBooking = async (req, res) => {
  try {
    const booking = await BookingService.rejectBooking(
      req.params.id,
      req.user.id,
      req.body.rejectionReason
    );
    res.status(200).json({
      success: true,
      message: "Booking rejected successfully",
      data: booking
    });
  } catch (error) {
    console.error("Reject Booking Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===============================
   Cancel Booking
=============================== */

export const cancelBooking = async (req, res) => {
  try {
    const booking = await BookingService.cancelBooking(
      req.params.id,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking
    });

  } catch (error) {
    console.error("Cancel Booking Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===============================
   Owner Analytics
=============================== */

export const getOwnerAnalytics = async (req, res) => {
  try {
    const analytics = await BookingService.getOwnerAnalytics(
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===============================
   Admin - Get All Bookings
=============================== */

export const getAllBookingsAdmin = async (req, res) => {
  try {
    const bookings = await BookingService.getAllBookingsAdmin();
    res.status(200).json({
      success: true,
      data: bookings
    });

  } catch (error) {
    console.error("Admin Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
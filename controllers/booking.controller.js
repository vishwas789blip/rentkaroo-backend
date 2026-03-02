import Joi from "joi";
import { BookingService } from "../services/booking.service.js";
import { validate } from "../utils/validate.js";

const createBookingSchema = Joi.object({
  pgListingId: Joi.string().required(),
  checkInDate: Joi.date().required(),
  checkOutDate: Joi.date().greater(Joi.ref("checkInDate")).required(),
  numberOfRooms: Joi.number().positive().required(),
  guests: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().required(),
    })
  ),
  specialRequests: Joi.string().allow(""),
});

// ================= CREATE =================
export const createBooking = async (req, res) => {
  const value = validate(createBookingSchema, req.body);

  const booking = await BookingService.createBooking(
    value,
    req.user._id
  );

  res.status(201).json({
    success: true,
    message: "Booking created successfully",
    data: booking,
  });
};

// ================= USER BOOKINGS =================
export const getUserBookings = async (req, res) => {
  const bookings = await BookingService.getUserBookings(
    req.user._id
  );

  res.status(200).json({
    success: true,
    data: bookings,
  });
};

// ================= OWNER BOOKINGS =================
export const getOwnerBookings = async (req, res) => {
  const bookings = await BookingService.getOwnerBookings(
    req.user._id
  );

  res.status(200).json({
    success: true,
    data: bookings,
  });
};

// ================= GET SINGLE =================
export const getBooking = async (req, res) => {
  const booking = await BookingService.getBookingById(
    req.params.id,
    req.user._id,
    req.user.role
  );

  res.status(200).json({
    success: true,
    data: booking,
  });
};

// ================= APPROVE =================
export const approveBooking = async (req, res) => {
  const booking = await BookingService.approveBooking(
    req.params.id,
    req.user._id
  );

  res.status(200).json({
    success: true,
    message: "Booking approved",
    data: booking,
  });
};

// ================= REJECT =================
export const rejectBooking = async (req, res) => {
  const booking = await BookingService.rejectBooking(
    req.params.id,
    req.user._id,
    req.body.rejectionReason
  );

  res.status(200).json({
    success: true,
    message: "Booking rejected",
    data: booking,
  });
};

// ================= CANCEL =================
export const cancelBooking = async (req, res) => {
  const booking = await BookingService.cancelBooking(
    req.params.id,
    req.user._id
  );

  res.status(200).json({
    success: true,
    message: "Booking cancelled",
    data: booking,
  });
};

// ================= ANALYTICS =================
export const getOwnerAnalytics = async (req, res) => {
  const analytics = await BookingService.getOwnerAnalytics(
    req.user._id
  );

  res.status(200).json({
    success: true,
    data: analytics,
  });
};
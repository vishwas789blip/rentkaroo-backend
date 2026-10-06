import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import PGListing from "../models/PGListing.js";
import { APIError } from "../middleware/errorHandler.js";

export class BookingService {

  /* ─────────────────────────────────────────────
     CREATE BOOKING
  ───────────────────────────────────────────── */

  static async createBooking(data, userId) {
    const { pgListingId, checkInDate, checkOutDate, numberOfRooms, guests } = data;

    const checkin  = new Date(checkInDate);
    const checkout = new Date(checkOutDate);
    const now      = new Date();

    // Date validations
    if (isNaN(checkin) || isNaN(checkout)) {
      throw new APIError("Invalid date format", 400);
    }

    if (checkin >= checkout) {
      throw new APIError("Check-out must be after check-in", 400);
    }

    if (checkin < now.setHours(0, 0, 0, 0)) {
      throw new APIError("Check-in date cannot be in the past", 400);
    }

    // Listing + duplicate booking check — parallel mein karo
    const [listing, existingBooking] = await Promise.all([
      PGListing.findById(pgListingId),
      Booking.findOne({
        user:      userId,
        pgListing: pgListingId,
        status:    { $in: ["pending", "approved"] },
      }),
    ]);

    if (!listing || listing.isDeleted) {
      throw new APIError("Listing not available", 404);
    }

    if (listing.owner.toString() === userId) {
      throw new APIError("Owner cannot book their own PG", 400);
    }

    if (listing.rooms.availableRooms < numberOfRooms) {
      throw new APIError(
        `Only ${listing.rooms.availableRooms} room(s) available`,
        400
      );
    }

    if (existingBooking) {
      throw new APIError("You already have an active booking for this PG", 400);
    }

    // Overlap check against available rooms
    const overlappingBookings = await Booking.find({
      pgListing:   pgListingId,
      status:      { $in: ["pending", "approved"] },
      checkInDate:  { $lt: checkout },
      checkOutDate: { $gt: checkin },
    });

    const bookedRoomsCount = overlappingBookings.reduce((sum, b) => sum + (b.numberOfRooms || 1), 0);
    const totalRooms = listing.rooms.totalRooms || listing.rooms.availableRooms;

    if (bookedRoomsCount + numberOfRooms > totalRooms) {
      throw new APIError("Not enough rooms available for selected dates", 400);
    }

    // Price calculation
    const duration   = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
    const dailyRate  = listing.pricePerMonth / 30;
    const totalPrice = Math.round(dailyRate * numberOfRooms * duration);

    const booking = await Booking.create({
      user:         userId,
      pgListing:    pgListingId,
      pgOwner:      listing.owner,
      checkInDate:  checkin,
      checkOutDate: checkout,
      numberOfRooms,
      totalPrice,
      duration,
      guests:       guests || [],
      status:       "pending",
    });

    return booking.populate("pgListing", "title pricePerMonth address images");
  }


  /* ─────────────────────────────────────────────
     USER BOOKINGS  (with pagination + status filter)
  ───────────────────────────────────────────── */

  static async getUserBookings(userId, query = {}) {
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const filter = { user: userId };
    if (query.status) filter.status = query.status;

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("pgListing", "title pricePerMonth address images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  /* ─────────────────────────────────────────────
     OWNER BOOKINGS  (with pagination + status filter)
  ───────────────────────────────────────────── */

  static async getOwnerBookings(ownerId, query = {}) {
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const filter = { pgOwner: ownerId };
    if (query.status) filter.status = query.status;

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("pgListing", "title pricePerMonth address images")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  /* ─────────────────────────────────────────────
     GET SINGLE BOOKING
  ───────────────────────────────────────────── */

  static async getBookingById(id, userId, role) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new APIError("Invalid booking ID", 400);
    }

    const booking = await Booking.findById(id)
      .populate("pgListing")
      .populate("user", "name email");

    if (!booking) throw new APIError("Booking not found", 404);

    const isUser  = booking.user._id.toString() === userId;
    const isOwner = booking.pgOwner.toString()  === userId;

    if (role !== "admin" && !isUser && !isOwner) {
      throw new APIError("Unauthorized", 403);
    }

    return booking;
  }


  /* ─────────────────────────────────────────────
     APPROVE BOOKING
  ───────────────────────────────────────────── */

  static async approveBooking(id, userId, role) {
    const booking = await Booking.findById(id);

    if (!booking)                                                       throw new APIError("Booking not found", 404);
    if (role !== "admin" && booking.pgOwner.toString() !== userId)     throw new APIError("Unauthorized", 403);
    if (booking.status !== "pending")                                   throw new APIError("Only pending bookings can be approved", 400);

    // Atomic room reduction — race condition safe
    const updated = await PGListing.findOneAndUpdate(
      {
        _id:                        booking.pgListing,
        "rooms.availableRooms":     { $gte: booking.numberOfRooms },
      },
      {
        $inc: { "rooms.availableRooms": -booking.numberOfRooms },
      },
      { new: true }
    );

    if (!updated) {
      throw new APIError("Rooms no longer available", 400);
    }

    booking.status = "approved";
    await booking.save();

    return booking.populate("pgListing", "title pricePerMonth address images");
  }


  /* ─────────────────────────────────────────────
     REJECT BOOKING
  ───────────────────────────────────────────── */

  static async rejectBooking(id, userId, reason, role) {
    const booking = await Booking.findById(id);

    if (!booking)                                                   throw new APIError("Booking not found", 404);
    if (role !== "admin" && booking.pgOwner.toString() !== userId) throw new APIError("Unauthorized", 403);
    if (booking.status !== "pending")                               throw new APIError("Only pending bookings can be rejected", 400);

    booking.status          = "rejected";
    booking.rejectionReason = reason?.trim() || "Rejected by owner";

    await booking.save();
    return booking;
  }


  /* ─────────────────────────────────────────────
     CANCEL BOOKING
  ───────────────────────────────────────────── */

  static async cancelBooking(id, userId, role) {
    const booking = await Booking.findById(id);

    if (!booking) throw new APIError("Booking not found", 404);

    const isUser  = booking.user.toString()     === userId;
    const isOwner = booking.pgOwner.toString()  === userId;
    const isAdmin = role === "admin";

    if (!isUser && !isOwner && !isAdmin) throw new APIError("Unauthorized", 403);
    if (booking.status === "cancelled")  throw new APIError("Booking already cancelled", 400);
    if (booking.status === "rejected")   throw new APIError("Cannot cancel a rejected booking", 400);

    // Restore rooms only if booking was approved
    if (booking.status === "approved") {
      await PGListing.updateOne(
        { _id: booking.pgListing },
        { $inc: { "rooms.availableRooms": booking.numberOfRooms } }
      );
    }

    booking.status = "cancelled";
    await booking.save();
    return booking;
  }


  /* ─────────────────────────────────────────────
     OWNER ANALYTICS  (single aggregate — fast)
  ───────────────────────────────────────────── */

  static async getOwnerAnalytics(ownerId) {
    const objectId = new mongoose.Types.ObjectId(ownerId);

    const [analytics, monthlyRevenue] = await Promise.all([

      // Single aggregate for all booking stats
      Booking.aggregate([
        { $match: { pgOwner: objectId } },
        {
          $group: {
            _id:              null,
            total:            { $sum: 1 },
            approved:         { $sum: { $cond: [{ $eq: ["$status", "approved"]  }, 1, 0] } },
            pending:          { $sum: { $cond: [{ $eq: ["$status", "pending"]   }, 1, 0] } },
            cancelled:        { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
            rejected:         { $sum: { $cond: [{ $eq: ["$status", "rejected"]  }, 1, 0] } },
            totalRevenue:     { $sum: { $cond: [{ $eq: ["$status", "approved"]  }, "$totalPrice", 0] } },
          },
        },
      ]),

      // Monthly revenue breakdown (last 6 months)
      Booking.aggregate([
        {
          $match: {
            pgOwner:    objectId,
            status:     "approved",
            createdAt:  { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id:     { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            revenue: { $sum: "$totalPrice" },
            count:   { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    const stats = analytics[0] || {
      total: 0, approved: 0, pending: 0,
      cancelled: 0, rejected: 0, totalRevenue: 0,
    };

    return {
      totalBookings:   stats.total,
      approvedBookings: stats.approved,
      pendingBookings:  stats.pending,
      cancelledBookings: stats.cancelled,
      rejectedBookings:  stats.rejected,
      occupancyRate:
        stats.total > 0
          ? ((stats.approved / stats.total) * 100).toFixed(2)
          : "0.00",
      totalRevenue:    stats.totalRevenue,
      monthlyRevenue,
    };
  }


  static async getAllBookingsAdmin(query = {}) {
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const filter = {};

    if (query.status) filter.status = query.status;

    const skip = (page - 1) * limit;

    let queryExec = Booking.find(filter)
      .populate("user",      "name email")
      .populate("pgListing", "title pricePerMonth address images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const [bookings, total] = await Promise.all([
      queryExec,
      Booking.countDocuments(filter),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import PGListing from "../models/PGListing.js";
import { APIError } from "../middleware/errorHandler.js";

export class BookingService {

  // ================= CREATE BOOKING =================
  static async createBooking(data, userId) {
    const { pgListingId, checkInDate, checkOutDate, numberOfRooms, guests } = data;

    const checkin = new Date(checkInDate);
    const checkout = new Date(checkOutDate);

    if (checkin >= checkout)
      throw new APIError("Invalid booking dates", 400);

    const listing = await PGListing.findById(pgListingId);
    if (!listing || listing.isDeleted)
      throw new APIError("Listing not available", 404);

    if (listing.owner.toString() === userId)
      throw new APIError("Owner cannot book their own PG", 400);

    if (listing.rooms.availableRooms < numberOfRooms)
      throw new APIError("Insufficient rooms available", 400);

    // Prevent duplicate active booking
    const existingBooking = await Booking.findOne({
      user: userId,
      pgListing: pgListingId,
      status: { $in: ["pending", "approved"] }
    });

    if (existingBooking)
      throw new APIError("You already have an active booking for this PG", 400);

    const duration = Math.ceil(
      (checkout - checkin) / (1000 * 60 * 60 * 24)
    );

    const dailyRate = listing.pricePerMonth / 30;
    const totalPrice = dailyRate * numberOfRooms * duration;

    const booking = await Booking.create({
      user: userId,
      pgListing: pgListingId,
      pgOwner: listing.owner,
      checkInDate: checkin,
      checkOutDate: checkout,
      numberOfRooms,
      totalPrice,
      duration,
      guests: guests || [],
      status: "pending",
    });

    return booking.populate("pgListing", "title pricePerMonth");
  }

  // ================= USER BOOKINGS =================
  static async getUserBookings(userId) {
    return Booking.find({ user: userId })
      .populate("pgListing", "title pricePerMonth")
      .sort({ createdAt: -1 });
  }

  // ================= OWNER BOOKINGS =================
  static async getOwnerBookings(ownerId) {
    return Booking.find({ pgOwner: ownerId })
      .populate("pgListing", "title pricePerMonth")
      .populate("user", "name email")
      .sort({ createdAt: -1 });
  }

  // ================= GET SINGLE BOOKING =================
  static async getBookingById(id, userId, role) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new APIError("Invalid booking ID", 400);

    const booking = await Booking.findById(id)
      .populate("pgListing")
      .populate("user", "name email");

    if (!booking)
      throw new APIError("Booking not found", 404);

    if (
      role !== "admin" &&
      booking.user._id.toString() !== userId &&
      booking.pgOwner.toString() !== userId
    ) {
      throw new APIError("Unauthorized", 403);
    }

    return booking;
  }

  // ================= APPROVE BOOKING =================
  static async approveBooking(id, ownerId) {
    const booking = await Booking.findById(id);
    if (!booking) throw new APIError("Booking not found", 404);

    if (booking.pgOwner.toString() !== ownerId)
      throw new APIError("Unauthorized", 403);

    if (booking.status !== "pending")
      throw new APIError("Only pending bookings can be approved", 400);

    const listing = await PGListing.findById(booking.pgListing);
    if (!listing)
      throw new APIError("Listing not found", 404);

    if (listing.rooms.availableRooms < booking.numberOfRooms)
      throw new APIError("Rooms no longer available", 400);

    // Reduce available rooms
    listing.rooms.availableRooms -= booking.numberOfRooms;
    await listing.save();

    booking.status = "approved";
    await booking.save();

    return booking;
  }

  // ================= REJECT BOOKING =================
  static async rejectBooking(id, ownerId, reason) {
    const booking = await Booking.findById(id);
    if (!booking) throw new APIError("Booking not found", 404);

    if (booking.pgOwner.toString() !== ownerId)
      throw new APIError("Unauthorized", 403);

    if (booking.status !== "pending")
      throw new APIError("Only pending bookings can be rejected", 400);

    booking.status = "rejected";
    booking.rejectionReason = reason || "Rejected by owner";
    await booking.save();

    return booking;
  }

  // ================= CANCEL BOOKING =================
  static async cancelBooking(id, userId) {
    const booking = await Booking.findById(id);
    if (!booking) throw new APIError("Booking not found", 404);

    if (
      booking.user.toString() !== userId &&
      booking.pgOwner.toString() !== userId
    )
      throw new APIError("Unauthorized", 403);

    if (booking.status === "cancelled")
      throw new APIError("Booking already cancelled", 400);

    // Restore rooms if booking was approved
    if (booking.status === "approved") {
      const listing = await PGListing.findById(booking.pgListing);
      if (listing) {
        listing.rooms.availableRooms += booking.numberOfRooms;
        await listing.save();
      }
    }

    booking.status = "cancelled";
    await booking.save();

    return booking;
  }

  // ================= OWNER ANALYTICS =================
  static async getOwnerAnalytics(ownerId) {
    const objectId = new mongoose.Types.ObjectId(ownerId);

    const totalBookings = await Booking.countDocuments({ pgOwner: ownerId });

    const approvedBookings = await Booking.countDocuments({
      pgOwner: ownerId,
      status: "approved"
    });

    const revenueAgg = await Booking.aggregate([
      { $match: { pgOwner: objectId, status: "approved" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

    return {
      totalBookings,
      approvedBookings,
      occupancyRate:
        totalBookings > 0
          ? ((approvedBookings / totalBookings) * 100).toFixed(2)
          : 0,
      totalRevenue: revenueAgg[0]?.total || 0,
    };
  }
}
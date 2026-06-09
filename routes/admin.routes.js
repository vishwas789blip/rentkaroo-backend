import express from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { APIError } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import PGListing from "../models/PGListing.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";

const router = express.Router();

// All admin routes require authentication + admin role
// Apply once here instead of repeating on every route
router.use(authenticate, authorize("admin"));

/* ─────────────────────────────────────────────
   Pagination helper
───────────────────────────────────────────── */

function paginate(query) {
  const page  = Math.max(1, Number(query.page)  || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

/* ─────────────────────────────────────────────
   Dashboard stats
   GET /api/v1/admin/dashboard/stats
───────────────────────────────────────────── */

router.get("/dashboard/stats", async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    totalListings,
    pendingListings,
    totalBookings,
    totalReviews,
    revenueData,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    PGListing.countDocuments({ isDeleted: { $ne: true } }),
    PGListing.countDocuments({ isDeleted: { $ne: true }, status: "pending" }),
    Booking.countDocuments(),
    Review.countDocuments({ isDeleted: false }),
    Booking.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      totalListings,
      pendingListings,
      totalBookings,
      totalReviews,
      totalRevenue: revenueData[0]?.total || 0,
    },
  });
});

/* ─────────────────────────────────────────────
   Users
───────────────────────────────────────────── */

// GET /api/v1/admin/users?page=1&limit=10&role=&isActive=
router.get("/users", async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};

  if (req.query.role)     filter.role     = req.query.role;
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === "true";
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { users, pagination: { total, page, pages: Math.ceil(total / limit) } },
  });
});

// GET /api/v1/admin/users/:id
router.get("/users/:id", async (req, res) => {
  const user = await User.findById(req.params.id).select("-password").lean();
  if (!user) throw new APIError("User not found", 404);

  res.status(200).json({ success: true, data: { user } });
});

// PATCH /api/v1/admin/users/:id/suspend  — soft deactivate
router.patch("/users/:id/suspend", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new APIError("User not found", 404);
  if (user.role === "admin") throw new APIError("Cannot suspend another admin", 403);

  user.isActive = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User suspended successfully",
    data: { user: { id: user._id, name: user.name, email: user.email, isActive: user.isActive } },
  });
});

// PATCH /api/v1/admin/users/:id/activate  — reactivate
router.patch("/users/:id/activate", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new APIError("User not found", 404);

  user.isActive = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User activated successfully",
    data: { user: { id: user._id, name: user.name, email: user.email, isActive: user.isActive } },
  });
});

// DELETE /api/v1/admin/users/:id  — soft delete (isActive: false + flag)
// Hard delete is irreversible and loses booking/review history.
// Use soft delete so data integrity is preserved.
router.delete("/users/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new APIError("User not found", 404);
  if (user.role === "admin") throw new APIError("Cannot delete an admin account", 403);

  user.isActive  = false;
  user.isDeleted = true;
  user.deletedAt = new Date();
  await user.save();

  res.status(200).json({ success: true, message: "User deleted successfully" });
});

/* ─────────────────────────────────────────────
   Listings
───────────────────────────────────────────── */

// GET /api/v1/admin/listings?page=1&limit=10&status=pending
router.get("/listings", async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { isDeleted: { $ne: true } };

  // Filter by status: pending | approved | rejected
  if (req.query.status) filter.status = req.query.status;

  const [listings, total] = await Promise.all([
    PGListing.find(filter)
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PGListing.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { listings, pagination: { total, page, pages: Math.ceil(total / limit) } },
  });
});

// PATCH /api/v1/admin/listings/:id/verify  — approve + verify
router.patch("/listings/:id/verify", async (req, res) => {
  const listing = await PGListing.findById(req.params.id);
  if (!listing || listing.isDeleted) throw new APIError("Listing not found", 404);

  listing.status     = "approved";
  listing.isVerified = true;
  await listing.save();

  res.status(200).json({
    success: true,
    message: "Listing approved and verified",
    data: { listing },
  });
});

// PATCH /api/v1/admin/listings/:id/reject
router.patch("/listings/:id/reject", async (req, res) => {
  const listing = await PGListing.findById(req.params.id);
  if (!listing || listing.isDeleted) throw new APIError("Listing not found", 404);

  listing.status = "rejected";
  await listing.save();

  res.status(200).json({
    success: true,
    message: "Listing rejected",
    data: { listing },
  });
});

// DELETE /api/v1/admin/listings/:id  — soft delete (matches rest of codebase)
router.delete("/listings/:id", async (req, res) => {
  const listing = await PGListing.findById(req.params.id);
  if (!listing || listing.isDeleted) throw new APIError("Listing not found", 404);

  listing.isDeleted = true;
  listing.deletedAt = new Date();
  await listing.save();

  res.status(200).json({ success: true, message: "Listing deleted successfully" });
});

/* ─────────────────────────────────────────────
   Bookings
───────────────────────────────────────────── */

// GET /api/v1/admin/bookings?page=1&limit=10&status=
router.get("/bookings", async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};

  if (req.query.status) filter.status = req.query.status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("user", "name email")
      .populate("pgListingId", "title address")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { bookings, pagination: { total, page, pages: Math.ceil(total / limit) } },
  });
});

/* ─────────────────────────────────────────────
   Reviews
───────────────────────────────────────────── */

// GET /api/v1/admin/reviews?page=1&limit=10
router.get("/reviews", async (req, res) => {
  const { page, limit, skip } = paginate(req.query);

  const [reviews, total] = await Promise.all([
    Review.find({ isDeleted: false })
      .populate("user", "name email")
      .populate("pgListing", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments({ isDeleted: false }),
  ]);

  res.status(200).json({
    success: true,
    data: { reviews, pagination: { total, page, pages: Math.ceil(total / limit) } },
  });
});

// DELETE /api/v1/admin/reviews/:id  — soft delete abusive/spam reviews
router.delete("/reviews/:id", async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review || review.isDeleted) throw new APIError("Review not found", 404);

  review.isDeleted = true;
  review.deletedAt = new Date();
  await review.save();

  res.status(200).json({ success: true, message: "Review deleted successfully" });
});

export default router;
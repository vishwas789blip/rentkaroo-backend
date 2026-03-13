import express from "express";
import { asyncWrapper } from "../middleware/asyncWrapper.js";
import { authenticate, authorize } from "../middleware/auth.js";

import User from "../models/User.js";
import PGListing from "../models/PGListing.js";
import Booking from "../models/Booking.js";

import { APIError } from "../middleware/errorHandler.js";

const router = express.Router();

/* ===============================
    Dashboard Stats (Optimized)
=============================== */
router.get(
  "/dashboard/stats",
  authenticate,
  authorize("ADMIN"), // Pro-tip: Match the case used in AuthService
  asyncWrapper(async (req, res) => {
    const [totalUsers, totalListings, totalBookings, revenueData] = await Promise.all([
      User.countDocuments(),
      PGListing.countDocuments(),
      Booking.countDocuments(),
      // Aggregation: Database does the math, much faster!
      Booking.aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalListings,
        totalBookings,
        totalRevenue: revenueData[0]?.total || 0
      }
    });
  })
);

/* ===============================
   Get All Users
=============================== */

router.get(
  "/users",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const { page = 1, limit = 10 } = req.query;

    const users = await User.find()
      .select("-password")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments();

    res.status(200).json({
      success: true,
      message: "All users",
      data: users,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });

  })
);


/* ===============================
   Delete User
=============================== */

router.delete(
  "/users/:id",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });

  })
);


/* ===============================
    Suspend User (With Check)
=============================== */
router.patch(
  "/users/:id/suspend",
  authenticate,
  authorize("ADMIN"),
  asyncWrapper(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false }, 
      { new: true }
    );

    if (!user) throw new APIError("User not found", 404);

    res.status(200).json({
      success: true,
      message: "User account deactivated",
      data: user
    });
  })
);



/* ===============================
   Get All Listings
=============================== */

router.get(
  "/listings",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const listings = await PGListing.find()
      .populate("owner", "name email");

    res.status(200).json({
      success: true,
      message: "All listings",
      data: listings
    });

  })
);

/* ===============================
    Verify Listing (With Check)
=============================== */
router.patch(
  "/listings/:id/verify",
  authenticate,
  authorize("ADMIN"),
  asyncWrapper(async (req, res) => {
    const listing = await PGListing.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );

    if (!listing) throw new APIError("Listing not found", 404);

    res.status(200).json({
      success: true,
      message: "Listing verified",
      data: listing
    });
  })
);

/* ===============================
   Reject Listing
=============================== */

router.patch(
  "/listings/:id/reject",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const listing = await PGListing.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Listing rejected",
      data: listing
    });

  })
);


/* ===============================
   Delete Listing
=============================== */

router.delete(
  "/listings/:id",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    await PGListing.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Listing deleted successfully"
    });

  })
);


/* ===============================
   Get All Bookings
=============================== */

router.get(
  "/bookings",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const bookings = await Booking.find()
      .populate("user", "name email")
      .populate("pgListingId", "title");

    res.status(200).json({
      success: true,
      message: "All bookings",
      data: bookings
    });

  })
);

export default router;
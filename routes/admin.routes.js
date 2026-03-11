import express from "express";
import { asyncWrapper } from "../middleware/asyncWrapper.js";
import { authenticate, authorize } from "../middleware/auth.js";

import User from "../models/User.js";
import PGListing from "../models/PGListing.js";
import Booking from "../models/Booking.js";

const router = express.Router();

/* ===============================
   Dashboard Stats
=============================== */

router.get(
  "/dashboard/stats",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const totalUsers = await User.countDocuments();

    const totalListings = await PGListing.countDocuments();

    const totalBookings = await Booking.countDocuments();

    const approvedBookings = await Booking.find({
      status: "approved"
    });

    const totalRevenue = approvedBookings.reduce(
      (sum, booking) => sum + (booking.totalPrice || 0),
      0
    );

    res.status(200).json({
      success: true,
      message: "Dashboard stats",
      data: {
        totalUsers,
        totalListings,
        totalBookings,
        totalRevenue
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
   Suspend User
=============================== */

router.patch(
  "/users/:id/suspend",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isSuspended: true },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "User suspended",
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
   Verify Listing
=============================== */

router.patch(
  "/listings/:id/verify",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const listing = await PGListing.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );

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
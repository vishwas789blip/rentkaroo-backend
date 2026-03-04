import express from "express";
import { asyncWrapper } from "../middleware/asyncWrapper.js";
import { authenticate, authorize } from "../middleware/auth.js";

import User from "../models/User.js";
import PGListing from "../models/PGListing.js";
import Booking from "../models/Booking.js";

const router = express.Router();


// ================= Dashboard Stats =================
router.get(
  "/dashboard/stats",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const totalUsers = await User.countDocuments();
    const totalListings = await PGListing.countDocuments();
    const totalBookings = await Booking.countDocuments();

    const bookings = await Booking.find({ status: "approved" });

    const totalRevenue = bookings.reduce(
      (sum, b) => sum + (b.totalPrice || 0),
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


// ================= Get All Users =================
router.get(
  "/users",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      message: "All users",
      data: users
    });
  })
);


// ================= Verify Listing =================
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

export default router;
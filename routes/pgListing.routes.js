import express from "express";
import { asyncWrapper } from "../middleware/asyncWrapper.js";
import { authenticate, authorize, optionalAuth } from "../middleware/auth.js";
import * as pgListingController from "../controllers/pgListing.controller.js";
import upload from "../middleware/upload.js";

const router = express.Router();

/* ===============================
   PUBLIC ROUTES
=============================== */

// Get all listings
router.get(
  "/",
  optionalAuth,
  asyncWrapper(pgListingController.getListings)
);

// Search listings
router.get(
  "/search",
  asyncWrapper(pgListingController.searchListings)
);

// Get single listing
router.get(
  "/:id",
  asyncWrapper(pgListingController.getListing)
);


/* ===============================
   OWNER ROUTES
=============================== */

// Get owner's listings
router.get(
  "/owner/my-listings",
  authenticate,
  authorize("pg_owner", "admin"),
  asyncWrapper(pgListingController.getOwnerListings)
);

// Create listing
router.post(
  "/",
  authenticate,
  authorize("pg_owner", "admin"),
  upload.array("images", 5),
  asyncWrapper(pgListingController.createListing)
);

// Update listing
router.put(
  "/:id",
  authenticate,
  authorize("pg_owner", "admin"),
  upload.array("images", 5),
  asyncWrapper(pgListingController.updateListing)
);

// Delete listing
router.delete(
  "/:id",
  authenticate,
  authorize("pg_owner", "admin"),
  asyncWrapper(pgListingController.deleteListing)
);

// Update room availability
router.patch(
  "/:id/availability",
  authenticate,
  authorize("pg_owner", "admin"),
  asyncWrapper(pgListingController.updateAvailability)
);


/* ===============================
   ADMIN ROUTES
=============================== */

// Approve listing
router.patch(
  "/:id/approve",
  authenticate,
  authorize("admin"),
  asyncWrapper(pgListingController.approveListing)
);

// Reject listing
router.patch(
  "/:id/reject",
  authenticate,
  authorize("admin"),
  asyncWrapper(pgListingController.rejectListing)
);

export default router;
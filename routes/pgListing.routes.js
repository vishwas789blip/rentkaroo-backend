import express from "express";
import { authenticate, authorize, optionalAuth } from "../middleware/auth.middleware.js";
import * as pgListingController from "../controllers/pgListing.controller.js";
import upload from "../middleware/upload.js";
import {
  listingSchema,
  updateListingSchema,
  availabilitySchema, 
  parseListingBody
} from "../joi/pgListing.joi.js";
import validateBody from "../middleware/validation.middleware.js";

const router = express.Router();

/* ─────────────────────────────────────────────
   Public routes
───────────────────────────────────────────── */

// GET /api/v1/pg-listings
router.get("/", optionalAuth, pgListingController.getListings);

/* ─────────────────────────────────────────────
   Owner routes  (static segments — must be before /:id)
───────────────────────────────────────────── */

router.get(
  "/owner/my-listings",
  authenticate,
  authorize("pg_owner", "admin"),
  pgListingController.getOwnerListings
);

// POST /api/v1/pg-listings 
router.post(
  "/",
  authenticate,
  authorize("pg_owner", "admin"),
  upload.array("images", 5),
  (req, res, next) => {
    req.body = parseListingBody(req.body); // flatten → nested
    next();
  },
  validateBody(listingSchema),
  pgListingController.createListing
);

/* ─────────────────────────────────────────────
   Param routes  /:id  (always last)
───────────────────────────────────────────── */

router.get("/:id", optionalAuth, pgListingController.getListing);

// PUT /api/v1/pg-listings/:id 
router.put(
  "/:id",
  authenticate,
  authorize("pg_owner", "admin"),
  upload.array("images", 5),
  (req, res, next) => {
    req.body = parseListingBody(req.body);
    next();
  },
  validateBody(updateListingSchema),
  pgListingController.updateListing
);

router.delete(
  "/:id",
  authenticate,
  authorize("pg_owner", "admin"),
  pgListingController.deleteListing
);

// PATCH /api/v1/pg-listings/:id/availability 
router.patch(
  "/:id/availability",
  authenticate,
  authorize("pg_owner", "admin"),
  validateBody(availabilitySchema), 
  pgListingController.updateAvailability
);

export default router;
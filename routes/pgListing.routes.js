import express from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import * as pgListingController from '../controllers/pgListing.controller.js';
import upload from "../middleware/upload.js";

const router = express.Router();

// Public Routes
router.get('/', optionalAuth, asyncWrapper(pgListingController.getListings));
router.get('/search', asyncWrapper(pgListingController.searchListings));

// Protected Owner Routes (MUST come before :id)
router.get(
  '/owner/my-listings',
  authenticate,
  authorize('pg_owner', 'admin'),
  asyncWrapper(pgListingController.getOwnerListings)
);

router.post(
  "/",
  authenticate,
  authorize("pg_owner", "admin"),
  upload.array("images", 5), // max 5 images
  asyncWrapper(pgListingController.createListing)
);

router.put(
  '/:id',
  authenticate,
  authorize('pg_owner', 'admin'),
  asyncWrapper(pgListingController.updateListing)
);

router.delete(
  '/:id',
  authenticate,
  authorize('pg_owner', 'admin'),
  asyncWrapper(pgListingController.deleteListing)
);

router.patch(
  '/:id/availability',
  authenticate,
  authorize('pg_owner', 'admin'),
  asyncWrapper(pgListingController.updateAvailability)
);

// Keep :id LAST
router.get('/:id', asyncWrapper(pgListingController.getListing));

export default router;
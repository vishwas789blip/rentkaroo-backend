import express from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper.js';
import { authenticate, authorize } from '../middleware/auth.js';
import * as reviewController from '../controllers/review.controller.js';

const router = express.Router();

// Public Routes

// Get reviews for a listing
router.get(
  '/listing/:listingId',
  asyncWrapper(reviewController.getListingReviews)
);

// Protected Routes

// Get logged-in user's reviews
router.get(
  '/user/my-reviews',
  authenticate,
  authorize('user'),
  asyncWrapper(reviewController.getUserReviews)
);

// Create review
router.post(
  '/',
  authenticate,
  authorize('user', 'pg_owner', 'admin'),
  asyncWrapper(reviewController.createReview)
);

// Update review
router.put(
  '/:id',
  authenticate,
  authorize('user'),
  asyncWrapper(reviewController.updateReview)
);

// Delete review
router.delete(
  '/:id',
  authenticate,
  authorize('user'),
  asyncWrapper(reviewController.deleteReview)
);

// Mark review helpful
router.post(
  '/:id/helpful',
  asyncWrapper(reviewController.markHelpful)
);

// Single Review Route (LAST)
router.get(
  '/:id',
  asyncWrapper(reviewController.getReview)
);

export default router;
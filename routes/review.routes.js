import express from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper.js';
import { authenticate, authorize } from '../middleware/auth.js';
import * as reviewController from '../controllers/review.controller.js';

const router = express.Router();

// Public Routes
router.get('/listing/:listingId', asyncWrapper(reviewController.getListingReviews));
router.get('/:id', asyncWrapper(reviewController.getReview));

// Protected Routes
router.get(
  '/user/my-reviews',
  authenticate,
  authorize('user'),
  asyncWrapper(reviewController.getUserReviews)
);

// Ensure this matches the controller function name exactly

router.post(
  '/',
  authenticate,
  authorize('user'),
  asyncWrapper(reviewController.createReview)
);

router.put(
  '/:id',
  authenticate,
  authorize('user'),
  asyncWrapper(reviewController.updateReview)
);

router.delete(
  '/:id',
  authenticate,
  authorize('user'),
  asyncWrapper(reviewController.deleteReview)
);

router.post('/:id/helpful', asyncWrapper(reviewController.markHelpful));

export default router;
import express from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import * as reviewController from "../controllers/review.controller.js";
import  validateBody  from "../middleware/validation.middleware.js";
import { createReviewSchema, updateReviewSchema } from "../joi/review.joi.js";
import { reviewLimiter } from "../middleware/rateLimiter.js"; 

const router = express.Router();

/* ─────────────────────────────────────────────
   Public routes
───────────────────────────────────────────── */

// GET /api/v1/reviews/listing/:listingId
router.get("/listing/:listingId", reviewController.getListingReviews);

/* ─────────────────────────────────────────────
   Protected static routes  (before /:id)
───────────────────────────────────────────── */

// GET /api/v1/reviews/user/my-reviews
router.get(
  "/user/my-reviews",
  authenticate,
  reviewController.getUserReviews
);

// POST /api/v1/reviews 
router.post(
  "/",
  authenticate,
  reviewLimiter, 
  validateBody(createReviewSchema), 
  reviewController.createReview
);

/* ─────────────────────────────────────────────
   Param routes  /:id  (always last)
───────────────────────────────────────────── */

// GET /api/v1/reviews/:id
router.get("/:id", reviewController.getReview);

// PUT /api/v1/reviews/:id 
router.put(
  "/:id",
  authenticate,
  validateBody(updateReviewSchema), 
  reviewController.updateReview
);

// DELETE /api/v1/reviews/:id
router.delete(
  "/:id",
  authenticate,
  reviewController.deleteReview
);

// PATCH /api/v1/reviews/:id/helpful 
router.patch(
  "/:id/helpful",
  authenticate,
  reviewLimiter, 
  reviewController.markHelpful
);

export default router;
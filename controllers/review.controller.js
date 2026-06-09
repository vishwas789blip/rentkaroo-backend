import Joi from "joi";
import { ReviewService } from "../services/review.service.js";
import { APIError } from "../middleware/errorHandler.js";


/* ─────────────────────────────────────────────
   Get reviews for a listing
   GET /api/v1/reviews/listing/:listingId
───────────────────────────────────────────── */

export const getListingReviews = async (req, res) => {
  const reviews = await ReviewService.getReviewsByListing(req.params.listingId);

  res.status(200).json({
    success: true,
    data:    reviews,
  });
};

/* ─────────────────────────────────────────────
   Get single review
   GET /api/v1/reviews/:id
───────────────────────────────────────────── */

export const getReview = async (req, res) => {
  const review = await ReviewService.getReviewById(req.params.id);

  res.status(200).json({
    success: true,
    data:    review,
  });
};

/* ─────────────────────────────────────────────
   Get current user's reviews
   GET /api/v1/reviews/user/my-reviews
───────────────────────────────────────────── */

export const getUserReviews = async (req, res) => {
  const reviews = await ReviewService.getUserReviews(req.user.id);

  res.status(200).json({
    success: true,
    data:    reviews,
  });
};

/* ─────────────────────────────────────────────
   Create review
   POST /api/v1/reviews
───────────────────────────────────────────── */

export const createReview = async (req, res) => {
  const value  = validateBody(createReviewSchema, req.body);
  const review = await ReviewService.createReview(value, req.user.id);

  res.status(201).json({
    success: true,
    message: "Review created successfully",
    data:    review,
  });
};

/* ─────────────────────────────────────────────
   Update review
   PUT /api/v1/reviews/:id
───────────────────────────────────────────── */

export const updateReview = async (req, res) => {
  const value  = validateBody(updateReviewSchema, req.body);
  const review = await ReviewService.updateReview(req.params.id, value, req.user.id);

  res.status(200).json({
    success: true,
    message: "Review updated successfully",
    data:    review,
  });
};

/* ─────────────────────────────────────────────
   Delete review
   DELETE /api/v1/reviews/:id
───────────────────────────────────────────── */

export const deleteReview = async (req, res) => {
  await ReviewService.deleteReview(req.params.id, req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
};

/* ─────────────────────────────────────────────
   Toggle helpful vote
   PATCH /api/v1/reviews/:id/helpful
───────────────────────────────────────────── */

export const markHelpful = async (req, res) => {
  const review = await ReviewService.markHelpful(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: review.votedHelpful ? "Marked as helpful" : "Removed helpful vote",
    data:    review,
  });
};
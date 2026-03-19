import Joi from "joi";
import { ReviewService } from "../services/review.service.js";
import { validate } from "../utils/validate.js";

/* ===============================
   Validation Schemas
=============================== */
const createReviewSchema = Joi.object({
  listingId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(10).max(1000).required()
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(10).max(1000).required()
});

/* ===============================
   Get Reviews by Listing
=============================== */

export const getListingReviews = async (req, res) => {
  try {
    const reviews = await ReviewService.getReviewsByListing(
      req.params.listingId
    );

    res.status(200).json({
      success: true,
      data: reviews || []
    });

  } catch (error) {
    console.error("Get Reviews Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===============================
   Create Review
=============================== */
export const createReview = async (req, res) => {
  try {
    const value = validate(createReviewSchema, req.body);
    const review = await ReviewService.createReview(
      value,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review
    });

  } catch (error) {
    console.error("Create Review Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===============================
   Update Review
=============================== */

export const updateReview = async (req, res) => {
  try {
    const value = validate(updateReviewSchema, req.body);
    const review = await ReviewService.updateReview(
      req.params.id,
      value,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review
    });

  } catch (error) {
    console.error("Update Review Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};
/* ===============================
   Delete Review
=============================== */

export const deleteReview = async (req, res) => {
  try {
    await ReviewService.deleteReview(
      req.params.id,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });

  } catch (error) {
    console.error("Delete Review Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===============================
   Get Single Review
=============================== */
export const getReview = async (req, res) => {
  try {
    const review = await ReviewService.getReviewById(
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error("Get Review Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===============================
   Get User Reviews
=============================== */
export const getUserReviews = async (req, res) => {
  try {
    const reviews = await ReviewService.getUserReviews(req.user.id);

    res.status(200).json({
      success: true,
      data: reviews || []
    });

  } catch (error) {
    console.error("Get User Reviews Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===============================
   Mark Review Helpful
=============================== */
export const markHelpful = async (req, res) => {
  try {
    const review = await ReviewService.markHelpful(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      message: "Marked as helpful",
      data: review
    });

  } catch (error) {
    console.error("Mark Helpful Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};
import Joi from 'joi';
import Review from '../models/Review.js';
import { ReviewService } from '../services/review.service.js';
import { validate } from '../utils/validate.js';

// ===============================
// Validation Schema
// ===============================

const createReviewSchema = Joi.object({
  listingId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(10).max(1000).required()
});

// ===============================
// Get Reviews by Listing
// ===============================

export const getListingReviews = async (req, res) => {
  try {
    console.log("Listing ID:", req.params.listingId);

    const reviews = await ReviewService.getReviewsByListing(req.params.listingId);

    console.log("Reviews found:", reviews);

    res.status(200).json({
      success: true,
      data: reviews || []
    });

  } catch (error) {
    console.error("Review Error FULL:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ===============================
// Create Review
// ===============================

export const createReview = async (req, res) => {
  try {

    const value = validate(createReviewSchema, req.body);

    const review = await ReviewService.createReview(
      value,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
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

// Delete Review

export const deleteReview = async (req, res) => {
  try {
    await ReviewService.deleteReview(
      req.params.id,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error("Delete Review Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// ===============================
// (Optional) Get Single Review
// ===============================

export const getReview = async (req, res) => {
  try {
    const review = await ReviewService.getReviewById(req.params.id);

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


export const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if the logged-in user owns the review
    if (review.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own review",
      });
    }

    // Update fields
    review.rating = rating;
    review.comment = comment;

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review,
    });

  } catch (error) {
    console.error("Update review error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating review",
    });
  }
};
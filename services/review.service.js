import mongoose from "mongoose";
import Review from "../models/Review.js";
import PGListing from "../models/PGListing.js";
import { APIError } from "../middleware/errorHandler.js";

export class ReviewService {

  /* ─────────────────────────────────────────────
     Get reviews for a listing
  ───────────────────────────────────────────── */

  static async getReviewsByListing(listingId) {
    return Review.find({ pgListing: listingId, isDeleted: false })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .lean();
  }

  /* ─────────────────────────────────────────────
     Get all reviews by a user
  ───────────────────────────────────────────── */

  static async getUserReviews(userId) {
    return Review.find({ user: userId, isDeleted: false })
      .populate("pgListing", "title")
      .sort({ createdAt: -1 })
      .lean();
  }

  /* ─────────────────────────────────────────────
     Get single review
  ───────────────────────────────────────────── */

  static async getReviewById(id) {
    const review = await Review.findById(id)
      .populate("user", "name")
      .populate("pgListing", "title");

    if (!review || review.isDeleted) {
      throw new APIError("Review not found", 404);
    }
    return review;
  }

  /* ─────────────────────────────────────────────
     Create review
     One review per user per listing enforced here
     and should also have a unique index on the model:
       { user: 1, pgListing: 1, isDeleted: 1 }
  ───────────────────────────────────────────── */

  static async createReview(data, userId) {
    const listing = await PGListing.findById(data.listingId);
    if (!listing || listing.isDeleted) {
      throw new APIError("Listing not found", 404);
    }

    // Prevent owners from reviewing their own listing
    if (listing.owner.toString() === userId) {
      throw new APIError("You cannot review your own listing", 403);
    }

    const exists = await Review.findOne({
      user:      userId,
      pgListing: data.listingId,
      isDeleted: false,
    });
    if (exists) {
      throw new APIError("You have already reviewed this listing", 400);
    }

    const review = await Review.create({
      rating:    data.rating,
      comment:   data.comment,
      user:      userId,
      pgListing: data.listingId,
      pgOwner:   listing.owner,
    });

    await this.updateListingRating(data.listingId);
    return review.populate("user", "name");
  }

  /* ─────────────────────────────────────────────
     Update review
  ───────────────────────────────────────────── */

  static async updateReview(reviewId, data, userId) {
    const review = await Review.findById(reviewId);
    if (!review || review.isDeleted) throw new APIError("Review not found", 404);

    if (review.user.toString() !== userId) {
      throw new APIError("You can only edit your own review", 403);
    }

    Object.assign(review, data);
    await review.save();
    await this.updateListingRating(review.pgListing);
    return review;
  }

  /* ─────────────────────────────────────────────
     Delete review
     Owners can delete their own reviews.
     Admins can delete any review (e.g. abusive content).
  ───────────────────────────────────────────── */

  static async deleteReview(reviewId, userId, role) {
    const review = await Review.findById(reviewId);
    if (!review || review.isDeleted) throw new APIError("Review not found", 404);

    const isOwner = review.user.toString() === userId;
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      throw new APIError("You can only delete your own review", 403);
    }

    review.isDeleted = true;
    review.deletedAt = new Date();
    await review.save();
    await this.updateListingRating(review.pgListing);
  }

  /* ─────────────────────────────────────────────
     Toggle helpful vote
     FIX: indexOf() on ObjectIds always returns -1
     because ObjectId !== ObjectId by reference.
     Use .toString() comparison on each element instead.

     FIX: helpfulCount was stored as a separate number
     that could drift from helpfulBy.length if an error
     occurred mid-save. Now it's always derived from
     the array length — single source of truth.
  ───────────────────────────────────────────── */

  static async markHelpful(reviewId, userId) {
    const review = await Review.findById(reviewId);
    if (!review || review.isDeleted) throw new APIError("Review not found", 404);

    // Prevent voting on your own review
    if (review.user.toString() === userId) {
      throw new APIError("You cannot mark your own review as helpful", 403);
    }

    const userIdStr  = userId.toString();
    const alreadyVoted = review.helpfulBy.some((id) => id.toString() === userIdStr);

    if (alreadyVoted) {
      // Remove vote
      review.helpfulBy = review.helpfulBy.filter((id) => id.toString() !== userIdStr);
    } else {
      // Add vote
      review.helpfulBy.push(userId);
    }

    // Derive count from array — never store a separate counter
    review.helpfulCount = review.helpfulBy.length;

    await review.save();

    // Let the controller know which direction the toggle went
    review.votedHelpful = !alreadyVoted;
    return review;
  }

  /* ─────────────────────────────────────────────
     Recalculate listing's average rating
     Called after every create / update / delete.
     Uses aggregation so it's always accurate —
     no risk of drift from manual increment/decrement.
  ───────────────────────────────────────────── */

  static async updateListingRating(listingId) {
    const [stats] = await Review.aggregate([
      {
        $match: {
          pgListing: new mongoose.Types.ObjectId(listingId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id:     "$pgListing",
          average: { $avg: "$rating" },
          count:   { $sum: 1 },
        },
      },
    ]);

    await PGListing.findByIdAndUpdate(listingId, {
      "rating.average": stats ? parseFloat(stats.average.toFixed(1)) : 0,
      "rating.count":   stats ? stats.count : 0,
    });
  }
}

export default ReviewService;
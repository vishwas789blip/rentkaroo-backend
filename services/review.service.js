import mongoose from "mongoose";
import Review from "../models/Review.js";
import PGListing from "../models/PGListing.js";
import { APIError } from "../middleware/errorHandler.js";

export class ReviewService {

  /* ================= GET REVIEWS BY LISTING ================= */

  static async getReviewsByListing(listingId) {

    return Review.find({
      pgListing: listingId,
      isDeleted: false
    })
      .populate("user", "name")
      .sort({ createdAt: -1 });

  }


  /* ================= GET USER REVIEWS ================= */

  static async getUserReviews(userId) {

    return Review.find({
      user: userId,
      isDeleted: false
    })
      .populate("pgListing", "title")
      .sort({ createdAt: -1 });

  }


  /* ================= GET SINGLE REVIEW ================= */

  static async getReviewById(id) {

    const review = await Review.findById(id)
      .populate("user", "name")
      .populate("pgListing", "title");

    if (!review || review.isDeleted) {
      throw new APIError("Review not found", 404);
    }

    return review;

  }


  /* ================= CREATE REVIEW ================= */

  static async createReview(data, userId) {

    const listing = await PGListing.findById(data.listingId);

    if (!listing) {
      throw new APIError("Listing not found", 404);
    }

    const exists = await Review.findOne({
      user: userId,
      pgListing: data.listingId,
      isDeleted: false
    });

    if (exists) {
      throw new APIError(
        "You have already reviewed this listing",
        400
      );
    }

    const review = await Review.create({
      rating: data.rating,
      comment: data.comment,
      user: userId,
      pgListing: data.listingId,
      pgOwner: listing.owner
    });

    await this.updateListingRating(data.listingId);

    return review;

  }


  /* ================= UPDATE REVIEW ================= */

  static async updateReview(reviewId, data, userId) {

    const review = await Review.findById(reviewId);

    if (!review || review.isDeleted) {
      throw new APIError("Review not found", 404);
    }

    if (review.user.toString() !== userId) {
      throw new APIError("Unauthorized", 403);
    }

    review.rating = data.rating;
    review.comment = data.comment;

    await review.save();

    await this.updateListingRating(review.pgListing);

    return review;

  }


  /* ================= DELETE REVIEW ================= */

  static async deleteReview(reviewId, userId) {

    const review = await Review.findById(reviewId);

    if (!review || review.isDeleted) {
      throw new APIError("Review not found", 404);
    }

    if (review.user.toString() !== userId) {
      throw new APIError("Unauthorized", 403);
    }

    review.isDeleted = true;

    await review.save();

    await this.updateListingRating(review.pgListing);

    return { message: "Review deleted successfully" };

  }


  /* ================= MARK REVIEW HELPFUL ================= */

  static async markHelpful(reviewId) {

    const review = await Review.findById(reviewId);

    if (!review || review.isDeleted) {
      throw new APIError("Review not found", 404);
    }

    review.helpfulCount = (review.helpfulCount || 0) + 1;

    await review.save();

    return review;

  }


  /* ================= UPDATE LISTING RATING ================= */

  static async updateListingRating(listingId) {

    const objectId = new mongoose.Types.ObjectId(listingId);

    const stats = await Review.aggregate([
      { $match: { pgListing: objectId, isDeleted: false } },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 }
        }
      }
    ]);

    const average = stats[0]?.average || 0;
    const count = stats[0]?.count || 0;

    await PGListing.findByIdAndUpdate(listingId, {
      "rating.average": average,
      "rating.count": count
    });

  }

}
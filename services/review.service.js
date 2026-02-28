import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import PGListing from '../models/PGListing.js';
import { APIError } from '../middleware/errorHandler.js';

export class ReviewService {

  // ✅ ADD THIS METHOD (Missing earlier)
  static async getReviewsByListing(listingId) {
    return await Review.find({
      pgListing: listingId,
      isDeleted: false
    })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
  }

  static async createReview(data, userId) {
    const booking = await Booking.findById(data.bookingId);

    if (!booking || booking.user.toString() !== userId) {
      throw new APIError('Unauthorized review', 403);
    }

    if (booking.status !== 'completed') {
      throw new APIError('Can review only completed bookings', 400);
    }

    const exists = await Review.findOne({ booking: booking._id });
    if (exists) {
      throw new APIError('Review already exists', 400);
    }

    const review = await Review.create({
      ...data,
      user: userId,
      pgListing: booking.pgListing,
      pgOwner: booking.pgOwner
    });

    await this.updateListingRating(booking.pgListing);

    return review;
  }

  static async updateListingRating(listingId) {
    const objectId = new mongoose.Types.ObjectId(listingId);

    const stats = await Review.aggregate([
      { $match: { pgListing: objectId, isDeleted: false } },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    const average = stats[0]?.average || 0;
    const count = stats[0]?.count || 0;

    await PGListing.findByIdAndUpdate(listingId, {
      'rating.average': average,
      'rating.count': count
    });
  }
}
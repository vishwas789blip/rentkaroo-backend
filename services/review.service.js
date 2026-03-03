import mongoose from 'mongoose';
import Review from '../models/Review.js';
import PGListing from '../models/PGListing.js'; // Booking import ki zaroorat nahi ab
import { APIError } from '../middleware/errorHandler.js';

export class ReviewService {

  static async getReviewsByListing(listingId) {
    return await Review.find({
      pgListing: listingId,
      isDeleted: false
    })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
  }

  static async createReview(data, userId) {
    // 1. Check karein ki listing exist karti hai ya nahi
    const listing = await PGListing.findById(data.listingId);
    if (!listing) {
      throw new APIError('Listing not found', 404);
    }

    // 2. Check karein ki kya user ne pehle hi is listing par review diya hai (Optional)
    const exists = await Review.findOne({ 
      user: userId, 
      pgListing: data.listingId,
      isDeleted: false 
    });
    
    if (exists) {
      throw new APIError('You have already reviewed this listing', 400);
    }

    // 3. Review create karein (Ab bookingId ki zaroorat nahi)
    const review = await Review.create({
      rating: data.rating,
      comment: data.comment,
      user: userId,
      pgListing: data.listingId,
      pgOwner: listing.owner // Listing model se owner le rahe hain
    });

    // 4. Listing ki average rating update karein
    await this.updateListingRating(data.listingId);

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
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    pgListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PGListing',
      required: true
    },
    pgOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a rating'],
      min: 1,
      max: 5
    },
    title: {
      type: String,
      required: [true, 'Please provide a review title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    comment: {
      type: String,
      required: [true, 'Please provide a comment'],
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    categories: {
      cleanliness: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      checkinProcess: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      value: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      }
    },
    helpful: {
      type: Number,
      default: 0
    },
    images: [
      {
        url: String,
        publicId: String
      }
    ],
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Indexes
reviewSchema.index({ pgListing: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

export default mongoose.model('Review', reviewSchema);

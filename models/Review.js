import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  pgListing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PGListing",
    required: true,
    index: true
  },

  pgOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  comment: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1000,
    trim: true
  },

  /* ================= HELPFUL SYSTEM ================= */

  helpfulCount: {
    type: Number,
    default: 0
  },

  helpfulBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  /* ================= OWNER REPLY ================= */
  ownerReply: {
    message: String,
    repliedAt: Date
  },
  /* ================= REVIEW IMAGES ================= */
  images: [
    {
      url: String,
      publicId: String
    }
  ],
  /* ================= SOFT DELETE ================= */
  isDeleted: {
    type: Boolean,
    default: false
  }
},
{ timestamps: true }
);
/* ================= PREVENT DUPLICATE REVIEW ================= */

reviewSchema.index(
  { user: 1, pgListing: 1 },
  { unique: true, sparse: true }
);

/* ================= INDEXES ================= */

reviewSchema.index({ pgListing: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

export default mongoose.model("Review", reviewSchema);
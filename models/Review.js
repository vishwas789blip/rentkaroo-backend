import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    /* ─────────────────────────────────────────────
       References
    ───────────────────────────────────────────── */

    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    pgListing: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "PGListing",
      required: true,
    },

    pgOwner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    /* ─────────────────────────────────────────────
       Review Content
    ───────────────────────────────────────────── */

    rating: {
      type:     Number,
      required: true,
      min:      [1, "Rating must be at least 1"],
      max:      [5, "Rating cannot exceed 5"],
    },

    comment: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: [5,    "Comment must be at least 5 characters"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },

    images: [
      {
        url:      { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    /* ─────────────────────────────────────────────
       Helpful System
    ───────────────────────────────────────────── */

    helpfulCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    helpfulBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  "User",
      },
    ],

    /* ─────────────────────────────────────────────
       Owner Reply
    ───────────────────────────────────────────── */

    ownerReply: {
      message: {
        type:      String,
        trim:      true,
        maxlength: 1000,
      },
      repliedAt: {
        type: Date,
      },
    },

    /* ─────────────────────────────────────────────
       Moderation
    ───────────────────────────────────────────── */

    isApproved: {
      type:    Boolean,
      default: true,         // auto-approve; set false for manual moderation
    },

    isFlagged: {
      type:    Boolean,
      default: false,
    },

    /* ─────────────────────────────────────────────
       Soft Delete
    ───────────────────────────────────────────── */

    isDeleted: {
      type:    Boolean,
      default: false,
    },

    deletedAt: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

/* ─────────────────────────────────────────────
   Indexes
───────────────────────────────────────────── */

// Prevent duplicate review — ek user ek listing pe sirf ek review
reviewSchema.index(
  { user: 1, pgListing: 1 },
  { unique: true }
);

// Most common query — listing ke saare reviews fetch karna
reviewSchema.index({ pgListing: 1, isDeleted: 1, createdAt: -1 });

// Owner ke saare reviews
reviewSchema.index({ pgOwner: 1, isDeleted: 1 });

// Admin moderation — flagged reviews
reviewSchema.index({ isFlagged: 1, isApproved: 1 });

/* ─────────────────────────────────────────────
   Pre-save Hook — deletedAt + helpfulCount sync
───────────────────────────────────────────── */

reviewSchema.pre("save", function (next) {
  // deletedAt timestamp
  if (this.isModified("isDeleted") && this.isDeleted) {
    this.deletedAt = new Date();
  }

  // helpfulCount hamesha helpfulBy array se sync rahega
  if (this.isModified("helpfulBy")) {
    this.helpfulCount = this.helpfulBy.length;
  }

  next();
});

/* ─────────────────────────────────────────────
   Post-save Hook — PGListing rating update
   Jab bhi review save ho, listing ki average
   rating automatically recalculate ho jaayegi
───────────────────────────────────────────── */

reviewSchema.post("save", async function () {
  try {
    const PGListing = mongoose.model("PGListing");

    const result = await mongoose.model("Review").aggregate([
      {
        $match: {
          pgListing: this.pgListing,
          isDeleted: false,
          isApproved: true,
        },
      },
      {
        $group: {
          _id:     null,
          average: { $avg: "$rating" },
          count:   { $sum: 1 },
        },
      },
    ]);

    const average = result[0]?.average
      ? parseFloat(result[0].average.toFixed(1))
      : 0;
    const count = result[0]?.count || 0;

    await PGListing.findByIdAndUpdate(this.pgListing, {
      "rating.average": average,
      "rating.count":   count,
    });
  } catch (err) {
    console.error("Rating update failed:", err.message);
  }
});

/* ─────────────────────────────────────────────
   Static — Active reviews for a listing
───────────────────────────────────────────── */

reviewSchema.statics.findActiveByListing = function (pgListingId) {
  return this.find({
    pgListing:  pgListingId,
    isDeleted:  false,
    isApproved: true,
  }).sort({ createdAt: -1 });
};

export default mongoose.model("Review", reviewSchema);
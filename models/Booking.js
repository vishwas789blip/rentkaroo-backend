import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
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

    checkInDate: {
      type: Date,
      required: true,
      index: true
    },

    checkOutDate: {
      type: Date,
      required: true
    },

    duration: {
      type: Number,
      required: true
    },

    numberOfRooms: {
      type: Number,
      required: true,
      min: 1
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "completed"
      ],
      default: "pending",
      index: true
    },

    guests: [
      {
        name: {
          type: String,
          required: true
        },
        email: String,
        phone: String,

        idProof: {
          url: String,
          publicId: String
        }
      }
    ],

    specialRequests: String,

    /* ================= PAYMENT ================= */

    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending"
    },

    paymentId: String,
    paymentMethod: String,

    /* ================= REJECTION ================= */

    rejectionReason: String,

    /* ================= NOTES ================= */

    notes: String,

    /* ================= REVIEW ELIGIBILITY ================= */

    reviewEligible: {
      type: Boolean,
      default: false
    },

    /* ================= AUTO EXPIRY ================= */

    expiresAt: {
      type: Date
    },

    /* ================= SOFT DELETE ================= */

    isDeleted: {
      type: Boolean,
      default: false
    }

  },
  {
    timestamps: true
  }
);


/* ================= INDEXES ================= */

bookingSchema.index({ user: 1 });
bookingSchema.index({ pgOwner: 1 });
bookingSchema.index({ pgListing: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ checkInDate: 1 });
bookingSchema.index({ createdAt: -1 });


/* ================= AUTO BOOKING EXPIRY ================= */

bookingSchema.pre("save", function (next) {

  if (!this.expiresAt && this.status === "pending") {

    this.expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

  }

  next();

});


export default mongoose.model("Booking", bookingSchema);
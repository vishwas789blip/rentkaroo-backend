import mongoose from "mongoose";

const pgListingSchema = new mongoose.Schema(
  {
    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },

    title: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: 3,
      maxlength: 120,
    },

    description: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: 10,
    },

    images: [
      {
        url:      { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    address: {
      street:  { type: String, required: true, trim: true },
      city:    { type: String, required: true, trim: true, index: true },
      state:   { type: String, required: true, trim: true },
      pincode: {
        type:  String,
        required: true,
        match: [/^[0-9]{6}$/, "Invalid pincode — must be 6 digits"],
      },
    },

    pricePerMonth: {
      type:     Number,
      required: true,
      min:      [1000, "Price must be at least ₹1000"],
      index:    true,
    },

    rooms: {
      availableRooms: {
        type:     Number,
        required: true,
        min:      [0, "Available rooms cannot be negative"],
      },
      totalRooms: { type: Number, default: null },
      roomType: {
        type:     String,
        enum: {
          values:  ["single", "double", "triple", "quad"],
          message: "{VALUE} is not a valid room type",
        },
        required: true,
      },
    },

    amenities: [{ type: String, trim: true, lowercase: true }],

    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count:   { type: Number, default: 0, min: 0 },
    },

    // FIX: status field REMOVED — no admin approval needed
    // Listings go live immediately after creation
    // Admin can only delete inappropriate listings

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date,    default: null },
  },
  { timestamps: true }
);

/* ── Indexes ─────────────────────────────────────────────── */

pgListingSchema.index({ "address.city": "text", title: "text", description: "text" });
pgListingSchema.index({ "address.city": 1, pricePerMonth: 1, "rooms.roomType": 1 });

// FIX: status removed from index — no longer used
pgListingSchema.index({ isDeleted: 1 });

/* ── Pre-save hook ───────────────────────────────────────── */

pgListingSchema.pre("save", function (next) {
  if (this.isModified("isDeleted") && this.isDeleted) {
    this.deletedAt = new Date();
  }
  next();
});

/* ── Instance method ─────────────────────────────────────── */

pgListingSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.isDeleted;
  delete obj.deletedAt;
  return obj;
};

/* ── Static method ───────────────────────────────────────── */

// FIX: status: "approved" removed — all non-deleted listings are active
pgListingSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isDeleted: false });
};

export default mongoose.model("PGListing", pgListingSchema);
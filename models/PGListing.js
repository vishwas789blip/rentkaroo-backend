import mongoose from "mongoose";

const pgListingSchema = new mongoose.Schema(
  {
    /* ─────────────────────────────────────────────
       Owner
    ───────────────────────────────────────────── */

    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },

    /* ─────────────────────────────────────────────
       Basic Info
    ───────────────────────────────────────────── */

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

    /* ─────────────────────────────────────────────
       Address
    ───────────────────────────────────────────── */

    address: {
      street: {
        type:     String,
        required: true,
        trim:     true,
      },

      city: {
        type:     String,
        required: true,
        trim:     true,
        index:    true,
      },

      state: {
        type:     String,
        required: true,
        trim:     true,
      },

      pincode: {
        type:     String,
        required: true,
        match:    [/^[0-9]{6}$/, "Invalid pincode — must be 6 digits"],
      },
    },

    /* ─────────────────────────────────────────────
       Pricing
    ───────────────────────────────────────────── */

    pricePerMonth: {
      type:     Number,
      required: true,
      min:      [1000, "Price must be at least ₹1000"],
      index:    true,
    },

    /* ─────────────────────────────────────────────
       Rooms
    ───────────────────────────────────────────── */

    rooms: {
      availableRooms: {
        type:     Number,
        required: true,
        min:      [0, "Available rooms cannot be negative"],
      },

      totalRooms: {
        type:    Number,
        default: null,               // optional — agar track karna ho
      },

      roomType: {
        type:     String,
        enum:     {
          values:  ["single", "double", "triple", "quad"],
          message: "{VALUE} is not a valid room type",
        },
        required: true,
      },
    },

    /* ─────────────────────────────────────────────
       Amenities
    ───────────────────────────────────────────── */

    amenities: [
      {
        type:      String,
        trim:      true,
        lowercase: true,
      },
    ],

    /* ─────────────────────────────────────────────
       Approval Status
    ───────────────────────────────────────────── */

    status: {
      type:    String,
      enum:    ["pending", "approved", "rejected"],
      default: "pending",
      index:   true,
    },

    rejectionReason: {
      type:    String,
      default: null,
    },

    /* ─────────────────────────────────────────────
       Rating
    ───────────────────────────────────────────── */

    rating: {
      average: {
        type:    Number,
        default: 0,
        min:     0,
        max:     5,
      },

      count: {
        type:    Number,
        default: 0,
        min:     0,
      },
    },

    /* ─────────────────────────────────────────────
       Soft Delete
    ───────────────────────────────────────────── */

    isDeleted: {
      type:    Boolean,
      default: false,
      index:   true,
    },

    deletedAt: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* ─────────────────────────────────────────────
   Indexes
───────────────────────────────────────────── */

// Full-text search
pgListingSchema.index({
  "address.city": "text",
  title:          "text",
  description:    "text",
});

// Common filter combination — city + price + roomType
pgListingSchema.index({
  "address.city":  1,
  pricePerMonth:   1,
  "rooms.roomType": 1,
});

// Active listings query — isDeleted + status hamesha saath aate hain
pgListingSchema.index({ isDeleted: 1, status: 1 });

/* ─────────────────────────────────────────────
   Pre-save Hook — deletedAt timestamp
───────────────────────────────────────────── */

pgListingSchema.pre("save", function (next) {
  if (this.isModified("isDeleted") && this.isDeleted) {
    this.deletedAt = new Date();
  }
  next();
});

/* ─────────────────────────────────────────────
   Instance Method — safe response (owner ke liye)
───────────────────────────────────────────── */

pgListingSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.isDeleted;
  delete obj.deletedAt;
  return obj;
};

/* ─────────────────────────────────────────────
   Static Method — active listings filter
───────────────────────────────────────────── */

pgListingSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isDeleted: false, status: "approved" });
};

export default mongoose.model("PGListing", pgListingSchema);
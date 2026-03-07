import mongoose from "mongoose";

const pgListingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    images: [
      {
        url: String,
        publicId: String
      }
    ],

    description: {
      type: String,
      required: true
    },

    address: {
      street: {
        type: String,
        required: true
      },

      city: {
        type: String,
        required: true,
        index: true
      },

      state: {
        type: String,
        required: true
      },

      pincode: {
        type: String,
        required: true
      }
    },

    pricePerMonth: {
      type: Number,
      required: true,
      min: 0,
      index: true
    },

    rooms: {
      availableRooms: {
        type: Number,
        required: true,
        min: 0
      },

      roomType: {
        type: String,
        enum: ["single", "double", "triple", "quad"],
        required: true
      }
    },

    amenities: [
      {
        type: String,
        enum: [
          "wifi",
          "ac",
          "parking",
          "laundry",
          "kitchen",
          "garden",
          "gym",
          "security",
          "electricity bill"
        ]
      }
    ],

    /* ================= RATING ================= */

    rating: {
      average: {
        type: Number,
        default: 0
      },

      count: {
        type: Number,
        default: 0
      }
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


/* ================= SEARCH INDEX ================= */

pgListingSchema.index({
  "address.city": "text",
  title: "text",
  description: "text"
});


export default mongoose.model("PGListing", pgListingSchema);
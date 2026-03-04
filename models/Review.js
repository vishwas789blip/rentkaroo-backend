import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  pgListing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PGListing",
    required: true
  },

  pgOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
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
    maxlength: 1000
  },

  helpful: {
    type: Number,
    default: 0
  },

  isDeleted: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

export default mongoose.model("Review", reviewSchema);
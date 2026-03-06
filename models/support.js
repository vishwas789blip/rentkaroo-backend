import mongoose from "mongoose";

const supportSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true
  },

  subject: {
    type: String,
    required: true
  },

  message: {
    type: String,
    required: true,
    maxlength: 2000
  },

  /* ================= STATUS ================= */

  status: {
    type: String,
    enum: ["open", "in-progress", "resolved", "closed"],
    default: "open",
    index: true
  },

  /* ================= PRIORITY ================= */

  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium"
  },

  /* ================= ADMIN RESPONSE ================= */

  adminReply: {
    message: String,
    repliedAt: Date,
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },

  /* ================= ATTACHMENTS ================= */

  attachments: [
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


/* ================= INDEXES ================= */

supportSchema.index({ status: 1 });
supportSchema.index({ createdAt: -1 });


export default mongoose.model("Support", supportSchema);
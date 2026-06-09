import mongoose from "mongoose";

const supportSchema = new mongoose.Schema(
  {
    /* ─────────────────────────────────────────────
       User Reference (optional — guest bhi kar sakta hai)
    ───────────────────────────────────────────── */

    user: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "User",
      default: null,
      index:   true,
    },

    /* ─────────────────────────────────────────────
       Contact Info
    ───────────────────────────────────────────── */

    name: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 50,
    },

    email: {
      type:      String,
      required:  true,
      trim:      true,
      lowercase: true,
      match:     [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },

    /* ─────────────────────────────────────────────
       Ticket Content
    ───────────────────────────────────────────── */

    subject: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: [3,   "Subject must be at least 3 characters"],
      maxlength: [150, "Subject cannot exceed 150 characters"],
    },

    message: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: [10,   "Message must be at least 10 characters"],
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },

    attachments: [
      {
        url:      { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    /* ─────────────────────────────────────────────
       Status & Priority
    ───────────────────────────────────────────── */

    status: {
      type:    String,
      enum:    {
        values:  ["open", "in-progress", "resolved", "closed"],
        message: "{VALUE} is not a valid status",
      },
      default: "open",
      index:   true,
    },

    priority: {
      type:    String,
      enum:    {
        values:  ["low", "medium", "high"],
        message: "{VALUE} is not a valid priority",
      },
      default: "medium",
      index:   true,
    },

    /* ─────────────────────────────────────────────
       Admin Reply
    ───────────────────────────────────────────── */

    adminReply: {
      message: {
        type:      String,
        trim:      true,
        maxlength: 2000,
      },
      repliedAt: {
        type: Date,
      },
      admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref:  "User",
      },
    },

    /* ─────────────────────────────────────────────
       Timestamps — resolution tracking
    ───────────────────────────────────────────── */

    resolvedAt: {
      type:    Date,
      default: null,
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

// Admin dashboard — open + high priority tickets pehle
supportSchema.index({ status: 1, priority: -1, createdAt: -1 });

// User ke apne tickets
supportSchema.index({ user: 1, isDeleted: 1, createdAt: -1 });

// Soft delete filter
supportSchema.index({ isDeleted: 1 });

/* ─────────────────────────────────────────────
   Pre-save Hook — resolvedAt + deletedAt
───────────────────────────────────────────── */

supportSchema.pre("save", function (next) {
  // Ticket resolve/close hone pe timestamp
  if (this.isModified("status")) {
    if (["resolved", "closed"].includes(this.status) && !this.resolvedAt) {
      this.resolvedAt = new Date();
    }
    // Reopen hone pe resolvedAt clear karo
    if (this.status === "open") {
      this.resolvedAt = null;
    }
  }

  // Soft delete timestamp
  if (this.isModified("isDeleted") && this.isDeleted) {
    this.deletedAt = new Date();
  }

  next();
});

/* ─────────────────────────────────────────────
   Static — Open tickets for admin
───────────────────────────────────────────── */

supportSchema.statics.findOpen = function () {
  return this.find({ status: "open", isDeleted: false })
    .sort({ priority: -1, createdAt: 1 }); // high priority + oldest pehle
};

export default mongoose.model("Support", supportSchema);
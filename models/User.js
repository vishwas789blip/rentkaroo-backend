import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, "Please provide a name"],
      trim:      true,
      minlength: 2,
    },

    email: {
      type:      String,
      required:  [true, "Please provide an email"],
      unique:    true,
      lowercase: true,
      trim:      true,
    },

    phone: {
      type:  String,
      required: [true, "Please provide a phone number"],
      match: [/^\d{10}$/, "Phone number must be 10 digits"],
    },

    password: {
      type:      String,
      required:  true,
      minlength: 6,
      select:    false,   // never returned in queries by default
    },

    role: {
      type:      String,
      enum:      ["user", "pg_owner", "admin"],
      default:   "user",
      lowercase: true,
    },

    profileImage: {
      url:      String,
      publicId: String,
    },

    address: {
      city:  String,
      state: String,
    },

    /* ── Account status ── */

    // isActive  → admin suspend/activate karta hai
    // default true — naya user hamesha active hota hai
    isActive: {
      type:    Boolean,
      default: true,
    },

    // isVerified → OTP se email verify hoti hai
    // default false — register ke baad verify karna padta hai
    isVerified: {
      type:    Boolean,
      default: false,
    },

    // Soft delete flag — admin delete kare toh
    isDeleted: {
      type:    Boolean,
      default: false,
    },

    deletedAt: Date,

    /* ── Login security ── */

    loginAttempts: {
      type:    Number,
      default: 0,
    },

    lockUntil: Date,
    lastLogin: Date,

    /* ── Password reset (OTP flow se handle hota hai) ── */
    // resetPasswordToken aur resetPasswordExpiry hata diye —
    // ab JWT reset token use hota hai (auth.service.js mein)
  },
  { timestamps: true }
);

/* ─────────────────────────────────────────────
   Auto-filter deleted users from ALL find queries
   Matlab kisi bhi User.find() mein deleted users
   automatically exclude ho jaate hain
───────────────────────────────────────────── */

userSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

/* ─────────────────────────────────────────────
   Password hashing — sirf tabhi hash karo jab
   password modify hua ho (save pe har baar nahi)
───────────────────────────────────────────── */

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(Number(process.env.SALT_ROUNDS) || 10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* ─────────────────────────────────────────────
   Instance methods
───────────────────────────────────────────── */

// Password compare
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Account lock check
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Remove sensitive fields from JSON response
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  delete obj.isDeleted;
  delete obj.deletedAt;
  return obj;
};

/* ─────────────────────────────────────────────
   Indexes
───────────────────────────────────────────── */

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ createdAt: -1 });

export default mongoose.model("User", userSchema);
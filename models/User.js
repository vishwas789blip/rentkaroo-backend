import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: [true, "Please provide a name"],
    trim: true,
    minlength: 2
  },

  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },

  phone: {
    type: String,
    required: [true, "Please provide a phone number"],
    match: [/^\d{10}$/, "Phone number must be 10 digits"],
    index: true
  },

  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },

  role: {
    type: String,
    enum: ["user", "pg_owner", "admin"],
    default: "user",
    index: true
  },

  profileImage: {
    url: String,
    publicId: String
  },

  address: {
    city: String,
    state: String
  },

  /* ================= ACCOUNT STATUS ================= */

  isActive: {
    type: Boolean,
    default: true
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  isDeleted: {
    type: Boolean,
    default: false
  },

  /* ================= EMAIL VERIFICATION ================= */

  verificationToken: String,
  verificationTokenExpiry: Date,

  /* ================= PASSWORD RESET ================= */

  resetPasswordToken: String,
  resetPasswordExpiry: Date,

  /* ================= LOGIN SECURITY ================= */

  loginAttempts: {
    type: Number,
    default: 0
  },

  lockUntil: Date,
  lastLogin: Date,

  /* ================= REFRESH TOKENS ================= */

  refreshTokens: [
    {
      token: String,
      createdAt: Date
    }
  ]

},
{ timestamps: true }
);


/* ================= AUTO HIDE DELETED USERS ================= */

userSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});


/* ================= PASSWORD HASHING ================= */

userSchema.pre("save", async function (next) {

  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(
    Number(process.env.SALT_ROUNDS) || 10
  );
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


/* ================= PASSWORD COMPARISON ================= */

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};


/* ================= REMOVE PASSWORD FROM RESPONSE ================= */

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};


/* ================= INDEXES ================= */

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

export default mongoose.model("User", userSchema);
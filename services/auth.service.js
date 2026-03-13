import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs"; 
import User from "../models/User.js";
import { APIError } from "../middleware/errorHandler.js";

export class AuthService {
  /* ================= TOKEN GENERATION ================= */
  static generateToken(user, type = "access") {
    const isAccess = type === "access";
    const secret = isAccess ? process.env.JWT_SECRET : process.env.JWT_REFRESH_SECRET;

    if (!secret) throw new APIError("JWT secret not configured", 500);

    const expiresIn = isAccess 
      ? process.env.JWT_EXPIRE || "1d" 
      : process.env.JWT_REFRESH_EXPIRE || "7d";

    return jwt.sign(
      { id: user._id, role: user.role.toUpperCase() },
      secret,
      { expiresIn }
    );
  }

  /* ================= REGISTER ================= */
  static async register(data) {
    const { name, email, phone, password, role } = data;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new APIError("User already exists", 409);

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

    const user = await User.create({
      name,
      email,
      phone,
      password, // Assumes model handles hashing
      role: role?.toUpperCase() || "USER",
      isVerified: false,
      verificationToken: hashedToken,
      verificationTokenExpiry: Date.now() + 3600000, // 1 hour
    });

    return {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      verificationToken, 
    };
  }

  /* ================= LOGIN ================= */
  static async login(email, password) {
  const user = await User.findOne({ email }).select("+password");

  if (!user || user.isActive === false) {
    throw new APIError("Invalid credentials", 401);
  }

  if (user.isLocked()) {
    throw new APIError("Account is temporarily locked. Try again later.", 403);
  }

  if (!user.isVerified) {
    throw new APIError("Please verify your email first", 403);
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    user.loginAttempts += 1;
    
    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 3600000; 
    }
    
    await user.save();
    throw new APIError("Invalid credentials", 401);
  }

  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = Date.now();
  await user.save();

  return {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    accessToken: this.generateToken(user),
    refreshToken: this.generateToken(user, "refresh")
  };
}
  /* ================= REFRESH TOKEN ================= */
  static async refreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        throw new APIError("Invalid refresh token", 401);
      }

      return { accessToken: this.generateToken(user) };
    } catch (error) {
      throw new APIError("Invalid refresh token", 401);
    }
  }

  /* ================= CHANGE PASSWORD ================= */
  static async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findById(userId).select("+password");
    if (!user) throw new APIError("User not found", 404);

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) throw new APIError("Incorrect current password", 401);

    user.password = newPassword; 
    await user.save(); // Model hook should re-hash this

    return { message: "Password changed successfully" };
  }

  /* ================= LOGOUT ================= */
  static async logout(userId) {
    // Optional: Blacklist the token in Redis here
    return { message: "Logged out successfully" };
  }
}
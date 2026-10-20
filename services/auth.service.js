import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { APIError } from "../middleware/errorHandler.js";
import { OtpService, OTP_EXPIRES_MINUTES } from "./otp.service.js";
import { sendOtpVerifyEmail, sendOtpResetEmail, sendPasswordResetEmail } from "../utils/mailer.js";
import redis from "../config/redis.js";
import { blacklistKey } from "../utils/redisKeys.js";


const tokenStore = {
  async setRefresh(userId, token, ttlSeconds) {
    await redis.set(`refresh:${userId}`, token, "EX", ttlSeconds);
  },
  async getRefresh(userId) {
    return await redis.get(`refresh:${userId}`);
  },
  async deleteRefresh(userId) {
    await redis.del(`refresh:${userId}`);
  },
  async blacklistJti(jti, ttlSeconds) {
  await redis.set(blacklistKey(jti), "1", "EX", ttlSeconds);
},
async isBlacklisted(jti) {
  return (await redis.exists(blacklistKey(jti))) === 1;
},
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function parseExpiry(str = "7d") {
  const units = { s: 1, m: 60, h: 3600, d: 86400 };
  const match  = String(str).match(/^(\d+)([smhd])$/i);
  if (!match) return 7 * 86400;
  return parseInt(match[1]) * units[match[2].toLowerCase()];
}

/* ─────────────────────────────────────────────
   AuthService
───────────────────────────────────────────── */

export class AuthService {

  /* ── Token generation ── */

  static generateToken(user, type = "access") {
    const isAccess = type === "access";
    const secret   = isAccess ? process.env.JWT_SECRET : process.env.JWT_REFRESH_SECRET;

    if (!secret) throw new APIError("JWT secret not configured", 500);

    const expiry = isAccess
      ? (process.env.JWT_EXPIRE         || "15m")
      : (process.env.JWT_REFRESH_EXPIRE || "7d");

    const jti = `${user._id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return jwt.sign(
      { id: user._id, role: user.role, jti },
      secret,
      { expiresIn: expiry }
    );
  }

  /* ═══════════════════════════════════════════
     REGISTRATION FLOW  (two-step, OTP-gated)
     ───────────────────────────────────────────*/

  static async register({ name, email, phone, password, role }) {
    const existing = await User.findOne({ email });
    if (existing && existing.isVerified) {
      throw new APIError("Email already registered", 409);
    }

    // Reuse existing unverified doc to avoid ghost-user accumulation
    let user = existing;
    if (!user) {
      user = await User.create({
        name,
        email,
        phone,
        password,
        role:       role || "user",
        isVerified: false,
      });
    } else {
      user.name  = name;
      user.phone = phone;
      user.role  = role || user.role;
      user.password = password; 
      await user.save();
    }

    const otp = await OtpService.generate("verify", email);

    await sendOtpVerifyEmail({
      to:               email,
      name,
      otp,
      expiresInMinutes: OTP_EXPIRES_MINUTES,
    });

    return {
      message: `Verification code sent to ${email}`,
      email,
    };
  }

  static async verifyEmail({ email, otp }) {
    await OtpService.verify("verify", email, otp);

    const user = await User.findOne({ email });
    if (!user) throw new APIError("User not found", 404);

    user.isVerified = true;
    await user.save();

    const accessToken  = this.generateToken(user, "access");
    const refreshToken = this.generateToken(user, "refresh");
    const refreshTtl   = parseExpiry(process.env.JWT_REFRESH_EXPIRE || "7d");
    await tokenStore.setRefresh(user._id, refreshToken, refreshTtl);

    return {
      message: "Email verified successfully",
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        phone: user.phone,
        role:  user.role.toLowerCase(),
      },
      accessToken,
      refreshToken,
    };
  }

  /* ── Resend verify OTP ── */

  static async resendVerifyOtp(email) {
    const user = await User.findOne({ email });
    if (!user)           throw new APIError("Email not registered", 404);
    if (user.isVerified) throw new APIError("Email already verified", 400);

    const otp = await OtpService.generate("verify", email);
    await sendOtpVerifyEmail({
      to:               email,
      name:             user.name,
      otp,
      expiresInMinutes: OTP_EXPIRES_MINUTES,
    });

    return { message: `Verification code resent to ${email}` };
  }

  /* ═══════════════════════════════════════════
     LOGIN
     ═══════════════════════════════════════════ */

  static async login(email, password) {
    const user = await User.findOne({ email }).select("+password");

    if (!user || user.isActive === false) {
      throw new APIError("Invalid credentials", 401);
    }

    if (!user.isVerified) {
      throw new APIError("Please verify your email before logging in.", 403);
    }

    if (user.isLocked && user.isLocked()) {
      throw new APIError("Account is temporarily locked. Try again later.", 403);
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 60 * 60 * 1000;
      }
      await user.save();
      throw new APIError("Invalid credentials", 401);
    }

    user.loginAttempts = 0;
    user.lockUntil     = undefined;
    user.lastLogin     = Date.now();
    await user.save();

    const accessToken  = this.generateToken(user, "access");
    const refreshToken = this.generateToken(user, "refresh");
    const refreshTtl   = parseExpiry(process.env.JWT_REFRESH_EXPIRE || "7d");
    await tokenStore.setRefresh(user._id, refreshToken, refreshTtl);

    return {
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        phone: user.phone,
        role:  user.role.toLowerCase(),
      },
      accessToken,
      refreshToken,
    };
  }

  /* ═══════════════════════════════════════════
     FORGOT / RESET PASSWORD FLOW
     ─────────────────────────────────────────── */

  static async forgotPassword(email) {
    const genericResponse = {
      message: "If that email is registered, you will receive a password reset link shortly.",
    };

    if (!email || typeof email !== "string") {
      return genericResponse;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find active, verified user (soft-deleted users are auto-excluded by userSchema.pre(/^find/))
    const user = await User.findOne({
      email: normalizedEmail,
      isVerified: true,
      isActive: { $ne: false },
    });

    if (!user) {
      // Prevent email enumeration by returning generic response
      return genericResponse;
    }

    // Generate cryptographically secure, unpredictable, single-use reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the hashed token in the database with 15-minute expiry
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expiry;
    await user.save({ validateModifiedOnly: true });

    // Build reset link using FRONTEND_URL or default production frontend
    const frontendBase = (process.env.FRONTEND_URL || "https://rentkarooo.vercel.app").replace(/\/+$/, "");
    const resetUrl = `${frontendBase}/reset-password/${resetToken}`;

    // Send reset link through Nodemailer and Brevo SMTP on port 2525
    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresInMinutes: 15,
      });
    } catch (error) {
      console.error("❌ Failed to send password reset email via Brevo SMTP:", error.message);
      // Clean up stored token if email failed to prevent orphaned unusable tokens
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateModifiedOnly: true });
      throw new APIError("Failed to send password reset email. Please try again later.", 500);
    }

    // Generic response returned — never reveal tokens or account existence details
    return genericResponse;
  }

  /**
   * Verify reset OTP (retained for backward compatibility)
   */
  static async verifyResetOtp({ email, otp }) {
    await OtpService.verify("reset", email, otp);

    const user = await User.findOne({ email });
    if (!user) throw new APIError("User not found", 404);

    const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET;
    const resetToken  = jwt.sign(
      { id: user._id, purpose: "reset" },
      resetSecret,
      { expiresIn: "5m" }
    );

    return { resetToken };
  }

  static async resetPassword({ token, resetToken, newPassword }) {
    const rawToken = (token || resetToken || "").toString().trim();

    if (!rawToken) {
      throw new APIError("Password reset token is required", 400);
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      throw new APIError("Password must be at least 6 characters long", 400);
    }

    // Hash the supplied token to compare securely with stored hash in DB
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Look up user with matching unexpired token
    let user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+password +resetPasswordToken +resetPasswordExpires");

    // Backwards-compatibility fallback: if token is a legacy JWT reset token
    if (!user) {
      const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET;
      try {
        const decoded = jwt.verify(rawToken, resetSecret);
        if (decoded && decoded.purpose === "reset") {
          user = await User.findById(decoded.id).select("+password");
        }
      } catch {
        // Not a JWT either
      }
    }

    if (!user) {
      throw new APIError("Password reset link is invalid or has expired. Please request a new one.", 400);
    }

    // Update password — model pre-save hook re-hashes using bcrypt automatically
    user.password = newPassword;

    // Atomically invalidate the reset token so it cannot be reused
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Invalidate existing sessions and refresh tokens in Redis
    try {
      await tokenStore.deleteRefresh(user._id);
    } catch (redisErr) {
      console.warn("Could not invalidate refresh token in Redis:", redisErr.message);
    }

    return {
      message: "Password has been reset successfully. Please log in with your new password.",
    };
  }

  /* ─────────────────────────────────────────────
     Refresh token (with rotation)
  ───────────────────────────────────────────── */

  static async refreshToken(token) {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new APIError("Invalid or expired refresh token", 401);
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) throw new APIError("User not found", 401);

    const stored = await tokenStore.getRefresh(user._id);
    if (!stored || stored !== token) {
      await tokenStore.deleteRefresh(user._id);
      throw new APIError("Refresh token reuse detected. Please log in again.", 401);
    }

    const newAccessToken  = this.generateToken(user, "access");
    const newRefreshToken = this.generateToken(user, "refresh");
    const refreshTtl      = parseExpiry(process.env.JWT_REFRESH_EXPIRE || "7d");
    await tokenStore.setRefresh(user._id, newRefreshToken, refreshTtl);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /* ─────────────────────────────────────────────
     Change password (authenticated)
  ───────────────────────────────────────────── */

  static async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findById(userId).select("+password");
    if (!user) throw new APIError("User not found", 404);

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) throw new APIError("Incorrect current password", 401);

    user.password = newPassword;
    await user.save();

    await tokenStore.deleteRefresh(userId);

    return { message: "Password changed successfully" };
  }

  /* ─────────────────────────────────────────────
     Logout
  ───────────────────────────────────────────── */

  static async logout(userId, accessToken) {
    await tokenStore.deleteRefresh(userId);

    if (accessToken) {
      try {
        const decoded      = jwt.verify(accessToken, process.env.JWT_SECRET);
        const remainingTtl = decoded.exp - Math.floor(Date.now() / 1000);
        if (decoded.jti && remainingTtl > 0) {
          await tokenStore.blacklistJti(decoded.jti, remainingTtl);
        }
      } catch {
        // Token already expired — nothing to blacklist
      }
    }

    return { message: "Logged out successfully" };
  }
}
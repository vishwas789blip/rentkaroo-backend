import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { APIError } from "../middleware/errorHandler.js";
import { OtpService, OTP_EXPIRES_MINUTES } from "./otp.service.js";
import { sendOtpVerifyEmail, sendOtpResetEmail } from "../utils/mailer.js";

const tokenStore = {
  _refresh:   new Map(),
  _blacklist: new Set(),

  async setRefresh(userId, token, ttlSeconds) {
    this._refresh.set(String(userId), token);
  },
  async getRefresh(userId) {
    return this._refresh.get(String(userId)) ?? null;
  },
  async deleteRefresh(userId) {
    this._refresh.delete(String(userId));
  },
  async blacklistJti(jti, ttlSeconds) {
    this._blacklist.add(jti);
  },
  async isBlacklisted(jti) {
    return this._blacklist.has(jti);
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
     FORGOT / RESET PASSWORD  (OTP-gated)
     ─────────────────────────────────────────── */

  static async forgotPassword(email) {
    const user = await User.findOne({ email, isVerified: true });

    if (user) {
      const otp = await OtpService.generate("reset", email);
      await sendOtpResetEmail({
        to:               email,
        name:             user.name,
        otp,
        expiresInMinutes: OTP_EXPIRES_MINUTES,
      });
    }

    // Always the same response — don't reveal whether email exists
    return {
      message: "If that email is registered you will receive a reset code shortly.",
    };
  }

  /**
   * Verify the reset OTP and return a short-lived reset token.
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

  static async resetPassword({ resetToken, newPassword }) {
    const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET;

    let decoded;
    try {
      decoded = jwt.verify(resetToken, resetSecret);
    } catch {
      throw new APIError("Reset token expired or invalid. Please start over.", 400);
    }

    if (decoded.purpose !== "reset") {
      throw new APIError("Invalid reset token", 400);
    }

    const user = await User.findById(decoded.id).select("+password");
    if (!user) throw new APIError("User not found", 404);

    user.password = newPassword; // model pre-save hook re-hashes
    await user.save();

    await tokenStore.deleteRefresh(user._id);

    return { message: "Password reset successfully. Please log in." };
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
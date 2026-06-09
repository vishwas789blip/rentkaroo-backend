import Joi from "joi";
import User from "../models/User.js";
import Listing from "../models/PGListing.js";
import { AuthService } from "../services/auth.service.js";
import { validate } from "../utils/validate.js";

/* ─────────────────────────────────────────────
   Register  (step 1 of 2)
   POST /auth/register
───────────────────────────────────────────── */

export const register = async (req, res) => {
  const value = validate(registerSchema, req.body, res);
  if (!value) return;

  const result = await AuthService.register(value);

  res.status(201).json({ success: true, ...result });
};

/* ─────────────────────────────────────────────
   Verify email  (step 2 of 2)
   POST /auth/verify-email
───────────────────────────────────────────── */

export const verifyEmail = async (req, res) => {
  const value = validate(verifyEmailSchema, req.body, res);
  if (!value) return;

  const result = await AuthService.verifyEmail(value);

  res.status(200).json({ success: true, data: result });
};

/* ─────────────────────────────────────────────
   Resend verify OTP
   POST /auth/resend-otp
───────────────────────────────────────────── */

export const resendVerifyOtp = async (req, res) => {
  const value = validate(emailSchema, req.body, res);
  if (!value) return;

  const result = await AuthService.resendVerifyOtp(value.email);

  res.status(200).json({ success: true, ...result });
};

/* ─────────────────────────────────────────────
   Login
   POST /auth/login
───────────────────────────────────────────── */

export const login = async (req, res) => {
  const value = validate(loginSchema, req.body, res);
  if (!value) return;

  const result = await AuthService.login(value.email, value.password);

  res.status(200).json({ success: true, message: "Login successful", data: result });
};

/* ─────────────────────────────────────────────
   Forgot password  (step 1 of 3)
   POST /auth/forgot-password
───────────────────────────────────────────── */

export const forgotPassword = async (req, res) => {
  const value = validate(emailSchema, req.body, res);
  if (!value) return;

  const result = await AuthService.forgotPassword(value.email);

  res.status(200).json({ success: true, ...result });
};

/* ─────────────────────────────────────────────
   Verify reset OTP  (step 2 of 3)
   POST /auth/verify-reset-otp
───────────────────────────────────────────── */

export const verifyResetOtp = async (req, res) => {
  const value = validate(verifyResetOtpSchema, req.body, res);
  if (!value) return;

  const result = await AuthService.verifyResetOtp(value);

  res.status(200).json({ success: true, data: result });
};

/* ─────────────────────────────────────────────
   Reset password  (step 3 of 3)
   POST /auth/reset-password
───────────────────────────────────────────── */

export const resetPassword = async (req, res) => {
  const value = validate(resetPasswordSchema, req.body, res);
  if (!value) return;

  const result = await AuthService.resetPassword(value);

  res.status(200).json({ success: true, ...result });
};

/* ─────────────────────────────────────────────
   Refresh token
   POST /auth/refresh
───────────────────────────────────────────── */

export const refreshToken = async (req, res) => {
  const value = validate(refreshTokenSchema, req.body, res);
  if (!value) return;

  const result = await AuthService.refreshToken(value.refreshToken);

  res.status(200).json({ success: true, message: "Token refreshed", data: result });
};

/* ─────────────────────────────────────────────
   Change password  (authenticated)
   POST /auth/change-password
───────────────────────────────────────────── */

export const changePassword = async (req, res) => {
  const value = validate(changePasswordSchema, req.body, res);
  if (!value) return;

  await AuthService.changePassword(req.user.id, value.oldPassword, value.newPassword);

  res.status(200).json({ success: true, message: "Password changed successfully" });
};

/* ─────────────────────────────────────────────
   Current user  (lightweight — from middleware)
───────────────────────────────────────────── */

export const getCurrentUser = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id:    req.user._id,
        name:  req.user.name,
        email: req.user.email,
        role:  req.user.role,
      },
    },
  });
};

/* ─────────────────────────────────────────────
   Get user info  (full record)
───────────────────────────────────────────── */

export const getUserInfo = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  res.status(200).json({ success: true, data: { user } });
};

/* ─────────────────────────────────────────────
   Update user info
───────────────────────────────────────────── */

export const updateUserInfo = async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  if (name)  user.name  = name;
  if (phone) user.phone = phone;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User info updated",
    data: {
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        phone: user.phone,
        role:  user.role,
      },
    },
  });
};

/* ─────────────────────────────────────────────
   Get listing by ID
───────────────────────────────────────────── */

export const getListingById = async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate(
    "owner",
    "name email phone role"
  );
  if (!listing) {
    return res.status(404).json({ success: false, message: "Listing not found" });
  }
  res.status(200).json({ success: true, data: { listing } });
};

/* ─────────────────────────────────────────────
   Get all users  (admin — protect with role guard)
───────────────────────────────────────────── */

export const getAllUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.status(200).json({ success: true, data: { users } });
};

/* ─────────────────────────────────────────────
   Logout
   POST /auth/logout
───────────────────────────────────────────── */

export const logout = async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const rawToken   = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  await AuthService.logout(req.user.id, rawToken);

  res.status(200).json({ success: true, message: "Logged out successfully" });
};
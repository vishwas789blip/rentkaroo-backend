import express from "express";
import {
  register,
  verifyEmail,
  resendVerifyOtp,
  login,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  refreshToken,
  changePassword,
  getCurrentUser,
  getUserInfo,
  updateUserInfo,
  getAllUsers,
  logout,
} from "../controllers/auth.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

import validateBody from "../middleware/validation.middleware.js";
import {
  registerSchema,
  verifyEmailSchema,
  emailSchema,
  loginSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  changePasswordSchema
  
} from "../joi/auth.joi.js";
const router = express.Router();

/* ─────────────────────────────────────────────
   Public routes
───────────────────────────────────────────── */

// Registration flow
router.post("/register",         validateBody(registerSchema), register);
router.post("/verify-email",     validateBody(verifyEmailSchema), verifyEmail);
router.post("/resend-otp",       validateBody(emailSchema), resendVerifyOtp); // Sirf email check karega

// Login
router.post("/login",            validateBody(loginSchema), login);

// Forgot / reset password flow
router.post("/forgot-password",  validateBody(emailSchema), forgotPassword); // Sirf email check karega
router.post("/verify-reset-otp", validateBody(verifyResetOtpSchema), verifyResetOtp);
router.post("/reset-password",   validateBody(resetPasswordSchema), resetPassword);

// Token management
router.post("/refresh",          validateBody(refreshTokenSchema), refreshToken);

/* ─────────────────────────────────────────────
   Protected routes  (require valid access token)
───────────────────────────────────────────── */

router.post  ("/logout",          authenticate, logout); 
router.post  ("/change-password", authenticate, validateBody(changePasswordSchema), changePassword);
router.get   ("/me",              authenticate, getCurrentUser);
router.get   ("/profile",         authenticate, getUserInfo);
router.patch ("/profile",         authenticate, updateUserInfo); // Iska custom validation banana chaho toh bana sakte ho, abhi req.body direct handle ho rha hai

/* ─────────────────────────────────────────────
   Admin routes
───────────────────────────────────────────── */

router.get("/users", authenticate, authorize("admin"), getAllUsers);

export default router;
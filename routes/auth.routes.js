import express from "express";
import { asyncWrapper } from "../middleware/asyncWrapper.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

import * as authController from "../controllers/auth.controller.js";

const router = express.Router();

/* ===============================
   PUBLIC ROUTES
=============================== */

// Register
router.post(
  "/register",
  authLimiter,
  asyncWrapper(authController.register)
);

// Login
router.post(
  "/login",
  authLimiter,
  asyncWrapper(authController.login)
);

// Refresh Token
router.post(
  "/refresh-token",
  asyncWrapper(authController.refreshToken)
);

// ✅ NEW: Verify OTP (Isse aapka 404 fix ho jayega)
router.post(
  "/verify-otp",
  authLimiter,
  asyncWrapper(authController.verifyOTP) 
);

// (Optional) Purana verify-email aap hata sakte hain ya rehne de sakte hain
router.get(
  "/verify-email/:token",
  asyncWrapper(authController.verifyEmail)
);

// Forgot Password
router.post(
  "/forgot-password",
  authLimiter,
  asyncWrapper(authController.forgotPassword)
);

// Reset Password
router.post(
  "/reset-password/:token",
  authLimiter,
  asyncWrapper(authController.resetPassword)
);

/* ===============================
   PROTECTED ROUTES
=============================== */

router.get(
  "/me",
  authenticate,
  asyncWrapper(authController.getCurrentUser)
);

router.post(
  "/change-password",
  authenticate,
  asyncWrapper(authController.changePassword)
);

router.post(
  "/logout",
  authenticate,
  asyncWrapper(authController.logout)
);

export default router;
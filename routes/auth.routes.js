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

// Verify Email
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

// Current Logged-in User
router.get(
  "/me",
  authenticate,
  asyncWrapper(authController.getCurrentUser)
);

// Change Password
router.post(
  "/change-password",
  authenticate,
  asyncWrapper(authController.changePassword)
);

// Logout
router.post(
  "/logout",
  authenticate,
  asyncWrapper(authController.logout)
);

export default router;
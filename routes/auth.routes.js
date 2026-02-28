import express from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

// Public Routes
router.post('/register', authLimiter, asyncWrapper(authController.register));
router.post('/login', authLimiter, asyncWrapper(authController.login));
router.post('/refresh-token', asyncWrapper(authController.refreshToken));
router.get('/verify-email/:userId', asyncWrapper(authController.verifyEmail));

// Protected Routes
router.post('/change-password', authenticate, asyncWrapper(authController.changePassword));
router.get('/me', authenticate, asyncWrapper(authController.getCurrentUser));
router.post('/logout', authenticate, asyncWrapper(authController.logout));

export default router;